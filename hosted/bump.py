import semantic_version
from .version import __version__
v = semantic_version.Version(__version__)
v.patch = v.patch + 1
open("version.py", "w").write('__version__ = "{}"\n'.format(v))