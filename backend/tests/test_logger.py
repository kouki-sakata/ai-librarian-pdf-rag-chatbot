import json
import logging

from app.core.logger import JsonFormatter


def test_mask_api_key():
    formatter = JsonFormatter()
    message = "Using API key sk-1234567890abcdef1234567890abcdef"
    masked = formatter.mask_sensitive_data(message)
    assert "***MASKED_API_KEY***" in masked
    assert "sk-12345" not in masked


def test_mask_jwt():
    formatter = JsonFormatter()
    message = "Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    masked = formatter.mask_sensitive_data(message)
    assert "***MASKED_JWT***" in masked
    assert "eyJhbGci" not in masked


def test_mask_bearer_token():
    formatter = JsonFormatter()
    message = "Authorization: Bearer some-secret-token-value"
    masked = formatter.mask_sensitive_data(message)
    assert "Bearer ***MASKED_TOKEN***" in masked
    assert "some-secret-token-value" not in masked


def test_json_format():
    formatter = JsonFormatter()
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="Hello world",
        args=(),
        exc_info=None,
    )
    formatted = formatter.format(record)
    data = json.loads(formatted)
    assert data["message"] == "Hello world"
    assert data["level"] == "INFO"
