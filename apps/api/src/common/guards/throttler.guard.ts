import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * CORS preflight is not an application request and must not consume a
 * request from the endpoint's throttle budget.
 */
@Injectable()
export class XFarmThrottlerGuard extends ThrottlerGuard {
  protected override async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (context.switchToHttp().getRequest().method === 'OPTIONS') {
      return true;
    }

    return super.shouldSkip(context);
  }
}
