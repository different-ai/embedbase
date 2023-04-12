"""Tests for hello function."""
import pytest

def hello(name: str) -> str:
    """Return a greeting with a given name."""
    return f"Hello {name}!"

@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("Jeanette", "Hello Jeanette!"),
        ("Raven", "Hello Raven!"),
        ("Maxine", "Hello Maxine!"),
        ("Matteo", "Hello Matteo!"),
        ("Destinee", "Hello Destinee!"),
        ("Alden", "Hello Alden!"),
        ("Mariah", "Hello Mariah!"),
        ("Anika", "Hello Anika!"),
        ("Isabella", "Hello Isabella!"),
    ],
)
def test_hello(name, expected):
    """Example test with parametrization."""
    assert hello(name) == expected
