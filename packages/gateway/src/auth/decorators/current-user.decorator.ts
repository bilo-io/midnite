import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  userId: string;
  email: string;
}

/** Reads the `user` object set by the JWT auth guard. Returns null when the
 *  guard did not authenticate (static-token or anonymous path). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload | null => {
    const req = ctx.switchToHttp().getRequest<{ user?: CurrentUserPayload }>();
    return req.user ?? null;
  },
);
