import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Role } from '@rgi/types';

/** What the JWT strategy puts on the request. */
export interface RequestUser {
  userId: string;
  email: string;
  role: Role;
}

export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
