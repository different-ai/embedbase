

from main import extract_named_entities

def test_extract_named_entities():
    result = extract_named_entities(["Bob and Alice are friends."])
    assert [e["word"] for e in result[0]] == ["Bob", "Alice"]
