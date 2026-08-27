import type { Address } from '@rgi/types';
import { UsersService } from './users.service';

const address = (line1: string, isDefault: boolean): Address => ({
  line1,
  city: 'Casablanca',
  phone: '+212612345678',
  isDefault,
});

describe('UsersService.withOneDefault', () => {
  it('leaves an empty book empty', () => {
    expect(UsersService.withOneDefault([])).toEqual([]);
  });

  it('keeps the one the customer marked', () => {
    const result = UsersService.withOneDefault([
      address('a', false),
      address('b', true),
      address('c', false),
    ]);
    expect(result.map((a) => a.isDefault)).toEqual([false, true, false]);
  });

  it('keeps the first when several claim to be the default', () => {
    const result = UsersService.withOneDefault([
      address('a', true),
      address('b', true),
    ]);
    expect(result.map((a) => a.isDefault)).toEqual([true, false]);
  });

  it('promotes the first when none is marked, so checkout always has one to preselect', () => {
    const result = UsersService.withOneDefault([
      address('a', false),
      address('b', false),
    ]);
    expect(result.map((a) => a.isDefault)).toEqual([true, false]);
  });

  it('does not mutate the caller’s array', () => {
    const input = [address('a', false)];
    UsersService.withOneDefault(input);
    expect(input[0]!.isDefault).toBe(false);
  });
});
