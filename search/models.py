from typing import List, Optional
from pydantic import BaseModel

# TODO: could use pandera lib
class Note(BaseModel):
    note_path: Optional[str] = None
    note_tags: Optional[List[str]] = None
    note_content: Optional[str] = None
    path_to_delete: Optional[str] = None

class Notes(BaseModel):
    namespace: str
    notes: List[Note] = []
    clear: bool = False

class Input(BaseModel):
    namespace: str
    query: Optional[str] = None
    note: Optional[Note] = None
    top_k: int = 6
    # example: {"person": "John Doe"}
    metadata: Optional[dict] = None
