import fire
import semantic_version

version = open("version.txt").read()
v = semantic_version.Version(version)


def get_next_version():
    v.patch = v.patch + 1
    return v


def bump_version():
    new_v = get_next_version()
    with open("version.txt", "w") as f:
        f.write(str(new_v))


if __name__ == "__main__":
    fire.Fire({"bump": bump_version, "get_next_version": get_next_version})
