import logging
import time
from collections.abc import Generator
from contextlib import contextmanager

from opentelemetry import metrics, trace
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from prometheus_client import start_http_server

from app.core.config import settings

# Setup Logger
logger = logging.getLogger(__name__)

# Initialize OpenTelemetry
resource = Resource.create({"service.name": "ai-librarian-rag"})

# Trace Provider
trace.set_tracer_provider(TracerProvider(resource=resource))
tracer = trace.get_tracer(__name__)

# Meter Provider with Prometheus Exporter
# Start Prometheus client
start_http_server(port=9464, addr="0.0.0.0")
reader = PrometheusMetricReader()
provider = MeterProvider(resource=resource, metric_readers=[reader])
metrics.set_meter_provider(provider)
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

        # Use default threshold from settings if not provided
        limit = threshold_seconds or settings.CHAT_LATENCY_THRESHOLD_SECONDS
        # For ingestion, we might want a different default, but this function is generic.
        # Ideally, caller passes specific threshold.

        if limit and duration > limit:
            logger.error(
                f"Performance Alert: Operation took {duration:.2f}s, exceeding threshold of {limit}s. Attributes: {attributes}"
            )
