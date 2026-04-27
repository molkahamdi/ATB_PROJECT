import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

export enum AuditAction {
  LOGIN           = 'LOGIN',
  LOGOUT          = 'LOGOUT',
  APPROVE_DOSSIER = 'APPROVE_DOSSIER',
  REJECT_DOSSIER  = 'REJECT_DOSSIER',
  VIEW_DOSSIER    = 'VIEW_DOSSIER',
  VIEW_STATS      = 'VIEW_STATS',
}

@Entity('audit_logs')
@Index(['adminId'])
@Index(['action'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admin_id', nullable: true })
  adminId!: string;

  @Column({ name: 'admin_username', nullable: true })
  adminUsername!: string;

  @Column({ type: 'enum', enum: AuditAction })
  action!: AuditAction;

  @Column({ name: 'customer_id', nullable: true })
  customerId!: string;

  @Column({ name: 'customer_name', nullable: true })
  customerName!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any>;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress!: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent!: string;

  @Column({ default: true })
  success!: boolean;

  @Column({ name: 'error_message', nullable: true })
  errorMessage!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}