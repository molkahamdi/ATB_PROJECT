"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CustomerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerService = exports.EHOUWIYA_LOCKED_FIELDS = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const customer_entity_1 = require("./entities/customer.entity");
const notifications_service_1 = require("../notifications/notifications.service");
const FormData = require('form-data');
const axios = require('axios');
exports.EHOUWIYA_LOCKED_FIELDS = [
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
];
let CustomerService = CustomerService_1 = class CustomerService {
    repo;
    notificationsService;
    logger = new common_1.Logger(CustomerService_1.name);
    OCR_URL = process.env.OCR_SERVICE_URL || 'http://localhost:8001';
    constructor(repo, notificationsService) {
        this.repo = repo;
        this.notificationsService = notificationsService;
    }
    async findOrFail(id) {
        const c = await this.repo.findOne({ where: { id } });
        if (!c)
            throw new common_1.NotFoundException(`Customer "${id}" introuvable.`);
        return c;
    }
    async ocrScan(customerId, file, docType) {
        this.logger.log(`[OCR] Scan [${docType}] pour customer ${customerId}`);
        if (!file)
            throw new common_1.BadRequestException('Fichier manquant.');
        const form = new FormData();
        form.append('document', file.buffer, {
            filename: file.originalname || 'document.jpg',
            contentType: file.mimetype || 'image/jpeg',
        });
        form.append('docType', docType);
        form.append('customerId', customerId);
        try {
            const response = await axios.post(`${this.OCR_URL}/ocr/scan`, form, {
                headers: form.getHeaders(),
                timeout: 115_000,
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
            });
            const result = response.data;
            this.logger.log(`[OCR] ✅ Succès [${docType}] confidence=${result.confidence}`);
            return result;
        }
        catch (error) {
            const msg = error?.response?.data?.detail || error?.message || 'Erreur OCR inconnue';
            this.logger.error(`[OCR] ❌ Erreur : ${msg}`);
            throw new common_1.BadRequestException(`Erreur microservice OCR : ${msg}`);
        }
    }
    async create(dto) {
        const byEmail = await this.repo.findOne({ where: { email: dto.email } });
        if (byEmail) {
            this.logger.warn(`[CREATE] Email déjà utilisé : ${dto.email}`);
            throw new common_1.ConflictException('Cette adresse email est déjà associée à un dossier. Veuillez utiliser une autre adresse ou contacter votre agence ATB.');
        }
        const customer = this.repo.create({
            ...dto,
            identificationSource: dto.identificationSource ?? customer_entity_1.IdentificationSource.MANUAL,
            status: customer_entity_1.CustomerStatus.PENDING_OTP,
            currentStep: 1,
            otpAttempts: 0,
        });
        const saved = await this.repo.save(customer);
        this.logger.log(`[CREATE] ✅ Customer créé : ${saved.id} | source=${saved.identificationSource}`);
        return saved;
    }
    async generateOtp(id) {
        const customer = await this.findOrFail(id);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);
        customer.otpCode = otp;
        customer.otpExpiresAt = expiresAt;
        customer.otpAttempts = 0;
        customer.status = customer_entity_1.CustomerStatus.PENDING_OTP;
        await this.repo.save(customer);
        this.logger.log(`[OTP] Généré pour ${id} : ${otp}`);
        return { otp, expiresAt };
    }
    async verifyOtp(id, dto) {
        const customer = await this.findOrFail(id);
        if (customer.otpAttempts >= 3)
            throw new common_1.BadRequestException('Trop de tentatives. Demandez un nouveau code.');
        if (!customer.otpExpiresAt || new Date() > customer.otpExpiresAt)
            throw new common_1.BadRequestException('Le code OTP a expiré.');
        const isValid = customer.otpCode === dto.otpCode;
        if (!isValid) {
            customer.otpAttempts += 1;
            await this.repo.save(customer);
            throw new common_1.BadRequestException(`Code incorrect. ${3 - customer.otpAttempts} tentative(s) restante(s).`);
        }
        customer.isPhoneVerified = true;
        customer.otpCode = null;
        customer.otpExpiresAt = null;
        customer.otpAttempts = 0;
        customer.status = customer_entity_1.CustomerStatus.FATCA_PENDING;
        customer.currentStep = 2;
        await this.repo.save(customer);
        this.logger.log(`[OTP] ✅ Vérifié pour : ${id}`);
        return { success: true };
    }
    async saveFatca(id, dto) {
        const customer = await this.findOrFail(id);
        if (!customer.isPhoneVerified)
            throw new common_1.BadRequestException('Le téléphone doit être vérifié avant le FATCA.');
        Object.assign(customer, dto);
        customer.fatcaCompletedAt = new Date();
        customer.status = customer_entity_1.CustomerStatus.DOCUMENTS_PENDING;
        customer.currentStep = 3;
        const saved = await this.repo.save(customer);
        this.logger.log(`[FATCA] Enregistré pour : ${id}`);
        return saved;
    }
    async saveDocuments(id, dto) {
        const customer = await this.findOrFail(id);
        if (dto.usePassport && !dto.passportPath)
            throw new common_1.BadRequestException('Le chemin du passeport est requis.');
        if (!dto.usePassport && (!dto.idCardFrontPath || !dto.idCardBackPath))
            throw new common_1.BadRequestException('Les deux faces de la CIN sont requises.');
        Object.assign(customer, dto);
        customer.documentsUploadedAt = new Date();
        customer.status = customer_entity_1.CustomerStatus.PERSONAL_PENDING;
        customer.currentStep = 4;
        const saved = await this.repo.save(customer);
        this.logger.log(`[DOCUMENTS] Enregistrés pour : ${id}`);
        return saved;
    }
    async savePersonalForm(id, dto) {
        const customer = await this.findOrFail(id);
        Object.assign(customer, dto);
        customer.status = customer_entity_1.CustomerStatus.SUBMITTED;
        customer.submittedAt = new Date();
        customer.currentStep = 5;
        const saved = await this.repo.save(customer);
        this.logger.log(`[PERSONAL-FORM] 🎉 Dossier soumis pour : ${id}`);
        this.notificationsService.emitNewDossierNotification(customer.id, `${customer.firstName} ${customer.lastName}`, customer.idCardNumber);
        return saved;
    }
    async findOne(id) { return this.findOrFail(id); }
    async findAll() {
        return this.repo.find({ order: { createdAt: 'DESC' } });
    }
    async findByEmail(email) {
        return this.repo.findOne({ where: { email } });
    }
    async update(id, dto) {
        const customer = await this.findOrFail(id);
        if (customer.identificationSource === customer_entity_1.IdentificationSource.E_HOUWIYA) {
            exports.EHOUWIYA_LOCKED_FIELDS.forEach(field => delete dto[field]);
            this.logger.log(`[UPDATE] [E-HOUWIYA] Champs verrouillés protégés pour : ${id} ` +
                `(identité + email + téléphone)`);
        }
        Object.assign(customer, dto);
        const updated = await this.repo.save(customer);
        this.logger.log(`[UPDATE] Customer mis à jour : ${id}`);
        return updated;
    }
    async updateDocumentPath(id, paths) {
        const customer = await this.findOrFail(id);
        if (paths.idCardFrontPath)
            customer.idCardFrontPath = paths.idCardFrontPath;
        if (paths.idCardBackPath)
            customer.idCardBackPath = paths.idCardBackPath;
        if (paths.passportPath)
            customer.passportPath = paths.passportPath;
        if (paths.idCardFrontPath || paths.idCardBackPath || paths.passportPath) {
            customer.documentsUploadedAt = new Date();
        }
        const saved = await this.repo.save(customer);
        this.logger.log(`[DOCUMENT] Chemins mis à jour pour ${id}`);
        return saved;
    }
};
exports.CustomerService = CustomerService;
exports.CustomerService = CustomerService = CustomerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(customer_entity_1.Customer)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        notifications_service_1.NotificationsService])
], CustomerService);
//# sourceMappingURL=customer.service.js.map