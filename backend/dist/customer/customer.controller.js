"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const customer_service_1 = require("./customer.service");
const customer_dto_1 = require("./dto/customer.dto");
const fs = __importStar(require("fs"));
const UPLOAD_DIR = './uploads/documents';
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
const storage = (0, multer_1.diskStorage)({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const customerId = req.params.id;
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1e9);
        const ext = (0, path_1.extname)(file.originalname) || '.jpg';
        cb(null, `${customerId}_${timestamp}_${random}${ext}`);
    },
});
let CustomerController = class CustomerController {
    service;
    constructor(service) {
        this.service = service;
    }
    async uploadDocument(customerId, file, docType) {
        if (!file) {
            throw new common_1.BadRequestException('Aucun fichier reçu');
        }
        if (!['cinRecto', 'cinVerso', 'passport'].includes(docType)) {
            throw new common_1.BadRequestException('Type de document invalide');
        }
        const relativePath = file.path.replace(/\\/g, '/');
        const updateData = {};
        if (docType === 'cinRecto')
            updateData.idCardFrontPath = relativePath;
        if (docType === 'cinVerso')
            updateData.idCardBackPath = relativePath;
        if (docType === 'passport')
            updateData.passportPath = relativePath;
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
    async create(dto) {
        const customer = await this.service.create(dto);
        return {
            success: true,
            message: 'Dossier créé.',
            data: {
                id: customer.id,
                currentStep: customer.currentStep,
                status: customer.status,
                identificationSource: customer.identificationSource,
            },
        };
    }
    async findOne(id) {
        const customer = await this.service.findOne(id);
        return { success: true, data: customer };
    }
    async findAll() {
        const list = await this.service.findAll();
        return { success: true, count: list.length, data: list };
    }
    async findByEmail(email) {
        const customer = await this.service.findByEmail(email);
        if (!customer)
            return { success: false, data: null };
        return { success: true, data: customer };
    }
    async generateOtp(id) {
        const result = await this.service.generateOtp(id);
        return {
            success: true,
            message: 'Code OTP généré.',
            devOnly_otp: result.otp,
            expiresAt: result.expiresAt,
        };
    }
    async verifyOtp(id, dto) {
        const result = await this.service.verifyOtp(id, dto);
        return {
            ...result,
            message: result.success ? 'Téléphone vérifié.' : 'Code OTP invalide',
        };
    }
    async saveFatca(id, dto) {
        const customer = await this.service.saveFatca(id, dto);
        return {
            success: true,
            message: 'Déclaration FATCA enregistrée.',
            data: { id: customer.id, currentStep: customer.currentStep, status: customer.status },
        };
    }
    async saveDocuments(id, dto) {
        const customer = await this.service.saveDocuments(id, dto);
        return {
            success: true,
            message: 'Documents enregistrés.',
            data: { id: customer.id, currentStep: customer.currentStep, status: customer.status },
        };
    }
    async savePersonalForm(id, dto) {
        const customer = await this.service.savePersonalForm(id, dto);
        return {
            success: true,
            message: 'Dossier soumis avec succès !',
            data: {
                id: customer.id,
                currentStep: customer.currentStep,
                status: customer.status,
                submittedAt: customer.submittedAt,
            },
        };
    }
    async update(id, dto) {
        const customer = await this.service.update(id, dto);
        return {
            success: true,
            message: 'Customer mis à jour.',
            data: {
                id: customer.id,
                currentStep: customer.currentStep,
                status: customer.status,
                identificationSource: customer.identificationSource,
            },
        };
    }
    async ocrScan(customerId, file, docType) {
        return this.service.ocrScan(customerId, file, docType);
    }
};
exports.CustomerController = CustomerController;
__decorate([
    (0, common_1.Post)(':id/upload-document'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('document', { storage })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)('docType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [customer_dto_1.CreateCustomerDto]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('by-email/:email'),
    __param(0, (0, common_1.Param)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "findByEmail", null);
__decorate([
    (0, common_1.Post)(':id/otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "generateOtp", null);
__decorate([
    (0, common_1.Post)(':id/verify-otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, customer_dto_1.VerifyOtpDto]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "verifyOtp", null);
__decorate([
    (0, common_1.Post)(':id/fatca'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, customer_dto_1.SaveFatcaDto]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "saveFatca", null);
__decorate([
    (0, common_1.Post)(':id/documents'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, customer_dto_1.SaveDocumentsDto]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "saveDocuments", null);
__decorate([
    (0, common_1.Post)(':id/personal-form'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, customer_dto_1.SavePersonalFormDto]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "savePersonalForm", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/ocr/scan'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('document')),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)('docType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "ocrScan", null);
exports.CustomerController = CustomerController = __decorate([
    (0, common_1.Controller)('customer'),
    __metadata("design:paramtypes", [customer_service_1.CustomerService])
], CustomerController);
//# sourceMappingURL=customer.controller.js.map