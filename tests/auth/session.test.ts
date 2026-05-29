import { beforeEach, describe, expect, it, vi } from "vitest";

const cookiesMock = vi.fn();
const findAdminByUsername = vi.fn();
const createServerSupabaseClient = vi.fn(() => ({ tag: "supabase-client" }));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/lib/supabase/admins", () => ({
  findAdminByUsername,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient,
}));

describe("session token", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.SESSION_SECRET = "12345678901234567890123456789012";
  });

  it("round-trips the admin id and username", async () => {
    const { createSessionToken, verifySessionToken } = await import("@/lib/auth/session");

    const token = await createSessionToken({ adminId: "admin-1", username: "owner" });
    const payload = await verifySessionToken(token);

    expect(payload.adminId).toBe("admin-1");
    expect(payload.username).toBe("owner");
  });

  it("writes the session cookie with secure defaults", async () => {
    const set = vi.fn();
    cookiesMock.mockResolvedValue({ set });

    const { SESSION_COOKIE_NAME, setSessionCookie } = await import("@/lib/auth/session");

    await setSessionCookie("signed-token");

    expect(cookiesMock).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      "signed-token",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
      }),
    );
  });

  it("clears the session cookie", async () => {
    const set = vi.fn();
    cookiesMock.mockResolvedValue({ set });

    const { SESSION_COOKIE_NAME, clearSessionCookie } = await import("@/lib/auth/session");

    await clearSessionCookie();

    expect(set).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      "",
      expect.objectContaining({
        httpOnly: true,
        maxAge: 0,
        path: "/",
      }),
    );
  });

  it("revalidates a signed session against the current admin record", async () => {
    findAdminByUsername.mockResolvedValue({
      id: "admin-1",
      username: "owner",
      password_hash: "hash",
      is_active: true,
    });

    const { createSessionToken, readSessionFromRequest } = await import("@/lib/auth/session");
    const token = await createSessionToken({ adminId: "admin-1", username: "owner" });
    const request = new Request("http://localhost/admin", {
      headers: {
        cookie: `office_admin_session=${token}`,
      },
    });

    const payload = await readSessionFromRequest(request);

    expect(payload).toEqual({ adminId: "admin-1", username: "owner" });
    expect(createServerSupabaseClient).toHaveBeenCalledTimes(1);
    expect(findAdminByUsername).toHaveBeenCalledWith({ tag: "supabase-client" }, "owner");
  });

  it("rejects a signed session when the admin is no longer active", async () => {
    findAdminByUsername.mockResolvedValue(null);

    const { createSessionToken, readSessionFromRequest } = await import("@/lib/auth/session");
    const token = await createSessionToken({ adminId: "admin-1", username: "owner" });
    const request = new Request("http://localhost/admin", {
      headers: {
        cookie: `office_admin_session=${token}`,
      },
    });

    await expect(readSessionFromRequest(request)).resolves.toBeNull();
  });

  it("surfaces admin revalidation dependency failures", async () => {
    findAdminByUsername.mockRejectedValue(new Error("supabase unavailable"));

    const { createSessionToken, readSessionFromRequest } = await import("@/lib/auth/session");
    const token = await createSessionToken({ adminId: "admin-1", username: "owner" });
    const request = new Request("http://localhost/admin", {
      headers: {
        cookie: `office_admin_session=${token}`,
      },
    });

    await expect(readSessionFromRequest(request)).rejects.toThrow("supabase unavailable");
  });
});
