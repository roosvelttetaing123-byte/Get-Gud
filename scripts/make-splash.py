#!/usr/bin/env python3
"""Generate iPhone launch screens (apple-touch-startup-image) for the home-screen web app.

Each image is a true-black portrait screen with the app mark centred at ~120 pt, written to
public/splash/. The matching <link> tags in public/index.html (between the
`splash:start` / `splash:end` markers) are rewritten so they always match the files.

Source art:
  * assets/images/splash-icon.png - the transparent mark (preferred), cropped to its
    visible pixels and fitted into a 120 pt box;
  * otherwise assets/images/icon.png, drawn as a 120 pt rounded (continuous-corner) icon.
    Used when the mark is missing, has no transparency, or is older than icon.png
    (i.e. the icon was redrawn and the mark wasn't).

Usage: scripts/make-splash.py [--source auto|mark|icon] [--force]
Requires Pillow. Unchanged inputs are skipped (a hash is stored in each PNG).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
from pathlib import Path

try:
    from PIL import Image, ImageChops, ImageDraw, PngImagePlugin
except ImportError:  # pragma: no cover
    sys.exit("make-splash: Pillow is not installed (pip install pillow)")

ROOT = Path(__file__).resolve().parent.parent
MARK = ROOT / "assets/images/splash-icon.png"
ICON = ROOT / "assets/images/icon.png"
ICON_FALLBACK = ROOT / "public/icon-512.png"
OUT = ROOT / "public/splash"
INDEX = ROOT / "public/index.html"

VERSION = "1"
BACKGROUND = (0, 0, 0)
MARK_PT = 120  # the mark (or icon) fits in a 120 x 120 pt box
STALE_SECONDS = 60  # mark older than the icon by more than this is treated as stale

# Portrait iPhone screens: (CSS width, CSS height, device pixel ratio, devices)
DEVICES = [
    (440, 956, 3, "16 Pro Max, 17 Pro Max"),
    (430, 932, 3, "14 Pro Max, 15 Plus/Pro Max, 16 Plus"),
    (428, 926, 3, "12/13 Pro Max, 14 Plus"),
    (420, 912, 3, "iPhone Air"),
    (414, 896, 3, "XS Max, 11 Pro Max"),
    (414, 896, 2, "XR, 11"),
    (402, 874, 3, "16 Pro, 17, 17 Pro"),
    (393, 852, 3, "14 Pro, 15, 15 Pro, 16"),
    (390, 844, 3, "12, 13, 14, 16e"),
    (375, 812, 3, "X, XS, 11 Pro, 12/13 mini"),
    (375, 667, 2, "SE 2nd/3rd gen, 8"),
]


def base_url() -> str:
    try:
        cfg = json.loads((ROOT / "app.json").read_text())
        base = cfg["expo"]["experiments"]["baseUrl"]
    except (OSError, KeyError, ValueError):
        base = "/Get-Gud"
    return "/" + base.strip("/") if base.strip("/") else ""


def has_transparency(img: Image.Image) -> bool:
    if img.mode not in ("RGBA", "LA", "PA") and "transparency" not in img.info:
        return False
    alpha = img.convert("RGBA").getchannel("A")
    lo, _ = alpha.getextrema()
    return lo < 250


def pick_source(choice: str) -> tuple[str, Path]:
    icon = ICON if ICON.exists() else ICON_FALLBACK
    if choice == "icon":
        return "icon", icon
    if MARK.exists():
        with Image.open(MARK) as m:
            transparent = has_transparency(m)
        stale = icon.exists() and icon.stat().st_mtime - MARK.stat().st_mtime > STALE_SECONDS
        if choice == "mark" or (transparent and not stale):
            return "mark", MARK
        why = "has no transparency" if not transparent else "is older than the icon"
        print(f"make-splash: {MARK.relative_to(ROOT)} {why}; using the icon instead")
    elif choice == "mark":
        sys.exit(f"make-splash: {MARK} not found")
    if not icon.exists():
        sys.exit("make-splash: no source art found (assets/images/icon.png or splash-icon.png)")
    return "icon", icon


def squircle_mask(size: int, n: float = 5.0, ss: int = 4) -> Image.Image:
    """Continuous-corner (superellipse) mask, anti-aliased by supersampling."""
    big = size * ss
    r = big / 2
    pts = []
    for i in range(720):
        t = 2 * math.pi * i / 720
        c, s = math.cos(t), math.sin(t)
        x = r + r * math.copysign(abs(c) ** (2 / n), c)
        y = r + r * math.copysign(abs(s) ** (2 / n), s)
        pts.append((x, y))
    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).polygon(pts, fill=255)
    return mask.resize((size, size), Image.Resampling.LANCZOS)


def render_art(kind: str, src: Path, box: int) -> Image.Image:
    """Return an RGBA image no larger than box x box."""
    img = Image.open(src).convert("RGBA")
    if kind == "mark":
        bbox = img.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
        if bbox:
            img = img.crop(bbox)
        scale = box / max(img.size)
        size = (max(1, round(img.width * scale)), max(1, round(img.height * scale)))
        return img.resize(size, Image.Resampling.LANCZOS)
    side = min(img.size)
    img = img.crop(((img.width - side) // 2, (img.height - side) // 2, (img.width + side) // 2, (img.height + side) // 2))
    img = img.resize((box, box), Image.Resampling.LANCZOS)
    img.putalpha(ImageChops.darker(img.getchannel("A"), squircle_mask(box)))
    return img


def file_name(w: int, h: int, s: int) -> str:
    return f"iphone-{w}x{h}@{s}x.png"


def link_tags(base: str) -> str:
    lines = []
    for w, h, s, devices in DEVICES:
        media = (
            f"screen and (device-width: {w}px) and (device-height: {h}px) "
            f"and (-webkit-device-pixel-ratio: {s}) and (orientation: portrait)"
        )
        lines.append(f"    <!-- {devices} -->")
        lines.append(f'    <link rel="apple-touch-startup-image" media="{media}" href="{base}/splash/{file_name(w, h, s)}" />')
    return "\n".join(lines)


def sync_index(base: str) -> None:
    html = INDEX.read_text()
    pattern = re.compile(r"(<!-- splash:start[^>]*-->)(.*?)(<!-- splash:end -->)", re.S)
    if not pattern.search(html):
        print("make-splash: splash markers not found in public/index.html; tags not updated")
        return
    new = pattern.sub(lambda m: f"{m.group(1)}\n{link_tags(base)}\n    {m.group(3)}", html, count=1)
    if new != html:
        INDEX.write_text(new)
        print("make-splash: updated <link rel=apple-touch-startup-image> tags in public/index.html")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--source", choices=["auto", "mark", "icon"], default="auto")
    ap.add_argument("--force", action="store_true", help="regenerate even if inputs are unchanged")
    args = ap.parse_args()

    kind, src = pick_source(args.source)
    digest = hashlib.sha1(
        b"|".join([VERSION.encode(), kind.encode(), src.read_bytes(), repr((BACKGROUND, MARK_PT)).encode()])
    ).hexdigest()

    OUT.mkdir(parents=True, exist_ok=True)
    wanted = {file_name(w, h, s) for w, h, s, _ in DEVICES}
    for stale in OUT.glob("*.png"):
        if stale.name not in wanted:
            stale.unlink()

    made = 0
    art_cache: dict[int, Image.Image] = {}
    for w, h, s, _ in DEVICES:
        path = OUT / file_name(w, h, s)
        if not args.force and path.exists():
            try:
                with Image.open(path) as old:
                    if old.info.get("gg-src") == digest and old.size == (w * s, h * s):
                        continue
            except OSError:
                pass
        box = MARK_PT * s
        art = art_cache.get(box) or art_cache.setdefault(box, render_art(kind, src, box))
        canvas = Image.new("RGB", (w * s, h * s), BACKGROUND)
        canvas.paste(art, ((canvas.width - art.width) // 2, (canvas.height - art.height) // 2), art)
        meta = PngImagePlugin.PngInfo()
        meta.add_text("gg-src", digest)
        canvas.save(path, "PNG", optimize=True, pnginfo=meta)
        made += 1

    sync_index(base_url())
    rel = src.relative_to(ROOT)
    print(f"make-splash: {made} generated, {len(DEVICES) - made} up to date ({kind}: {rel}) -> public/splash/")


if __name__ == "__main__":
    main()
