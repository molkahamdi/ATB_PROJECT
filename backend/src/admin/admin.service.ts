import {
  Injectable, NotFoundException, UnauthorizedException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In }   from 'typeorm';
import { Customer, CustomerStatus, IdentificationSource } from '../customer/entities/customer.entity';
import { AdminUser }        from './entities/admin-user.entity';
import { AuditLogService }  from './audit-log.service';
import { AuditAction }      from './entities/audit-log.entity';
import { EmailService }     from '../email/email.service';
import {
  AdminLoginDto, GetDossiersQueryDto, RejectDossierDto,
  AdminStatsDto, DailyVolumeItemDto,
} from './dto/admin.dto';
import { ADMIN_JWT_SECRET } from './guards/admin-jwt.guard';
import * as jwt    from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import * as fs     from 'fs';
import * as path   from 'path';

const ADMIN_VISIBLE: CustomerStatus[] = [
  CustomerStatus.SUBMITTED,
  CustomerStatus.APPROVED,
  CustomerStatus.REJECTED,
];

export interface RequestContext {
  adminId:       string;
  adminUsername: string;
  ipAddress?:    string;
  userAgent?:    string;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Customer)  private readonly customerRepo: Repository<Customer>,
    @InjectRepository(AdminUser) private readonly adminRepo:    Repository<AdminUser>,
    private readonly emailService:    EmailService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ════════════════════════════════════════════════════════
  //  AUTH — ✅ LOGIN tracé (succès + échec)
  // ════════════════════════════════════════════════════════
  async login(
    dto: AdminLoginDto,
    ctx?: { ipAddress?: string; userAgent?: string },
  ): Promise<{
    token:     string;
    expiresAt: string;
    admin:     { id: string; username: string; fullName: string };
  }> {
    const admin = await this.adminRepo.findOne({
      where: { username: dto.username, isActive: true },
    });

    if (!admin) {
      await this.auditLogService.log({
        adminId:       'unknown',
        adminUsername: dto.username,
        action:        AuditAction.LOGIN,
        ipAddress:     ctx?.ipAddress,
        userAgent:     ctx?.userAgent,
        success:       false,
        errorMessage:  'Utilisateur introuvable',
      });
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const valid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!valid) {
      await this.auditLogService.log({
        adminId:       admin.id,
        adminUsername: admin.username,
        action:        AuditAction.LOGIN,
        ipAddress:     ctx?.ipAddress,
        userAgent:     ctx?.userAgent,
        success:       false,
        errorMessage:  'Mot de passe incorrect',
      });
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const token     = jwt.sign(
      { adminId: admin.id, username: admin.username },
      ADMIN_JWT_SECRET,
      { expiresIn: '8h' },
    );
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

    // ✅ Login réussi — on connaît l'adminId réel ici
    await this.auditLogService.log({
      adminId:       admin.id,
      adminUsername: admin.username,
      action:        AuditAction.LOGIN,
      ipAddress:     ctx?.ipAddress,
      userAgent:     ctx?.userAgent,
      success:       true,
    });

    this.logger.log(`[ADMIN] Login : ${admin.username}`);
    return {
      token,
      expiresAt,
      admin: { id: admin.id, username: admin.username, fullName: admin.fullName },
    };
  }

  // ════════════════════════════════════════════════════════
  //  LISTE — ✅ Plus tracée (trop volumineuse)
  // ════════════════════════════════════════════════════════
  async getDossiers(query: GetDossiersQueryDto) {
    const {
      search, status, source, dateFrom, dateTo,
      page = 1, limit = 20, sortBy = 'submittedAt', sortOrder = 'DESC',
    } = query;

    const qb = this.customerRepo.createQueryBuilder('c');

    if (status && ADMIN_VISIBLE.includes(status as CustomerStatus)) {
      qb.where('c.status = :status', { status });
    } else {
      qb.where('c.status IN (:...statuses)', { statuses: ADMIN_VISIBLE });
    }

    if (search) {
      qb.andWhere(
        '(c.idCardNumber ILIKE :s OR c.lastName ILIKE :s OR c.firstName ILIKE :s OR c.email ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    if (source)   qb.andWhere('c.identificationSource = :source', { source });
    if (dateFrom) qb.andWhere('c.submittedAt >= :dateFrom', { dateFrom: new Date(dateFrom) });
    if (dateTo)   qb.andWhere('c.submittedAt <= :dateTo',   { dateTo:   new Date(dateTo) });

    const SAFE_SORT = ['submittedAt', 'createdAt', 'status', 'lastName'];
    qb.orderBy(`c.${SAFE_SORT.includes(sortBy) ? sortBy : 'submittedAt'}`, sortOrder);
    qb.skip((page - 1) * limit).take(limit);

    const [rows, total] = await qb.getManyAndCount();

    const data = rows.map(c => ({
      id: c.id, firstName: c.firstName, lastName: c.lastName,
      firstNameArabic: c.firstNameArabic, lastNameArabic: c.lastNameArabic,
      email: c.email, phoneNumber: c.phoneNumber, idCardNumber: c.idCardNumber,
      status: c.status, identificationSource: c.identificationSource,
      isContractSigned: c.isContractSigned, submittedAt: c.submittedAt,
      accountNumber: c.accountNumber,
      hasIdCardFront: !!c.idCardFrontPath, hasIdCardBack: !!c.idCardBackPath,
      hasPassport: !!c.passportPath, usePassport: c.usePassport,
      eHouwiyaSignatureId: c.eHouwiyaSignatureId,
    }));

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ════════════════════════════════════════════════════════
  //  FICHE COMPLÈTE — ✅ VIEW_DOSSIER tracé
  // ════════════════════════════════════════════════════════
  async getDossierById(customerId: string, ctx?: RequestContext): Promise<any> {
    const c = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!c) throw new NotFoundException(`Dossier "${customerId}" introuvable.`);

    if (!ADMIN_VISIBLE.includes(c.status as CustomerStatus)) {
      throw new BadRequestException('Ce dossier n\'a pas encore généré de contrat.');
    }

    // ✅ Audit — une seule trace par consultation de fiche
    if (ctx) {
      await this.auditLogService.log({
        ...ctx,
        action:       AuditAction.VIEW_DOSSIER,
        customerId:   c.id,
        customerName: `${c.firstName} ${c.lastName}`,
        metadata:     { cin: c.idCardNumber, status: c.status },
      });
    }

    return {
      id: c.id, firstName: c.firstName, lastName: c.lastName,
      firstNameArabic: c.firstNameArabic, lastNameArabic: c.lastNameArabic,
      gender: c.gender, nationality: c.nationality, birthDate: c.birthDate,
      birthPlace: c.birthPlace, countryOfBirth: c.countryOfBirth,
      email: c.email, phoneNumber: c.phoneNumber,
      idCardNumber: c.idCardNumber, idIssueDate: c.idIssueDate,
      identificationSource: c.identificationSource,
      status: c.status, submittedAt: c.submittedAt,
      accountNumber: c.accountNumber, accountCreatedAt: c.accountCreatedAt,
      isUsCitizen: c.isUsCitizen, isUsResident: c.isUsResident,
      hasGreenCard: c.hasGreenCard, isUsTaxpayer: c.isUsTaxpayer,
      hasUsTransfers: c.hasUsTransfers, hasUsPhone: c.hasUsPhone,
      hasUsProxy: c.hasUsProxy, isPoliticallyExposed: c.isPoliticallyExposed,
      idCardFrontPath: c.idCardFrontPath, idCardBackPath: c.idCardBackPath,
      passportPath: c.passportPath, usePassport: c.usePassport,
      hasIdCardFront: !!c.idCardFrontPath, hasIdCardBack: !!c.idCardBackPath,
      hasPassport: !!c.passportPath,
      isContractSigned: c.isContractSigned,
      eHouwiyaSignatureId: c.eHouwiyaSignatureId, eHouwiyaSignedAt: c.eHouwiyaSignedAt,
      pays: c.pays, gouvernorat: c.gouvernorat, delegation: c.delegation,
      codePostal: c.codePostal, adresse: c.adresse,
      situationProfessionnelle: c.situationProfessionnelle,
      profession: c.profession, posteActuel: c.posteActuel,
      entreprise: c.entreprise, revenuMensuel: c.revenuMensuel,
      gouvernoratAgence: c.gouvernoratAgence, agence: c.agence,
    };
  }

  // ════════════════════════════════════════════════════════
  //  DOCUMENT — ✅ Plus tracé
  // ════════════════════════════════════════════════════════
  async getDocumentBuffer(
    customerId: string,
    docType: 'cinFront' | 'cinBack' | 'passport',
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const c = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!c) throw new NotFoundException(`Dossier "${customerId}" introuvable.`);

    let filePath: string | null = null;
    let fileName = '';
    if (docType === 'cinFront') { filePath = c.idCardFrontPath; fileName = 'cin_recto.jpg'; }
    if (docType === 'cinBack')  { filePath = c.idCardBackPath;  fileName = 'cin_verso.jpg'; }
    if (docType === 'passport') { filePath = c.passportPath;    fileName = 'passeport.jpg'; }

    if (!filePath) throw new NotFoundException(`Document "${docType}" non disponible.`);

    const candidates = [
      filePath,
      path.join(process.cwd(), filePath),
      path.join(process.cwd(), 'uploads', path.basename(filePath)),
    ];
    let resolvedPath: string | null = null;
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) { resolvedPath = candidate; break; }
    }

    if (!resolvedPath) {
      this.logger.warn(`[ADMIN] Document introuvable : ${filePath}`);
      throw new NotFoundException('Fichier document introuvable sur le serveur.');
    }

    const buffer   = fs.readFileSync(resolvedPath);
    const ext      = path.extname(resolvedPath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png'
                   : ext === '.pdf' ? 'application/pdf'
                   : 'image/jpeg';

    return { buffer, mimeType, fileName };
  }

  // ════════════════════════════════════════════════════════
  //  APPROUVER — ✅ Tracé avec numéro de compte
  // ════════════════════════════════════════════════════════
  async approve(customerId: string, ctx?: RequestContext): Promise<{ status: string; accountNumber: string }> {
    const c = await this.findSubmitted(customerId);

    c.status           = CustomerStatus.APPROVED;
    c.accountCreatedAt = new Date();
    c.accountNumber    = `ATB-${Date.now().toString().slice(-8)}-${Math.floor(1000 + Math.random() * 9000)}`;

    await this.customerRepo.save(c);
    this.logger.log(`[ADMIN] Approuvé : ${customerId}`);

    if (ctx) {
      await this.auditLogService.log({
        ...ctx,
        action:       AuditAction.APPROVE_DOSSIER,
        customerId:   c.id,
        customerName: `${c.firstName} ${c.lastName}`,
        metadata:     {
          accountNumber: c.accountNumber,
          cin:           c.idCardNumber,
          email:         c.email,
        },
      });
    }

    try {
      await this.emailService.sendApprovalEmail(c.email, c.firstName, c.accountNumber);
    } catch (emailError) {
      this.logger.error(`[ADMIN] ❌ Email approbation échoué pour ${customerId}`, emailError);
    }

    return { status: c.status, accountNumber: c.accountNumber };
  }

  // ════════════════════════════════════════════════════════
  //  REJETER — ✅ Motif bien stocké dans metadata
  // ════════════════════════════════════════════════════════
  async reject(customerId: string, dto: RejectDossierDto, ctx?: RequestContext): Promise<{ status: string }> {
    const c = await this.findSubmitted(customerId);

    if (!dto.reason?.trim() || dto.reason.trim().length < 10) {
      throw new BadRequestException('Le motif de rejet est obligatoire (min. 10 caractères).');
    }

    const reason = dto.reason.trim();

    c.status = CustomerStatus.REJECTED;
    if ('rejectionReason' in c) (c as any).rejectionReason = reason;

    await this.customerRepo.save(c);
    this.logger.log(`[ADMIN] Rejeté : ${customerId} — ${reason}`);

    // ✅ metadata.reason = le motif exact saisi par l'admin
    if (ctx) {
      await this.auditLogService.log({
        ...ctx,
        action:       AuditAction.REJECT_DOSSIER,
        customerId:   c.id,
        customerName: `${c.firstName} ${c.lastName}`,
        metadata:     {
          reason,                  // ← motif visible dans le journal
          cin:   c.idCardNumber,
          email: c.email,
        },
      });
    }

    try {
      await this.emailService.sendRejectionEmail(c.email, c.firstName, reason);
    } catch (emailError) {
      this.logger.error(`[ADMIN] ❌ Email rejet échoué pour ${customerId}`, emailError);
    }

    return { status: c.status };
  }

  // ════════════════════════════════════════════════════════
  //  STATISTIQUES — ✅ Plus tracées
  // ════════════════════════════════════════════════════════
  async getStats(): Promise<AdminStatsDto> {
    const dossiers = await this.customerRepo.find({ where: { status: In(ADMIN_VISIBLE) } });

    const soumis    = dossiers.filter(d => d.status === CustomerStatus.SUBMITTED).length;
    const approuves = dossiers.filter(d => d.status === CustomerStatus.APPROVED).length;
    const rejetes   = dossiers.filter(d => d.status === CustomerStatus.REJECTED).length;
    const finalized = approuves + rejetes;

    const today      = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const dailyVolume: DailyVolumeItemDto[] = [];
    for (let i = 6; i >= 0; i--) {
      const d     = new Date(today);
      d.setDate(d.getDate() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end   = new Date(start.getTime() + 86_400_000);
      const day   = dossiers.filter(c =>
        c.submittedAt && new Date(c.submittedAt) >= start && new Date(c.submittedAt) < end,
      );
      dailyVolume.push({
        date:      start.toISOString().slice(0, 10),
        soumis:    day.filter(c => c.status === CustomerStatus.SUBMITTED).length,
        approuves: day.filter(c => c.status === CustomerStatus.APPROVED).length,
        rejetes:   day.filter(c => c.status === CustomerStatus.REJECTED).length,
      });
    }

    return {
      totalSoumis: soumis, totalApprouves: approuves, totalRejetes: rejetes,
      tauxApprobation: finalized > 0 ? Math.round(approuves / finalized * 100) : 0,
      tauxRejet:       finalized > 0 ? Math.round(rejetes   / finalized * 100) : 0,
      totalManual:          dossiers.filter(d => d.identificationSource === IdentificationSource.MANUAL).length,
      totalEhouwiya:        dossiers.filter(d => d.identificationSource === IdentificationSource.E_HOUWIYA).length,
      totalContratsSigenes: dossiers.filter(d => d.isContractSigned).length,
      dossiersAujourdHui:   dossiers.filter(d =>
        d.submittedAt && new Date(d.submittedAt) >= todayStart,
      ).length,
      dailyVolume,
    };
  }

  // ── Lecture audit ─────────────────────────────────────
  getAuditLogs(query: any)  { return this.auditLogService.getLogs(query); }
  getAuditStats()           { return this.auditLogService.getAuditStats(); }
  // ── Seed ─────────────────────────────────────────────
  async seedDefaultAdmin(): Promise<void> {
    const exists = await this.adminRepo.findOne({ where: { username: 'MolkaHamdi' } });
    if (exists) return;
    const passwordHash = await bcrypt.hash('Molkahamdi123*', 10);
    await this.adminRepo.save(
      this.adminRepo.create({
        username: 'MolkaHamdi', passwordHash,
        fullName: 'Administrateur ATB', isActive: true,
      }),
    );
    this.logger.log('[ADMIN] Admin créé → MolkaHamdi');
  }

  private async findSubmitted(customerId: string): Promise<Customer> {
    const c = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!c) throw new NotFoundException(`Dossier "${customerId}" introuvable.`);
    if (c.status !== CustomerStatus.SUBMITTED) {
      throw new BadRequestException(
        `Seuls les dossiers SUBMITTED peuvent être traités. Statut : "${c.status}".`,
      );
    }
    return c;
  }
}