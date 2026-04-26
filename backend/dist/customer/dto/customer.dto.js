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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminDecisionDto = exports.SignContractDto = exports.SavePersonalFormDto = exports.SaveDocumentsDto = exports.SaveFatcaDto = exports.VerifyOtpDto = exports.CreateCustomerDto = void 0;
const class_validator_1 = require("class-validator");
const customer_entity_1 = require("../entities/customer.entity");
const customer_entity_2 = require("../entities/customer.entity");
class CreateCustomerDto {
    identificationSource;
    lastName;
    firstName;
    lastNameArabic;
    firstNameArabic;
    gender;
    nationality;
    birthDate;
    birthPlace;
    countryOfBirth;
    countryOfResidence;
    phoneNumber;
    email;
    idCardNumber;
    idIssueDate;
}
exports.CreateCustomerDto = CreateCustomerDto;
__decorate([
    (0, class_validator_1.IsEnum)(customer_entity_1.IdentificationSource),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "identificationSource", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Le nom est obligatoire' }),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "lastName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Le prénom est obligatoire' }),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "firstName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'الاسم العائلي مطلوب' }),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "lastNameArabic", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'الاسم الشخصي مطلوب' }),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "firstNameArabic", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Le genre est obligatoire' }),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "gender", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "nationality", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(/^\d{2}\/\d{2}\/\d{4}$/, { message: 'Format: JJ/MM/AAAA' }),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "birthDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "birthPlace", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "countryOfBirth", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "countryOfResidence", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Length)(8, 8, { message: '8 chiffres requis' }),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "phoneNumber", void 0);
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'Email invalide' }),
    (0, class_validator_1.IsNotEmpty)({ message: "L'email est obligatoire" }),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Length)(8, 8, { message: 'CIN = 8 chiffres' }),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "idCardNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(/^\d{2}\/\d{2}\/\d{4}$/, { message: 'Format: JJ/MM/AAAA' }),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "idIssueDate", void 0);
class VerifyOtpDto {
    otpCode;
}
exports.VerifyOtpDto = VerifyOtpDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Length)(6, 6, { message: 'Le code OTP doit contenir 6 chiffres' }),
    __metadata("design:type", String)
], VerifyOtpDto.prototype, "otpCode", void 0);
class SaveFatcaDto {
    isUsCitizen;
    isUsResident;
    hasGreenCard;
    isUsTaxpayer;
    hasUsTransfers;
    hasUsPhone;
    hasUsProxy;
    isPoliticallyExposed;
}
exports.SaveFatcaDto = SaveFatcaDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SaveFatcaDto.prototype, "isUsCitizen", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SaveFatcaDto.prototype, "isUsResident", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SaveFatcaDto.prototype, "hasGreenCard", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SaveFatcaDto.prototype, "isUsTaxpayer", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SaveFatcaDto.prototype, "hasUsTransfers", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SaveFatcaDto.prototype, "hasUsPhone", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SaveFatcaDto.prototype, "hasUsProxy", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SaveFatcaDto.prototype, "isPoliticallyExposed", void 0);
class SaveDocumentsDto {
    usePassport;
    idCardFrontPath;
    idCardBackPath;
    passportPath;
}
exports.SaveDocumentsDto = SaveDocumentsDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], SaveDocumentsDto.prototype, "usePassport", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SaveDocumentsDto.prototype, "idCardFrontPath", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SaveDocumentsDto.prototype, "idCardBackPath", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SaveDocumentsDto.prototype, "passportPath", void 0);
class SavePersonalFormDto {
    pays;
    gouvernorat;
    delegation;
    codePostal;
    adresse;
    adresseSuite;
    situationProfessionnelle;
    profession;
    posteActuel;
    dateEmbauche;
    employeur;
    entreprise;
    revenuMensuel;
    gouvernoratAgence;
    agence;
}
exports.SavePersonalFormDto = SavePersonalFormDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SavePersonalFormDto.prototype, "pays", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SavePersonalFormDto.prototype, "gouvernorat", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SavePersonalFormDto.prototype, "delegation", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SavePersonalFormDto.prototype, "codePostal", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SavePersonalFormDto.prototype, "adresse", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SavePersonalFormDto.prototype, "adresseSuite", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SavePersonalFormDto.prototype, "situationProfessionnelle", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SavePersonalFormDto.prototype, "profession", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SavePersonalFormDto.prototype, "posteActuel", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SavePersonalFormDto.prototype, "dateEmbauche", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SavePersonalFormDto.prototype, "employeur", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SavePersonalFormDto.prototype, "entreprise", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], SavePersonalFormDto.prototype, "revenuMensuel", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SavePersonalFormDto.prototype, "gouvernoratAgence", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SavePersonalFormDto.prototype, "agence", void 0);
class SignContractDto {
    documentBase64;
    eHouwiyaToken;
}
exports.SignContractDto = SignContractDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SignContractDto.prototype, "documentBase64", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SignContractDto.prototype, "eHouwiyaToken", void 0);
class AdminDecisionDto {
    decision;
    rejectionReason;
}
exports.AdminDecisionDto = AdminDecisionDto;
__decorate([
    (0, class_validator_1.IsEnum)([customer_entity_2.CustomerStatus.APPROVED, customer_entity_2.CustomerStatus.REJECTED]),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AdminDecisionDto.prototype, "decision", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AdminDecisionDto.prototype, "rejectionReason", void 0);
//# sourceMappingURL=customer.dto.js.map