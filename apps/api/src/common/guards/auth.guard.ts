import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    const user = await this.supabaseService.verifyToken(token);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Check if user is banned (skip for admin routes — admins must be able to manage bans)
    const requestPath = request.url || '';
    const isAdminRoute = requestPath.includes('/admin/');
    if (!isAdminRoute) {
      const { data: profile } = await this.supabaseService
        .getAdminClient()
        .from('profiles')
        .select('is_banned')
        .eq('id', user.id)
        .single();

      if (profile?.is_banned) {
        throw new ForbiddenException('Account banned by administrator');
      }
    }

    // Attach user to request for downstream use
    request.user = user;
    return true;
  }

  private extractToken(request: { headers: { authorization?: string } }): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) return null;

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) return null;

    return token;
  }
}
