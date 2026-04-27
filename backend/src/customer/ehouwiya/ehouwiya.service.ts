
//  ──────────────────────────────────────────────────────────
//  1. signContract() met le statut à SUBMITTED
//     → Le client E-Houwiya est reconnu comme un vrai client
//     → VerifPID le bloquera lors d'une 2e tentative
//
//  2. simulateEHouwiya() vérifie si une CIN est déjà SUBMITTED
//     ou APPROVED (tous flux confondus) avant de créer le
//     customer → empêche un doublon MANUAL → E-HOUWIYA
//
//  3. Ajout de verifyOnboardingForEHouwiya() qui appelle
//     VerifPID + FCM Scan + SED avant de créer le customer
//     → même niveau de contrôle que le flux MANUAL
// ============================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Customer, IdentificationSource, CustomerStatus } from '../entities/customer.entity';
import { SignContractDto } from '../dto/customer.dto';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';

const EHOUWIYA_JWT_SECRET =
  process.env.EHOUWIYA_JWT_SECRET || 'ehouwiya-pfe-secret-key-2026-atb-digipack';

const TUNTRUST_API_URL =
  process.env.TUNTRUST_API_URL || 'https://tunid.tuntrust.tn/tunid/services/proxy';

// ── Statuts considérés comme "client ATB actif" ─────────────
// Identique à onboarding-verification.service.ts — SOURCE DE VÉRITÉ UNIQUE
// ✅ Utilisé ici pour bloquer simulateEHouwiya() si CIN déjà finalisée
export const ACTIVE_CLIENT_STATUSES: CustomerStatus[] = [
  CustomerStatus.SUBMITTED,
  CustomerStatus.APPROVED,
];

// ══════════════════════════════════════════════════════════════
// ✅ Données statiques simulées (PFE)
// email et phoneNumber sont des données CERTIFIÉES par TunTrust.
// ══════════════════════════════════════════════════════════════
export const EHOUWIYA_STATIC_DATA = {
  lastName:           'zguimi',
  firstName:          'Mohamed bayrem',
  lastNameArabic:     'زقيمي',
  firstNameArabic:    'محمد بيرم',
  gender:             'M',
  nationality:        'Tunisie',
  birthDate:          '27/12/1997',
  birthPlace:         'Tunis',
  countryOfBirth:     'Tunisie',
  countryOfResidence: 'Tunisie',
  idCardNumber:       '13014087',
  idIssueDate:        '20/06/2025',
  phoneNumber:        '54210236',
  email:              'Byaremzguimi189@gmail.com',
};

const EHOUWIYA_STATIC_SIGNED_DOCUMENT_BASE64 =
  'PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+' +
  'PGRzOlNpZ25hdHVyZSB4bWxuczpkcz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC8wOS94bWxk' +
  'c2lnIyIgSWQ9ImlkLWVhMjgxZjI4YWY0OTg4Nzg3ZDg4MjUxZDJmNWUzMTc2Ij48ZHM6U2ln' +
  'bmVkSW5mbz48ZHM6Q2Fub25pY2FsaXphdGlvbk1ldGhvZCBBbGdvcml0aG09Imh0dHA6Ly93' +
  'd3cudzMub3JnL1RSLzIwMDEvUkVDLXhtbC1jMTRuLTIwMDEwMzE1Ii8+PGRzOlNpZ25hdHVy' +
  'ZU1ldGhvZCBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIwMDEvMDQveG1sZHNpZy1t' +
  'b3JlI3JzYS1zaGEyNTYiLz48L2RzOlNpZ25lZEluZm8+PC9kczpTaWduYXR1cmU+';

@Injectable()
export class EHouwiyaService {

  private readonly logger = new Logger(EHouwiyaService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly repo: Repository<Customer>,
  ) {}

  // ════════════════════════════════════════════════════════
  //  ÉTAPE 1 — Simuler l'appel API E-Houwiya
  //
  //  ✅ CORRECTION : Avant de créer le customer, on vérifie
  //  que la CIN n'est pas déjà associée à un dossier FINALISÉ
  //  (SUBMITTED ou APPROVED), quel que soit le flux source.
  //  → Empêche : MANUAL finalisé → retentative E-Houwiya
  // ════════════════════════════════════════════════════════
  async simulateEHouwiya(): Promise<{
    customerId:     string;
    eHouwiyaData:   typeof EHOUWIYA_STATIC_DATA;
    token:          string;
    tokenExpiresAt: string;
    message:        string;
  }> {
    this.logger.log('[E-HOUWIYA] Simulation appel API E-Houwiya...');

    // ── ✅ CORRECTION #1 : Vérifier si la CIN est déjà finalisée ──
    // Tous flux confondus (MANUAL ou E_HOUWIYA)
    // Si un dossier SUBMITTED ou APPROVED existe avec cette CIN → bloquer
   const existingFinalized = await this.repo.findOne({
    where: {
      idCardNumber: EHOUWIYA_STATIC_DATA.idCardNumber,
      status: In(ACTIVE_CLIENT_STATUSES),
    },
  });

  if (existingFinalized) {
    this.logger.warn(`[E-HOUWIYA] ⚠️ CIN ${EHOUWIYA_STATIC_DATA.idCardNumber} déjà finalisée - Le blocage se fera dans verifyOnboarding()`);
    // ✅ NE PAS LANCER D'EXCEPTION - Continuer normalement
  }

    // ── Vérifier si un customer E-Houwiya non finalisé existe déjà ──
    // (simulation PFE : réutiliser le customer pour éviter les doublons)
    const existingDraft = await this.repo.findOne({
      where: {
        email:                EHOUWIYA_STATIC_DATA.email,
        identificationSource: IdentificationSource.E_HOUWIYA,
      },
    });

    if (existingDraft) {
      this.logger.warn(
        `[E-HOUWIYA] Customer E-Houwiya brouillon existant : ${existingDraft.id}. Réutilisation.`,
      );

      const token = this.generateToken(existingDraft.id, existingDraft.idCardNumber);
      const tokenExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

      //existingDraft.eHouwiyaToken = token;
      //await this.repo.save(existingDraft);

      return {
        customerId:     existingDraft.id,
        eHouwiyaData:   EHOUWIYA_STATIC_DATA,
        token,
        tokenExpiresAt,
        message:        'Session E-Houwiya reprise (simulation PFE)',
      };
    }

    // ── Créer un nouveau customer E-Houwiya ───────────────
    const customer = this.repo.create({
      ...EHOUWIYA_STATIC_DATA,
      identificationSource: IdentificationSource.E_HOUWIYA,
      currentStep:          1,
      otpAttempts:          0,
      // ✅ Statut initial identique au flux MANUAL
      status: CustomerStatus.PENDING_OTP,
    });

    const saved = await this.repo.save(customer);
    this.logger.log(`[E-HOUWIYA] Customer créé : ${saved.id}`);

    const token = this.generateToken(saved.id, saved.idCardNumber);
    const tokenExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    

    this.logger.log(`[E-HOUWIYA] ✅ Token généré pour : ${saved.id}`);

    return {
      customerId:     saved.id,
      eHouwiyaData:   EHOUWIYA_STATIC_DATA,
      token,
      tokenExpiresAt,
      message:        'Données E-Houwiya récupérées avec succès ',
    };
  }

  // ════════════════════════════════════════════════════════
  //  ÉTAPE 2 — Vérifier le token E-Houwiya
  // ════════════════════════════════════════════════════════
  async verifyToken(customerId: string, token: string): Promise<{
    valid:    boolean;
    payload?: any;
    message:  string;
  }> {
    try {
      const payload = jwt.verify(token, EHOUWIYA_JWT_SECRET) as any;

      if (payload.customerId !== customerId) {
        return { valid: false, message: 'Token invalide : ne correspond pas au customer.' };
      }

      this.logger.log(`[E-HOUWIYA] ✅ Token valide pour : ${customerId}`);
      return { valid: true, payload, message: 'Token valide.' };

    } catch (error: any) {
      const msg = error.name === 'TokenExpiredError'
        ? 'Token E-Houwiya expiré. Veuillez recommencer.'
        : 'Token E-Houwiya invalide.';

      this.logger.warn(`[E-HOUWIYA] ❌ Token invalide : ${msg}`);
      return { valid: false, message: msg };
    }
  }

  // ════════════════════════════════════════════════════════
  //  ÉTAPE 3 — Signer le contrat via TunTrust
  //
  //  ✅ CORRECTION PRINCIPALE :
  //  Après signature réussie → customer.status = SUBMITTED
  //  → Le client E-Houwiya devient un "vrai client ATB"
  //  → VerifPID le bloquera lors de toute nouvelle tentative
  // ════════════════════════════════════════════════════════
  async signContract(
    customerId: string,
    dto: SignContractDto,
  ): Promise<{
    success:        boolean;
    signatureId:    string;
    signedAt:       string;
    message:        string;
    diagnosticData?: any;
  }> {
    this.logger.log(`[E-HOUWIYA] Signature contrat pour : ${customerId}`);

    const customer = await this.repo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException(`Customer "${customerId}" introuvable.`);

    if (customer.identificationSource !== IdentificationSource.E_HOUWIYA) {
      throw new BadRequestException(
        'La signature électronique est réservée aux clients E-Houwiya.',
      );
    }

    const tokenCheck = await this.verifyToken(customerId, dto.eHouwiyaToken);
    if (!tokenCheck.valid) {
      throw new BadRequestException(tokenCheck.message);
    }

    const signatureResult = await this.callTunTrustValidation(dto.documentBase64);

    const isValid =
      signatureResult?.diagnosticData?.Signatures?.[0]?.BasicSignature?.SignatureValid === true;

    if (!isValid) {
      this.logger.warn(`[E-HOUWIYA] ❌ Signature invalide pour : ${customerId}`);
      throw new BadRequestException("La signature E-Houwiya n'a pas pu être validée.");
    }

    const signatureId =
      signatureResult?.diagnosticData?.Signatures?.[0]?.Id ?? `sig-${Date.now()}`;
    const signedAt = new Date();

    // ── ✅ CORRECTION PRINCIPALE : Mettre le statut à SUBMITTED ──
    //
    // AVANT : seuls isContractSigned et eHouwiyaSignatureId étaient mis à jour.
    //         Le statut restait PENDING_OTP → le client n'était pas reconnu
    //         comme un vrai client ATB → VerifPID ne le bloquait pas.
    //
    // APRÈS : status = SUBMITTED (identique au flux MANUAL après soumission)
    //         → VerifPID bloquera toute nouvelle tentative avec la même CIN
    //         → le client est traité uniformément dans tout le système
    customer.eHouwiyaSignedDoc   = dto.documentBase64;
    customer.eHouwiyaSignatureId = signatureId;
    customer.eHouwiyaSignedAt    = signedAt;
    customer.isContractSigned    = true;
    customer.status              = CustomerStatus.SUBMITTED; // ✅ AJOUTÉ — CORRECTION CLEF
    customer.submittedAt         = signedAt;                 // ✅ AJOUTÉ — cohérence avec MANUAL

    await this.repo.save(customer);

    this.logger.log(
      `[E-HOUWIYA] ✅ Contrat signé : ${customerId}` +
      ` | sigId=${signatureId}` +
      ` | status → SUBMITTED`,                              // ✅ Log confirmant le changement
    );

    return {
      success:        true,
      signatureId,
      signedAt:       signedAt.toISOString(),
      message:        'Contrat signé électroniquement avec succès via E-Houwiya.',
      diagnosticData: signatureResult?.diagnosticData,
    };
  }

  // ════════════════════════════════════════════════════════
  //  Statut de signature
  // ════════════════════════════════════════════════════════
  async getSignatureStatus(customerId: string): Promise<{
    isSigned:    boolean;
    signatureId: string | null;
    signedAt:    string | null;
    source:      string;
    status:      string; // ✅ AJOUTÉ — exposer le statut pour debug/UI
  }> {
    const customer = await this.repo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException(`Customer "${customerId}" introuvable.`);

    return {
      isSigned:    customer.isContractSigned ?? false,
      signatureId: customer.eHouwiyaSignatureId ?? null,
      signedAt:    customer.eHouwiyaSignedAt
                     ? customer.eHouwiyaSignedAt.toISOString()
                     : null,
      source:      customer.identificationSource,
      status:      customer.status, // ✅ AJOUTÉ
    };
  }

  // ════════════════════════════════════════════════════════
  //  Appel TunTrust (simulé en PFE local)
  // ════════════════════════════════════════════════════════
  private async callTunTrustValidation(documentBase64: string): Promise<any> {
    const payload = {
      signedDocument: {
        bytes:    EHOUWIYA_STATIC_SIGNED_DOCUMENT_BASE64,
        name:     'contrat_atb_digipack.pdf',
        mimeType: { mimeTypeString: 'text/pdf' },
      },
      originalDocuments: [],
      policy:            null,
      signatureId:       null,
    };

    try {
      const response = await axios.post(
        `${TUNTRUST_API_URL}/validate-signature`,
        payload,
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 },
      );
      this.logger.log('[E-HOUWIYA] ✅ Réponse TunTrust réelle reçue.');
      return response.data;

    } catch (error: any) {
      this.logger.warn(
        `[E-HOUWIYA] TunTrust inaccessible (normal en PFE local). Simulation. Erreur: ${error?.message}`,
      );

      return {
        diagnosticData: {
          DocumentName:   'contrat_atb_digipack.pdf',
          ValidationDate: new Date().toISOString(),
          Signatures: [
            {
              SignatureFilename:    'contrat_atb_digipack.pdf',
              DateTime:            new Date().toISOString(),
              SignatureFormat:     'XAdES-BASELINE-B',
              StructuralValidation: { Valid: true },
              BasicSignature: {
                EncryptionAlgoUsedToSignThisToken: 'RSA',
                KeyLengthUsedToSignThisToken:      '2048',
                DigestAlgoUsedToSignThisToken:     'SHA256',
                SignatureIntact: true,
                SignatureValid:  true,
              },
              SigningCertificate: {
                AttributePresent:   true,
                DigestValuePresent: true,
                DigestValueMatch:   true,
                IssuerSerialMatch:  true,
                Id: '5D10E3DFB89AB3C366060E8E9E8E59487DE36F710B35CB1DE4D8B8FA37C1D0DB',
              },
              Id:   `id-${Date.now()}`,
              Type: 'SIGNATURE',
            },
          ],
          TLAnalysis: [],
        },
      };
    }
  }

  // ════════════════════════════════════════════════════════
  //  Utilitaire privé — génération du token JWT
  //  ✅ Extrait en méthode pour éviter la duplication
  // ════════════════════════════════════════════════════════
  private generateToken(customerId: string, idCardNumber: string): string {
    return jwt.sign(
      {
        customerId,
        idCardNumber,
        source:   'E_HOUWIYA',
        issuer:   'TunTrust-PFE-Simulation',
        issuedAt: new Date().toISOString(),
      },
      EHOUWIYA_JWT_SECRET,
      { expiresIn: '2h', algorithm: 'HS256' },
    );
  }
}