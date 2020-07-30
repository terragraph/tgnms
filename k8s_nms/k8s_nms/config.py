import os
from typing import Any, Dict

import jinja2


def get_template(content):
    template = 	jinja2.Template(content)
    template.new_context().environment.filters[
        "to_json"
    ] = template.new_context().environment.filters["tojson"]
    return template


def lookup_maker(template_filename, config):
    def lookup(type, filename):
        path_parts = [os.path.dirname(template_filename)]
        if filename.startswith(".."):
            # The paths for ansible's `lookup` do this automatically
            # for some reason, so mirror it here so the paths in the
            # template file are the same
            path_parts.append("..")
        path_parts.append(filename)

        path = os.path.join(*path_parts)

        template = get_template(open(path, "r").read())
        return template.render({"lookup": lookup, **config})

        return templated

    return lookup


def get_env(filename, config):
    return {"lookup": lookup_maker(filename, config), **config}


def configure_templates(config: Dict[str, Any], files: Dict[str, str]):
    for filename, content in files.items():
        template = 	get_template(content)
        print("---")
        print(template.render(get_env(filename, config)))
