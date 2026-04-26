// ============================================================
//  backend/src/customer/customer.service.ts
//
//  ✅ [E-HOUWIYA] CORRECTION :
//  ─────────────────────────────────────────
//  email et phoneNumber sont maintenant AUSSI verrouillés
//  pour les customers E-Houwiya.
//
//  ✅ [NOTIFICATIONS] AJOUT :
//  Émission d'une notification quand un dossier est soumis
// ============================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Customer,
  CustomerStatus,
  IdentificationSource,
} from './entities/customer.entity';
import {
  CreateCustomerDto,
  VerifyOtpDto,
  SaveFatcaDto,
  SaveDocumentsDto,
  SavePersonalFormDto,
} from './dto/customer.dto';
import { NotificationsService } from '../notifications/notifications.service';

const FormData = require('form-data');
const axios    = require('axios');

// ══════════════════════════════════════════════════════════════
// ✅ [E-HOUWIYA] Liste complète des champs verrouillés
// ══════════════════════════════════════════════════════════════
export const EHOUWIYA_LOCKED_FIELDS = [
  'lastName',
  'firstName',
  'lastNameArabic',
  'firstNameArabic',
  'gender',
  'nationality',
  'birthDate',
  'birthPlace',
  'countryOfBirth',
  'countryOfResidence',
  'idCardNumber',
  'idIssueDate',
  'email',
  'phoneNumber',
] as const;

export type EHouwiyaLockedField = typeof EHOUWIYA_LOCKED_FIELDS[number];

@Injectable()
export class CustomerService {

  private readonly logger = new Logger(CustomerService.name);
  private readonly OCR_URL = process.env.OCR_SERVICE_URL || 'http://localhost:8001';

  constructor(
    @InjectRepository(Customer)
    private readonly repo: Repository<Customer>,
    private readonly notificationsService: NotificationsService, // ✅ Injection notifications
  ) {}

  private async findOrFail(id: string): Promise<Customer> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`Customer "${id}" introuvable.`);
    return c;
  }

  // ══════════════════════════════════════════════════════════
  //  OCR SCAN
  // ══════════════════════════════════════════════════════════
  async ocrScan(
    customerId: string,
    file: Express.Multer.File,
    docType: string,
  ): Promise<any> {
    this.logger.log(`[OCR] Scan [${docType}] pour customer ${customerId}`);
    if (!file) throw new BadRequestException('Fichier manquant.');

    const form = new FormData();
    form.append('document', file.buffer, {
      filename:    file.originalname || 'document.jpg',
      contentType: file.mimetype     || 'image/jpeg',
    });
    form.append('docType',    docType);
    form.append('customerId', customerId);

    try {
      const response = await axios.post(`${this.OCR_URL}/ocr/scan`, form, {
        headers:          form.getHeaders(),
        timeout:          115_000,
        maxBodyLength:    Infinity,
        maxContentLength: Infinity,
      });
      const result = response.data;
      this.logger.log(`[OCR] ✅ Succès [${docType}] confidence=${result.confidence}`);
      return result;
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.message || 'Erreur OCR inconnue';
      this.logger.error(`[OCR] ❌ Erreur : ${msg}`);
      throw new BadRequestException(`Erreur microservice OCR : ${msg}`);
    }
  }

  // ══════════════════════════════════════════════════════════
  //  ÉTAPE 1 — Créer le customer
  // ══════════════════════════════════════════════════════════
  async create(dto: CreateCustomerDto): Promise<Customer> {

    const byEmail = await this.repo.findOne({ where: { email: dto.email } });
    if (byEmail) {
      this.logger.warn(`[CREATE] Email déjà utilisé : ${dto.email}`);
      throw new ConflictException(
        'Cette adresse email est déjà associée à un dossier. Veuillez utiliser une autre adresse ou contacter votre agence ATB.',
      );
    }

    const customer = this.repo.create({
      ...dto,
      identificationSource: dto.identificationSource ?? IdentificationSource.MANUAL,
      status:      CustomerStatus.PENDING_OTP,
      currentStep: 1,
      otpAttempts: 0,
    });

    const saved = await this.repo.save(customer);
    this.logger.log(`[CREATE] ✅ Customer créé : ${saved.id} | source=${saved.identificationSource}`);
    return saved;
  }

  // ══════════════════════════════════════════════════════════
  //  OTP
  // ══════════════════════════════════════════════════════════
  async generateOtp(id: string): Promise<{ otp: string; expiresAt: Date }> {
    const customer  = await this.findOrFail(id);
    const otp       = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    customer.otpCode      = otp;
    customer.otpExpiresAt = expiresAt;
    customer.otpAttempts  = 0;
    customer.status       = CustomerStatus.PENDING_OTP;
    await this.repo.save(customer);
    this.logger.log(`[OTP] Généré pour ${id} : ${otp}`);
    return { otp, expiresAt };
  }

  async verifyOtp(id: string, dto: VerifyOtpDto): Promise<{ success: boolean }> {
    const customer = await this.findOrFail(id);
    if (customer.otpAttempts >= 3)
      throw new BadRequestException('Trop de tentatives. Demandez un nouveau code.');
    if (!customer.otpExpiresAt || new Date() > customer.otpExpiresAt)
      throw new BadRequestException('Le code OTP a expiré.');
    const isValid = customer.otpCode === dto.otpCode;
    if (!isValid) {
      customer.otpAttempts += 1;
      await this.repo.save(customer);
      throw new BadRequestException(`Code incorrect. ${3 - customer.otpAttempts} tentative(s) restante(s).`);
    }
    customer.isPhoneVerified = true;
    customer.otpCode         = null as unknown as string;
    customer.otpExpiresAt    = null as unknown as Date;
    customer.otpAttempts     = 0;
    customer.status          = CustomerStatus.FATCA_PENDING;
    customer.currentStep     = 2;
    await this.repo.save(customer);
    this.logger.log(`[OTP] ✅ Vérifié pour : ${id}`);
    return { success: true };
  }

  // ══════════════════════════════════════════════════════════
  //  FATCA
  // ══════════════════════════════════════════════════════════
  async saveFatca(id: string, dto: SaveFatcaDto): Promise<Customer> {
    const customer = await this.findOrFail(id);
    if (!customer.isPhoneVerified)
      throw new BadRequestException('Le téléphone doit être vérifié avant le FATCA.');
    Object.assign(customer, dto);
    customer.fatcaCompletedAt = new Date();
    customer.status           = CustomerStatus.DOCUMENTS_PENDING;
    customer.currentStep      = 3;
    const saved = await this.repo.save(customer);
    this.logger.log(`[FATCA] Enregistré pour : ${id}`);
    return saved;
  }

  // ══════════════════════════════════════════════════════════
  //  DOCUMENTS
  // ══════════════════════════════════════════════════════════
  async saveDocuments(id: string, dto: SaveDocumentsDto): Promise<Customer> {
    const customer = await this.findOrFail(id);
    if (dto.usePassport && !dto.passportPath)
      throw new BadRequestException('Le chemin du passeport est requis.');
    if (!dto.usePassport && (!dto.idCardFrontPath || !dto.idCardBackPath))
      throw new BadRequestException('Les deux faces de la CIN sont requises.');
    Object.assign(customer, dto);
    customer.documentsUploadedAt = new Date();
    customer.status              = CustomerStatus.PERSONAL_PENDING;
    customer.currentStep         = 4;
    const saved = await this.repo.save(customer);
    this.logger.log(`[DOCUMENTS] Enregistrés pour : ${id}`);
    return saved;
  }

  // ══════════════════════════════════════════════════════════
  //  FORMULAIRE PERSONNEL - avec notification
  // ══════════════════════════════════════════════════════════
  async savePersonalForm(id: string, dto: SavePersonalFormDto): Promise<Customer> {
    const customer = await this.findOrFail(id);
    Object.assign(customer, dto);
    customer.status      = CustomerStatus.SUBMITTED;
    customer.submittedAt = new Date();
    customer.currentStep = 5;
    const saved = await this.repo.save(customer);
    this.logger.log(`[PERSONAL-FORM] 🎉 Dossier soumis pour : ${id}`);
    
    // ✅ Émettre une notification pour l'admin
    this.notificationsService.emitNewDossierNotification(
      customer.id,
      `${customer.firstName} ${customer.lastName}`,
      customer.idCardNumber,
    );
    
    return saved;
  }

  // ══════════════════════════════════════════════════════════
  //  LECTURE
  // ══════════════════════════════════════════════════════════
  async findOne(id: string): Promise<Customer> { return this.findOrFail(id); }
  async findAll(): Promise<Customer[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }
  async findByEmail(email: string): Promise<Customer | null> {
    return this.repo.findOne({ where: { email } });
  }

  // ══════════════════════════════════════════════════════════
  //  MISE À JOUR
  // ══════════════════════════════════════════════════════════
  async update(id: string, dto: Partial<CreateCustomerDto>): Promise<Customer> {
    const customer = await this.findOrFail(id);

    if (customer.identificationSource === IdentificationSource.E_HOUWIYA) {
      EHOUWIYA_LOCKED_FIELDS.forEach(field => delete (dto as any)[field]);

      this.logger.log(
        `[UPDATE] [E-HOUWIYA] Champs verrouillés protégés pour : ${id} ` +
        `(identité + email + téléphone)`,
      );
    }

    Object.assign(customer, dto);
    const updated = await this.repo.save(customer);
    this.logger.log(`[UPDATE] Customer mis à jour : ${id}`);
    return updated;
  }

  async updateDocumentPath(id: string, paths: Partial<{
    idCardFrontPath: string;
    idCardBackPath: string;
    passportPath: string;
  }>): Promise<Customer> {
    const customer = await this.findOrFail(id);
    
    if (paths.idCardFrontPath) customer.idCardFrontPath = paths.idCardFrontPath;
    if (paths.idCardBackPath)  customer.idCardBackPath  = paths.idCardBackPath;
    if (paths.passportPath)    customer.passportPath    = paths.passportPath;
    
    if (paths.idCardFrontPath || paths.idCardBackPath || paths.passportPath) {
      customer.documentsUploadedAt = new Date();
    }
    
    const saved = await this.repo.save(customer);
    this.logger.log(`[DOCUMENT] Chemins mis à jour pour ${id}`);
    return saved;
  }
}