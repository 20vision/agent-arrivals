#!/usr/bin/env python3
"""Draws the link preview image (src/og.bin, a 1200x630 PNG) from the latest real count.
The number on it is dated, because the image is static: run again and deploy to refresh it.
  og.py <count> "<date text>"      e.g. og.py 427205 "12 Nov 2026"
"""
import sys
from PIL import Image, ImageDraw, ImageFont

count = int(sys.argv[1])
when = sys.argv[2]
W, H = 1200, 630
BG, INK, DIM, AMBER, RED = (11, 11, 12), (244, 240, 230), (168, 163, 151), (255, 179, 0), (255, 111, 97)


def font(path_options, size):
    for p in path_options:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()


MONO = ["/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf", "/usr/share/fonts/truetype/ubuntu/UbuntuMono-B.ttf"]
SANS = ["/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf", "/usr/share/fonts/opentype/inter/Inter-Bold.otf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)


def spaced(x, y, text, f, fill, gap):
    for ch in text:
        d.text((x, y), ch, font=f, fill=fill)
        x += d.textlength(ch, font=f) + gap
    return x


x = spaced(70, 62, "MYCLAWN", font(MONO, 22), INK, 4)
spaced(x + 14, 62, "AGENT ARRIVALS", font(MONO, 22), AMBER, 4)
d.ellipse((70, 124, 86, 140), fill=RED)
spaced(100, 120, "LIVE · PUBLIC GITHUB", font(MONO, 20), DIM, 4)
d.text((70, 168), "AI agents opened", font=font(SANS, 46), fill=INK)

text = f"{count:,}"
fw, fh, gap = 118, 168, 12
fx, fy = 70, 248
big = font(MONO, 132)
for ch in text:
    if ch.isdigit():
        d.rounded_rectangle((fx, fy, fx + fw, fy + fh), radius=12, fill=(27, 27, 30), outline=(43, 43, 48), width=2)
        d.rectangle((fx + 2, fy + fh // 2, fx + fw - 2, fy + fh - 2), fill=(17, 17, 19))
        d.rounded_rectangle((fx, fy, fx + fw, fy + fh), radius=12, outline=(43, 43, 48), width=2)
        tw = d.textlength(ch, font=big)
        d.text((fx + (fw - tw) / 2, fy + 6), ch, font=big, fill=INK)
        d.line((fx, fy + fh // 2, fx + fw, fy + fh // 2), fill=(0, 0, 0), width=3)
        fx += fw + gap
    else:
        d.text((fx - 2, fy + 84), ch, font=font(MONO, 76), fill=(119, 115, 106))
        fx += 38 + gap

d.text((70, 446), "pull requests in 24 hours", font=font(SANS, 46), fill=DIM)
d.text((70, 528), f"Counted from GitHub search on {when}. See what your own agents shipped in 2026.", font=font(SANS, 25), fill=DIM)
d.text((70, 566), "agents.myclawn.com", font=font(MONO, 24), fill=AMBER)
img.save("src/og.bin", format="PNG", optimize=True)
print("wrote src/og.bin", img.size)
