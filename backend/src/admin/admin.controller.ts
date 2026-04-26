// ============================================================
//  backend/src/admin/admin.controller.ts
//  ✅ buildCtx corrigé — lit req.admin.adminId / req.admin.username
//  ✅ VIEW_LIST et VIEW_DOCUMENT supprimés
//  ✅ @Req() présent sur toutes les routes protégées
// ============================================================
import {
  Controller, Post, Get, Patch, Body, Param,
  Query, HttpCode, HttpStatus, UseGuards, Req,
  OnModuleInit, Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AdminService, RequestContext } from './admin.service';
import { AdminJwtGuard }  from './guards/admin-jwt.guard';
import { AdminLoginDto, GetDossiersQueryDto, RejectDossierDto } from './dto/admin.dto';

// ── Helpers ───────────────────────────────────────────────
function extractIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded)
      .split(',')[0].trim();
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

function buildCtx(req: Request): RequestContext {
  // Le guard attache le payload JWT sous req.admin
  const admin = (req as any).admin as { adminId: string; username: string } | undefined;

  return {
    adminId:       admin?.adminId  ?? 'unknown',
    adminUsername: admin?.username ?? 'unknown',
    ipAddress:     extractIp(req),
    userAgent:     req.headers['user-agent'] ?? '',
  };
}

@Controller('admin')
export class AdminController implements OnModuleInit {
  constructor(private readonly svc: AdminService) {}

  async onModuleInit() {
    await this.svc.seedDefaultAdmin();
  }

  // ── POST /admin/login ────────────────────────────────────
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: AdminLoginDto, @Req() req: Request) {
    return this.svc.login(dto, {
      ipAddress: extractIp(req),
      userAgent: req.headers['user-agent'] ?? '',
    });
  }

  // ── GET /admin/dossiers ──────────────────────────────────
  // ✅ Plus de log VIEW_LIST — on passe ctx: undefined
  @Get('dossiers')
  @UseGuards(AdminJwtGuard)
  getDossiers(@Query() query: GetDossiersQueryDto) {
    return this.svc.getDossiers(query);
  }

  // ── GET /admin/dossiers/:id ──────────────────────────────
  @Get('dossiers/:id')
  @UseGuards(AdminJwtGuard)
  getDossier(@Param('id') id: string, @Req() req: Request) {
    return this.svc.getDossierById(id, buildCtx(req));
  }

  // ── GET /admin/dossiers/:id/document/:type ───────────────
  // ✅ Plus de log VIEW_DOCUMENT
  @Get('dossiers/:id/document/:type')
  @UseGuards(AdminJwtGuard)
  async getDocument(
    @Param('id')   id:   string,
    @Param('type') type: string,
    @Res()         res:  Response,
  ) {
    const validTypes = ['cinFront', 'cinBack', 'passport'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ message: 'Type de document invalide.' });
      return;
    }
    try {
      // ✅ ctx non passé → pas de log audit pour les documents
      const { buffer, mimeType, fileName } = await this.svc.getDocumentBuffer(
        id,
        type as 'cinFront' | 'cinBack' | 'passport',
      );
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.send(buffer);
    } catch (err: any) {
      res.status(err.status || 500).json({ message: err.message });
    }
  }

  // ── PATCH /admin/dossiers/:id/approve ───────────────────
  @Patch('dossiers/:id/approve')
  @UseGuards(AdminJwtGuard)
  @HttpCode(HttpStatus.OK)
  async approve(@Param('id') id: string, @Req() req: Request) {
    const result = await this.svc.approve(id, buildCtx(req));
    return { success: true, message: 'Dossier approuvé.', data: result };
  }

  // ── PATCH /admin/dossiers/:id/reject ────────────────────
  @Patch('dossiers/:id/reject')
  @UseGuards(AdminJwtGuard)
  @HttpCode(HttpStatus.OK)
  async reject(@Param('id') id: string, @Body() dto: RejectDossierDto, @Req() req: Request) {
    const result = await this.svc.reject(id, dto, buildCtx(req));
    return { success: true, message: 'Dossier rejeté.', data: result };
  }

  // ── GET /admin/stats ─────────────────────────────────────
  // ✅ Plus de log VIEW_STATS non plus — trop fréquent
  @Get('stats')
  @UseGuards(AdminJwtGuard)
  getStats() {
    return this.svc.getStats();
  }

  // ── GET /admin/audit-logs ────────────────────────────────
  @Get('audit-logs')
  @UseGuards(AdminJwtGuard)
  getAuditLogs(@Query() query: any) {
    return this.svc.getAuditLogs(query);
  }

  // ── GET /admin/audit-logs/stats ──────────────────────────
  @Get('audit-logs/stats')
  @UseGuards(AdminJwtGuard)
  getAuditStats() {
    return this.svc.getAuditStats();
  }
}