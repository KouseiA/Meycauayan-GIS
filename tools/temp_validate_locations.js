const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadData(filename, variableName) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'data', filename), 'utf-8');
  const sandbox = { exports: {} };
  vm.createContext(sandbox);
  vm.runInContext(src + `\nexports.${variableName} = ${variableName};`, sandbox, { filename });
  return sandbox.exports[variableName];
}

const geojson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'meycauayan-barangays.geojson'), 'utf-8'));
const facilities = loadData('facilities.js', 'FACILITIES_DATA');
const polygons = new Map(geojson.features.map(f => [f.properties.barangay, f.geometry.coordinates[0]]));
const allFacilities = [].concat(...Object.values(facilities).filter(Array.isArray));

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

const errors = [];
allFacilities.forEach(f => {
  const bar = f.barangay;
  if (!bar) return;
  const poly = polygons.get(bar);
  if (!poly) {
    errors.push(`${f.id} ${f.name} => missing barangay ${bar}`);
    return;
  }
  if (!pointInPoly(f.lng, f.lat, poly)) {
    errors.push(`${f.id} ${f.name} (${bar}) is outside its barangay poly at ${f.lat},${f.lng}`);
  }
});

if (errors.length === 0) {
  console.log('OK');
} else {
  console.log(errors.join('\n'));
}
