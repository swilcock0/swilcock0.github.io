"""Writes the IndexNow submission for a deploy: every URL in the freshly built sitemap that is new
or has a newer <lastmod> than the live sitemap, plus the data-driven pages when _data/ or Files/
changed. Runs in CI before the deploy, while the live site still has the old sitemap; the deploy
job then POSTs the output to api.indexnow.org.

    python scripts/indexnow.py OUT.json [--all] [--changed FILE]

--all submits every URL in the sitemap. --changed is a list of repo paths changed by the push.
"""
import argparse
import json
import os
import sys
import urllib.request
from datetime import datetime
import xml.etree.ElementTree as ET

HOST = "www.samwilcock.xyz"
SITE = f"https://{HOST}"
# The key is public by design: the key file at the site root proves ownership of the host
KEY = "d9c510da33f74615a3ca943b17fa06ea"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEW_SITEMAP = os.path.join(ROOT, "_site", "sitemap.xml")
NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
# Built from _data/ (publications, authors) and Files/ (CV), so their own lastmod doesn't move
DATA_PAGES = ["/", "/about/", "/publications/", "/CV/", "/llms.txt"]


def lastmods(xml):
    """{url: lastmod} from sitemap XML, as datetimes so builds in different time zones compare equal"""
    def parse(mod):
        try:
            return datetime.fromisoformat(mod)
        except (TypeError, ValueError):
            return mod
    return {u.findtext("s:loc", namespaces=NS): parse(u.findtext("s:lastmod", namespaces=NS))
            for u in ET.fromstring(xml).findall("s:url", NS)}


def static_source(url):
    """Repo path of a URL served as a static file (a PDF, a hand-made HTML page), else None.
    The sitemap gives these the file's mtime, which in CI is the checkout time, so whether
    the push changed the file is the only reliable signal."""
    path = url[len(SITE) + 1:]
    for candidate in (path, path + "index.html"):
        if candidate and os.path.isfile(os.path.join(ROOT, candidate)):
            return candidate
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("out")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--changed")
    args = parser.parse_args()

    with open(NEW_SITEMAP, "rb") as f:
        new = lastmods(f.read())

    if args.all:
        urls = list(new)
    else:
        try:
            with urllib.request.urlopen(f"{SITE}/sitemap.xml", timeout=30) as r:
                old = lastmods(r.read())
        except Exception as e:  # never fail the deploy over IndexNow
            print(f"Couldn't read the live sitemap ({e}), submitting nothing")
            old = new
        changed = []
        if args.changed and os.path.exists(args.changed):
            with open(args.changed) as f:
                changed = f.read().split()
        urls = []
        for url, mod in new.items():
            source = static_source(url)
            if source is not None:
                if source in changed:
                    urls.append(url)
            elif old.get(url) != mod:
                urls.append(url)
        if changed:
            if any(p.startswith(("_data/", "Files/")) for p in changed):
                urls += [SITE + p for p in DATA_PAGES if SITE + p not in urls]

    print(f"{len(urls)} URL(s) to submit:", *urls, sep="\n  ")
    payload = {"host": HOST, "key": KEY, "keyLocation": f"{SITE}/{KEY}.txt", "urlList": urls}
    with open(args.out, "w") as f:
        json.dump(payload if urls else {}, f, indent=2)


if __name__ == "__main__":
    sys.exit(main())
