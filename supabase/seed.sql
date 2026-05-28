insert into feature_definitions (
  key,
  name,
  description,
  is_enabled,
  is_frontend_visible,
  is_default_selected,
  sort_order
)
values
  ('exchange_online', 'Exchange Online', 'Mailbox and Outlook services', true, true, true, 10),
  ('microsoft_teams', 'Microsoft Teams', 'Chat, meetings, and calling', true, true, true, 20),
  ('sharepoint_online', 'SharePoint Online', 'Sites, files, and collaboration', true, true, false, 30)
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description,
  is_enabled = excluded.is_enabled,
  is_frontend_visible = excluded.is_frontend_visible,
  is_default_selected = excluded.is_default_selected,
  sort_order = excluded.sort_order;

with feature_rows as (
  select id, key
  from feature_definitions
  where key in ('exchange_online', 'microsoft_teams', 'sharepoint_online')
)
insert into feature_match_rules (
  feature_id,
  match_type,
  match_value
)
select feature_rows.id, 'servicePlanName', seed.match_value
from (
  values
    ('exchange_online', 'EXCHANGE_S_ENTERPRISE'),
    ('microsoft_teams', 'TEAMS1'),
    ('sharepoint_online', 'SHAREPOINTENTERPRISE')
) as seed(feature_key, match_value)
join feature_rows on feature_rows.key = seed.feature_key
on conflict (feature_id, match_type, match_value) do nothing;

insert into license_templates (
  key,
  name,
  description,
  is_enabled,
  sort_order
)
values
  ('mail_only', 'Mail Only', 'Exchange Online only', true, 10),
  ('collaboration', 'Collaboration', 'Mail, Teams, and SharePoint', true, 20)
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description,
  is_enabled = excluded.is_enabled,
  sort_order = excluded.sort_order;

with template_rows as (
  select id, key
  from license_templates
  where key in ('mail_only', 'collaboration')
),
feature_rows as (
  select id, key
  from feature_definitions
  where key in ('exchange_online', 'microsoft_teams', 'sharepoint_online')
),
seed(template_key, feature_key) as (
  values
    ('mail_only', 'exchange_online'),
    ('collaboration', 'exchange_online'),
    ('collaboration', 'microsoft_teams'),
    ('collaboration', 'sharepoint_online')
)
insert into license_template_features (
  template_id,
  feature_id
)
select template_rows.id, feature_rows.id
from seed
join template_rows on template_rows.key = seed.template_key
join feature_rows on feature_rows.key = seed.feature_key
on conflict (template_id, feature_id) do nothing;

-- Subscription and service-plan policies are intended to be curated
-- after the first Graph sync because tenant-specific SKU identifiers vary.
