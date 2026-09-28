"""Writes AVIF/WebP versions of every PNG/JPG under assets/, plus half-size (_l) versions for
mobile, next to the original. _plugins/responsive_images.rb serves them through <picture>.
Originals are kept, so links to them (social previews, etc.) never break. Runs in CI.
"""
import hashlib
import json
import os
from PIL import Image

try:
    import pillow_avif  # noqa: F401  AVIF plugin for Pillow < 11.2 (newer Pillow has it built in)
except ImportError:
    pass

ASSETS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")
# Maps each source image to the hash it was last converted from, so unchanged images are skipped
MANIFEST = os.path.join(ASSETS, ".conversion-manifest.json")
# Static pages that don't go through Jekyll, so nothing would serve their variants
SKIP_DIRS = {"icons", "SummerNest", "WAMCA", "webp"}
SOURCES = (".png", ".jpg", ".jpeg")
# Narrower images get no half-size version: halved, they would look soft on high-density phones
MIN_HALVE_WIDTH = 800


def outputs(path, ext):
    """(suffix, extension) of every file generated from a source image"""
    out = [("", ".webp"), ("", ".avif")]
    with Image.open(path) as img:
        if img.width < MIN_HALVE_WIDTH:
            return out
    out += [("_l", ".webp"), ("_l", ".avif")]
    return out + [("_l", ".png")] if ext == ".png" else out


def convert(src, base, ext):
    with Image.open(src) as img:
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA" if "transparency" in img.info or img.mode in ("LA", "PA") else "RGB")
        img.save(base + ".webp", "WEBP")
        img.save(base + ".avif", "AVIF")
        if img.width < MIN_HALVE_WIDTH:
            return
        lowres = img.resize((max(1, img.width // 2), max(1, img.height // 2)), Image.Resampling.LANCZOS)
        lowres.save(base + "_l.webp", "WEBP")
        lowres.save(base + "_l.avif", "AVIF")
        if ext == ".png":
            lowres.save(base + "_l.png", "PNG")


def sources():
    """(path, base, ext) of each image to convert. Two sources sharing a name (foo.png, foo.jpg)
    would write the same foo.avif, so neither is converted."""
    found = {}
    for root, dirs, files in os.walk(ASSETS):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for file in files:
            base, ext = os.path.splitext(os.path.join(root, file))
            if file.startswith(".") or ext.lower() not in SOURCES or base.endswith("_l"):
                continue
            found.setdefault(base, []).append((os.path.join(root, file), base, ext.lower()))
    for base, group in sorted(found.items()):
        if len(group) > 1:
            print(f"Skipping {os.path.relpath(base, ASSETS)}: more than one source ({', '.join(e for _, _, e in group)})")
        else:
            yield group[0]


def convert_images():
    try:
        with open(MANIFEST) as f:
            done = json.load(f)
    except (OSError, ValueError):
        done = {}
    seen = {}

    for path, base, ext in sources():
        with open(path, "rb") as f:
            digest = hashlib.md5(f.read()).hexdigest()
        key = os.path.relpath(path, ASSETS)
        if done.get(key) == digest and all(os.path.exists(base + s + e) for s, e in outputs(path, ext)):
            seen[key] = digest
            continue

        print(f"Converting {key}")
        try:
            convert(path, base, ext)
            seen[key] = digest
        except Exception as e:
            print(f"Error converting {key}: {e}")

    with open(MANIFEST, "w") as f:
        json.dump(seen, f, indent=0, sort_keys=True)


if __name__ == "__main__":
    convert_images()
