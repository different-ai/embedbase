import pytest
from embedbase_client.errors import EmbedbaseAPIException


def test_exception_show_nicely_when_printed():
    exception = EmbedbaseAPIException("This is an error message")
    assert str(exception) == "This is an error message"
