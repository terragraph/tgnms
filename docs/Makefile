all: docs

docs:
	# Make all the necessary output folders
	cd src && find . ! -path . -type d | xargs -I {} mkdir -p ../build/{}

	# Copy everything that's not markdown
	cd src && find . ! -name "*.md" -type f | xargs -I {} cp {} ../build/{}

	# Generate html from markdown, do some replacements via postprocess.py
	cd src && find . -name "*.md" | \
		sed 's/\.md//g' | \
		xargs -I {} \
		/bin/sh -c "cat {}.md | pandoc --standalone --css /media/github-markdown.css --css /media/container.css --from markdown_github+smart+pandoc_title_block - | python3 ../postprocess.py $(POSTPROCESS_ARGS) --name ../build/{}.html"

serve:
	cd build && python -m http.server 8082 --bind ::

dev_build:
	cp -r ~/local/meta-terragraph/docs/media build
	find . -name '*.md' | entr -r make docs

dev: serve dev_build

clean:
	rm -rf build
