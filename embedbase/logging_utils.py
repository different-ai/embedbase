import logging
from typing import Optional

from embedbase.settings import Settings
from logging import Logger


def get_logger(settings: Optional[Settings] = None) -> Logger:
    logger = logging.getLogger("embedbase")
    logger.setLevel(settings.log_level if settings else "INFO")

    # Clear the existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)

    handler = logging.StreamHandler()
    handler.setLevel(settings.log_level if settings else "INFO")
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    return logger
