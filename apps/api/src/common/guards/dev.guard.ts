import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

/**
 * DevGuard — verifies the requester is a developer account (profiles.role = 'dev').
 *
 * Must run AFTER AuthGuard has verified the token and attached request.user.
 * Dev is the TOP tier (dev > admin > player): devs are admitted to /dev and
 * /admin, and admins are admitted to /dev tooling as well.
 */
@Injectable()
export class DevGuard implements CanActivate {
  constructor(private supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { id?: string } | undefined;

    if (!user?.id) {
      throw new ForbiddenException('Developer access required');
    }

    const { data: profile, error } = await this.supabaseService
      .getAdminClient()
      .from('profiles')
      .select('is_admin, role')
      .eq('id', user.id)
      .single();

    const isDevOrAdmin =
      profile?.role === 'dev' ||
      profile?.role === 'admin' ||
      profile?.is_admin === true;

    if (error || !isDevOrAdmin) {
      throw new ForbiddenException('Developer access required');
    }

    return true;
  }
}
