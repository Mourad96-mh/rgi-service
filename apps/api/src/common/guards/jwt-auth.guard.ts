import { Injectable, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global guard: every route needs a valid access token unless marked `@Public()`.
 * Registered app-wide so a forgotten guard cannot silently expose an endpoint.
 *
 * A `@Public()` route used to return `true` before Passport ran at all, which meant such a
 * route could never tell a signed-in member of staff from an anonymous visitor — even when
 * the request carried a perfectly good Bearer token. `GET /products` is public *and*
 * accepts a `status` filter that the DTO calls staff-only, so with no user on the request
 * there was nothing to check it against: anyone could list drafts and archived products.
 *
 * Passport now runs on every route. What changes is only how a failure is treated: on a
 * public route an absent, expired or invalid token is not an error, it simply leaves
 * `req.user` undefined and the request continues as anonymous. Protected routes behave
 * exactly as before.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  private isPublic(context: ExecutionContext): boolean {
    return Boolean(
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]),
    );
  }

  handleRequest<TUser>(
    err: unknown,
    user: TUser,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    // Anonymous is a valid outcome here, never a rejection.
    if (this.isPublic(context)) return (user || undefined) as TUser;

    if (err) throw err;
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
