import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

/**
 * AdminGuard — verifies the requester is an authenticated administrator.
 *
 * Must run AFTER AuthGuard has verified the token and attached request.user.
 * Checks the profiles.is_admin flag (set by migration 20260902000015).
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
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (error || !profile?.is_admin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
