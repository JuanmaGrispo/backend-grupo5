import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class GlobalAuthGuard extends JwtAuthGuard {
  constructor(private reflector: Reflector) { super(); }
  canActivate(ctx: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()],
    );
    if (isPublic) return true;
    return super.canActivate(ctx);
  }
}
