import { CustomerService } from './customer.service';
import { CreateCustomerDto, VerifyOtpDto, SaveFatcaDto, SaveDocumentsDto, SavePersonalFormDto } from './dto/customer.dto';
export declare class CustomerController {
    private readonly service;
    constructor(service: CustomerService);
    uploadDocument(customerId: string, file: Express.Multer.File, docType: 'cinRecto' | 'cinVerso' | 'passport'): Promise<{
        success: boolean;
        message: string;
        data: {
            documentPath: string;
            customerId: string;
        };
    }>;
    create(dto: CreateCustomerDto): Promise<{
        success: boolean;
        message: string;
        data: {
            id: string;
            currentStep: number;
            status: import("./entities/customer.entity").CustomerStatus;
            identificationSource: import("./entities/customer.entity").IdentificationSource;
        };
    }>;
    findOne(id: string): Promise<{
        success: boolean;
        data: import("./entities/customer.entity").Customer;
    }>;
    findAll(): Promise<{
        success: boolean;
        count: number;
        data: import("./entities/customer.entity").Customer[];
    }>;
    findByEmail(email: string): Promise<{
        success: boolean;
        data: null;
    } | {
        success: boolean;
        data: import("./entities/customer.entity").Customer;
    }>;
    generateOtp(id: string): Promise<{
        success: boolean;
        message: string;
        devOnly_otp: string;
        expiresAt: Date;
    }>;
    verifyOtp(id: string, dto: VerifyOtpDto): Promise<{
        message: string;
        success: boolean;
    }>;
    saveFatca(id: string, dto: SaveFatcaDto): Promise<{
        success: boolean;
        message: string;
        data: {
            id: string;
            currentStep: number;
            status: import("./entities/customer.entity").CustomerStatus;
        };
    }>;
    saveDocuments(id: string, dto: SaveDocumentsDto): Promise<{
        success: boolean;
        message: string;
        data: {
            id: string;
            currentStep: number;
            status: import("./entities/customer.entity").CustomerStatus;
        };
    }>;
    savePersonalForm(id: string, dto: SavePersonalFormDto): Promise<{
        success: boolean;
        message: string;
        data: {
            id: string;
            currentStep: number;
            status: import("./entities/customer.entity").CustomerStatus;
            submittedAt: Date;
        };
    }>;
    update(id: string, dto: Partial<CreateCustomerDto>): Promise<{
        success: boolean;
        message: string;
        data: {
            id: string;
            currentStep: number;
            status: import("./entities/customer.entity").CustomerStatus;
            identificationSource: import("./entities/customer.entity").IdentificationSource;
        };
    }>;
    ocrScan(customerId: string, file: Express.Multer.File, docType: string): Promise<any>;
}
