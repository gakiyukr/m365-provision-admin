create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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
  updated_at timestamptz not null default now(),
  unique (feature_id, match_type, match_value)
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
  check (not (is_forced_keep and is_forbidden)),
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

alter table admins enable row level security;
alter table feature_definitions enable row level security;
alter table feature_match_rules enable row level security;
alter table license_templates enable row level security;
alter table license_template_features enable row level security;
alter table subscription_policies enable row level security;
alter table service_plan_policies enable row level security;
alter table graph_subscriptions enable row level security;
alter table graph_service_plans enable row level security;
alter table graph_sync_jobs enable row level security;
alter table provision_records enable row level security;
alter table audit_logs enable row level security;

alter table admins force row level security;
alter table graph_sync_jobs force row level security;
alter table provision_records force row level security;
alter table audit_logs force row level security;

drop policy if exists public_read_feature_definitions on feature_definitions;
create policy public_read_feature_definitions
on feature_definitions
for select
to anon, authenticated
using (is_enabled and is_frontend_visible);

drop policy if exists public_read_feature_match_rules on feature_match_rules;
create policy public_read_feature_match_rules
on feature_match_rules
for select
to anon, authenticated
using (
  exists (
    select 1
    from feature_definitions
    where feature_definitions.id = feature_match_rules.feature_id
      and feature_definitions.is_enabled
      and feature_definitions.is_frontend_visible
  )
);

drop policy if exists public_read_license_templates on license_templates;
create policy public_read_license_templates
on license_templates
for select
to anon, authenticated
using (is_enabled);

drop policy if exists public_read_license_template_features on license_template_features;
create policy public_read_license_template_features
on license_template_features
for select
to anon, authenticated
using (
  exists (
    select 1
    from license_templates
    where license_templates.id = license_template_features.template_id
      and license_templates.is_enabled
  )
  and exists (
    select 1
    from feature_definitions
    where feature_definitions.id = license_template_features.feature_id
      and feature_definitions.is_enabled
      and feature_definitions.is_frontend_visible
  )
);

drop policy if exists public_read_subscription_policies on subscription_policies;
create policy public_read_subscription_policies
on subscription_policies
for select
to anon, authenticated
using (is_assignable);

drop policy if exists public_read_service_plan_policies on service_plan_policies;
create policy public_read_service_plan_policies
on service_plan_policies
for select
to anon, authenticated
using (is_frontend_selectable or is_forced_keep or is_forbidden);

drop policy if exists public_read_graph_subscriptions on graph_subscriptions;
create policy public_read_graph_subscriptions
on graph_subscriptions
for select
to anon, authenticated
using (true);

drop policy if exists public_read_graph_service_plans on graph_service_plans;
create policy public_read_graph_service_plans
on graph_service_plans
for select
to anon, authenticated
using (true);

create index if not exists feature_match_rules_feature_id_idx
  on feature_match_rules (feature_id);

create index if not exists feature_definitions_frontend_sort_idx
  on feature_definitions (is_frontend_visible, is_enabled, sort_order);

create index if not exists license_templates_enabled_sort_idx
  on license_templates (is_enabled, sort_order);

create index if not exists license_template_features_template_id_idx
  on license_template_features (template_id);

create index if not exists license_template_features_feature_id_idx
  on license_template_features (feature_id);

create index if not exists service_plan_policies_sku_id_idx
  on service_plan_policies (sku_id);

create index if not exists graph_service_plans_sku_id_idx
  on graph_service_plans (sku_id);

create index if not exists provision_records_admin_id_idx
  on provision_records (admin_id);

create index if not exists provision_records_created_at_idx
  on provision_records (created_at desc);

drop trigger if exists set_admins_updated_at on admins;
create trigger set_admins_updated_at
before update on admins
for each row execute function set_updated_at();

drop trigger if exists set_feature_definitions_updated_at on feature_definitions;
create trigger set_feature_definitions_updated_at
before update on feature_definitions
for each row execute function set_updated_at();

drop trigger if exists set_feature_match_rules_updated_at on feature_match_rules;
create trigger set_feature_match_rules_updated_at
before update on feature_match_rules
for each row execute function set_updated_at();

drop trigger if exists set_license_templates_updated_at on license_templates;
create trigger set_license_templates_updated_at
before update on license_templates
for each row execute function set_updated_at();

drop trigger if exists set_subscription_policies_updated_at on subscription_policies;
create trigger set_subscription_policies_updated_at
before update on subscription_policies
for each row execute function set_updated_at();

drop trigger if exists set_service_plan_policies_updated_at on service_plan_policies;
create trigger set_service_plan_policies_updated_at
before update on service_plan_policies
for each row execute function set_updated_at();

drop trigger if exists set_graph_sync_jobs_updated_at on graph_sync_jobs;
drop trigger if exists set_provision_records_updated_at on provision_records;
drop trigger if exists set_audit_logs_updated_at on audit_logs;
