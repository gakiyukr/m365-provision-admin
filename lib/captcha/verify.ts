type CaptchaProvider = "turnstile" | "hcaptcha" | "recaptcha_v2";

type VerifyArgs = {
  enabled: boolean;
  provider: CaptchaProvider | null;
  secret: string | null;
  token: string;
  remoteIp: string;
  fetchImpl?: typeof fetch;
};

const providerEndpoints: Record<CaptchaProvider, string> = {
  turnstile: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  hcaptcha: "https://api.hcaptcha.com/siteverify",
  recaptcha_v2: "https://www.google.com/recaptcha/api/siteverify",
};

export async function verifyCaptchaToken(args: VerifyArgs) {
  if (!args.enabled) {
    return { success: true };
  }

  if (!args.provider || !args.secret) {
    throw new Error("CAPTCHA is enabled but not fully configured");
  }

  const response = await (args.fetchImpl ?? fetch)(providerEndpoints[args.provider], {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: args.secret,
      response: args.token,
      remoteip: args.remoteIp,
    }),
  });

  const data = (await response.json()) as { success?: unknown };

  return {
    success: Boolean(data.success),
    raw: data,
  };
}
