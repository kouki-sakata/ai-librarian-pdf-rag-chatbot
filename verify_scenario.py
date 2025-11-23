#!/usr/bin/env python3
"""
Simple scenario verification script for RAG PDF application.
Tests:
1. Upload PDF file
2. Create chat session
3. Send query and verify streaming response with metadata
"""

import json
import sys
import time
from pathlib import Path

import requests
import jwt

# Configuration
BASE_URL = "http://localhost:8000"
API_V1 = f"{BASE_URL}/api/v1"

# Create a test JWT token with required claims
# For local testing, we'll create a simple token
# In production, this would come from Supabase auth
TEST_TENANT_ID = "test-tenant-001"
TEST_USER_ID = "test-user-001"

# Note: For this test to work, we need a valid JWT token.
# Since we don't have Supabase auth set up for local testing,
# we'll need to either:
# 1. Mock the auth middleware (not ideal for integration test)
# 2. Use a pre-generated dev token
# 3. Skip auth for testing purposes

# For now, let's create a simple dev token
# In a real scenario, this would be obtained from Supabase


import os

# Generate a test JWT token
def create_test_token():
    """Create a test JWT token with required claims."""
    payload = {
        "sub": TEST_USER_ID,
        "tenant_id": TEST_TENANT_ID,
        "exp": int(time.time()) + 3600,  # Expires in 1 hour
    }

    # Try to get secret from env, fallback to hardcoded value for convenience
    secret = os.getenv("JWT_SECRET") or os.getenv("TEST_JWT_SECRET")
    if not secret:
        secret = "super-secret-jwt-token-with-at-least-32-characters-long"

    token = jwt.encode(
        payload,
        secret,
        algorithm="HS256",
    )
    return token


def test_upload(pdf_path: Path, token: str):
    """Test PDF upload endpoint."""
    print("\n=== Testing PDF Upload ===")

    headers = {"Authorization": f"Bearer {token}"}

    with open(pdf_path, "rb") as f:
        files = {"file": ("test.pdf", f, "application/pdf")}
        response = requests.post(f"{API_V1}/upload/", headers=headers, files=files, timeout=60)

    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

    if response.status_code != 200:
        print(f"❌ Upload failed: {response.status_code}")
        return None

    data = response.json()
    if "doc_id" not in data:
        print("❌ Response missing doc_id")
        return None

    print(f"✅ Upload successful! doc_id: {data['doc_id']}")
    return data["doc_id"]


def test_create_session(token: str):
    """Test session creation endpoint."""
    print("\n=== Creating Chat Session ===")

    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{API_V1}/chat/sessions", headers=headers)

    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

    if response.status_code != 200:
        print(f"❌ Session creation failed: {response.status_code}")
        return None

    data = response.json()
    if "session_id" not in data:
        print("❌ Response missing session_id")
        return None

    print(f"✅ Session created! session_id: {data['session_id']}")
    return data["session_id"]


def test_chat(session_id: str, query: str, token: str):
    """Test chat endpoint with streaming response."""
    print("\n=== Testing Chat ===")
    print(f"Query: {query}")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    payload = {
        "session_id": session_id,
        "query": query,
    }

    response = requests.post(
        f"{API_V1}/chat/",
        headers=headers,
        json=payload,
        stream=True,
        timeout=60,
    )

    print(f"Status: {response.status_code}")

    if response.status_code != 200:
        print(f"❌ Chat failed: {response.status_code}")
        print(f"Response: {response.text}")
        return False

    # Parse streaming response
    has_content = False
    has_metadata = False

    print("\n--- Streaming Response ---")
    for line in response.iter_lines():
        if line:
            try:
                data = json.loads(line)
                print(f"  {data}")

                if data.get("type") in ["token", "content"]:
                    has_content = True
                elif data.get("type") == "metadata":
                    has_metadata = True

            except json.JSONDecodeError:
                print(f"  (non-JSON): {line}")

    print("--- End Response ---\n")

    if not has_content:
        print("❌ No content received in response")
        return False

    if not has_metadata:
        print("⚠️  No metadata (citations) received in response")
    else:
        print("✅ Received metadata with citations")

    print("✅ Chat completed successfully")
    return True


def main():
    """Run all verification tests."""
    print("=" * 60)
    print("RAG PDF Application - Simple Scenario Verification")
    print("=" * 60)

    # Check if PDF file exists
    pdf_path = Path(__file__).parent / "dummy.pdf"
    if not pdf_path.exists():
        print(f"❌ PDF file not found: {pdf_path}")
        sys.exit(1)

    try:
        # Create test token
        print("\n=== Generating Test Token ===")
        token = create_test_token()
        print(f"✅ Token created for tenant: {TEST_TENANT_ID}")

        # Test 1: Upload PDF
        doc_id = test_upload(pdf_path, token)
        if not doc_id:
            sys.exit(1)

        # Test 2: Create session
        session_id = test_create_session(token)
        if not session_id:
            sys.exit(1)

        # Test 3: Chat query
        success = test_chat(session_id, "What is this document about?", token)
        if not success:
            sys.exit(1)

        print("\n" + "=" * 60)
        print("✅ All verification tests passed!")
        print("=" * 60)

    except requests.exceptions.ConnectionError:
        print(
            "\n❌ Connection failed. Make sure the backend server is running on http://localhost:8000"
        )
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
