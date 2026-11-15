"""Acquire ONLY the approved reference subset from the original public DBCLS viewer.

No mirror, procedural replacement, full-atlas acquisition, retry or decoder.
4.3 is selected because the 4.0 archive has no lung parenchyma surfaces.
"""
from pathlib import Path
import urllib.request, urllib.parse, re, html, json, hashlib, zipfile, io, http.cookiejar, sys
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent
BASE = 'https://lifesciencedb.jp/bp3d/'
OUT = ROOT / 'packages/three-assets/bodyparts3d-4.3'
SOURCE = OUT / 'source'
RAW = OUT / 'raw'
RAW.mkdir(exist_ok=True)
offline = '--offline' in sys.argv
digest = lambda b: hashlib.sha256(b).hexdigest()
manifest = (SOURCE / 'FMA2Obj.txt').read_text()
assert '# Data Version\t4.3' in manifest and '# Objects set\t4.3' in manifest
concepts = {}
for line in manifest.splitlines():
    if not line.startswith('#') and line.strip():
        fma, tree, elements = line.split('\t')
        concepts[(fma, tree)] = set(elements.split('+'))
allowed = set().union(*concepts.values())
rows = {}
for row in re.findall(r'<tr>\s*(.*?)\s*</tr>', (SOURCE / 'obj2FMA-post.html').read_text(), re.S):
    cells = [html.unescape(re.sub('<[^>]+>', '', c)).strip() for c in re.findall(r'<td[^>]*>(.*?)</td>', row, re.S)]
    if len(cells) >= 8 and cells[1] in allowed and cells[2]:
        rows[cells[1]] = dict(element_id=cells[1], representation_id=cells[2], concept_id=cells[3], name=cells[4], original_filename=cells[6], creator_record=cells[7])

groups = {'body': sorted(concepts[('FMA7163', 'is_a')]), 'skeleton': sorted(concepts[('FMA5018', 'is_a')]), 'heart': [], 'lung_left': [], 'lung_right': []}
for id, row in rows.items():
    name = row['name'].lower()
    if name in ['wall of ventricle', 'wall of left atrium', 'wall of right atrium']:
        # Use explicit chamber-wall concepts. The source's whole-heart compound
        # mapping omits some of these named surfaces; do not claim it is complete.
        assert id in concepts[(row['concept_id'], 'is_a')]
        groups['heart'].append(id)
    if re.fullmatch('parenchyma of .*bronchopulmonary segment', name):
        side = 'left' if id in concepts[('FMA7310', 'part_of')] else 'right' if id in concepts[('FMA7309', 'part_of')] else None
        if side is None: raise RuntimeError('Lung side not established by official membership')
        groups['lung_' + side].append(id)
assert len(groups['body']) == 1 and len(groups['heart']) == 3
assert len(groups['lung_left']) == 9 and len(groups['lung_right']) == 9
selected = sorted(set().union(*(set(v) for v in groups.values())))
if any(id not in rows for id in selected): raise RuntimeError('Selected source identity missing')

license_url = BASE + 'info/license/index.html'
license_path = SOURCE / 'official-license.html'
if not license_path.exists() and not offline:
    license_path.write_bytes(urllib.request.urlopen(license_url, timeout=35).read(200_000))
license_text = license_path.read_text()
if '2.1' not in license_text or 'creativecommons.org/licenses/by-sa/2.1/jp' not in license_text:
    raise RuntimeError('4.3 original-site license is not the reviewed CC BY-SA 2.1 JP notice')

records = []
print('Selected', len(selected), 'elements:', {k:len(v) for k,v in groups.items()}, flush=True)
# The public viewer's documented custom-download flow uses an anonymous session.
# Keep its cookies in memory only; no credentials or personal profile are used.
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
if not offline:
    with opener.open(BASE + '?lng=en', timeout=35) as response:
        response.read(500_000)
for first in range(0, len(selected), 20):
    batch = selected[first:first+20]
    missing = [id for id in batch if not (RAW / (id + '.obj')).exists()]
    if missing:
        if offline: raise RuntimeError('Offline finalization cannot acquire missing source files')
        form = urllib.parse.urlencode({'ids': json.dumps(missing), 'rep_id': json.dumps(sorted({rows[id]['representation_id'] for id in missing})), 'filename': 'astra-n05-01-reference', 'type': 'art_file', 'all_downloads': '1'}).encode()
        req = urllib.request.Request(BASE + 'download.cgi', data=form, headers={'Referer': BASE + '?lng=en'})
        with opener.open(req, timeout=90) as response:
            data = response.read(60_000_001)
        if len(data) > 60_000_000: raise RuntimeError('Subset response exceeds bound; acquisition stopped')
        if not data.startswith(b'PK'):
            raise RuntimeError('Official subset service did not return an archive; stopping without importing: ' + repr(data[:1200]))
        archive = zipfile.ZipFile(io.BytesIO(data))
        landed = set()
        for name in archive.namelist():
            if not name.endswith('.obj'): continue
            id = Path(name).name.split('_')[0]
            if id not in missing: raise RuntimeError('Unexpected geometry returned; refusing import')
            raw = archive.read(name)
            header = raw[:5000].decode('utf-8', errors='replace')
            if id not in header or not re.search(r'Compatibility\s+version\s*:?\s*4\.3', header, re.I):
                raise RuntimeError('Release/component identity not established: ' + id + '\n' + header[:2000])
            (RAW / (id + '.obj')).write_bytes(raw)
            landed.add(id)
        if landed != set(missing): raise RuntimeError('Incomplete subset response')
        print('Acquired', first + len(batch), '/', len(selected), 'subset ZIP bytes', len(data), flush=True)
    for id in batch:
        raw = (RAW / (id + '.obj')).read_bytes()
        header=raw[:4000].decode('utf-8',errors='strict')
        def field(label):
            value=re.search(r'^# '+re.escape(label)+r'\s*:\s*(.+)$',header,re.M)
            if not value: raise RuntimeError('Missing source header: '+label+' / '+id)
            return value.group(1).strip()
        source_header={key:field(label) for key,label in [('file_id','File ID'),('representation_id','Representation ID'),('concept_id','Concept ID'),('compatibility_version','Compatibility version'),('bounds_mm','Bounds(mm)'),('english_name','English name')]}
        if source_header['file_id']!=id or source_header['concept_id']!=rows[id]['concept_id'] or source_header['compatibility_version']!='4.3': raise RuntimeError('Source component/concept/release mismatch')
        # The public lookup and exported headers differ in BP IDs for some
        # components. Retain BOTH observed records; never relabel original files.
        records.append({**rows[id], 'catalogue_representation_id':rows[id]['representation_id'],'representation_id':source_header['representation_id'],'source_header':source_header,'file': 'raw/' + id + '.obj', 'sha256': digest(raw), 'bytes': len(raw), 'groups': [k for k,v in groups.items() if id in v]})
    (OUT / 'inputs.json').write_text(json.dumps({'version': '4.3', 'objects_set': '4.3', 'tree': 'FMA3.0', 'retrieved_date': '2026-10-23', 'manifest_finalized_at': datetime.now(timezone.utc).isoformat(), 'source_url': BASE, 'download_url': BASE + 'download.cgi', 'license': 'CC-BY-SA-2.1-JP', 'license_url': 'https://creativecommons.org/licenses/by-sa/2.1/jp/', 'license_notice_url': license_url, 'credit': 'BodyParts3D, © 2008 The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan', 'groups': groups, 'metadata_sha256': {p.name: digest(p.read_bytes()) for p in SOURCE.iterdir() if p.is_file()}, 'complete': len(records) == len(selected), 'assets': records}, indent=2))
print('Complete approved subset acquired; original OBJ geometry unchanged.', flush=True)
