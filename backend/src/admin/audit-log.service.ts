import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindManyOptions } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';

export interface CreateAuditLogDto {
  adminId:       string;
  adminUsername: string;
  action:        AuditAction;
  customerId?:   string;
  customerName?: string;
  metadata?:     Record<string, any>;
  ipAddress?:    string;
  userAgent?:    string;
  success?:      boolean;
  errorMessage?: string;
}

export interface AuditLogQuery {
  adminId?:   string;
  action?:    AuditAction;
  dateFrom?:  string;
  dateTo?:    string;
  page?:      number;
  limit?:     number;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  // ── Créer une entrée d'audit ──────────────────────────────
  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      const entry = this.repo.create({
        adminId:       dto.adminId,
        adminUsername: dto.adminUsername,
        action:        dto.action,
        customerId:    dto.customerId,
        customerName:  dto.customerName,
        metadata:      dto.metadata ?? {},
        ipAddress:     dto.ipAddress,
        userAgent:     dto.userAgent?.slice(0, 255), // tronquer si trop long
        success:       dto.success ?? true,
        errorMessage:  dto.errorMessage,
      });
      await this.repo.save(entry);
    } catch (err) {
      // Ne jamais crasher l'appli à cause de l'audit
      this.logger.error('[AUDIT] Échec enregistrement log', err);
    }
  }

  // ── Récupérer les logs paginés ────────────────────────────
  async getLogs(query: AuditLogQuery): Promise<{
    data:       AuditLog[];
    total:      number;
    page:       number;
    totalPages: number;
  }> {
    const { adminId, action, dateFrom, dateTo, page = 1, limit = 50 } = query;

    const where: FindManyOptions<AuditLog>['where'] = {};

    if (adminId) (where as any).adminId = adminId;
    if (action)  (where as any).action  = action;
    if (dateFrom || dateTo) {
      (where as any).createdAt = Between(
        dateFrom ? new Date(dateFrom) : new Date('2000-01-01'),
        dateTo   ? new Date(dateTo)   : new Date(),
      );
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      order:  { createdAt: 'DESC' },
      skip:   (page - 1) * limit,
      take:   limit,
    });

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ── Statistiques pour le dashboard ───────────────────────
  async getAuditStats(): Promise<{
    totalActions:    number;
    totalApprouves:  number;
    totalRejetes:    number;
    totalLogins:     number;
    recentActivity:  AuditLog[];
  }> {
    const [totalActions, totalApprouves, totalRejetes, totalLogins, recentActivity] =
      await Promise.all([
        this.repo.count(),
        this.repo.count({ where: { action: AuditAction.APPROVE_DOSSIER, success: true } }),
        this.repo.count({ where: { action: AuditAction.REJECT_DOSSIER,  success: true } }),
        this.repo.count({ where: { action: AuditAction.LOGIN,           success: true } }),
        this.repo.find({ order: { createdAt: 'DESC' }, take: 10 }),
      ]);

    return { totalActions, totalApprouves, totalRejetes, totalLogins, recentActivity };
  }
}