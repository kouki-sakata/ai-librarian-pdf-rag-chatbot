from contextvars import ContextVar
from typing import Optional

# Context variable to hold the tenant ID for the current request
tenant_id_context: ContextVar[Optional[str]] = ContextVar("tenant_id", default=None)
