import json
import logging
import re
import sys


class JsonFormatter(logging.Formatter):
    """
    Formatter that outputs JSON strings after masking sensitive data.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.sensitive_patterns = [
            (r"(sk-[a-zA-Z0-9]{20,})", "***MASKED_API_KEY***"),
            (r"(ey[a-zA-Z0-9._-]{20,})", "***MASKED_JWT***"),
            (r"(Bearer\s+)[a-zA-Z0-9._-]+", r"\1***MASKED_TOKEN***"),
        ]

    def mask_sensitive_data(self, message: str) -> str:
        for pattern, replacement in self.sensitive_patterns:
            message = re.sub(pattern, replacement, message)
        return message

    def format(self, record: logging.LogRecord) -> str:
        log_record = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "funcName": record.funcName,
            "lineno": record.lineno,
        }

        # Handle exception info
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)

        # Mask sensitive data in message
        log_record["message"] = self.mask_sensitive_data(log_record["message"])

        return json.dumps(log_record)


def setup_logger(name: str = "app", level: int = logging.INFO) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(level)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = JsonFormatter()
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger


logger = setup_logger()
