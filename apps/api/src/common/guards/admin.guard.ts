import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

/**
 * AdminGuard — verifies the requester is an authenticated administrator.
 *
 * Must run AFTER AuthGuard has verified the token and attached request.user.
 * Grants access for role='admin' (canonical, migration 20260911000021) or the
 * legacy is_admin flag. Dev accounts (role='dev') are a DISTINCT tier and must
 * NOT be admitted here — they use the separate /dev area.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { id?: string } | undefined;

    if (!user?.id) {
      throw new ForbiddenException('Admin access required');
    }

    const { data: profile, error } = await this.supabaseService
      .getAdminClient()
      .from('profiles')
      .select('is_admin, role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.is_admin === true || profile?.role === 'admin';
    if (error || !isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
