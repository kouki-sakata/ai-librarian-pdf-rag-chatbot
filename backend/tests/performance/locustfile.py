import os
import time

from jose import jwt
from locust import HttpUser, between, task

# Secret for signing test tokens (must match backend env var)
JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "test-secret")
TENANT_ID = "tenant_load_test"


def generate_token(user_id="user_load_test"):
    payload = {
        "sub": user_id,
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
        "app_metadata": {"tenant_id": TENANT_ID},
        "user_metadata": {},
        "role": "authenticated",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


class RAGUser(HttpUser):
    wait_time = between(1, 5)
    token = None

    def on_start(self):
        self.token = generate_token()
        self.client.headers.update({"Authorization": f"Bearer {self.token}"})

    @task(1)
    def upload_document(self):
        # Simulate PDF upload
        # We need a dummy PDF file.
        # For load testing, we can upload a small dummy PDF.
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 <<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Times-Roman\n>>\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 24 Tf\n100 100 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000276 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n370\n%%EOF"

        files = {"file": ("load_test.pdf", pdf_content, "application/pdf")}
        with self.client.post(
            "/api/v1/upload/", files=files, catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(
                    f"Upload failed: {response.status_code} {response.text}"
                )

    @task(3)
    def chat(self):
        # Simulate chat request
        session_id = "session_load_test"

        payload = {
            "session_id": session_id,
            "query": "What is the summary?",
        }

        # The backend /chat endpoint returns a StreamingResponse
        with self.client.post(
            "/api/v1/chat",
            json=payload,
            stream=True,
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                # Consume stream to measure full latency
                for _ in response.iter_content(chunk_size=1024):
                    pass
                response.success()
            else:
                response.failure(f"Chat failed: {response.status_code} {response.text}")
