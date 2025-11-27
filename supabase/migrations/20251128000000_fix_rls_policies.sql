-- Update RLS policies to fallback to auth.uid() when app.tenant_id and metadata tenant_id are missing

-- 1. Documents Table
drop policy if exists "Tenant Isolation for Documents" on documents;
create policy "Tenant Isolation for Documents"
on documents
for all
using (tenant_id = coalesce(
    current_setting('app.tenant_id', true),
    (auth.jwt() -> 'app_metadata' ->> 'tenant_id'),
    auth.uid()::text
));

-- 2. Ingest Jobs Table
drop policy if exists "Tenant Isolation for Ingest Jobs" on ingest_jobs;
create policy "Tenant Isolation for Ingest Jobs"
on ingest_jobs
for all
using (tenant_id = coalesce(
    current_setting('app.tenant_id', true),
    (auth.jwt() -> 'app_metadata' ->> 'tenant_id'),
    auth.uid()::text
));

-- 3. Vectors Table
drop policy if exists "Tenant Isolation for Vectors" on vectors;
create policy "Tenant Isolation for Vectors"
on vectors
for all
using (tenant_id = coalesce(
    current_setting('app.tenant_id', true),
    (auth.jwt() -> 'app_metadata' ->> 'tenant_id'),
    auth.uid()::text
));

-- 4. Chat Sessions Table
drop policy if exists "Tenant Isolation for Chat Sessions" on chat_sessions;
create policy "Tenant Isolation for Chat Sessions"
on chat_sessions
for all
using (tenant_id = coalesce(
    current_setting('app.tenant_id', true),
    (auth.jwt() -> 'app_metadata' ->> 'tenant_id'),
    auth.uid()::text
));

-- 5. Chat Messages Table
drop policy if exists "Tenant Isolation for Chat Messages" on chat_messages;
create policy "Tenant Isolation for Chat Messages"
on chat_messages
for all
using (tenant_id = coalesce(
    current_setting('app.tenant_id', true),
    (auth.jwt() -> 'app_metadata' ->> 'tenant_id'),
    auth.uid()::text
));
