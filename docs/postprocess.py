import sys
import argparse


parser = argparse.ArgumentParser(description='Apply transformations to nms docs.')
parser.add_argument('--name')
parser.add_argument('--file', default=False)
parser.add_argument('--add_base', default=False, action='store_true')
args = parser.parse_args()

# print(args.add_base)
# This script is a hack instead of making a real pandoc filter since all we
# really need to do is some quick string replacing
if args.file:
    html = open(args.file, "r").read()
else:
    html = sys.stdin.read()

print("Writing to file", args.name)

# Fix up all the links from markdown to HTML
html = html.replace(".md", ".html")

if args.add_base:
    html = html.replace('href="/media', 'href="/docs/media')
    html = html.replace('href="media', 'href="/docs/media')
    html = html.replace('src="media', 'src="/docs/media')
    html = html.replace('src="/media', 'src="/docs/media')

# Add the CSS classes so this looks the same as all the other docs (they are
# defined in meta-terragraph/docs/media/container.css)
html = html.replace("<body>", '<body class="container markdown-body">')


if args.file:
    open(args.file, "w").write(html)
else:
    open(args.name, "w").write(html)
