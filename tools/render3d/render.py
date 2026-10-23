#!/usr/bin/env python3
"""Get Gud 3D asset renderer.

Renders every pre-rendered 3D asset of the app with three.js in headless Chromium (SwiftShader WebGL),
then post-processes with Pillow: 2x supersampling, alpha from a coverage pass, auto-centring with padding,
WebP/PNG export, app-icon derivatives and review contact sheets.

    cd tools/render3d && npm install && python3 render.py            # everything
    python3 render.py medal-streak-3 urge-orb                          # only some assets
    python3 render.py --sheets-only                                    # rebuild contact sheets

Requires: python3 with playwright, pillow, numpy (+ fonttools, shapely to rebuild glyph outlines).
"""
import argparse
import base64
import functools
import http.server
import io
import os
import sys
import threading
import time

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT3D = os.path.join(ROOT, "assets", "3d")
IMAGES = os.path.join(ROOT, "assets", "images")
PUBLIC = os.path.join(ROOT, "public")
REVIEW = os.path.join(HERE, "review")
CHROME = os.environ.get("CHROME", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome")

MEDALS = [
    "medal-streak-3", "medal-streak-7", "medal-streak-21", "medal-streak-66", "medal-streak-100",
    "medal-walked-away", "medal-perfect-day", "medal-urge-surfer", "medal-locked",
]

# name -> spec. size = output px; ss = supersampling factor; pad = fraction of the canvas left empty per side
ASSETS = {}
for m in MEDALS:
    ASSETS[m] = dict(builder="medal", params={"name": m}, size=600, ss=2, pad=0.08, png=True)
ASSETS["urge-orb"] = dict(builder="orb", params={"glow": False}, size=800, ss=2, fit=False, budget=120)
ASSETS["urge-orb-glow"] = dict(builder="orb", params={"glow": True}, size=800, ss=2, fit=False, budget=120)
for i in range(1, 8):
    ASSETS[f"mood-{i}"] = dict(builder="mood", params={"level": i}, size=600, ss=2, pad=0.08)
ASSETS["ring-trophy"] = dict(builder="trophy", params={}, size=600, ss=2, pad=0.08)
ASSETS["gate-shield"] = dict(builder="shield", params={}, size=600, ss=2, pad=0.08)
# icon sources (post-processed into the icon files)
ASSETS["icon-mark"] = dict(builder="gmark", params={}, size=1024, ss=2, pad=0.0, fit=False, icon=True)


# ---------------------------------------------------------------------- server + browser
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def start_server():
    handler = functools.partial(QuietHandler, directory=HERE)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def decode(data_url):
    return Image.open(io.BytesIO(base64.b64decode(data_url.split(",", 1)[1])))


# ---------------------------------------------------------------------- post-processing
def to_float(im, mode="RGB"):
    return np.asarray(im.convert(mode), dtype=np.float32) / 255.0


def resize_f(arr, size, box=None):
    """Lanczos-resize a float HxW or HxWxC array (optionally cropping box first, zero-padded)."""
    if arr.ndim == 2:
        im = Image.fromarray(arr, mode="F")
        if box:
            im = im.crop(box)
        return np.asarray(im.resize((size, size), Image.LANCZOS), dtype=np.float32)
    return np.stack([resize_f(arr[..., c], size, box) for c in range(arr.shape[2])], axis=-1)


def finish(color_im, mask_im, spec):
    col = to_float(color_im)                       # premultiplied over black (sRGB-encoded)
    a = to_float(mask_im, "L")
    H = a.shape[0]
    size = spec["size"]
    box = None
    if spec.get("fit", True):
        ys, xs = np.where(a > 0.02)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        side = max(x1 - x0, y1 - y0) / (1 - 2 * spec.get("pad", 0.08))
        box = (int(round(cx - side / 2)), int(round(cy - side / 2)), int(round(cx + side / 2)), int(round(cy + side / 2)))
    col = np.clip(resize_f(col, size, box), 0, None)
    a = np.clip(resize_f(a, size, box), 0, 1)
    straight = np.where(a[..., None] > 1e-4, col / np.maximum(a[..., None], 1e-4), 0)
    straight = np.clip(straight, 0, 1)
    # light triangular dither to keep smooth gradients free of banding after 8-bit + WebP
    rng = np.random.default_rng(7)
    noise = (rng.random(straight.shape, dtype=np.float32) - rng.random(straight.shape, dtype=np.float32)) * (0.75 / 255)
    straight = np.clip(straight + noise * (a[..., None] > 0), 0, 1)
    rgba = np.dstack([straight, a])
    out = Image.fromarray((rgba * 255 + 0.5).astype(np.uint8), "RGBA")
    # zero colour under fully transparent pixels (smaller files, no stray colour)
    arr = np.asarray(out).copy()
    arr[arr[..., 3] == 0] = 0
    return Image.fromarray(arr, "RGBA")


def save_webp(im, path, budget_kb=80, quality=90):
    q = quality
    while True:
        im.save(path, "WEBP", quality=q, method=6, alpha_quality=100, exact=False)
        kb = os.path.getsize(path) / 1024
        if kb <= budget_kb or q <= 70:
            return kb, q
        q -= 4


# ---------------------------------------------------------------------- icons
def icon_background(n=1024):
    """Near-black to deep navy/indigo with a warm glow behind the mark."""
    y, x = np.mgrid[0:n, 0:n].astype(np.float32) / (n - 1)
    top = np.array([0.035, 0.035, 0.06])
    bot = np.array([0.09, 0.09, 0.24])
    t = np.clip(y * 0.9 + x * 0.15, 0, 1)[..., None]
    bg = top * (1 - t) + bot * t
    d = np.sqrt((x - 0.5) ** 2 + (y - 0.47) ** 2)
    glow = np.exp(-(d / 0.30) ** 2)[..., None]
    bg = bg + glow * np.array([0.20, 0.13, 0.03]) * 0.55
    ind = np.exp(-(((x - 0.5) ** 2) / 0.25 + ((y - 1.05) ** 2) / 0.08))[..., None]
    bg = bg + ind * np.array([0.10, 0.10, 0.30]) * 0.5
    return np.clip(bg, 0, 1)


def make_icons(mark):
    """mark: RGBA 1024 render of the G mark (transparent)."""
    n = 1024
    m = np.asarray(mark, dtype=np.float32) / 255.0
    a = m[..., 3:4]
    bg = icon_background(n)
    comp = m[..., :3] * a + bg * (1 - a)
    rng = np.random.default_rng(3)
    comp = np.clip(comp + (rng.random(comp.shape) - rng.random(comp.shape)) * (0.8 / 255), 0, 1)
    icon = Image.fromarray((comp * 255 + 0.5).astype(np.uint8), "RGB")
    icon.save(os.path.join(IMAGES, "icon.png"), optimize=True)
    for size, path in [(180, os.path.join(PUBLIC, "apple-touch-icon.png")), (192, os.path.join(PUBLIC, "icon-192.png")),
                       (512, os.path.join(PUBLIC, "icon-512.png"))]:
        icon.resize((size, size), Image.LANCZOS).save(path, optimize=True)
    icon.resize((48, 48), Image.LANCZOS).convert("RGBA").save(os.path.join(IMAGES, "favicon.png"), optimize=True)
    # splash: the mark alone on transparent
    mark.save(os.path.join(IMAGES, "splash-icon.png"), optimize=True)
    # android adaptive: foreground mark inside the 66% safe zone
    fg = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    small = mark.resize((int(n * 0.70), int(n * 0.70)), Image.LANCZOS)
    fg.paste(small, ((n - small.width) // 2, (n - small.height) // 2), small)
    fg.save(os.path.join(IMAGES, "android-icon-foreground.png"), optimize=True)
    bgim = Image.fromarray((icon_background(n) * 255 + 0.5).astype(np.uint8), "RGB")
    # "solid" background layer: flat brand navy
    Image.new("RGB", (n, n), (10, 16, 32)).save(os.path.join(IMAGES, "android-icon-background.png"), optimize=True)
    mono_a = np.asarray(fg)[..., 3]
    mono = np.dstack([np.full_like(mono_a, 255)] * 3 + [mono_a])
    Image.fromarray(mono, "RGBA").save(os.path.join(IMAGES, "android-icon-monochrome.png"), optimize=True)
    return icon


# ---------------------------------------------------------------------- contact sheets
def contact_sheet(names, bg, path, cell=300, cols=5, label=True):
    rows = (len(names) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell, rows * (cell + (22 if label else 0))), bg)
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Medium.otf", 13)
    except Exception:
        font = None
    for i, n in enumerate(names):
        p = os.path.join(OUT3D, n + ".webp")
        if not os.path.exists(p):
            continue
        im = Image.open(p).convert("RGBA")
        im.thumbnail((cell - 16, cell - 16), Image.LANCZOS)
        x = (i % cols) * cell + (cell - im.width) // 2
        y = (i // cols) * (cell + (22 if label else 0)) + (cell - im.height) // 2
        sheet.paste(im, (x, y), im)
        if label:
            kb = os.path.getsize(p) / 1024
            d.text(((i % cols) * cell + 8, (i // cols) * (cell + 22) + cell + 2), f"{n}  {kb:.0f} KB", fill=(150, 150, 158), font=font)
    sheet.save(path)


def sheets():
    os.makedirs(REVIEW, exist_ok=True)
    names = [n for n in ASSETS if not ASSETS[n].get("icon")]
    contact_sheet(names, (0, 0, 0), os.path.join(REVIEW, "contact-black.png"))
    contact_sheet(names, (0x1C, 0x1C, 0x1E), os.path.join(REVIEW, "contact-1c1c1e.png"))
    icon_p = os.path.join(IMAGES, "icon.png")
    if os.path.exists(icon_p):
        icon = Image.open(icon_p).convert("RGB")
        sheet = Image.new("RGB", (900, 400), (0, 0, 0))
        big = icon.resize((300, 300), Image.LANCZOS)
        sheet.paste(rounded(big, 66), (40, 50), rounded(big, 66))
        for j, s in enumerate([120, 60, 40]):
            ic = icon.resize((s, s), Image.LANCZOS)
            sheet.paste(rounded(ic, int(s * 0.225)), (400 + j * 160, 200 - s // 2), rounded(ic, int(s * 0.225)))
        sheet.save(os.path.join(REVIEW, "icon-check.png"))


def rounded(im, r):
    im = im.convert("RGBA")
    m = Image.new("L", (im.width * 4, im.height * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, m.width - 1, m.height - 1], r * 4, fill=255)
    im.putalpha(m.resize(im.size, Image.LANCZOS))
    return im


# ---------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="*")
    ap.add_argument("--sheets-only", action="store_true")
    ap.add_argument("--debug-dir", default=None, help="also dump raw colour/mask passes here")
    args = ap.parse_args()
    if args.sheets_only:
        sheets()
        return

    # glyph outlines (needs fonttools + shapely; a prebuilt build/shapes.json is used otherwise)
    try:
        import glyphs  # noqa
        glyphs.build()
    except ImportError as e:
        print("glyph rebuild skipped:", e, file=sys.stderr)

    names = args.names or list(ASSETS)
    os.makedirs(OUT3D, exist_ok=True)
    srv = start_server()
    url = f"http://127.0.0.1:{srv.server_address[1]}/web/index.html"
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, headless=True, args=[
            "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
            "--enable-webgl", "--disable-gpu-sandbox"])
        page = browser.new_page(viewport={"width": 800, "height": 800})
        page.set_default_timeout(600_000)
        logs = []
        page.on("console", lambda m: logs.append(f"[{m.type}] {m.text}"))
        page.on("pageerror", lambda e: logs.append(f"[pageerror] {e}"))
        page.goto(url)
        try:
            page.wait_for_function("window.READY === true", timeout=60_000)
        except Exception:
            print("\n".join(logs))
            raise
        for n in names:
            spec = ASSETS[n]
            t0 = time.time()
            rs = spec["size"] * spec.get("ss", 2)
            res = page.evaluate("(s) => window.renderAsset(s)", {"builder": spec["builder"], "params": spec["params"], "renderSize": rs})
            for l in logs:
                if "error" in l.lower() or "warn" in l.lower():
                    print("   ", l)
            logs.clear()
            color, mask = decode(res["color"]), decode(res["mask"])
            if args.debug_dir:
                os.makedirs(args.debug_dir, exist_ok=True)
                color.save(os.path.join(args.debug_dir, n + "-color.png"))
                mask.save(os.path.join(args.debug_dir, n + "-mask.png"))
            im = finish(color, mask, spec)
            if spec.get("icon"):
                make_icons(im)
                print(f"{n:22s} icons written  {time.time() - t0:5.1f}s")
                continue
            kb, q = save_webp(im, os.path.join(OUT3D, n + ".webp"), spec.get("budget", 80))
            extra = ""
            if spec.get("png"):
                im.save(os.path.join(OUT3D, n + ".png"), optimize=True)
                extra = f"  png {os.path.getsize(os.path.join(OUT3D, n + '.png')) / 1024:.0f} KB"
            print(f"{n:22s} webp {kb:5.1f} KB (q{q}){extra}  {time.time() - t0:5.1f}s")
        browser.close()
    srv.shutdown()
    sheets()
    print("contact sheets:", os.path.join(REVIEW, "contact-black.png"), os.path.join(REVIEW, "contact-1c1c1e.png"))


if __name__ == "__main__":
    main()
