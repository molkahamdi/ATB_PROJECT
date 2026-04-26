import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CustomerStatus {
  DRAFT              = 'DRAFT',              // En cours de saisie
  PENDING_OTP        = 'PENDING_OTP',        // Attente vérification OTP
  FATCA_PENDING      = 'FATCA_PENDING',      // Attente déclaration FATCA
  DOCUMENTS_PENDING  = 'DOCUMENTS_PENDING',  // Attente upload documents
  PERSONAL_PENDING   = 'PERSONAL_PENDING',   // Attente données perso (adresse/pro)
  SUBMITTED          = 'SUBMITTED',          // Dossier envoyé
  APPROVED           = 'APPROVED',           // Approuvé → compte créé
  REJECTED           = 'REJECTED',           // Rejeté
}

export enum IdentificationSource {
  E_HOUWIYA = 'E_HOUWIYA',
  MANUAL    = 'MANUAL',
}

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'identification_source',
    type: 'enum',
    enum: IdentificationSource,
    default: IdentificationSource.MANUAL,
  })
  identificationSource!: IdentificationSource;

  @Column({ name: 'last_name', nullable: true })
  lastName!: string;

  @Column({ name: 'first_name', nullable: true })
  firstName!: string;

  @Column({ name: 'last_name_arabic', nullable: true })
  lastNameArabic!: string;

  @Column({ name: 'first_name_arabic', nullable: true })
  firstNameArabic!: string;

  @Column({ nullable: true, comment: 'M = Monsieur / F = Madame' })
  gender!: string;

  @Column({ nullable: true, default: 'Tunisie' })
  nationality!: string;

  @Column({ name: 'birth_date', nullable: true, comment: 'JJ/MM/AAAA' })
  birthDate!: string;

  @Column({ name: 'birth_place', nullable: true, default: 'Tunis' })
  birthPlace!: string;

  @Column({ name: 'country_of_birth', nullable: true, default: 'Tunisie' })
  countryOfBirth!: string;

  @Column({ name: 'country_of_residence', nullable: true, default: 'Tunisie' })
  countryOfResidence!: string;

  @Column({ name: 'phone_number', nullable: true, comment: '8 chiffres sans +216' })
  phoneNumber!: string;

  @Column({ nullable: true, unique: true })
  email!: string;

  @Column({ name: 'id_card_number', nullable: true, comment: 'CIN 8 chiffres' })
  idCardNumber!: string;

  @Column({ name: 'id_issue_date', nullable: true, comment: 'JJ/MM/AAAA' })
  idIssueDate!: string;

  @Column({ name: 'otp_code', nullable: true })
  otpCode!: string;

  @Column({ name: 'otp_expires_at', nullable: true })
  otpExpiresAt!: Date;

  @Column({ name: 'otp_attempts', default: 0 })
  otpAttempts!: number;

  @Column({ name: 'is_phone_verified', default: false })
  isPhoneVerified!: boolean;

  // ══════════════════════════════════════════════════════════
  // ✅ [E-HOUWIYA] — Champs liés à l'identité numérique
  // Ces champs sont remplis automatiquement depuis E-Houwiya
  // Ils NE DOIVENT PAS être modifiés par le client
  // ══════════════════════════════════════════════════════════

  /**
   * Token JWT sécurisé généré lors de l'appel E-Houwiya simulé.
   * Ce token sera utilisé pour signer le contrat via TunTrust.
   * En production : ce token provient de la vraie API E-Houwiya.
   *//*
  @Column({
    name: 'ehouwiya_token',
    nullable: true,
    comment: '[E-HOUWIYA] Token JWT pour signature électronique',
  })
  eHouwiyaToken!: string; **/

  /**
   * Document signé en base64 retourné par E-Houwiya après signature.
   * Stocké après l'appel à POST /validate-signature.
   * En production : contient le XML/PDF signé XAdES.
   */
  @Column({
    name: 'ehouwiya_signed_doc',
    type: 'text',
    nullable: true,
    comment: '[E-HOUWIYA] Document signé en base64 (XAdES)',
  })
  eHouwiyaSignedDoc!: string;

  /**
   * ID de signature retourné par TunTrust après validation.
   * Permet de vérifier l'authenticité du contrat signé.
   */
  @Column({
    name: 'ehouwiya_signature_id',
    nullable: true,
    comment: '[E-HOUWIYA] ID de la signature validée par TunTrust',
  })
  eHouwiyaSignatureId!: string;

  /**
   * Date/heure de la signature E-Houwiya.
   */
  @Column({
    name: 'ehouwiya_signed_at',
    nullable: true,
    comment: '[E-HOUWIYA] Date de signature électronique',
  })
  eHouwiyaSignedAt!: Date;

  /**
   * Indique si le contrat a été signé électroniquement via E-Houwiya.
   * true  → contrat signé, processus complété en ligne
   * false → contrat téléchargé seulement (flux manuel)
   */
  @Column({
    name: 'is_contract_signed',
    default: false,
    comment: '[E-HOUWIYA] true = contrat signé électroniquement',
  })
  isContractSigned!: boolean;

  // ══════════════════════════════════════════════════════════
  // FATCA
  // ══════════════════════════════════════════════════════════

  @Column({ name: 'is_us_citizen', nullable: true })
  isUsCitizen!: boolean;

  @Column({ name: 'is_us_resident', nullable: true })
  isUsResident!: boolean;

  @Column({ name: 'has_green_card', nullable: true })
  hasGreenCard!: boolean;

  @Column({ name: 'is_us_taxpayer', nullable: true })
  isUsTaxpayer!: boolean;

  @Column({ name: 'has_us_transfers', nullable: true })
  hasUsTransfers!: boolean;

  @Column({ name: 'has_us_phone', nullable: true })
  hasUsPhone!: boolean;

  @Column({ name: 'has_us_proxy', nullable: true })
  hasUsProxy!: boolean;

  @Column({ name: 'is_politically_exposed', nullable: true })
  isPoliticallyExposed!: boolean;

  @Column({ name: 'fatca_completed_at', nullable: true })
  fatcaCompletedAt!: Date;

  // ══════════════════════════════════════════════════════════
  // Documents
  // ══════════════════════════════════════════════════════════

  @Column({ name: 'id_card_front_path', nullable: true })
  idCardFrontPath!: string;

  @Column({ name: 'id_card_back_path', nullable: true })
  idCardBackPath!: string;

  @Column({ name: 'passport_path', nullable: true })
  passportPath!: string;

  @Column({ name: 'use_passport', default: false })
  usePassport!: boolean;

  @Column({ name: 'documents_uploaded_at', nullable: true })
  documentsUploadedAt!: Date;

  // ══════════════════════════════════════════════════════════
  // Adresse + Profession + Agence
  // ══════════════════════════════════════════════════════════

  @Column({ nullable: true, default: 'Tunisie' })
  pays!: string;

  @Column({ nullable: true })
  gouvernorat!: string;

  @Column({ nullable: true })
  delegation!: string;

  @Column({ name: 'code_postal', nullable: true })
  codePostal!: string;

  @Column({ nullable: true })
  adresse!: string;

  @Column({ name: 'adresse_suite', nullable: true })
  adresseSuite!: string;

  @Column({ name: 'situation_professionnelle', nullable: true })
  situationProfessionnelle!: string;

  @Column({ nullable: true })
  profession!: string;

  @Column({ name: 'poste_actuel', nullable: true })
  posteActuel!: string;

  @Column({ name: 'date_embauche', nullable: true })
  dateEmbauche!: string;

  @Column({ nullable: true })
  entreprise!: string;

  @Column({
    name: 'revenu_mensuel',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  revenuMensuel!: number;

  @Column({ name: 'gouvernorat_agence', nullable: true })
  gouvernoratAgence!: string;

  @Column({ nullable: true })
  agence!: string;

  // ══════════════════════════════════════════════════════════
  // Statut et progression
  // ══════════════════════════════════════════════════════════

  @Column({
    type: 'enum',
    enum: CustomerStatus,
    default: CustomerStatus.DRAFT,
  })
  status!: CustomerStatus;

  @Column({
    name: 'current_step',
    default: 1,
    comment: '1=PersonalData 2=OTP 3=FATCA 4=Documents 5=PersonalForm',
  })
  currentStep!: number;

  @Column({ name: 'submitted_at', nullable: true })
  submittedAt!: Date;

  // ══════════════════════════════════════════════════════════
  // Résultat final
  // ══════════════════════════════════════════════════════════

  @Column({ name: 'account_number', nullable: true, unique: true })
  accountNumber!: string;

  @Column({ name: 'account_created_at', nullable: true })
  accountCreatedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;




  @Column({ name: 'rejection_reason', nullable: true })
rejectionReason!: string;
}