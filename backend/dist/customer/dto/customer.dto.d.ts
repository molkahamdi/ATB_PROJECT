import { IdentificationSource } from '../entities/customer.entity';
import { CustomerStatus } from '../entities/customer.entity';
export declare class CreateCustomerDto {
    identificationSource?: IdentificationSource;
    lastName: string;
    firstName: string;
    lastNameArabic: string;
    firstNameArabic: string;
    gender: string;
    nationality?: string;
    birthDate: string;
    birthPlace?: string;
    countryOfBirth?: string;
    countryOfResidence?: string;
    phoneNumber: string;
    email: string;
    idCardNumber: string;
    idIssueDate: string;
}
export declare class VerifyOtpDto {
    otpCode: string;
}
export declare class SaveFatcaDto {
    isUsCitizen: boolean;
    isUsResident: boolean;
    hasGreenCard: boolean;
    isUsTaxpayer: boolean;
    hasUsTransfers: boolean;
    hasUsPhone: boolean;
    hasUsProxy: boolean;
    isPoliticallyExposed: boolean;
}
export declare class SaveDocumentsDto {
    usePassport?: boolean;
    idCardFrontPath?: string;
    idCardBackPath?: string;
    passportPath?: string;
}
export declare class SavePersonalFormDto {
    pays?: string;
    gouvernorat: string;
    delegation: string;
    codePostal: string;
    adresse: string;
    adresseSuite?: string;
    situationProfessionnelle: string;
    profession?: string;
    posteActuel?: string;
    dateEmbauche?: string;
    employeur?: string;
    entreprise?: string;
    revenuMensuel?: number;
    gouvernoratAgence: string;
    agence: string;
}
export declare class SignContractDto {
    documentBase64: string;
    eHouwiyaToken: string;
}
export declare class AdminDecisionDto {
    decision: CustomerStatus.APPROVED | CustomerStatus.REJECTED;
    rejectionReason?: string;
}
