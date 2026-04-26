import {
  IsString, IsEmail, IsEnum, IsOptional, IsNotEmpty,
  Length, Matches, IsBoolean, IsNumber,
} from 'class-validator';
import { IdentificationSource } from '../entities/customer.entity';
import { CustomerStatus } from '../entities/customer.entity';
// ──────────────────────────────────────────────────────────────
//  DTO ÉTAPE 1 : Données personnelles
// ──────────────────────────────────────────────────────────────
export class CreateCustomerDto {

  @IsEnum(IdentificationSource)
  @IsOptional()
  identificationSource?: IdentificationSource;

  @IsString() @IsNotEmpty({ message: 'Le nom est obligatoire' })
  lastName!: string;

  @IsString() @IsNotEmpty({ message: 'Le prénom est obligatoire' })
  firstName!: string;

  @IsString() @IsNotEmpty({ message: 'الاسم العائلي مطلوب' })
  lastNameArabic!: string;

  @IsString() @IsNotEmpty({ message: 'الاسم الشخصي مطلوب' })
  firstNameArabic!: string;

  @IsString() @IsNotEmpty({ message: 'Le genre est obligatoire' })
  gender!: string;

  @IsString() @IsOptional()
  nationality?: string;

  @IsString() @IsNotEmpty()
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, { message: 'Format: JJ/MM/AAAA' })
  birthDate!: string;

  @IsString() @IsOptional()
  birthPlace?: string;

  @IsString() @IsOptional()
  countryOfBirth?: string;

  @IsString() @IsOptional()
  countryOfResidence?: string;

  @IsString() @IsNotEmpty()
  @Length(8, 8, { message: '8 chiffres requis' })
  phoneNumber!: string;

  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: "L'email est obligatoire" })
  email!: string;

  @IsString() @IsNotEmpty()
  @Length(8, 8, { message: 'CIN = 8 chiffres' })
  idCardNumber!: string;

  @IsString() @IsNotEmpty()
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, { message: 'Format: JJ/MM/AAAA' })
  idIssueDate!: string;
}

// ──────────────────────────────────────────────────────────────
//  DTO OTP
// ──────────────────────────────────────────────────────────────
export class VerifyOtpDto {
  @IsString() @IsNotEmpty()
  @Length(6, 6, { message: 'Le code OTP doit contenir 6 chiffres' })
  otpCode!: string;
}

// ──────────────────────────────────────────────────────────────
//  DTO FATCA
// ──────────────────────────────────────────────────────────────
export class SaveFatcaDto {
  @IsBoolean() isUsCitizen!: boolean;
  @IsBoolean() isUsResident!: boolean;
  @IsBoolean() hasGreenCard!: boolean;
  @IsBoolean() isUsTaxpayer!: boolean;
  @IsBoolean() hasUsTransfers!: boolean;
  @IsBoolean() hasUsPhone!: boolean;
  @IsBoolean() hasUsProxy!: boolean;
  @IsBoolean() isPoliticallyExposed!: boolean;
}

// ──────────────────────────────────────────────────────────────
//  DTO Documents
// ──────────────────────────────────────────────────────────────
export class SaveDocumentsDto {
  @IsBoolean() @IsOptional()
  usePassport?: boolean;

  @IsString() @IsOptional()
  idCardFrontPath?: string;

  @IsString() @IsOptional()
  idCardBackPath?: string;

  @IsString() @IsOptional()
  passportPath?: string;
}

// ──────────────────────────────────────────────────────────────
//  DTO Formulaire personnel
// ──────────────────────────────────────────────────────────────
export class SavePersonalFormDto {
  @IsString() @IsOptional() pays?: string;
  @IsString() @IsNotEmpty() gouvernorat!: string;
  @IsString() @IsNotEmpty() delegation!: string;
  @IsString() @IsNotEmpty() codePostal!: string;
  @IsString() @IsNotEmpty() adresse!: string;
  @IsString() @IsOptional() adresseSuite?: string;

  @IsString() @IsNotEmpty() situationProfessionnelle!: string;
  @IsString() @IsOptional() profession?: string;
  @IsString() @IsOptional() posteActuel?: string;
  @IsString() @IsOptional() dateEmbauche?: string;
  @IsString() @IsOptional() employeur?: string;
  @IsString() @IsOptional() entreprise?: string;
  @IsNumber()  @IsOptional() revenuMensuel?: number;

  @IsString() @IsNotEmpty() gouvernoratAgence!: string;
  @IsString() @IsNotEmpty() agence!: string;
}

// ══════════════════════════════════════════════════════════════
// ✅ [E-HOUWIYA] — DTO pour la signature du contrat
//
// Reçu depuis le frontend après que l'utilisateur clique
// sur "Signer avec E-Houwiya" dans ContractScreen.
// Le frontend envoie le document PDF encodé en base64
// et le token E-Houwiya stocké dans AsyncStorage.
// ══════════════════════════════════════════════════════════════
export class SignContractDto {
  /**
   * Le contrat PDF encodé en base64 — généré par ContractService.
   * Le backend récupère ce PDF et le soumet à TunTrust pour signature.
   * En production : TunTrust signe avec le certificat E-Houwiya du client.
   * En simulation (PFE) : on utilise un document base64 statique pré-défini.
   */
  @IsString() @IsNotEmpty()
  documentBase64!: string;

  /**
   * Le token E-Houwiya du client — stocké dans AsyncStorage côté frontend.
   * Ce token authentifie le client auprès de TunTrust pour la signature.
   * En simulation (PFE) : token JWT statique généré par simulateEHouwiya.
   */
  @IsString() @IsNotEmpty()
  eHouwiyaToken!: string;

}
export class AdminDecisionDto {
  @IsEnum([CustomerStatus.APPROVED, CustomerStatus.REJECTED])
  @IsNotEmpty()
  decision!: CustomerStatus.APPROVED | CustomerStatus.REJECTED;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}