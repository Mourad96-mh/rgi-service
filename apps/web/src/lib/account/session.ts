'use client';

import { useSyncExternalStore } from 'react';
import type { Address, LoginDto, Order, RegisterDto, User } from '@rgi/types';
import { AuthApiError, createSession } from '@/lib/session-core';
import { t } from '@/locales/fr';

/**
 * The customer's session.
 *
 * Keys are namespaced apart from the staff ones (`rgi_admin_*`) on purpose: both sessions
 * can exist in one browser, and signing in as a customer must never disturb a dashboard
 * session — or inherit its privileges, which the API would refuse anyway.
 */
const session = createSession({
  access: 'rgi_at',
  refresh: 'rgi_rt',
  user: 'rgi_user',
});

export { AuthApiError, SessionExpiredError } from '@/lib/session-core';

export const accountFetch = session.authFetch;
export const hasSession = session.hasSession;

/**
 * Staff and customers are two separate tracks, not two ranks of the same one
 * (`ROLE_RANK` says as much: `staff` inherits nothing from `customer`). The dashboard
 * already refuses a customer at its own door — `lib/admin/session.ts` throws
 * « Ce compte n'a pas accès à l'administration » before storing anything. This is the
 * mirror of that check, and it was the missing half: without it a member of staff signing
 * in on the storefront put an admin-privileged token into the customer session keys, where
 * every storefront script can read it, and any order they placed was attached to a staff
 * account.
 *
 * A staff member who wants to shop here uses a separate customer account, or checks out as
 * a guest — which needs no account at all.
 *
 * Note this cannot be enforced on the API instead: both doors post to the same
 * `/auth/login`, and the credentials are genuine either way, so refusing there would only
 * move the same client-side decision behind a scope flag. The API stays the gate on what a
 * token may *do* — every admin route is behind `@Roles(…)` regardless of this.
 */
function assertCustomer(user: User): User {
  if (user.role !== 'customer') {
    throw new AuthApiError(403, t.account.staffAccount);
  }
  return user;
}

/** The cached user, but only if it is a customer's. One place decides; see below. */
function storedCustomer(): User | null {
  const raw = session.rawUser();
  return raw ? parseCustomer(raw) : null;
}

function parseCustomer(raw: string): User | null {
  try {
    const user = JSON.parse(raw) as User;
    return user.role === 'customer' ? user : null;
  } catch {
    return null;
  }
}

/**
 * The customer's access token, for the one public route that takes an optional one
 * (`POST /orders`). Null unless the stored session really is a customer's, so a staff
 * session left in these keys by a build older than this check can never sign an order.
 */
export function customerAccessToken(): string | null {
  return storedCustomer() ? session.accessToken() : null;
}

/**
 * The signed-in customer, as React state.
 *
 * `useSyncExternalStore` rather than an effect: the header, the account page and checkout
 * all read the same session, and a sign-in on one of them has to reach the others without
 * a reload. The server snapshot is `null` because a static export prerenders these
 * components with no browser storage to read — every page paints signed-out first and
 * corrects itself on hydration, which is unavoidable without a server.
 */
export function useCustomer(): User | null {
  const raw = useSyncExternalStore(
    session.subscribe,
    session.rawUser,
    () => null,
  );
  // A non-customer reads as signed out everywhere the storefront asks, so no screen has to
  // remember to check the role itself: `/compte` falls back to its sign-in panes and
  // checkout treats the visitor as a guest.
  return raw ? parseCustomer(raw) : null;
}

/**
 * The cached user is a convenience for painting a name, never a credential — every screen
 * that shows real data re-asks the API, which is the only thing that can actually say who
 * the caller is.
 */
export async function refreshCustomer(): Promise<User> {
  // Checked on every load, not only at sign-in: a customer promoted to staff since must
  // stop having a storefront session, and so must one stored by a build older than
  // `assertCustomer`. The caller treats any throw here as signed-out.
  const user = assertCustomer(await accountFetch<User>('/auth/me'));
  session.setUser(user);
  return user;
}

/**
 * Nothing is stored before the role is checked, so a staff sign-in here leaves no session
 * behind — only the 403 the form shows.
 *
 * It does still cost them their dashboard session: the API keeps one refresh hash per
 * user, so issuing these tokens replaced the one the dashboard held. That is inherent to
 * single-session auth — a second sign-in anywhere ends the first — and the fix is for
 * staff to sign in at `/admin/login`, which is exactly what the message tells them.
 */
export async function login(dto: LoginDto): Promise<User> {
  const auth = await session.authenticate('/auth/login', dto);
  assertCustomer(auth.user);
  session.setSession(auth);
  return auth.user;
}

export async function register(dto: RegisterDto): Promise<User> {
  const auth = await session.authenticate('/auth/register', dto);
  // `AuthService.register` hardcodes `role: 'customer'`, so this can only fire if that
  // ever changes — which is precisely when it should.
  assertCustomer(auth.user);
  session.setSession(auth);
  return auth.user;
}

export const logout = session.logout;

/** Own order history, newest first (the API caps it at 50). */
export function myOrders(): Promise<Order[]> {
  return accountFetch<Order[]>('/orders');
}

/**
 * Both writes return the saved user, and both push it back into the cache: the API is the
 * one that normalises what was sent — a trimmed name, exactly one default address — so
 * echoing the response is what keeps the screen honest about what was actually stored.
 */
export async function saveProfile(dto: { name?: string; phone?: string }): Promise<User> {
  const user = await accountFetch<User>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
  session.setUser(user);
  return user;
}

/** The address book is replaced wholesale — see the API's `UpdateAddressesDto`. */
export async function saveAddresses(addresses: Address[]): Promise<User> {
  const user = await accountFetch<User>('/users/me/addresses', {
    method: 'PUT',
    body: JSON.stringify({ addresses }),
  });
  session.setUser(user);
  return user;
}
