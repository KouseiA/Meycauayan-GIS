// script.js — Meycauayan City Emergency GIS Portal
// Main Map Logic, Barangay Focus Mode, Facility Markers, Search with PHP/MySQL backend

'use strict';

/* ============================================================
   STATE
   ============================================================ */
const State = {
  map: null,
  selectedBarangayId: null,
  activeFilter: 'all',
  activeCategories: {
    police: true,
    hospital: true,
    fire: true,
    healthCenter: true,
    cdrrmo: true,
    barangayHall: true
  },
  geojsonLayers: {},          // barangay polygon layers by id
  barangayMarkers: [],        // barangay hall markers at centroid locations
  facilityLayers: {           // marker layers by type
    police: [],
    fire: [],
    hospitals: [],
    healthCenters: [],
    cdrrmo: [],
    barangayHalls: []
  },
  allFacilityMarkers: [],     // flat list of all Leaflet markers
  userLocation: null,         // { lat, lng, accuracy, label, barangay }
  userLocationMarker: null,   // Leaflet marker for user GPS/picked location
  proximityRouteLine: null,   // Leaflet polyline connecting user to facility
  isPickLocationMode: false,  // true when user is clicking on map to set position
  nearestActiveCategory: 'all'// 'all' | 'hospital' | 'police' | 'fire' | 'healthCenter' | 'cdrrmo'
};

// Remove obvious placeholder rectangle boundaries from BARANGAYS_DATA
if (typeof BARANGAYS_DATA !== 'undefined' && Array.isArray(BARANGAYS_DATA)) {
  BARANGAYS_DATA.forEach(b => {
    try {
      const f = b.geojson;
      if (!f || f.type !== 'Feature' || !f.geometry || f.geometry.type !== 'Polygon') return;
      const coords = f.geometry.coordinates && f.geometry.coordinates[0];
      if (!Array.isArray(coords) || coords.length !== 5) return;
      const xs = coords.slice(0,4).map(p => p[0]);
      const ys = coords.slice(0,4).map(p => p[1]);
      const dx = Math.max(...xs) - Math.min(...xs);
      const dy = Math.max(...ys) - Math.min(...ys);
      // Rough rectangle check: ~0.008-0.015 span
      if (Math.abs(dx - 0.01) < 0.004 && Math.abs(dy - 0.008) < 0.004) {
        b.geojson = null;
      }
    } catch(e) {}
  });
}

/* ============================================================
   ICON FACTORY
   ============================================================ */
function createMarkerIcon(type) {
  const iconMap = {
    barangay:     '<i class="fa-solid fa-landmark"></i>',
    barangayHall: '<i class="fa-solid fa-landmark"></i>',
    police:       '<span>P</span>',
    fire:         '<span>F</span>',
    hospital:     '<span>H</span>',
    healthCenter:'<i class="fa-solid fa-plus"></i>',
    cdrrmo:      '<span>C</span>',
  };
  const clsMap = {
    barangay:    'barangay-pin',
    barangayHall: 'barangay-pin',
    police:      'police-pin',
    fire:        'fire-pin',
    hospital:    'hospital-pin',
    healthCenter:'health-pin',
    cdrrmo:      'cdrrmo-pin',
  };
  const cls  = clsMap[type]  || 'police-pin';
  const icon = iconMap[type] || '';

  return L.divIcon({
    className:    '',
    html:         `<div class="marker-dot ${cls}">${icon}</div>`,
    iconSize:     [20, 20],
    iconAnchor:   [10, 10],
    popupAnchor:  [0, -14]
  });
}

/* ============================================================
   POPUP TEMPLATE
   ============================================================ */
function buildPopupHtml(facility) {
  const iconMap = {
    barangay:     'fas fa-landmark',
    barangayHall: 'fas fa-landmark',
    police:      'fas fa-shield-halved',
    fire:        'fas fa-fire',
    hospital:    'fas fa-hospital',
    healthCenter:'fas fa-kit-medical',
    cdrrmo:      'fas fa-triangle-exclamation'
  };
  const typeLabels = {
    barangay:     'Barangay Hall',
    barangayHall: 'Barangay Hall',
    police:       'Police Station',
    fire:         'Fire Station',
    hospital:     'Public Hospital',
    healthCenter: 'Health Center',
    cdrrmo:       'CDRRMO'
  };

  const icon  = iconMap[facility.type] || 'fas fa-map-marker';
  const label = typeLabels[facility.type] || facility.type;
  const hotline = facility.emergency_hotline
    ? `<div class="popup-detail"><i class="fas fa-phone-flip"></i> Emergency: <strong style="color:#cc0000;">${facility.emergency_hotline}</strong></div>`
    : '';
  const hours = facility.operating_hours
    ? `<div class="popup-detail"><i class="fas fa-clock"></i> ${facility.operating_hours}</div>`
    : '';
  const pic = facility.person_in_charge
    ? `<div class="popup-detail"><i class="fas fa-user-tie"></i> ${facility.person_in_charge}</div>`
    : '';

  return `
    <div class="popup-content">
      <div class="popup-header">
        <div class="popup-icon ${facility.type}"><i class="${icon}"></i></div>
        <div>
          <div class="popup-subtype">${label}</div>
          <div class="popup-name">${facility.name}</div>
        </div>
      </div>
      <div class="popup-detail"><i class="fas fa-location-dot"></i> ${facility.address}</div>
      <div class="popup-detail"><i class="fas fa-phone"></i> ${facility.contact || '—'}</div>
      ${hotline}
      ${pic}
      ${hours}
      <a href="${facility.google_maps_url || '#'}" target="_blank" rel="noopener" class="popup-maps-btn">
        <i class="fas fa-diamond-turn-right"></i> Open in Google Maps
      </a>
    </div>
  `;
}

/* ============================================================
   INFO PANEL — FACILITY
   ============================================================ */
function openFacilityInfoPanel(facility) {
  const panel   = document.getElementById('info-panel');
  const title   = document.getElementById('info-panel-title');
  const badge   = document.getElementById('info-type-badge');
  const body    = document.getElementById('info-panel-body');

  const badgeClasses = {
    barangayHall: 'badge-barangay',
    barangay:     'badge-barangay',
    police:       'badge-police',
    fire:         'badge-fire',
    hospital:     'badge-hospital',
    healthCenter: 'badge-healthCenter',
    cdrrmo:       'badge-cdrrmo'
  };
  const typeLabels = {
    barangayHall: 'Barangay Hall',
    barangay:     'Barangay Hall',
    police:       'Police Station',
    fire:         'Fire Station',
    hospital:     'Public Hospital',
    healthCenter: 'Health Center',
    cdrrmo:       'CDRRMO'
  };

  const image = document.getElementById('info-panel-image');
  badge.className = `info-type-badge ${badgeClasses[facility.type] || ''}`;
  badge.textContent = typeLabels[facility.type] || facility.type;
  title.textContent = facility.name;

  const mediaContainer = document.querySelector('.info-panel-media');
  if (facility.image) {
    if (mediaContainer) mediaContainer.style.display = 'flex';
    if (image) {
      image.src = facility.image;
      image.alt = `${title.textContent} photo`;
    }
  } else {
    if (mediaContainer) mediaContainer.style.display = 'none';
  }

  const rows = [];

  rows.push(buildInfoRow('fas fa-location-dot', 'Address', facility.address));

  if (facility.barangay) {
    rows.push(buildInfoRow('fas fa-map', 'Barangay', facility.barangay));
  }

  rows.push(buildInfoRow('fas fa-phone', 'Contact', facility.contact || '—'));

  if (facility.emergency_hotline) {
    rows.push(buildInfoRow('fas fa-phone-flip', 'Emergency Hotline',
      `<span style="color:var(--clr-red-400); font-weight:600;">${facility.emergency_hotline}</span>`));
  }

  if (facility.person_in_charge) {
    rows.push(buildInfoRow('fas fa-user-tie', 'Officer / Person in Charge', facility.person_in_charge));
  }

  if (facility.operating_hours) {
    rows.push(buildInfoRow('fas fa-clock', 'Operating Hours', facility.operating_hours));
  }

  let servicesList = '';
  if (facility.services) {
    try {
      const svcs = typeof facility.services === 'string' ? JSON.parse(facility.services) : facility.services;
      if (Array.isArray(svcs) && svcs.length > 0) {
        servicesList = `
          <div style="margin-top:14px; border-top: 1px solid var(--clr-border); padding-top:12px;">
            <div style="font-size:9px; font-weight:600; letter-spacing:0.15em; text-transform:uppercase; color:var(--clr-text-muted); margin-bottom:8px;">Available Services</div>
            <div class="services-list">
              ${svcs.map(s => `<span class="service-tag">${s}</span>`).join('')}
            </div>
          </div>
        `;
      }
    } catch(e) {}
  }

  let callButtons = '';
  if (facility.contact && facility.contact !== '—') {
    const cleanPhone = facility.contact.replace(/[^\d+]/g, '');
    if (cleanPhone) {
      callButtons += `
        <a href="tel:${cleanPhone}" class="info-contact-call-btn">
          <i class="fas fa-phone"></i> Call Contact: ${escapeHtml(facility.contact)}
        </a>
      `;
    }
  }
  if (facility.emergency_hotline) {
    const cleanHotline = facility.emergency_hotline.replace(/[^\d+]/g, '');
    if (cleanHotline) {
      callButtons += `
        <a href="tel:${cleanHotline}" class="info-contact-call-btn" style="background:rgba(239,68,68,0.18); border-color:rgba(239,68,68,0.4); color:#fca5a5; margin-top:6px;">
          <i class="fas fa-phone-flip"></i> Emergency Hotline: ${escapeHtml(facility.emergency_hotline)}
        </a>
      `;
    }
  }

  let focusBrgyBtn = '';
  if (facility.type === 'barangayHall' && facility.barangay) {
    const b = BARANGAYS_DATA.find(item => item.name.toLowerCase() === facility.barangay.toLowerCase());
    if (b) {
      focusBrgyBtn = `
        <button class="btn-reset-view" onclick="selectBarangay(${b.id})" style="margin-top:6px; background:rgba(17,94,89,0.25); border-color:rgba(17,94,89,0.5); color:#5eead4;">
          <i class="fas fa-crosshairs"></i>
          Focus Barangay ${escapeHtml(b.name)} Boundary
        </button>
      `;
    }
  }

  body.innerHTML = `
    ${rows.join('')}
    ${servicesList}
    ${callButtons}
    <a href="${facility.google_maps_url || '#'}" target="_blank" rel="noopener" class="btn-maps info-directions-btn">
      <i class="fas fa-diamond-turn-right"></i>
      Navigate in Google Maps
    </a>
    ${focusBrgyBtn}
    <button class="btn-reset-view" onclick="resetMapView()">
      <i class="fas fa-arrow-left"></i>
      Back to Full Map
    </button>
  `;

  panel.classList.remove('collapsed');
  panel.classList.add('open');
}

/* ============================================================
   INFO PANEL — BARANGAY
   ============================================================ */
function openBarangayInfoPanel(barangay) {
  const panel = document.getElementById('info-panel');
  const title = document.getElementById('info-panel-title');
  const badge = document.getElementById('info-type-badge');
  const body  = document.getElementById('info-panel-body');
  const image = document.getElementById('info-panel-image');

  badge.className   = 'info-type-badge badge-barangay';
  badge.textContent = 'Barangay';
  title.textContent = barangay.name;
  const mediaContainer = document.querySelector('.info-panel-media');
  if (barangay.image) {
    if (mediaContainer) mediaContainer.style.display = 'flex';
    if (image) {
      image.src = barangay.image;
      image.alt = `${barangay.name} barangay hall`;
    }
  } else {
    if (mediaContainer) mediaContainer.style.display = 'none';
  }

  const rows = [];
  rows.push(buildInfoRow('fas fa-user-tie', 'Barangay Captain', barangay.captain || '—'));
  rows.push(buildInfoRow('fas fa-chart-area', 'Land Area', barangay.area || '—'));
  rows.push(buildInfoRow('fas fa-location-dot', 'Hall Address', barangay.address || '—'));
  rows.push(buildInfoRow('fas fa-phone', 'Contact Number', barangay.contact || '—'));

  if (barangay.description) {
    rows.push(buildInfoRow('fas fa-circle-info', 'Description', barangay.description));
  }

  let brgyCallBtn = '';
  if (barangay.contact && barangay.contact !== '—') {
    const cleanPhone = barangay.contact.replace(/[^\d+]/g, '');
    if (cleanPhone) {
      brgyCallBtn = `
        <a href="tel:${cleanPhone}" class="info-contact-call-btn">
          <i class="fas fa-phone"></i> Call Barangay Hall (${escapeHtml(barangay.contact)})
        </a>
      `;
    }
  }

  // Find emergency facilities belonging to this barangay
  const police = (FACILITIES_DATA.police || []).filter(f => f.barangay === barangay.name);
  const fire   = (FACILITIES_DATA.fire || []).filter(f => f.barangay === barangay.name);
  const hosp   = (FACILITIES_DATA.hospitals || []).filter(f => f.barangay === barangay.name);
  const health = (FACILITIES_DATA.healthCenters || []).filter(f => f.barangay === barangay.name);
  const halls  = (FACILITIES_DATA.barangayHalls || []).filter(f => f.barangay === barangay.name);

  const localFacilities = [...halls, ...police, ...fire, ...hosp, ...health];

  let facilitySection = '';
  if (localFacilities.length > 0) {
    facilitySection = `
      <div style="margin-top:14px; border-top: 1px solid var(--clr-border); padding-top:12px;">
        <div style="font-size:9px; font-weight:600; letter-spacing:0.15em; text-transform:uppercase; color:var(--clr-text-muted); margin-bottom:8px;">Local Facilities</div>
        <div class="facility-tags-wrap">
          ${halls.map(f => `<span class="facility-tag barangay" onclick="zoomToFacility('${f.id}')" style="cursor:pointer; background:rgba(17,94,89,0.25); border:1px solid #115e59; color:#5eead4;"><i class="fas fa-landmark"></i> ${f.name}</span>`).join('')}
          ${police.map(f => `<span class="facility-tag police" onclick="zoomToFacility('${f.id}')" style="cursor:pointer;"><i class="fas fa-shield-halved"></i> ${f.name}</span>`).join('')}
          ${fire.map(f => `<span class="facility-tag fire" onclick="zoomToFacility('${f.id}')" style="cursor:pointer;"><i class="fas fa-fire"></i> ${f.name}</span>`).join('')}
          ${hosp.map(f => `<span class="facility-tag hospital" onclick="zoomToFacility('${f.id}')" style="cursor:pointer;"><i class="fas fa-hospital"></i> ${f.name}</span>`).join('')}
          ${health.map(f => `<span class="facility-tag healthCenter" onclick="zoomToFacility('${f.id}')" style="cursor:pointer;"><i class="fas fa-kit-medical"></i> ${f.name}</span>`).join('')}
        </div>
      </div>
    `;
  }

  body.innerHTML = `
    ${rows.join('')}
    ${facilitySection}
    ${brgyCallBtn}

    <button class="btn-reset-view" onclick="resetMapView()">
      <i class="fas fa-arrow-left"></i>
      Back to Full Map
    </button>
  `;

  // Update HUD breadcrumbs
  document.getElementById('hud-breadcrumbs').innerHTML = `
    PHILIPPINES <span class="hud-sep">/</span> BULACAN <span class="hud-sep">/</span> MEYCAUAYAN CITY <span class="hud-sep">/</span> <span style="color:var(--clr-cyan-400);font-weight:600;">${barangay.name.toUpperCase()}</span>
  `;

  panel.classList.remove('collapsed');
  panel.classList.add('open');
  document.body.classList.add('popup-open');
  document.getElementById('map-container')?.classList.add('panel-open');
  if (State.map) {
    setTimeout(() => State.map.invalidateSize(), 400);
  }
}

function buildInfoRow(icon, label, value) {
  return `
    <div class="info-row">
      <div class="info-row-icon"><i class="${icon}"></i></div>
      <div class="info-row-content">
        <div class="info-row-label">${label}</div>
        <div class="info-row-value">${value}</div>
      </div>
    </div>
  `;
}

/* ============================================================
   COLLAPSIBLE BOTTOM SHEET HELPERS
   ============================================================ */
function toggleInfoPanelCollapse(e) {
  if (e) e.stopPropagation();
  const panel = document.getElementById('info-panel');
  if (!panel) return;
  
  if (window.innerWidth <= 860) {
    panel.classList.toggle('collapsed');
  }
}

function handleHeaderClick(e) {
  // Toggle collapse on mobile when header is tapped (unless close button clicked)
  if (window.innerWidth <= 860 && !e.target.closest('#info-panel-close')) {
    toggleInfoPanelCollapse(e);
  }
}

function closeInfoPanel() {
  const panel = document.getElementById('info-panel');
  if (panel) {
    panel.classList.remove('open');
    panel.classList.remove('collapsed');
  }
  document.body.classList.remove('popup-open');
  document.getElementById('map-container')?.classList.remove('panel-open');
  // Wait for CSS width transition then re-measure map
  if (State.map) {
    setTimeout(() => State.map.invalidateSize({ animate: false }), 420);
  }
}

/* ============================================================
   BARANGAY GeoJSON STYLES & COLOR SYSTEM
   ============================================================ */
// Curated pastel/muted GIS colors matching reference cartography
const BARANGAY_COLORS = {
  'bagbaguin':  '#78c5ad', // Pale seafoam / mint green
  'bahay pare': '#8faec7', // Soft steel / cornflower blue
  'bancal':     '#94b58a', // Moss / sage green
  'banga':      '#8da7bd', // Pale slate denim
  'bayugo':     '#b3bf8a', // Soft khaki olive
  'calvario':   '#d99c8f', // Soft salmon rose
  'camalig':    '#93b8d1', // Light sky blue
  'caingin':    '#dcb097', // Warm sand / peach buff
  'gasak':      '#e2b79c', // Light peach apricot
  'hulo':       '#beba82', // Soft golden olive
  'iba':        '#a7c18c', // Soft olive / sage green
  'langka':     '#7ec0b2', // Pale turquoise mint
  'lawa':       '#deb49d', // Warm apricot / buff peach
  'libtong':    '#60b396', // Rich seafoam green
  'liputan':    '#7fa3be', // Slate denim blue
  'longos':     '#9cb88d', // Soft moss green
  'malhacan':   '#adc582', // Olive chartreuse / lime sage
  'pajo':       '#cbb5d6', // Soft lilac / mauve
  'pandayan':   '#e0a688', // Warm terracotta / peach salmon
  'pantoc':     '#85cbaf', // Mint turquoise
  'perez':      '#9db2cf', // Periwinkle / steel blue
  'poblacion':  '#d6b787', // Warm sand / wheat
  'saluysoy':   '#b0a2cf', // Soft lavender / lilac
  'tugatog':    '#87c3b2', // Soft aqua mint
  'ubihan':     '#7cbca6', // Pale mint / teal green
  'zamora':     '#94a5c4', // Periwinkle slate
};

const BARANGAY_PALETTE = [
  '#78c5ad', '#8faec7', '#94b58a', '#dcb097', '#adc582',
  '#b0a2cf', '#7fa3be', '#7cbca6', '#e0a688', '#85cbaf',
  '#93b8d1', '#9db2cf', '#cbb5d6', '#deb49d', '#60b396',
  '#a7c18c', '#b3bf8a', '#9cb88d', '#8da7bd', '#d6b787',
  '#d99c8f', '#87c3b2', '#94a5c4', '#e2b79c', '#beba82', '#7ec0b2'
];

function getBarangayColor(barangay) {
  if (!barangay) return '#78c5ad';
  const name = (typeof barangay === 'string' ? barangay : barangay.name || '').toLowerCase().trim();
  if (BARANGAY_COLORS[name]) return BARANGAY_COLORS[name];
  const id = (typeof barangay === 'object' && barangay.id) ? barangay.id : Math.abs(name.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  return BARANGAY_PALETTE[id % BARANGAY_PALETTE.length];
}

function getBarangayNormalStyle(barangay) {
  const fillColor = getBarangayColor(barangay);
  return {
    fillColor:   fillColor,
    fillOpacity: 0.45,
    color:       '#1d3b37',
    weight:      1.8,
    opacity:     0.85
  };
}

function getBarangayHoverStyle(barangay) {
  const fillColor = getBarangayColor(barangay);
  return {
    fillColor:   fillColor,
    fillOpacity: 0.65,
    color:       '#0b332f',
    weight:      2.5,
    opacity:     1.0
  };
}

function getBarangaySelectedStyle(barangay) {
  const fillColor = getBarangayColor(barangay);
  return {
    fillColor:   fillColor,
    fillOpacity: 0.58,
    color:       '#0c4d44', // prominent dark emerald-teal outline
    weight:      3.5,
    opacity:     1.0
  };
}

function getBarangayDimmedStyle(barangay) {
  const fillColor = getBarangayColor(barangay);
  return {
    fillColor:   fillColor,
    fillOpacity: 0.28,     // keep distinct color visible while softening
    color:       '#3a5752',
    weight:      1.2,
    opacity:     0.55
  };
}

// Backward compatibility constants
const BOUNDARY_STYLE_NORMAL = {
  fillColor:   '#78c5ad',
  fillOpacity: 0.45,
  color:       '#1d3b37',
  weight:      1.8,
  opacity:     0.85
};

const BOUNDARY_STYLE_SELECTED = {
  fillColor:   '#deb49d',
  fillOpacity: 0.58,
  color:       '#0c4d44',
  weight:      3.5,
  opacity:     1.0
};

const BOUNDARY_STYLE_DIMMED = {
  fillColor:   '#78c5ad',
  fillOpacity: 0.28,
  color:       '#3a5752',
  weight:      1.2,
  opacity:     0.55
};

/* ============================================================
   BARANGAY FOCUS MODE
   ============================================================ */
function focusBarangay(barangayId) {
  const barangay = BARANGAYS_DATA.find(b => b.id === barangayId);
  if (!barangay) return;

  State.selectedBarangayId = barangayId;

  // Style all layers with their individual distinct colors
  Object.keys(State.geojsonLayers).forEach(id => {
    const layer = State.geojsonLayers[id];
    const numId = parseInt(id);
    const bgy = BARANGAYS_DATA.find(b => b.id === numId);
    if (numId === barangayId) {
      layer.setStyle(getBarangaySelectedStyle(bgy || barangay));
      layer.bringToFront();
    } else {
      layer.setStyle(getBarangayDimmedStyle(bgy));
    }
  });

  // Filter facility markers honoring category toggles and this barangay
  updateFacilityMarkersVisibility();
  updateAdaptiveMobileLabels();

  // Open info panel first, then wait for CSS transition before fitting bounds
  openBarangayInfoPanel(barangay);
  closeMobileMenu();

  const selectedLayer = State.geojsonLayers[barangayId];
  if (selectedLayer) {
    const isMobile = window.innerWidth <= 860;
    const flyOptions = isMobile
      ? { paddingTopLeft: [20, 20], paddingBottomRight: [20, 240], maxZoom: 16, duration: 1.0, easeLinearity: 0.4 }
      : { padding: [60, 60], maxZoom: 16, duration: 1.0, easeLinearity: 0.4 };

    setTimeout(() => {
      State.map.invalidateSize({ animate: false });
      const bounds = selectedLayer.getBounds();
      State.map.flyToBounds(bounds, flyOptions);
    }, 420);
  }
}

/* ============================================================
   RESET MAP VIEW
   ============================================================ */
function resetMapView() {
  State.selectedBarangayId = null;
  State.activeFilter = 'all';

  // Reset HUD breadcrumbs
  document.getElementById('hud-breadcrumbs').innerHTML = `
    PHILIPPINES <span class="hud-sep">/</span> BULACAN <span class="hud-sep">/</span> MEYCAUAYAN CITY
  `;

  // Reset all boundary styles to their distinctive colors
  Object.keys(State.geojsonLayers).forEach(id => {
    const numId = parseInt(id);
    const bgy = BARANGAYS_DATA.find(b => b.id === numId);
    State.geojsonLayers[id].setStyle(getBarangayNormalStyle(bgy));
  });

  // Fly back to city center
  State.map.flyTo(MEYCAUAYAN_CENTER, MEYCAUAYAN_ZOOM, {
    duration: 1.0,
    easeLinearity: 0.4
  });

  // Update facility markers according to active categories
  updateFacilityMarkersVisibility();
  updateAdaptiveMobileLabels();

  // Close info panel
  closeInfoPanel();

  // Clear proximity route line if any
  if (typeof clearUserLocationAndRoute === 'function') {
    clearUserLocationAndRoute();
  }

  // Reset stat cell active states
  document.querySelectorAll('.stat-cell').forEach(el => el.classList.remove('active'));
}

/* ============================================================
   FACILITY CATEGORY TOGGLE & VISIBILITY CONTROL
   ============================================================ */
function toggleFacilityCategory(category, isChecked) {
  State.activeCategories[category] = !!isChecked;
  updateFacilityMarkersVisibility();
}

function updateFacilityMarkersVisibility() {
  let visibleCount = 0;
  let totalCount = 0;

  State.allFacilityMarkers.forEach(m => {
    const facility = ALL_FACILITIES.find(f => f.id === m.id);
    if (!facility) return;

    totalCount++;
    const typeKey = facility.type;
    const isCategoryActive = State.activeCategories[typeKey] !== false;
    const isBarangayMatch = !State.selectedBarangayId || (() => {
      const bgy = BARANGAYS_DATA.find(b => b.id === State.selectedBarangayId);
      return bgy && facility.barangay && facility.barangay.toLowerCase() === bgy.name.toLowerCase();
    })();

    if (isCategoryActive && isBarangayMatch) {
      if (!State.map.hasLayer(m.marker)) m.marker.addTo(State.map);
      visibleCount++;
    } else {
      if (State.map.hasLayer(m.marker)) State.map.removeLayer(m.marker);
    }
  });

  const counterEl = document.getElementById('facility-filter-counter');
  if (counterEl) {
    counterEl.textContent = `${visibleCount}/${totalCount}`;
  }
}

function showAllFacilityMarkers() {
  Object.keys(State.activeCategories).forEach(cat => {
    State.activeCategories[cat] = true;
    const chk = document.getElementById(`toggle-cat-${cat}`);
    if (chk) chk.checked = true;
  });
  updateFacilityMarkersVisibility();
}

function filterFacilities(type) {
  State.activeFilter = type;

  // Toggle stat cell active
  document.querySelectorAll('.stat-cell').forEach(el => el.classList.remove('active'));
  const statMap = {
    police:       'stat-police',
    fire:         'stat-fire',
    hospital:     'stat-hosp',
    healthCenter: 'stat-health',
    cdrrmo:       'stat-cdrrmo'
  };
  if (statMap[type]) {
    document.getElementById(statMap[type])?.classList.add('active');
  }

  if (type === 'all') {
    showAllFacilityMarkers();
    return;
  }

  Object.keys(State.activeCategories).forEach(cat => {
    const active = (cat === type);
    State.activeCategories[cat] = active;
    const chk = document.getElementById(`toggle-cat-${cat}`);
    if (chk) chk.checked = active;
  });
  updateFacilityMarkersVisibility();
}

/* ============================================================
   ZOOM TO FACILITY
   ============================================================ */
function zoomToFacility(facilityId) {
  const facility = ALL_FACILITIES.find(f => f.id === facilityId);
  if (!facility) return;

  closeMobileMenu();
  const isMobile = window.innerWidth <= 860;
  const targetLat = isMobile ? facility.lat - 0.0015 : facility.lat;
  State.map.flyTo([targetLat, facility.lng], 17, { duration: 1.0 });

  // Find the marker and open its popup
  const entry = State.allFacilityMarkers.find(m => m.id === facilityId);
  if (entry) {
    if (!State.map.hasLayer(entry.marker)) entry.marker.addTo(State.map);
    entry.marker.openPopup();
  }

  openFacilityInfoPanel(facility);
}

/* ============================================================
   POPULATE VENGEANCE-UI MEGA MENUS & ACCORDIONS
   ============================================================ */
let activeFacilityCat = 'police';

function openFacilitySubmenu(cat) {
  activeFacilityCat = cat;

  // Highlight active feature card
  document.querySelectorAll('.v-feature-card').forEach(card => {
    if (card.getAttribute('data-cat') === cat) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });

  const subcolTitle = document.getElementById('v-subcol-title');
  const subcolList = document.getElementById('v-facilities-station-list');
  if (!subcolList) return;

  subcolList.innerHTML = '';

  let list = [];
  let title = '';
  let iconClass = 'fas fa-map-pin';

  switch (cat) {
    case 'police':
      list = FACILITIES_DATA.police || [];
      title = `Police Stations (${list.length})`;
      iconClass = 'fas fa-shield-halved text-blue';
      break;
    case 'fire':
      list = FACILITIES_DATA.fire || [];
      title = `Fire Stations (${list.length})`;
      iconClass = 'fas fa-fire text-amber';
      break;
    case 'hospitals':
      list = FACILITIES_DATA.hospitals || [];
      title = `Public Hospitals (${list.length})`;
      iconClass = 'fas fa-hospital text-red';
      break;
    case 'health':
      list = FACILITIES_DATA.healthCenters || [];
      title = `Health Centers (${list.length})`;
      iconClass = 'fas fa-kit-medical text-emerald';
      break;
    case 'cdrrmo':
      list = FACILITIES_DATA.cdrrmo || [];
      title = `CDRRMO / Rescue (${list.length})`;
      iconClass = 'fas fa-triangle-exclamation text-yellow';
      break;
  }

  if (subcolTitle) subcolTitle.textContent = title;

  list.forEach(f => {
    const btn = document.createElement('button');
    btn.className = 'v-station-btn';
    btn.type = 'button';
    btn.innerHTML = `
      <span class="v-station-name"><i class="${iconClass} me-2"></i>${f.name}</span>
      <span class="v-station-tag">${f.barangay ? 'Brgy. ' + f.barangay : ''}</span>
    `;
    btn.addEventListener('click', () => {
      zoomToFacility(f.id);
      closeAllMegaMenus();
    });
    subcolList.appendChild(btn);
  });
}

function populateDropdowns() {
  // 1. Desktop 3-Column Barangays Mega Grid
  const bGrid = document.getElementById('v-barangays-grid');
  const mobBAcc = document.getElementById('mobile-acc-barangays');
  if (bGrid) bGrid.innerHTML = '';
  if (mobBAcc) mobBAcc.innerHTML = '';

  if (Array.isArray(BARANGAYS_DATA)) {
    BARANGAYS_DATA.forEach((b, idx) => {
      // Desktop Mega Grid Button
      if (bGrid) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'v-barangay-btn';
        btn.setAttribute('data-name', b.name.toLowerCase());
        btn.innerHTML = `
          <span class="v-barangay-idx">${String(idx + 1).padStart(2, '0')}</span>
          <span class="v-barangay-name">${b.name}</span>
        `;
        btn.addEventListener('click', () => {
          focusBarangay(b.id);
          closeAllMegaMenus();
        });
        bGrid.appendChild(btn);
      }

      // Mobile Accordion Link
      if (mobBAcc) {
        const mobBtn = document.createElement('button');
        mobBtn.type = 'button';
        mobBtn.className = 'mobile-accordion-link';
        mobBtn.innerHTML = `<span class="acc-idx">${String(idx + 1).padStart(2, '0')}</span> ${b.name}`;
        mobBtn.addEventListener('click', () => {
          focusBarangay(b.id);
          closeMobileMenu();
        });
        mobBAcc.appendChild(mobBtn);
      }
    });
  }

  // 2. Setup Real-time Barangay Search Filter
  const bFilterInput = document.getElementById('v-barangay-filter');
  if (bFilterInput && bGrid) {
    bFilterInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const buttons = bGrid.querySelectorAll('.v-barangay-btn');
      buttons.forEach(btn => {
        const name = btn.getAttribute('data-name') || '';
        if (!q || name.includes(q)) {
          btn.style.display = 'flex';
        } else {
          btn.style.display = 'none';
        }
      });
    });
  }

  // 3. Populate Mobile Accordion Facilities
  const populateMobileCategory = (mobileId, list, iconClass) => {
    const mobileEl = document.getElementById(mobileId);
    if (!mobileEl) return;
    mobileEl.innerHTML = '';

    (list || []).forEach(f => {
      const mobBtn = document.createElement('button');
      mobBtn.type = 'button';
      mobBtn.className = 'mobile-accordion-link';
      mobBtn.innerHTML = `<i class="${iconClass} me-2"></i> ${f.name}`;
      mobBtn.addEventListener('click', () => {
        zoomToFacility(f.id);
        closeMobileMenu();
      });
      mobileEl.appendChild(mobBtn);
    });
  };

  populateMobileCategory('mobile-acc-police', FACILITIES_DATA.police, 'fas fa-shield-halved text-blue');
  populateMobileCategory('mobile-acc-fire', FACILITIES_DATA.fire, 'fas fa-fire text-amber');
  populateMobileCategory('mobile-acc-hospitals', FACILITIES_DATA.hospitals, 'fas fa-hospital text-red');
  populateMobileCategory('mobile-acc-health', FACILITIES_DATA.healthCenters, 'fas fa-kit-medical text-emerald');
  populateMobileCategory('mobile-acc-cdrrmo', FACILITIES_DATA.cdrrmo, 'fas fa-triangle-exclamation text-yellow');

  // 4. Initialize Desktop Facilities Station List with default category (police)
  openFacilitySubmenu('police');
}

/* ============================================================
   POPULATE EMERGENCY HOTLINES MODAL
   ============================================================ */
function populateHotlinesModal() {
  const list = document.getElementById('hotlines-list');
  if (!list) return;
  list.innerHTML = '';

  EMERGENCY_HOTLINES.forEach(h => {
    const rawNumber = (h.hotline || '').replace(/[^\d+]/g, '');
    const callBtn = rawNumber ? `
      <a href="tel:${rawNumber}" class="btn-hotline-quick-call" onclick="triggerHapticFeedback()" title="Call Now">
        <i class="fas fa-phone"></i>
      </a>
    ` : '';
    const nationalBadge = h.national
      ? `<div class="hotline-national">National: <a href="tel:${h.national.replace(/[^\d]/g, '')}" class="text-cyan text-decoration-none fw-bold">${h.national}</a></div>`
      : '';

    list.innerHTML += `
      <div class="hotline-card">
        <div class="hotline-icon"><i class="${h.icon}"></i></div>
        <div style="flex:1;">
          <div class="hotline-category">${h.category}</div>
          <div class="hotline-name">${h.name}</div>
        </div>
        <div class="hotline-numbers">
          <div class="d-flex align-items-center gap-2 justify-content-end">
            <div class="hotline-local">${h.hotline || '—'}</div>
            ${callBtn}
          </div>
          ${nationalBadge}
        </div>
      </div>
    `;
  });
}

/**
 * Trigger subtle mobile haptic feedback if supported
 */
function triggerHapticFeedback(pattern = [25, 40, 25]) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {}
  }
}

/**
 * Open the 1-Tap Emergency Speed-Dial Sheet
 */
function openEmergencySpeedDial() {
  triggerHapticFeedback([35, 45, 35]);
  const modalEl = document.getElementById('emergency-speed-dial-modal');
  if (!modalEl || !window.bootstrap) return;
  const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  modal.show();
}

/**
 * Copy hotline number to clipboard with tactile feedback
 */
function copyHotlineNumber(number, btnEl) {
  triggerHapticFeedback([20]);
  if (!number) return;

  const showSuccess = () => {
    if (!btnEl) return;
    const origHtml = btnEl.innerHTML;
    btnEl.classList.add('copied');
    btnEl.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => {
      btnEl.classList.remove('copied');
      btnEl.innerHTML = origHtml;
    }, 1800);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(number).then(showSuccess).catch(() => {
      fallbackCopyText(number, showSuccess);
    });
  } else {
    fallbackCopyText(number, showSuccess);
  }
}

function fallbackCopyText(text, callback) {
  const input = document.createElement('textarea');
  input.value = text;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  try {
    document.execCommand('copy');
    if (callback) callback();
  } catch (e) {}
  document.body.removeChild(input);
}

/**
 * Switch from Speed-Dial Sheet to Full Directory Modal
 */
function switchToFullHotlines() {
  triggerHapticFeedback([15]);
  const speedDialEl = document.getElementById('emergency-speed-dial-modal');
  if (speedDialEl && window.bootstrap) {
    const speedDialModal = bootstrap.Modal.getInstance(speedDialEl);
    if (speedDialModal) speedDialModal.hide();
  }
  setTimeout(() => {
    const fullModalEl = document.getElementById('hotlines-modal');
    if (fullModalEl && window.bootstrap) {
      const fullModal = bootstrap.Modal.getInstance(fullModalEl) || new bootstrap.Modal(fullModalEl);
      fullModal.show();
    }
  }, 250);
}

/* ============================================================
   POPULATE ANNOUNCEMENTS MODAL (OFFICIAL BULLETIN BOARD)
   ============================================================ */
let PUBLIC_ANNOUNCEMENTS = [];

function getAnnouncementMeta(message, index) {
  const m = (message || '').toLowerCase();

  // 1. GIS Portal & Public Information (Checked first to avoid false match on "police/fire/hospitals")
  if (m.includes('gis portal') || m.includes('portal is now live') || (m.includes('portal') && !m.includes('hospital')) || m.includes('locate nearest') || m.includes('public directory') || m.includes('public advisory')) {
    return {
      typeClass: 'bulletin-info',
      tagIcon: 'fas fa-bullhorn',
      tagText: 'PUBLIC INFORMATION',
      source: 'City Government of Meycauayan',
      priority: 'OFFICIAL NOTICE'
    };
  }

  // 2. Fire & 911 Emergency Alert
  if (m.includes('fire emergency') || m.includes('in case of fire') || m.includes('sunog') || m.includes('bfp') || m.includes('dial 911') || m.includes('call 911') || m.includes('fire alert') || m.includes('fire alarm') || m.includes('evacuation')) {
    return {
      typeClass: 'bulletin-danger',
      tagIcon: 'fas fa-fire-flame-curved',
      tagText: 'EMERGENCY & FIRE ALERT',
      source: 'Meycauayan BFP & Emergency Command',
      priority: 'HIGH PRIORITY'
    };
  }

  // 3. Disaster & Weather Advisory
  if (m.includes('typhoon') || m.includes('flood') || m.includes('rainfall') || m.includes('storm') || m.includes('weather') || m.includes('pagasa') || m.includes('cdrrmo') || m.includes('baha') || m.includes('bagyo')) {
    return {
      typeClass: 'bulletin-warning',
      tagIcon: 'fas fa-triangle-exclamation',
      tagText: 'DISASTER & WEATHER ADVISORY',
      source: 'Meycauayan CDRRMO / PAGASA',
      priority: 'WEATHER BULLETIN'
    };
  }

  // 4. Health & Medical Notice
  if (m.includes('medical') || m.includes('hospital') || m.includes('health') || m.includes('ambulance') || m.includes('clinic') || m.includes('doctor') || m.includes('cho')) {
    return {
      typeClass: 'bulletin-health',
      tagIcon: 'fas fa-hospital-user',
      tagText: 'HEALTH & MEDICAL NOTICE',
      source: 'City Health Office (CHO)',
      priority: 'HEALTH SERVICES'
    };
  }

  // 5. Default Public Notice
  return {
    typeClass: 'bulletin-info',
    tagIcon: 'fas fa-bullhorn',
    tagText: 'PUBLIC INFORMATION',
    source: 'City Government of Meycauayan',
    priority: 'OFFICIAL NOTICE'
  };
}

function populateAnnouncementsModal(announcements) {
  if (Array.isArray(announcements)) {
    PUBLIC_ANNOUNCEMENTS = announcements;
  }

  const list = document.getElementById('announcements-modal-list');
  const badgeCount = document.getElementById('fab-announcement-count');
  const navBadge = document.getElementById('nav-announcement-count');
  const promoBadge = document.getElementById('promo-announcement-count');
  const drawerBadge = document.getElementById('drawer-announcement-count');

  const count = (PUBLIC_ANNOUNCEMENTS && PUBLIC_ANNOUNCEMENTS.length) || 0;

  if (badgeCount) {
    badgeCount.textContent = count;
    badgeCount.style.display = count > 0 ? 'inline-flex' : 'none';
  }
  if (navBadge) {
    navBadge.textContent = count;
    navBadge.style.display = count > 0 ? 'inline-flex' : 'none';
  }
  if (promoBadge) {
    promoBadge.textContent = count > 0 ? `(${count})` : '';
  }
  if (drawerBadge) {
    drawerBadge.textContent = count;
    drawerBadge.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  if (!list) return;

  if (!PUBLIC_ANNOUNCEMENTS || PUBLIC_ANNOUNCEMENTS.length === 0) {
    list.innerHTML = `
      <div class="announcement-empty-card">
        <div class="empty-icon-wrap">
          <i class="fas fa-bullhorn"></i>
        </div>
        <div style="font-weight:700; font-size:15px; color:#fff; margin-bottom:4px;">No Active Advisories</div>
        <div style="font-size:12.5px; color:var(--clr-text-muted);">Check back soon for public notices, weather alerts, and emergency bulletins.</div>
      </div>
    `;
    return;
  }

  list.innerHTML = PUBLIC_ANNOUNCEMENTS.map((ann, idx) => {
    const meta = getAnnouncementMeta(ann.message, idx);
    return `
      <div class="bulletin-card ${meta.typeClass}">
        <div class="bulletin-header">
          <div class="bulletin-tag">
            <i class="${meta.tagIcon}"></i>
            <span>${meta.tagText}</span>
          </div>
          <div class="bulletin-status">
            <span class="bulletin-beacon"></span>
            <span>${meta.priority}</span>
          </div>
        </div>
        <div class="bulletin-body">
          <div class="bulletin-quote-icon"><i class="fas fa-quote-left"></i></div>
          <p class="bulletin-text">${escapeHtml(ann.message || '')}</p>
        </div>
        <div class="bulletin-footer">
          <div class="bulletin-issuer">
            <i class="fas fa-shield-halved"></i>
            <span>${meta.source}</span>
          </div>
          <div class="bulletin-verified">
            <i class="fas fa-circle-check"></i>
            <span>VERIFIED BROADCAST</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
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
function updateStatCounts() {
  const policeCount = document.getElementById('count-police');
  const fireCount = document.getElementById('count-fire');
  const hospCount = document.getElementById('count-hosp');
  const healthCount = document.getElementById('count-health');

  if (policeCount) policeCount.textContent = FACILITIES_DATA.police.length;
  if (fireCount) fireCount.textContent = FACILITIES_DATA.fire.length;
  if (hospCount) hospCount.textContent = FACILITIES_DATA.hospitals.length;
  if (healthCount) healthCount.textContent = FACILITIES_DATA.healthCenters.length;
}

/* ============================================================
   SEARCH
   ============================================================ */
/* ============================================================
   MAP INITIALIZATION
   ============================================================ */
function initMap() {
  State.map = L.map('main-map', {
    center:     MEYCAUAYAN_CENTER,
    zoom:       MEYCAUAYAN_ZOOM,
    zoomControl: true,
    attributionControl: true,
    preferCanvas: true,
    minZoom:    12,
    maxZoom:    19
  });

  // Base tile layer — OpenStreetMap with mobile memory buffering and idle tile loading
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    keepBuffer: 2,
    updateWhenIdle: true,
    updateInterval: 150,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(State.map);

  State.map.zoomControl.setPosition('topright');

  // Real-time HUD coordinate & zoom tracking (only update on desktop to eliminate touch DOM thrashing)
  State.map.on('mousemove', (e) => {
    if (window.innerWidth > 768) {
      const latEl = document.getElementById('hud-lat');
      const lngEl = document.getElementById('hud-lng');
      if (latEl) latEl.textContent = e.latlng.lat.toFixed(6);
      if (lngEl) lngEl.textContent = e.latlng.lng.toFixed(6);
    }
  });

  State.map.on('zoomend', () => {
    const zoomEl = document.getElementById('hud-zoom');
    if (zoomEl) zoomEl.textContent = State.map.getZoom();
    updateAdaptiveMobileLabels();
  });

  // Map click handler for "Pick on Map" location mode
  State.map.on('click', (e) => {
    if (State.isPickLocationMode) {
      setUserLocation(e.latlng.lat, e.latlng.lng, null, 'Custom Map Pinpoint');
      exitPickLocationMode();
      // Re-open nearest modal with recalculated distances
      const modalEl = document.getElementById('nearest-modal');
      if (modalEl && window.bootstrap) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();
      }
    }
  });

  // Render barangay GeoJSON boundaries
  BARANGAYS_DATA.forEach(barangay => {
    if (!barangay.geojson) return;
    if (isPlaceholderBoundary(barangay.geojson)) {
      console.warn(`Skipping placeholder boundary for barangay: ${barangay.name}`);
      return;
    }

    const layer = L.geoJSON(barangay.geojson, {
      style: getBarangayNormalStyle(barangay),
      onEachFeature: (feature, featureLayer) => {
        featureLayer.on('click', () => focusBarangay(barangay.id));

        featureLayer.on('mouseover', function() {
          if (State.selectedBarangayId !== barangay.id) {
            this.setStyle(getBarangayHoverStyle(barangay));
          }
        });

        featureLayer.on('mouseout', function() {
          if (State.selectedBarangayId !== barangay.id) {
            this.setStyle(
              State.selectedBarangayId === null
                ? getBarangayNormalStyle(barangay)
                : getBarangayDimmedStyle(barangay)
            );
          }
        });
      }
    }).addTo(State.map);

    // Permanent center label pill for clear visibility
    layer.bindTooltip(
      `<span class="bgy-center-label">${barangay.name}</span>`,
      {
        permanent: true,
        direction: 'center',
        className: 'bgy-name-tooltip'
      }
    );

    State.geojsonLayers[barangay.id] = layer;
  });

  // Render facility markers
  const markerGroups = [
    { list: FACILITIES_DATA.barangayHalls || [], type: 'barangayHall' },
    { list: FACILITIES_DATA.police || [],        type: 'police' },
    { list: FACILITIES_DATA.fire || [],          type: 'fire' },
    { list: FACILITIES_DATA.hospitals || [],     type: 'hospital' },
    { list: FACILITIES_DATA.healthCenters || [], type: 'healthCenter' },
    { list: FACILITIES_DATA.cdrrmo || [],        type: 'cdrrmo' },
  ];

  markerGroups.forEach(group => {
    group.list.forEach(facility => {
      const marker = L.marker([facility.lat, facility.lng], {
        icon: createMarkerIcon(facility.type || group.type),
        title: facility.name
      });

      marker.bindPopup(buildPopupHtml(facility), {
        maxWidth: 260,
        className: 'custom-popup'
      });

      marker.on('click', () => {
        openFacilityInfoPanel(facility);
      });

      marker.addTo(State.map);

      State.allFacilityMarkers.push({
        id:     facility.id,
        type:   facility.type || group.type,
        marker: marker
      });
    });
  });

  // Sync initial marker visibility & counter
  updateFacilityMarkersVisibility();
  updateAdaptiveMobileLabels();
}

/* ============================================================
   ADAPTIVE MOBILE LABELS & DYNAMIC MARKER RE-SYNC
   ============================================================ */
function updateAdaptiveMobileLabels() {
  if (!State.map) return;
  const container = State.map.getContainer();
  if (!container) return;
  if (window.innerWidth <= 768) {
    if (State.map.getZoom() >= 14 || State.selectedBarangayId !== null) {
      container.classList.add('show-bgy-labels');
    } else {
      container.classList.remove('show-bgy-labels');
    }
  } else {
    container.classList.add('show-bgy-labels');
  }
}

function syncMarkerData(facilities) {
  if (!facilities || !Array.isArray(facilities) || !State.map) return;
  facilities.forEach(facility => {
    const entry = State.allFacilityMarkers.find(m => m.id === facility.id);
    if (entry && entry.marker) {
      if (facility.lat && facility.lng) {
        entry.marker.setLatLng([facility.lat, facility.lng]);
      }
      entry.marker.setPopupContent(buildPopupHtml(facility));
    } else if (facility.lat && facility.lng) {
      const marker = L.marker([facility.lat, facility.lng], {
        icon: createMarkerIcon(facility.type),
        title: facility.name
      });
      marker.bindPopup(buildPopupHtml(facility), {
        maxWidth: 260,
        className: 'custom-popup'
      });
      marker.on('click', () => {
        openFacilityInfoPanel(facility);
      });
      if (State.activeCategories[facility.type] !== false) {
        marker.addTo(State.map);
      }
      State.allFacilityMarkers.push({
        id: facility.id,
        type: facility.type,
        marker: marker
      });
    }
  });
  updateFacilityMarkersVisibility();
}

/* ============================================================
   TOOLTIP STYLE INJECTION
   ============================================================ */
function injectTooltipStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .barangay-tooltip {
      background: #ffffff !important;
      border: 1px solid rgba(204,0,0,0.3) !important;
      border-top: 2px solid #cc0000 !important;
      border-radius: 4px !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important;
      color: #1a1a2e !important;
      padding: 5px 10px !important;
      font-size: 11px !important;
    }
    .barangay-tooltip::before {
      display: none !important;
    }
    .leaflet-tooltip-left.barangay-tooltip::before,
    .leaflet-tooltip-right.barangay-tooltip::before {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

/* ============================================================
   LOADING OVERLAY
   ============================================================ */
function hideLoadingOverlay() {
  // Loading overlay removed for custom page fade-in
}

function fetchWithTimeout(url, timeout = 12000) {
  return Promise.race([
    fetch(url).then(r => {
      if (!r.ok) throw new Error(`${url} returned ${r.status}`);
      return r.json();
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout fetching ${url}`)), timeout))
  ]);
}

function isPlaceholderBoundary(feature) {
  if (!feature || feature.type !== 'Feature' || !feature.geometry || feature.geometry.type !== 'Polygon') {
    return false;
  }

  const coords = feature.geometry.coordinates?.[0];
  if (!Array.isArray(coords) || coords.length !== 5) {
    return false;
  }

  const [p0, p1, p2, p3, p4] = coords;
  if (p4[0] !== p0[0] || p4[1] !== p0[1]) {
    return false;
  }

  const xs = coords.slice(0, 4).map(p => p[0]);
  const ys = coords.slice(0, 4).map(p => p[1]);
  const uniqueXs = new Set(xs);
  const uniqueYs = new Set(ys);

  return uniqueXs.size === 2 && uniqueYs.size === 2;
}

function updateBoundaryLegendVisibility() {
  const boundaryRow = document.querySelector('[data-key="boundary"]');
  if (!boundaryRow) return;
  const hasBoundaries = BARANGAYS_DATA.some(b => b.geojson && !isPlaceholderBoundary(b.geojson));
  boundaryRow.style.display = hasBoundaries ? '' : 'none';
}

/* ============================================================
   AJAX DATA SOURCE FETCH & INIT ORCHESTRATION (STALE-WHILE-REVALIDATE)
   ============================================================ */
async function loadBackendDataAndInit() {
  // 1. Instant Startup: Render UI and Map immediately using bundled local datasets (< 200ms)
  try {
    injectTooltipStyles();
    initMap();
    populateDropdowns();
    populateHotlinesModal();
    populateAnnouncementsModal();
    updateStatCounts();
  } catch (initErr) {
    console.error('Error during initial local init:', initErr);
  } finally {
    hideLoadingOverlay();
  }

  // 2. Refresh backend data silently in the background (Non-blocking)
  refreshBackendDataSilently();
}

async function refreshBackendDataSilently() {
  try {
    // Attempt to load a local Meycauayan GeoJSON file (exported) and merge it
    let localMunicipalGeoJSON = null;
    try {
      localMunicipalGeoJSON = await fetchWithTimeout('data/meycauayan-barangays.geojson?v=2.3', 5000);
      if (localMunicipalGeoJSON && Array.isArray(localMunicipalGeoJSON.features)) {
        localMunicipalGeoJSON.features.forEach(f => {
          const prop = f.properties || {};
          const featureName = (prop.barangay || prop.adm4_en || prop.name || prop.NAME || '').toString().trim();
          if (!featureName) return;
          const localB = BARANGAYS_DATA.find(b => b.name.toLowerCase() === featureName.toLowerCase());
          if (localB && f && f.type === 'Feature' && !isPlaceholderBoundary(f)) {
            localB.geojson = f;
          }
        });
      }
    } catch (e) {
      // ignore — fallback to existing BARANGAYS_DATA / backend
    }

    const [resBrgys, resFacs, resHotlines, resAnnounces] = await Promise.all([
      fetchWithTimeout('api/barangays.php', 6000),
      fetchWithTimeout('api/facilities.php', 6000),
      fetchWithTimeout('api/hotlines.php', 6000),
      fetchWithTimeout('api/announcements.php?active=1', 6000)
    ]);

    // 1. Merge barangay parameters from DB into the GeoJSON boundaries array
    if (Array.isArray(resBrgys) && resBrgys.length > 0) {
      resBrgys.forEach(dbB => {
        const localB = BARANGAYS_DATA.find(b => b.name.toLowerCase() === dbB.name.toLowerCase());
        if (localB) {
          localB.id = dbB.id;
          localB.captain = dbB.captain;
          localB.population = dbB.population;
          localB.area = dbB.area;
          localB.address = dbB.address;
          localB.contact = dbB.contact;
          localB.description = dbB.description;

          if (dbB.geojson && !isPlaceholderBoundary(dbB.geojson)) {
            localB.geojson = dbB.geojson;
          }
        }
      });
    }

    BARANGAYS_DATA.forEach(barangay => {
      if (barangay.geojson && isPlaceholderBoundary(barangay.geojson)) {
        barangay.geojson = null;
      }
    });

    // 2. Overwrite facilities lists
    if (Array.isArray(resFacs) && resFacs.length > 0) {
      FACILITIES_DATA.barangayHalls = resFacs.filter(f => f.type === 'barangayHall');
      FACILITIES_DATA.police = resFacs.filter(f => f.type === 'police');
      FACILITIES_DATA.fire = resFacs.filter(f => f.type === 'fire');
      FACILITIES_DATA.hospitals = resFacs.filter(f => f.type === 'hospital');
      FACILITIES_DATA.healthCenters = resFacs.filter(f => f.type === 'healthCenter');
      FACILITIES_DATA.cdrrmo = resFacs.filter(f => f.type === 'cdrrmo');

      if (!FACILITIES_DATA.cdrrmo || FACILITIES_DATA.cdrrmo.length === 0) {
        const fallbackCdrrmo = {
          id: "cdrrmo-001",
          name: "Meycauayan City Disaster Risk Reduction & Management Office (CDRRMO / Rescue Operations Center)",
          type: "cdrrmo",
          subtype: "Disaster Risk Reduction & Emergency Operations Center",
          lat: 14.72858,
          lng: 120.95894,
          address: "Meycauayan DRRMO Operations Center, Meycauayan City, Bulacan 3020",
          barangay: "Poblacion",
          contact: "(044) 840-5000 / 0925-555-MEYC",
          emergencyHotline: "911 / (044) 840-5000",
          commander: "CDRRMO Incident Commander",
          operatingHours: "24 Hours / 7 Days a Week",
          image: null,
          googleMaps: "https://www.google.com/maps/search/Meycauayan+DRRMO+Operations+Center/@14.72858,120.95894,17z"
        };
        FACILITIES_DATA.cdrrmo = [fallbackCdrrmo];
        resFacs.push(fallbackCdrrmo);
      }

      ALL_FACILITIES.length = 0;
      ALL_FACILITIES.push(...resFacs);
      syncMarkerData(resFacs);
    }

    // 3. Overwrite hotlines
    if (Array.isArray(resHotlines) && resHotlines.length > 0) {
      EMERGENCY_HOTLINES.length = 0;
      resHotlines.forEach(h => {
        EMERGENCY_HOTLINES.push({
          category: h.category,
          name: h.name,
          hotline: h.local_number,
          national: h.national_number,
          icon: h.icon_class
        });
      });
      populateHotlinesModal();
    }

    // 4. Overwrite scrolling & modal announcements
    if (resAnnounces) {
      populateAnnouncementsModal(resAnnounces);
    }

    updateStatCounts();
  } catch (err) {
    console.warn('Silent background data refresh skipped or timed out:', err.message || err);
  }
}

/* ============================================================
   INIT ROUTINE ENTRY
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  loadBackendDataAndInit();
  setTimeout(() => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay && !overlay.classList.contains('hidden')) {
      console.warn('Fallback hideLoadingOverlay triggered');
      hideLoadingOverlay();
    }
  }, 8000);
});



/* ============================================================
   VENGEANCE-UI MEGA MENU & MOBILE DRAWER HELPERS
   ============================================================ */
function closeAllMegaMenus() {
  document.querySelectorAll('.v-menu-trigger').forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-expanded', 'false');
  });

  document.querySelectorAll('.v-desktop-dropdown').forEach(dd => {
    dd.classList.remove('open');
    dd.setAttribute('aria-hidden', 'true');
  });
}

function toggleMegaMenu(menuName) {
  const trigger = document.getElementById(`trigger-${menuName}`);
  const dropdown = document.getElementById(`mega-menu-${menuName}`);
  if (!trigger || !dropdown) return;

  const isOpen = dropdown.classList.contains('open');

  // Close all other menus first
  closeAllMegaMenus();

  if (!isOpen) {
    trigger.classList.add('active');
    trigger.setAttribute('aria-expanded', 'true');
    dropdown.classList.add('open');
    dropdown.setAttribute('aria-hidden', 'false');
  }
}

function toggleMobileMenu() {
  const drawer = document.getElementById('mobile-nav-overlay');
  const backdrop = document.getElementById('mobile-nav-backdrop');
  const btn = document.getElementById('mobile-menu-toggle');
  if (!drawer) return;

  const isOpen = drawer.classList.contains('open');
  if (isOpen) {
    closeMobileMenu();
  } else {
    drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    if (btn) {
      btn.setAttribute('aria-expanded', 'true');
      btn.classList.add('active');
      btn.innerHTML = '<i class="fas fa-xmark"></i>';
    }
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
}

function closeMobileMenu() {
  const drawer = document.getElementById('mobile-nav-overlay');
  const backdrop = document.getElementById('mobile-nav-backdrop');
  const btn = document.getElementById('mobile-menu-toggle');

  if (drawer) {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
  }
  if (backdrop) backdrop.classList.remove('open');
  if (btn) {
    btn.setAttribute('aria-expanded', 'false');
    btn.classList.remove('active');
    btn.innerHTML = '<i class="fas fa-bars"></i>';
  }
  document.body.style.overflow = '';
}

function toggleMobileAccordion(accId) {
  const accBody = document.getElementById(accId);
  if (!accBody) return;
  const header = accBody.previousElementSibling;

  const isExpanded = accBody.classList.contains('show');

  // Close other accordions for clean accordion UX
  document.querySelectorAll('.v-accordion-body, .mobile-accordion-body').forEach(el => el.classList.remove('show'));
  document.querySelectorAll('.v-accordion-header, .mobile-accordion-header').forEach(el => {
    el.classList.remove('active');
    el.setAttribute('aria-expanded', 'false');
  });

  if (!isExpanded) {
    accBody.classList.add('show');
    if (header) {
      header.classList.add('active');
      header.setAttribute('aria-expanded', 'true');
    }
  }
}

// Bind VengeanceUI Mega Menu interactions
document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile menu toggle & close buttons
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleMobileMenu);
  }

  const closeBtn = document.getElementById('mobile-drawer-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeMobileMenu);
  }

  // 2. Desktop Mega Menu Triggers (Click & Hover)
  const megaItems = document.querySelectorAll('.v-mega-trigger-item');
  megaItems.forEach(item => {
    const menuName = item.getAttribute('data-menu');
    const triggerBtn = item.querySelector('.v-menu-trigger');

    if (triggerBtn && menuName) {
      // Click trigger
      triggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMegaMenu(menuName);
      });
    }

    // Hover trigger for desktop screens
    item.addEventListener('mouseenter', () => {
      if (window.innerWidth > 992 && menuName) {
        closeAllMegaMenus();
        const trigger = document.getElementById(`trigger-${menuName}`);
        const dropdown = document.getElementById(`mega-menu-${menuName}`);
        if (trigger && dropdown) {
          trigger.classList.add('active');
          trigger.setAttribute('aria-expanded', 'true');
          dropdown.classList.add('open');
          dropdown.setAttribute('aria-hidden', 'false');
        }
      }
    });
  });

  // Close menus when mouse leaves navbar
  const navbar = document.getElementById('main-navbar');
  if (navbar) {
    navbar.addEventListener('mouseleave', () => {
      if (window.innerWidth > 992) {
        closeAllMegaMenus();
      }
    });
  }

  // Close menus on click outside
  document.addEventListener('click', (e) => {
    if (!navbar?.contains(e.target)) {
      closeAllMegaMenus();
    }
  });

  // Keyboard navigation: Escape key dismisses menus
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllMegaMenus();
      closeMobileMenu();
      closeMobileSheet();
    }
  });
});


/* ============================================================
   MOBILE BOTTOM SHEET & TAB BAR FUNCTIONS
   ============================================================ */

/**
 * Open the mobile bottom sheet to a specific panel.
 * @param {'facilities'|'barangays'|'menu'} panel
 */
function openMobileSheet(panel) {
  const sheet    = document.getElementById('mob-bottom-sheet');
  const backdrop = document.getElementById('mob-sheet-backdrop');
  const title    = document.getElementById('mob-sheet-title');
  if (!sheet) return;

  // Show correct panel
  const panelMap = {
    facilities: { el: 'mob-panel-facilities', label: 'Emergency Facilities' },
    barangays:  { el: 'mob-panel-barangays',  label: '26 Barangays' },
    menu:       { el: 'mob-panel-menu',        label: 'More Options' },
  };

  document.querySelectorAll('.mob-sheet-panel').forEach(p => (p.style.display = 'none'));
  const cfg = panelMap[panel];
  if (cfg) {
    const el = document.getElementById(cfg.el);
    if (el) el.style.display = 'block';
    if (title) title.textContent = cfg.label;
  }

  // If opening facilities panel, ensure category grid is shown
  if (panel === 'facilities') {
    showMobileCategoryGrid();
  }

  // If opening barangays panel, populate it
  if (panel === 'barangays') {
    populateMobileBrgySheet('');
  }

  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden', 'false');
  if (backdrop) backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
}

/**
 * Close the mobile bottom sheet.
 */
function closeMobileSheet() {
  const sheet    = document.getElementById('mob-bottom-sheet');
  const backdrop = document.getElementById('mob-sheet-backdrop');
  if (!sheet) return;

  sheet.classList.remove('open');
  sheet.setAttribute('aria-hidden', 'true');
  if (backdrop) backdrop.classList.remove('open');
  document.body.style.overflow = '';

  // Reset tab active state to 'map' when sheet closes
  document.querySelectorAll('.mob-tab-btn').forEach(b => b.classList.remove('active'));
  const mapTab = document.getElementById('mob-tab-map');
  if (mapTab) mapTab.classList.add('active');
}

/**
 * Switch mobile bottom tab bar active state.
 * @param {'map'|'barangays'|'facilities'|'bulletin'|'menu'} tab
 */
function mobTabSwitch(tab) {
  // Deactivate all tabs
  document.querySelectorAll('.mob-tab-btn').forEach(b => b.classList.remove('active'));

  // Activate clicked tab
  const tabEl = document.getElementById(`mob-tab-${tab}`);
  if (tabEl) tabEl.classList.add('active');

  if (tab === 'map') {
    closeMobileSheet();
    return;
  }

  if (tab === 'bulletin') {
    closeMobileSheet();
    // Trigger the Bootstrap announcements modal
    const bsModal = document.getElementById('announcements-modal');
    if (bsModal && window.bootstrap) {
      const modal = bootstrap.Modal.getOrCreateInstance(bsModal);
      modal.show();
    }
    return;
  }

  openMobileSheet(tab === 'facilities' ? 'facilities' : tab);
}

/**
 * 1-tap category filter: show only selected facility type on the map AND list them in the bottom sheet.
 * @param {string} category — 'police'|'fire'|'hospital'|'healthCenter'|'cdrrmo'|'all'
 * @param {boolean} [openList=true]
 */
function mobFilterCategory(category, openList = true) {
  if (!State || !State.map) return;

  const targetCategory = (category === 'health') ? 'healthCenter' : category;

  // 1. Update State.activeCategories
  const allCategories = ['police', 'fire', 'hospital', 'healthCenter', 'cdrrmo', 'barangayHall'];
  if (targetCategory === 'all') {
    allCategories.forEach(cat => {
      State.activeCategories[cat] = true;
    });
  } else {
    allCategories.forEach(cat => {
      State.activeCategories[cat] = (cat === targetCategory);
    });
  }

  // 2. Add / remove markers on the map accurately
  const visibleLeafletMarkers = [];
  State.allFacilityMarkers.forEach(m => {
    const isMatch = (targetCategory === 'all' || m.type === targetCategory);
    if (isMatch) {
      if (!State.map.hasLayer(m.marker)) {
        State.map.addLayer(m.marker);
      }
      visibleLeafletMarkers.push(m.marker);
    } else {
      if (State.map.hasLayer(m.marker)) {
        State.map.removeLayer(m.marker);
      }
    }
  });

  // 3. Zoom / fit map bounds to visible markers
  if (visibleLeafletMarkers.length > 0) {
    const group = L.featureGroup(visibleLeafletMarkers);
    if (group.getBounds && group.getBounds().isValid()) {
      State.map.fitBounds(group.getBounds(), {
        padding: [60, 60],
        maxZoom: 16,
        animate: true,
        duration: 0.8
      });
    }
  } else if (targetCategory === 'all') {
    State.map.flyTo(MEYCAUAYAN_CENTER, MEYCAUAYAN_ZOOM, { duration: 0.8 });
  }

  // 4. Render facilities list in bottom sheet!
  if (openList) {
    showMobileFacilityList(targetCategory);
  }
}

/**
 * Display the list of facilities for a selected category inside the mobile bottom sheet.
 * @param {string} category — 'police'|'fire'|'hospital'|'healthCenter'|'cdrrmo'|'all'
 */
function showMobileFacilityList(category) {
  const catPanel = document.getElementById('mob-panel-facilities');
  const listPanel = document.getElementById('mob-panel-facility-list');
  const listItems = document.getElementById('mob-fac-items-list');
  const listTitle = document.getElementById('mob-fac-list-title');
  const listBadge = document.getElementById('mob-fac-list-badge');
  const sheetTitle = document.getElementById('mob-sheet-title');

  if (!listPanel || !listItems) return;

  const categoryMeta = {
    police:       { name: 'Police Stations', icon: 'fas fa-shield-halved', color: '#38bdf8' },
    fire:         { name: 'Fire Stations', icon: 'fas fa-fire', color: '#f97316' },
    hospital:     { name: 'Public Hospitals', icon: 'fas fa-hospital', color: '#ec4899' },
    healthCenter: { name: 'Health Centers', icon: 'fas fa-kit-medical', color: '#10b981' },
    health:       { name: 'Health Centers', icon: 'fas fa-kit-medical', color: '#10b981' },
    cdrrmo:       { name: 'CDRRMO / Rescue', icon: 'fas fa-triangle-exclamation', color: '#eab308' },
    all:          { name: 'All Emergency Facilities', icon: 'fas fa-layer-group', color: '#38bdf8' },
  };

  const targetCategory = (category === 'health') ? 'healthCenter' : category;
  const meta = categoryMeta[targetCategory] || { name: 'Facilities', icon: 'fas fa-building', color: '#38bdf8' };
  
  const facilities = (targetCategory === 'all')
    ? (ALL_FACILITIES || [])
    : (ALL_FACILITIES || []).filter(f => f.type === targetCategory);

  if (listTitle) listTitle.innerHTML = `<i class="${meta.icon}" style="color:${meta.color}; margin-right: 6px;"></i> ${meta.name}`;
  if (listBadge) listBadge.textContent = `${facilities.length} Found`;
  if (sheetTitle) sheetTitle.textContent = meta.name;

  if (facilities.length === 0) {
    listItems.innerHTML = `
      <div class="mob-empty-fac" style="text-align:center; padding: 28px 12px; color: #94a3b8;">
        <i class="fas fa-circle-exclamation mb-2" style="font-size:26px; color:#64748b;"></i>
        <p style="margin:0; font-size:13px; font-weight:600;">No facilities found in this category.</p>
        <p style="margin:4px 0 0 0; font-size:11px; color:#64748b;">Try selecting another category or tap Show All.</p>
      </div>`;
  } else {
    listItems.innerHTML = facilities.map(f => {
      const hotlineVal = f.emergency_hotline || f.emergencyHotline || f.contact;
      const hotlineStr = String(hotlineVal || '');
      const dialNumber = hotlineStr.replace(/[^\d+]/g, '');
      const hotlineBtn = dialNumber.length >= 3 ? `
        <a href="tel:${dialNumber}" class="mob-fac-btn mob-fac-call-btn" onclick="event.stopPropagation();" aria-label="Call ${f.name}">
          <i class="fas fa-phone"></i> Call
        </a>` : '';

      return `
        <div class="mob-fac-card" onclick="zoomToFacility('${f.id}'); closeMobileSheet();">
          <div class="mob-fac-icon-col">
            <div class="mob-fac-avatar" style="background: ${meta.color}20; color: ${meta.color}; border: 1px solid ${meta.color}40;">
              <i class="${meta.icon}"></i>
            </div>
          </div>
          <div class="mob-fac-info-col">
            <div class="mob-fac-name">${f.name}</div>
            <div class="mob-fac-meta">
              ${f.barangay ? `<span class="mob-fac-bgy"><i class="fas fa-location-dot"></i> Brgy. ${f.barangay}</span>` : ''}
              ${hotlineStr ? `<span class="mob-fac-contact"><i class="fas fa-phone"></i> ${hotlineStr}</span>` : ''}
            </div>
            ${f.address ? `<div class="mob-fac-addr">${f.address}</div>` : ''}
          </div>
          <div class="mob-fac-actions-col">
            ${hotlineBtn}
            <button type="button" class="mob-fac-btn mob-fac-view-btn" onclick="event.stopPropagation(); zoomToFacility('${f.id}'); closeMobileSheet();" aria-label="Locate on map">
              <i class="fas fa-crosshairs"></i> View
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Switch display from grid to list inside sheet
  if (catPanel) catPanel.style.display = 'none';
  listPanel.style.display = 'block';

  // Ensure bottom sheet is open
  const sheet = document.getElementById('mob-bottom-sheet');
  const backdrop = document.getElementById('mob-sheet-backdrop');
  if (sheet) {
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
  }
  if (backdrop) backdrop.classList.add('open');
}

/**
 * Return from facility list to category grid inside bottom sheet.
 */
function showMobileCategoryGrid() {
  const catPanel = document.getElementById('mob-panel-facilities');
  const listPanel = document.getElementById('mob-panel-facility-list');
  const sheetTitle = document.getElementById('mob-sheet-title');

  if (listPanel) listPanel.style.display = 'none';
  if (catPanel) catPanel.style.display = 'block';
  if (sheetTitle) sheetTitle.textContent = 'Emergency Facilities';
}

/**
 * Safely close bottom sheet and open Hotlines Modal.
 */
function openMobileHotlinesModal() {
  closeMobileSheet();
  setTimeout(() => {
    const modalEl = document.getElementById('hotlines-modal');
    if (modalEl && window.bootstrap) {
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    }
  }, 150);
}

/**
 * Populate the mobile barangay 2-col grid (and filter by search term).
 * @param {string} query
 */
function populateMobileBrgySheet(query) {
  const grid = document.getElementById('mob-brgy-grid');
  if (!grid || typeof BARANGAYS_DATA === 'undefined') return;

  const q = (query || '').toLowerCase().trim();
  const filtered = BARANGAYS_DATA.filter(b =>
    !q || (b.name && b.name.toLowerCase().includes(q))
  );

  grid.innerHTML = '';

  if (filtered.length === 0) {
    grid.innerHTML = '<p style="color:#64748b;font-size:12px;padding:12px 0;grid-column:1/-1;">No barangays found.</p>';
    return;
  }

  filtered.forEach((b, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mob-brgy-btn';
    btn.innerHTML = `<span class="mob-brgy-idx">${String(i + 1).padStart(2, '0')}</span>${b.name}`;
    btn.addEventListener('click', () => {
      focusBarangay(b.id);
      closeMobileSheet();
    });
    grid.appendChild(btn);
  });
}

/**
 * Live search handler for mobile barangay sheet.
 * @param {string} value
 */
function mobFilterBrgy(value) {
  populateMobileBrgySheet(value);
}

/* ── Swipe-down gesture to dismiss the bottom sheet ─────────── */
(function initSheetSwipe() {
  let touchStartY = 0;
  let isDragging  = false;

  document.addEventListener('DOMContentLoaded', () => {
    const handleWrap = document.getElementById('mob-sheet-handle-wrap');
    const sheet      = document.getElementById('mob-bottom-sheet');
    if (!handleWrap || !sheet) return;

    handleWrap.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
      isDragging  = true;
      handleWrap.classList.add('dragging');
    }, { passive: true });

    handleWrap.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const dy = e.touches[0].clientY - touchStartY;
      if (dy > 0) {
        // Apply drag visual feedback
        sheet.style.transform = `translateY(${dy}px)`;
        sheet.style.transition = 'none';
      }
    }, { passive: true });

    handleWrap.addEventListener('touchend', (e) => {
      handleWrap.classList.remove('dragging');
      isDragging = false;
      const dy = e.changedTouches[0].clientY - touchStartY;
      sheet.style.transform = '';
      sheet.style.transition = '';

      // If dragged down ≥ 80px, dismiss
      if (dy >= 80) {
        closeMobileSheet();
      }
    });
  });
})();

/* ── Sync bulletin badge to mobile tab bar ───────────────────── */
const _origPopulateAnnounce = typeof populateAnnouncementsModal === 'function'
  ? populateAnnouncementsModal
  : null;

// Patch populateAnnouncementsModal to also update the tab bar badge
const _patchedPopulateAnnouncements = function(announcements) {
  if (_origPopulateAnnounce) _origPopulateAnnounce(announcements);
  // Update mobile tab bar bulletin badge
  const count   = (PUBLIC_ANNOUNCEMENTS && PUBLIC_ANNOUNCEMENTS.length) || 0;
  const tabBadge = document.getElementById('mob-tab-bulletin-count');
  if (tabBadge) {
    tabBadge.textContent = count;
    tabBadge.style.display = count > 0 ? 'flex' : 'none';
  }
};

// Wire dynamic count updates after facilities load
document.addEventListener('DOMContentLoaded', () => {
  // Update mobile cat counts after data loads (backed by API or fallback)
  const syncMobCounts = () => {
    const policeEl  = document.getElementById('mob-count-police');
    const fireEl    = document.getElementById('mob-count-fire');
    const hospEl    = document.getElementById('mob-count-hospital');
    const healthEl  = document.getElementById('mob-count-health');
    const cdrrmoEl  = document.getElementById('mob-count-cdrrmo');

    if (policeEl  && FACILITIES_DATA.police)       policeEl.textContent  = FACILITIES_DATA.police.length;
    if (fireEl    && FACILITIES_DATA.fire)         fireEl.textContent    = FACILITIES_DATA.fire.length;
    if (hospEl    && FACILITIES_DATA.hospitals)    hospEl.textContent    = FACILITIES_DATA.hospitals.length;
    if (healthEl  && FACILITIES_DATA.healthCenters) healthEl.textContent = FACILITIES_DATA.healthCenters.length;
    if (cdrrmoEl  && FACILITIES_DATA.cdrrmo)       cdrrmoEl.textContent  = FACILITIES_DATA.cdrrmo.length;
  };

  // Poll once after data is expected to be loaded (1.5s grace)
  setTimeout(syncMobCounts, 1500);
});

/* ============================================================
   FIND NEAREST EMERGENCY FACILITY & GPS PROXIMITY MODULE
   ============================================================ */

/**
 * Calculate great-circle distance between two points in kilometers
 * using the Haversine formula
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance nicely (meters if < 1km, km with 1 decimal place otherwise)
 */
function formatDistance(distKm) {
  if (distKm == null || isNaN(distKm)) return '—';
  if (distKm < 1.0) {
    const meters = Math.max(10, Math.round(distKm * 1000));
    return `${meters} m`;
  }
  return `${distKm.toFixed(1)} km`;
}

/**
 * Estimate transit time for urban emergency response in Meycauayan City
 * Assumes ~28 km/h emergency/urban driving speed and ~4.5 km/h walking speed
 */
function estimateTransitTimes(distKm) {
  if (distKm == null || isNaN(distKm)) return { drive: '—', walk: '—' };
  const driveMinutes = Math.max(1, Math.round((distKm / 28) * 60));
  const walkMinutes  = Math.max(1, Math.round((distKm / 4.5) * 60));
  return {
    drive: `~${driveMinutes} min drive`,
    walk:  `~${walkMinutes} min walk`
  };
}

/**
 * Center coordinates for Meycauayan City Hall
 */
const MEYCAUAYAN_CITY_CENTER = { lat: 14.73464, lng: 120.95816 };

/**
 * Ray-casting algorithm to test if a point [lng, lat] is inside a polygon
 */
function isPointInGeoPolygon(point, polygonCoordinates) {
  if (!polygonCoordinates || !Array.isArray(polygonCoordinates)) return false;
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = polygonCoordinates.length - 1; i < polygonCoordinates.length; j = i++) {
    const xi = polygonCoordinates[i][0], yi = polygonCoordinates[i][1];
    const xj = polygonCoordinates[j][0], yj = polygonCoordinates[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Accurately find which barangay boundary coordinates fall into
 */
function findBarangayByCoordinates(lat, lng) {
  if (!Array.isArray(BARANGAYS_DATA)) return null;

  // 1. Check true GeoJSON polygon boundaries first (highest precision)
  for (const b of BARANGAYS_DATA) {
    if (b.geojson && b.geojson.geometry) {
      const geom = b.geojson.geometry;
      if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
        if (isPointInGeoPolygon([lng, lat], geom.coordinates[0])) {
          return { name: b.name, id: b.id, exact: true };
        }
      } else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
        for (const poly of geom.coordinates) {
          if (isPointInGeoPolygon([lng, lat], poly[0])) {
            return { name: b.name, id: b.id, exact: true };
          }
        }
      }
    }
  }

  // 2. Fallback to distance to barangay hall
  let minDistance = Infinity;
  let closest = null;
  BARANGAYS_DATA.forEach(b => {
    const hall = (FACILITIES_DATA.barangayHalls || []).find(h => h.barangay && h.barangay.toLowerCase() === b.name.toLowerCase());
    if (hall && hall.lat && hall.lng) {
      const d = calculateDistanceKm(lat, lng, parseFloat(hall.lat), parseFloat(hall.lng));
      if (d < minDistance) {
        minDistance = d;
        closest = { name: b.name, id: b.id, distanceKm: d, exact: false };
      }
    }
  });

  return closest;
}

/**
 * Validate GPS coordinates to check for inaccurate desktop ISP GeoIP routing
 */
function validateGpsCoordinates(lat, lng, accuracy) {
  const distFromCenter = calculateDistanceKm(lat, lng, MEYCAUAYAN_CITY_CENTER.lat, MEYCAUAYAN_CITY_CENTER.lng);
  const isLowAccuracy = Boolean(accuracy && accuracy > 1500);
  const isOutOfCity   = (distFromCenter > 10.0);

  return {
    distFromCenter,
    isLowAccuracy,
    isOutOfCity,
    isUnreliable: isLowAccuracy || isOutOfCity
  };
}

/**
 * Populate the 26 barangays dropdown in the nearest modal
 */
function populateNearestBarangayDropdown() {
  const sel = document.getElementById('select-my-barangay');
  if (!sel || sel.options.length > 1) return;

  const barangayNames = [
    "Bagbaguin", "Bahay Pare", "Bancal", "Banga", "Bayugo", "Calvario", "Camalig",
    "Caingin", "Gasak", "Hulo", "Iba", "Langka", "Lawa", "Libtong", "Liputan",
    "Longos", "Malhacan", "Pajo", "Pandayan", "Pantoc", "Perez", "Poblacion",
    "Saluysoy", "Tugatog", "Ubihan", "Zamora"
  ].sort();

  barangayNames.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = `Brgy. ${name}`;
    sel.appendChild(opt);
  });
}

/**
 * Handle direct Barangay selection (e.g. Libtong)
 */
function handleBarangaySelect(barangayName) {
  if (!barangayName) return;

  try {
    localStorage.setItem('user_preferred_barangay', barangayName);
  } catch (e) {}

  // Update dropdown value
  const sel = document.getElementById('select-my-barangay');
  if (sel) sel.value = barangayName;

  // Find barangay hall coordinates
  let targetLat = null;
  let targetLng = null;

  const hall = (FACILITIES_DATA.barangayHalls || []).find(
    h => h.barangay && h.barangay.toLowerCase() === barangayName.toLowerCase()
  );

  if (hall && hall.lat && hall.lng) {
    targetLat = parseFloat(hall.lat);
    targetLng = parseFloat(hall.lng);
  } else {
    // Check in BARANGAYS_DATA
    const bData = (BARANGAYS_DATA || []).find(b => b.name.toLowerCase() === barangayName.toLowerCase());
    if (bData && bData.geojson && bData.geojson.geometry) {
      const coords = bData.geojson.geometry.coordinates[0];
      if (Array.isArray(coords) && coords.length > 0) {
        targetLng = coords.reduce((sum, p) => sum + p[0], 0) / coords.length;
        targetLat = coords.reduce((sum, p) => sum + p[1], 0) / coords.length;
      }
    }
  }

  if (!targetLat || !targetLng) {
    targetLat = MEYCAUAYAN_CITY_CENTER.lat;
    targetLng = MEYCAUAYAN_CITY_CENTER.lng;
  }

  // Set high precision location (accuracy 15m)
  setUserLocation(targetLat, targetLng, 15, `Barangay ${barangayName}`, barangayName, true);

  // Update accuracy notice to confirmed success
  const noticeEl = document.getElementById('nearest-accuracy-notice');
  if (noticeEl) {
    noticeEl.style.display = 'flex';
    noticeEl.className = 'nearest-accuracy-notice success';
    noticeEl.innerHTML = `
      <i class="fas fa-circle-check text-emerald mt-1"></i>
      <div>
        <strong>Pinpoint Accurate:</strong> Position set to <strong>Barangay ${barangayName}</strong> (High Precision). Distances and response times are now exact.
      </div>
    `;
  }
}

/**
 * Open the Find Nearest Emergency Facility modal and request user location
 */
function openNearestFacilityModal() {
  const modalEl = document.getElementById('nearest-modal');
  if (!modalEl || !window.bootstrap) return;

  populateNearestBarangayDropdown();

  const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  modal.show();

  // If user previously set a preferred barangay, restore it!
  let savedBarangay = null;
  try {
    savedBarangay = localStorage.getItem('user_preferred_barangay');
  } catch (e) {}

  if (!State.userLocation) {
    if (savedBarangay) {
      handleBarangaySelect(savedBarangay);
    } else {
      refreshUserLocation();
    }
  } else {
    updateLocationBannerUI();
    calculateAndRenderNearestFacilities(State.nearestActiveCategory || 'all');
  }
}

/**
 * Refresh GPS position via browser Geolocation API
 */
function refreshUserLocation() {
  const statusEl = document.getElementById('nearest-loc-status');
  const coordsEl = document.getElementById('nearest-loc-coords');
  const iconEl   = document.getElementById('nearest-loc-icon');
  const noticeEl = document.getElementById('nearest-accuracy-notice');

  if (statusEl) statusEl.textContent = 'Acquiring GPS location...';
  if (coordsEl) coordsEl.textContent = 'Contacting device geolocation satellites...';
  if (iconEl) iconEl.className = 'fas fa-spinner fa-spin text-cyan fs-5';
  if (noticeEl) noticeEl.style.display = 'none';

  if (!navigator.geolocation) {
    handleLocationError({ code: 0, message: 'Geolocation is not supported by your browser.' });
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null;
      setUserLocation(lat, lng, acc, 'Live GPS Position', null, false);
    },
    (err) => {
      handleLocationError(err);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0 // Do not use stale cache
    }
  );
}

/**
 * Set user coordinates in State and update marker on Leaflet map
 */
function setUserLocation(lat, lng, accuracy = null, label = 'User Location', forcedBarangay = null, isManualSelection = false) {
  State.userLocation = { lat, lng, accuracy, label };

  const validation = validateGpsCoordinates(lat, lng, accuracy);
  const noticeEl   = document.getElementById('nearest-accuracy-notice');

  let detectedBarangay = forcedBarangay;
  if (!detectedBarangay) {
    const brgyMatch = findBarangayByCoordinates(lat, lng);
    if (brgyMatch) {
      detectedBarangay = brgyMatch.name;
    }
  }

  State.userLocation.barangay = detectedBarangay;

  // Check if position is unreliable (e.g. desktop ISP GeoIP placing user in Pampanga)
  if (!isManualSelection && validation.isUnreliable) {
    // If user has a saved preferred barangay in localStorage, use it instead of the wrong ISP coordinates!
    let savedBarangay = null;
    try {
      savedBarangay = localStorage.getItem('user_preferred_barangay');
    } catch (e) {}

    if (savedBarangay) {
      handleBarangaySelect(savedBarangay);
      return;
    }

    if (noticeEl) {
      const accKm = accuracy ? (accuracy / 1000).toFixed(0) : '50+';
      noticeEl.style.display = 'flex';
      noticeEl.className = 'nearest-accuracy-notice warning';
      noticeEl.innerHTML = `
        <i class="fas fa-triangle-exclamation text-amber mt-1"></i>
        <div>
          <strong>Inaccurate Desktop/ISP Location Detected (±${accKm} km):</strong><br>
          Your PC network routed outside Meycauayan. Please <strong>Set Your Barangay below (e.g. Libtong)</strong> or click "Pick on Map" for exact distance calculation.
        </div>
      `;
    }
  } else if (!isManualSelection && noticeEl) {
    noticeEl.style.display = 'none';
  }

  // Update dropdown value if matched
  const sel = document.getElementById('select-my-barangay');
  if (sel && detectedBarangay) {
    sel.value = detectedBarangay;
  }

  // Update map marker
  updateUserLocationMarkerOnMap();

  // Update UI Banner and render facility list
  updateLocationBannerUI();
  calculateAndRenderNearestFacilities(State.nearestActiveCategory || 'all');
}

/**
 * Handle geolocation errors with graceful fallback
 */
function handleLocationError(err) {
  console.warn('Geolocation acquisition error:', err);
  const statusEl = document.getElementById('nearest-loc-status');
  const coordsEl = document.getElementById('nearest-loc-coords');
  const iconEl   = document.getElementById('nearest-loc-icon');
  const noticeEl = document.getElementById('nearest-accuracy-notice');

  if (iconEl) iconEl.className = 'fas fa-triangle-exclamation text-amber fs-5';

  let msg = 'Location access denied or unavailable.';
  if (err && err.code === 1) {
    msg = 'Location permission denied by browser.';
  } else if (err && err.code === 2) {
    msg = 'GPS signal unavailable.';
  } else if (err && err.code === 3) {
    msg = 'GPS acquisition timed out.';
  }

  let savedBarangay = null;
  try {
    savedBarangay = localStorage.getItem('user_preferred_barangay');
  } catch (e) {}

  if (savedBarangay) {
    handleBarangaySelect(savedBarangay);
    return;
  }

  if (statusEl) statusEl.textContent = `${msg} Defaulting to Meycauayan City Hall.`;
  if (coordsEl) coordsEl.textContent = 'Please select your Barangay below or click "Pick on Map".';

  if (noticeEl) {
    noticeEl.style.display = 'flex';
    noticeEl.className = 'nearest-accuracy-notice warning';
    noticeEl.innerHTML = `
      <i class="fas fa-hand-point-down text-amber mt-1"></i>
      <div>
        GPS unavailable. Please <strong>Select your Barangay below (e.g. Libtong)</strong> to calculate exact distances to all facilities.
      </div>
    `;
  }

  // Fallback to Meycauayan Poblacion / City Hall center
  setUserLocation(MEYCAUAYAN_CITY_CENTER.lat, MEYCAUAYAN_CITY_CENTER.lng, null, 'City Hall Center', 'Poblacion', false);
}

/**
 * Update Location Banner text in the modal
 */
function updateLocationBannerUI() {
  const statusEl = document.getElementById('nearest-loc-status');
  const coordsEl = document.getElementById('nearest-loc-coords');
  const iconEl   = document.getElementById('nearest-loc-icon');

  if (!State.userLocation) return;

  if (iconEl) iconEl.className = 'fas fa-location-dot text-cyan fs-5';
  if (statusEl) {
    const brgyStr = State.userLocation.barangay ? ` (Brgy. ${State.userLocation.barangay})` : '';
    statusEl.innerHTML = `<span style="color:#38bdf8;">📍 ${State.userLocation.label || 'Your Location'}</span> <span class="fw-bold" style="color:#5eead4;">${brgyStr}</span>`;
  }
  if (coordsEl) {
    const accStr = State.userLocation.accuracy ? ` • Accuracy: ±${State.userLocation.accuracy}m` : '';
    coordsEl.textContent = `Coordinates: ${State.userLocation.lat.toFixed(6)}, ${State.userLocation.lng.toFixed(6)}${accStr}`;
  }
}

/**
 * Put animated radar icon on the Leaflet map for user position
 */
function updateUserLocationMarkerOnMap() {
  if (!State.map || !State.userLocation) return;

  // Remove existing marker if any
  if (State.userLocationMarker && State.map.hasLayer(State.userLocationMarker)) {
    State.map.removeLayer(State.userLocationMarker);
  }

  const radarIcon = L.divIcon({
    className: '',
    html: `
      <div class="user-radar-container">
        <div class="user-radar-ring"></div>
        <div class="user-radar-center"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  State.userLocationMarker = L.marker([State.userLocation.lat, State.userLocation.lng], {
    icon: radarIcon,
    zIndexOffset: 1000
  }).addTo(State.map);

  State.userLocationMarker.bindTooltip('Your Location', {
    permanent: false,
    direction: 'top',
    className: 'nearest-route-tooltip'
  });
}

/**
 * Enable "Pick on Map" mode
 */
function startPickLocationMode() {
  State.isPickLocationMode = true;

  // Hide the modal temporarily so the user can click on the map
  const modalEl = document.getElementById('nearest-modal');
  if (modalEl && window.bootstrap) {
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
  }

  // Change cursor to crosshair
  const mapDiv = document.getElementById('main-map');
  if (mapDiv) mapDiv.style.cursor = 'crosshair';

  // Show visual guidance toast/banner
  showPickLocationBanner();
}

function exitPickLocationMode() {
  State.isPickLocationMode = false;
  const mapDiv = document.getElementById('main-map');
  if (mapDiv) mapDiv.style.cursor = '';
  hidePickLocationBanner();
}

function showPickLocationBanner() {
  let banner = document.getElementById('pick-location-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'pick-location-banner';
    banner.style.cssText = `
      position: fixed;
      top: 70px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(14, 28, 48, 0.95);
      border: 1.5px solid #38bdf8;
      border-radius: 30px;
      padding: 10px 22px;
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
      z-index: 2000;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      animation: fadeInDown 0.3s ease;
    `;
    banner.innerHTML = `
      <i class="fas fa-crosshairs text-cyan fa-spin"></i>
      <span>Click anywhere on the map to set your location</span>
      <button type="button" style="background:none; border:none; color:#f87171; font-size:16px; cursor:pointer;" onclick="exitPickLocationMode()">&times;</button>
    `;
    document.body.appendChild(banner);
  }
  banner.style.display = 'flex';
}

function hidePickLocationBanner() {
  const banner = document.getElementById('pick-location-banner');
  if (banner) banner.style.display = 'none';
}

/**
 * Calculate distances to all facilities and render sorted cards
 */
function calculateAndRenderNearestFacilities(filterCategory = 'all') {
  State.nearestActiveCategory = filterCategory;

  const resultsList = document.getElementById('nearest-results-list');
  if (!resultsList) return;

  if (!State.userLocation) {
    resultsList.innerHTML = `
      <div style="text-align:center; padding: 40px 20px; color: var(--clr-text-muted);">
        <i class="fas fa-location-crosshairs text-cyan fa-2x mb-3"></i>
        <div style="font-weight:700; color:#fff; margin-bottom:6px;">Waiting for location...</div>
        <div>Please allow GPS access or click "Pick on Map" above.</div>
      </div>
    `;
    return;
  }

  // Compile full list of facilities from FACILITIES_DATA
  const allList = [];
  const categories = ['hospitals', 'police', 'fire', 'healthCenters', 'cdrrmo'];

  categories.forEach(catKey => {
    const list = FACILITIES_DATA[catKey] || [];
    list.forEach(f => {
      if (f.lat && f.lng) {
        const distKm = calculateDistanceKm(State.userLocation.lat, State.userLocation.lng, parseFloat(f.lat), parseFloat(f.lng));
        allList.push({
          ...f,
          categoryKey: catKey,
          distanceKm: distKm
        });
      }
    });
  });

  // Sort ascending by distance (nearest first)
  allList.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

  // Update tab counts
  const countAll      = allList.length;
  const countHospital = allList.filter(f => f.type === 'hospital').length;
  const countPolice   = allList.filter(f => f.type === 'police').length;
  const countFire     = allList.filter(f => f.type === 'fire').length;
  const countHealth   = allList.filter(f => f.type === 'healthCenter').length;

  const setTabCount = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setTabCount('count-nearest-all', countAll);
  setTabCount('count-nearest-hospital', countHospital);
  setTabCount('count-nearest-police', countPolice);
  setTabCount('count-nearest-fire', countFire);
  setTabCount('count-nearest-health', countHealth);

  // Filter based on active category
  let filtered = allList;
  if (filterCategory !== 'all') {
    filtered = allList.filter(f => f.type === filterCategory);
  }

  if (filtered.length === 0) {
    resultsList.innerHTML = `
      <div style="text-align:center; padding: 40px 20px; color: var(--clr-text-muted);">
        <i class="fas fa-circle-info text-cyan fa-2x mb-3"></i>
        <div style="font-weight:700; color:#fff; margin-bottom:6px;">No Facilities in this Category</div>
        <div>Try selecting "All Facilities" above to view other emergency stations.</div>
      </div>
    `;
    return;
  }

  const typeConfig = {
    hospital:     { label: 'Public Hospital', icon: 'fas fa-hospital', color: 'text-red', badge: 'badge-hospital' },
    police:       { label: 'Police Station', icon: 'fas fa-shield-halved', color: 'text-blue', badge: 'badge-police' },
    fire:         { label: 'Fire Station', icon: 'fas fa-fire', color: 'text-amber', badge: 'badge-fire' },
    healthCenter: { label: 'Health Center', icon: 'fas fa-kit-medical', color: 'text-emerald', badge: 'badge-healthCenter' },
    cdrrmo:       { label: 'CDRRMO / Rescue', icon: 'fas fa-triangle-exclamation', color: 'text-yellow', badge: 'badge-cdrrmo' }
  };

  resultsList.innerHTML = filtered.map((fac, idx) => {
    const cfg = typeConfig[fac.type] || { label: fac.type, icon: 'fas fa-building', color: 'text-cyan', badge: 'badge-police' };
    const distText = formatDistance(fac.distanceKm);
    const times = estimateTransitTimes(fac.distanceKm);
    const isClosest = idx === 0 && filterCategory === 'all';

    const cleanPhone = (fac.emergencyHotline || fac.contact || '').replace(/[^\d+]/g, '');
    const callBtn = cleanPhone ? `
      <a href="tel:${cleanPhone}" class="btn-nearest-call" title="Emergency Call">
        <i class="fas fa-phone"></i> Call (${fac.emergencyHotline || fac.contact})
      </a>
    ` : '';

    const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${State.userLocation.lat},${State.userLocation.lng}&destination=${fac.lat},${fac.lng}`;

    return `
      <div class="nearest-card ${isClosest ? 'is-closest' : ''}" id="card-nearest-${fac.id}">
        <div class="nearest-card-header">
          <div>
            <div class="d-flex align-items-center gap-2 mb-1">
              <span class="v-badge ${cfg.badge}"><i class="${cfg.icon} me-1"></i>${cfg.label}</span>
              ${isClosest ? '<span class="v-badge badge-police" style="background:#0ea5e9; color:#fff;"><i class="fas fa-star me-1"></i>CLOSEST FACILITY</span>' : ''}
            </div>
            <div class="nearest-card-title">${escapeHtml(fac.name)}</div>
            <div class="nearest-card-meta">
              <span><i class="fas fa-location-dot me-1"></i>${escapeHtml(fac.address || fac.barangay || 'Meycauayan City')}</span>
              ${fac.barangay ? `<span>• Brgy. ${escapeHtml(fac.barangay)}</span>` : ''}
            </div>
          </div>
          <div class="nearest-badge-dist">
            <i class="fas fa-route me-1"></i>${distText}
          </div>
        </div>

        <div class="nearest-time-estimates">
          <span class="nearest-time-tag"><i class="fas fa-car-side"></i> ${times.drive}</span>
          <span>•</span>
          <span class="nearest-time-tag" style="color:var(--clr-text-muted);"><i class="fas fa-person-walking"></i> ${times.walk}</span>
        </div>

        <div class="nearest-card-actions">
          <button type="button" class="btn-nearest-view" onclick="focusNearestOnMap('${fac.id}')">
            <i class="fas fa-crosshairs"></i> View Route on Map
          </button>
          ${callBtn}
          <a href="${gmapsUrl}" target="_blank" rel="noopener" class="btn-nearest-gmaps">
            <i class="fas fa-diamond-turn-right"></i> Google Directions
          </a>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Filter nearest facilities category tabs
 */
function filterNearestCategory(type) {
  const tabs = document.querySelectorAll('.nearest-tab-btn');
  tabs.forEach(tab => {
    if (tab.getAttribute('data-type') === type) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  calculateAndRenderNearestFacilities(type);
}

/**
 * Focus and draw direct route connection line to the selected facility on the Leaflet map
 */
function focusNearestOnMap(facilityId) {
  if (!State.map || !State.userLocation) return;

  // Find facility
  let targetFac = null;
  const categories = ['hospitals', 'police', 'fire', 'healthCenters', 'cdrrmo'];
  for (const cat of categories) {
    const list = FACILITIES_DATA[cat] || [];
    const found = list.find(f => f.id === facilityId);
    if (found) {
      targetFac = found;
      break;
    }
  }

  if (!targetFac || !targetFac.lat || !targetFac.lng) return;

  // Dismiss modal
  const modalEl = document.getElementById('nearest-modal');
  if (modalEl && window.bootstrap) {
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
  }

  // Remove existing route line if any
  if (State.proximityRouteLine && State.map.hasLayer(State.proximityRouteLine)) {
    State.map.removeLayer(State.proximityRouteLine);
  }

  const userCoords = [State.userLocation.lat, State.userLocation.lng];
  const facCoords  = [parseFloat(targetFac.lat), parseFloat(targetFac.lng)];
  const distKm     = calculateDistanceKm(userCoords[0], userCoords[1], facCoords[0], facCoords[1]);
  const distText   = formatDistance(distKm);
  const transit    = estimateTransitTimes(distKm);

  // Draw animated styled direct route connection line
  State.proximityRouteLine = L.polyline([userCoords, facCoords], {
    color: '#38bdf8',
    weight: 3.5,
    opacity: 0.9,
    dashArray: '8, 8',
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(State.map);

  State.proximityRouteLine.bindTooltip(`
    <div style="font-weight:700; color:#38bdf8;">📍 ${distText}</div>
    <div style="font-size:10px; color:#cbd5e1;">${transit.drive}</div>
  `, {
    permanent: true,
    direction: 'center',
    className: 'nearest-route-tooltip'
  }).openTooltip();

  // Smoothly fly to encompass both user location and facility
  const bounds = L.latLngBounds([userCoords, facCoords]);
  const isMobile = window.innerWidth <= 860;
  const flyPadding = isMobile ? [40, 40] : [80, 80];

  State.map.flyToBounds(bounds, {
    padding: flyPadding,
    maxZoom: 17,
    duration: 1.2,
    easeLinearity: 0.35
  });

  // Open the facility info panel
  setTimeout(() => {
    openFacilityInfoPanel(targetFac);
  }, 600);
}

/**
 * Clear route line and user location from map
 */
function clearUserLocationAndRoute() {
  if (State.userLocationMarker && State.map.hasLayer(State.userLocationMarker)) {
    State.map.removeLayer(State.userLocationMarker);
  }
  if (State.proximityRouteLine && State.map.hasLayer(State.proximityRouteLine)) {
    State.map.removeLayer(State.proximityRouteLine);
  }
  State.userLocationMarker = null;
  State.proximityRouteLine = null;
}


