"""Read official release metadata/index only; do not fetch geometry in this preflight."""
from pathlib import Path
import urllib.request, struct, json, hashlib

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'packages/three-assets/bodyparts3d-4.0/source'
OUT.mkdir(parents=True, exist_ok=True)
BASE = 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/'

def get(url, name):
    p = OUT / name
    if not p.exists():
        with urllib.request.urlopen(url, timeout=40) as r:
            p.write_bytes(r.read(3_000_000))
    return p.read_bytes()

for name in ['README_e.html', 'partof_parts_list_e.txt', 'partof_element_parts.txt', 'isa_parts_list_e.txt', 'isa_element_parts.txt']:
    get(BASE + name, name)
get('https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html', 'license.html')
url = BASE + 'partof_BP3D_4.0_obj_99.zip'
def partial(start, end):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'Range': f'bytes={start}-{end}'}), timeout=40) as r:
        if r.status != 206: raise RuntimeError('Refusing whole atlas: byte-range support required')
        data = r.read(end - start + 2)
        if len(data) != end - start + 1: raise RuntimeError('Incomplete or excessive byte range')
        return data

p = OUT / 'archive-index.json'
if not p.exists():
    tail = partial(64822948, 64888504)
    end = struct.unpack_from('<4s4H2LH', tail, tail.rfind(b'PK\x05\x06'))
    data = partial(end[6], end[6] + end[5] - 1)
    entries = []; i = 0
    while i < len(data):
        a = struct.unpack_from('<4s6H3L5H2L', data, i)
        if a[0] != b'PK\x01\x02': raise RuntimeError('Invalid ZIP directory')
        nl, el, cl = a[10:13]
        entries.append(dict(name=data[i+46:i+46+nl].decode(), method=a[4], crc32=a[7], compressed_bytes=a[8], bytes=a[9], offset=a[-1]))
        i += 46 + nl + el + cl
    p.write_text(json.dumps({'url': url, 'archive_bytes': 64888505, 'entries': entries}, indent=2))
print('Official metadata and archive index saved; geometry not downloaded.')
parts = (OUT / 'partof_parts_list_e.txt').read_text().splitlines()
for line in parts:
    n = line.split('\t')[-1].lower()
    if ('lung' in n or 'heart' in n or 'lobe' in n) and len(n) < 62: print(line)
print('Metadata hashes', {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.iterdir() if p.is_file()})
