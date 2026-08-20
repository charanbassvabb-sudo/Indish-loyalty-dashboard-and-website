import type { Request } from "express";

/**
 * @types/express types every req.params value as `string | string[]`, even
 * for a plain named segment like `/:reference` that can only ever produce a
 * single string at runtime. Left as-is, that union quietly breaks Prisma's
 * `include` type inference downstream — a `where: { reference: string | string[] }`
 * doesn't match any overload of `findUnique`, so TypeScript falls back to
 * inferring the result as if no `include` were passed at all (the relation
 * then "doesn't exist" on the result, which is what actually surfaced this).
 * Narrow it back to a plain string at the boundary instead.
 */
export function stringParam(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? (value[0] ?? "") : value;
}
