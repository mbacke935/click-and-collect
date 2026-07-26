import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (request.user?.role !== UserRole.ADMINISTRATEUR) {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return true;
  }
}
