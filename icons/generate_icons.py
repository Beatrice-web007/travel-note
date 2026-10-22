"""生成旅途记 App 的 PNG 图标（192/512/180/maskable）。依赖 Pillow。"""
import math
import os

from PIL import Image, ImageDraw

ACCENT = (196, 71, 46)      # #c4472e
PAPER = (245, 239, 227)     # #f5efe3


def _dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def _dashed_bezier(d, sx, sy, ex, ey, color, width, dash, gap):
    cx, cy = (sx + ex) / 2 + 6, (sy + ey) / 2
    pts = []
    for i in range(201):
        t = i / 200
        x = (1 - t) ** 2 * sx + 2 * (1 - t) * t * cx + t ** 2 * ex
        y = (1 - t) ** 2 * sy + 2 * (1 - t) * t * cy + t ** 2 * ey
        pts.append((x, y))
    i = 0
    n = len(pts)
    while i < n - 1:
        j, seg = i, 0.0
        while j < n - 1 and seg < dash:
            seg += _dist(pts[j], pts[j + 1])
            j += 1
        d.line(pts[i:j + 1], fill=color, width=width)
        k, seg = j, 0.0
        while k < n - 1 and seg < gap:
            seg += _dist(pts[k], pts[k + 1])
            k += 1
        i = k


def make_icon(size, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable:
        d.rectangle([0, 0, size, size], fill=ACCENT)
        inner = int(size * 0.18)
    else:
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=ACCENT)
        inner = int(size * 0.16)

    sx, sy = inner + size * 0.10, size - inner - size * 0.12
    ex, ey = size - inner - size * 0.10, inner + size * 0.10
    _dashed_bezier(d, sx, sy, ex, ey, PAPER,
                   width=int(size * 0.045), dash=int(size * 0.03), gap=int(size * 0.05))

    r1 = size * 0.05
    d.ellipse([sx - r1, sy - r1, sx + r1, sy + r1], fill=PAPER)
    r2 = size * 0.078
    d.ellipse([ex - r2, ey - r2, ex + r2, ey + r2], fill=PAPER)
    r3 = size * 0.036
    d.ellipse([ex - r3, ey - r3, ex + r3, ey + r3], fill=ACCENT)
    return img


def main():
    out_dir = os.path.dirname(os.path.abspath(__file__))
    for name, size, maskable in [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-180.png", 180, False),
        ("icon-maskable-512.png", 512, True),
    ]:
        path = os.path.join(out_dir, name)
        make_icon(size, maskable).save(path, "PNG")
        print("wrote", path)


if __name__ == "__main__":
    main()
