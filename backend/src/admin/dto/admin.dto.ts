// ============================================================
//  backend/src/admin/dto/admin.dto.ts
// ============================================================
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsIn, IsArray, IsNumber, ValidateNested, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminLoginDto {
  @IsString() @IsNotEmpty()
  username!: string;

  @IsString() @IsNotEmpty()
  password!: string;
}

// Filtres liste dossiers — uniquement SUBMITTED et APPROVED
export class GetDossiersQueryDto {
  @IsOptional() @IsString()
  search?: string;              // CIN, nom, email

  @IsOptional() @IsString()
  @IsIn(['SUBMITTED', 'APPROVED', 'REJECTED', ''])
  status?: string;              // filtre optionnel sur SUBMITTED/APPROVED/REJECTED

  @IsOptional() @IsString()
  source?: string;              // MANUAL | E_HOUWIYA

  @IsOptional() @IsString()
  dateFrom?: string;

  @IsOptional() @IsString()
  dateTo?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  limit?: number = 20;

  @IsOptional() @IsString()
  sortBy?: string = 'submittedAt';

  @IsOptional() @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class RejectDossierDto {
  @IsString() @IsNotEmpty()
  reason!: string;
}

// New DTOs for Stats to fix TS2345 error
export class DailyVolumeItemDto {
  @IsString()
  date!: string;

  @IsPositive({ message: 'soumis must be positive' })
  @Type(() => Number)
  soumis!: number;

  @IsPositive({ message: 'approuves must be positive' })
  @Type(() => Number)
  approuves!: number;

  @IsPositive({ message: 'rejetes must be positive' })
  @Type(() => Number)
  rejetes!: number;
}

export class AdminStatsDto {
  @Type(() => Number)
  @IsPositive()
  totalSoumis!: number;

  @Type(() => Number)
  @IsPositive()
  totalApprouves!: number;

  @Type(() => Number)
  @IsPositive()
  totalRejetes!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  tauxApprobation!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  tauxRejet!: number;

  @Type(() => Number)
  @IsPositive()
  totalManual!: number;

  @Type(() => Number)
  @IsPositive()
  totalEhouwiya!: number;

  @Type(() => Number)
  @IsPositive()
  totalContratsSigenes!: number;

  @Type(() => Number)
  @IsPositive()
  dossiersAujourdHui!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyVolumeItemDto)
  dailyVolume!: DailyVolumeItemDto[];
}

