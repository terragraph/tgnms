# Minimal makefile for Sphinx documentation
#

# You can set these variables from the command line, and also
# from the environment for the first two.
SPHINXOPTS    ?=
SPHINXBUILD   ?= sphinx-build
SOURCEDIR     = source
BUILDDIR      = build

# Put it first so that "make" without argument is like "make help".
help:
	@$(SPHINXBUILD) -M help "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

serve:
	# Make sure the build directory exists
	make html

	# Start a static file server
	cd build/html && python -m http.server 8082

dev_build:
	# Watch everything except the 'build' directory and rebuild on any changes
	find . | grep -v "build" | entr -r make html

dev: serve dev_build

# Convert notebooks into .py files and copy them to the html directory so they
# can be served statically
ipynb:
	cd source && find . -name "*.ipynb" | xargs jupyter nbconvert --to script
	find source -name "*.py" | grep -v "conf.py" | sed 's/source\///g' | xargs -I {} cp -v source/{} build/html/{}

.PHONY: help Makefile

# Catch-all target: route all unknown targets to Sphinx using the new
# "make mode" option.  $(O) is meant as a shortcut for $(SPHINXOPTS).
%: Makefile
	@$(SPHINXBUILD) -M $@ "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)
