import glob
import importlib.util
import setuptools
import argparse

dependencies = set()

def interceptor(*args, **kwargs):
    [dependencies.add(x) for x in kwargs.get("install_requires", [])]
    for name, extras in kwargs.get("extras_require", {}).items():
        [dependencies.add(x) for x in extras]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Read all setup.py files and gather their dependencies."
    )
    parser.add_argument(
        "--dir", required=True, help="directory to search for setup.py files"
    )
    args = parser.parse_args()

    setuptools.setup = interceptor

    setups = glob.glob(f"{args.dir}/**/setup.py", recursive=True)
    for setup in setups:
        spec = importlib.util.spec_from_file_location(".", setup)
        foo = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(foo)

    print("\n".join(sorted(dependencies)))
