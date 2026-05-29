import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function flattenChildren(children: unknown): unknown[] {
  if (Array.isArray(children)) {
    return children.flatMap((child) => flattenChildren(child));
  }

  return children === undefined || children === null ? [] : [children];
}

function findElement(
  node: unknown,
  predicate: (candidate: { type?: unknown; props?: { children?: unknown; [key: string]: unknown } }) => boolean,
): { type?: unknown; props?: { children?: unknown; [key: string]: unknown } } | undefined {
  if (!node || typeof node !== "object") {
    return undefined;
  }

  const candidate = node as { type?: unknown; props?: { children?: unknown; [key: string]: unknown } };
  if (predicate(candidate)) {
    return candidate;
  }

  for (const child of flattenChildren(candidate.props?.children)) {
    const match = findElement(child, predicate);
    if (match) {
      return match;
    }
  }

  return undefined;
}

describe("CreateUserForm", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders provisioning fields, template choices, feature checkboxes, and submit action", async () => {
    const { CreateUserForm } = await import("@/components/create-user/create-user-form");

    const element = CreateUserForm({
      defaultUsageLocation: "US",
      captchaEnabled: true,
      captchaProvider: "turnstile",
      templates: [
        {
          id: "template-mailbox",
          key: "mailbox",
          name: "信箱專用",
          description: "僅包含 Exchange 權限",
          sort_order: 10,
          featureIds: ["feature-exchange"],
        },
      ],
      features: [
        {
          id: "feature-exchange",
          key: "exchange",
          name: "Exchange Online",
          description: "信箱存取",
          is_default_selected: true,
          sort_order: 10,
        },
        {
          id: "feature-archive",
          key: "archive",
          name: "線上封存",
          description: "封存信箱",
          is_default_selected: false,
          sort_order: 20,
        },
      ],
    });

    const children = Array.isArray(element.props.children) ? element.props.children : [element.props.children];
    const copyText = children
      .filter(Boolean)
      .map((child: { props?: { children?: unknown } }) => child.props?.children)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value) => typeof value === "string");
    const form = children.find((child: { type?: string }) => child?.type === "form");
    const formChildren = Array.isArray(form.props.children) ? form.props.children : [form.props.children];
    const labels = formChildren
      .filter(Boolean)
      .map((child: { props?: { children?: unknown } }) => child.props?.children)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value) => typeof value === "string");

    expect(element.type).toBe("section");
    expect(element.props.style).toEqual(
      expect.objectContaining({
        border: "1px solid #dbe3ef",
        borderRadius: "0.5rem",
        background: "#ffffff",
      }),
    );
    expect(copyText).toContain("送出前可以先預覽授權結果，確認功能組合會落在哪一個 Microsoft 365 SKU。");
    expect(form.type).toBe("form");
    expect(labels).toContain("顯示名稱");
    expect(labels).toContain("使用者名稱");
    expect(labels).toContain("使用者主體名稱");
    expect(labels).toContain("郵件別名");
    expect(labels).toContain("暫時密碼");
    expect(labels).toContain("使用地區");
    expect(labels).toContain("下次登入時強制變更密碼");
    expect(labels).toContain("建立使用者");
    expect(JSON.stringify(element)).toContain("信箱專用");
    expect(JSON.stringify(element)).toContain("Exchange Online");
    expect(JSON.stringify(element)).toContain("線上封存");
    expect(JSON.stringify(element)).toContain("turnstile");
    expect(JSON.stringify(element)).toContain("US");
  });

  it("renders the public self-service home page with the CreateUserForm component", async () => {
    const createServerSupabaseClient = vi.fn(() => ({ tag: "supabase-client" }));
    const listEnabledTemplatesWithFeatureIds = vi.fn().mockResolvedValue([
      {
        id: "template-mailbox",
        key: "mailbox",
        name: "信箱專用",
        description: "僅包含 Exchange 權限",
        sort_order: 10,
        featureIds: ["feature-exchange"],
      },
    ]);
    const listVisibleFeatures = vi.fn().mockResolvedValue([
      {
        id: "feature-exchange",
        key: "exchange",
        name: "Exchange Online",
        description: "信箱存取",
        is_default_selected: true,
        sort_order: 10,
      },
    ]);

    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabaseClient,
    }));

    vi.doMock("@/lib/supabase/templates", () => ({
      listEnabledTemplatesWithFeatureIds,
    }));

    vi.doMock("@/lib/supabase/features", () => ({
      listVisibleFeatures,
    }));

    vi.doMock("@/lib/env", () => ({
      env: new Proxy(
        {},
        {
          get(_target, property) {
            if (property === "DEFAULT_USAGE_LOCATION") {
              return "US";
            }

            if (property === "CAPTCHA_ENABLED") {
              return "false";
            }

            if (property === "CAPTCHA_PROVIDER") {
              return undefined;
            }

            return undefined;
          },
        },
      ),
    }));

    const { default: CreateUserPage } = await import("@/app/page");
    const { CreateUserForm } = await import("@/components/create-user/create-user-form");
    const page = await CreateUserPage();

    expect(page.type).toBe("main");
    expect(findElement(page, (candidate) => candidate.type === CreateUserForm)).toBeDefined();
    expect(createServerSupabaseClient).toHaveBeenCalledTimes(1);
    expect(listEnabledTemplatesWithFeatureIds).toHaveBeenCalledWith({ tag: "supabase-client" });
    expect(listVisibleFeatures).toHaveBeenCalledWith({ tag: "supabase-client" });
  });

  it("keeps /create-user as a redirect to the public self-service front desk", async () => {
    const redirect = vi.fn();

    vi.doMock("next/navigation", () => ({
      redirect,
    }));

    const { default: CreateUserRedirectPage } = await import("@/app/(protected)/create-user/page");

    CreateUserRedirectPage();

    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("preserves template-linked hidden feature ids for preview and submit until the template selection is broken", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            selectedSku: {
              skuId: "sku-mailbox",
              skuPartNumber: "MAILBOX_ONLY",
            },
            enabledApplications: ["Exchange Online"],
            disabledServicePlanIds: [],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            graphUserId: "graph-123",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "FormData",
      class {
        private readonly values: Map<string, string>;

        constructor(form?: { formValues?: Map<string, string> }) {
          this.values = form?.formValues ?? new Map<string, string>();
        }

        get(name: string) {
          return this.values.get(name) ?? null;
        }
      },
    );

    const { CreateUserForm } = await import("@/components/create-user/create-user-form");
    const element = CreateUserForm({
      defaultUsageLocation: "US",
      captchaEnabled: false,
      templates: [
        {
          id: "template-mailbox",
          key: "mailbox",
          name: "信箱專用",
          description: "包含 Exchange 與隱藏的合規功能",
          sort_order: 10,
          featureIds: ["feature-exchange", "feature-hidden"],
        },
      ],
      features: [
        {
          id: "feature-exchange",
          key: "exchange",
          name: "Exchange Online",
          description: "信箱存取",
          is_default_selected: true,
          sort_order: 10,
        },
      ],
    });

    const children = Array.isArray(element.props.children) ? element.props.children : [element.props.children];
    const form = children.find((child: { type?: string }) => child?.type === "form");
    const templateSelectElement = findElement(
      form,
      (candidate) => candidate.type === "select" && candidate.props?.name === "selectedTemplateId",
    );
    const previewButton = findElement(
      form,
      (candidate) => candidate.type === "button" && candidate.props?.type === "button",
    );
    const checkboxElement = findElement(
      form,
      (candidate) => candidate.type === "input" && candidate.props?.name === "selectedFeatureIds",
    );

    const featureCheckbox = {
      value: "feature-exchange",
      checked: true,
    };
    const hiddenTemplateFeatureInput = {
      value: "",
    };
    const templateSelect = {
      value: "",
    };
    const previewStatus = { textContent: "" };
    const submitStatus = { textContent: "" };
    const formValues = new Map<string, string>([
      ["displayName", "陳冠宇"],
      ["userName", "chen.guanyu"],
      ["userPrincipalName", "chen.guanyu@contoso.com"],
      ["mailNickname", ""],
      ["password", "Password123!"],
      ["usageLocation", "US"],
      ["selectedTemplateId", "template-mailbox"],
    ]);

    const formDouble = {
      formValues,
      querySelector(selector: string) {
        if (selector === 'input[name="selectedTemplateFeatureIds"]') {
          return hiddenTemplateFeatureInput;
        }

        if (selector === 'select[name="selectedTemplateId"]') {
          return templateSelect;
        }

        if (selector === "[data-create-user-preview]") {
          return previewStatus;
        }

        if (selector === "[data-create-user-status]") {
          return submitStatus;
        }

        return null;
      },
      querySelectorAll(selector: string) {
        if (selector === 'input[name="selectedFeatureIds"]:checked') {
          return featureCheckbox.checked ? [featureCheckbox] : [];
        }

        if (selector === 'input[name="selectedFeatureIds"]') {
          return [featureCheckbox];
        }

        return [];
      },
    };

    templateSelect.value = "template-mailbox";

    templateSelectElement?.props?.onChange({
      currentTarget: {
        form: formDouble,
        value: "template-mailbox",
      },
    });

    expect(hiddenTemplateFeatureInput.value).toBe(JSON.stringify(["feature-exchange", "feature-hidden"]));
    expect(featureCheckbox.checked).toBe(true);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/license-preview",
      expect.objectContaining({
        body: JSON.stringify({
          featureIds: ["feature-exchange", "feature-hidden"],
        }),
      }),
    );

    previewButton?.props?.onClick({
      currentTarget: {
        form: formDouble,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    await expect(
      form.props.onSubmit({
        preventDefault: vi.fn(),
        currentTarget: formDouble,
      }),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/create-user",
      expect.objectContaining({
        body: JSON.stringify({
          displayName: "陳冠宇",
          userName: "chen.guanyu",
          userPrincipalName: "chen.guanyu@contoso.com",
          mailNickname: "",
          password: "Password123!",
          usageLocation: "US",
          forceChangePasswordNextSignIn: false,
          selectedTemplateId: "template-mailbox",
          selectedFeatureIds: ["feature-exchange", "feature-hidden"],
          captchaToken: "",
        }),
      }),
    );

    featureCheckbox.checked = false;
    templateSelect.value = "template-mailbox";
    formValues.set("selectedTemplateId", "");

    checkboxElement?.props?.onChange({
      currentTarget: {
        form: formDouble,
      },
    });

    expect(templateSelect.value).toBe("");
    expect(hiddenTemplateFeatureInput.value).toBe(JSON.stringify([]));
  });

  it("only applies the latest preview response when earlier requests resolve late", async () => {
    let firstResolve: ((value: Response) => void) | null = null;
    let secondResolve: ((value: Response) => void) | null = null;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            firstResolve = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            secondResolve = resolve;
          }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const { CreateUserForm } = await import("@/components/create-user/create-user-form");
    const element = CreateUserForm({
      defaultUsageLocation: "US",
      captchaEnabled: false,
      templates: [
        {
          id: "template-mailbox",
          key: "mailbox",
          name: "信箱專用",
          description: "僅包含 Exchange 權限",
          sort_order: 10,
          featureIds: ["feature-exchange"],
        },
      ],
      features: [
        {
          id: "feature-exchange",
          key: "exchange",
          name: "Exchange Online",
          description: "信箱存取",
          is_default_selected: true,
          sort_order: 10,
        },
      ],
    });

    const children = Array.isArray(element.props.children) ? element.props.children : [element.props.children];
    const form = children.find((child: { type?: string }) => child?.type === "form");
    const previewButton = findElement(
      form,
      (candidate) => candidate.type === "button" && candidate.props?.type === "button",
    );

    const previewStatus = { textContent: "" };
    const hiddenTemplateFeatureInput = { value: JSON.stringify([]) };
    const formDouble = {
      querySelector(selector: string) {
        if (selector === "[data-create-user-preview]") {
          return previewStatus;
        }

        if (selector === 'input[name="selectedTemplateFeatureIds"]') {
          return hiddenTemplateFeatureInput;
        }

        return null;
      },
      querySelectorAll(selector: string) {
        if (selector === 'input[name="selectedFeatureIds"]:checked') {
          return [{ value: "feature-exchange", checked: true }];
        }

        if (selector === 'input[name="selectedFeatureIds"]') {
          return [{ value: "feature-exchange", checked: true }];
        }

        return [];
      },
    };

    previewButton?.props?.onClick({
      currentTarget: {
        form: formDouble,
      },
    });
    previewButton?.props?.onClick({
      currentTarget: {
        form: formDouble,
      },
    });

    secondResolve?.(
      new Response(
        JSON.stringify({
          ok: true,
          selectedSku: {
            skuId: "sku-new",
            skuPartNumber: "LATEST",
          },
          enabledApplications: ["Exchange Online"],
          disabledServicePlanIds: [],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    firstResolve?.(
      new Response(
        JSON.stringify({
          ok: true,
          selectedSku: {
            skuId: "sku-old",
            skuPartNumber: "STALE",
          },
          enabledApplications: ["Old App"],
          disabledServicePlanIds: ["old-plan"],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(previewStatus.textContent).toContain("LATEST");
    expect(previewStatus.textContent).not.toContain("STALE");
  });
});
