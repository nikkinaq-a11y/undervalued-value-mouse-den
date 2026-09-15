"""Read a hand-made placement image back into DECOR numbers.

Move the decorations around over a screenshot of the room in an image editor,
flatten, and save the result as `content/reference/holiday-placement.png`. This
finds the den inside that image, works out which pieces were placed and where,
and prints the `DECOR` table that reproduces it.

    python3 tools/read_placement.py        # needs Pillow and numpy

How it works: every cut-out is matched against the whole den at every plausible
size, but a match only counts where the placement image actually differs from
the clean room. The room's own warm texture matches a pumpkin about as readily
as a pumpkin does, so correlation alone finds decorations everywhere; requiring
that the pixels changed is what makes it precise. Subtracting the room is also
why the pieces do not need to be segmented out of it first -- overlapping
decorations, and decorations sitting on the flickering fire, both defeated that.

Whatever changed but matches nothing is reported and left alone, which is what
happens to the mouse and to the fireplace, since the screenshot caught a
different flame frame than the one the clean room ships.
"""
import os
import glob
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)

ART_W, ART_H = 384, 216
SHOT = os.path.join(REPO, "content", "reference", "holiday-placement.png")
ROOM = os.path.join(REPO, "assets", "images", "den_bg.png")
CUTS = os.path.join(REPO, "content", "art", "halloween")

DEN_SEARCH = 2        # find the den at half resolution; it is a coarse job
DIFF_THRESHOLD = 40   # per-channel, out of 255
WORK_DOWN = 2         # match at half the den's resolution; plenty, and 4x faster
ART_H_RANGE = range(6, 40)   # candidate heights, in room art pixels
MIN_SCORE = 0.62      # correlation below this is texture, not a decoration
MIN_COVER = 0.62      # this much of the piece must land on changed pixels
# Two hits sharing this much of the smaller one are treated as the same find.
# Generous on purpose: decorations get placed deliberately overlapping -- the
# pumpkin leaning on the cauldron shares half its box with it -- and a tighter
# figure throws the second one away. Re-finds of one piece at a neighbouring
# size overlap far more than this, so they are still collapsed.
OVERLAP = 0.6


def rfft_pair(img, shape):
    return np.fft.rfft2(img, shape), np.fft.rfft2(img ** 2, shape)


def masked_ncc(img, tpl, mask, cache=None, extra=None):
    """Correlate only the pixels the mask keeps, at every offset.

    `cache` holds the image transforms and the padded shape they were made at;
    both have to travel together, since computing the shape per template instead
    is what silently made the cached transforms the wrong size. `extra` is a
    second image (here, the changed-pixel mask) averaged under the same template
    mask and returned alongside, which costs one more transform rather than a
    whole second pass.
    """
    ih, iw = img.shape
    th, tw = tpl.shape
    if th > ih or tw > iw:
        return None
    if cache is None:
        H = 1 << int(np.ceil(np.log2(ih + th)))
        W = 1 << int(np.ceil(np.log2(iw + tw)))
        fi, fi2 = rfft_pair(img, (H, W))
        fx = np.fft.rfft2(extra, (H, W)) if extra is not None else None
    else:
        fi, fi2, fx, H, W = cache
    n = mask.sum()
    if n < 12:
        return None
    tm = tpl * mask
    t_sum = tm.sum()
    t_var = (tpl ** 2 * mask).sum() - t_sum ** 2 / n
    if t_var <= 1e-6:
        return None

    fm = np.fft.rfft2(mask[::-1, ::-1], (H, W))

    def take(f):
        return np.fft.irfft2(f, (H, W))[th - 1:ih, tw - 1:iw]

    s1 = take(fi * fm)
    s2 = take(fi2 * fm)
    c = take(fi * np.fft.rfft2(tm[::-1, ::-1], (H, W)))
    var = s2 - s1 ** 2 / n
    var[var < 1e-6] = 1e-6
    score = (c - s1 * t_sum / n) / (np.sqrt(var) * np.sqrt(t_var))
    if fx is None:
        return score, None
    return score, take(fx * fm) / n


def find_den(shot_gray):
    """Locate the room inside the placement image, and at what size."""
    room = Image.open(ROOM).convert("L")
    w0, h0 = shot_gray.width // DEN_SEARCH, shot_gray.height // DEN_SEARCH
    small = np.asarray(shot_gray.resize((w0, h0), Image.BOX), float)
    best = None
    for w in range(300, min(w0, 1600), 4):
        h = round(w * ART_H / ART_W)
        if h >= h0:
            break
        tpl = np.asarray(room.resize((w, h), Image.BOX), float)
        out = masked_ncc(small, tpl, np.ones_like(tpl))
        if out is None:
            continue
        sc = out[0]
        i = np.unravel_index(np.argmax(sc), sc.shape)
        if best is None or sc[i] > best[0]:
            best = (sc[i], i[1], i[0], w, h)
    sc, x, y, w, h = best
    return sc, x * DEN_SEARCH, y * DEN_SEARCH, w * DEN_SEARCH, h * DEN_SEARCH


def main():
    shot = Image.open(SHOT).convert("RGB")
    score, dx, dy, dw, dh = find_den(shot.convert("L"))
    print(f"den found at {score:.3f}: ({dx}, {dy}) {dw}x{dh}")

    den_rgb = shot.crop((dx, dy, dx + dw, dy + dh))
    clean = Image.open(ROOM).convert("RGB").resize((dw, dh), Image.NEAREST)
    changed = np.abs(np.asarray(den_rgb, float)
                     - np.asarray(clean, float)).max(axis=2) > DIFF_THRESHOLD
    print(f"{changed.mean() * 100:.1f}% of the room changed")

    # Everything from here works at half the den's resolution.
    w, h = dw // WORK_DOWN, dh // WORK_DOWN
    gray = np.asarray(den_rgb.convert("L").resize((w, h), Image.BOX), float)
    diff = np.asarray(Image.fromarray((changed * 255).astype(np.uint8))
                      .resize((w, h), Image.BOX), float) / 255.0
    px_per_art = h / ART_H

    biggest = round(max(ART_H_RANGE) * px_per_art) + 2
    H = 1 << int(np.ceil(np.log2(h + biggest)))
    W = 1 << int(np.ceil(np.log2(w + biggest)))
    fi, fi2 = rfft_pair(gray, (H, W))
    cache = (fi, fi2, np.fft.rfft2(diff, (H, W)), H, W)

    hits = []
    for path in sorted(glob.glob(os.path.join(CUTS, "*.png"))):
        name = os.path.splitext(os.path.basename(path))[0]
        art = Image.open(path).convert("RGBA")
        art = art.crop(art.split()[-1].getbbox())
        for art_h in ART_H_RANGE:
            th = max(4, round(art_h * px_per_art))
            tw = max(4, round(th * art.size[0] / art.size[1]))
            if th >= h or tw >= w:
                continue
            piece = art.resize((tw, th), Image.BOX)
            tpl = np.asarray(piece.convert("L"), float)
            m = (np.asarray(piece.split()[-1]) > 128).astype(float)
            out = masked_ncc(gray, tpl, m, cache)
            if out is None:
                continue
            sc, cover = out
            ok = (sc >= MIN_SCORE) & (cover >= MIN_COVER)
            if not ok.any():
                continue
            gated = np.where(ok, sc, -1)
            i = np.unravel_index(np.argmax(gated), gated.shape)
            hits.append(dict(name=name, art_h=art_h, score=float(sc[i]),
                             cover=float(cover[i]),
                             rank=float(sc[i]) * float(cover[i]),
                             x=int(i[1]), y=int(i[0]), w=tw, h=th))

    # Rank on correlation *and* coverage together, not correlation alone. A
    # small piece can out-correlate a big one on a corner of it while covering
    # barely half the changed pixels -- which is how a six-pixel witch hat and a
    # ghost frame between them claimed the cauldron and left it undetected.
    hits.sort(key=lambda d: -d["rank"])
    kept = []
    for hit in hits:
        clash = False
        for k in kept:
            ox = max(0, min(hit["x"] + hit["w"], k["x"] + k["w"])
                     - max(hit["x"], k["x"]))
            oy = max(0, min(hit["y"] + hit["h"], k["y"] + k["h"])
                     - max(hit["y"], k["y"]))
            if ox * oy > OVERLAP * min(hit["w"] * hit["h"], k["w"] * k["h"]):
                clash = True
                break
        if not clash:
            kept.append(hit)

    kept.sort(key=lambda d: (round((d["y"] + d["h"]) / px_per_art),
                             round(d["x"] / px_per_art)))
    print(f"\n{len(kept)} decorations placed\n")
    print("DECOR = {")
    print("    # (source file, height in art px, centre x, bottom y)")
    counts = {}
    for hit in kept:
        stem = hit["name"].split("-")[0]
        if stem == "witch":
            stem = "hat"
        counts[stem] = counts.get(stem, 0) + 1
        key = f"{stem}_{counts[stem]}"
        cx = (hit["x"] + hit["w"] / 2) / px_per_art
        by = (hit["y"] + hit["h"]) / px_per_art
        pad = " " * max(1, 12 - len(key))
        print(f'    "{key}":{pad}("{hit["name"]}.png", {hit["art_h"]}, '
              f'{round(cx)}, {round(by)}),'
              f'   # match {hit["score"]:.2f} cover {hit["cover"]:.2f}')
    print("}")


if __name__ == "__main__":
    main()
