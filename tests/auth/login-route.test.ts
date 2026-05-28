import { beforeEach, describe, expect, it, vi } from "vitest";

const findAdminByUsername = vi.fn();
const touchAdminLastLogin = vi.fn();
const verifyPassword = vi.fn();
const createSessionToken = vi.fn();
const setSessionCookie = vi.fn();
const clearSessionCookie = vi.fn();
const readSessionFromRequest = vi.fn();
const createServerSupabaseClient = vi.fn(() => ({ tag: "supabase-client" }));

vi.mock("@/lib/supabase/admins", () => ({
  findAdminByUsername,
  touchAdminLastLogin,
}));

vi.mock("@/lib/auth/password", () => ({
  verifyPassword,
}));

vi.mock("@/lib/auth/session", () => ({
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  readSessionFromRequest,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient,
}));

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("rejects invalid credentials", async () => {
    findAdminByUsername.mockResolvedValue({
      id: "1",
      username: "owner",
      password_hash: "hash",
      is_active: true,
    });
    verifyPassword.mockResolvedValue(false);

    const { POST } = await import("@/app/api/auth/login/route");
    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "owner", password: "bad-pass" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Invalid credentials" });
    expect(setSessionCookie).not.toHaveBeenCalled();
    expect(touchAdminLastLogin).not.toHaveBeenCalled();
  });

  it("performs a fallback password compare when the admin does not exist", async () => {
    findAdminByUsername.mockResolvedValue(null);
    verifyPassword.mockResolvedValue(false);

    const { POST } = await import("@/app/api/auth/login/route");
    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "missing-user", password: "bad-pass" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(verifyPassword).toHaveBeenCalledTimes(1);
    expect(verifyPassword).toHaveBeenCalledWith("bad-pass", expect.any(String));
    expect(setSessionCookie).not.toHaveBeenCalled();
  });

  it("creates a session for valid credentials", async () => {
    findAdminByUsername.mockResolvedValue({
      id: "admin-1",
      username: "owner",
      password_hash: "hash",
      is_active: true,
    });
    verifyPassword.mockResolvedValue(true);
    createSessionToken.mockResolvedValue("signed-token");

    const { POST } = await import("@/app/api/auth/login/route");
    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "owner", password: "good-pass" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(createServerSupabaseClient).toHaveBeenCalledTimes(1);
    expect(findAdminByUsername).toHaveBeenCalledWith({ tag: "supabase-client" }, "owner");
    expect(verifyPassword).toHaveBeenCalledWith("good-pass", "hash");
    expect(createSessionToken).toHaveBeenCalledWith({ adminId: "admin-1", username: "owner" });
    expect(setSessionCookie).toHaveBeenCalledWith("signed-token");
    expect(touchAdminLastLogin).toHaveBeenCalledWith({ tag: "supabase-client" }, "admin-1");
  });

  it("still returns success when touching last login fails after the session is set", async () => {
    findAdminByUsername.mockResolvedValue({
      id: "admin-1",
      username: "owner",
      password_hash: "hash",
      is_active: true,
    });
    verifyPassword.mockResolvedValue(true);
    createSessionToken.mockResolvedValue("signed-token");
    touchAdminLastLogin.mockRejectedValue(new Error("write failed"));

    const { POST } = await import("@/app/api/auth/login/route");
    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "owner", password: "good-pass" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(setSessionCookie).toHaveBeenCalledWith("signed-token");
    expect(touchAdminLastLogin).toHaveBeenCalledWith({ tag: "supabase-client" }, "admin-1");
  });
});

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("clears the current session cookie", async () => {
    const { POST } = await import("@/app/api/auth/logout/route");
    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(clearSessionCookie).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/me", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns the signed-in admin payload", async () => {
    readSessionFromRequest.mockResolvedValue({
      adminId: "admin-1",
      username: "owner",
    });

    const { GET } = await import("@/app/api/me/route");
    const response = await GET(new Request("http://localhost/api/me"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      admin: {
        adminId: "admin-1",
        username: "owner",
      },
    });
  });

  it("returns 401 when no session is present", async () => {
    readSessionFromRequest.mockResolvedValue(null);

    const { GET } = await import("@/app/api/me/route");
    const response = await GET(new Request("http://localhost/api/me"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });
});
