from app.core.config import settings
from app.core.context import tenant_id_context
from app.core.security import verify_jwt
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Skip auth for health check and docs
        if request.url.path in [
            f"{settings.API_V1_STR}/health",
            f"{settings.API_V1_STR}/health/",
            "/docs",
            "/openapi.json",
            "/redoc",
        ]:
            return await call_next(request)

        # Allow OPTIONS requests for CORS preflight (handled by CORSMiddleware usually, but good to be safe)
        if request.method == "OPTIONS":
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing or invalid authentication credentials"},
            )

        token = auth_header.split(" ")[1]
        try:
            payload = await verify_jwt(token)

            # Extract tenant_id
            # Design says: tenant_id is a required custom claim `tenant_id`
            # If not present, 401.
            # Also check `app_metadata` if Supabase puts it there.
            # Usually custom claims are in `app_metadata` or at top level depending on how they are set.
            # I will check top level first, then app_metadata.

            tenant_id = payload.get("tenant_id")
            if not tenant_id:
                app_metadata = payload.get("app_metadata", {})
                tenant_id = app_metadata.get("tenant_id")

            if not tenant_id:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Missing tenant_id in token claims"},
                )

            # Set tenant_id in context
            token_ctx = tenant_id_context.set(tenant_id)

            # Process request
            try:
                response = await call_next(request)
                return response
            finally:
                # Reset context after request
                tenant_id_context.reset(token_ctx)

        except Exception as e:
            # verify_jwt raises HTTPException, but middleware catches generic Exceptions
            # We need to return a proper JSONResponse
            status_code = 401
            detail = str(e)
            if hasattr(e, "status_code"):
                status_code = e.status_code
            if hasattr(e, "detail"):
                detail = e.detail

            return JSONResponse(status_code=status_code, content={"detail": detail})
