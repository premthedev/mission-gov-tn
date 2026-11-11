"""Build content/kural20.json: the 20 Thirukkural chapters named in the TNPSC Group 4 syllabus.

Source: https://github.com/tk120404/thirukkural (Apache-2.0).
Only public-domain text is written to the repo: the Tamil couplet and G.U. Pope's verse translation.
Modern Tamil commentaries are downloaded by the app at runtime for personal use and never committed.

Usage: python tools/build_kural_content.py
"""
import json
import os
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "content", "kural20.json")
CACHE = os.path.join(ROOT, "tools", "work", "kural")
BASE = "https://raw.githubusercontent.com/tk120404/thirukkural/master/"

# Official order of Unit VII (Notification 11/2026, Annexure III) -> chapter number in the Kural.
SYLLABUS_CHAPTERS = [14, 16, 60, 9, 4, 23, 45, 68, 73, 58, 8, 40, 12, 28, 41, 55, 100, 80, 19, 25]


def fetch(name: str):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        urllib.request.urlretrieve(BASE + name, path)
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def main() -> None:
    kurals = {k["Number"]: k for k in fetch("thirukkural.json")["kural"]}
    detail = fetch("detail.json")

    chapters: dict[int, dict] = {}

    def walk(node, paal=None):
        if isinstance(node, dict):
            name = node.get("name") if isinstance(node.get("name"), str) else None
            if "start" in node and "end" in node and "number" in node:
                chapters[node["number"]] = {**node, "paal": paal}
            next_paal = name if (name and name.endswith("பால்")) else paal
            for value in node.values():
                walk(value, next_paal)
        elif isinstance(node, list):
            for value in node:
                walk(value, paal)

    walk(detail)

    out_chapters = []
    out_kurals = []
    for order, ch_no in enumerate(SYLLABUS_CHAPTERS, 1):
        ch = chapters[ch_no]
        out_chapters.append({
            "order": order,
            "ch": ch_no,
            "name": ch["name"],
            "en": ch.get("translation", ""),
            "paal": ch["paal"] or "",
            "start": ch["start"],
            "end": ch["end"],
        })
        for n in range(ch["start"], ch["end"] + 1):
            k = kurals[n]
            out_kurals.append({
                "n": n,
                "ch": ch_no,
                "order": order,
                "l1": k["Line1"],
                "l2": k["Line2"],
                "pope": k["couplet"],
            })

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump({"source": "tk120404/thirukkural (Apache-2.0); English verse: G.U. Pope (public domain)",
                   "chapters": out_chapters, "kurals": out_kurals}, fh, ensure_ascii=False, indent=1)
    print(f"wrote {OUT}: {len(out_chapters)} chapters, {len(out_kurals)} kurals")


if __name__ == "__main__":
    main()
