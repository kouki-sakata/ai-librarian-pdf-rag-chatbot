"""Lightweight Supabase client factory used by storage/history layers.

The client is created lazily to avoid import-time failures when credentials
are missing during tests. We keep a single global instance because the
supabase-py client already manages connection pooling for HTTP requests.
"""

from __future__ import annotations

from functools import lru_cache
from typing import TYPE_CHECKING

from app.core.config import settings

if TYPE_CHECKING:
    from supabase import Client


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    try:
        from supabase import create_client
    except ImportError as exc:  # pragma: no cover - guarded by dependency
        raise RuntimeError("supabase package is not installed") from exc

    url = settings.effective_supabase_url
    service_role_key = settings.effective_supabase_service_role_key
    if not url or not service_role_key:
        raise RuntimeError("Supabase credentials are not configured")
    return create_client(url, service_role_key)
