// ============================================================
//  backend/src/admin/entities/admin-user.entity.ts
//  Un seul rôle ADMIN — pas de hiérarchie complexe
// ============================================================
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  username!: string;

  @Column()
  passwordHash!: string;

  @Column({ nullable: true })
  fullName!: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}