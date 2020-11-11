# NMS Docs

(note: this is not included in the docs build, this is for information about the docs themselves)

## Building


### Locally

The build generates a single folder with all the necessary resources for the only NMS docs. It expects to be run alongside the other docs in `meta-terragraph` (and references CSS files in the `media` folder there).

1. Install `pandoc` (`pandoc --version` must be 2+)

    On CentOS 8

    ```bash
    sudo dnf install pandoc
    ```

    On CentOS 7
    ```bash
    # CentOS 7
    # find the right binary for your system here
    # https://github.com/jgm/pandoc/releases/tag/2.11.1.1
    curl -LO https://github.com/jgm/pandoc/releases/download/2.11.1.1/pandoc-2.11.1.1-linux-amd64.tar.gz
    tar -xzvf pandoc-2.11.1.1-linux-amd64.tar.gz
    sudo mv pandoc-2.11.1/bin/pandoc /usr/local/bin
    rm -rf pandoc-2.11.1*
    ```

2. Build the docs
    ```bash
    cd ~/connectivity-lab/terragraph/nms/docs
    # Build the docs (to the 'build' folder)
    make
    ```

### With Docker

This builds the index page (that links to other docs such as E2E API docs and tglib). The build uses an OAuth token to clone `meta-terragraph`, so it must have [Docker BuildKit](https://docs.docker.com/develop/develop-images/build_enhancements/) enabled. To build it locally, you need to generate an OAuth token on GitHub with "repo" permissions and add it to a file called `token.txt`.

```bash
# Get an OAuth token from https://github.com/settings/tokens
echo "<the token>" > token.txt

env DOCKER_BUILDKIT=1 docker build --secret id=token,src=token.txt  -f docs/Dockerfile --tag tg-docs --network=host .
```

## Development

This uses Python's HTTP server to show the built docs.

1. Follow the [Building](#Building) steps above
2. Install `entr` (similar to Watchman, it will rebuild when a file changes)
    ```bash
    git clone git@github.com:eradman/entr.git && cd entr
    ./configure
    make test
    sudo make install
    ```
3. Preview the docs
    ```bash
    cd ~/connectivity-lab/terragraph/nms/docs
    # Build the docs, start a Python server to put them up on port 8082, and watch for changes
    make dev -j2
    ```
