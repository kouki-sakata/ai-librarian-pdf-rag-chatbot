-- Performance optimization: Add indexes for chat tables
-- This improves query performance for tenant-scoped and session-scoped queries

-- chat_sessions indexes
create index if not exists idx_chat_sessions_tenant_created
    on chat_sessions (tenant_id, created_at desc);

-- chat_messages indexes
create index if not exists idx_chat_messages_session_created
    on chat_messages (session_id, created_at desc);

create index if not exists idx_chat_messages_tenant_created
    on chat_messages (tenant_id, created_at desc);
