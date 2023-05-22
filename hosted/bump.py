import semantic_version
from version import __version__
v = semantic_version.Version(__version__)
v.patch = v.patch + 1
print(v)
