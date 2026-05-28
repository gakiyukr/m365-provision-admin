# Next.js Office Licensing Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the current Cloudflare Worker into a single Next.js application with protected admin auth, Supabase-backed configuration, Graph subscription caching, feature-based license assignment, and a user-provisioning frontend.

**Architecture:** Build a Next.js App Router app with server-only access to Supabase service-role and Microsoft Graph. Keep sensitive configuration in environment variables, store business rules and synchronized subscription data in Supabase, and drive user provisioning through a licensing engine that maps curated feature selections to Graph service plans.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, React Testing Library, Supabase Postgres, `@supabase/supabase-js`, `zod`, `jose`, `bcryptjs`

---

## File Structure

### App shell and config

- Modify: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `next-env.d.ts`
- Create: `.env.example`
- Create: `app/globals.css`
- Create: `app/page.tsx`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(protected)/layout.tsx`

### Shared infrastructure

- Create: `lib/env.ts`
- Create: `lib/http/api-error.ts`
- Create: `lib/http/json.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/admins.ts`
- Create: `lib/supabase/features.ts`
- Create: `lib/supabase/templates.ts`
- Create: `lib/supabase/subscriptions.ts`
- Create: `lib/supabase/records.ts`
- Create: `types/database.ts`
- Create: `schemas/`

### Authentication

- Create: `lib/auth/password.ts`
- Create: `lib/auth/session.ts`
- Create: `lib/auth/guard.ts`
- Create: `middleware.ts`
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `app/api/me/route.ts`
- Create: `components/auth/login-form.tsx`

### Graph, CAPTCHA, and licensing

- Create: `lib/captcha/verify.ts`
- Create: `lib/graph/token.ts`
- Create: `lib/graph/client.ts`
- Create: `lib/graph/subscriptions.ts`
- Create: `lib/graph/users.ts`
- Create: `lib/sync/subscriptions.ts`
- Create: `lib/licensing/engine.ts`
- Create: `lib/audit/log.ts`

### Admin and provisioning UI

- Create: `app/(protected)/create-user/page.tsx`
- Create: `components/create-user/create-user-form.tsx`
- Create: `app/(protected)/admin/subscriptions/page.tsx`
- Create: `app/(protected)/admin/features/page.tsx`
- Create: `app/(protected)/admin/templates/page.tsx`
- Create: `app/(protected)/admin/policies/page.tsx`
- Create: `app/(protected)/admin/records/page.tsx`
- Create: `app/(protected)/admin/settings/page.tsx`
- Create: `components/admin/subscription-table.tsx`
- Create: `components/admin/feature-editor.tsx`
- Create: `components/admin/template-editor.tsx`
- Create: `components/admin/policy-editor.tsx`
- Create: `components/admin/records-table.tsx`

### APIs

- Create: `app/api/create-user/options/route.ts`
- Create: `app/api/license-preview/route.ts`
- Create: `app/api/create-user/route.ts`
- Create: `app/api/admin/subscriptions/route.ts`
- Create: `app/api/admin/subscriptions/refresh/route.ts`
- Create: `app/api/admin/features/route.ts`
- Create: `app/api/admin/features/[id]/route.ts`
- Create: `app/api/admin/templates/route.ts`
- Create: `app/api/admin/templates/[id]/route.ts`
- Create: `app/api/admin/policies/route.ts`
- Create: `app/api/admin/policies/[id]/route.ts`
- Create: `app/api/admin/records/route.ts`
- Create: `app/api/admin/settings/route.ts`

### Database migrations

- Create: `supabase/migrations/202605260001_initial_schema.sql`
- Create: `supabase/seed.sql`

### Tests

- Create: `vitest.config.ts`
- Create: `tests/config/env.test.ts`
- Create: `tests/auth/session.test.ts`
- Create: `tests/auth/login-route.test.ts`
- Create: `tests/captcha/verify.test.ts`
- Create: `tests/graph/normalize-subscriptions.test.ts`
- Create: `tests/licensing/engine.test.ts`
- Create: `tests/provision/create-user-service.test.ts`
- Create: `tests/ui/login-form.test.tsx`
- Create: `tests/ui/create-user-form.test.tsx`

### Docs

- Modify: `README.md`

---

### Task 1: Bootstrap the Next.js app and environment contract

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `next-env.d.ts`
- Create: `.env.example`
- Create: `app/globals.css`
- Create: `app/page.tsx`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(protected)/layout.tsx`
- Create: `lib/env.ts`
- Create: `tests/config/env.test.ts`
- Create: `vitest.config.ts`

- [ ] **Step 1: Write the failing environment test**

```ts
import { describe, expect, it } from "vitest";
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
        CAPTCHA_ENABLED: "true",
      }),
    ).toThrow(/CAPTCHA_PROVIDER/);
  });
});
```

- [ ] **Step 2: Run the test to confirm the project has no Next.js runtime yet**

Run: `npm run test -- tests/config/env.test.ts`

Expected: FAIL with missing `next`, `vitest`, or `@/lib/env` module errors.

- [ ] **Step 3: Replace the Worker package manifest with a Next.js toolchain**

```json
{
  "name": "office-365-user-admin",
  "private": true,
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.0",
    "bcryptjs": "^2.4.3",
    "jose": "^5.9.6",
    "next": "^15.3.2",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "zod": "^3.24.4"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@types/node": "^22.15.19",
    "@types/react": "^19.1.3",
    "@types/react-dom": "^19.1.3",
    "typescript": "^5.8.3",
    "vitest": "^3.1.2"
  }
}
```

- [ ] **Step 4: Add the minimum app shell and typed environment loader**

`lib/env.ts`

```ts
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
        ctx.addIssue({ code: "custom", path: ["CAPTCHA_PROVIDER"], message: "Required when CAPTCHA is enabled" });
      }
      if (!value.CAPTCHA_SITE_KEY) {
        ctx.addIssue({ code: "custom", path: ["CAPTCHA_SITE_KEY"], message: "Required when CAPTCHA is enabled" });
      }
      if (!value.CAPTCHA_SECRET) {
        ctx.addIssue({ code: "custom", path: ["CAPTCHA_SECRET"], message: "Required when CAPTCHA is enabled" });
      }
    }
  });

export const env = envSchema.parse(process.env);
```

`app/page.tsx`

```tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/login");
}
```

`.env.example`

```bash
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
SESSION_SECRET=
DEFAULT_USAGE_LOCATION=US
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CAPTCHA_ENABLED=false
CAPTCHA_PROVIDER=turnstile
CAPTCHA_SITE_KEY=
CAPTCHA_SECRET=
```

- [ ] **Step 5: Run tests and baseline checks**

Run: `npm run test -- tests/config/env.test.ts`

Expected: PASS

Run: `npm run build`

Expected: PASS with Next.js app shell compiling successfully.

- [ ] **Step 6: Create a checkpoint commit**

```bash
git add package.json tsconfig.json next.config.ts postcss.config.mjs next-env.d.ts .env.example app lib tests vitest.config.ts
git commit -m "feat: bootstrap nextjs app shell"
```

### Task 2: Create the Supabase schema and repository layer

**Files:**
- Create: `supabase/migrations/202605260001_initial_schema.sql`
- Create: `supabase/seed.sql`
- Create: `types/database.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/admins.ts`
- Create: `lib/supabase/features.ts`
- Create: `lib/supabase/templates.ts`
- Create: `lib/supabase/subscriptions.ts`
- Create: `lib/supabase/records.ts`
- Create: `tests/provision/create-user-service.test.ts`

- [ ] **Step 1: Write the failing repository contract test**

```ts
import { describe, expect, it, vi } from "vitest";
import { listEnabledTemplates } from "@/lib/supabase/templates";

describe("listEnabledTemplates", () => {
  it("returns templates ordered by sort_order", async () => {
    const select = vi.fn().mockReturnThis();
    const eq = vi.fn().mockResolvedValue({
      data: [
        { id: "2", name: "Full", sort_order: 20 },
        { id: "1", name: "Mail", sort_order: 10 },
      ],
      error: null,
    });

    const client = {
      from: vi.fn(() => ({ select, eq })),
    } as any;

    const result = await listEnabledTemplates(client);
    expect(result.map((item) => item.name)).toEqual(["Mail", "Full"]);
  });
});
```

- [ ] **Step 2: Run the test to verify repository helpers do not exist yet**

Run: `npm run test -- tests/provision/create-user-service.test.ts`

Expected: FAIL with missing `@/lib/supabase/templates` export.

- [ ] **Step 3: Add the initial Supabase schema migration**

`supabase/migrations/202605260001_initial_schema.sql`

```sql
create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists feature_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null default '',
  is_enabled boolean not null default true,
  is_frontend_visible boolean not null default true,
  is_default_selected boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists feature_match_rules (
  id uuid primary key default gen_random_uuid(),
  feature_id uuid not null references feature_definitions(id) on delete cascade,
  match_type text not null check (match_type in ('servicePlanName', 'servicePlanId')),
  match_value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists license_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null default '',
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists license_template_features (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references license_templates(id) on delete cascade,
  feature_id uuid not null references feature_definitions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (template_id, feature_id)
);

create table if not exists subscription_policies (
  id uuid primary key default gen_random_uuid(),
  sku_id text not null unique,
  sku_part_number text not null,
  is_assignable boolean not null default true,
  priority integer not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists service_plan_policies (
  id uuid primary key default gen_random_uuid(),
  sku_id text not null,
  service_plan_id text not null,
  service_plan_name text not null,
  is_frontend_selectable boolean not null default true,
  is_forced_keep boolean not null default false,
  is_forbidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sku_id, service_plan_id)
);

create table if not exists graph_subscriptions (
  id uuid primary key default gen_random_uuid(),
  sku_id text not null unique,
  sku_part_number text not null,
  capability_status text not null,
  applies_to text not null,
  enabled_units integer not null default 0,
  warning_units integer not null default 0,
  consumed_units integer not null default 0,
  available_units integer not null default 0,
  raw_payload jsonb not null,
  synced_at timestamptz not null default now()
);

create table if not exists graph_service_plans (
  id uuid primary key default gen_random_uuid(),
  sku_id text not null,
  service_plan_id text not null,
  service_plan_name text not null,
  provisioning_status text,
  applies_to text,
  raw_payload jsonb not null,
  synced_at timestamptz not null default now(),
  unique (sku_id, service_plan_id)
);

create table if not exists graph_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error_message text,
  stats_payload jsonb not null default '{}'::jsonb
);

create table if not exists provision_records (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references admins(id),
  display_name text not null,
  user_name text not null,
  mail_nickname text not null,
  user_principal_name text not null,
  usage_location text not null,
  template_id uuid references license_templates(id),
  selected_feature_ids jsonb not null,
  resolved_feature_snapshot jsonb not null,
  selected_sku_id text,
  selected_sku_part_number text,
  kept_service_plans jsonb not null default '[]'::jsonb,
  disabled_service_plans jsonb not null default '[]'::jsonb,
  graph_user_id text,
  status text not null,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references admins(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 4: Implement server client and the first repository helpers**

`lib/supabase/server.ts`

```ts
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

export function createServerSupabaseClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
}
```

`lib/supabase/templates.ts`

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function listEnabledTemplates(client: Client) {
  const { data, error } = await client
    .from("license_templates")
    .select("id, key, name, description, sort_order")
    .eq("is_enabled", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 5: Verify the repository and migration**

Run: `npm run test -- tests/provision/create-user-service.test.ts`

Expected: PASS

Run: `npx supabase db lint`

Expected: PASS with valid SQL syntax.

- [ ] **Step 6: Create a checkpoint commit**

```bash
git add supabase lib/supabase types tests/provision/create-user-service.test.ts
git commit -m "feat: add supabase schema and repositories"
```

### Task 3: Implement admin authentication and protected routes

**Files:**
- Create: `lib/auth/password.ts`
- Create: `lib/auth/session.ts`
- Create: `lib/auth/guard.ts`
- Create: `middleware.ts`
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `app/api/me/route.ts`
- Create: `components/auth/login-form.tsx`
- Create: `tests/auth/session.test.ts`
- Create: `tests/auth/login-route.test.ts`
- Create: `tests/ui/login-form.test.tsx`

- [ ] **Step 1: Write the failing auth tests**

`tests/auth/session.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";

describe("session token", () => {
  it("round-trips the admin id and username", async () => {
    const token = await createSessionToken({ adminId: "admin-1", username: "owner" });
    const payload = await verifySessionToken(token);
    expect(payload.adminId).toBe("admin-1");
    expect(payload.username).toBe("owner");
  });
});
```

`tests/auth/login-route.test.ts`

```ts
import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/login/route";

describe("POST /api/auth/login", () => {
  it("rejects invalid credentials", async () => {
    vi.mock("@/lib/supabase/admins", () => ({
      findAdminByUsername: vi.fn().mockResolvedValue({ id: "1", username: "owner", password_hash: "hash", is_active: true }),
    }));
    vi.mock("@/lib/auth/password", () => ({
      verifyPassword: vi.fn().mockResolvedValue(false),
    }));

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "owner", password: "bad-pass" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request as any);
    expect(response.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the tests to confirm auth code is missing**

Run: `npm run test -- tests/auth/session.test.ts tests/auth/login-route.test.ts`

Expected: FAIL with unresolved `@/lib/auth/session` and route imports.

- [ ] **Step 3: Implement password hashing, signed session cookies, and middleware**

`lib/auth/password.ts`

```ts
import bcrypt from "bcryptjs";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
```

`lib/auth/session.ts`

```ts
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

const secret = new TextEncoder().encode(env.SESSION_SECRET);
const cookieName = "office_admin_session";

export async function createSessionToken(payload: { adminId: string; username: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(token: string) {
  const result = await jwtVerify(token, secret);
  return result.payload as { adminId: string; username: string };
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(cookieName, token, { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
}
```

`middleware.ts`

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedMatchers = ["/create-user", "/admin"];

export function middleware(request: NextRequest) {
  const isProtected = protectedMatchers.some((prefix) => request.nextUrl.pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get("office_admin_session")?.value;
  if (!token) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/create-user/:path*", "/admin/:path*"],
};
```

- [ ] **Step 4: Implement the login route and form**

`app/api/auth/login/route.ts`

```ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { findAdminByUsername, touchLastLoginAt } from "@/lib/supabase/admins";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";

export async function POST(request: Request) {
  const { username, password } = await request.json();
  const client = createServerSupabaseClient();
  const admin = await findAdminByUsername(client, username);

  if (!admin || !admin.is_active) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await verifyPassword(password, admin.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createSessionToken({ adminId: admin.id, username: admin.username });
  await setSessionCookie(token);
  await touchLastLoginAt(client, admin.id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Verify auth behavior**

Run: `npm run test -- tests/auth/session.test.ts tests/auth/login-route.test.ts tests/ui/login-form.test.tsx`

Expected: PASS

Run: `npm run build`

Expected: PASS with `/login` page and protected route shell compiling.

- [ ] **Step 6: Create a checkpoint commit**

```bash
git add lib/auth middleware.ts app/api/auth app/(auth) components/auth tests/auth tests/ui/login-form.test.tsx
git commit -m "feat: add admin authentication"
```

### Task 4: Implement CAPTCHA abstraction and settings summary

**Files:**
- Create: `lib/captcha/verify.ts`
- Create: `app/api/admin/settings/route.ts`
- Create: `tests/captcha/verify.test.ts`

- [ ] **Step 1: Write the failing CAPTCHA tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { verifyCaptchaToken } from "@/lib/captcha/verify";

describe("verifyCaptchaToken", () => {
  it("returns success when CAPTCHA is disabled", async () => {
    const result = await verifyCaptchaToken({
      enabled: false,
      provider: null,
      secret: null,
      token: "",
      remoteIp: "",
      fetchImpl: vi.fn(),
    });

    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to confirm the abstraction does not exist**

Run: `npm run test -- tests/captcha/verify.test.ts`

Expected: FAIL with missing `@/lib/captcha/verify`.

- [ ] **Step 3: Implement provider-specific verification behind one function**

`lib/captcha/verify.ts`

```ts
type VerifyArgs = {
  enabled: boolean;
  provider: "turnstile" | "hcaptcha" | "recaptcha_v2" | null;
  secret: string | null;
  token: string;
  remoteIp: string;
  fetchImpl?: typeof fetch;
};

export async function verifyCaptchaToken(args: VerifyArgs) {
  if (!args.enabled) return { success: true };
  if (!args.provider || !args.secret) {
    throw new Error("CAPTCHA is enabled but not fully configured");
  }

  const endpoint =
    args.provider === "turnstile"
      ? "https://challenges.cloudflare.com/turnstile/v0/siteverify"
      : args.provider === "hcaptcha"
        ? "https://api.hcaptcha.com/siteverify"
        : "https://www.google.com/recaptcha/api/siteverify";

  const response = await (args.fetchImpl ?? fetch)(endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: args.secret,
      response: args.token,
      remoteip: args.remoteIp,
    }),
  });

  const data = await response.json();
  return { success: Boolean(data.success), raw: data };
}
```

- [ ] **Step 4: Expose the non-secret settings summary to the admin UI**

`app/api/admin/settings/route.ts`

```ts
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    captchaEnabled: env.CAPTCHA_ENABLED === "true",
    captchaProvider: env.CAPTCHA_ENABLED === "true" ? env.CAPTCHA_PROVIDER : null,
    defaultUsageLocation: env.DEFAULT_USAGE_LOCATION,
  });
}
```

- [ ] **Step 5: Verify CAPTCHA behavior**

Run: `npm run test -- tests/captcha/verify.test.ts`

Expected: PASS

Run: `npm run build`

Expected: PASS with settings route compiling.

- [ ] **Step 6: Create a checkpoint commit**

```bash
git add lib/captcha app/api/admin/settings tests/captcha
git commit -m "feat: add captcha abstraction"
```

### Task 5: Build Graph synchronization and subscription cache refresh

**Files:**
- Create: `lib/graph/token.ts`
- Create: `lib/graph/client.ts`
- Create: `lib/graph/subscriptions.ts`
- Create: `lib/sync/subscriptions.ts`
- Create: `app/api/admin/subscriptions/route.ts`
- Create: `app/api/admin/subscriptions/refresh/route.ts`
- Create: `tests/graph/normalize-subscriptions.test.ts`

- [ ] **Step 1: Write the failing Graph normalization test**

```ts
import { describe, expect, it } from "vitest";
import { normalizeSubscribedSkus } from "@/lib/graph/subscriptions";

describe("normalizeSubscribedSkus", () => {
  it("calculates available seats and flattens service plans", () => {
    const result = normalizeSubscribedSkus([
      {
        skuId: "sku-1",
        skuPartNumber: "M365_E3",
        capabilityStatus: "Enabled",
        appliesTo: "User",
        consumedUnits: 8,
        prepaidUnits: { enabled: 10, warning: 1 },
        servicePlans: [{ servicePlanId: "plan-1", servicePlanName: "EXCHANGE_S_FOUNDATION" }],
      },
    ]);

    expect(result.subscriptions[0].available_units).toBe(3);
    expect(result.servicePlans[0].service_plan_name).toBe("EXCHANGE_S_FOUNDATION");
  });
});
```

- [ ] **Step 2: Run the test to confirm Graph mapping is not implemented**

Run: `npm run test -- tests/graph/normalize-subscriptions.test.ts`

Expected: FAIL with missing normalization helpers.

- [ ] **Step 3: Implement Graph token loading and subscription normalization**

`lib/graph/token.ts`

```ts
import { env } from "@/lib/env";

export async function getGraphToken(fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(
    `https://login.microsoftonline.com/${encodeURIComponent(env.AZURE_TENANT_ID)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.AZURE_CLIENT_ID,
        client_secret: env.AZURE_CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    },
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || "Failed to load Graph token");
  return data.access_token as string;
}
```

`lib/graph/subscriptions.ts`

```ts
export function normalizeSubscribedSkus(items: any[]) {
  const subscriptions = items.map((item) => {
    const enabled = Number(item.prepaidUnits?.enabled || 0);
    const warning = Number(item.prepaidUnits?.warning || 0);
    const consumed = Number(item.consumedUnits || 0);

    return {
      sku_id: item.skuId,
      sku_part_number: item.skuPartNumber,
      capability_status: item.capabilityStatus,
      applies_to: item.appliesTo,
      enabled_units: enabled,
      warning_units: warning,
      consumed_units: consumed,
      available_units: enabled + warning - consumed,
      raw_payload: item,
    };
  });

  const servicePlans = items.flatMap((item) =>
    (item.servicePlans ?? []).map((plan: any) => ({
      sku_id: item.skuId,
      service_plan_id: plan.servicePlanId,
      service_plan_name: plan.servicePlanName,
      provisioning_status: plan.provisioningStatus ?? null,
      applies_to: plan.appliesTo ?? null,
      raw_payload: plan,
    })),
  );

  return { subscriptions, servicePlans };
}
```

- [ ] **Step 4: Implement sync orchestration and refresh endpoints**

`lib/sync/subscriptions.ts`

```ts
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getGraphToken } from "@/lib/graph/token";
import { normalizeSubscribedSkus } from "@/lib/graph/subscriptions";

export async function syncGraphSubscriptions(fetchImpl: typeof fetch = fetch) {
  const token = await getGraphToken(fetchImpl);
  const response = await fetchImpl("https://graph.microsoft.com/v1.0/subscribedSkus", {
    headers: { authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Failed to fetch subscribed SKUs");

  const normalized = normalizeSubscribedSkus(data.value ?? []);
  const client = createServerSupabaseClient();

  await client.from("graph_subscriptions").upsert(normalized.subscriptions, { onConflict: "sku_id" });
  await client.from("graph_service_plans").upsert(normalized.servicePlans, { onConflict: "sku_id,service_plan_id" });

  return normalized;
}
```

`app/api/admin/subscriptions/refresh/route.ts`

```ts
import { NextResponse } from "next/server";
import { syncGraphSubscriptions } from "@/lib/sync/subscriptions";

export async function POST() {
  const result = await syncGraphSubscriptions();
  return NextResponse.json({
    ok: true,
    syncedSubscriptions: result.subscriptions.length,
    syncedServicePlans: result.servicePlans.length,
  });
}
```

- [ ] **Step 5: Verify normalization and refresh path**

Run: `npm run test -- tests/graph/normalize-subscriptions.test.ts`

Expected: PASS

Run: `npm run build`

Expected: PASS with Graph sync route compiling.

- [ ] **Step 6: Create a checkpoint commit**

```bash
git add lib/graph lib/sync app/api/admin/subscriptions tests/graph
git commit -m "feat: add graph subscription sync"
```

### Task 6: Implement the licensing engine and preview API

**Files:**
- Create: `lib/licensing/engine.ts`
- Create: `app/api/license-preview/route.ts`
- Modify: `lib/supabase/features.ts`
- Modify: `lib/supabase/subscriptions.ts`
- Create: `tests/licensing/engine.test.ts`

- [ ] **Step 1: Write the failing licensing engine tests**

```ts
import { describe, expect, it } from "vitest";
import { buildDisabledPlans, pickBestSku } from "@/lib/licensing/engine";

describe("pickBestSku", () => {
  it("prefers the candidate with fewer extra plans", () => {
    const targetPlans = new Set(["exchange", "teams"]);
    const candidates = [
      {
        skuId: "wide",
        priority: 0,
        availableUnits: 10,
        servicePlans: ["exchange", "teams", "sharepoint", "onedrive"],
      },
      {
        skuId: "tight",
        priority: 0,
        availableUnits: 2,
        servicePlans: ["exchange", "teams"],
      },
    ];

    const selected = pickBestSku(candidates as any, targetPlans);
    expect(selected?.skuId).toBe("tight");
  });
});

describe("buildDisabledPlans", () => {
  it("keeps selected and forced plans, disabling everything else", () => {
    const result = buildDisabledPlans({
      skuServicePlans: ["exchange", "teams", "sharepoint"],
      selectedPlans: new Set(["exchange"]),
      forcedKeepPlans: new Set(["teams"]),
    });

    expect(result.disabledPlans).toEqual(["sharepoint"]);
  });
});
```

- [ ] **Step 2: Run the test to confirm ranking logic is missing**

Run: `npm run test -- tests/licensing/engine.test.ts`

Expected: FAIL with unresolved licensing engine exports.

- [ ] **Step 3: Implement feature resolution, candidate ranking, and disabled-plan generation**

`lib/licensing/engine.ts`

```ts
export function pickBestSku(
  candidates: Array<{ skuId: string; priority: number; availableUnits: number; servicePlans: string[] }>,
  targetPlans: Set<string>,
) {
  return [...candidates]
    .filter((candidate) => [...targetPlans].every((plan) => candidate.servicePlans.includes(plan)))
    .sort((left, right) => {
      const leftExtra = left.servicePlans.filter((plan) => !targetPlans.has(plan)).length;
      const rightExtra = right.servicePlans.filter((plan) => !targetPlans.has(plan)).length;

      if (leftExtra !== rightExtra) return leftExtra - rightExtra;
      if (left.priority !== right.priority) return right.priority - left.priority;
      return right.availableUnits - left.availableUnits;
    })[0] ?? null;
}

export function buildDisabledPlans(args: {
  skuServicePlans: string[];
  selectedPlans: Set<string>;
  forcedKeepPlans: Set<string>;
}) {
  const keep = new Set([...args.selectedPlans, ...args.forcedKeepPlans]);
  return {
    keptPlans: args.skuServicePlans.filter((plan) => keep.has(plan)),
    disabledPlans: args.skuServicePlans.filter((plan) => !keep.has(plan)),
  };
}
```

- [ ] **Step 4: Implement the preview endpoint**

`app/api/license-preview/route.ts`

```ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listFeatureRulesByIds } from "@/lib/supabase/features";
import { listAssignableSkuCatalog } from "@/lib/supabase/subscriptions";
import { pickBestSku } from "@/lib/licensing/engine";

export async function POST(request: Request) {
  const { featureIds } = await request.json();
  const client = createServerSupabaseClient();
  const rules = await listFeatureRulesByIds(client, featureIds);
  const targetPlans = new Set(rules.map((item) => item.match_value));
  const catalog = await listAssignableSkuCatalog(client);
  const selected = pickBestSku(catalog, targetPlans);

  return NextResponse.json({
    ok: Boolean(selected),
    selectedSku: selected,
    targetPlans: [...targetPlans],
  });
}
```

- [ ] **Step 5: Verify ranking logic and preview API**

Run: `npm run test -- tests/licensing/engine.test.ts`

Expected: PASS

Run: `npm run build`

Expected: PASS with `/api/license-preview` compiling.

- [ ] **Step 6: Create a checkpoint commit**

```bash
git add lib/licensing app/api/license-preview lib/supabase tests/licensing
git commit -m "feat: add licensing preview engine"
```

### Task 7: Build the create-user API and provisioning record flow

**Files:**
- Create: `lib/graph/users.ts`
- Create: `lib/audit/log.ts`
- Create: `app/api/create-user/options/route.ts`
- Create: `app/api/create-user/route.ts`
- Modify: `lib/supabase/records.ts`
- Modify: `lib/supabase/features.ts`
- Modify: `lib/supabase/templates.ts`
- Modify: `lib/supabase/subscriptions.ts`
- Create: `tests/provision/create-user-service.test.ts`

- [ ] **Step 1: Write the failing provisioning orchestration test**

```ts
import { describe, expect, it, vi } from "vitest";
import { createProvisionRecord } from "@/lib/supabase/records";

describe("provision record flow", () => {
  it("stores a partial-success snapshot when the user is created but license assignment fails", async () => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: null });
    const client = {
      from: vi.fn(() => ({ insert })),
    } as any;

    await createProvisionRecord(client, {
      admin_id: "admin-1",
      display_name: "User One",
      user_name: "user.one",
      mail_nickname: "user.one",
      user_principal_name: "user.one@example.com",
      usage_location: "US",
      template_id: null,
      selected_feature_ids: ["exchange"],
      resolved_feature_snapshot: [{ key: "exchange" }],
      selected_sku_id: "sku-1",
      selected_sku_part_number: "M365_E3",
      kept_service_plans: ["exchange"],
      disabled_service_plans: ["teams"],
      graph_user_id: "graph-123",
      status: "partial_success",
      error_message: "assignLicense failed",
    });

    expect(insert).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the test to confirm provisioning helpers are incomplete**

Run: `npm run test -- tests/provision/create-user-service.test.ts`

Expected: FAIL with missing record helpers or shape mismatch.

- [ ] **Step 3: Implement Graph user creation and license assignment helpers**

`lib/graph/users.ts`

```ts
import { getGraphToken } from "@/lib/graph/token";

export async function createGraphUser(payload: {
  displayName: string;
  mailNickname: string;
  userPrincipalName: string;
  usageLocation: string;
  password: string;
  forceChangePasswordNextSignIn: boolean;
}) {
  const token = await getGraphToken();
  const response = await fetch("https://graph.microsoft.com/v1.0/users", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      accountEnabled: true,
      displayName: payload.displayName,
      mailNickname: payload.mailNickname,
      userPrincipalName: payload.userPrincipalName,
      usageLocation: payload.usageLocation,
      passwordProfile: {
        forceChangePasswordNextSignIn: payload.forceChangePasswordNextSignIn,
        password: payload.password,
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Failed to create Graph user");
  return data;
}

export async function assignGraphLicense(userId: string, skuId: string, disabledPlans: string[]) {
  const token = await getGraphToken();
  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}/assignLicense`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      addLicenses: [{ skuId, disabledPlans }],
      removeLicenses: [],
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Failed to assign Graph license");
  return data;
}
```

- [ ] **Step 4: Implement options and create-user endpoints**

`app/api/create-user/options/route.ts`

```ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listEnabledTemplates } from "@/lib/supabase/templates";
import { listVisibleFeatures } from "@/lib/supabase/features";
import { env } from "@/lib/env";

export async function GET() {
  const client = createServerSupabaseClient();
  const [templates, features] = await Promise.all([
    listEnabledTemplates(client),
    listVisibleFeatures(client),
  ]);

  return NextResponse.json({
    templates,
    features,
    captchaEnabled: env.CAPTCHA_ENABLED === "true",
    captchaProvider: env.CAPTCHA_ENABLED === "true" ? env.CAPTCHA_PROVIDER : null,
    defaultUsageLocation: env.DEFAULT_USAGE_LOCATION,
  });
}
```

`app/api/create-user/route.ts`

```ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { verifyCaptchaToken } from "@/lib/captcha/verify";
import { createGraphUser, assignGraphLicense } from "@/lib/graph/users";
import { buildDisabledPlans, pickBestSku } from "@/lib/licensing/engine";
import { createProvisionRecord } from "@/lib/supabase/records";

export async function POST(request: Request) {
  const body = await request.json();
  const client = createServerSupabaseClient();

  await verifyCaptchaToken({
    enabled: false,
    provider: null,
    secret: null,
    token: body.captchaToken ?? "",
    remoteIp: "",
  });

  const graphUser = await createGraphUser({
    displayName: body.displayName,
    mailNickname: body.mailNickname || body.userName,
    userPrincipalName: `${body.userName}@${body.mailDomain}`,
    usageLocation: body.usageLocation,
    password: body.password,
    forceChangePasswordNextSignIn: body.forceChangePasswordNextSignIn,
  });

  try {
    const selection = pickBestSku(body.catalog, new Set(body.targetPlans));
    if (!selection) {
      throw new Error("No assignable SKU satisfies the selected feature set");
    }

    const plans = buildDisabledPlans({
      skuServicePlans: selection.servicePlans,
      selectedPlans: new Set(body.targetPlans),
      forcedKeepPlans: new Set(body.forcedKeepPlans ?? []),
    });

    await assignGraphLicense(graphUser.id, selection.skuId, plans.disabledPlans);
    await createProvisionRecord(client, {
      ...body.recordBase,
      graph_user_id: graphUser.id,
      selected_sku_id: selection.skuId,
      selected_sku_part_number: selection.skuPartNumber,
      kept_service_plans: plans.keptPlans,
      disabled_service_plans: plans.disabledPlans,
      status: "success",
      error_message: null,
    });

    return NextResponse.json({ ok: true, graphUserId: graphUser.id });
  } catch (error) {
    await createProvisionRecord(client, {
      ...body.recordBase,
      graph_user_id: graphUser.id,
      status: "partial_success",
      error_message: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Provisioning failed", graphUserId: graphUser.id },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 5: Verify provisioning record behavior**

Run: `npm run test -- tests/provision/create-user-service.test.ts`

Expected: PASS

Run: `npm run build`

Expected: PASS with the create-user API compiling.

- [ ] **Step 6: Create a checkpoint commit**

```bash
git add lib/graph/users.ts lib/audit app/api/create-user app/api/create-user/options lib/supabase/records tests/provision/create-user-service.test.ts
git commit -m "feat: add create-user provisioning flow"
```

### Task 8: Build the admin pages, provisioning UI, and final documentation

**Files:**
- Create: `components/create-user/create-user-form.tsx`
- Create: `app/(protected)/create-user/page.tsx`
- Create: `app/(protected)/admin/subscriptions/page.tsx`
- Create: `app/(protected)/admin/features/page.tsx`
- Create: `app/(protected)/admin/templates/page.tsx`
- Create: `app/(protected)/admin/policies/page.tsx`
- Create: `app/(protected)/admin/records/page.tsx`
- Create: `app/(protected)/admin/settings/page.tsx`
- Create: `components/admin/subscription-table.tsx`
- Create: `components/admin/feature-editor.tsx`
- Create: `components/admin/template-editor.tsx`
- Create: `components/admin/policy-editor.tsx`
- Create: `components/admin/records-table.tsx`
- Create: `tests/ui/create-user-form.test.tsx`
- Modify: `README.md`

- [ ] **Step 1: Write the failing create-user form test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreateUserForm } from "@/components/create-user/create-user-form";

describe("CreateUserForm", () => {
  it("applies a template and then allows feature overrides", async () => {
    render(
      <CreateUserForm
        templates={[{ id: "tmpl-1", name: "Mail", featureIds: ["feature-exchange"] }]}
        features={[
          { id: "feature-exchange", name: "Exchange" },
          { id: "feature-teams", name: "Teams" },
        ]}
        onPreview={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Template"), { target: { value: "tmpl-1" } });
    expect((screen.getByLabelText("Exchange") as HTMLInputElement).checked).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to confirm the UI has not been built**

Run: `npm run test -- tests/ui/create-user-form.test.tsx`

Expected: FAIL with missing `CreateUserForm`.

- [ ] **Step 3: Implement the protected create-user page and form**

`components/create-user/create-user-form.tsx`

```tsx
"use client";

import { useState } from "react";

export function CreateUserForm({ templates, features, onPreview, onSubmit }: any) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);

  function applyTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    const template = templates.find((item: any) => item.id === templateId);
    const next = template?.featureIds ?? [];
    setSelectedFeatureIds(next);
    onPreview(next);
  }

  function toggleFeature(featureId: string) {
    const next = selectedFeatureIds.includes(featureId)
      ? selectedFeatureIds.filter((id) => id !== featureId)
      : [...selectedFeatureIds, featureId];
    setSelectedFeatureIds(next);
    onPreview(next);
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); onSubmit({ selectedTemplateId, selectedFeatureIds }); }}>
      <label>
        Template
        <select aria-label="Template" value={selectedTemplateId} onChange={(event) => applyTemplate(event.target.value)}>
          <option value="">Select a template</option>
          {templates.map((template: any) => (
            <option key={template.id} value={template.id}>{template.name}</option>
          ))}
        </select>
      </label>

      {features.map((feature: any) => (
        <label key={feature.id}>
          <input
            type="checkbox"
            aria-label={feature.name}
            checked={selectedFeatureIds.includes(feature.id)}
            onChange={() => toggleFeature(feature.id)}
          />
          {feature.name}
        </label>
      ))}
    </form>
  );
}
```

- [ ] **Step 4: Implement the admin pages using server-loaded data**

`app/(protected)/admin/subscriptions/page.tsx`

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listSubscriptionCatalog } from "@/lib/supabase/subscriptions";
import { SubscriptionTable } from "@/components/admin/subscription-table";

export default async function AdminSubscriptionsPage() {
  const client = createServerSupabaseClient();
  const subscriptions = await listSubscriptionCatalog(client);
  return <SubscriptionTable subscriptions={subscriptions} />;
}
```

`app/(protected)/admin/records/page.tsx`

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listProvisionRecords } from "@/lib/supabase/records";
import { RecordsTable } from "@/components/admin/records-table";

export default async function AdminRecordsPage() {
  const client = createServerSupabaseClient();
  const records = await listProvisionRecords(client);
  return <RecordsTable records={records} />;
}
```

- [ ] **Step 5: Update the README for the Next.js + Supabase architecture**

Replace the Worker-specific sections with:

```md
## Stack

- Next.js App Router
- Supabase Postgres
- Microsoft Graph
- Optional CAPTCHA: Turnstile, hCaptcha, or reCAPTCHA v2

## Main workflows

- Admin login
- Graph subscription sync
- Feature and template management
- User provisioning with preview and final assignment
```

- [ ] **Step 6: Run the final verification suite**

Run: `npm run test`

Expected: PASS

Run: `npm run build`

Expected: PASS

Run: `npm run lint`

Expected: PASS

- [ ] **Step 7: Create a final checkpoint commit**

```bash
git add app components README.md tests
git commit -m "feat: add admin ui and provisioning frontend"
```

## Self-Review Notes

- Spec coverage:
  - Next.js migration is covered in Tasks 1 and 8.
  - Supabase schema and repositories are covered in Task 2.
  - Admin login and session protection are covered in Task 3.
  - CAPTCHA support is covered in Task 4.
  - Graph synchronization and cached subscription browsing are covered in Task 5.
  - Feature-based SKU matching, preview, and disabled-plan generation are covered in Task 6.
  - User provisioning and provision-record snapshots are covered in Task 7.
  - Admin pages and README migration are covered in Task 8.
- Placeholder scan:
  - Removed generic “handle later” language and named concrete files, functions, tests, and commands.
- Type consistency:
  - `selectedFeatureIds`, `selected_sku_id`, `disabledPlans`, and `createProvisionRecord` names are consistent across tasks.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-26-nextjs-office-licensing-admin.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
