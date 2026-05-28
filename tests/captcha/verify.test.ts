import { beforeEach, describe, expect, it, vi } from "vitest";

const envState = {
  CAPTCHA_ENABLED: "false",
  CAPTCHA_PROVIDER: undefined as "turnstile" | "hcaptcha" | "recaptcha_v2" | undefined,
  DEFAULT_USAGE_LOCATION: "US",
};
const readSessionFromRequest = vi.fn();

vi.mock("@/lib/env", () => ({
  env: new Proxy(
    {},
    {
      get(_target, property) {
        return envState[property as keyof typeof envState];
      },
    },
  ),
}));

vi.mock("@/lib/auth/session", () => ({
  readSessionFromRequest,
}));

describe("verifyCaptchaToken", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns success when CAPTCHA is disabled", async () => {
    const fetchImpl = vi.fn();
    const { verifyCaptchaToken } = await import("@/lib/captcha/verify");

    const result = await verifyCaptchaToken({
      enabled: false,
      provider: null,
      secret: null,
      token: "",
      remoteIp: "",
      fetchImpl,
    });

    expect(result).toEqual({ success: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("throws when CAPTCHA is enabled but provider config is incomplete", async () => {
    const { verifyCaptchaToken } = await import("@/lib/captcha/verify");

    await expect(
      verifyCaptchaToken({
        enabled: true,
        provider: null,
        secret: null,
        token: "captcha-token",
        remoteIp: "127.0.0.1",
      }),
    ).rejects.toThrow("CAPTCHA is enabled but not fully configured");
  });

  it.each([
    ["turnstile", "https://challenges.cloudflare.com/turnstile/v0/siteverify"],
    ["hcaptcha", "https://api.hcaptcha.com/siteverify"],
    ["recaptcha_v2", "https://www.google.com/recaptcha/api/siteverify"],
  ] as const)("posts verification to the %s endpoint", async (provider, endpoint) => {
    const fetchImpl = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ success: true, provider }),
    });
    const { verifyCaptchaToken } = await import("@/lib/captcha/verify");

    const result = await verifyCaptchaToken({
      enabled: true,
      provider,
      secret: "captcha-secret",
      token: "captcha-token",
      remoteIp: "127.0.0.1",
      fetchImpl,
    });

    expect(result).toEqual({
      success: true,
      raw: { success: true, provider },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: expect.any(URLSearchParams),
      }),
    );

    const [, requestInit] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect((requestInit.body as URLSearchParams).toString()).toBe(
      "secret=captcha-secret&response=captcha-token&remoteip=127.0.0.1",
    );
  });
});

describe("GET /api/admin/settings", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    envState.CAPTCHA_ENABLED = "false";
    envState.CAPTCHA_PROVIDER = undefined;
    envState.DEFAULT_USAGE_LOCATION = "US";
  });

  it("returns 401 when no admin session is present", async () => {
    readSessionFromRequest.mockResolvedValue(null);

    const { GET } = await import("@/app/api/admin/settings/route");
    const request = new Request("http://localhost/api/admin/settings");

    const response = await GET(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(readSessionFromRequest).toHaveBeenCalledWith(request);
  });

  it("returns disabled CAPTCHA summary when CAPTCHA is off for an admin session", async () => {
    readSessionFromRequest.mockResolvedValue({
      adminId: "admin-1",
      username: "owner",
    });

    const { GET } = await import("@/app/api/admin/settings/route");
    const request = new Request("http://localhost/api/admin/settings");

    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      captchaEnabled: false,
      captchaProvider: null,
      defaultUsageLocation: "US",
    });
    expect(readSessionFromRequest).toHaveBeenCalledWith(request);
  });

  it("returns the configured CAPTCHA provider when CAPTCHA is enabled for an admin session", async () => {
    envState.CAPTCHA_ENABLED = "true";
    envState.CAPTCHA_PROVIDER = "turnstile";
    envState.DEFAULT_USAGE_LOCATION = "JP";
    readSessionFromRequest.mockResolvedValue({
      adminId: "admin-1",
      username: "owner",
    });

    const { GET } = await import("@/app/api/admin/settings/route");
    const request = new Request("http://localhost/api/admin/settings");

    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      captchaEnabled: true,
      captchaProvider: "turnstile",
      defaultUsageLocation: "JP",
    });
    expect(readSessionFromRequest).toHaveBeenCalledWith(request);
  });
});
