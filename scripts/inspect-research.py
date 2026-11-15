"""Inspect the supplied Chromium PDF without third-party dependencies.

Supports its Flate streams, object streams, Identity-H fonts and ToUnicode maps.
This is a content audit, not a general-purpose PDF renderer.
"""
from pathlib import Path
import hashlib
import re
import zlib

root = Path(__file__).resolve().parents[1]
pdf = next(root.glob("*.pdf"))
raw = pdf.read_bytes()
objects = {int(n): body for n, body in re.findall(rb"(\d+) 0 obj(.*?)endobj", raw, re.S)}


def stream(body):
    payload = body.split(b"stream", 1)[1].split(b"endstream", 1)[0].strip(b"\r\n")
    return zlib.decompress(payload) if b"/FlateDecode" in body else payload


for body in list(objects.values()):
    if re.search(rb"/Type\s*/ObjStm", body):
        first = int(re.search(rb"/First\s+(\d+)", body)[1])
        decoded = stream(body)
        offsets = list(map(int, decoded[:first].split()))
        for i in range(0, len(offsets), 2):
            end = first + offsets[i + 3] if i + 3 < len(offsets) else len(decoded)
            objects[offsets[i]] = decoded[first + offsets[i + 1]:end]

cmaps = {}
for n, body in objects.items():
    if b"stream" in body:
        data = stream(body)
        if b"begincmap" in data:
            cmaps[n] = {int(a, 16): bytes.fromhex(b.decode()).decode("utf-16-be", "replace")
                        for a, b in re.findall(rb"<([0-9a-f]+)>\s*<([0-9a-f]+)>", data)}

fonts = {}
for n, body in objects.items():
    ref = re.search(rb"/ToUnicode\s+(\d+) 0 R", body)
    if ref:
        fonts[n] = cmaps.get(int(ref[1]), {})

pages = [(n, body) for n, body in objects.items() if re.search(rb"/Type\s*/Page\b", body)]
pages.sort()
lines = [f"PDF: {pdf.name}", f"SHA256: {hashlib.sha256(raw).hexdigest()}",
         f"Pages: {len(pages)}", f"Image XObjects: {sum(bool(re.search(rb'/Subtype\s*/Image', b)) for b in objects.values())}"]
for index, (n, page) in enumerate(pages, 1):
    content_ref = re.search(rb"/Contents\s+(\d+) 0 R", page)
    if not content_ref:
        continue
    data = stream(objects[int(content_ref[1])])
    resources = page
    res_ref = re.search(rb"/Resources\s+(\d+) 0 R", page)
    if res_ref:
        resources = objects[int(res_ref[1])]
    font_ref = re.search(rb"/Font\s+(\d+) 0 R", resources)
    font_resources = objects[int(font_ref[1])] if font_ref else resources
    font_refs = {name: fonts.get(int(ref), {}) for name, ref in re.findall(rb"/([A-Za-z0-9]+)\s+(\d+) 0 R", font_resources)}
    current = {}
    words = []
    for match in re.finditer(rb"/([A-Za-z0-9]+)\s+[\d.]+\s+Tf|<([0-9A-Fa-f]+)>\s*Tj|\[(.*?)\]\s*TJ|ET", data, re.S):
        if match[1]:
            current = font_refs.get(match[1], {})
        elif match[2] or match[3]:
            chunks = [match[2]] if match[2] else re.findall(rb"<([0-9a-fA-F]+)>", match[3])
            for chunk in chunks:
                words.append("".join(current.get(int(chunk[i:i + 4], 16), "�") for i in range(0, len(chunk), 4)))
        else:
            words.append("\n")
    lines.extend([f"\n--- Page {index} (object {n}; {len(data)} drawing bytes) ---", "".join(words)])

out = root / "research"
out.mkdir(exist_ok=True)
(out / "PDF_CONTENT_AUDIT.txt").write_text("\n".join(lines), encoding="utf-8")
# Preserve the supplied originals verbatim at the paths requested by the user.
(out / "ASTRA_Deep_Research.pdf").write_bytes(raw)
(out / "ASTRA_Deep_Research.md").write_bytes((root / "deep-research-report.md").read_bytes())
print("\n".join(lines[:4]))
print("Wrote research/PDF_CONTENT_AUDIT.txt and canonical research copies.")
