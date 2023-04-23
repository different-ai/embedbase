import pytest

from embedbase_client.split import merge, split_text


@pytest.mark.parametrize(
    ("texts", "expected", "max_tokens", "chunk_overlap"),
    [
        ("Hello world!", ["Hello world!"], 10, 0),
        # a longer sentence
        (
            "The lion is the king of the jungle.",
            ["The lion is the king of the jungle."],
            10,
            0,
        ),
        # a very long sentence
        (
            "The unicorn is a fantasy animal that possess a long horn on its forehead. "
            "It is a symbol of purity and grace. It is also a"
            " symbol of power and strength.",
            [
                "The unicorn is a fantasy animal that possess a long",
                " horn on its forehead. It is a symbol of",
                " purity and grace. It is also a symbol of",
                " power and strength.",
            ],
            10,
            0,
        ),
    ],
)
# pylint: disable=missing-function-docstring
def test_split_text(texts, expected, max_tokens, chunk_overlap):
    chunks = split_text(texts, max_tokens, chunk_overlap)
    print(chunks)
    assert [c.chunk for c in chunks] == expected


def test_merge_text():
    chunks = ["Hello", "world", "!"]
    merged = merge(chunks, max_len=10)
    assert merged == "Hello\n\n###\n\nworld"
