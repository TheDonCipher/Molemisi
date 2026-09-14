import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

/**
 * DevGuard — verifies the requester is a developer account (profiles.role = 'dev').
 *
 * Must run AFTER AuthGuard has verified the token and attached request.user.
 * Dev is a DISTINCT tier from admin (separate /dev tooling area), so this guard
 * must NOT grant admin access and AdminGuard must NOT grant devs /admin.
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
      .select('role')
      .eq('id', user.id)
      .single();

    if (error || profile?.role !== 'dev') {
      throw new ForbiddenException('Developer access required');
    }

    return true;
  }
}
