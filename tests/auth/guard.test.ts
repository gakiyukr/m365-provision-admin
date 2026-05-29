import { describe, expect, it } from "vitest";

describe("protected route guard", () => {
  it("only protects the admin area", async () => {
    const { isProtectedPath, protectedRoutePrefixes } = await import("@/lib/auth/guard");

    expect(protectedRoutePrefixes).toEqual(["/admin"]);
    expect(isProtectedPath("/admin")).toBe(true);
    expect(isProtectedPath("/admin/subscriptions")).toBe(true);
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/create-user")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
  });
});
