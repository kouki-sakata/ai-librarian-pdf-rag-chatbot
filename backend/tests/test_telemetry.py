from unittest.mock import MagicMock, patch

from app.core.telemetry import measure_latency


def test_measure_latency_records_metric():
    mock_histogram = MagicMock()

    with measure_latency(mock_histogram, {"test": "attr"}):
        pass

    mock_histogram.record.assert_called_once()
    args, _ = mock_histogram.record.call_args
    assert args[0] > 0  # Duration should be positive
    assert args[1] == {"test": "attr"}


def test_measure_latency_logs_warning_on_threshold_exceeded():
    mock_histogram = MagicMock()

    with patch("app.core.telemetry.logger") as mock_logger:
        with measure_latency(mock_histogram, threshold_seconds=0.0001):
            import time

            time.sleep(0.001)

        mock_logger.error.assert_called_once()
        assert "Performance Alert" in mock_logger.error.call_args[0][0]
