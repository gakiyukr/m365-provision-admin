import { describe, expect, it } from "vitest";

describe("AdminHomePage", () => {
  it("renders a clean admin entry page with links to child sections", async () => {
    const { default: AdminHomePage } = await import("@/app/(protected)/admin/page");

    const page = AdminHomePage();
    const rendered = JSON.stringify(page);

    expect(page.type).toBe("main");
    expect(rendered).toContain("管理後台");
    expect(rendered).toContain("/admin/subscriptions");
    expect(rendered).toContain("/admin/features");
    expect(rendered).toContain("/admin/templates");
    expect(rendered).toContain("/admin/policies");
    expect(rendered).toContain("/admin/records");
    expect(rendered).toContain("/admin/settings");
    expect(rendered).toContain("/");
  });
});
