"""
============================================================================
OBSERVABILITY MODULE - Prometheus + OpenTelemetry Instrumentation
============================================================================
Centralized configuration for metrics (Prometheus) and tracing (Jaeger).
============================================================================
"""

import logging
from typing import Optional, Callable
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from prometheus_fastapi_instrumentator import Instrumentator
from functools import wraps

logger = logging.getLogger(__name__)

# ============================================================================
# CUSTOM METRICS - Business Domain
# ============================================================================

# Patient metrics
PATIENTS_ARRIVING = Counter(
    'hospital_patients_arriving_total',
    'Total number of patients arriving',
    ['hospital_id']
)

PATIENTS_TREATED = Counter(
    'hospital_patients_treated_total',
    'Total number of patients treated',
    ['hospital_id', 'triage_level']
)

PATIENTS_DIVERTED = Counter(
    'hospital_patients_diverted_total',
    'Total number of patients diverted to other hospital',
    ['from_hospital', 'to_hospital', 'reason']
)

# Queue metrics
QUEUE_SIZE = Gauge(
    'hospital_queue_size',
    'Current queue size by area',
    ['hospital_id', 'area']
)

# Wait time metrics
WAIT_TIME = Histogram(
    'hospital_wait_time_seconds',
    'Patient wait time in seconds',
    ['hospital_id', 'area'],
    buckets=[60, 120, 300, 600, 900, 1800, 3600]  # 1m, 2m, 5m, 10m, 15m, 30m, 1h
)

# Staff metrics
STAFF_ASSIGNED = Gauge(
    'hospital_staff_assigned',
    'Number of staff assigned',
    ['hospital_id', 'role', 'area']
)

STAFF_SERGAS_AVAILABLE = Gauge(
    'hospital_sergas_available',
    'Number of SERGAS doctors available'
)

# Saturation metrics
HOSPITAL_SATURATION = Gauge(
    'hospital_saturation_ratio',
    'Hospital saturation ratio (0-1)',
    ['hospital_id']
)

# ML Prediction metrics
PREDICTION_LATENCY = Histogram(
    'ml_prediction_latency_seconds',
    'ML prediction latency in seconds',
    ['model', 'hospital_id'],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

PREDICTION_REQUESTS = Counter(
    'ml_prediction_requests_total',
    'Total ML prediction requests',
    ['model', 'hospital_id', 'status']
)


# ============================================================================
# OPENTELEMETRY TRACING SETUP
# ============================================================================

_tracer = None
_tracer_provider = None


def setup_tracing(
    service_name: str,
    jaeger_endpoint: str = "http://jaeger:4318/v1/traces",
    enabled: bool = True
) -> Optional[any]:
    """
    Configure OpenTelemetry tracing with Jaeger exporter.
    
    Args:
        service_name: Name of the service for tracing
        jaeger_endpoint: Jaeger OTLP HTTP endpoint
        enabled: Whether to enable tracing
        
    Returns:
        Tracer instance or None if disabled
    """
    global _tracer, _tracer_provider
    
    if not enabled:
        logger.info("Tracing disabled")
        return None
    
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.resources import Resource, SERVICE_NAME
        
        # Create resource with service name
        resource = Resource(attributes={
            SERVICE_NAME: service_name
        })
        
        # Create tracer provider
        _tracer_provider = TracerProvider(resource=resource)
        
        # Create OTLP exporter for Jaeger
        otlp_exporter = OTLPSpanExporter(endpoint=jaeger_endpoint)
        
        # Add span processor
        span_processor = BatchSpanProcessor(otlp_exporter)
        _tracer_provider.add_span_processor(span_processor)
        
        # Set global tracer provider
        trace.set_tracer_provider(_tracer_provider)
        
        # Get tracer
        _tracer = trace.get_tracer(service_name)
        
        logger.info(f"✅ Tracing configured for {service_name} -> {jaeger_endpoint}")
        return _tracer
        
    except ImportError as e:
        logger.warning(f"OpenTelemetry not available: {e}")
        return None
    except Exception as e:
        logger.warning(f"Failed to setup tracing: {e}")
        return None


def get_tracer():
    """Get the global tracer instance."""
    return _tracer


def trace_function(name: Optional[str] = None):
    """
    Decorator to trace a function.
    
    Usage:
        @trace_function("my_operation")
        def my_function():
            pass
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if _tracer is None:
                return func(*args, **kwargs)
            
            span_name = name or func.__name__
            with _tracer.start_as_current_span(span_name):
                return func(*args, **kwargs)
        return wrapper
    return decorator


async def trace_async_function(name: Optional[str] = None):
    """
    Async decorator to trace an async function.
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if _tracer is None:
                return await func(*args, **kwargs)
            
            span_name = name or func.__name__
            with _tracer.start_as_current_span(span_name):
                return await func(*args, **kwargs)
        return wrapper
    return decorator


# ============================================================================
# FASTAPI INSTRUMENTATION
# ============================================================================

def setup_fastapi_instrumentation(app, excluded_handlers: list = None):
    """
    Setup Prometheus and OpenTelemetry instrumentation for FastAPI.
    
    Args:
        app: FastAPI application instance
        excluded_handlers: List of endpoint paths to exclude from metrics
    """
    # Prometheus instrumentation
    instrumentator = Instrumentator(
        should_group_status_codes=True,
        should_ignore_untemplated=True,
        should_respect_env_var=True,
        should_instrument_requests_inprogress=True,
        excluded_handlers=excluded_handlers or ["/health", "/metrics"],
        inprogress_name="http_requests_inprogress",
        inprogress_labels=True,
    )
    
    # Add custom metrics
    instrumentator.add(
        request_size_histogram(),
        response_size_histogram(),
    )
    
    # Instrument the app
    instrumentator.instrument(app).expose(app, endpoint="/metrics")
    
    logger.info("✅ Prometheus instrumentation configured")
    
    # OpenTelemetry FastAPI instrumentation
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        FastAPIInstrumentor.instrument_app(app)
        logger.info("✅ OpenTelemetry FastAPI instrumentation configured")
    except ImportError:
        logger.warning("OpenTelemetry FastAPI instrumentation not available")
    except Exception as e:
        logger.warning(f"Failed to setup OpenTelemetry FastAPI instrumentation: {e}")


def request_size_histogram():
    """Custom metric for request size."""
    from prometheus_fastapi_instrumentator.metrics import Info
    
    REQUEST_SIZE = Histogram(
        "http_request_size_bytes",
        "Request size in bytes",
        ["handler"],
        buckets=[100, 500, 1000, 5000, 10000, 50000, 100000]
    )
    
    def instrumentation(info: Info):
        if info.request.headers.get("content-length"):
            size = int(info.request.headers.get("content-length", 0))
            REQUEST_SIZE.labels(handler=info.modified_handler).observe(size)
    
    return instrumentation


def response_size_histogram():
    """Custom metric for response size."""
    from prometheus_fastapi_instrumentator.metrics import Info
    
    RESPONSE_SIZE = Histogram(
        "http_response_size_bytes",
        "Response size in bytes",
        ["handler"],
        buckets=[100, 500, 1000, 5000, 10000, 50000, 100000, 500000]
    )
    
    def instrumentation(info: Info):
        if info.response and hasattr(info.response, "headers"):
            size = int(info.response.headers.get("content-length", 0))
            RESPONSE_SIZE.labels(handler=info.modified_handler).observe(size)
    
    return instrumentation


# ============================================================================
# HTTPX INSTRUMENTATION (for outgoing HTTP calls)
# ============================================================================

def setup_httpx_instrumentation():
    """Setup OpenTelemetry instrumentation for httpx HTTP client."""
    try:
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
        HTTPXClientInstrumentor().instrument()
        logger.info("✅ HTTPX instrumentation configured")
    except ImportError:
        logger.warning("OpenTelemetry HTTPX instrumentation not available")
    except Exception as e:
        logger.warning(f"Failed to setup HTTPX instrumentation: {e}")


# ============================================================================
# SQLALCHEMY INSTRUMENTATION (for database calls)
# ============================================================================

def setup_sqlalchemy_instrumentation(engine):
    """Setup OpenTelemetry instrumentation for SQLAlchemy."""
    try:
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        SQLAlchemyInstrumentor().instrument(engine=engine)
        logger.info("✅ SQLAlchemy instrumentation configured")
    except ImportError:
        logger.warning("OpenTelemetry SQLAlchemy instrumentation not available")
    except Exception as e:
        logger.warning(f"Failed to setup SQLAlchemy instrumentation: {e}")


# ============================================================================
# BUSINESS METRIC HELPERS
# ============================================================================

def record_patient_arrival(hospital_id: str):
    """Record a patient arrival."""
    PATIENTS_ARRIVING.labels(hospital_id=hospital_id).inc()


def record_patient_treated(hospital_id: str, triage_level: str):
    """Record a patient treated."""
    PATIENTS_TREATED.labels(hospital_id=hospital_id, triage_level=triage_level).inc()


def record_patient_diverted(from_hospital: str, to_hospital: str, reason: str):
    """Record a patient diversion."""
    PATIENTS_DIVERTED.labels(
        from_hospital=from_hospital,
        to_hospital=to_hospital,
        reason=reason
    ).inc()


def update_queue_size(hospital_id: str, area: str, size: int):
    """Update queue size metric."""
    QUEUE_SIZE.labels(hospital_id=hospital_id, area=area).set(size)


def record_wait_time(hospital_id: str, area: str, seconds: float):
    """Record patient wait time."""
    WAIT_TIME.labels(hospital_id=hospital_id, area=area).observe(seconds)


def update_staff_assigned(hospital_id: str, role: str, area: str, count: int):
    """Update staff assigned metric."""
    STAFF_ASSIGNED.labels(hospital_id=hospital_id, role=role, area=area).set(count)


def update_sergas_available(count: int):
    """Update SERGAS doctors available metric."""
    STAFF_SERGAS_AVAILABLE.set(count)


def update_saturation(hospital_id: str, ratio: float):
    """Update hospital saturation metric."""
    HOSPITAL_SATURATION.labels(hospital_id=hospital_id).set(ratio)


def record_prediction(model: str, hospital_id: str, latency: float, success: bool = True):
    """Record ML prediction metrics."""
    PREDICTION_LATENCY.labels(model=model, hospital_id=hospital_id).observe(latency)
    status = "success" if success else "error"
    PREDICTION_REQUESTS.labels(model=model, hospital_id=hospital_id, status=status).inc()
