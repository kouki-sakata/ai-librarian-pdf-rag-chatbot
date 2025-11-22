import logging
import time
from contextlib import contextmanager
from typing import Generator

from opentelemetry import metrics, trace
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider

# Setup Logger
logger = logging.getLogger(__name__)

# Initialize OpenTelemetry
resource = Resource.create({"service.name": "ai-librarian-rag"})

# Trace Provider
trace.set_tracer_provider(TracerProvider(resource=resource))
tracer = trace.get_tracer(__name__)

# Meter Provider
metrics.set_meter_provider(MeterProvider(resource=resource))
meter = metrics.get_meter(__name__)

# Metrics Definitions
ingestion_duration_histogram = meter.create_histogram(
    name="ingestion_duration_seconds",
    description="Time taken to process and ingest a document",
    unit="s",
)

chat_latency_histogram = meter.create_histogram(
    name="chat_latency_seconds",
    description="Time taken to generate a chat response",
    unit="s",
)

embedding_token_counter = meter.create_counter(
    name="embedding_token_count",
    description="Total number of tokens embedded",
    unit="1",
)


@contextmanager
def measure_latency(
    histogram: metrics.Histogram,
    attributes: dict = None,
    threshold_seconds: float = None,
) -> Generator[None, None, None]:
    """
    Context manager to measure execution time and record it to a histogram.
    Also logs a warning if execution time exceeds threshold.
    """
    start_time = time.perf_counter()
    try:
        yield
    finally:
        duration = time.perf_counter() - start_time
        histogram.record(duration, attributes or {})

        if threshold_seconds and duration > threshold_seconds:
            logger.error(
                f"Performance Alert: Operation took {duration:.2f}s, exceeding threshold of {threshold_seconds}s. Attributes: {attributes}"
            )
