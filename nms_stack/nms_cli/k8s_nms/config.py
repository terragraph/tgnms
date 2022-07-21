# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import os
import secrets
import string
import sys
from typing import Any, Dict

import jinja2


current_lookup = None


def get_template(content):
    template = jinja2.Template(content)
    template.new_context().environment.filters[
        "to_json"
    ] = template.new_context().environment.filters["tojson"]
    template.new_context().environment.undefined = jinja2.StrictUndefined
    return template


def lookup_maker(template_filename, config=None):
    def file_lookup(template_type, filename, extra_config=None):
        path_parts = [os.path.dirname(template_filename)]
        # if filename.startswith(".."):
        #     # The paths for ansible's `lookup` do this automatically
        #     # for some reason, so mirror it here so the paths in the
        #     # template file are the same
        #     path_parts.append("..")
        path_parts.append(filename)

        path = os.path.join(*path_parts)

        with open(path, "r") as f:
            content = f.read()

        if template_type == "read":
            # direct read, don't template
            return content

        template = get_template(content)

        if extra_config is None:
            extra_config = {}
        global current_lookup
        current_lookup = filename
        result = template.render({"lookup": lookup, **config, **extra_config})
        current_lookup = None
        return result

    def password_lookup():
        return "".join(
            secrets.choice(string.ascii_letters + string.digits) for i in range(10)
        )

    def lookup(type, *args):
        if type == "template":
            return file_lookup("template", *args)
        elif type == "password":
            return password_lookup(*args)
        elif type == "read":
            return file_lookup("read", *args)
        else:
            raise RuntimeError("Template type not found")

    return lookup


def basename(s):
    return os.path.basename(s)


def dns_name(s):
    return s.replace("/", "-").replace("_", "-").replace(" ", "-").replace(".", "-")


def is_ipv6(s):
    # Simplistic check for IPv6 since ipaddress.ip_address doesn't handle CIDRs
    return ":" in s


def get_env(filename, config):
    return {
        "dns_name": dns_name,
        "basename": basename,
        "is_ipv6": is_ipv6,
        "read": lookup_maker(filename),
        "lookup": lookup_maker(filename, config),
        **config,
    }


def configure_templates(config: Dict[str, Any], files: Dict[str, str]) -> str:
    result = ""
    try:
        for filename in sorted(files.keys()):
            content = files[filename]
            template = get_template(content)
            result += "---\n"
            result += f"{template.render(get_env(filename, config))}\n"
    except Exception as e:
        sys.stderr.write(f"Failed on file {filename}\n")
        if current_lookup:
            sys.stderr.write(f"While running lookup on file {current_lookup}\n")
        raise e

    return result
