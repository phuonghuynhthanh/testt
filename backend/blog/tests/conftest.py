import pytest

from apps.core.rate_limit import limiter


# Keep request counters isolated between existing and rate-limit tests.
@pytest.fixture(autouse=True)
def reset_rate_limits():
    limiter.reset()
    yield
    limiter.reset()
