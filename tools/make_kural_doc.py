"""Generate the 20-chapter Thirukkural study file from the Apache-2.0 tk120404 dataset.

Only the Tamil couplet and G.U. Pope's verse translation (public domain) are included.
"""
import json
import os

src = os.path.join(os.environ["TEMP"], "tnpsc")
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, "docs", "study", "THIRUKKURAL_20_CHAPTERS.md")

# Order follows the official syllabus list (Notification 11/2026, Annexure III, Unit VII).
SYLLABUS_ORDER = [14, 16, 60, 9, 4, 23, 45, 68, 73, 58, 8, 40, 12, 28, 41, 55, 100, 80, 19, 25]

with open(os.path.join(src, "kural.json"), encoding="utf-8") as fh:
    kurals = {k["Number"]: k for k in json.load(fh)["kural"]}
with open(os.path.join(src, "kural_detail.json"), encoding="utf-8") as fh:
    detail = json.load(fh)

chapters = {}
paal_of = {}


def walk(node, paal=None):
    if isinstance(node, dict):
        if "start" in node and "end" in node and "number" in node:
            chapters[node["number"]] = node
            paal_of[node["number"]] = paal
        name = node.get("name") if isinstance(node.get("name"), str) else None
        next_paal = name if (name and name.endswith("பால்")) else paal
        for v in node.values():
            walk(v, next_paal)
    elif isinstance(node, list):
        for v in node:
            walk(v, paal)


walk(detail)

lines = [
    "# திருக்குறள்: பாடத்திட்ட 20 அதிகாரங்கள் (Notification 11/2026, Unit VII)",
    "",
    "Generated from the [tk120404/thirukkural](https://github.com/tk120404/thirukkural) dataset (Apache-2.0).",
    "Tamil text + G.U. Pope's English verse translation (public domain). 20 chapters × 10 = 200 kurals.",
    "",
    "## Chapter index",
    "",
    "| # (syllabus order) | அதிகாரம் | Chapter no. | Kurals | பால் | English |",
    "|---|---|---|---|---|---|",
]
for i, ch_no in enumerate(SYLLABUS_ORDER, 1):
    ch = chapters[ch_no]
    lines.append(
        f"| {i} | {ch['name']} | {ch_no} | {ch['start']}–{ch['end']} | {paal_of.get(ch_no) or ''} | {ch.get('translation', '')} |"
    )

lines += ["", "How to study: for each kural, say the chapter name, then the kural, then its meaning in your own words.", ""]

for i, ch_no in enumerate(SYLLABUS_ORDER, 1):
    ch = chapters[ch_no]
    lines += ["", f"## {i}. {ch['name']} (அதிகாரம் {ch_no}, குறள் {ch['start']}–{ch['end']}) · {ch.get('translation', '')}", ""]
    for n in range(ch["start"], ch["end"] + 1):
        k = kurals[n]
        lines.append(f"**{n}.** {k['Line1']}  ")
        lines.append(f"{k['Line2']}  ")
        lines.append(f"*{k['couplet']}*")
        lines.append("")

os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w", encoding="utf-8") as fh:
    fh.write("\n".join(lines) + "\n")
print("written", out, "kurals:", sum(chapters[c]["end"] - chapters[c]["start"] + 1 for c in SYLLABUS_ORDER))
