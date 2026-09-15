"""Cut the Halloween decorations out of their flat backdrops.

The stock art arrives as flat-backdrop sheets -- nine framed portraits on sage
green, nine jack-o'-lanterns on amber, a cauldron and a hat on white. This reads
the backdrop from the border, flood-fills it away, and then splits what is left
into its separate objects, so each decoration becomes its own transparent PNG
that can be placed in the room on its own.

    python3 tools/cut_halloween.py      # needs Pillow and numpy

Writes content/art/halloween/*.png from content/art/halloween/source/*.
Those cut-outs are the originals tools/build_assets.py reduces onto the room's
art grid; nothing here is loaded by the page.
"""
import os
from collections import deque

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
SRC = os.path.join(REPO, "content", "art", "halloween", "source")
OUT = os.path.join(REPO, "content", "art", "halloween")


def backdrop_mask(rgb, tol):
    """Flood-fill the flat backdrop inward from every border pixel.

    Seeded from the border rather than by matching a colour globally, so a
    pumpkin that happens to share a tone with the backdrop is not punched
    through -- only backdrop actually connected to the edge is removed.
    """
    a = rgb.astype(int)
    h, w, _ = a.shape
    seed = a[2, 2]
    visited = np.zeros((h, w), bool)
    dq = deque()
    for x in range(w):
        dq.append((0, x))
        dq.append((h - 1, x))
    for y in range(h):
        dq.append((y, 0))
        dq.append((y, w - 1))
    while dq:
        y, x = dq.popleft()
        if y < 0 or x < 0 or y >= h or x >= w or visited[y, x]:
            continue
        if np.abs(a[y, x] - seed).max() > tol:
            continue
        visited[y, x] = True
        dq.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
    return visited


def components(mask, min_area):
    """Label the separate objects left behind, largest first.

    Eight-connected, so a frame's drop shadow or a hat's brim tip joins the body
    it belongs to rather than becoming a speck of its own.
    """
    h, w = mask.shape
    seen = np.zeros((h, w), bool)
    found = []
    for sy in range(h):
        row = mask[sy]
        for sx in range(w):
            if not row[sx] or seen[sy, sx]:
                continue
            dq = deque([(sy, sx)])
            seen[sy, sx] = True
            px = []
            while dq:
                y, x = dq.popleft()
                px.append((y, x))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] \
                                and not seen[ny, nx]:
                            seen[ny, nx] = True
                            dq.append((ny, nx))
            if len(px) >= min_area:
                ys = np.array([p[0] for p in px])
                xs = np.array([p[1] for p in px])
                blob = np.zeros((h, w), bool)
                blob[ys, xs] = True
                found.append((len(px), (xs.min(), ys.min(),
                                        xs.max() + 1, ys.max() + 1), blob))
    found.sort(key=lambda f: -f[0])
    return found


def cut(name, crop=None, tol=34, min_area=2000, take=None, order=None):
    """Isolate one sheet and write each object it holds as its own PNG.

    `take` limits how many objects to keep (largest first); `order` renames them
    in reading order across the sheet instead, which is how a grid of nine wants
    to be numbered.
    """
    path = os.path.join(SRC, name)
    im = Image.open(path).convert("RGB")
    if crop:
        im = im.crop(crop)
    rgb = np.array(im)

    mask = ~backdrop_mask(rgb, tol)
    found = components(mask, min_area)
    if take:
        found = found[:take]

    if order:
        # Reading order: group by row band, then left to right within a row.
        rows = order
        found.sort(key=lambda f: f[1][1])
        per = max(1, len(found) // rows)
        ordered = []
        for r in range(rows):
            band = found[r * per:(r + 1) * per] if r < rows - 1 \
                else found[r * per:]
            band.sort(key=lambda f: f[1][0])
            ordered.extend(band)
        found = ordered

    stem = os.path.splitext(name)[0]
    written = []
    for i, (area, box, blob) in enumerate(found, 1):
        rgba = np.dstack([rgb, np.where(blob, 255, 0).astype(np.uint8)])
        piece = Image.fromarray(rgba).crop(box)
        out_name = f"{stem}-{i}.png" if len(found) > 1 else f"{stem}.png"
        piece.save(os.path.join(OUT, out_name))
        written.append((out_name, piece.size, area))
    return written


os.makedirs(OUT, exist_ok=True)

SHEETS = [
    # Nine framed portraits on sage green, laid out in four rough rows.
    dict(name="portraits.jpg", tol=40, min_area=3000, order=4),
    # The amber sheet carries a "designed by freepik" credit under the bottom
    # row; cropping it off keeps the credit out of the art (it is recorded in
    # the README instead) and stops the lettering being read as a tenth object.
    dict(name="jackolanterns.jpg", crop=(0, 0, 626, 556), tol=40,
         min_area=2500, order=3),
    # The cauldron is surrounded by loose sparkles, which are their own tiny
    # islands -- keeping only the largest object drops them.
    dict(name="cauldron.jpg", tol=30, min_area=4000, take=1),
    dict(name="witch-hat.png", tol=30, min_area=4000, take=1),
]

for sheet in SHEETS:
    for out_name, size, area in cut(**sheet):
        print(f"{out_name:24} {size[0]:>4}x{size[1]:<4}  {area:>7} px")
