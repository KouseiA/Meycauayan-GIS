// admin.js — Meycauayan City Emergency Portal — Admin Dashboard Logic
'use strict';

let cachedBarangays = [];
let cachedFacilities = { police: [], fire: [], hospital: [], healthCenter: [], cdrrmo: [] };
let cachedAnnouncements = [];
let cachedHotlines = [];

/* ============================================================
   AUTH — PHP/MySQL Auth endpoint integration
   ============================================================ */
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');

  try {
    const res = await fetch('api/auth.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      sessionStorage.setItem('admin_token', data.token);
      sessionStorage.setItem('admin_username', data.username);
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('admin-app').style.display = 'block';
      const userDisp = document.getElementById('admin-username-display');
      if (userDisp) userDisp.textContent = data.username;
      const lastUpd = document.getElementById('dash-last-updated');
      if (lastUpd) lastUpd.textContent = new Date().toLocaleString();
      errEl.style.display = 'none';
      initAdminApp();
    } else {
      errEl.style.display = 'block';
      document.getElementById('login-password').value = '';
    }
  } catch (err) {
    showToast('Authentication server error: ' + err.message, 'error');
  }
}

async function handleLogout() {
  try {
    await fetch('api/auth.php', { method: 'DELETE' });
  } catch(e) {}
  sessionStorage.removeItem('admin_token');
  sessionStorage.removeItem('admin_username');
  document.getElementById('admin-app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
}

/* ============================================================
   SECTION NAVIGATION
   ============================================================ */
function showSection(sectionId) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-nav-item').forEach(n => n.classList.remove('active'));

  const targetSection = document.getElementById(`section-${sectionId}`);
  const targetNav     = document.getElementById(`nav-${sectionId}`);

  if (targetSection) targetSection.classList.add('active');
  if (targetNav)     targetNav.classList.add('active');
  closeAdminSidebar();
}

/* ============================================================
   DASHBOARD STATS
   ============================================================ */
function refreshDashboardStats() {
  const bCount = cachedBarangays.length;
  const pCount = cachedFacilities.police.length;
  const fCount = cachedFacilities.fire.length;
  const hCount = cachedFacilities.hospital.length;
  const cCount = cachedFacilities.healthCenter.length;

  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setTxt('dash-barangay-count', bCount);
  setTxt('dash-police-count', pCount);
  setTxt('dash-fire-count', fCount);
  setTxt('dash-hosp-count', hCount);
  setTxt('dash-health-count', cCount);

  setTxt('bento-police-count', pCount);
  setTxt('bento-fire-count', fCount);
  setTxt('bento-hosp-count', hCount);
  setTxt('bento-health-count', cCount);
}

/* ============================================================
   TABLE SEARCH FILTER
   ============================================================ */
function filterTable(tableId, query) {
  const rows = document.querySelectorAll(`#${tableId} tbody tr`);
  const q = query.toLowerCase();
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

/* ============================================================
   BARANGAY TABLE
   ============================================================ */
function renderBarangayTable() {
  const titleEl = document.getElementById('barangay-table-title');
  if (titleEl && cachedBarangays) {
    titleEl.textContent = `All Barangays (${cachedBarangays.length})`;
  }

  const tbody = document.getElementById('barangay-tbody');
  if (!tbody) return;

  tbody.innerHTML = cachedBarangays.map(b => `
    <tr>
      <td style="font-weight:600; color: var(--clr-text-primary);">${b.name}</td>
      <td>${b.captain || '—'}</td>
      <td>${b.population ? parseInt(b.population).toLocaleString() : '—'}</td>
      <td>${b.area || '—'}</td>
      <td>${b.contact || '—'}</td>
      <td>
        <button class="btn-tbl" onclick="openBarangayModal(${b.id})" style="margin-right:4px;">
          <i class="fas fa-pen"></i> Edit
        </button>
        <button class="btn-tbl danger" onclick="deleteBarangay(${b.id})">
          <i class="fas fa-trash"></i> Delete
        </button>
      </td>
    </tr>
  `).join('');
}

/* ============================================================
   MODAL MAP PICKERS & GEOCODING
   ============================================================ */
let facMap = null;
let facMarker = null;
let facGeojsonLayers = [];

let brgyMap = null;
let brgyMarker = null;
let brgyGeojsonLayers = [];

const DEFAULT_CENTER = [14.7368, 120.9610];
const DEFAULT_ZOOM = 13;

function isPointInPoly(pt, vs) {
  const x = pt[0], y = pt[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function detectBarangayForCoord(lat, lng) {
  if (!cachedBarangays || !cachedBarangays.length) return null;
  for (const b of cachedBarangays) {
    if (b.geojson && b.geojson.geometry) {
      const geom = b.geojson.geometry;
      if (geom.type === 'Polygon') {
        if (isPointInPoly([lng, lat], geom.coordinates[0])) return b.name;
      } else if (geom.type === 'MultiPolygon') {
        for (const poly of geom.coordinates) {
          if (isPointInPoly([lng, lat], poly[0])) return b.name;
        }
      }
    }
  }
  return null;
}

function initFacilityMapPicker(initLat, initLng) {
  const container = document.getElementById('fac-map-picker');
  if (!container || typeof L === 'undefined') return;

  // Destroy previous map instance completely
  if (facMap) {
    try { facMap.remove(); } catch(e) {}
    facMap = null;
    facMarker = null;
    facGeojsonLayers = [];
  }

  facMap = L.map(container, {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    zoomControl: true,
    attributionControl: false
  });

  L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
  }).addTo(facMap);

  facMap.on('click', (e) => {
    setFacilityMapPin(e.latlng.lat, e.latlng.lng, true);
  });

  // Load barangay boundary overlays
  if (cachedBarangays) {
    cachedBarangays.forEach(b => {
      if (b.geojson) {
        const polyLayer = L.geoJSON(b.geojson, {
          style: {
            fillColor: '#ffeb3b',
            fillOpacity: 0.1,
            color: '#ffeb3b',
            weight: 2,
            opacity: 0.7
          }
        }).addTo(facMap);
        polyLayer.bindTooltip(b.name, { sticky: true, className: 'barangay-tooltip' });
        facGeojsonLayers.push(polyLayer);
      }
    });
  }

  const lat = parseFloat(initLat);
  const lng = parseFloat(initLng);
  const hasCoord = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

  if (hasCoord) {
    setFacilityMapPin(lat, lng, false);
    facMap.setView([lat, lng], 16);
  } else {
    document.getElementById('fac-map-status').innerHTML = `<i class="fas fa-crosshairs"></i> Click map to place facility marker`;
    document.getElementById('fac-detected-status').style.display = 'none';
    facMap.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  }

  // Multiple invalidateSize calls to handle Bootstrap modal animation timing
  facMap.invalidateSize();
  setTimeout(() => facMap.invalidateSize(), 100);
  setTimeout(() => facMap.invalidateSize(), 400);
  setTimeout(() => facMap.invalidateSize(), 800);
}

function setFacilityMapPin(lat, lng, updateInputs = true) {
  if (!facMap) return;

  if (updateInputs) {
    document.getElementById('fac-lat').value = lat.toFixed(6);
    document.getElementById('fac-lng').value = lng.toFixed(6);
  }

  if (!facMarker) {
    facMarker = L.marker([lat, lng], { draggable: true }).addTo(facMap);
    facMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      setFacilityMapPin(pos.lat, pos.lng, true);
    });
  } else {
    facMarker.setLatLng([lat, lng]);
  }

  const detected = detectBarangayForCoord(lat, lng);
  document.getElementById('fac-map-status').innerHTML = `<i class="fas fa-location-dot" style="color:var(--clr-success, #10b981);"></i> ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  
  const detBadge = document.getElementById('fac-detected-status');
  const detName = document.getElementById('fac-detected-name');
  if (detected) {
    detName.textContent = detected;
    detBadge.style.display = 'inline-flex';
    detBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    detBadge.style.color = 'var(--clr-success, #10b981)';
    if (updateInputs) {
      const brgySelect = document.getElementById('fac-barangay');
      if (brgySelect) brgySelect.value = detected;
    }
  } else {
    detBadge.style.display = 'inline-flex';
    detBadge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
    detBadge.style.color = '#f59e0b';
    detName.textContent = 'Outside defined barangays';
  }
}

function initBarangayMapPicker(initLat, initLng, brgyName) {
  const container = document.getElementById('brgy-map-picker');
  if (!container || typeof L === 'undefined') return;

  // Destroy previous map instance completely
  if (brgyMap) {
    try { brgyMap.remove(); } catch(e) {}
    brgyMap = null;
    brgyMarker = null;
    brgyGeojsonLayers = [];
  }

  brgyMap = L.map(container, {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    zoomControl: true,
    attributionControl: false
  });

  L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
  }).addTo(brgyMap);

  brgyMap.on('click', (e) => {
    setBarangayMapPin(e.latlng.lat, e.latlng.lng, true);
  });

  // Load barangay boundary overlays
  let activePolyBounds = null;
  if (cachedBarangays) {
    cachedBarangays.forEach(b => {
      if (b.geojson) {
        const isCurrent = brgyName && b.name.toLowerCase() === brgyName.toLowerCase();
        const polyLayer = L.geoJSON(b.geojson, {
          style: {
            fillColor: isCurrent ? '#00e5ff' : '#ffeb3b',
            fillOpacity: isCurrent ? 0.25 : 0.05,
            color: isCurrent ? '#00e5ff' : '#ffeb3b',
            weight: isCurrent ? 3 : 1.5,
            opacity: isCurrent ? 1 : 0.5
          }
        }).addTo(brgyMap);
        polyLayer.bindTooltip(b.name, { sticky: true, className: 'barangay-tooltip' });
        brgyGeojsonLayers.push(polyLayer);

        if (isCurrent) {
          activePolyBounds = polyLayer.getBounds();
        }
      }
    });
  }

  if (activePolyBounds) {
    const center = activePolyBounds.getCenter();
    setBarangayMapPin(center.lat, center.lng, false);
    brgyMap.fitBounds(activePolyBounds, { padding: [20, 20] });
  } else if (!isNaN(parseFloat(initLat)) && !isNaN(parseFloat(initLng))) {
    setBarangayMapPin(parseFloat(initLat), parseFloat(initLng), false);
    brgyMap.setView([parseFloat(initLat), parseFloat(initLng)], 15);
  } else {
    document.getElementById('brgy-map-status').innerHTML = `<i class="fas fa-crosshairs"></i> Click map to place Hall / Center pin`;
    document.getElementById('brgy-detected-status').style.display = 'none';
    brgyMap.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  }

  // Multiple invalidateSize calls to handle Bootstrap modal animation timing
  brgyMap.invalidateSize();
  setTimeout(() => brgyMap.invalidateSize(), 100);
  setTimeout(() => brgyMap.invalidateSize(), 400);
  setTimeout(() => brgyMap.invalidateSize(), 800);
}

function setBarangayMapPin(lat, lng, updateInputs = true) {
  if (!brgyMap) return;

  if (!brgyMarker) {
    brgyMarker = L.marker([lat, lng], { draggable: true }).addTo(brgyMap);
    brgyMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      setBarangayMapPin(pos.lat, pos.lng, true);
    });
  } else {
    brgyMarker.setLatLng([lat, lng]);
  }

  const detected = detectBarangayForCoord(lat, lng);
  document.getElementById('brgy-map-status').innerHTML = `<i class="fas fa-location-dot" style="color:var(--clr-success, #10b981);"></i> ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  
  const detBadge = document.getElementById('brgy-detected-status');
  const detName = document.getElementById('brgy-detected-name');
  if (detected) {
    detName.textContent = detected;
    detBadge.style.display = 'inline-flex';
  } else {
    detBadge.style.display = 'none';
  }
}

/* ============================================================
   ADDRESS AUTOCOMPLETE & LIVE SEARCH SUGGESTIONS
   ============================================================ */
let addressSearchDebounceTimer = null;
let currentSelectedSuggestionIndex = -1;

const MEYCAUAYAN_PLACES_INDEX = [
  // Libtong
  { title: "Libtong", subtitle: "Meycauayan, Bulacan", fullAddress: "Brgy. Libtong, Meycauayan City, Bulacan", lat: 14.7448, lng: 120.9802, barangay: "Libtong" },
  { title: "Libtong Elementary School", subtitle: "R. Soriano St., Libtong, Meycauayan", fullAddress: "R. Soriano St., Brgy. Libtong, Meycauayan City, Bulacan", lat: 14.7445, lng: 120.9825, barangay: "Libtong" },
  { title: "Libtong Barangay Hall", subtitle: "Libtong, Meycauayan, Bulacan", fullAddress: "Barangay Hall, Brgy. Libtong, Meycauayan City, Bulacan", lat: 14.7446, lng: 120.9802, barangay: "Libtong" },
  { title: "Sampaloc Street", subtitle: "Libtong, Meycauayan, 3020 Bulacan", fullAddress: "Sampaloc St., Brgy. Libtong, Meycauayan City, Bulacan", lat: 14.7435, lng: 120.9805, barangay: "Libtong" },
  { title: "Dulalia Compound", subtitle: "Sampaloc St., Libtong, Meycauayan", fullAddress: "Dulalia Cmpd., Sampaloc St., Brgy. Libtong, Meycauayan City", lat: 14.7435, lng: 120.9802, barangay: "Libtong" },
  { title: "Libtong Bakery", subtitle: "Muralla Industrial, Libtong, Meycauayan", fullAddress: "Muralla, Brgy. Libtong, Meycauayan City", lat: 14.7460, lng: 120.9810, barangay: "Libtong" },
  { title: "Muralla Industrial Park", subtitle: "Libtong / Perez, Meycauayan, Bulacan", fullAddress: "Muralla Industrial Park, Meycauayan City", lat: 14.7475, lng: 120.9815, barangay: "Libtong" },
  { title: "Malhacan-Libtong Road", subtitle: "Libtong, Meycauayan, Bulacan", fullAddress: "Malhacan-Libtong Road, Meycauayan City", lat: 14.7445, lng: 120.9755, barangay: "Libtong" },
  { title: "Libtong-Langka Road", subtitle: "Libtong / Langka, Meycauayan, Bulacan", fullAddress: "Libtong-Langka Road, Meycauayan City", lat: 14.7405, lng: 120.9789, barangay: "Libtong" },
  { title: "Iglesia Ni Cristo - Lokal ng Libtong", subtitle: "Malhacan-Libtong Road, Libtong, Meycauayan", fullAddress: "Malhacan-Libtong Rd, Brgy. Libtong, Meycauayan City", lat: 14.7434, lng: 120.9766, barangay: "Libtong" },

  // Saluysoy
  { title: "Saluysoy", subtitle: "Meycauayan, Bulacan", fullAddress: "Brgy. Saluysoy, Meycauayan City, Bulacan", lat: 14.7422, lng: 120.9568, barangay: "Saluysoy" },
  { title: "Saluysoy Barangay Hall", subtitle: "Provincial Rd, Saluysoy, Meycauayan", fullAddress: "Provincial Road, Brgy. Saluysoy, Meycauayan City", lat: 14.7432, lng: 120.9523, barangay: "Saluysoy" },
  { title: "Saluysoy Central School", subtitle: "Requino St., Saluysoy, Meycauayan", fullAddress: "Requino St., Brgy. Saluysoy, Meycauayan City", lat: 14.7437, lng: 120.9553, barangay: "Saluysoy" },
  { title: "Saluysoy Chapel", subtitle: "Everlasting St., Saluysoy, Meycauayan", fullAddress: "Everlasting St., Brgy. Saluysoy, Meycauayan City", lat: 14.7422, lng: 120.9571, barangay: "Saluysoy" },
  { title: "St. Francis of Assisi Maternity & Gen Hospital", subtitle: "Provincial Rd, Saluysoy, Meycauayan", fullAddress: "Provincial Road, Brgy. Saluysoy, Meycauayan City", lat: 14.7452, lng: 120.9550, barangay: "Saluysoy" },

  // Malhacan
  { title: "Malhacan", subtitle: "Meycauayan, Bulacan", fullAddress: "Brgy. Malhacan, Meycauayan City, Bulacan", lat: 14.7410, lng: 120.9698, barangay: "Malhacan" },
  { title: "Ospital ng Meycauayan", subtitle: "Bulac Road, Malhacan, Meycauayan", fullAddress: "Bulac Road, Brgy. Malhacan, Meycauayan City", lat: 14.7410, lng: 120.9698, barangay: "Malhacan" },
  { title: "Malhacan Barangay Hall", subtitle: "Malhacan, Meycauayan, Bulacan", fullAddress: "Barangay Hall, Brgy. Malhacan, Meycauayan City", lat: 14.7405, lng: 120.9705, barangay: "Malhacan" },
  { title: "NLEX Meycauayan Toll Plaza", subtitle: "Malhacan, Meycauayan, Bulacan", fullAddress: "NLEX Meycauayan Exit, Malhacan, Meycauayan City", lat: 14.7420, lng: 120.9720, barangay: "Malhacan" },

  // Banga
  { title: "Banga", subtitle: "Meycauayan, Bulacan", fullAddress: "Brgy. Banga, Meycauayan City, Bulacan", lat: 14.7300, lng: 120.9800, barangay: "Banga" },
  { title: "Meycauayan Doctors Hospital and Medical Center", subtitle: "Km 18 MacArthur Hwy, Banga, Meycauayan", fullAddress: "KM 18 MacArthur Highway, Brgy. Banga, Meycauayan City", lat: 14.7300, lng: 120.9800, barangay: "Banga" },
  { title: "IS Pavilion Commercial Center", subtitle: "MacArthur Hwy, Banga, Meycauayan", fullAddress: "MacArthur Highway, Brgy. Banga, Meycauayan City", lat: 14.7310, lng: 120.9790, barangay: "Banga" },

  // Calvario & Poblacion
  { title: "Calvario", subtitle: "Meycauayan, Bulacan", fullAddress: "Brgy. Calvario, Meycauayan City, Bulacan", lat: 14.7351, lng: 120.9596, barangay: "Calvario" },
  { title: "The Lord's Hospital", subtitle: "Meymart Road, Calvario, Meycauayan", fullAddress: "Meymart Road, Brgy. Calvario, Meycauayan City", lat: 14.7351, lng: 120.9596, barangay: "Calvario" },
  { title: "Meycauayan City Hall Complex", subtitle: "MacArthur Hwy, Poblacion, Meycauayan", fullAddress: "City Hall Complex, MacArthur Hwy, Meycauayan City", lat: 14.7350, lng: 120.9575, barangay: "Poblacion" },
  { title: "St. Francis of Assisi Parish Church", subtitle: "Poblacion, Meycauayan, Bulacan", fullAddress: "Poblacion, Meycauayan City, Bulacan", lat: 14.7345, lng: 120.9575, barangay: "Poblacion" },

  // Camalig
  { title: "Camalig", subtitle: "Meycauayan, Bulacan", fullAddress: "Brgy. Camalig, Meycauayan City, Bulacan", lat: 14.7718, lng: 120.9932, barangay: "Camalig" },
  { title: "MARYMOUNT HOSPITAL, INC.", subtitle: "34 Camalig Road, Camalig, Meycauayan", fullAddress: "34 Meycauayan–Camalig Road, Brgy. Camalig, Meycauayan City", lat: 14.7718, lng: 120.9932, barangay: "Camalig" },

  // Pandayan & Perez
  { title: "Pandayan", subtitle: "Meycauayan, Bulacan", fullAddress: "Brgy. Pandayan, Meycauayan City, Bulacan", lat: 14.7576, lng: 120.9773, barangay: "Pandayan" },
  { title: "Perez", subtitle: "Meycauayan, Bulacan", fullAddress: "Brgy. Perez, Meycauayan City, Bulacan", lat: 14.7600, lng: 120.9850, barangay: "Perez" },
  { title: "Bahay Pare", subtitle: "Meycauayan, Bulacan", fullAddress: "Brgy. Bahay Pare, Meycauayan City, Bulacan", lat: 14.7695, lng: 121.0138, barangay: "Bahay Pare" },
  { title: "Meycauayan District Hospital", subtitle: "Bahay Pare, Meycauayan City", fullAddress: "Brgy. Bahay Pare, Meycauayan City, Bulacan", lat: 14.7695, lng: 121.0138, barangay: "Bahay Pare" }
];

function cleanAddressQuery(raw) {
  return raw
    .replace(/\bCMPD\.?\b/gi, 'Compound')
    .replace(/\bST\.?\b/gi, 'Street')
    .replace(/\bAVE\.?\b/gi, 'Avenue')
    .replace(/\bBLVD\.?\b/gi, 'Boulevard')
    .replace(/\bBRGY\.?\b/gi, 'Barangay')
    .replace(/\bBLK\.?\b/gi, 'Block')
    .replace(/\bLOT\.?\b/gi, 'Lot')
    .replace(/\bRD\.?\b/gi, 'Road')
    .replace(/\bDR\.?\b/gi, 'Drive')
    .replace(/\bPH\.?\b/gi, 'Phase')
    .replace(/\bSUBD\.?\b/gi, 'Subdivision')
    .replace(/\b\d{2,4}\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function handleAddressInput(type) {
  const inputId = type === 'facility' ? 'fac-address' : 'brgy-address';
  const dropdownId = type === 'facility' ? 'fac-address-suggestions' : 'brgy-address-suggestions';
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  const val = input.value.trim();
  currentSelectedSuggestionIndex = -1;

  if (val.length < 2) {
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
    return;
  }

  clearTimeout(addressSearchDebounceTimer);
  dropdown.style.display = 'block';
  dropdown.innerHTML = `<div class="suggestion-loading"><i class="fas fa-spinner fa-spin"></i> Searching locations in Meycauayan...</div>`;

  addressSearchDebounceTimer = setTimeout(async () => {
    const suggestions = await fetchAddressSuggestions(val);
    renderAddressSuggestions(type, suggestions, val);
  }, 180);
}

function handleAddressKeydown(e, type) {
  const dropdownId = type === 'facility' ? 'fac-address-suggestions' : 'brgy-address-suggestions';
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown || dropdown.style.display === 'none') {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchAddressOnMap(type);
    }
    return;
  }

  const items = dropdown.querySelectorAll('.address-suggestion-item');
  if (!items.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    currentSelectedSuggestionIndex = (currentSelectedSuggestionIndex + 1) % items.length;
    updateSuggestionHighlight(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    currentSelectedSuggestionIndex = (currentSelectedSuggestionIndex - 1 + items.length) % items.length;
    updateSuggestionHighlight(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (currentSelectedSuggestionIndex >= 0 && items[currentSelectedSuggestionIndex]) {
      items[currentSelectedSuggestionIndex].click();
    } else {
      searchAddressOnMap(type);
    }
  } else if (e.key === 'Escape') {
    dropdown.style.display = 'none';
  }
}

function updateSuggestionHighlight(items) {
  items.forEach((it, idx) => {
    if (idx === currentSelectedSuggestionIndex) {
      it.classList.add('is-selected');
      it.scrollIntoView({ block: 'nearest' });
    } else {
      it.classList.remove('is-selected');
    }
  });
}

function highlightMatch(text, query) {
  if (!query || !text) return escapeHtml(text || '');
  const q = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!q) return escapeHtml(text);
  const regex = new RegExp(`(${q})`, 'gi');
  return escapeHtml(text).replace(regex, '<strong>$1</strong>');
}

/* ============================================================
   GOOGLE PLUS CODE (OPEN LOCATION CODE) DECODER
   ============================================================ */
const OLC_ALPHABET = '23456789CFGHJMPQRVWX';

function decodePlusCode(raw) {
  if (!raw) return null;
  const m = raw.match(/\b([23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,4})\b/i);
  if (!m) return null;

  let code = m[1].toUpperCase();
  if (code.indexOf('+') === 4) {
    code = '7Q62' + code;
  }
  code = code.replace('+', '');
  if (code.length < 8) return null;

  let lat = -90, lng = -180;
  let latVal = 20, lngVal = 20;

  for (let i = 0; i < Math.min(code.length, 10); i += 2) {
    const latIdx = OLC_ALPHABET.indexOf(code[i]);
    const lngIdx = OLC_ALPHABET.indexOf(code[i + 1]);
    if (latIdx === -1 || lngIdx === -1) return null;
    lat += latIdx * latVal;
    lng += lngIdx * lngVal;
    latVal /= 20;
    lngVal /= 20;
  }

  const finalLat = +(lat + latVal * 10).toFixed(6);
  const finalLng = +(lng + lngVal * 10).toFixed(6);

  if (finalLat >= 14.5 && finalLat <= 15.0 && finalLng >= 120.7 && finalLng <= 121.2) {
    return { lat: finalLat, lng: finalLng, originalCode: m[1] };
  }
  return null;
}

async function fetchAddressSuggestions(query) {
  const suggestions = [];
  const queryLower = query.toLowerCase();
  const tokens = queryLower.split(/[\s,.-]+/).filter(t => t.length > 1);

  // 0a. Check Google Plus Code (e.g. "PXVJ+R8", "PXVJ+R8 Meycauayan, Bulacan")
  const plusCodeResult = decodePlusCode(query);
  if (plusCodeResult) {
    return [{
      title: `Google Plus Code: ${plusCodeResult.originalCode}`,
      subtitle: `Decoded location (${plusCodeResult.lat}, ${plusCodeResult.lng}) in Meycauayan`,
      fullAddress: query,
      lat: plusCodeResult.lat,
      lng: plusCodeResult.lng,
      icon: 'fas fa-location-crosshairs',
      score: 9999
    }];
  }

  // 0b. Check if user pasted Google Maps URL or raw coordinates
  const coordMatch = query.match(/@?(-?\d{1,2}\.\d{4,}),\s*(-?\d{2,3}\.\d{4,})/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    return [{
      title: `Pinned Coordinates (${lat.toFixed(6)}, ${lng.toFixed(6)})`,
      subtitle: `Detected from Google Maps / Coordinates input`,
      fullAddress: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      lat: lat,
      lng: lng,
      icon: 'fas fa-crosshairs',
      score: 999
    }];
  }

  // 1. Match from Curated Places Index
  MEYCAUAYAN_PLACES_INDEX.forEach(p => {
    const fullText = `${p.title} ${p.subtitle} ${p.fullAddress}`.toLowerCase();
    const matchScore = tokens.filter(t => fullText.includes(t)).length;
    if (matchScore > 0) {
      suggestions.push({
        ...p,
        icon: p.title.toLowerCase().includes('school') ? 'fas fa-graduation-cap' : p.title.toLowerCase().includes('hospital') ? 'fas fa-hospital' : p.title.toLowerCase().includes('hall') ? 'fas fa-landmark' : 'fas fa-location-dot',
        score: matchScore * 10
      });
    }
  });

  // 2. Match from local Barangays database
  if (cachedBarangays && Array.isArray(cachedBarangays)) {
    cachedBarangays.forEach(b => {
      if (b.name.toLowerCase().includes(queryLower) && !suggestions.some(s => s.title.toLowerCase() === b.name.toLowerCase())) {
        let lat = 14.7368, lng = 120.9610;
        if (b.geojson) {
          try {
            const polyLayer = L.geoJSON(b.geojson);
            const center = polyLayer.getBounds().getCenter();
            lat = center.lat;
            lng = center.lng;
          } catch(e) {}
        }
        suggestions.push({
          title: `Brgy. ${b.name}`,
          subtitle: `${b.address || 'Barangay Hall'}, Meycauayan City`,
          fullAddress: b.address || `Brgy. ${b.name}, Meycauayan City`,
          lat: lat,
          lng: lng,
          icon: 'fas fa-map-pin',
          barangay: b.name,
          score: 8
        });
      }
    });
  }

  // 3. Match from local Facilities
  if (cachedFacilities) {
    Object.values(cachedFacilities).flat().forEach(f => {
      if (f.name.toLowerCase().includes(queryLower) || (f.address && f.address.toLowerCase().includes(queryLower))) {
        if (!suggestions.some(s => s.title.toLowerCase() === f.name.toLowerCase())) {
          suggestions.push({
            title: f.name,
            subtitle: `${f.address || ''} (${f.barangay || 'Meycauayan'})`,
            fullAddress: f.address || f.name,
            lat: parseFloat(f.lat),
            lng: parseFloat(f.lng),
            icon: f.type === 'hospital' ? 'fas fa-hospital' : f.type === 'police' ? 'fas fa-shield-halved' : f.type === 'fire' ? 'fas fa-fire-extinguisher' : 'fas fa-building',
            barangay: f.barangay,
            score: 7
          });
        }
      }
    });
  }

  // 4. Query backend places search API
  try {
    const res = await fetch(`api/search_places.php?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (!suggestions.some(s => Math.abs(s.lat - item.lat) < 0.0005 && Math.abs(s.lng - item.lng) < 0.0005)) {
          suggestions.push(item);
        }
      });
    }
  } catch(err) {}

  // Sort by match score
  suggestions.sort((a, b) => (b.score || 0) - (a.score || 0));
  return suggestions.slice(0, 8);
}

function renderAddressSuggestions(type, suggestions, query) {
  const dropdownId = type === 'facility' ? 'fac-address-suggestions' : 'brgy-address-suggestions';
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;

  if (!suggestions || suggestions.length === 0) {
    dropdown.innerHTML = `
      <div class="suggestion-empty">
        <i class="fas fa-circle-question" style="color:#f59e0b;"></i>
        <span>No matching place found. Click on the map to place pin directly.</span>
      </div>`;
    return;
  }

  dropdown.innerHTML = suggestions.map((s, idx) => `
    <div class="address-suggestion-item" data-index="${idx}" onclick="selectAddressSuggestion('${type}', ${s.lat}, ${s.lng}, '${escapeHtml(s.fullAddress)}', '${escapeHtml(s.barangay || '')}')">
      <div class="suggestion-icon"><i class="${s.icon || 'fas fa-location-dot'}"></i></div>
      <div class="suggestion-text">
        <span class="suggestion-title">${highlightMatch(s.title, query)}</span>
        <span class="suggestion-subtitle">${escapeHtml(s.subtitle)}</span>
      </div>
    </div>
  `).join('');
}

function selectAddressSuggestion(type, lat, lng, fullAddress, brgyHint) {
  const inputId = type === 'facility' ? 'fac-address' : 'brgy-address';
  const dropdownId = type === 'facility' ? 'fac-address-suggestions' : 'brgy-address-suggestions';
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);

  if (input) input.value = fullAddress;
  if (dropdown) dropdown.style.display = 'none';

  if (type === 'facility') {
    if (facMap) {
      facMap.flyTo([lat, lng], 17, { duration: 0.8 });
      setFacilityMapPin(lat, lng, true);
    }
  } else {
    if (brgyMap) {
      brgyMap.flyTo([lat, lng], 17, { duration: 0.8 });
      setBarangayMapPin(lat, lng, true);
    }
  }

  showToast(`Location found & pinned on map!`, 'success');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Close suggestion dropdowns when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.address-autocomplete-wrapper')) {
    const facDrop = document.getElementById('fac-address-suggestions');
    const brgyDrop = document.getElementById('brgy-address-suggestions');
    if (facDrop) facDrop.style.display = 'none';
    if (brgyDrop) brgyDrop.style.display = 'none';
  }
});

async function tryNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=ph`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  const data = await res.json();
  if (data && data.length > 0) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }
  return null;
}

async function searchAddressOnMap(type) {
  const inputId = type === 'facility' ? 'fac-address' : 'brgy-address';
  const dropdownId = type === 'facility' ? 'fac-address-suggestions' : 'brgy-address-suggestions';
  const dropdown = document.getElementById(dropdownId);
  if (dropdown) dropdown.style.display = 'none';

  const query = document.getElementById(inputId)?.value.trim();
  const nameQuery = type === 'facility'
    ? document.getElementById('fac-name')?.value.trim()
    : document.getElementById('brgy-name')?.value.trim();

  const searchTerm = query || nameQuery;
  if (!searchTerm) {
    showToast('Please type an address or landmark name.', 'info');
    return;
  }

  showToast(`Locating "${searchTerm}" on map...`, 'info');

  // 1. Check if suggestions exist for this query
  const suggestions = await fetchAddressSuggestions(searchTerm);
  if (suggestions && suggestions.length > 0) {
    const top = suggestions[0];
    selectAddressSuggestion(type, top.lat, top.lng, top.fullAddress, top.barangay || '');
    return;
  }

  // 2. Try Nominatim Geocoding
  const cleaned = cleanAddressQuery(searchTerm);
  const withCity = searchTerm.toLowerCase().includes('meycauayan')
    ? searchTerm
    : `${searchTerm}, Meycauayan City, Bulacan, Philippines`;
  const cleanedWithCity = `${cleaned}, Meycauayan City, Bulacan, Philippines`;

  try {
    let result = await tryNominatim(withCity);
    if (!result) result = await tryNominatim(cleanedWithCity);

    if (result) {
      const { lat, lng } = result;
      if (type === 'facility') {
        if (facMap) {
          facMap.flyTo([lat, lng], 17, { duration: 0.8 });
          setFacilityMapPin(lat, lng, true);
        }
      } else {
        if (brgyMap) {
          brgyMap.flyTo([lat, lng], 17, { duration: 0.8 });
          setBarangayMapPin(lat, lng, true);
        }
      }
      showToast('Location pinned on map!', 'success');
      return;
    }

    // 3. Fallback: match against known barangay names
    const matchedBrgy = cachedBarangays.find(b =>
      searchTerm.toLowerCase().includes(b.name.toLowerCase())
    );
    if (matchedBrgy && matchedBrgy.geojson) {
      const polyLayer = L.geoJSON(matchedBrgy.geojson);
      const center = polyLayer.getBounds().getCenter();
      if (type === 'facility') {
        facMap.flyTo(center, 16, { duration: 0.8 });
        setFacilityMapPin(center.lat, center.lng, true);
      } else {
        brgyMap.flyTo(center, 16, { duration: 0.8 });
        setBarangayMapPin(center.lat, center.lng, true);
      }
      showToast(`Pinned near center of Brgy. ${matchedBrgy.name}`, 'success');
      return;
    }

    showToast('Location not found. Click anywhere on the map to place the pin directly.', 'warning');
  } catch (err) {
    showToast('Could not reach search service. Click anywhere on the map to place the pin.', 'warning');
  }
}

/* ============================================================
   BARANGAY MODAL
   ============================================================ */
let barangayModal;

function openBarangayModal(barangayId) {
  document.getElementById('brgy-id').value = barangayId || '';
  document.getElementById('barangay-modal-label').textContent = barangayId ? 'Edit Barangay' : 'Add Barangay';

  let brgyObj = null;
  if (barangayId) {
    brgyObj = cachedBarangays.find(x => x.id === barangayId);
    if (brgyObj) {
      document.getElementById('brgy-name').value        = brgyObj.name || '';
      document.getElementById('brgy-captain').value     = brgyObj.captain || '';
      document.getElementById('brgy-population').value  = brgyObj.population || '';
      document.getElementById('brgy-area').value        = brgyObj.area || '';
      document.getElementById('brgy-contact').value     = brgyObj.contact || '';
      document.getElementById('brgy-address').value     = brgyObj.address || '';
      document.getElementById('brgy-description').value = brgyObj.description || '';
    }
  } else {
    document.getElementById('brgy-name').value        = '';
    document.getElementById('brgy-captain').value     = '';
    document.getElementById('brgy-population').value  = '';
    document.getElementById('brgy-area').value        = '';
    document.getElementById('brgy-contact').value     = '';
    document.getElementById('brgy-address').value     = '';
    document.getElementById('brgy-description').value = '';
  }

  const modalEl = document.getElementById('barangay-modal');
  barangayModal = barangayModal || new bootstrap.Modal(modalEl);
  barangayModal.show();

  // Initialize map when modal is fully visible
  const onShown = () => {
    initBarangayMapPicker(null, null, brgyObj ? brgyObj.name : '');
    modalEl.removeEventListener('shown.bs.modal', onShown);
  };
  modalEl.addEventListener('shown.bs.modal', onShown);
}

async function saveBarangay() {
  const id   = parseInt(document.getElementById('brgy-id').value) || 0;
  const name = document.getElementById('brgy-name').value.trim();
  const cap  = document.getElementById('brgy-captain').value.trim();
  const pop  = document.getElementById('brgy-population').value.trim();
  const area = document.getElementById('brgy-area').value.trim();
  const con  = document.getElementById('brgy-contact').value.trim();
  const addr = document.getElementById('brgy-address').value.trim();
  const desc = document.getElementById('brgy-description').value.trim();

  if (!name) { showToast('Barangay name is required.', 'error'); return; }

  const payload = {
    name,
    captain: cap,
    population: pop ? parseInt(pop) : null,
    area,
    contact: con,
    address: addr,
    description: desc
  };

  if (id) {
    payload.id = id;
  }

  try {
    const method = id ? 'PUT' : 'POST';
    const res = await fetch('api/barangays.php', {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      barangayModal.hide();
      showToast(id ? 'Barangay updated successfully.' : 'Barangay added successfully.', 'success');
      initAdminApp();
    } else {
      showToast(data.error || 'Failed to save.', 'error');
    }
  } catch (err) {
    showToast('Server error: ' + err.message, 'error');
  }
}

async function deleteBarangay(barangayId) {
  if (!confirm('Are you sure you want to delete this barangay?')) return;
  try {
    const res = await fetch('api/barangays.php', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: barangayId })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Barangay deleted.', 'info');
      initAdminApp();
    } else {
      showToast(data.error || 'Failed to delete.', 'error');
    }
  } catch (err) {
    showToast('Server error: ' + err.message, 'error');
  }
}

/* ============================================================
   FACILITY TABLES
   ============================================================ */
function renderFacilityTable(type) {
  const tbodyId = {
    police:       'police-tbody',
    fire:         'fire-tbody',
    hospital:     'hospitals-tbody',
    healthCenter: 'health-tbody',
    cdrrmo:       'cdrrmo-tbody'
  };

  const list  = cachedFacilities[type] || [];
  const tbody = document.getElementById(tbodyId[type]);
  if (!tbody) return;

  const pic = f => f.person_in_charge || f.commander || '—';

  if (type === 'healthCenter') {
    tbody.innerHTML = list.map(f => `
      <tr>
        <td style="font-weight:600; color: var(--clr-text-primary);">${f.name}</td>
        <td>${f.barangay || '—'}</td>
        <td>${f.contact || '—'}</td>
        <td>${pic(f)}</td>
        <td>${f.operating_hours || '—'}</td>
        <td>${actionButtons(f.id, type)}</td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = list.map(f => `
      <tr>
        <td style="font-weight:600; color: var(--clr-text-primary);">${f.name}</td>
        <td><span class="type-pill ${type}">${f.subtype || type}</span></td>
        <td>${f.barangay || '—'}</td>
        <td>${f.contact || '—'}</td>
        <td>${pic(f)}</td>
        <td>${actionButtons(f.id, type)}</td>
      </tr>
    `).join('');
  }
}

function actionButtons(id, type) {
  return `
    <button class="btn-tbl" onclick="openFacilityModal('${type}', '${id}')" style="margin-right:4px;">
      <i class="fas fa-pen"></i> Edit
    </button>
    <button class="btn-tbl danger" onclick="deleteFacility('${type}', '${id}')">
      <i class="fas fa-trash"></i> Delete
    </button>
  `;
}

/* ============================================================
   FACILITY MODAL
   ============================================================ */
let facilityModal;

function openFacilityModal(type, facilityId) {
  const typeLabels = {
    police: 'Police Station',
    fire: 'Fire Station',
    hospital: 'Public Hospital',
    healthCenter: 'Health Center',
    cdrrmo: 'CDRRMO / Rescue'
  };

  document.getElementById('fac-type').value = type;
  document.getElementById('fac-id').value   = facilityId || '';
  document.getElementById('facility-modal-label').textContent =
    facilityId ? `Edit ${typeLabels[type]}` : `Add ${typeLabels[type]}`;

  // Populate barangay select
  const brgySelect = document.getElementById('fac-barangay');
  brgySelect.innerHTML = `<option value="">Select Barangay</option>` +
    cachedBarangays.map(b => `<option value="${b.name}">${b.name}</option>`).join('');

  let f = null;
  // Load existing data if editing
  if (facilityId) {
    const list = cachedFacilities[type] || [];
    f = list.find(x => x.id === facilityId);

    if (f) {
      document.getElementById('fac-name').value    = f.name;
      document.getElementById('fac-subtype').value = f.subtype || '';
      document.getElementById('fac-barangay').value= f.barangay || '';
      document.getElementById('fac-address').value = f.address || '';
      document.getElementById('fac-contact').value = f.contact || '';
      document.getElementById('fac-hotline').value = f.emergency_hotline || '';
      document.getElementById('fac-pic').value     = f.person_in_charge || '';
      document.getElementById('fac-hours').value   = f.operating_hours || '';
      document.getElementById('fac-lat').value     = f.lat || '';
      document.getElementById('fac-lng').value     = f.lng || '';
    }
  } else {
    // Clear form
    ['fac-name','fac-subtype','fac-address','fac-contact','fac-hotline','fac-pic','fac-hours','fac-lat','fac-lng']
      .forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('fac-barangay').value = '';
  }

  const modalEl = document.getElementById('facility-modal');
  facilityModal = facilityModal || new bootstrap.Modal(modalEl);
  facilityModal.show();

  // Initialize map when modal is fully rendered
  const onShown = () => {
    initFacilityMapPicker(f ? f.lat : null, f ? f.lng : null);
    modalEl.removeEventListener('shown.bs.modal', onShown);
  };
  modalEl.addEventListener('shown.bs.modal', onShown);
}

async function saveFacility() {
  const type     = document.getElementById('fac-type').value;
  const id       = document.getElementById('fac-id').value;
  const name     = document.getElementById('fac-name').value.trim();
  const subtype  = document.getElementById('fac-subtype').value.trim();
  const barangay = document.getElementById('fac-barangay').value;
  const address  = document.getElementById('fac-address').value.trim();
  const contact  = document.getElementById('fac-contact').value.trim();
  const hotline  = document.getElementById('fac-hotline').value.trim();
  const pic      = document.getElementById('fac-pic').value.trim();
  const hours    = document.getElementById('fac-hours').value.trim();
  const lat      = parseFloat(document.getElementById('fac-lat').value);
  const lng      = parseFloat(document.getElementById('fac-lng').value);

  if (!name) { showToast('Facility name is required.', 'error'); return; }
  if (!address) { showToast('Address is required.', 'error'); return; }
  if (isNaN(lat) || isNaN(lng)) { showToast('Valid coordinates are required.', 'error'); return; }

  const payload = {
    id:               id || `${type}-${Date.now()}`,
    name, type, subtype, barangay, address, contact,
    emergency_hotline: hotline,
    person_in_charge:   pic,
    operating_hours:   hours,
    lat, lng,
    google_maps_url: `https://www.google.com/maps/search/${encodeURIComponent(name)}/@${lat},${lng},17z`
  };

  try {
    const method = id ? 'PUT' : 'POST';
    const res = await fetch('api/facilities.php', {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      facilityModal.hide();
      showToast(id ? 'Facility updated successfully.' : 'Facility added successfully.', 'success');
      initAdminApp();
    } else {
      showToast(data.error || 'Failed to save.', 'error');
    }
  } catch (err) {
    showToast('Server error: ' + err.message, 'error');
  }
}

async function deleteFacility(type, facilityId) {
  if (!confirm('Are you sure you want to delete this facility?')) return;
  try {
    const res = await fetch('api/facilities.php', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: facilityId })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Facility deleted.', 'info');
      initAdminApp();
    } else {
      showToast(data.error || 'Failed to delete.', 'error');
    }
  } catch (err) {
    showToast('Server error: ' + err.message, 'error');
  }
}

/* ============================================================
   HOTLINES TABLE
   ============================================================ */
function renderHotlinesTable() {
  const tbody = document.getElementById('hotlines-tbody');
  if (!tbody) return;

  tbody.innerHTML = cachedHotlines.map(h => `
    <tr>
      <td><i class="${h.icon_class}" style="color:var(--clr-red-500); margin-right:7px;"></i>${h.category || '—'}</td>
      <td>${h.name}</td>
      <td style="font-weight:600; color:var(--clr-text-primary);">${h.local_number || '—'}</td>
      <td>${h.national_number ? `<span style="color:var(--clr-amber);">${h.national_number}</span>` : '—'}</td>
    </tr>
  `).join('');
}

/* ============================================================
   ANNOUNCEMENTS (OFFICIAL BROADCAST HUB)
   ============================================================ */
function getAnnouncementMetaAdmin(message, forcedCategory = null) {
  const m = (message || '').toLowerCase();

  // Explicit category only if passed as a non-'auto' argument (e.g. from preview)
  const cat = (forcedCategory && forcedCategory !== 'auto') ? forcedCategory : null;

  if (cat === 'danger') {
    return {
      typeClass: 'cat-danger',
      icon: 'fas fa-fire-flame-curved',
      label: 'EMERGENCY / FIRE',
      source: 'Meycauayan BFP & Emergency Command',
      borderColor: '#ef4444'
    };
  }
  if (cat === 'warning') {
    return {
      typeClass: 'cat-warning',
      icon: 'fas fa-triangle-exclamation',
      label: 'WEATHER / CDRRMO',
      source: 'Meycauayan CDRRMO / PAGASA',
      borderColor: '#f59e0b'
    };
  }
  if (cat === 'health') {
    return {
      typeClass: 'cat-health',
      icon: 'fas fa-hospital-user',
      label: 'PUBLIC HEALTH',
      source: 'City Health Office (CHO)',
      borderColor: '#10b981'
    };
  }
  if (cat === 'info') {
    return {
      typeClass: 'cat-info',
      icon: 'fas fa-bullhorn',
      label: 'PUBLIC NOTICE',
      source: 'City Government of Meycauayan',
      borderColor: '#00e5ff'
    };
  }

  // --- AUTO-DETECTION HEURISTICS (Specific -> Broad) ---
  // 1. GIS Portal & Public Directory (Checked first to avoid false match on "police/fire/hospitals")
  if (m.includes('gis portal') || m.includes('portal is now live') || (m.includes('portal') && !m.includes('hospital')) || m.includes('locate nearest') || m.includes('public directory')) {
    return {
      typeClass: 'cat-info',
      icon: 'fas fa-bullhorn',
      label: 'PUBLIC NOTICE',
      source: 'City Government of Meycauayan',
      borderColor: '#00e5ff'
    };
  }

  // 2. Fire & 911 Emergency Alert (Specific fire incidents)
  if (m.includes('fire emergency') || m.includes('in case of fire') || m.includes('sunog') || m.includes('bfp') || m.includes('dial 911') || m.includes('call 911') || m.includes('fire alert') || m.includes('fire alarm') || m.includes('evacuation')) {
    return {
      typeClass: 'cat-danger',
      icon: 'fas fa-fire-flame-curved',
      label: 'EMERGENCY / FIRE',
      source: 'Meycauayan BFP & Emergency Command',
      borderColor: '#ef4444'
    };
  }

  // 3. Weather & Disaster Advisory
  if (m.includes('typhoon') || m.includes('flood') || m.includes('rainfall') || m.includes('storm') || m.includes('weather') || m.includes('pagasa') || m.includes('cdrrmo') || m.includes('baha') || m.includes('bagyo')) {
    return {
      typeClass: 'cat-warning',
      icon: 'fas fa-triangle-exclamation',
      label: 'WEATHER / CDRRMO',
      source: 'Meycauayan CDRRMO / PAGASA',
      borderColor: '#f59e0b'
    };
  }

  // 4. Health & Medical Notice
  if (m.includes('medical') || m.includes('hospital') || m.includes('health') || m.includes('ambulance') || m.includes('clinic') || m.includes('doctor') || m.includes('cho')) {
    return {
      typeClass: 'cat-health',
      icon: 'fas fa-hospital-user',
      label: 'PUBLIC HEALTH',
      source: 'City Health Office (CHO)',
      borderColor: '#10b981'
    };
  }

  // 5. Default Fallback -> Public Notice
  return {
    typeClass: 'cat-info',
    icon: 'fas fa-bullhorn',
    label: 'PUBLIC NOTICE',
    source: 'City Government of Meycauayan',
    borderColor: '#00e5ff'
  };
}

const ANNOUNCEMENT_TEMPLATES = {
  fire: {
    category: 'danger',
    text: 'In case of fire emergency, call BFP Meycauayan at (044) 840-0100 or dial 911 immediately. Keep emergency exits clear.'
  },
  typhoon: {
    category: 'warning',
    text: 'Typhoon & Weather Advisory: Heavy rainfall and flood warning raised over Meycauayan City. Monitor PAGASA and CDRRMO advisories.'
  },
  medical: {
    category: 'health',
    text: 'Medical Advisory: Meycauayan City Hospital Emergency Room operates 24/7. For ambulance assistance, contact (044) 840-0200.'
  },
  portal: {
    category: 'info',
    text: 'Meycauayan City Emergency GIS Portal is now live. Locate nearest police, fire stations, hospitals, and barangay halls in real-time.'
  }
};

function insertAnnouncementTemplate(type) {
  const tmpl = ANNOUNCEMENT_TEMPLATES[type];
  if (!tmpl) return;

  const textarea = document.getElementById('announcement-text');
  const catSelect = document.getElementById('announcement-category');

  if (catSelect) {
    catSelect.value = tmpl.category;
  }
  if (textarea) {
    textarea.value = tmpl.text;
    updateAnnouncementPreview();
    textarea.focus();
  }
}

function openAnnouncementModal() {
  showSection('announcements');
  const textarea = document.getElementById('announcement-text');
  if (textarea) {
    setTimeout(() => {
      textarea.focus();
      textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
}

function updateAnnouncementPreview() {
  const textarea = document.getElementById('announcement-text');
  const catSelect = document.getElementById('announcement-category');
  const countEl = document.getElementById('announcement-char-count');
  const previewBox = document.getElementById('announcement-live-preview');
  const previewText = document.getElementById('preview-text');
  const previewTagText = document.getElementById('preview-tag-text');
  const previewIcon = document.getElementById('preview-icon');
  const previewSource = document.getElementById('preview-source');
  const previewTag = document.getElementById('preview-tag');

  if (!textarea) return;

  const val = textarea.value.trim();
  const cat = catSelect ? catSelect.value : 'auto';

  if (countEl) countEl.textContent = `${val.length} characters`;

  if (!val) {
    if (previewText) previewText.textContent = 'Your announcement preview will appear here as you type...';
    if (previewTagText) previewTagText.textContent = 'PUBLIC INFORMATION';
    if (previewIcon) previewIcon.className = 'fas fa-bullhorn';
    if (previewTag) previewTag.className = 'preview-tag cat-info';
    if (previewSource) previewSource.innerHTML = '<i class="fas fa-shield-halved text-cyan me-1"></i> City Government of Meycauayan';
    if (previewBox) previewBox.style.borderLeftColor = '#00e5ff';
    return;
  }

  const meta = getAnnouncementMetaAdmin(val, cat);
  if (previewText) previewText.textContent = val;
  if (previewTagText) previewTagText.textContent = meta.label;
  if (previewIcon) previewIcon.className = meta.icon;
  if (previewTag) previewTag.className = `preview-tag ${meta.typeClass}`;
  if (previewSource) previewSource.innerHTML = `<i class="fas fa-shield-halved text-cyan me-1"></i> ${meta.source}`;
  if (previewBox && meta.borderColor) previewBox.style.borderLeftColor = meta.borderColor;
}

function renderAnnouncementsTable() {
  const tbody = document.getElementById('announcements-tbody');
  const totalBadge = document.getElementById('announcements-total-badge');
  if (totalBadge) totalBadge.textContent = `${cachedAnnouncements.length} Published`;
  if (!tbody) return;

  if (cachedAnnouncements.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--text-300); text-align:center; padding:30px;"><i class="fas fa-bullhorn me-2"></i>No active announcements published.</td></tr>`;
    return;
  }

  tbody.innerHTML = cachedAnnouncements.map((ann, i) => {
    const meta = getAnnouncementMetaAdmin(ann.message);
    return `
      <tr>
        <td style="font-family:var(--font-mono); color:var(--text-300); font-weight:700;">${i + 1}</td>
        <td>
          <span class="announcement-cat-badge ${meta.typeClass}">
            <i class="${meta.icon}"></i> ${meta.label}
          </span>
        </td>
        <td style="color:#e2e8f0; font-size:13px; line-height:1.5;">
          <div style="font-weight:500;">${escapeHtml(ann.message)}</div>
          <div style="font-size:11px; color:var(--text-300); margin-top:4px;">
            <i class="fas fa-building-columns me-1"></i> ${meta.source}
          </div>
        </td>
        <td>
          <span class="badge-status-active"><span class="active-dot"></span> LIVE</span>
        </td>
        <td style="text-align:right; white-space:nowrap;">
          <button class="btn-tbl edit me-1" onclick="editAnnouncement(${ann.id})" title="Edit Announcement">
            <i class="fas fa-pen-to-square"></i> Edit
          </button>
          <button class="btn-tbl danger" onclick="deleteAnnouncement(${ann.id})" title="Delete Announcement">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function editAnnouncement(id) {
  const ann = cachedAnnouncements.find(a => a.id == id);
  if (!ann) return;

  const idInput = document.getElementById('announcement-id');
  const textInput = document.getElementById('announcement-text');
  const catSelect = document.getElementById('announcement-category');
  const titleEl = document.getElementById('announcement-form-title');
  const saveBtn = document.getElementById('btn-save-announcement');
  const cancelBtn = document.getElementById('btn-cancel-announcement');

  if (idInput) idInput.value = ann.id;
  if (textInput) textInput.value = ann.message;
  if (catSelect) catSelect.value = 'auto';
  if (titleEl) titleEl.innerHTML = `<i class="fas fa-pen-to-square me-2" style="color:#f59e0b;"></i>Edit Broadcast #${ann.id}`;
  if (saveBtn) saveBtn.innerHTML = `<i class="fas fa-check"></i> UPDATE BROADCAST`;
  if (cancelBtn) cancelBtn.style.display = 'inline-flex';

  updateAnnouncementPreview();
  textInput.focus();
  textInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function cancelAnnouncementEdit() {
  const idInput = document.getElementById('announcement-id');
  const textInput = document.getElementById('announcement-text');
  const catSelect = document.getElementById('announcement-category');
  const titleEl = document.getElementById('announcement-form-title');
  const saveBtn = document.getElementById('btn-save-announcement');
  const cancelBtn = document.getElementById('btn-cancel-announcement');

  if (idInput) idInput.value = '';
  if (textInput) textInput.value = '';
  if (catSelect) catSelect.value = 'auto';
  if (titleEl) titleEl.innerHTML = `<i class="fas fa-pen-to-square me-2" style="color:var(--accent-cyan);"></i>Create New Broadcast`;
  if (saveBtn) saveBtn.innerHTML = `<i class="fas fa-paper-plane"></i> PUBLISH BROADCAST`;
  if (cancelBtn) cancelBtn.style.display = 'none';

  updateAnnouncementPreview();
}

async function saveAnnouncement() {
  const id = document.getElementById('announcement-id')?.value.trim();
  const text = document.getElementById('announcement-text')?.value.trim();

  if (!text) {
    showToast('Please type an announcement message.', 'error');
    return;
  }

  const isEdit = Boolean(id);
  const method = isEdit ? 'PUT' : 'POST';
  const payload = isEdit ? { id: parseInt(id), message: text } : { message: text };

  showToast(isEdit ? 'Updating broadcast...' : 'Publishing broadcast...', 'info');

  try {
    const res = await fetch('api/announcements.php', {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      cancelAnnouncementEdit();
      showToast(isEdit ? 'Broadcast updated successfully!' : 'New broadcast published live!', 'success');
      initAdminApp();
    } else {
      showToast(data.error || 'Failed to save announcement.', 'error');
    }
  } catch (err) {
    showToast('Server error: ' + err.message, 'error');
  }
}

async function deleteAnnouncement(id) {
  if (!confirm('Are you sure you want to remove this announcement from the citizen portal?')) return;
  try {
    const res = await fetch('api/announcements.php', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Announcement removed.', 'info');
      initAdminApp();
    } else {
      showToast(data.error || 'Failed to delete.', 'error');
    }
  } catch (err) {
    showToast('Server error: ' + err.message, 'error');
  }
}

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */
function showToast(message, type = 'info') {
  const icons = { success: 'fas fa-check-circle', error: 'fas fa-circle-exclamation', info: 'fas fa-circle-info' };
  const container = document.getElementById('toast-container');

  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;
  toast.innerHTML = `<i class="${icons[type]}"></i> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ============================================================
   INIT
   ============================================================ */
async function initAdminApp() {
  try {
    const [resBrgys, resFacs, resHotlines, resAnnounces] = await Promise.all([
      fetch('api/barangays.php').then(r => r.json()),
      fetch('api/facilities.php').then(r => r.json()),
      fetch('api/hotlines.php').then(r => r.json()),
      fetch('api/announcements.php').then(r => r.json())
    ]);

    cachedBarangays = resBrgys;
    cachedHotlines = resHotlines;
    cachedAnnouncements = resAnnounces;

    cachedFacilities = { police: [], fire: [], hospital: [], healthCenter: [], cdrrmo: [] };
    resFacs.forEach(f => {
      if (cachedFacilities[f.type]) {
        cachedFacilities[f.type].push(f);
      }
    });

    renderBarangayTable();
    renderFacilityTable('police');
    renderFacilityTable('fire');
    renderFacilityTable('hospital');
    renderFacilityTable('healthCenter');
    renderFacilityTable('cdrrmo');
    renderHotlinesTable();
    renderAnnouncementsTable();
    refreshDashboardStats();
  } catch (err) {
    showToast('Failed to load database: ' + err.message, 'error');
  }
}

// Auto-check login session on page load
document.addEventListener('DOMContentLoaded', () => {
  const token = sessionStorage.getItem('admin_token');
  const username = sessionStorage.getItem('admin_username');
  if (token && username) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-app').style.display = 'block';
    const userDisp = document.getElementById('admin-username-display');
    if (userDisp) userDisp.textContent = username;
    const lastUpd = document.getElementById('dash-last-updated');
    if (lastUpd) lastUpd.textContent = new Date().toLocaleString();
    initAdminApp();
  } else {
    document.getElementById('admin-app').style.display = 'none';
  }
});

/* ============================================================
   MOBILE SIDEBAR TOGGLE LOGIC
   ============================================================ */
function toggleAdminSidebar() {
  const sidebar = document.getElementById('admin-sidebar');
  const backdrop = document.getElementById('admin-sidebar-backdrop');
  if (!sidebar) return;

  const isOpen = sidebar.classList.contains('open');
  if (isOpen) {
    closeAdminSidebar();
  } else {
    sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('active');
  }
}

function closeAdminSidebar() {
  const sidebar = document.getElementById('admin-sidebar');
  const backdrop = document.getElementById('admin-sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('active');
}
