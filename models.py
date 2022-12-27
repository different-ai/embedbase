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
    notes: List[Note]

class Input(BaseModel):
    namespace: str
    query: str # TODO: should be Note? depend with modal stuff
    top_k: int = 6
