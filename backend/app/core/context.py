from contextvars import ContextVar

# Context variable to hold the tenant ID for the current request
tenant_id_context: ContextVar[str | None] = ContextVar("tenant_id", default=None)
