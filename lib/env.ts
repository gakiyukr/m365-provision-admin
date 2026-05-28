import { z } from "zod";

const captchaProviderSchema = z.enum(["turnstile", "hcaptcha", "recaptcha_v2"]);

export const envSchema = z
  .object({
    AZURE_TENANT_ID: z.string().min(1),
    AZURE_CLIENT_ID: z.string().min(1),
    AZURE_CLIENT_SECRET: z.string().min(1),
    SESSION_SECRET: z.string().min(32),
    DEFAULT_USAGE_LOCATION: z.string().length(2),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    CAPTCHA_ENABLED: z.enum(["true", "false"]).default("false"),
    CAPTCHA_PROVIDER: captchaProviderSchema.optional(),
    CAPTCHA_SITE_KEY: z.string().optional(),
    CAPTCHA_SECRET: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.CAPTCHA_ENABLED === "true") {
      if (!value.CAPTCHA_PROVIDER) {
        ctx.addIssue({
          code: "custom",
          path: ["CAPTCHA_PROVIDER"],
          message: "Required when CAPTCHA is enabled",
        });
      }

      if (!value.CAPTCHA_SITE_KEY) {
        ctx.addIssue({
          code: "custom",
          path: ["CAPTCHA_SITE_KEY"],
          message: "Required when CAPTCHA is enabled",
        });
      }

      if (!value.CAPTCHA_SECRET) {
        ctx.addIssue({
          code: "custom",
          path: ["CAPTCHA_SECRET"],
          message: "Required when CAPTCHA is enabled",
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

function loadEnv() {
  cachedEnv ??= envSchema.parse(process.env);
  return cachedEnv;
}

export const env = new Proxy({} as Env, {
  get(_target, property) {
    return loadEnv()[property as keyof Env];
  },
});
