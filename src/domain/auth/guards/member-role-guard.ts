import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { MemberRole } from '../../member/constant/member-role.enum';
import { MEMBER_ROLES_KEY } from '../decorators/member-roles.decorator';
import { BusinessException } from '../../../common/filters/exception/business-exception';
import { ErrorType } from '../../../common/filters/exception/error-code.enum';
import { Reflector } from '@nestjs/core';

@Injectable()
export class MemberRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<MemberRole[]>(
      MEMBER_ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = ctx.switchToHttp().getRequest();

    if (!user?.role || !requiredRoles.includes(user.role)) {
      throw new BusinessException(ErrorType.FORBIDDEN_RESOURCE);
    }
    return true;
  }
}
