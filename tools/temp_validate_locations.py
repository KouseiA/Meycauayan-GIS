import json, re
from pathlib import Path

def parse_js_array(path):
    text = Path(path).read_text(encoding='utf-8')
    # remove comments
    text = re.sub(r'//.*', '', text)
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    # find first array or object literal assignment
    match = re.search(r'=\s*(\[.*\]);', text, re.S)
    if not match:
        raise ValueError('No array found in ' + path)
    js = match.group(1)
    # normalize unquoted keys and single quotes
    js = re.sub(r'([\{,\s])(\w+)\s*:', r'\1"\2":', js)
    js = re.sub(r"'([^']*)'", r'"\1"', js)
    js = re.sub(r',\s*([\]}])', r'\1', js)
    return json.loads(js)

barangays = parse_js_array('data/barangays.js')
fac = parse_js_array('data/facilities.js')

# build polygon map
polygons = {}
for b in barangays:
    coords = b['geojson']['geometry']['coordinates'][0]
    polygons[b['name']] = coords

# all facilities lists keys
lists = [v for k, v in fac.items() if isinstance(v, list)]
facilities = [item for sub in lists for item in sub]

from shapely.geometry import Point, Polygon

errors = []
for f in facilities:
    bar = f.get('barangay')
    if not bar: continue
    if bar not in polygons:
        errors.append((f['id'], f['name'], bar, 'barangay not found'))
        continue
    poly = Polygon(polygons[bar])
    pt = Point(f['lng'], f['lat'])
    if not poly.contains(pt) and not poly.touches(pt):
        errors.append((f['id'], f['name'], bar, f['lat'], f['lng']))

with open('temp_location_check.txt','w', encoding='utf-8') as out:
    if not errors:
        out.write('OK\n')
    else:
        for e in errors:
            out.write(str(e) + '\n')
print('done')
