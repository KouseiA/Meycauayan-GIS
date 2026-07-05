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
  geojsonLayers: {},          // barangay polygon layers by id
  barangayMarkers: [],        // barangay hall markers at centroid locations
  facilityLayers: {           // marker layers by type
    police: [],
    fire: [],
    hospitals: [],
    healthCenters: []
  },
  allFacilityMarkers: [],     // flat list of all Leaflet markers
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
      const uniqueXs = new Set(xs);
      const uniqueYs = new Set(ys);
      if (uniqueXs.size === 2 && uniqueYs.size === 2) {
        console.warn(`Removed placeholder rectangle boundary for barangay: ${b.name}`);
        b.geojson = null;
      }
    } catch (e) {
      // ignore malformed entries
    }
  });
}

/* ============================================================
   ICON FACTORY
   ============================================================ */
function createMarkerIcon(type) {
  const iconMap = {
    barangay:    { icon: 'fas fa-building',     cls: 'barangay-pin', color: '#f59e0b' },
    police:      { icon: 'fas fa-shield-halved', cls: 'police-pin',   color: '#1d4ed8' },
    fire:        { icon: 'fas fa-fire',          cls: 'fire-pin',     color: '#c2410c' },
    hospital:    { icon: 'fas fa-hospital',      cls: 'hospital-pin', color: '#15803d' },
    healthCenter:{ icon: 'fas fa-kit-medical',   cls: 'health-pin',   color: '#7c3aed' },
  };
  const cfg = iconMap[type] || iconMap.police;

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-pin ${cfg.cls}" style="box-shadow: 0 3px 12px ${cfg.color}55;">
        <i class="${cfg.icon}"></i>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34]
  });
}

/* ============================================================
   POPUP TEMPLATE
   ============================================================ */
function buildPopupHtml(facility) {
  const iconMap = {
    police:      'fas fa-shield-halved',
    fire:        'fas fa-fire',
    hospital:    'fas fa-hospital',
    healthCenter:'fas fa-kit-medical'
  };
  const typeLabels = {
    police:       'Police Station',
    fire:         'Fire Station',
    hospital:     'Hospital',
    healthCenter: 'Health Center'
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
      <a href="${facility.google_maps_url || '#'}" target="_blank" rel="noopener" class="popup-link">
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
    police:       'badge-police',
    fire:         'badge-fire',
    hospital:     'badge-hospital',
    healthCenter: 'badge-healthCenter'
  };
  const typeLabels = {
    police:       'Police Station',
    fire:         'Fire Station',
    hospital:     'Hospital',
    healthCenter: 'Health Center'
  };

  const image = document.getElementById('info-panel-image');
  badge.className = `info-type-badge ${badgeClasses[facility.type] || ''}`;
  badge.textContent = typeLabels[facility.type] || facility.type;
  title.textContent = facility.name;
  if (image) {
    image.src = facility.image || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80';
    image.alt = `${title.textContent} photo`;
    image.onerror = () => {
      image.src = 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=800&q=80';
    };
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

  body.innerHTML = `
    ${rows.join('')}
    ${servicesList}
    <a href="${facility.google_maps_url || '#'}" target="_blank" rel="noopener" class="btn-maps">
      <i class="fas fa-diamond-turn-right"></i>
      Navigate in Google Maps
    </a>
    <button class="btn-reset-view" onclick="resetMapView()">
      <i class="fas fa-arrow-left"></i>
      Back to Full Map
    </button>
  `;

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
  if (image) {
    image.src = barangay.image || 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80';
    image.alt = `${barangay.name} barangay hall`;
    image.onerror = () => {
      image.src = 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80';
    };
  }

  const rows = [];
  rows.push(buildInfoRow('fas fa-user-tie', 'Barangay Captain', barangay.captain || '—'));
  rows.push(buildInfoRow('fas fa-users', 'Estimated Population', barangay.population ? barangay.population.toLocaleString() : '—'));
  rows.push(buildInfoRow('fas fa-chart-area', 'Land Area', barangay.area || '—'));
  rows.push(buildInfoRow('fas fa-location-dot', 'Hall Address', barangay.address || '—'));
  rows.push(buildInfoRow('fas fa-phone', 'Contact Number', barangay.contact || '—'));

  if (barangay.description) {
    rows.push(buildInfoRow('fas fa-circle-info', 'Description', barangay.description));
  }

  // Find emergency facilities belonging to this barangay
  const police = FACILITIES_DATA.police.filter(f => f.barangay === barangay.name);
  const fire   = FACILITIES_DATA.fire.filter(f => f.barangay === barangay.name);
  const hosp   = FACILITIES_DATA.hospitals.filter(f => f.barangay === barangay.name);
  const health = FACILITIES_DATA.healthCenters.filter(f => f.barangay === barangay.name);

  const localFacilities = [...police, ...fire, ...hosp, ...health];

  let facilitySection = '';
  if (localFacilities.length > 0) {
    facilitySection = `
      <div style="margin-top:14px; border-top: 1px solid var(--clr-border); padding-top:12px;">
        <div style="font-size:9px; font-weight:600; letter-spacing:0.15em; text-transform:uppercase; color:var(--clr-text-muted); margin-bottom:8px;">Local Emergency Facilities</div>
        <div class="facility-tags-wrap">
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
    
    <div class="download-section">
      <div class="download-title">DOWNLOAD BOUNDARY</div>
      <div class="download-btns">
        <button class="btn-download" onclick="downloadBoundary('${barangay.name}', 'geojson')">
          <i class="fas fa-file-code"></i> GEOJSON
        </button>
        <button class="btn-download kml" onclick="downloadBoundary('${barangay.name}', 'kml')">
          <i class="fas fa-file-import"></i> KML
        </button>
      </div>
    </div>

    <button class="btn-reset-view" onclick="resetMapView()">
      <i class="fas fa-arrow-left"></i>
      Back to Full Map
    </button>
  `;

  // Update HUD breadcrumbs
  document.getElementById('hud-breadcrumbs').innerHTML = `
    PHILIPPINES <span class="hud-sep">/</span> BULACAN <span class="hud-sep">/</span> MEYCAUAYAN CITY <span class="hud-sep">/</span> <span style="color:#00ff66;font-weight:bold;">${barangay.name.toUpperCase()}</span>
  `;

  // Play click sound
  AudioSynth.playClick();

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

function closeInfoPanel() {
  document.getElementById('info-panel').classList.remove('open');
  document.body.classList.remove('popup-open');
  document.getElementById('map-container')?.classList.remove('panel-open');
  // Wait for CSS width transition then re-measure map
  if (State.map) {
    setTimeout(() => State.map.invalidateSize({ animate: false }), 420);
  }
}

/* ============================================================
   BARANGAY GeoJSON STYLES
   ============================================================ */
const BOUNDARY_STYLE_NORMAL = {
  fillColor:   '#b8860b',
  fillOpacity: 0.06,
  color:       '#b8860b',
  weight:      1.5,
  opacity:     0.65
};

const BOUNDARY_STYLE_SELECTED = {
  fillColor:   '#cc0000',
  fillOpacity: 0.12,
  color:       '#cc0000',
  weight:      2.5,
  opacity:     1
};

const BOUNDARY_STYLE_DIMMED = {
  fillColor:   '#bbbbbb',
  fillOpacity: 0.03,
  color:       '#cccccc',
  weight:      1,
  opacity:     0.35
};

/* ============================================================
   BARANGAY FOCUS MODE
   ============================================================ */
function focusBarangay(barangayId) {
  const barangay = BARANGAYS_DATA.find(b => b.id === barangayId);
  if (!barangay) return;

  State.selectedBarangayId = barangayId;

  // Style all layers
  Object.keys(State.geojsonLayers).forEach(id => {
    const layer = State.geojsonLayers[id];
    const numId = parseInt(id);
    if (numId === barangayId) {
      layer.setStyle(BOUNDARY_STYLE_SELECTED);
      layer.bringToFront();
    } else {
      layer.setStyle(BOUNDARY_STYLE_DIMMED);
    }
  });

  // Filter facility markers to only show markers inside this barangay
  State.allFacilityMarkers.forEach(m => {
    const facility = ALL_FACILITIES.find(f => f.id === m.id);
    if (!facility) return;

    if (facility.barangay === barangay.name) {
      if (!State.map.hasLayer(m.marker)) m.marker.addTo(State.map);
    } else {
      if (State.map.hasLayer(m.marker)) State.map.removeLayer(m.marker);
    }
  });

  // Open info panel first, then wait for CSS transition before fitting bounds
  openBarangayInfoPanel(barangay);

  const selectedLayer = State.geojsonLayers[barangayId];
  if (selectedLayer) {
    // Wait for panel width transition (400ms) then re-measure and flyToBounds
    setTimeout(() => {
      State.map.invalidateSize({ animate: false });
      const bounds = selectedLayer.getBounds();
      State.map.flyToBounds(bounds, {
        padding: [60, 60],
        maxZoom: 16,
        duration: 1.0,
        easeLinearity: 0.4
      });
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

  // Play click sound
  AudioSynth.playClick();

  // Reset all boundary styles
  Object.keys(State.geojsonLayers).forEach(id => {
    State.geojsonLayers[id].setStyle(BOUNDARY_STYLE_NORMAL);
  });

  // Fly back to city center
  State.map.flyTo(MEYCAUAYAN_CENTER, MEYCAUAYAN_ZOOM, {
    duration: 1.0,
    easeLinearity: 0.4
  });

  // Show all facility markers
  showAllFacilityMarkers();

  // Close info panel
  closeInfoPanel();

  // Reset stat cell active states
  document.querySelectorAll('.stat-cell').forEach(el => el.classList.remove('active'));
}

/* ============================================================
   FACILITY MARKER VISIBILITY
   ============================================================ */
function showAllFacilityMarkers() {
  State.allFacilityMarkers.forEach(m => {
    if (!State.map.hasLayer(m.marker)) {
      m.marker.addTo(State.map);
    }
  });
}

function filterFacilities(type) {
  State.activeFilter = type;

  // Toggle stat cell active
  document.querySelectorAll('.stat-cell').forEach(el => el.classList.remove('active'));
  const statMap = {
    police:       'stat-police',
    fire:         'stat-fire',
    hospital:     'stat-hosp',
    healthCenter: 'stat-health'
  };
  if (statMap[type]) {
    document.getElementById(statMap[type])?.classList.add('active');
  }

  if (type === 'all') {
    showAllFacilityMarkers();
    return;
  }

  State.allFacilityMarkers.forEach(m => {
    if (m.type === type) {
      if (!State.map.hasLayer(m.marker)) m.marker.addTo(State.map);
    } else {
      if (State.map.hasLayer(m.marker))  State.map.removeLayer(m.marker);
    }
  });
}

/* ============================================================
   ZOOM TO FACILITY
   ============================================================ */
function zoomToFacility(facilityId) {
  const facility = ALL_FACILITIES.find(f => f.id === facilityId);
  if (!facility) return;

  State.map.flyTo([facility.lat, facility.lng], 17, { duration: 1.0 });

  // Find the marker and open its popup
  const entry = State.allFacilityMarkers.find(m => m.id === facilityId);
  if (entry) {
    if (!State.map.hasLayer(entry.marker)) entry.marker.addTo(State.map);
    entry.marker.openPopup();
  }

  openFacilityInfoPanel(facility);
}

/* ============================================================
   POPULATE NAVIGATION DROPDOWNS
   ============================================================ */
function populateDropdowns() {
  // Barangays
  const bDropdown = document.getElementById('dropdown-barangays');
  bDropdown.innerHTML = '';
  BARANGAYS_DATA.forEach((b, idx) => {
    const btn = document.createElement('button');
    btn.className = 'dropdown-item-custom';
    btn.setAttribute('data-index', String(idx + 1).padStart(2, '0'));
    btn.textContent = b.name;
    btn.addEventListener('click', () => {
      focusBarangay(b.id);
    });
    bDropdown.appendChild(btn);
  });

  // Police
  const pDropdown = document.getElementById('dropdown-police');
  pDropdown.innerHTML = '';
  FACILITIES_DATA.police.forEach(f => {
    const btn = document.createElement('button');
    btn.className = 'dropdown-item-custom';
    btn.textContent = f.name;
    btn.addEventListener('click', () => zoomToFacility(f.id));
    pDropdown.appendChild(btn);
  });

  // Fire
  const fireDropdown = document.getElementById('dropdown-fire');
  fireDropdown.innerHTML = '';
  FACILITIES_DATA.fire.forEach(f => {
    const btn = document.createElement('button');
    btn.className = 'dropdown-item-custom';
    btn.textContent = f.name;
    btn.addEventListener('click', () => zoomToFacility(f.id));
    fireDropdown.appendChild(btn);
  });

  // Hospitals
  const hospDropdown = document.getElementById('dropdown-hospitals');
  hospDropdown.innerHTML = '';
  FACILITIES_DATA.hospitals.forEach(f => {
    const btn = document.createElement('button');
    btn.className = 'dropdown-item-custom';
    btn.textContent = f.name;
    btn.addEventListener('click', () => zoomToFacility(f.id));
    hospDropdown.appendChild(btn);
  });

  // Health Centers
  const hcDropdown = document.getElementById('dropdown-health');
  hcDropdown.innerHTML = '';
  FACILITIES_DATA.healthCenters.forEach(f => {
    const btn = document.createElement('button');
    btn.className = 'dropdown-item-custom';
    btn.textContent = f.name;
    btn.addEventListener('click', () => zoomToFacility(f.id));
    hcDropdown.appendChild(btn);
  });
}

/* ============================================================
   POPULATE EMERGENCY HOTLINES MODAL
   ============================================================ */
function populateHotlinesModal() {
  const list = document.getElementById('hotlines-list');
  list.innerHTML = '';

  EMERGENCY_HOTLINES.forEach(h => {
    const nationalBadge = h.national
      ? `<div class="hotline-national">National: ${h.national}</div>`
      : '';
    list.innerHTML += `
      <div class="hotline-card">
        <div class="hotline-icon"><i class="${h.icon}"></i></div>
        <div style="flex:1;">
          <div class="hotline-category">${h.category}</div>
          <div class="hotline-name">${h.name}</div>
        </div>
        <div class="hotline-numbers">
          <div class="hotline-local">${h.hotline || '—'}</div>
          ${nationalBadge}
        </div>
      </div>
    `;
  });
}

/* ============================================================
   UPDATE STAT COUNTS
   ============================================================ */
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
    minZoom:    12,
    maxZoom:    19
  });

  // Light tile layer — CartoDB Positron (clean white government look)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains:  'abcd',
    maxZoom:     19
  }).addTo(State.map);

  State.map.zoomControl.setPosition('topright');

  // Real-time HUD coordinate & zoom tracking
  State.map.on('mousemove', (e) => {
    document.getElementById('hud-lat').textContent = e.latlng.lat.toFixed(6);
    document.getElementById('hud-lng').textContent = e.latlng.lng.toFixed(6);
  });

  State.map.on('zoomend', () => {
    document.getElementById('hud-zoom').textContent = State.map.getZoom();
  });

  // Render barangay GeoJSON boundaries
  BARANGAYS_DATA.forEach(barangay => {
    if (!barangay.geojson) return;
    if (isPlaceholderBoundary(barangay.geojson)) {
      console.warn(`Skipping placeholder boundary for barangay: ${barangay.name}`);
      return;
    }

    const layer = L.geoJSON(barangay.geojson, {
      style:       BOUNDARY_STYLE_NORMAL,
      onEachFeature: (feature, featureLayer) => {
        featureLayer.on('click', () => focusBarangay(barangay.id));

        featureLayer.on('mouseover', function() {
          if (State.selectedBarangayId !== barangay.id) {
            this.setStyle({ fillOpacity: 0.1, opacity: 0.85 });
          }
          this.bindTooltip(
            `<span style="font-family:var(--font-heading);font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#1a1a2e;">${barangay.name}</span>`,
            {
              permanent: false,
              direction: 'center',
              className: 'barangay-tooltip',
              sticky: true
            }
          ).openTooltip();
        });

        featureLayer.on('mouseout', function() {
          if (State.selectedBarangayId !== barangay.id) {
            this.setStyle(
              State.selectedBarangayId === null
                ? BOUNDARY_STYLE_NORMAL
                : BOUNDARY_STYLE_DIMMED
            );
          }
          this.closeTooltip();
        });
      }
    }).addTo(State.map);

    State.geojsonLayers[barangay.id] = layer;

    const barangayCenter = layer.getBounds().getCenter();
    const barangayMarker = L.marker([barangayCenter.lat, barangayCenter.lng], {
      icon: createMarkerIcon('barangay'),
      title: `${barangay.name} Barangay Hall`,
      zIndexOffset: 1000,
      riseOnHover: true,
      interactive: true,
      bubblingMouseEvents: true
    }).addTo(State.map);

    barangayMarker.bindTooltip(
      `<strong>${barangay.name} Hall</strong>`,
      { direction: 'top', offset: [0, -10], className: 'barangay-marker-tooltip' }
    );

    barangayMarker.bindPopup(
      `<div style="font-family:var(--font-body); font-size:13px; color:#fff;">
        <strong>${barangay.name} Hall</strong><br />
        Tap to view barangay details
      </div>`,
      { closeButton: false, className: 'barangay-popup' }
    );

    barangayMarker.on('click', () => {
      focusBarangay(barangay.id);
      barangayMarker.openPopup();
      barangayMarker.openTooltip();
    });
    State.barangayMarkers.push({ id: barangay.id, marker: barangayMarker });
  });

  // Render facility markers
  const markerGroups = [
    { list: FACILITIES_DATA.police,       type: 'police' },
    { list: FACILITIES_DATA.fire,         type: 'fire' },
    { list: FACILITIES_DATA.hospitals,    type: 'hospital' },
    { list: FACILITIES_DATA.healthCenters,type: 'healthCenter' },
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
  setTimeout(() => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
  }, 1000);
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
   AJAX DATA SOURCE FETCH & INIT ORCHESTRATION
   ============================================================ */
async function loadBackendDataAndInit() {
  try {
    // Attempt to load a local Meycauayan GeoJSON file (exported) and merge it
    let localMunicipalGeoJSON = null;
    try {
      localMunicipalGeoJSON = await fetchWithTimeout('data/meycauayan-barangays.geojson', 5000);
      if (localMunicipalGeoJSON && Array.isArray(localMunicipalGeoJSON.features)) {
        console.log('Loaded local Meycauayan GeoJSON:', localMunicipalGeoJSON.features.length, 'features');
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
      console.info('No local Meycauayan GeoJSON found or failed to load:', e.message);
    }

    const [resBrgys, resFacs, resHotlines, resAnnounces] = await Promise.all([
      fetchWithTimeout('api/barangays.php'),
      fetchWithTimeout('api/facilities.php'),
      fetchWithTimeout('api/hotlines.php'),
      fetchWithTimeout('api/announcements.php?active=1')
    ]);

    // 1. Merge barangay parameters from DB into the GeoJSON boundaries array,
    //    and update any placeholder geometry with real backend geojson when available.
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

    BARANGAYS_DATA.forEach(barangay => {
      if (barangay.geojson && isPlaceholderBoundary(barangay.geojson)) {
        console.warn(`Placeholder boundary removed for barangay: ${barangay.name}`);
        barangay.geojson = null;
      }
    });

    // 2. Overwrite facilities lists
    FACILITIES_DATA.police = resFacs.filter(f => f.type === 'police');
    FACILITIES_DATA.fire = resFacs.filter(f => f.type === 'fire');
    FACILITIES_DATA.hospitals = resFacs.filter(f => f.type === 'hospital');
    FACILITIES_DATA.healthCenters = resFacs.filter(f => f.type === 'healthCenter');

    ALL_FACILITIES.length = 0;
    ALL_FACILITIES.push(...resFacs);

    // 3. Overwrite hotlines
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

    // 4. Overwrite scrolling announcements

  } catch (err) {
    console.error('Error fetching backend data:', err);
  } finally {
    // Fire init routines once data is merged
    try {
      injectTooltipStyles();
      initMap();
      populateDropdowns();
      populateHotlinesModal();
      updateStatCounts();
    } catch (initErr) {
      console.error('Error during init routines:', initErr);
    } finally {
      hideLoadingOverlay();
    }
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
   BYZENTERRA GIS EXTENSIONS (SOUNDS & EXPORTER)
   ============================================================ */

const AudioSynth = {
  ctx: null,
  muted: false,
  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      this.ctx = new AudioContext();
    }
  },
  playClick() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      
      // Keep synthesized audio contexts active
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1300, this.ctx.currentTime + 0.06);
      
      gain.gain.setValueAtTime(0.015, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.06);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch (e) {
      console.warn('Audio click synth failed:', e);
    }
  }
};

function toggleSound() {
  AudioSynth.muted = !AudioSynth.muted;
  const btn = document.getElementById('btn-sound-toggle');
  if (btn) {
    if (AudioSynth.muted) {
      btn.classList.add('muted');
      btn.innerHTML = '<i class="fas fa-volume-mute"></i>';
    } else {
      btn.classList.remove('muted');
      btn.innerHTML = '<i class="fas fa-volume-up"></i>';
      // Play a confirmation sound
      AudioSynth.playClick();
    }
  }
}

function downloadBoundary(barangayName, format) {
  const barangay = BARANGAYS_DATA.find(b => b.name.toLowerCase() === barangayName.toLowerCase());
  if (!barangay || !barangay.geojson) {
    alert(`No boundary geometry loaded for ${barangayName}.`);
    return;
  }

  let content = '';
  let filename = `${barangay.name.toLowerCase().replace(/\s+/g, '-')}-boundary`;
  let mimeType = '';

  if (format === 'geojson') {
    // Generate clean GeoJSON
    const featureCollection = {
      type: "FeatureCollection",
      features: [barangay.geojson]
    };
    content = JSON.stringify(featureCollection, null, 2);
    filename += '.geojson';
    mimeType = 'application/json';
  } else if (format === 'kml') {
    // Convert GeoJSON to KML
    const coordinates = barangay.geojson.geometry.coordinates[0];
    const kmlCoords = coordinates.map(c => `${c[0]},${c[1]},0`).join(' ');
    
    content = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${barangay.name} Boundary</name>
    <description>Meycauayan City administrative boundary for Barangay ${barangay.name}</description>
    <Style id="neonGlow">
      <LineStyle>
        <color>ff66ff00</color>
        <width>3</width>
      </LineStyle>
      <PolyStyle>
        <color>1a66ff00</color>
      </PolyStyle>
    </Style>
    <Placemark>
      <name>${barangay.name}</name>
      <styleUrl>#neonGlow</styleUrl>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${kmlCoords}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;
    filename += '.kml';
    mimeType = 'application/vnd.google-earth.kml+xml';
  }

  // Trigger browser download
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

