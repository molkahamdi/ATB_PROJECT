// backend/src/admin/guards/admin-jwt.guard.ts
// ✅ Vérifier que le payload est bien attaché à req.admin
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-secret-key-change-in-prod';

@Injectable()
export class AdminJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req    = context.switchToHttp().getRequest();
    const auth   = req.headers['authorization'] ?? '';
    const token  = auth.startsWith('Bearer ') ? auth.slice(7) : null;

    if (!token) throw new UnauthorizedException('Token manquant.');

    try {
      const payload = jwt.verify(token, ADMIN_JWT_SECRET) as {
        adminId:  string;
        username: string;
      };

      // ✅ Attacher sous req.admin — même structure que buildCtx attend
      req.admin = {
        adminId:  payload.adminId,
        username: payload.username,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré.');
    }
  }
}