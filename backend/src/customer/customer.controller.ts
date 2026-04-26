// ============================================================
//  backend/src/customer/customer.controller.ts
//  ✅ AJOUT : POST /customer/:id/upload-document
//     Reçoit un fichier image, le sauvegarde sur disque,
//     retourne le chemin serveur relatif.
// ============================================================
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Patch,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CustomerService } from './customer.service';
import {
  CreateCustomerDto,
  VerifyOtpDto,
  SaveFatcaDto,
  SaveDocumentsDto,
  SavePersonalFormDto,
} from './dto/customer.dto';
import * as fs from 'fs';

// ✅ Configuration du stockage pour les documents uploadés
const UPLOAD_DIR = './uploads/documents';

// Créer le dossier s'il n'existe pas
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const customerId = req.params.id;
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname) || '.jpg';
    cb(null, `${customerId}_${timestamp}_${random}${ext}`);
  },
});

@Controller('customer')
export class CustomerController {
  constructor(private readonly service: CustomerService) {}

  // ── ✅ NOUVEAU : Upload de document (remplace l'enregistrement d'URI) ──
  @Post(':id/upload-document')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('document', { storage }))
  async uploadDocument(
    @Param('id') customerId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('docType') docType: 'cinRecto' | 'cinVerso' | 'passport',
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu');
    }
    if (!['cinRecto', 'cinVerso', 'passport'].includes(docType)) {
      throw new BadRequestException('Type de document invalide');
    }

    // Chemin relatif stocké en BDD (accessible depuis le backend)
    const relativePath = file.path.replace(/\\/g, '/');

    // Mettre à jour le chemin du document dans la BDD
    const updateData: any = {};
    if (docType === 'cinRecto') updateData.idCardFrontPath = relativePath;
    if (docType === 'cinVerso') updateData.idCardBackPath = relativePath;
    if (docType === 'passport') updateData.passportPath = relativePath;

    const customer = await this.service.updateDocumentPath(customerId, updateData);

    return {
      success: true,
      message: 'Document uploadé avec succès',
      data: {
        documentPath: relativePath,
        customerId: customer.id,
      },
    };
  }

  // ── Créer un customer ─────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCustomerDto) {
    const customer = await this.service.create(dto);
    return {
      success: true,
      message: 'Dossier créé.',
      data: {
        id:                   customer.id,
        currentStep:          customer.currentStep,
        status:               customer.status,
        identificationSource: customer.identificationSource,
      },
    };
  }

  // ── Lire un customer ──────────────────────────────────────
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const customer = await this.service.findOne(id);
    return { success: true, data: customer };
  }

  @Get()
  async findAll() {
    const list = await this.service.findAll();
    return { success: true, count: list.length, data: list };
  }

  @Get('by-email/:email')
  async findByEmail(@Param('email') email: string) {
    const customer = await this.service.findByEmail(email);
    if (!customer) return { success: false, data: null };
    return { success: true, data: customer };
  }

  // ── Générer OTP ───────────────────────────────────────────
  @Post(':id/otp')
  @HttpCode(HttpStatus.OK)
  async generateOtp(@Param('id') id: string) {
    const result = await this.service.generateOtp(id);
    return {
      success:     true,
      message:     'Code OTP généré.',
      devOnly_otp: result.otp,
      expiresAt:   result.expiresAt,
    };
  }

  // ── Vérifier OTP ─────────────────────────────────────────
  @Post(':id/verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Param('id') id: string, @Body() dto: VerifyOtpDto) {
    const result = await this.service.verifyOtp(id, dto);
    return {
      ...result,
      message: result.success ? 'Téléphone vérifié.' : 'Code OTP invalide',
    };
  }

  // ── FATCA ─────────────────────────────────────────────────
  @Post(':id/fatca')
  @HttpCode(HttpStatus.OK)
  async saveFatca(@Param('id') id: string, @Body() dto: SaveFatcaDto) {
    const customer = await this.service.saveFatca(id, dto);
    return {
      success: true,
      message: 'Déclaration FATCA enregistrée.',
      data: { id: customer.id, currentStep: customer.currentStep, status: customer.status },
    };
  }

  // ── Documents ─────────────────────────────────────────────
  // ⚠️ Cet endpoint est conservé pour compatibilité, mais privilégier upload-document
  @Post(':id/documents')
  @HttpCode(HttpStatus.OK)
  async saveDocuments(@Param('id') id: string, @Body() dto: SaveDocumentsDto) {
    const customer = await this.service.saveDocuments(id, dto);
    return {
      success: true,
      message: 'Documents enregistrés.',
      data: { id: customer.id, currentStep: customer.currentStep, status: customer.status },
    };
  }

  // ── Formulaire personnel ──────────────────────────────────
  @Post(':id/personal-form')
  @HttpCode(HttpStatus.OK)
  async savePersonalForm(@Param('id') id: string, @Body() dto: SavePersonalFormDto) {
    const customer = await this.service.savePersonalForm(id, dto);
    return {
      success: true,
      message: 'Dossier soumis avec succès !',
      data: {
        id:          customer.id,
        currentStep: customer.currentStep,
        status:      customer.status,
        submittedAt: customer.submittedAt,
      },
    };
  }

  // ── Mise à jour partielle ─────────────────────────────────
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateCustomerDto>) {
    const customer = await this.service.update(id, dto);
    return {
      success: true,
      message: 'Customer mis à jour.',
      data: {
        id:                   customer.id,
        currentStep:          customer.currentStep,
        status:               customer.status,
        identificationSource: customer.identificationSource,
      },
    };
  }

  // ── OCR SCAN ──────────────────────────────────────────────
  @Post(':id/ocr/scan')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('document'))
  async ocrScan(
    @Param('id') customerId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('docType') docType: string,
  ) {
    return this.service.ocrScan(customerId, file, docType);
  }
}