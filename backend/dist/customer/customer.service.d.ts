import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto, VerifyOtpDto, SaveFatcaDto, SaveDocumentsDto, SavePersonalFormDto } from './dto/customer.dto';
import { NotificationsService } from '../notifications/notifications.service';
export declare const EHOUWIYA_LOCKED_FIELDS: readonly ["lastName", "firstName", "lastNameArabic", "firstNameArabic", "gender", "nationality", "birthDate", "birthPlace", "countryOfBirth", "countryOfResidence", "idCardNumber", "idIssueDate", "email", "phoneNumber"];
export type EHouwiyaLockedField = typeof EHOUWIYA_LOCKED_FIELDS[number];
export declare class CustomerService {
    private readonly repo;
    private readonly notificationsService;
    private readonly logger;
    private readonly OCR_URL;
    constructor(repo: Repository<Customer>, notificationsService: NotificationsService);
    private findOrFail;
    ocrScan(customerId: string, file: Express.Multer.File, docType: string): Promise<any>;
    create(dto: CreateCustomerDto): Promise<Customer>;
    generateOtp(id: string): Promise<{
        otp: string;
        expiresAt: Date;
    }>;
    verifyOtp(id: string, dto: VerifyOtpDto): Promise<{
        success: boolean;
    }>;
    saveFatca(id: string, dto: SaveFatcaDto): Promise<Customer>;
    saveDocuments(id: string, dto: SaveDocumentsDto): Promise<Customer>;
    savePersonalForm(id: string, dto: SavePersonalFormDto): Promise<Customer>;
    findOne(id: string): Promise<Customer>;
    findAll(): Promise<Customer[]>;
    findByEmail(email: string): Promise<Customer | null>;
    update(id: string, dto: Partial<CreateCustomerDto>): Promise<Customer>;
    updateDocumentPath(id: string, paths: Partial<{
        idCardFrontPath: string;
        idCardBackPath: string;
        passportPath: string;
    }>): Promise<Customer>;
}
