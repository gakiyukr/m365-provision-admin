import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { envSchema } from "@/lib/env";

describe("envSchema", () => {
  it("allows CAPTCHA secrets to be omitted when CAPTCHA is disabled", () => {
    expect(() =>
      envSchema.parse({
        AZURE_TENANT_ID: "tenant",
        AZURE_CLIENT_ID: "client",
        AZURE_CLIENT_SECRET: "secret",
        SESSION_SECRET: "12345678901234567890123456789012",
        DEFAULT_USAGE_LOCATION: "US",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
        SUPABASE_SERVICE_ROLE_KEY: "service",
        CAPTCHA_ENABLED: "false",
      }),
    ).not.toThrow();
  });

  it("requires provider, site key, and secret when CAPTCHA is enabled", () => {
    try {
      envSchema.parse({
        AZURE_TENANT_ID: "tenant",
        AZURE_CLIENT_ID: "client",
        AZURE_CLIENT_SECRET: "secret",
        SESSION_SECRET: "12345678901234567890123456789012",
        DEFAULT_USAGE_LOCATION: "US",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
        SUPABASE_SERVICE_ROLE_KEY: "service",
        CAPTCHA_ENABLED: "true",
      });
      throw new Error("Expected envSchema.parse to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
      const paths = (error as ZodError).issues.map((issue) => issue.path.join("."));

      expect(paths).toContain("CAPTCHA_PROVIDER");
      expect(paths).toContain("CAPTCHA_SITE_KEY");
      expect(paths).toContain("CAPTCHA_SECRET");
    }
  });
});
