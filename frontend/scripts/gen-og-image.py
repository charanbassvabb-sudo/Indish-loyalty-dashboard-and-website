"""
Generates the branded Open Graph share image (public/og-image.jpg) purely in
code: a dark gradient matching the site's design tokens, a soft radial glow,
the Indish wordmark, and a tagline set in Georgia (closest local match to the
site's Marcellus display face).

Run manually whenever the brand mark or copy changes:
    python scripts/gen-og-image.py
"""

import math
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO_PATH = os.path.join(ROOT, "src", "assets", "images", "logo.png")
OUT_PATH = os.path.join(ROOT, "public", "og-image.jpg")

W, H = 1200, 630

# Brand tokens (sampled/approximated from src/index.css oklch values).
BG_TOP = (26, 20, 33)  # near --background, slightly lifted for a gradient top
BG_BOTTOM = (14, 11, 18)  # near-black --background
BRAND_BLUE = (75, 110, 225)  # matches the logo mark / --primary
BRAND_GOLD = (217, 173, 85)  # --gold / --saffron
CREAM = (245, 240, 227)  # --cream


def vertical_gradient(size, top, bottom):
    w, h = size
    base = Image.new("RGB", (1, h), 0)
    for y in range(h):
        t = y / max(1, h - 1)
        pixel = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        base.putpixel((0, y), pixel)
    return base.resize((w, h))


def radial_glow(size, center, radius, color, max_alpha):
    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cx, cy = center
    steps = 60
    for i in range(steps, 0, -1):
        t = i / steps
        r = radius * t
        alpha = int(max_alpha * (1 - t) ** 1.6)
        gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*color, alpha))
    return glow.filter(ImageFilter.GaussianBlur(18))


def load_font(name, size):
    try:
        return ImageFont.truetype(os.path.join("C:/Windows/Fonts", name), size)
    except OSError:
        return ImageFont.load_default()


def main():
    img = vertical_gradient((W, H), BG_TOP, BG_BOTTOM).convert("RGBA")

    # Soft ember/blue glow behind the logo, plus a smaller gold accent glow.
    img.alpha_composite(radial_glow((W, H), (W // 2, 230), 380, BRAND_BLUE, 90))
    img.alpha_composite(radial_glow((W, H), (W - 120, H - 60), 260, BRAND_GOLD, 55))

    # Faint grain so the flat gradient doesn't band on compression.
    import random

    random.seed(7)
    grain = Image.new("L", (W, H), 0)
    gpx = grain.load()
    for y in range(H):
        for x in range(W):
            if (x + y) % 2 == 0:
                gpx[x, y] = random.randint(0, 10)
    grain_rgba = Image.merge("RGBA", (grain, grain, grain, grain.point(lambda p: int(p * 0.6))))
    img.alpha_composite(grain_rgba)

    # Logo (blue wordmark on transparent bg) — scaled and centered upper-middle.
    logo = Image.open(LOGO_PATH).convert("RGBA")
    logo_w = 300
    logo_h = round(logo.height * (logo_w / logo.width))
    logo = logo.resize((logo_w, logo_h), Image.LANCZOS)
    logo_x = (W - logo_w) // 2
    logo_y = 92
    img.alpha_composite(logo, (logo_x, logo_y))

    draw = ImageDraw.Draw(img)

    # Thin gold rule under the logo.
    rule_y = logo_y + logo_h + 26
    rule_w = 120
    draw.rectangle(
        [(W - rule_w) // 2, rule_y, (W + rule_w) // 2, rule_y + 3],
        fill=(*BRAND_GOLD, 255),
    )

    tagline_font = load_font("georgia.ttf", 34)
    sub_font = load_font("georgiai.ttf", 24)

    tagline = "Fire-Forward Indian Restaurant"
    sub = "Lusaka  &nbsp;·&nbsp;  Kitwe, Zambia".replace("&nbsp;", " ")

    def centered_text(y, text, font, fill):
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        draw.text(((W - tw) / 2, y), text, font=font, fill=fill)

    centered_text(rule_y + 30, tagline, tagline_font, (*CREAM, 255))
    centered_text(rule_y + 78, sub, sub_font, (*BRAND_GOLD, 235))

    # Vignette to keep edges moody and focus attention centrally.
    vignette = Image.new("L", (W, H), 0)
    vd = ImageDraw.Draw(vignette)
    for i in range(40):
        t = i / 40
        inset = int(t * 90)
        alpha = int(70 * (i / 40))
        vd.rectangle([inset, inset, W - inset, H - inset], outline=alpha)
    vignette = vignette.filter(ImageFilter.GaussianBlur(40))
    black = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    black.putalpha(vignette)
    img.alpha_composite(black)

    final = img.convert("RGB")
    final.save(OUT_PATH, format="JPEG", quality=90)
    print(f"wrote {OUT_PATH} ({W}x{H})")


if __name__ == "__main__":
    main()
