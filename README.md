# Office 365 User Admin

This project is a Next.js 15 admin application for creating Microsoft 365 users, previewing license decisions, and reviewing the Supabase-backed configuration that drives provisioning.

## Architecture

- `app/`
  - App Router pages for the public self-service front desk, admin login, protected admin pages, and API routes
- `components/`
  - Lightweight UI for sign-in, create-user, and admin review surfaces
- `lib/auth/`
  - Session signing, request guards, and password validation
- `lib/supabase/`
  - Server-side data access for admins, features, templates, subscriptions, and provision records
- `lib/graph/`
  - Microsoft Graph token, subscription, and user provisioning helpers
- `lib/licensing/`
  - SKU selection and disabled-plan calculation logic
- `tests/`
  - Vitest coverage for auth, licensing, Graph normalization, provisioning routes, CAPTCHA behavior, and UI shells

## Request Flow

1. A user opens the public self-service front desk at `/`.
2. The front desk loads enabled templates and visible features from Supabase.
3. The UI can call `/api/license-preview` to resolve the best matching assignable SKU for the selected features.
4. Submitting the form calls `/api/create-user`.
5. The server validates the payload, checks CAPTCHA if enabled, resolves the selected feature set against the synced subscription catalog, creates the Graph user, assigns the SKU, and records the result in Supabase.

## Data Sources

- Supabase stores:
  - admin accounts
  - feature definitions and feature match rules
  - license templates and template-feature links
  - synced Graph subscriptions and service plans
  - subscription and service-plan policies
  - provision records and audit logs
- Microsoft Graph provides:
  - tenant subscription catalog
  - user creation
  - license assignment

## Protected Pages

- `/admin`
  - Admin entry page for reviewing configuration, subscription catalog state, and provisioning history
- `/admin/subscriptions`
  - Synced subscription catalog and assignability summary
- `/admin/features`
  - Frontend-visible feature catalog
- `/admin/templates`
  - Enabled templates and linked features
- `/admin/policies`
  - Subscription and service-plan policy overview
- `/admin/records`
  - Provisioning result history
- `/admin/settings`
  - Runtime provisioning defaults such as usage location and CAPTCHA mode

## Public Pages

- `/`
  - Self-service provisioning form, template selection, feature selection, preview, and submission shell
- `/create-user`
  - Compatibility redirect to `/`
- `/login`
  - Admin-only login page for the protected backend

## Environment

The app expects the same server-side values validated in [`lib/env.ts`](/C:/Projects/office_365_user/lib/env.ts):

- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `SESSION_SECRET`
- `DEFAULT_USAGE_LOCATION`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CAPTCHA_ENABLED`
- `CAPTCHA_PROVIDER` when CAPTCHA is enabled
- `CAPTCHA_SITE_KEY` when CAPTCHA is enabled
- `CAPTCHA_SECRET` when CAPTCHA is enabled

## Local Commands

```bash
npm install
npm run test
npm run lint
npm run build
```

## Notes

- The app is intended for protected internal use.
- Provisioning behavior depends on the synced subscription catalog and the policy rows stored in Supabase.
- Partial-success outcomes are preserved through provision records and audit logging so operators can recover when Graph user creation succeeds but later steps fail.
