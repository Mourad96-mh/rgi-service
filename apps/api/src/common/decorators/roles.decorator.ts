import { SetMetadata } from '@nestjs/common';
import type { Role } from '@rgi/types';

export const ROLES_KEY = 'roles';

/**
 * Minimum role required for a route. Ranks come from `@rgi/types` (`hasAtLeastRole`),
 * so `@Roles('staff')` also lets an admin through.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
