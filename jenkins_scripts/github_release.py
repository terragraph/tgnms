#!/usr/bin/env python3
# Copyright (c) 2014-present, Facebook, Inc.

import os
import re
import subprocess
from datetime import date

import click
import requests

API_URL = "https://api.github.com/repos/terragraph/tgnms"


@click.group(invoke_without_command=True)
@click.pass_context
def cli(ctx):
    """
    CLI utility to publish releases on github
    """
    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())
        ctx.exit(1)


@cli.command()
@click.option("-b", "--branch", help="Github release branch", required=True)
@click.option(
    "--push/--no-push",
    help="Should created tags be pushed to the origin repo",
    default=True,
)
@click.pass_context
def tag(ctx, branch, push):
    release = get_release(branch)
    click.echo(f"Tagging for release: {release}")
    if release == "latest":
        tag_prefix = f'v{date.today().strftime("%y.%m.%d")}'
    else:
        tag_prefix = f"lts-{release}"
    click.echo(f"Searching for tags with prefix: {tag_prefix}")
    # search for all tags starting with this release num
    tags = read(f'git tag -l "{tag_prefix}*"')
    if tags:
        tags = tags.split("\n")
    print(f"Found {len(tags)} tags")
    print("  Tags: ", tags)

    # increments the tag every time this is run
    tag = f"{tag_prefix}-{len(tags)}"
    print(f"Tagging commit with tag: {tag}")
    run(f"git tag {tag}")
    if push:
        print(f"Pushing tag: {tag}")
        run(f"git push origin {tag}")


@cli.command()
@click.option("-t", "--tag", help="Github tag to release")
@click.option(
    "-a",
    "--asset",
    help="Path of asset to upload to the release",
    type=click.Path(exists=True),
    required=True,
)
@click.option("-n", "--name", help="Name for the uploaded asset", required=True)
@click.option(
    "--draft",
    is_flag=True,
    default=False,
    help="Mark the created release as a draft",
)
@click.option(
    "-f",
    "--force",
    is_flag=True,
    default=False,
    help="Overwrite existing release asset",
)
@click.pass_context
def release(ctx, tag, asset, name, draft, force):
    """
    Create a github release from the provided tag
    """
    if not tag:
        tag = read("git describe --tags").strip()
    if not tag:
        click.echo(click.style("Error: no release tag", fg="red"))
        return exit(1)

    github_user = os.environ.get("GITHUB_USER")
    github_access_token = os.environ.get("GITHUB_ACCESS_TOKEN")
    if github_access_token is None:
        raise RuntimeError("GITHUB_ACCESS_TOKEN environment variable is required")
    if github_user is None:
        raise RuntimeError("GITHUB_USER environment variable is required")

    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"token {github_access_token}",
    }
    click.echo(f"Searching for release with tag: {tag}")
    r = requests.get(f"{API_URL}/releases/tags/{tag}")
    if r.ok:
        release_id = r.json()["id"]
        click.echo(f"Found release: {release_id} with tag {tag}")
    else:
        click.echo(f"Creating release for tag: {tag}")
        r = requests.post(
            f"{API_URL}/releases",
            headers=headers,
            json={
                "name": tag,
                "tag_name": tag,
                "draft": draft,
                # Mark master-branch releases as prerelease and lts as main releases
                "prerelease": False if "lts" in tag else True,
                "body": "NMS installer",
            },
        )
        r.raise_for_status()

        release_json = r.json()
        release_id = release_json["id"]
        click.echo(f"Created new release: {release_id}")

    click.echo("Searching for existing release assets")
    filename = os.path.basename(asset)
    existing_assets = requests.get(
        f"{API_URL}/releases/{release_id}/assets",
        headers=headers,
    ).json()

    # print out the existing assets
    click.echo(f"Found {len(existing_assets)} assets")
    for a in existing_assets:
        click.echo(f'  {a.get("name")}')

    existing_asset = next((x for x in existing_assets if x.get("name") == name), None)
    # A release asset must be deleted before it can be overwritten
    if existing_asset != None:
        n = existing_asset.get("name")
        click.echo(f"Release asset already exists: {n}")
        if force == False:
            click.echo(
                click.style(
                    f"ERROR: Refusing to overwrite existing asset: {n} without the force param (-f / --force)",
                    fg="red",
                )
            )
            return exit(1)
        else:
            click.echo(f" Deleting existing release asset: {n}")
            requests.delete(
                f"{API_URL}/releases/assets/{existing_asset.get('id')}",
                headers=headers,
            )

    # Upload the asset file
    upload_headers = headers.copy()
    upload_headers.update({"Content-Type": "application/octet-stream"})
    click.echo(f"Uploading asset: {name} to release {tag}")
    with open(asset, "rb") as file:
        url = f"https://uploads.github.com/repos/terragraph/tgnms/releases/{release_id}/assets?name={name}&label={name}"
        r = requests.post(
            url,
            headers=upload_headers,
            data=file,
        )
        if r.ok:
            click.echo(f"Successfully uploaded asset: {filename} to release: {tag}")
            click.echo(
                f"Visit: {r.json().get('browser_download_url')} to download the asset"
            )


def run(cmd: str) -> None:
    subprocess.run(cmd, shell=True, check=True)


def read(cmd: str) -> str:
    p = subprocess.run(cmd, stdout=subprocess.PIPE, shell=True, check=True)
    return p.stdout.decode("utf-8").strip()


def get_release(branch):
    if branch == "origin/master":
        release = "latest"
    elif m := re.search(r"origin/releases/lts-nms-(\d{2}\.\d{1,2})", branch):
        release = m.group(1)
    else:
        raise RuntimeError(f"Cannot build for {branch}")
    return release


if __name__ == "__main__":
    cli()