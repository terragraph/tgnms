# Copyright (c) 2014-present, Facebook, Inc.
# Configuration file for the Sphinx documentation builder.
#
# This file only contains a selection of the most common options. For a full
# list see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Path setup --------------------------------------------------------------

# If extensions (or modules to document with autodoc) are in another directory,
# add these directories to sys.path here. If the directory is relative to the
# documentation root, use os.path.abspath to make it absolute, like shown here.
#
import os
import re
import sys

import aiohttp.web
from aiokafka import AIOKafkaConsumer
from sphinx.ext.autodoc import between


sys.path.insert(0, os.path.abspath("../.."))

_docs_path = os.path.dirname(__file__)
_version_path = os.path.abspath(os.path.join(_docs_path, "..", "tglib", "__init__.py"))

with open(_version_path, "r") as f:
    try:
        _version_info = re.findall(r'^__version__ = "([^\']+)"\r?$', f.read(), re.M)[0]
    except IndexError:
        raise RuntimeError("Unable to determine version.")

aiohttp.web.Request.__module__ = "aiohttp.web"
aiohttp.web.Response.__module__ = "aiohttp.web"
aiohttp.web.RouteTableDef.__module__ = "aiohttp.web"
AIOKafkaConsumer.__module__ = "aiokafka"


# -- Project information -----------------------------------------------------

project = "tglib"
copyright = "2020, Terragraph"
author = "Terragraph"

# The full version, including alpha/beta/rc tags
release = _version_info


# -- General configuration ---------------------------------------------------

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom
# ones.
extensions = [
    "sphinx.ext.autodoc",
    "sphinx.ext.intersphinx",
    "sphinx.ext.napoleon",
    "sphinx_autodoc_typehints",
]

# Add any paths that contain templates here, relative to this directory.
templates_path = ["_templates"]

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
# This pattern also affects html_static_path and html_extra_path.
exclude_patterns = ["_build", "Thumbs.db", ".DS_Store"]

# -- intersphinx configuration -----------------------------------------------

intersphinx_mapping = {
    "python": ("https://docs.python.org/3.8", None),
    "aiohttp": ("https://docs.aiohttp.org/en/stable/", None),
    "aiokafka": ("https://aiokafka.readthedocs.io/en/stable/", None),
}


# -- autodoc configuration ---------------------------------------------------

autodoc_member_order = "bysource"


# -- Options for HTML output -------------------------------------------------

# The theme to use for HTML and HTML Help pages.  See the documentation for
# a list of builtin themes.
#
html_theme = "alabaster"

# Add any paths that contain custom static files (such as style sheets) here,
# relative to this directory. They are copied after the builtin static files,
# so a file named "default.css" will overwrite the builtin "default.css".
html_static_path = ["_static"]


def setup(app):
    app.connect("autodoc-process-docstring", between("^---$", exclude=True))
    return app
