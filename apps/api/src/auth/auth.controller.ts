import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterSchema, LoginSchema } from '@molemisi/validation';
import { AuthGuard } from '../common/guards/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: unknown) {
    const input = RegisterSchema.parse(body);
    const result = await this.authService.register(input);
    return { success: true, data: result };
  }

  @Post('login')
  async login(@Body() body: unknown) {
    const input = LoginSchema.parse(body);
    const result = await this.authService.login(input);
    return { success: true, data: result };
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout() {
    await this.authService.logout();
    return { success: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Request() req: { user: { id: string; email: string } }) {
    return {
      success: true,
      data: {
        id: req.user.id,
        email: req.user.email,
      },
    };
  }
}
