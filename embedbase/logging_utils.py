import logging

from embedbase.settings import Settings
from logging import Logger

def get_logger(settings: Settings) -> Logger:
    logger = logging.getLogger("embedbase")
    logger.setLevel(settings.log_level)
    handler = logging.StreamHandler()
    handler.setLevel(settings.log_level)
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    return logger
