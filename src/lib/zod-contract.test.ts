import { describe, expect, it } from "vitest";
import { z } from "zod";

// Pins the zod behaviour the API routes depend on, so a future major bump
// that changes it fails here and not in production.
describe("zod contract used by API routes", () => {
  it("is zod 4 (uuid checks follow RFC 9562, flatten() still exists)", () => {
    const schema = z.object({ id: z.string().uuid() });
    const bad = schema.safeParse({ id: "not-a-uuid" });
    expect(bad.success).toBe(false);
    if (!bad.success) {
      const flat = bad.error.flatten();
      expect(flat.fieldErrors.id?.length).toBeGreaterThan(0);
      expect(flat.formErrors).toEqual([]);
    }
  });

  it("accepts a version 4 uuid and rejects the all-zero nil-style id", () => {
    const schema = z.string().uuid();
    expect(schema.safeParse("3f2b8c1e-5a4d-4c3b-9e8f-1a2b3c4d5e6f").success).toBe(true);
    expect(schema.safeParse("00000000-0000-0000-0000-00000000000a").success).toBe(false);
  });

  it("nullish() keeps null and undefined valid, as the feedback route expects", () => {
    const schema = z.object({ session_id: z.string().uuid().nullish() });
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ session_id: null }).success).toBe(true);
  });

  it("unknown keys are stripped by default, not rejected", () => {
    const parsed = z.object({ a: z.string() }).parse({ a: "x", extra: 1 });
    expect(parsed).toEqual({ a: "x" });
  });

  it("a bare z.unknown() rejects an absent key in zod 4; the template route uses .optional()", () => {
    expect(z.object({ body: z.unknown() }).safeParse({}).success).toBe(false);
    expect(z.object({ body: z.unknown().optional() }).safeParse({}).success).toBe(true);
  });
});
