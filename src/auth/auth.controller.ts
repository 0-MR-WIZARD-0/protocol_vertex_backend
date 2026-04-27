/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Body, Controller, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body, @Res({ passthrough: true }) res: Response) {
    const { refreshToken } = await this.authService.register(
      body.email,
      body.password,
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });

    return { ok: true };
  }

  @Post('login')
  async login(@Body() body, @Res({ passthrough: true }) res: Response) {
    const { refreshToken } = await this.authService.login(
      body.email,
      body.password,
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });

    return { ok: true };
  }
}
