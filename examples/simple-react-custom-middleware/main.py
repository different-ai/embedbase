from embedbase import get_app
from embedbase.settings import get_settings
from fastapi.middleware.cors import CORSMiddleware
from .middlewares.enrich.enrich import Enrich
from .middlewares.processing_time.processing_time import ProcessingTime

app = (
    get_app(get_settings())
    .use(Enrich)
    .use(ProcessingTime)
    .use(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    .run()
)
