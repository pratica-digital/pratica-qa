import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../types/authenticated-user';

type RequestWithUser = {
  method?: string;
  url?: string;
  user?: AuthenticatedUser;
};

@Injectable()
export class FirstAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user?.firstAccess) {
      return true;
    }

    const path = request.url?.split('?')[0] ?? '';
    const method = request.method ?? 'GET';
    const isAllowedFirstAccessRequest =
      path.endsWith('/auth/change-password') || (method === 'GET' && path.endsWith('/users/me'));

    if (isAllowedFirstAccessRequest) {
      return true;
    }

    throw new ForbiddenException('Password change is required before accessing the workspace');
  }
}
