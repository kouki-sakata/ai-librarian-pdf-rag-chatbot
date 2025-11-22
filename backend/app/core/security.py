import time
from typing import Any, cast

import httpx
from fastapi import HTTPException, status
from jose import jwt

from app.core.config import settings

# Cache for JWKS
jwks_cache: dict[str, Any] = {}
JWKS_CACHE_TTL = 600  # 10 minutes


async def get_jwks() -> dict[str, Any]:
    """
    Fetch JWKS from Supabase with caching.
    """
    global jwks_cache
    current_time = time.time()

    if (
        "keys" in jwks_cache
        and "timestamp" in jwks_cache
        and current_time - jwks_cache["timestamp"] < JWKS_CACHE_TTL
    ):
        return cast(dict[str, Any], jwks_cache["keys"])

    jwks_url = f"https://{settings.SUPABASE_PROJECT_REF}.supabase.co/auth/v1/jwks"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(jwks_url)
            response.raise_for_status()
            keys: dict[str, Any] = response.json()
            jwks_cache = {"keys": keys, "timestamp": current_time}
            return keys
    except Exception as e:
        print(f"Failed to fetch JWKS: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not verify authentication configuration",
        )


async def verify_jwt(token: str) -> dict[str, Any]:
    """
    Verify the JWT token using Supabase JWKS.
    """
    try:
        # Get the header to find the key ID (kid) or algorithm
        header = jwt.get_unverified_header(token)
        alg = header.get("alg")

        if alg == "HS256" and settings.SUPABASE_JWT_SECRET:
            # Test/Dev mode using shared secret
            payload: dict[str, Any] = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
                options={
                    "verify_aud": False,  # Audience might vary in test tokens
                    "verify_iss": False,  # Issuer might vary
                    "verify_exp": True,
                    "verify_nbf": True,
                    "leeway": 120,
                },
            )
            return payload

        kid = header.get("kid")
        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token header",
                headers={"WWW-Authenticate": "Bearer"},
            )

        jwks = await get_jwks()
        rsa_key = {}
        for key in jwks.get("keys", []):
            if key["kid"] == kid:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"],
                }
                break

        if not rsa_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to find appropriate key",
                headers={"WWW-Authenticate": "Bearer"},
            )

        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience="authenticated",  # Default audience for Supabase Auth
            issuer=f"https://{settings.SUPABASE_PROJECT_REF}.supabase.co/auth/v1",
            options={
                "verify_aud": True,
                "verify_iss": True,
                "verify_exp": True,
                "verify_nbf": True,
                "leeway": 120,
            },  # 2 minutes leeway
        )
        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.JWTClaimsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect claims, please check the audience and issuer",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        # Distinguish between auth failure and other errors if possible, but 401 is generally safe for auth issues
        print(f"Auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
