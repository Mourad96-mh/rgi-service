export type Role = 'customer' | 'staff' | 'admin';

export interface Address {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode?: string;
  phone: string;
  isDefault: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: Role;
  addresses: Address[];
  isActive: boolean;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

/** Role hierarchy — `staff` inherits nothing from `customer`, it is a separate track. */
export const ROLE_RANK: Record<Role, number> = { customer: 0, staff: 1, admin: 2 };

export function hasAtLeastRole(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}
