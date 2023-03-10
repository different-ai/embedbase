from typing import List
from embedbase.settings import Settings
from starlette.middleware import Middleware


def get_middlewares(logger, settings: Settings) -> List[Middleware]:
    middlewares = []
    from starlette.middleware import Middleware

    for i, m in enumerate(settings.middlewares):
        # import python file at path m
        # and add the first class found to the list

        try:
            logger.info(f"Importing middleware {m}")
            segments = m.split(".")
            logger.debug(f"Segments {segments}")
            module_name = ".".join(segments[0:-1])
            logger.debug(f"Module name {module_name}")
            class_name = segments[-1]
            logger.debug(f"Class name {class_name}")
            module = __import__(module_name, fromlist=[class_name])
            logger.debug(f"Module {module}")
            dirs = dir(module)
            logger.debug(f"Dirs {dirs}")
            middleware_class = getattr(module, class_name)
            logger.debug(f"Middleware class {middleware_class}")
            middlewares.append(Middleware(middleware_class))
            logger.info(f"Loaded middleware {m}")
        except Exception as e:
            logger.error(f"Error loading middleware {m}: {e}")
    return middlewares
