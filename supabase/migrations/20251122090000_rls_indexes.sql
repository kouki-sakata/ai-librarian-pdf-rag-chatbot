-- RLS/Schema hardening for tenant-scoped data

-- Add status tracking to documents if missing
alter table if exists documents
    add column if not exists status text default 'processed',
    add column if not exists status_reason text;

-- Add processing step to ingest_jobs
alter table if exists ingest_jobs
    add column if not exists step text default 'parsed';

-- Helpful indexes for tenant-scoped queries
create index if not exists idx_documents_tenant_created
    on documents (tenant_id, created_at desc);

create index if not exists idx_ingest_jobs_tenant_updated
    on ingest_jobs (tenant_id, updated_at desc);

create index if not exists idx_vectors_tenant_doc
    on vectors (tenant_id, doc_id);

create index if not exists idx_vectors_tenant_chunk_hash
    on vectors (tenant_id, chunk_hash);

-- Guard rails: ensure app.tenant_id is present for RLS evaluations when not using JWT
comment on table documents is 'RLS expects app.tenant_id to be set via set_config in the DB session';
comment on table ingest_jobs is 'RLS expects app.tenant_id to be set via set_config in the DB session';
comment on table vectors is 'RLS expects app.tenant_id to be set via set_config in the DB session';
comment on table chat_sessions is 'RLS expects app.tenant_id to be set via set_config in the DB session';
comment on table chat_messages is 'RLS expects app.tenant_id to be set via set_config in the DB session';
