-- Enable pgvector extension
create extension if not exists vector;

-- 1. Documents Table
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  filename text not null,
  storage_path text not null,
  file_size bigint,
  content_type text,
  created_at timestamptz default now()
);

alter table documents enable row level security;

create policy "Tenant Isolation for Documents"
on documents
for all
using (tenant_id = coalesce(current_setting('app.tenant_id', true), (auth.jwt() -> 'app_metadata' ->> 'tenant_id')));

-- 2. Ingest Jobs Table
create table if not exists ingest_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  document_id uuid references documents(id) on delete cascade,
  status text not null default 'pending', -- pending, processing, completed, failed
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table ingest_jobs enable row level security;

create policy "Tenant Isolation for Ingest Jobs"
on ingest_jobs
for all
using (tenant_id = coalesce(current_setting('app.tenant_id', true), (auth.jwt() -> 'app_metadata' ->> 'tenant_id')));

-- 3. Vectors Table
create table if not exists vectors (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  doc_id uuid references documents(id) on delete cascade,
  chunk_hash text not null,
  content text not null,
  metadata jsonb,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  created_at timestamptz default now(),
  unique(tenant_id, doc_id, chunk_hash)
);

alter table vectors enable row level security;

create policy "Tenant Isolation for Vectors"
on vectors
for all
using (tenant_id = coalesce(current_setting('app.tenant_id', true), (auth.jwt() -> 'app_metadata' ->> 'tenant_id')));

-- Index for vector search
create index on vectors using hnsw (embedding vector_cosine_ops);

-- 4. Chat Sessions Table
create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  created_at timestamptz default now()
);

alter table chat_sessions enable row level security;

create policy "Tenant Isolation for Chat Sessions"
on chat_sessions
for all
using (tenant_id = coalesce(current_setting('app.tenant_id', true), (auth.jwt() -> 'app_metadata' ->> 'tenant_id')));

-- 5. Chat Messages Table
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  session_id uuid references chat_sessions(id) on delete cascade,
  role text not null, -- user, assistant
  content text not null,
  created_at timestamptz default now()
);

alter table chat_messages enable row level security;

create policy "Tenant Isolation for Chat Messages"
on chat_messages
for all
using (tenant_id = coalesce(current_setting('app.tenant_id', true), (auth.jwt() -> 'app_metadata' ->> 'tenant_id')));

-- 6. Storage Objects Policy (Example for Supabase Storage)
-- Note: This usually goes into storage.objects table which is managed by Supabase Storage API.
-- We assume a bucket named 'docs' exists.
--
-- create policy "Tenant Isolation for Storage"
-- on storage.objects
-- for all
-- using ( bucket_id = 'docs' and (storage.foldername(name))[1] = current_setting('app.tenant_id', true) );
