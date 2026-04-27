
//  1. VerifPID cherche une CIN finalisée TOUS FLUX CONFONDUS
//     → SUBMITTED ou APPROVED, E_HOUWIYA ou MANUAL indifféremment
//     → Empêche : E-Houwiya signé → retentative MANUAL avec même CIN
//     → Empêche : MANUAL finalisé → retentative E-Houwiya
//
//  2. Log enrichi : affiche identificationSource du doublon trouvé
//     pour faciliter le débogage
//
//  3. ACTIVE_CLIENT_STATUSES inclut aussi SUBMITTED et APPROVED,
//     inchangé — mais maintenant les clients E-Houwiya atteignent
//     bien SUBMITTED grâce à la correction dans EHouwiyaService
// ============================================================

import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Customer, CustomerStatus } from './entities/customer.entity';

const axios = require('axios');

export interface VerificationResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

// ── Statuts considérés comme "client ATB actif" ──────────────
// ✅ Inchangé — mais maintenant cohérent avec les deux flux :
//    - MANUAL   : atteint SUBMITTED via ContractScreen/soumission
//    - E_HOUWIYA : atteint SUBMITTED via EHouwiyaService.signContract()
//                  (correction apportée dans ehouwiya.service.ts)
//
// Un client est "actif" uniquement s'il a finalisé son dossier.
// Les statuts intermédiaires ne bloquent pas → l'utilisateur
// peut reprendre ou recommencer avec une nouvelle session.
const ACTIVE_CLIENT_STATUSES: CustomerStatus[] = [
  CustomerStatus.SUBMITTED,
  CustomerStatus.APPROVED,
];

// ── FCM SCAN : mots-clés bloqués ─────────────────────────────
const FCM_BLOCKED_KEYWORDS: string[] = [
  'ben ali', 'zine el abidine', 'trabelsi', 'gaddafi',
  'moubarak', 'saddam hussein', 'bin laden', 'oussama laden',
  'baghdadi', 'ghanouchi', 'tarabouli',
  'بن علي', 'زين العابدين', 'القذافي', 'بن لادن',
  'صدام حسين', 'البغدادي', 'الغنوشي', 'الترابي',
].map(k => k.trim()).filter(k => k.length >= 4);

// ── SED : CIN interdites de chéquier (simulation) ────────────
const SED_BLOCKED_CIN = ['01830150', '00000002'];

@Injectable()
export class OnboardingVerificationService {
  private readonly logger = new Logger(OnboardingVerificationService.name);

  private readonly USE_STATIC   = process.env.USE_STATIC_RESPONSES !== 'false';
  private readonly FCM_SCAN_URL = process.env.FCM_SCAN_URL || 'http://banking-api/fcm/scan';
  private readonly SED_URL      = process.env.SED_URL      || 'http://banking-api/sed';
  private readonly FCM_RISK_URL = process.env.FCM_RISK_URL || 'http://banking-api/fcm/risk';

  constructor(
    @InjectRepository(Customer)
    private readonly repo: Repository<Customer>,
  ) {}

  private async findOrFail(id: string): Promise<Customer> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`Customer "${id}" introuvable.`);
    return c;
  }

  private normalizeLatin(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  private toIsoDate(d: string): string {
    if (!d) return '';
    const [dd, mm, yyyy] = d.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }

  // ════════════════════════════════════════════════════════════
  //  API #1 — verifyOnboarding  (appelé depuis Écran 1)
  //  VerifPID → FCM SCAN → SED
  //
  //  ✅ Appelé dans les DEUX flux (MANUAL et E-HOUWIYA)
  //  depuis OnboardingPersonalDataScreen.handleContinue()
  // ════════════════════════════════════════════════════════════
  async verifyOnboarding(customerId: string): Promise<VerificationResult> {
    const customer = await this.findOrFail(customerId);

    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.log(`[VERIFY-ONBOARDING] Démarrage`);
    this.logger.log(`  customerId         : ${customerId}`);
    this.logger.log(`  CIN                : ${customer.idCardNumber}`);
    this.logger.log(`  Nom                : ${customer.firstName} ${customer.lastName}`);
    this.logger.log(`  Nom arabe          : ${customer.firstNameArabic ?? ''} ${customer.lastNameArabic ?? ''}`);
    this.logger.log(`  Statut actuel      : ${customer.status}`);
    this.logger.log(`  Source             : ${customer.identificationSource}`); // ✅ AJOUTÉ
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // ─── 1. VerifPID ─────────────────────────────────────────
    //
    // ✅ CORRECTION PRINCIPALE :
    //
    // La recherche de doublon s'applique TOUS FLUX CONFONDUS.
    // On cherche une CIN finalisée (SUBMITTED ou APPROVED)
    // indépendamment de identificationSource (MANUAL ou E_HOUWIYA).
    //
    // Scénarios bloqués :
    //   A) E_HOUWIYA signé (SUBMITTED) + tentative MANUAL    → BLOQUÉ ✅
    //   B) MANUAL finalisé (SUBMITTED) + tentative E_HOUWIYA → BLOQUÉ ✅
    //      (E_HOUWIYA bloqué dès simulateEHouwiya() côté EHouwiyaService)
    //   C) Double MANUAL avec même CIN                        → BLOQUÉ ✅ (déjà le cas)
    //   D) Double E_HOUWIYA avec même CIN                     → BLOQUÉ ✅ (nouveau)
    //
    // Pourquoi ça fonctionnait avant seulement partiellement :
    //   → Les clients E_HOUWIYA restaient en PENDING_OTP (bug corrigé
    //     dans ehouwiya.service.ts : signContract met maintenant SUBMITTED)
    //   → Donc PENDING_OTP n'était pas dans ACTIVE_CLIENT_STATUSES
    //   → Le doublon E-Houwiya passait toujours à travers VerifPID
    //
    this.logger.log('[VerifPID] Recherche doublon CIN (tous flux)...');
    this.logger.log(`[VerifPID] Statuts bloquants : ${ACTIVE_CLIENT_STATUSES.join(', ')}`);
    this.logger.log(`[VerifPID] ⚠️ Statuts intermédiaires ne bloquent PAS (reprise autorisée)`);

    {
      // ✅ Pas de filtre sur identificationSource — on cherche TOUS les flux
      const existingClient = await this.repo.findOne({
        where: {
          idCardNumber: customer.idCardNumber,
          id:           Not(customerId),
          status:       In(ACTIVE_CLIENT_STATUSES),
          // ✅ PAS de filtre identificationSource ici
          //    → un client E-Houwiya SUBMITTED bloque un MANUAL et vice-versa
        },
      });

      if (existingClient) {
        this.logger.warn(`[VerifPID] ❌ BLOQUÉ — Doublon CIN trouvé`);
        this.logger.warn(`  ID trouvé          : ${existingClient.id}`);
        this.logger.warn(`  Statut             : ${existingClient.status}`);
        this.logger.warn(`  Source             : ${existingClient.identificationSource}`); // ✅ AJOUTÉ
        this.logger.warn(`  Nom                : ${existingClient.firstName} ${existingClient.lastName}`);
        return {
          success: false,
          message: 'Cette carte d\'identité est déjà associée à un compte ATB. Il n\'est pas possible d\'ouvrir un deuxième compte.',
          details: {
            step:                    'VERIF_PID',
            blocked:                 true,
            existingCustomerId:      existingClient.id,
            existingStatus:          existingClient.status,
            existingSource:          existingClient.identificationSource, // ✅ AJOUTÉ
          },
        };
      }

      // Log informatif pour les brouillons (non bloquant)
      const intermediateStatuses: CustomerStatus[] = [
        CustomerStatus.PENDING_OTP,
        CustomerStatus.FATCA_PENDING,
        CustomerStatus.DOCUMENTS_PENDING,
        CustomerStatus.PERSONAL_PENDING,
      ];

      const existingDraft = await this.repo.findOne({
        where: {
          idCardNumber: customer.idCardNumber,
          id:           Not(customerId),
          status:       In(intermediateStatuses),
        },
      });

      if (existingDraft) {
        this.logger.log(`[VerifPID] ℹ️  Brouillon non finalisé trouvé`);
        this.logger.log(`[VerifPID]    → ID     : ${existingDraft.id}`);
        this.logger.log(`[VerifPID]    → Statut : ${existingDraft.status}`);
        this.logger.log(`[VerifPID]    → Source : ${existingDraft.identificationSource}`);
        this.logger.log(`[VerifPID]    → Processus non terminé → nouvelle session autorisée`);
      }

      this.logger.log('[VerifPID] ✅ OK — Aucun doublon CIN finalisé');
    }

    // ─── 2. FCM SCAN ─────────────────────────────────────────
    this.logger.log('[FCM SCAN] Vérification des noms...');
    {
      let blocked   = false;
      let matchedKw = '';

      if (this.USE_STATIC) {
        const latinFull  = this.normalizeLatin(`${customer.firstName} ${customer.lastName}`);
        const arabicFull = `${customer.firstNameArabic ?? ''} ${customer.lastNameArabic ?? ''}`.trim();

        this.logger.log(`[FCM SCAN] Nom latin normalisé : "${latinFull}"`);
        this.logger.log(`[FCM SCAN] Nom arabe           : "${arabicFull}"`);
        this.logger.log(`[FCM SCAN] Nb mots-clés testés : ${FCM_BLOCKED_KEYWORDS.length}`);

        for (const kw of FCM_BLOCKED_KEYWORDS) {
          const isArabic = /[\u0600-\u06FF]/.test(kw);
          if (isArabic) {
            if (arabicFull.includes(kw)) {
              blocked = true; matchedKw = kw;
              this.logger.warn(`[FCM SCAN] ❌ Match arabe : "${kw}" dans "${arabicFull}"`);
              break;
            }
          } else {
            const nkw = this.normalizeLatin(kw);
            if (latinFull.includes(nkw)) {
              blocked = true; matchedKw = kw;
              this.logger.warn(`[FCM SCAN] ❌ Match latin : "${nkw}" dans "${latinFull}"`);
              break;
            }
          }
        }

        if (!blocked) {
          this.logger.log('[FCM SCAN] ✅ OK — Aucun mot-clé ne correspond');
        }

      } else {
        const { data } = await axios.post(this.FCM_SCAN_URL, {
          incorporation_country: 'TN', organization_code: 'AG',
          tax_registration_code: customer.idCardNumber,
          entity_type: 'individual',
          birth_date: this.toIsoDate(customer.birthDate),
          country: 'TN', type: 'string', value: 'string',
          first_name: customer.firstName,
          full_name: `${customer.firstName} ${customer.lastName}`,
          language: 'en', last_name: customer.lastName,
          relation_type: 'string', gateway: 'ONBOARDING',
          mandator: 'TN0010002', requester: 'CUSTOMER', version: '1.0',
        }, { timeout: 10000 }).catch((e: any) => {
          throw new BadRequestException(`FCM SCAN: ${e.message}`);
        });
        blocked = data?.scan_response?.status !== 'OK';
        this.logger.log(`[FCM SCAN] Réponse API : status=${data?.scan_response?.status}`);
      }

      if (blocked) {
        return {
          success: false,
          message: 'Votre dossier ne peut pas être traité en ligne. Veuillez vous présenter directement en agence ATB muni de vos documents d\'identité.',
          details: { step: 'FCM_SCAN', blocked: true, matchedKeyword: matchedKw },
        };
      }
    }

    // ─── 3. SED ──────────────────────────────────────────────
    this.logger.log('[SED] Vérification interdiction chéquier...');
    {
      let blocked = false;

      if (this.USE_STATIC) {
        blocked = SED_BLOCKED_CIN.includes(customer.idCardNumber);
        this.logger.log(`[SED] CIN="${customer.idCardNumber}" dans SED_BLOCKED_CIN : ${blocked}`);
      } else {
        const { data } = await axios.post(
          this.SED_URL, { cin: customer.idCardNumber }, { timeout: 10000 },
        ).catch((e: any) => { throw new BadRequestException(`SED: ${e.message}`); });
        const cci = data?.Bct_Reponse?.[0]?.domaine_cci ?? [];
        blocked   = data?.Bct_code_ret !== 'BCTWS000' || cci.length > 0;
        this.logger.log(`[SED] Bct_code_ret=${data?.Bct_code_ret} domaine_cci.length=${cci.length}`);
      }

      if (blocked) {
        this.logger.warn('[SED] ❌ BLOQUÉ — Restriction bancaire détectée');
        return {
          success: false,
          message: 'Votre dossier présente une restriction bancaire. Veuillez contacter votre agence ATB pour régulariser votre situation.',
          details: { step: 'SED', blocked: true },
        };
      }

      this.logger.log('[SED] ✅ OK — Aucune restriction');
    }

    this.logger.log('[VERIFY-ONBOARDING] ✅ TOUTES LES VÉRIFICATIONS PASSÉES');
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return {
      success: true,
      message: 'Vérification réussie. Vous pouvez continuer votre demande.',
      details: { verifPid: 'OK', fcmScan: 'OK', sed: 'OK' },
    };
  }

  // ════════════════════════════════════════════════════════════
  //  API #2 — verifyRisk  (Écran 2)
  //  FCM RISK — inchangé
  // ════════════════════════════════════════════════════════════
  async verifyRisk(customerId: string): Promise<VerificationResult> {
    const customer = await this.findOrFail(customerId);

    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.log(`[VERIFY-RISK] Démarrage pour customer=${customerId}`);

    let riskStatus = 'LR';

    if (this.USE_STATIC) {
      riskStatus = 'LR';
      this.logger.log('[FCM RISK][STATIC] riskStatus=LR — passe toujours');
    } else {
      const title = customer.gender === 'M' ? 'Mr' : 'Mrs';
      const { data } = await axios.post(this.FCM_RISK_URL, {
        application: 'FCM', bankId2: '1001', birthCountry: 'TN',
        birthDate: `${this.toIsoDate(customer.birthDate)} 00:00:00`,
        branch: 'TN0010002', careOf: 'false', closed: 'false',
        company: 'TN0010002',
        coreData1: '0.5', coreData2: '0.5', coreData3: '0.5',
        coreData4: '0.5', coreData5: '0.5',
        country: customer.countryOfResidence === 'Tunisie' ? 'TN' : customer.countryOfResidence,
        customerId: '-1',
        firstName: `${customer.firstName} ${customer.lastName}`,
        name: `${customer.firstName} ${customer.lastName}`,
        nationalId: customer.idCardNumber, occupation: '1111',
        pep: 'false', segmentCode: '1001',
        telephoneNumberFix: customer.phoneNumber || '00000000',
        telephoneNumberMobile: customer.phoneNumber || '00000000',
        title, typeId: 'T24', natCountry: 'TN',
      }, { timeout: 10000 })
      .catch((e: any) => { throw new BadRequestException(`FCM RISK: ${e.message}`); });
      riskStatus = data?.riskStatus;
      this.logger.log(`[FCM RISK] riskStatus=${riskStatus}`);
    }

    if (riskStatus !== 'LR') {
      this.logger.warn(`[FCM RISK] ❌ BLOQUÉ — riskStatus=${riskStatus}`);
      return {
        success: false,
        message: 'Votre profil ne répond pas aux critères d\'éligibilité pour l\'ouverture d\'un compte en ligne. Veuillez vous rendre en agence ATB.',
        details: { step: 'FCM_RISK', blocked: true, riskStatus },
      };
    }

    this.logger.log('[VERIFY-RISK] ✅ Low Risk — dossier éligible');
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return {
      success: true,
      message: 'Évaluation du risque réussie. Votre dossier est éligible.',
      details: { fcmRisk: 'OK', riskStatus: 'LR', riskLevel: 0 },
    };
  }
}