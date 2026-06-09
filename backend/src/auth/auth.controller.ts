import { Body, Controller, Post, Req } from '@nestjs/common';
import { getRequestMetadata } from '../common/http/request-metadata';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordRecoveryDto } from './dto/request-password-recovery.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthenticatedUser } from './types/authenticated-user';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto, @Req() request: Parameters<typeof getRequestMetadata>[0]) {
    return this.authService.login(dto, getRequestMetadata(request));
  }

  @Post('change-password')
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Req() request: Parameters<typeof getRequestMetadata>[0],
  ) {
    return this.authService.changePassword(user.id, dto, getRequestMetadata(request));
  }

  @Public()
  @Post('password-recovery')
  requestPasswordRecovery(
    @Body() dto: RequestPasswordRecoveryDto,
    @Req() request: Parameters<typeof getRequestMetadata>[0],
  ) {
    return this.authService.requestPasswordRecovery(dto, getRequestMetadata(request));
  }

  @Public()
  @Post('password-reset')
  resetPassword(@Body() dto: ResetPasswordDto, @Req() request: Parameters<typeof getRequestMetadata>[0]) {
    return this.authService.resetPassword(dto, getRequestMetadata(request));
  }
}
