from __future__ import annotations

import asyncio

import psycopg

from app.core.config import settings
from app.core.logger import logger


def _create_tables(cur: psycopg.Cursor) -> None:
    # extensions
    cur.execute("create extension if not exists vector;")

    # base tables
    cur.execute(
        """
        create table if not exists documents (
          id uuid primary key default gen_random_uuid(),
          tenant_id text not null,
          filename text not null,
          storage_path text not null,
          file_size bigint,
          content_type text,
          created_at timestamptz default now()
        );
        """
    )
    cur.execute(
        """
        create table if not exists ingest_jobs (
          id uuid primary key default gen_random_uuid(),
          tenant_id text not null,
          document_id uuid references documents(id) on delete cascade,
          status text not null default 'pending',
          error_message text,
          created_at timestamptz default now(),
          updated_at timestamptz default now()
        );
        """
    )
    cur.execute(
        """
        create table if not exists vectors (
          id uuid primary key default gen_random_uuid(),
          tenant_id text not null,
          doc_id uuid references documents(id) on delete cascade,
          chunk_hash text not null,
          content text not null,
          metadata jsonb,
          embedding vector(1536),
          created_at timestamptz default now(),
          unique(tenant_id, doc_id, chunk_hash)
        );
        """
    )
    cur.execute(
        """
        create table if not exists chat_sessions (
          id uuid primary key default gen_random_uuid(),
          tenant_id text not null,
          created_at timestamptz default now()
        );
        """
    )
    cur.execute(
        """
        create table if not exists chat_messages (
          id uuid primary key default gen_random_uuid(),
          tenant_id text not null,
          session_id uuid references chat_sessions(id) on delete cascade,
          role text not null,
          content text not null,
          created_at timestamptz default now()
        );
        """
    )


def _ensure_rls(cur: psycopg.Cursor) -> None:
    # enable RLS
    cur.execute("alter table documents enable row level security;")
    cur.execute("alter table ingest_jobs enable row level security;")
    cur.execute("alter table vectors enable row level security;")
    cur.execute("alter table chat_sessions enable row level security;")
    cur.execute("alter table chat_messages enable row level security;")

    # policies with fallback to app.tenant_id -> metadata tenant_id -> auth.uid()
    policy_sql = """
    do $$
    begin
      if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = %(table)s and policyname = %(policy)s
      ) then
        execute format(
          'create policy %I on %I for all using (tenant_id = coalesce(
              current_setting(''app.tenant_id'', true),
              (auth.jwt() -> ''app_metadata'' ->> ''tenant_id''),
              auth.uid()::text
          ));',
          %(policy)s, %(table)s
        );
      end if;
    end $$;
    """
    for table in ("documents", "ingest_jobs", "vectors", "chat_sessions", "chat_messages"):
        cur.execute(
            policy_sql,
            {
                "table": table,
                "policy": "Tenant Isolation for " + table.replace("_", " ").title(),
            },
        )


def _ensure_indexes(cur: psycopg.Cursor) -> None:
    cur.execute(
        "create index if not exists vectors_embedding_hnsw on vectors using hnsw (embedding vector_cosine_ops);"
    )


def _reload_postgrest(cur: psycopg.Cursor) -> None:
    cur.execute("notify pgrst, 'reload schema';")
    cur.execute("notify pgrst, 'reload config';")


async def ensure_base_schema() -> None:
    """
    Ensure that core Supabase tables exist so Supabase REST (PostgREST) can see them.
    This is a defensive guard for environments where migrations were not applied.
    """
    db_url = settings.effective_supabase_db_url
    if not db_url:
        logger.warning("Supabase DB URL is not configured; schema bootstrap skipped")
        return

    def _bootstrap() -> None:
        with psycopg.connect(db_url, autocommit=True) as conn:
            with conn.cursor() as cur:
                _create_tables(cur)
                _ensure_rls(cur)
                _ensure_indexes(cur)
                _reload_postgrest(cur)

    try:
        await asyncio.to_thread(_bootstrap)
        logger.info("Supabase schema bootstrap completed (tables + RLS + cache reload)")
    except Exception:
        logger.exception("Failed to bootstrap Supabase schema; upload may still fail")
