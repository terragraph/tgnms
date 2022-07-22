# NMS Documentation
This file describes the documentation build process, and is not included in the
build itself.

## Building

### Locally
The local build generates a single folder with all the necessary resources for
the NMS docs only.

1. Install `nbsphinx`:
   ```bash
   python -m pip install nbsphinx
   ```

2. Build the docs:
   ```bash
   cd tgnms/docs
   # Build the docs (to the 'build' folder)
   make html
   ```

### With Docker
The Docker build assembles the NMS and tglib docs, inserts an index page (which
also links to the NMS OpenAPI when available), and serves the HTML in
`/usr/local/docs` using nginx.

```bash
docker build -f docs/Dockerfile --tag tg-docs --network=host .
```

## Development
This uses Python's HTTP server to show the built docs.

1. Follow the [Building](#Building) steps above.

2. Install `entr` (similar to Watchman, it will rebuild when a file changes):
   ```bash
   git clone git@github.com:eradman/entr.git && cd entr
   ./configure
   make test
   sudo make install
   ```

3. Preview the docs:
   ```bash
   cd tgnms/docs
   # Build the docs, start a Python server to put them up on port 8082, and watch for changes
   make clean; make html; make dev -j2
   ```
