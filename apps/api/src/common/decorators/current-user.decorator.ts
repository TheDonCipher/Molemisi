import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../guards/auth.guard';

/**
 * Parameter decorator to extract the current user from the request.
 *
 * Usage:
 *   @CurrentUser() user: AuthenticatedUser          → returns { id, email }
 *   @CurrentUser('id') userId: string                → returns user.id
 *   @CurrentUser('email') userEmail: string          → returns user.email
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;
    if (!data) return user;
    return user?.[data as keyof AuthenticatedUser];
  },
);
