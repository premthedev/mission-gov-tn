"""Download an official TNPSC booklet and render its pages as upright, readable JPEGs.

Usage:
  python tools/render_pdf_pages.py G4-2025            # all pages
  python tools/render_pdf_pages.py G4-2025 2-14       # page range
Output: tools/work/pages/<exam>/p###.jpg  (git-ignored)
"""
import json
import os
import sys
import urllib.parse
import urllib.request

import pypdfium2 as pdfium
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(ROOT, "tools", "work")
WIDTH = int(os.environ.get("PAGE_WIDTH", "1100"))


def paper(exam: str) -> dict:
    with open(os.path.join(ROOT, "tools", "papers.json"), encoding="utf-8") as fh:
        data = json.load(fh)
    for p in data["papers"]:
        if p["exam"] == exam:
            return {**p, "base": data["base"]}
    raise SystemExit(f"unknown exam {exam}")


def download(p: dict) -> str:
    path = os.path.join(WORK, "pdf", f"{p['exam']}.pdf")
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        url = p["base"] + urllib.parse.quote(p["booklet"])
        print("downloading", url)
        urllib.request.urlretrieve(url, path)
    return path


def upright(img: Image.Image) -> Image.Image:
    # TNPSC scans are landscape pages with the text turned 90°; turning counter-clockwise makes them upright.
    if img.width > img.height:
        img = img.rotate(90, expand=True)
    gray = ImageOps.grayscale(img)
    bbox = ImageOps.invert(gray).point(lambda v: 255 if v > 60 else 0).getbbox()
    if bbox:
        pad = 20
        img = img.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(img.width, bbox[2] + pad), min(img.height, bbox[3] + pad)))
    if img.width > WIDTH:
        img = img.resize((WIDTH, round(img.height * WIDTH / img.width)), Image.LANCZOS)
    return img.convert("RGB")


def main() -> None:
    exam = sys.argv[1]
    p = paper(exam)
    pdf = pdfium.PdfDocument(download(p))
    n = len(pdf)
    lo, hi = 1, n
    if len(sys.argv) > 2:
        a, _, b = sys.argv[2].partition("-")
        lo, hi = int(a), int(b or a)
    out = os.path.join(WORK, "pages", exam)
    os.makedirs(out, exist_ok=True)
    for i in range(lo, min(hi, n) + 1):
        img = upright(pdf[i - 1].render(scale=150 / 72).to_pil())
        path = os.path.join(out, f"p{i:03d}.jpg")
        img.save(path, quality=82)
    print(f"{exam}: rendered pages {lo}-{min(hi, n)} of {n} -> {out}")


if __name__ == "__main__":
    main()
