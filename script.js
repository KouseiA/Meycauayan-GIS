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
    <button class="btn-reset-view" onclick="resetMapView()">
      <i class="fas fa-arrow-left"></i>
      Back to Full Map
    </button>
  `;

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
  if (State.map) {
    setTimeout(() => State.map.invalidateSize(), 400);
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

  // Fly to the selected barangay bounds
  const selectedLayer = State.geojsonLayers[barangayId];
  if (selectedLayer) {
    const bounds = selectedLayer.getBounds();
    State.map.flyToBounds(bounds, {
      padding: [50, 50],
      maxZoom: 16,
      duration: 1.2,
      easeLinearity: 0.4
    });
  }

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

  // Open info panel with barangay details
  openBarangayInfoPanel(barangay);
}

/* ============================================================
   RESET MAP VIEW
   ============================================================ */
function resetMapView() {
  State.selectedBarangayId = null;
  State.activeFilter = 'all';

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
  BARANGAYS_DATA.forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'dropdown-item-custom';
    btn.textContent = b.name;
    btn.addEventListener('click', () => focusBarangay(b.id));
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
  document.getElementById('count-police').textContent = FACILITIES_DATA.police.length;
  document.getElementById('count-fire').textContent   = FACILITIES_DATA.fire.length;
  document.getElementById('count-hosp').textContent   = FACILITIES_DATA.hospitals.length;
  document.getElementById('count-health').textContent = FACILITIES_DATA.healthCenters.length;
}

/* ============================================================
   SEARCH
   ============================================================ */
function setupSearch() {
  const input   = document.getElementById('search-input');
  const results = document.getElementById('search-results');

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();

    if (query.length < 2) {
      results.style.display = 'none';
      return;
    }

    const matches = [];

    // Search barangays
    BARANGAYS_DATA.forEach(b => {
      if (b.name.toLowerCase().includes(query) || (b.captain && b.captain.toLowerCase().includes(query))) {
        matches.push({
          type:    'barangay',
          icon:    'fas fa-map',
          name:    b.name,
          meta:    `Barangay · Pop: ${b.population ? b.population.toLocaleString() : 0}`,
          action:  () => focusBarangay(b.id)
        });
      }
    });

    // Search facilities
    ALL_FACILITIES.forEach(f => {
      if (
        f.name.toLowerCase().includes(query) ||
        (f.address && f.address.toLowerCase().includes(query)) ||
        (f.barangay && f.barangay.toLowerCase().includes(query))
      ) {
        const iconMap = {
          police:       'fas fa-shield-halved',
          fire:         'fas fa-fire',
          hospital:     'fas fa-hospital',
          healthCenter: 'fas fa-kit-medical'
        };
        const meta = {
          police:       'Police Station',
          fire:         'Fire Station',
          hospital:     'Hospital',
          healthCenter: 'Health Center'
        };
        matches.push({
          type:    f.type,
          icon:    iconMap[f.type],
          name:    f.name,
          meta:    `${meta[f.type]} · Brgy. ${f.barangay || '—'}`,
          action:  () => zoomToFacility(f.id)
        });
      }
    });

    if (matches.length === 0) {
      results.style.display = 'none';
      return;
    }

    results.innerHTML = matches.slice(0, 8).map(m => `
      <div class="search-result-item" tabindex="0" data-type="${m.type}">
        <div class="search-result-icon type-${m.type}">
          <i class="${m.icon}"></i>
        </div>
        <div class="search-result-text">
          <div class="search-result-name">${m.name}</div>
          <div class="search-result-meta">${m.meta}</div>
        </div>
      </div>
    `).join('');

    // Attach click handlers
    results.querySelectorAll('.search-result-item').forEach((el, idx) => {
      el.addEventListener('click', () => {
        matches[idx].action();
        input.value = '';
        results.style.display = 'none';
      });
    });

    results.style.display = 'block';
  });

  // Hide on outside click
  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !results.contains(e.target)) {
      results.style.display = 'none';
    }
  });

  // Keyboard: Escape
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      results.style.display = 'none';
      input.blur();
    }
  });
}

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

  // Render barangay GeoJSON boundaries
  BARANGAYS_DATA.forEach(barangay => {
    if (!barangay.geojson) return;
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

/* ============================================================
   AJAX DATA SOURCE FETCH & INIT ORCHESTRATION
   ============================================================ */
async function loadBackendDataAndInit() {
  try {
    const [resBrgys, resFacs, resHotlines, resAnnounces] = await Promise.all([
      fetch('api/barangays.php').then(r => r.json()),
      fetch('api/facilities.php').then(r => r.json()),
      fetch('api/hotlines.php').then(r => r.json()),
      fetch('api/announcements.php?active=1').then(r => r.json())
    ]);

    // 1. Merge barangay parameters from DB into the GeoJSON boundaries array
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
    injectTooltipStyles();
    initMap();
    populateDropdowns();
    populateHotlinesModal();
    updateStatCounts();
    setupSearch();
    hideLoadingOverlay();
  }
}

/* ============================================================
   INIT ROUTINE ENTRY
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  loadBackendDataAndInit();
});
