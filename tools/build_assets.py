"""Rebuild every image asset for the mouse den on one shared art-pixel grid.

Everything -- room, lighting states, fireplace frames, TV overlay, and mouse
poses -- is reduced to the same ART_W x ART_H grid and the same colour palette,
so no element looks more (or less) pixelated than any other, and no colour
shifts between animation frames.
"""
import os
from PIL import Image
import numpy as np
from collections import deque


def extract(path, tol=34):
    """Flood-fill the flat backdrop from the image border to transparency,
    then crop to the subject's bounding box."""
    im = Image.open(path).convert('RGB')
    a = np.array(im).astype(int)
    h, w, _ = a.shape
    seed = a[2, 2]
    visited = np.zeros((h, w), bool)
    dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            dq.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        if y < 0 or x < 0 or y >= h or x >= w or visited[y, x]:
            continue
        if np.abs(a[y, x] - seed).max() > tol:
            continue
        visited[y, x] = True
        dq.extend(((y+1,x),(y-1,x),(y,x+1),(y,x-1)))
    rgba = np.dstack([a.astype(np.uint8),
                      np.where(visited, 0, 255).astype(np.uint8)])
    out = Image.fromarray(rgba)
    return out.crop(out.split()[-1].getbbox())


# Originals live in the repo under content/art, so a clone can rebuild every
# asset from scratch. Built images land in assets/images.
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
SRC = os.path.join(REPO, "content", "art")
OUT = os.path.join(REPO, "assets", "images")

ART_W, ART_H = 384, 216          # the room's art-pixel grid
STANDING_ART_H = 36              # standing mouse height, in those same art px
PALETTE_COLORS = 224

# Comparing the lit and lights-off room art, every surface away from a light
# source is the lit render times 0.55, flat across all three channels. Applying
# that same factor to the poses is what keeps the mouse in the room's light
# instead of glowing against it.
DIM = 0.55

# Whole-room scenes: the same painting as the den with the mouse painted into
# it, pixel-registered to the background (offset 0,0, zero difference on every
# static region). Each carries its own flame and firelight, so they are shown as
# complete frames rather than composited over the room -- and because they are
# the same room, cross-fading to one reads as the mouse appearing, not as a cut.
SCENES = {
    "scene_fire": ["scene-fire-1.png",   # standing at the hearth with a log
                   "scene-fire-2.png",   # setting it into the fire
                   "scene-fire-3.png"],   # sitting back to watch it catch
    "scene_cocoa": ["scene-cocoa-1.png",        # mug held at the chest
                    "scene-cocoa-2.png"],       # raised for a sip, steam and all
    # The movie pair. Frame 1 is registered to the lit room and frame 2 to the
    # lights-off room, so the fade between them is the lamps going down with the
    # mouse already sitting there -- the only fade in the piece.
    "scene_couch": ["scene-couch-1.png",
                    "scene-couch-2.png"],
}

# The television, while a movie is on. Both painted dark-room frames show the
# same still picture, so the motion has to be generated -- but only for the
# screen glass, which is 26x27 art px, so these are tiny files rather than more
# copies of the whole room. Each frame nudges the picture a pixel and breathes
# the brightness, which at this size is all a moving picture needs to read as
# one. Shifted at source resolution and re-downsampled, so the art pixels really
# do change rather than being smeared.
# Just the lit picture, read off the art grid a pixel at a time -- an earlier
# guess at this rect took in the bezel, the antenna base and the shelf, so the
# whole television shifted about instead of only the screen.
MOVIE_SCREEN_SRC = (420, 231, 480, 274)     # the glass, in the 1366x768 source
MOVIE_SCREEN_ART = (118, 65, 135, 77)       # the same rect on the art grid
MOVIE_FLICKER = [                           # (dx, dy, brightness)
    (0, 0, 1.00),
    (2, 0, 1.13),
    (-2, 1, 0.89),
    (3, -1, 1.07),
    (-1, 2, 1.17),
    (1, 1, 0.86),
    (-3, -1, 1.05),
    (0, -2, 0.94),
]

ROOM_LIT   = "room-lit.png"          # lights on, TV on, fire "A"
ROOM_DARK  = "room-dark.jpg" # lights off, TV on
FIRE_B     = "fire-frame-b.jpg"                     # second flame, registered crop
TV_OFF     = "tv-off.png"             # TV dark, registered crop

# Poses may be declared two ways:
#   (file, old_w, old_h)  -- dimensions the previous build tuned by hand, given
#                            against its 82-unit standing mouse and rescaled to
#                            the current ruler. front/side/back share one height
#                            so the mouse never resizes as it turns.
#   (file, height_ratio)  -- for new art: how tall this pose stands relative to
#                            the standing mouse (a seated pose is ~0.85). Width
#                            follows the source's own proportions, so there is
#                            nothing to measure by hand.
OLD_H = 82
POSES = {
    "front": ("pose-front.png", 49, 82),
    "side":  ("pose-side.png", 52, 82),
    "back":  ("pose-back.png", 44, 82),
    "walk":  ("pose-walk.png", 67, 78),
    "lie":   ("pose-lie.png", 70, 42),
}

def s(name):
    return os.path.join(SRC, name)

def to_grid(im):
    """Full-frame source -> the room's art grid."""
    return im.convert("RGB").resize((ART_W, ART_H), Image.BOX)

def overlay_onto(base, crop_src, box):
    """Paste a registered crop onto a copy of the full-frame base."""
    out = base.copy()
    out.paste(Image.open(s(crop_src)).convert("RGB").crop(box), box[:2])
    return out

# --- Full-frame states, all on the grid -------------------------------------
lit  = Image.open(s(ROOM_LIT)).convert("RGB")
dark = Image.open(s(ROOM_DARK)).convert("RGB")

# The .jpg crops carry a few pixels of white bleed at their edges, so inset.
fire_b_frame = overlay_onto(lit, FIRE_B, (334, 278, 556, 452))
tv_off_frame = overlay_onto(lit, TV_OFF, (349, 168, 537, 301))

frames = {
    "lit":    to_grid(lit),
    "dark":   to_grid(dark),
    "fire_b": to_grid(fire_b_frame),
    "tv_off": to_grid(tv_off_frame),
}

# --- Mouse poses ------------------------------------------------------------
poses = {}
for name, spec in POSES.items():
    art = extract(s(spec[0]))
    if len(spec) == 3:
        _, ow, oh = spec
        w = max(1, round(ow * STANDING_ART_H / OLD_H))
        h = max(1, round(oh * STANDING_ART_H / OLD_H))
    else:
        _, ratio = spec
        h = max(1, round(STANDING_ART_H * ratio))
        w = max(1, round(h * art.size[0] / art.size[1]))
    poses[name] = art.resize((w, h), Image.BOX)

def dim(p):
    out = p.copy()
    r, g, b, a = out.split()
    lut = [min(255, round(v * DIM)) for v in range(256)]
    return Image.merge("RGBA", (r.point(lut), g.point(lut), b.point(lut), a))

poses_dark = {k: dim(v) for k, v in poses.items()}

# --- One palette for everything ---------------------------------------------
# Room pixels vastly outnumber mouse pixels, so median-cut would spend the whole
# palette on the room and leave the mouse muddy. Tiling the poses up to roughly
# room-scale gives the character a fair share of the colour budget.
room_px = ART_W * ART_H * len(frames)
pose_px = sum(p.size[0] * p.size[1] for p in poses.values()) * 2
repeat = max(1, round(room_px * 0.12 / pose_px))

samples = [f.tobytes() for f in frames.values()]
all_poses = list(poses.values()) + list(poses_dark.values())
strip_w = sum(p.size[0] for p in all_poses)
strip_h = max(p.size[1] for p in all_poses)
strip = Image.new("RGB", (strip_w, strip_h), (0, 0, 0))
x = 0
for p in all_poses:
    flat = Image.new("RGB", p.size, (0, 0, 0))
    flat.paste(p, (0, 0), p)
    strip.paste(flat, (x, 0))
    x += p.size[0]

montage = Image.new("RGB", (ART_W, ART_H * len(frames) + strip_h * repeat))
y = 0
for f in frames.values():
    montage.paste(f, (0, y)); y += ART_H
for _ in range(repeat):
    montage.paste(strip.resize((ART_W, strip_h), Image.NEAREST), (0, y)); y += strip_h

palette_img = montage.quantize(colors=PALETTE_COLORS, method=Image.MEDIANCUT,
                               dither=Image.NONE)

def apply_palette(im):
    return im.quantize(palette=palette_img, dither=Image.NONE).convert("RGB")

qframes = {k: apply_palette(v) for k, v in frames.items()}

# --- Overlays: crop only the art pixels that actually change ----------------
def diff_box(a, b, pad=1):
    d = np.abs(np.array(a).astype(int) - np.array(b).astype(int)).max(axis=2)
    ys, xs = np.where(d > 0)
    return (max(0, xs.min() - pad), max(0, ys.min() - pad),
            min(ART_W, xs.max() + 1 + pad), min(ART_H, ys.max() + 1 + pad))

os.makedirs(OUT, exist_ok=True)
boxes = {}
sizes = {}

qframes["lit"].save(os.path.join(OUT, "den_bg.png"))
qframes["dark"].save(os.path.join(OUT, "den_bg_dark.png"))

for key, fname in (("fire_b", "fire_b.png"), ("tv_off", "tv_off.png")):
    box = diff_box(qframes["lit"], qframes[key])
    qframes[key].crop(box).save(os.path.join(OUT, fname))
    # frame A of the fire is the room's own painted flame, cropped to match
    if key == "fire_b":
        qframes["lit"].crop(box).save(os.path.join(OUT, "fire_a.png"))
    boxes[fname] = box

# --- Poses, quantised against the same palette, alpha preserved -------------
for suffix, table in (("", poses), ("_dark", poses_dark)):
    for name, p in table.items():
        rgb = Image.new("RGB", p.size, (0, 0, 0))
        rgb.paste(p, (0, 0), p)
        q = apply_palette(rgb).convert("RGBA")
        q.putalpha(p.split()[-1].point(lambda v: 255 if v > 128 else 0))
        q.save(os.path.join(OUT, f"mouse_{name}{suffix}.png"))
        sizes[name] = p.size

# --- Walk cycles --------------------------------------------------------------
# The mouse walks by switching frames rather than gliding, so every frame of a
# cycle has to hold the character still where it should be still. Each frame is
# set on one shared canvas with the head at its centre and the feet on its
# bottom edge: the legs and tail change from frame to frame, the head does not
# jump about, and the element never changes size mid-stride.
#
# The six side frames were painted at one scale on one sheet, so they share one
# scale factor too; sizing each to its own bounding box would make the mouse
# grow and shrink as its legs open and close. They face right on the sheet and
# are mirrored here, since every sprite faces left unflipped.
#
# The front and back walks are one frame each, with a foot forward. The page
# mirrors them to put the other foot forward, which is why they are centred on
# the head: the mirror turns round that point and the head stays put.
#
# These are quantised against the room's palette but deliberately left out of
# sampling it, so adding them leaves every other asset byte-identical.
WALK_CYCLES = {
    "walk_side": ([f"pose-walk-side-{i}.png" for i in range(1, 7)], True),
    "walk_front": (["pose-walk-front.png"], False),
    "walk_back": (["pose-walk-back.png"], False),
}


def head_x(art):
    """Horizontal centre of the top third of the silhouette -- the head and hat,
    which stay put while the legs, arms and tail swing."""
    alpha = np.array(art.split()[-1]) > 128
    top = alpha[: max(1, alpha.shape[0] // 3)]
    return float(np.where(top)[1].mean())


for cycle, (files, mirror) in WALK_CYCLES.items():
    arts = [extract(s(f)) for f in files]
    if mirror:
        arts = [a.transpose(Image.FLIP_LEFT_RIGHT) for a in arts]
    heads = [head_x(a) for a in arts]
    half = max(max(hx, a.size[0] - hx) for a, hx in zip(arts, heads))
    src_h = max(a.size[1] for a in arts)
    src_w = int(np.ceil(half * 2))
    scale = STANDING_ART_H / src_h
    w = max(1, round(src_w * scale))
    for i, (art, hx) in enumerate(zip(arts, heads), 1):
        canvas = Image.new("RGBA", (src_w, src_h), (0, 0, 0, 0))
        canvas.paste(art, (round(src_w / 2 - hx), src_h - art.size[1]), art)
        small = canvas.resize((w, STANDING_ART_H), Image.BOX)
        name = f"{cycle}_{i}" if len(files) > 1 else cycle
        for suffix, img in (("", small), ("_dark", dim(small))):
            rgb = Image.new("RGB", img.size, (0, 0, 0))
            rgb.paste(img, (0, 0), img)
            q = apply_palette(rgb).convert("RGBA")
            q.putalpha(img.split()[-1].point(lambda v: 255 if v > 128 else 0))
            q.save(os.path.join(OUT, f"mouse_{name}{suffix}.png"))
        sizes[name] = small.size
    print(f"{cycle}: {len(files)} frame(s), {w}x{STANDING_ART_H}")

# --- Whole-room scenes ------------------------------------------------------
# Quantised against the room's own palette rather than one of their own: they
# are the same room, so the palette already covers them, and reusing it keeps
# every frame consistent with the den without diluting its colour budget.
for scene, files in SCENES.items():
    for i, name in enumerate(files, 1):
        apply_palette(to_grid(Image.open(s(name)))).save(
            os.path.join(OUT, f"{scene}_{i}.png"))
    print(f"scene {scene}: {len(files)} frames")

# --- The television, playing --------------------------------------------------
def nudged(screen, dx, dy, gain):
    a = np.array(screen).astype(float)
    a = np.roll(np.roll(a, dy, axis=0), dx, axis=1)
    # replicate the edge rather than wrapping the picture round the bezel
    if dy > 0:
        a[:dy] = a[dy]
    elif dy < 0:
        a[dy:] = a[dy - 1]
    if dx > 0:
        a[:, :dx] = a[:, dx:dx + 1]
    elif dx < 0:
        a[:, dx:] = a[:, dx - 1:dx]
    return Image.fromarray(np.clip(a * gain, 0, 255).astype(np.uint8))

movie_room = Image.open(s(SCENES["scene_couch"][1])).convert("RGB")
glass = movie_room.crop(MOVIE_SCREEN_SRC)
for i, (dx, dy, gain) in enumerate(MOVIE_FLICKER, 1):
    frame = movie_room.copy()
    frame.paste(nudged(glass, dx, dy, gain), MOVIE_SCREEN_SRC[:2])
    apply_palette(to_grid(frame)).crop(MOVIE_SCREEN_ART).save(
        os.path.join(OUT, f"tv_movie_{i}.png"))
print(f"tv_movie: {len(MOVIE_FLICKER)} frames from {MOVIE_SCREEN_ART}")

# --- Holiday decorations ------------------------------------------------------
# Stock art, cut off its flat backdrop by tools/cut_halloween.py, reduced onto
# the room's own art grid so a pumpkin is drawn in the same size pixel as the
# couch behind it. That shared grid is what makes them read as part of the
# painting rather than stickers on top of it -- see "The scale rule".
#
# They are the one thing in the build that does NOT share the room's palette.
# The reason the room and the mouse must share one is cross-frame colour flicker
# during animation, and these never animate; meanwhile the room's 224 colours are
# browns and warm greens with no purple or saturated orange in them, so forcing a
# cauldron through it turns it to mud. They get their own palette instead, built
# across all of them together so the set is consistent with itself, and the
# room's own output is left untouched -- holiday mode off must be byte-identical
# to before it existed.
DECOR_PALETTE_COLORS = 128

# The decorations sit on the room's own grid: one art pixel per art pixel, the
# same as everything else. Raising this draws them finer than the room, which
# earlier builds did (at 2, then 1.5) because a pumpkin's face seemed to collapse
# at 1 -- but that was the pale halo in premultiplied_resize() eating the art from
# the edges inward, not the resolution. With the edges fixed, 1 holds together and
# the decorations are back under "The scale rule" with the room and the mouse.
# It need not be a whole number if a finer weave is ever wanted again.
DECOR_SUPERSAMPLE = 1

# The stock art is bright print colour and lands in a room lit by one fire, so
# it is warmed and pulled down before it goes in. These are multipliers on the
# lit piece: the tint is the colour of the light, the exposure is how much of it
# there is. Enough to sit the pieces in the room's light without draining them.
DECOR_WARM = (1.00, 0.86, 0.68)
DECOR_EXPOSURE = 0.88

# The room is lit by one fire, so it falls off hard into the corners. Each piece
# is additionally scaled by how bright the room actually is behind it, measured
# off the painting, so a pumpkin out on the dark floor is not lit as though it
# were on the hearth. Normalised against the average across all the pieces, so
# this only ever redistributes the exposure above -- it never globally brightens
# or darkens the set. Clamped, because the fire is bright enough up close to
# wash a piece out entirely.
DECOR_LIGHT_RANGE = (0.72, 1.18)

# A soft ellipse under each piece, so nothing looks pasted on. Height is taken
# from the piece's own width rather than a fixed figure, so a wide pumpkin gets
# a wide shadow and a narrow frame a narrow one. The alpha is deliberately low --
# the room is dim and its own shadows are soft.
SHADOW_RGB = (26, 12, 5)
SHADOW_ALPHA = 96
SHADOW_DEPTH = 0.17        # of the piece's width

# (source file, height in art px, centre x, bottom y) -- placed on the art grid,
# so these numbers are the same ones the CSS below is printed from. Sizes and
# positions here are in ROOM art pixels and do not change with the supersample.
#
# Read off content/reference/holiday-placement.png by tools/read_placement.py:
# the decorations were arranged by hand over a screenshot of the room, and that
# script matched each one back to its cut-out, position and size together. To
# rearrange them, move things about in that image again and re-run it.
DECOR = {
    "hat_1":      ("witch-hat.png",       14, 268,  69),
    "portrait_1": ("portrait-ghost.png",  13, 214,  71),
    "portrait_2": ("portrait-witch.png",  11, 153,  75),
    "pumpkin_1":  ("pumpkin-grin.png",     9, 260,  82),
    "cauldron_1": ("cauldron.png",        22, 108, 129),
    "pumpkin_2":  ("pumpkin-grin.png",    16, 114, 135),
    "pumpkin_3":  ("pumpkin-smirk.png",   11, 194, 138),
    "pumpkin_4":  ("pumpkin-wink.png",    14, 275, 142),
    # The pair out on the floor is one pumpkin now: the big smirking one that
    # stood behind this one was taken out, here and in the placement image, so
    # re-running read_placement.py does not quietly put it back -- and the keys
    # are closed up, since the reader numbers sequentially and a gap here would
    # make its next table rename everything below it.
    "pumpkin_5":  ("pumpkin-wink.png",    15, 147, 171),
}

DECOR_SRC = os.path.join(REPO, "content", "art", "halloween")


def premultiplied_resize(art, size):
    """Downsample RGBA without dragging the backdrop into the silhouette.

    The cut-outs still hold the sheet's own background colour underneath their
    transparent pixels -- amber behind the pumpkins, white behind the cauldron --
    because cutting only rewrote the alpha. Averaging raw RGB therefore mixes
    that backdrop into every edge pixel, and since the alpha is thresholded back
    to opaque afterwards, the piece ends up ringed by a pale halo that reads as a
    soft anti-aliased edge rather than a pixel one.

    Weighting each pixel by its own alpha before averaging, and dividing it back
    out after, is what makes a transparent pixel contribute nothing: the edge
    comes out the colour of the thing itself.
    """
    a = np.asarray(art, float)
    weight = a[..., 3:4] / 255.0
    flat = np.clip(a[..., :3] * weight, 0, 255).astype(np.uint8)
    small = np.asarray(Image.fromarray(flat).resize(size, Image.BOX), float)
    alpha = art.split()[-1].resize(size, Image.BOX)
    back = np.asarray(alpha, float)[..., None] / 255.0
    rgb = np.where(back > 1e-3, small / np.maximum(back, 1e-3), 0)
    return Image.fromarray(np.dstack([np.clip(rgb, 0, 255).astype(np.uint8),
                                      np.asarray(alpha)]))

# Art-grid size is what the CSS box is measured in; pixel size is that times the
# supersample, which is what actually gets written to disk. Each piece is built
# on a canvas taller than the piece itself, with the extra rows at the bottom
# holding the shadow -- so the shadow travels inside the image rather than
# needing a second element to carry it.
decor_lut = [min(255, round(v * DIM)) for v in range(256)]

# How bright the room is behind each piece, straight off the finished painting.
room_lum = np.asarray(qframes["lit"].convert("L"), float)


def light_behind(art_w, art_h, cx, by):
    x0 = max(0, int(cx - art_w / 2))
    x1 = min(ART_W, int(cx + art_w / 2) + 1)
    y0 = max(0, int(by - art_h))
    y1 = min(ART_H, int(by) + 1)
    return float(room_lum[y0:y1, x0:x1].mean())


lights = {}
for name, (fname, art_h, cx, by) in DECOR.items():
    art = Image.open(os.path.join(DECOR_SRC, fname)).convert("RGBA")
    art = art.crop(art.split()[-1].getbbox())
    aw = max(1, round(art_h * art.size[0] / art.size[1]))
    lights[name] = light_behind(aw, art_h, cx, by)
mean_light = sum(lights.values()) / len(lights)

decor = {}
decor_art_size = {}
for name, (fname, art_h, cx, by) in DECOR.items():
    art = Image.open(os.path.join(DECOR_SRC, fname)).convert("RGBA")
    art = art.crop(art.split()[-1].getbbox())
    art_w = max(1, round(art_h * art.size[0] / art.size[1]))
    shadow_h = max(1, round(art_w * SHADOW_DEPTH))
    decor_art_size[name] = (art_w, art_h, shadow_h)

    # Rounded, since the supersample is not necessarily a whole number.
    def ss(n):
        return max(1, round(n * DECOR_SUPERSAMPLE))

    piece = premultiplied_resize(art, (ss(art_w), ss(art_h)))
    # Warm and dim the art itself; the shadow is already its own colour.
    lo, hi = DECOR_LIGHT_RANGE
    local = min(hi, max(lo, lights[name] / mean_light))
    chans = []
    for ch, band in enumerate(piece.split()[:3]):
        gain = DECOR_WARM[ch] * DECOR_EXPOSURE * local
        chans.append(band.point([min(255, round(v * gain)) for v in range(256)]))
    piece = Image.merge("RGBA", (*chans, piece.split()[-1]))

    pw = ss(art_w)
    ph = ss(art_h + shadow_h)

    # An ellipse centred on the base line, so its top half hides behind the
    # piece and only the part past the feet is ever seen.
    yy, xx = np.mgrid[0:ph, 0:pw]
    cxp = (pw - 1) / 2
    cyp = ss(art_h)
    rx = max(1.0, pw * 0.48)
    ry = max(1.0, ss(shadow_h))
    d = ((xx - cxp) / rx) ** 2 + ((yy - cyp) / ry) ** 2
    falloff = np.clip(1.0 - d, 0, 1) ** 1.4
    shade = (falloff * SHADOW_ALPHA).astype(np.uint8)

    # The piece's own alpha is cut hard, the shadow's is left graded, and the two
    # are combined rather than composited. Compositing the piece onto the shadow
    # merges the two alphas into one channel, and any later threshold then has to
    # treat them alike: cut it and the shadow becomes a slab, leave it and the
    # piece keeps the half-transparent rim the downsample gave it, which is
    # exactly the soft edge these are not supposed to have.
    art_px = np.asarray(piece)
    body = np.zeros((ph, pw), np.uint8)
    body_rgb = np.zeros((ph, pw, 3), np.uint8)
    top = ss(art_h)
    body[:top] = np.where(art_px[..., 3] >= 128, 255, 0)
    body_rgb[:top] = art_px[..., :3]

    rgb = np.where(body[..., None] > 0, body_rgb,
                   np.array(SHADOW_RGB, np.uint8))
    decor[name] = Image.fromarray(
        np.dstack([rgb, np.maximum(body, shade)]))


# One palette across the whole set, sampled from the pieces themselves -- and
# from their dimmed copies as well. Sampling only the lit ones leaves the palette
# with no dark entries, so quantising a dimmed piece against it snaps every
# pixel back up to the nearest bright colour and the lamps-down variant comes out
# no darker than the lit one.
def flatten(p):
    flat = Image.new("RGB", p.size, SHADOW_RGB)
    flat.paste(p, (0, 0), p)
    return flat


decor_flat = {k: flatten(p) for k, p in decor.items()}
decor_dim = {k: f.point(decor_lut * 3) for k, f in decor_flat.items()}

samples = list(decor_flat.values()) + list(decor_dim.values())
strip_w = sum(p.size[0] for p in samples)
strip_h = max(p.size[1] for p in samples)
dstrip = Image.new("RGB", (strip_w, strip_h), SHADOW_RGB)
x = 0
for p in samples:
    dstrip.paste(p, (x, 0))
    x += p.size[0]

decor_palette = dstrip.quantize(colors=DECOR_PALETTE_COLORS,
                                method=Image.MEDIANCUT, dither=Image.NONE)

# The lamps-down room is the lit render times 0.55 (measured, see DIM), so the
# decorations take the same factor rather than glowing against a dark room.
decor_boxes = {}
for name, p in decor.items():
    # Already right: the piece was cut hard and the shadow left graded when the
    # two were combined above, so nothing here has to threshold anything.
    alpha = p.split()[-1]
    for suffix, img in (("", decor_flat[name]), ("_dark", decor_dim[name])):
        q = img.quantize(palette=decor_palette, dither=Image.NONE).convert("RGBA")
        q.putalpha(alpha)
        q.save(os.path.join(OUT, f"decor_{name}{suffix}.png"))
    _, art_h, cx, by = DECOR[name]
    art_w, _, shadow_h = decor_art_size[name]
    # Top stays at the piece's own top; the box just runs deeper to hold the
    # shadow, so moving a piece never means re-deriving where its shadow goes.
    decor_boxes[name] = (cx - art_w / 2, by - art_h, art_w, art_h + shadow_h)
print(f"decor: {len(decor)} pieces, palette {DECOR_PALETTE_COLORS}, "
      f"supersample x{DECOR_SUPERSAMPLE}")

print(f"grid {ART_W}x{ART_H}, palette {PALETTE_COLORS}, pose repeat x{repeat}")
print(f"mouse is {STANDING_ART_H / ART_H * 100:.2f}% of frame height\n")

print("--- style.css: overlay boxes ---")
for fname, (x0, y0, x1, y1) in boxes.items():
    print(f"/* {fname}: x {x0}, y {y0}, {x1 - x0}x{y1 - y0} */")
    print(f"  left: {x0 / ART_W * 100:.4f}%;")
    print(f"  top: {y0 / ART_H * 100:.4f}%;")
    print(f"  width: {(x1 - x0) / ART_W * 100:.4f}%;")
    print(f"  height: {(y1 - y0) / ART_H * 100:.4f}%;")

print("\n--- script.js: SPRITES ---")
print(f"const ART_H = {ART_H};")
print(f"const STANDING_ART_H = {STANDING_ART_H};")
for name, size in sizes.items():
    pad = " " * max(1, 5 - len(name))
    print(f'  {name}:{pad} {{ file: "mouse_{name}",{pad} w: {size[0]}, h: {size[1]} }},')

print("\n--- style.css: holiday decorations ---")
for name, (x0, y0, w, h) in decor_boxes.items():
    print(f".decor-{name.replace('_', '-')} "
          f"{{ left: {x0 / ART_W * 100:.4f}%; top: {y0 / ART_H * 100:.4f}%; "
          f"width: {w / ART_W * 100:.4f}%; height: {h / ART_H * 100:.4f}%; }}")
