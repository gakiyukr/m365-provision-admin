import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const useRouter = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter,
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a username field, password field, and sign-in button", async () => {
    useRouter.mockReturnValue({
      replace: vi.fn(),
      refresh: vi.fn(),
    });

    const { LoginForm } = await import("@/components/auth/login-form");
    const element = LoginForm({});
    const children = Array.isArray(element.props.children) ? element.props.children : [element.props.children];
    const form = children.find((child: { type?: string }) => child?.type === "form");
    const formChildren = Array.isArray(form.props.children) ? form.props.children : [form.props.children];
    const button = formChildren.find((child: { type?: string }) => child?.type === "button");
    const textLabels = formChildren
      .filter(Boolean)
      .map((child: { props?: { children?: unknown } }) => child.props?.children)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value) => typeof value === "string");

    expect(element.type).toBe("section");
    expect(form.type).toBe("form");
    expect(form.props.style).toEqual({ display: "grid", gap: "0.85rem" });
    expect(textLabels).toContain("管理員帳號");
    expect(textLabels).toContain("密碼");
    expect(textLabels).toContain("登入後台");
    expect(button.props.style).toEqual(
      expect.objectContaining({
        background: "#173563",
        borderRadius: "0.5rem",
        color: "#ffffff",
      }),
    );
  });

  it("renders the login page with the LoginForm component", async () => {
    useRouter.mockReturnValue({
      replace: vi.fn(),
      refresh: vi.fn(),
    });

    const { default: LoginPage } = await import("@/app/(auth)/login/page");
    const { LoginForm } = await import("@/components/auth/login-form");
    const page = LoginPage();
    const pageChildren = Array.isArray(page.props.children) ? page.props.children : [page.props.children];
    const section = pageChildren.find((child: { type?: string }) => child?.type === "section");
    const sectionChildren = Array.isArray(section.props.children) ? section.props.children : [section.props.children];

    expect(sectionChildren.some((child: { type?: unknown }) => child?.type === LoginForm)).toBe(true);
    expect(JSON.stringify(page)).toContain("管理後台登入");
  });

  it("sends signed-in admins to the admin dashboard", async () => {
    const replace = vi.fn();
    const refresh = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const errorElement = { textContent: "舊錯誤" };

    useRouter.mockReturnValue({ replace, refresh });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "FormData",
      class {
        get(name: string) {
          return name === "username" ? "owner" : "secret-pass";
        }
      },
    );

    const { LoginForm } = await import("@/components/auth/login-form");
    const element = LoginForm({});
    const children = Array.isArray(element.props.children) ? element.props.children : [element.props.children];
    const form = children.find((child: { type?: string }) => child?.type === "form");

    await expect(
      form.props.onSubmit({
        preventDefault: vi.fn(),
        currentTarget: {
          querySelector: vi.fn(() => errorElement),
        },
      }),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(replace).toHaveBeenCalledWith("/admin");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("shows a graceful error when the network request fails", async () => {
    const replace = vi.fn();
    const refresh = vi.fn();
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    const errorElement = { textContent: "舊錯誤" };

    useRouter.mockReturnValue({ replace, refresh });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "FormData",
      class {
        get(name: string) {
          return name === "username" ? "owner" : "secret-pass";
        }
      },
    );

    const { LoginForm } = await import("@/components/auth/login-form");
    const element = LoginForm({});
    const children = Array.isArray(element.props.children) ? element.props.children : [element.props.children];
    const form = children.find((child: { type?: string }) => child?.type === "form");

    await expect(
      form.props.onSubmit({
        preventDefault: vi.fn(),
        currentTarget: {
          querySelector: vi.fn(() => errorElement),
        },
      }),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "owner", password: "secret-pass" }),
      }),
    );
    expect(errorElement.textContent).toBe("無法登入");
    expect(replace).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
