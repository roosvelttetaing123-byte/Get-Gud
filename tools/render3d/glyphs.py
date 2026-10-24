"""Builds the 2D outlines (numerals, glyphs, shield, G mark) used by the 3D scenes.

Output: build/shapes.json  ->  { name: [ { "outer": [[x,y],...], "holes": [[[x,y],...], ...] }, ... ] }
Coordinates are normalised so the glyph is centred on the origin; numerals have a cap height of 1.
The JS side turns every polygon into a THREE.Shape and extrudes it with a bevel.

Requires: fonttools, shapely (pip install fonttools shapely).
"""
import json
import math
import os
import sys

from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont
from shapely import affinity
from shapely.geometry import LineString, MultiPolygon, Point, Polygon, box
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "build", "shapes.json")
FONT = "/usr/share/fonts/opentype/inter/InterDisplay-ExtraBold.otf"


# ---------------------------------------------------------------- font outlines
class FlattenPen(BasePen):
    """Records glyph contours as dense polylines."""

    def __init__(self, glyphset, steps=28):
        super().__init__(glyphset)
        self.contours, self.cur, self.steps = [], [], steps

    def _moveTo(self, p):
        self.cur = [p]

    def _lineTo(self, p):
        self.cur.append(p)

    def _curveToOne(self, p1, p2, p3):
        p0 = self.cur[-1]
        for i in range(1, self.steps + 1):
            t = i / self.steps
            mt = 1 - t
            self.cur.append((
                mt**3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t**3 * p3[0],
                mt**3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t**3 * p3[1],
            ))

    def _qCurveToOne(self, p1, p2):
        p0 = self.cur[-1]
        for i in range(1, self.steps + 1):
            t = i / self.steps
            mt = 1 - t
            self.cur.append((mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
                             mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1]))

    def _closePath(self):
        if len(self.cur) > 2:
            self.contours.append(self.cur)
        self.cur = []

    _endPath = _closePath


def contours_to_geom(contours):
    """Even-odd fill of a set of closed contours (font rule is non-zero, but glyphs here are simple)."""
    polys = [Polygon(c).buffer(0) for c in contours]
    polys.sort(key=lambda p: -p.area)
    geom = Polygon()
    for p in polys:
        # a contour inside the current fill is a hole, otherwise it adds material
        if geom.contains(p.representative_point()) and geom.intersection(p).area > 0.9 * p.area:
            geom = geom.difference(p)
        else:
            geom = geom.union(p)
    return geom


_font = None


def font():
    global _font
    if _font is None:
        _font = TTFont(FONT)
    return _font


def glyph_geom(ch):
    f = font()
    gs = f.getGlyphSet()
    name = f.getBestCmap()[ord(ch)]
    pen = FlattenPen(gs)
    gs[name].draw(pen)
    return contours_to_geom(pen.contours)


def text_geom(text, gap=0.07, soften=0.018):
    """Lays out glyphs by their ink boxes with an optical gap; cap height normalised to 1."""
    f = font()
    cap = f["OS/2"].sCapHeight
    x = 0.0
    parts = []
    for ch in text:
        g = affinity.scale(glyph_geom(ch), 1 / cap, 1 / cap, origin=(0, 0))
        minx, miny, maxx, maxy = g.bounds
        g = affinity.translate(g, x - minx, 0)
        parts.append(g)
        x += (maxx - minx) + gap
    geom = unary_union(parts)
    if soften:
        # round off the sharp outer corners a touch so the bevel reads as cast, not cut
        geom = geom.buffer(-soften, quad_segs=10).buffer(soften, quad_segs=10)
        geom = geom.buffer(soften * 1.6, quad_segs=10).buffer(-soften * 1.6, quad_segs=10)
    return center(geom, ref="ink")


# ---------------------------------------------------------------- helpers
def center(geom, ref="ink"):
    minx, miny, maxx, maxy = geom.bounds
    return affinity.translate(geom, -(minx + maxx) / 2, -(miny + maxy) / 2)


def stroke(points, width, cap="round", join="round"):
    capstyle = {"round": 1, "flat": 2, "square": 3}[cap]
    joinstyle = {"round": 1, "mitre": 2, "bevel": 3}[join]
    return LineString(points).buffer(width / 2, quad_segs=24, cap_style=capstyle, join_style=joinstyle)


def arc_points(cx, cy, r, a0, a1, n=96):
    return [(cx + r * math.cos(a0 + (a1 - a0) * i / n), cy + r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


def rounded(geom, r):
    return geom.buffer(-r, quad_segs=16).buffer(r, quad_segs=16)


def rounded_in(geom, r):
    return geom.buffer(r, quad_segs=16).buffer(-r, quad_segs=16)


# ---------------------------------------------------------------- custom glyphs
def door_glyph():
    """Arched doorway with the door swung open toward the viewer. Returns frame, door, light (opening)."""
    w, h, t = 0.62, 1.0, 0.1
    def arch(width, height, y0):
        r = width / 2
        body = box(-r, y0, r, y0 + height - r)
        top = Point(0, y0 + height - r).buffer(r, quad_segs=48)
        return body.union(top)
    outer = arch(w, h, -0.5)
    inner = arch(w - 2 * t, h - t, -0.5)
    frame = rounded(outer.difference(inner), 0.012)
    # open door: a slab hinged on the left jamb, seen in perspective, swinging out to the left
    jx = -(w / 2 - t)
    top_y = 0.5 - t - 0.02
    bot_y = -0.5
    door = Polygon([(jx - 0.015, bot_y), (jx - 0.015, top_y - 0.05), (jx - 0.30, top_y - 0.16), (jx - 0.30, bot_y - 0.07)])
    door = rounded(door, 0.02)
    knob = Point(jx - 0.24, -0.06).buffer(0.032, quad_segs=16)
    door_hole = door.difference(knob.buffer(0.018))
    light = inner.buffer(-0.005)
    # a slim threshold step under the doorway
    step = rounded(box(-w / 2 - 0.05, -0.56, w / 2 + 0.05, -0.5), 0.02)
    g = {"frame": frame.union(step), "door": door_hole, "knob": knob, "light": light}
    # centre the whole group
    allg = unary_union(list(g.values()))
    minx, miny, maxx, maxy = allg.bounds
    dx, dy = -(minx + maxx) / 2, -(miny + maxy) / 2
    return {k: affinity.translate(v, dx, dy) for k, v in g.items()}


def wave_glyph():
    """A breaking wave: the face rises from the left, rolls over the crest and spirals inward,
    with a calm swell line underneath."""
    def bez(p0, p1, p2, p3, n=40):
        out = []
        for i in range(n + 1):
            t = i / n
            mt = 1 - t
            out.append((mt**3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t**3 * p3[0],
                        mt**3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t**3 * p3[1]))
        return out
    cx, cy, r0, k = 0.16, 0.06, 0.32, 0.19
    a0 = math.radians(135)
    sx, sy = cx + r0 * math.cos(a0), cy + r0 * math.sin(a0)
    lead = bez((-0.62, -0.30), (-0.38, -0.29), (sx - 0.21, sy - 0.21), (sx, sy))
    spiral = []
    sweep = math.radians(395)
    for i in range(1, 181):
        a = a0 - sweep * i / 180
        r = r0 * math.exp(-k * (a0 - a))
        spiral.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    main = stroke(lead + spiral, 0.145)
    swell = [(-0.62 + 1.24 * i / 80, -0.50 + 0.04 * math.sin(i / 80 * math.pi * 2.0)) for i in range(81)]
    geom = unary_union([main, stroke(swell, 0.12)])
    geom = center(geom)
    minx, miny, maxx, maxy = geom.bounds
    s = 1.0 / max(maxx - minx, maxy - miny)
    return affinity.scale(geom, s, s, origin=(0, 0))


def check_glyph():
    g = stroke([(-0.40, 0.02), (-0.12, -0.27), (0.42, 0.30)], 0.19)
    return center(g)


def shield_outline(width=1.0, height=1.18):
    """Heater-style shield: softly arched top, straight flanks, convex sweep into a softened point."""
    hw = width / 2
    top = height / 2
    pts = []
    for i in range(0, 41):
        t = i / 40
        pts.append((-hw + width * t, top - 0.05 + 0.05 * math.sin(math.pi * t)))
    y_f = top - 0.40 * height
    p0, p1, p2, p3 = (hw, y_f), (hw, y_f - 0.30 * height), (0.30 * hw, -top + 0.10), (0, -top)
    right = []
    for i in range(0, 61):
        t = i / 60
        mt = 1 - t
        right.append((mt**3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t**3 * p3[0],
                      mt**3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t**3 * p3[1]))
    left = [(-x, y) for (x, y) in reversed(right[:-1])]
    poly = Polygon(pts + right + left).buffer(0)
    poly = rounded(poly, 0.07)
    return center(poly)


def g_mark_path(r=0.5, a_start=40, a_end=-360 + 2, bar_in=0.06, n=180):
    """Centre line of the ring-G (for the tube build): an arc from the upper right, counter-clockwise
    around to the right-hand side at mid height, then a short bar into the centre."""
    pts = []
    a0 = math.radians(a_start)
    a1 = math.radians(a_start + 320)
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n
        pts.append((r * math.cos(a), r * math.sin(a)))
    # last arc point is at angle 360 (= 0, right middle). Bar goes inward
    end = pts[-1]
    for i in range(1, 21):
        t = i / 20
        pts.append((end[0] + (bar_in - end[0]) * t, end[1]))
    return pts


def g_mark_geom(width=0.24):
    return stroke(g_mark_path(), width, cap="round", join="round")


# ---------------------------------------------------------------- serialisation
def polys(geom):
    if geom.is_empty:
        return []
    if isinstance(geom, Polygon):
        geoms = [geom]
    elif isinstance(geom, MultiPolygon):
        geoms = list(geom.geoms)
    else:
        geoms = [g for g in getattr(geom, "geoms", []) if isinstance(g, Polygon)]
    out = []
    for p in geoms:
        p = p.simplify(0.0008, preserve_topology=True)
        ext = list(p.exterior.coords)[:-1]
        if Polygon(ext).exterior.is_ccw is False:
            ext = ext[::-1]
        holes = []
        for h in p.interiors:
            hc = list(h.coords)[:-1]
            if Polygon(hc).exterior.is_ccw:
                hc = hc[::-1]
            holes.append([[round(x, 5), round(y, 5)] for x, y in hc])
        out.append({"outer": [[round(x, 5), round(y, 5)] for x, y in ext], "holes": holes})
    return out


def build():
    shapes = {}
    for label, txt in [("num_3", "3"), ("num_7", "7"), ("num_21", "21"), ("num_66", "66"), ("num_100", "100"),
                       ("qmark", "?"), ("letter_G", "G")]:
        shapes[label] = polys(text_geom(txt))
    door = door_glyph()
    for k, v in door.items():
        shapes["door_" + k] = polys(v)
    shapes["wave"] = polys(wave_glyph())
    shapes["check"] = polys(check_glyph())
    sh = shield_outline()
    shapes["shield"] = polys(sh)
    shapes["shield_inner"] = polys(sh.buffer(-0.075, quad_segs=24))
    shapes["shield_frame"] = polys(sh.difference(sh.buffer(-0.075, quad_segs=24)))
    shapes["g_mark"] = polys(g_mark_geom())
    shapes["g_path"] = [{"outer": [[round(x, 5), round(y, 5)] for x, y in g_mark_path()], "holes": []}]
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as fh:
        json.dump(shapes, fh, separators=(",", ":"))
    return shapes


def preview(shapes, path):
    from PIL import Image, ImageDraw
    names = [k for k in shapes if k != "g_path"]
    cell = 220
    cols = 6
    rows = (len(names) + cols - 1) // cols
    im = Image.new("RGB", (cols * cell, rows * cell), (20, 20, 24))
    d = ImageDraw.Draw(im)
    for i, n in enumerate(names):
        ox, oy = (i % cols) * cell + cell / 2, (i // cols) * cell + cell / 2
        s = cell * 0.4
        for p in shapes[n]:
            d.polygon([(ox + x * s, oy - y * s) for x, y in p["outer"]], fill=(230, 200, 120))
            for h in p["holes"]:
                d.polygon([(ox + x * s, oy - y * s) for x, y in h], fill=(20, 20, 24))
        d.text((ox - cell / 2 + 6, oy - cell / 2 + 6), n, fill=(160, 160, 170))
    im.save(path)


if __name__ == "__main__":
    s = build()
    print("wrote", OUT, sum(len(v) for v in s.values()), "polygons")
    if len(sys.argv) > 1:
        preview(s, sys.argv[1])
