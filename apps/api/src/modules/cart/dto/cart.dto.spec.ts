/**
 * The checkout DTOs, validated exactly as the global pipe validates them in `main.ts`
 * (`whitelist` + `forbidNonWhitelisted`), so a rule that holds here holds over HTTP.
 *
 * These exist because of a real defect: `@ValidateNested()` on its own does not reject an
 * `undefined` value, so a request that simply omitted `shipping` or `payment` passed
 * validation and blew up in `OrdersService.create` as a 500. Every "…is required" case
 * below returned « Une erreur interne est survenue » before `@IsDefined()` was added.
 */
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync, type ValidationError } from 'class-validator';
import { CreateOrderDto, QuoteDto, ValidateCartDto } from './cart.dto';

/** Mirrors the ValidationPipe configuration in main.ts. */
function check<T extends object>(cls: new () => T, payload: unknown): ValidationError[] {
  const instance = plainToInstance(cls, payload, { enableImplicitConversion: false });
  return validateSync(instance as object, {
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: { target: false, value: false },
  });
}

const failedProps = (errors: ValidationError[]): string[] => errors.map((e) => e.property);

const items = [{ kind: 'product', productId: '6a88379cd18b1a6815ec190d', quantity: 1 }];
const contact = { name: 'Client Test', email: 'client@example.com', phone: '0600000000' };
const shipping = { method: 'delivery', city: 'Casablanca' };
const payment = { method: 'cod' };

describe('QuoteDto', () => {
  it('accepts a complete quote request', () => {
    expect(check(QuoteDto, { items, shipping })).toHaveLength(0);
  });

  it('rejects a missing shipping block instead of throwing later', () => {
    expect(failedProps(check(QuoteDto, { items }))).toContain('shipping');
  });

  it('rejects a null shipping block', () => {
    expect(failedProps(check(QuoteDto, { items, shipping: null }))).toContain('shipping');
  });

  it('rejects an unknown shipping method', () => {
    const errors = check(QuoteDto, { items, shipping: { method: 'teleportation' } });
    expect(failedProps(errors)).toContain('shipping');
  });
});

describe('CreateOrderDto — every required block', () => {
  const complete = { items, contact, shipping, payment };

  it('accepts a complete order', () => {
    expect(check(CreateOrderDto, complete)).toHaveLength(0);
  });

  it.each(['contact', 'shipping', 'payment'] as const)(
    'rejects an order with no %s block',
    (block) => {
      const payload: Record<string, unknown> = { ...complete };
      delete payload[block];
      expect(failedProps(check(CreateOrderDto, payload))).toContain(block);
    },
  );

  it.each(['contact', 'shipping', 'payment'] as const)(
    'rejects an order whose %s block is null',
    (block) => {
      expect(failedProps(check(CreateOrderDto, { ...complete, [block]: null }))).toContain(block);
    },
  );

  it('rejects an unknown payment method', () => {
    const errors = check(CreateOrderDto, { ...complete, payment: { method: 'bitcoin' } });
    expect(failedProps(errors)).toContain('payment');
  });

  it('rejects an invalid e-mail', () => {
    const errors = check(CreateOrderDto, { ...complete, contact: { ...contact, email: 'nope' } });
    expect(failedProps(errors)).toContain('contact');
  });
});

describe('the cart itself', () => {
  it('rejects an empty basket', () => {
    expect(failedProps(check(ValidateCartDto, { items: [] }))).toContain('items');
  });

  it('rejects a missing items array', () => {
    expect(failedProps(check(ValidateCartDto, {}))).toContain('items');
  });

  it.each([
    ['zero', 0],
    ['negative', -3],
    ['above the 20 cap', 21],
    ['fractional', 1.5],
  ])('rejects a %s quantity', (_label, quantity) => {
    const errors = check(ValidateCartDto, { items: [{ ...items[0], quantity }] });
    expect(failedProps(errors)).toContain('items');
  });

  it('refuses a client-supplied price — the server re-prices, always', () => {
    const errors = check(ValidateCartDto, { items: [{ ...items[0], price: 1 }] });
    expect(failedProps(errors)).toContain('items');
  });

  it('rejects more than 50 lines', () => {
    const errors = check(ValidateCartDto, { items: Array.from({ length: 51 }, () => items[0]) });
    expect(failedProps(errors)).toContain('items');
  });
});
