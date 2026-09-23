/**
 * MEYCMAP — Emergency Services Mapping System
 * OPTION 3: Live Triage Dispatch Logic
 * Real-time GPS distance math, 26-barangay selector, and instant hotline search
 */

'use strict';

// 26 Administrative Barangays Centroid Coordinates
const BARANGAYS = [
  { id: 1, name: "Bagbaguin", lat: 14.75985, lng: 121.00391 },
  { id: 2, name: "Bancal", lat: 14.72586, lng: 120.95824 },
  { id: 3, name: "Banga", lat: 14.72762, lng: 120.96107 },
  { id: 4, name: "Bayugo", lat: 14.73394, lng: 120.95270 },
  { id: 5, name: "Calvario", lat: 14.73510, lng: 120.95962 },
  { id: 6, name: "Camalig", lat: 14.77175, lng: 120.99321 },
  { id: 7, name: "Hulo", lat: 14.73124, lng: 120.95790 },
  { id: 8, name: "Langka", lat: 14.73837, lng: 120.97923 },
  { id: 9, name: "Libtong", lat: 14.74649, lng: 120.98173 },
  { id: 10, name: "Liputan", lat: 14.74273, lng: 120.93117 },
  { id: 11, name: "Malhacan", lat: 14.74107, lng: 120.96979 },
  { id: 12, name: "Pajo", lat: 14.77481, lng: 121.00746 },
  { id: 13, name: "Pandayan", lat: 14.75366, lng: 120.96635 },
  { id: 14, name: "Perez", lat: 14.76292, lng: 120.99897 },
  { id: 15, name: "Poblacion", lat: 14.73570, lng: 120.95732 },
  { id: 16, name: "Saluysoy", lat: 14.74319, lng: 120.95231 },
  { id: 17, name: "Gasak", lat: 14.73398, lng: 120.95667 },
  { id: 18, name: "Iba", lat: 14.75647, lng: 120.98076 },
  { id: 19, name: "Lawa", lat: 14.72895, lng: 120.97269 },
  { id: 20, name: "Caingin", lat: 14.72822, lng: 120.96950 },
  { id: 21, name: "Tugatog", lat: 14.72624, lng: 120.96477 },
  { id: 22, name: "Pantoc", lat: 14.76259, lng: 120.98370 },
  { id: 23, name: "Bahay Pare", lat: 14.76953, lng: 121.01380 },
  { id: 24, name: "Longos", lat: 14.73674, lng: 120.94809 },
  { id: 25, name: "Ubihan", lat: 14.75642, lng: 120.91907 },
  { id: 26, name: "Zamora", lat: 14.73670, lng: 120.95512 }
].sort((a, b) => a.name.localeCompare(b.name));

// Key Emergency Facilities
const KEY_FACILITIES = {
  hospitals: [
    { id: "hosp-001", name: "Ospital ng Meycauayan", lat: 14.73430, lng: 120.96860, address: "Poblacion, Meycauayan City", tel: "0448403001" },
    { id: "hosp-002", name: "Meycauayan District Hospital", lat: 14.76292, lng: 120.99897, address: "Perez Road, Brgy. Perez", tel: "0448403002" },
    { id: "hosp-003", name: "Meycauayan Doctors Hospital", lat: 14.73850, lng: 120.96410, address: "MacArthur Hwy, Calvario", tel: "0448152500" },
    { id: "hosp-004", name: "Mary Mount Hospital", lat: 14.77120, lng: 120.99450, address: "Camalig Road, Camalig", tel: "0447696279" }
  ],
  fire: [
    { id: "fire-001", name: "BFP Central Fire Station", lat: 14.73620, lng: 120.96280, address: "Malhacan Road, Meycauayan", tel: "0443202222" },
    { id: "fire-002", name: "BFP Substation (Perez)", lat: 14.76210, lng: 120.99750, address: "Brgy. Perez, Meycauayan", tel: "0443202222" },
    { id: "fire-003", name: "BFP Substation (Bancal)", lat: 14.72640, lng: 120.95780, address: "Brgy. Bancal, Meycauayan", tel: "0443202222" }
  ],
  police: [
    { id: "pol-001", name: "Meycauayan City Police Station", lat: 14.73464, lng: 120.95816, address: "Hulo-Banga Road, Poblacion", tel: "0447693393" },
    { id: "pol-002", name: "Police Community Precinct 1", lat: 14.73510, lng: 120.95962, address: "Brgy. Calvario", tel: "0447693393" },
    { id: "pol-003", name: "Police Community Precinct 2", lat: 14.75985, lng: 121.00391, address: "Brgy. Bagbaguin", tel: "0447693393" },
    { id: "pol-004", name: "Police Community Precinct 3", lat: 14.72895, lng: 120.97269, address: "Brgy. Lawa", tel: "0447693393" }
  ]
};

document.addEventListener('DOMContentLoaded', () => {
  initBarangayDropdown();
  initTriageListeners();
  initHotlineSearch();
  initMetricCounters();
  initSmoothScroll();
});

/**
 * Haversine formula to calculate accurate distance between two lat/lng pairs in kilometers
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distKm) {
  if (distKm < 1) {
    return `${Math.round(distKm * 1000)} m`;
  }
  return `${distKm.toFixed(1)} km`;
}

function estimateDriveTime(distKm) {
  // Average urban emergency speed ~30 km/h in Bulacan
  const mins = Math.max(1, Math.round((distKm / 30) * 60));
  return `~${mins} min${mins > 1 ? 's' : ''}`;
}

/**
 * Populate the 26-barangay dropdown
 */
function initBarangayDropdown() {
  const select = document.getElementById('triage-barangay-select');
  if (!select) return;

  BARANGAYS.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.name;
    opt.textContent = `Brgy. ${b.name}`;
    select.appendChild(opt);
  });
}

/**
 * Initialize Triage interactions
 */
function initTriageListeners() {
  const select = document.getElementById('triage-barangay-select');
  const gpsBtn = document.getElementById('btn-detect-gps');

  if (select) {
    select.addEventListener('change', () => {
      const selectedName = select.value;
      if (!selectedName) return;

      const found = BARANGAYS.find(b => b.name === selectedName);
      if (found) {
        updateTriageResults(found.lat, found.lng, `Brgy. ${found.name}`);
      }
    });
  }

  if (gpsBtn) {
    gpsBtn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser. Please select your barangay from the dropdown.');
        return;
      }

      gpsBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>Detecting GPS...</span>`;
      gpsBtn.disabled = true;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          gpsBtn.innerHTML = `<i class="fas fa-circle-check text-emerald"></i> <span>GPS Located!</span>`;
          gpsBtn.disabled = false;

          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          updateTriageResults(lat, lng, 'Your Exact GPS Coordinates');

          // Reset button text after 3 seconds
          setTimeout(() => {
            gpsBtn.innerHTML = `<i class="fas fa-location-crosshairs"></i> <span>Use My Live GPS</span>`;
          }, 3000);
        },
        (err) => {
          console.warn('Geolocation error:', err);
          gpsBtn.innerHTML = `<i class="fas fa-triangle-exclamation text-amber"></i> <span>GPS Unavailable</span>`;
          gpsBtn.disabled = false;
          alert('Could not access device location. Please pick your barangay from the dropdown.');
          setTimeout(() => {
            gpsBtn.innerHTML = `<i class="fas fa-location-crosshairs"></i> <span>Use My Live GPS</span>`;
          }, 3000);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }
}

/**
 * Recompute nearest facilities and update the triage display cards
 */
function updateTriageResults(userLat, userLng, locationLabel) {
  // Update status banner
  const bannerText = document.getElementById('triage-status-text');
  if (bannerText) {
    bannerText.innerHTML = `Displaying nearest stations from <strong>${escapeHtml(locationLabel)}</strong>.`;
  }

  // 1. Closest Hospital
  const nearestHosp = findNearest(userLat, userLng, KEY_FACILITIES.hospitals);
  if (nearestHosp) {
    setTriageCard('hosp', nearestHosp, 'hospital');
  }

  // 2. Closest Fire Station
  const nearestFire = findNearest(userLat, userLng, KEY_FACILITIES.fire);
  if (nearestFire) {
    setTriageCard('fire', nearestFire, 'fire');
  }

  // 3. Closest Police Station
  const nearestPolice = findNearest(userLat, userLng, KEY_FACILITIES.police);
  if (nearestPolice) {
    setTriageCard('police', nearestPolice, 'police');
  }
}

function findNearest(userLat, userLng, list) {
  let closest = null;
  let minDistance = Infinity;

  list.forEach(item => {
    const dist = calculateDistanceKm(userLat, userLng, item.lat, item.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = { ...item, distanceKm: dist };
    }
  });

  return closest;
}

function setTriageCard(prefix, item, typeParam) {
  const nameEl = document.getElementById(`triage-${prefix}-name`);
  const addrEl = document.getElementById(`triage-${prefix}-addr`);
  const distEl = document.getElementById(`triage-${prefix}-dist`);
  const timeEl = document.getElementById(`triage-${prefix}-time`);
  const callEl = document.getElementById(`triage-${prefix}-call`);
  const mapEl  = document.getElementById(`triage-${prefix}-map`);

  if (nameEl) nameEl.textContent = item.name;
  if (addrEl) addrEl.textContent = item.address;
  if (distEl) distEl.textContent = formatDistance(item.distanceKm);
  if (timeEl) timeEl.textContent = estimateDriveTime(item.distanceKm);
  if (callEl) callEl.href = `tel:${item.tel}`;
  if (mapEl) mapEl.href = `index.html?type=${typeParam}`;

  // Pulse animation on the card
  const card = document.getElementById(`triage-card-${prefix}`);
  if (card) {
    card.style.transform = 'scale(0.98)';
    setTimeout(() => {
      card.style.transform = '';
    }, 150);
  }
}

/**
 * Real-Time Hotline Directory Search Filter
 */
function initHotlineSearch() {
  const input = document.getElementById('hotline-search');
  const cards = document.querySelectorAll('.hotline-card');
  const counter = document.getElementById('hotline-counter');
  if (!input || !cards.length) return;

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    let visibleCount = 0;

    cards.forEach(card => {
      const keywords = (card.getAttribute('data-keywords') || '').toLowerCase();
      const text = card.textContent.toLowerCase();

      if (!q || keywords.includes(q) || text.includes(q)) {
        card.style.display = 'flex';
        card.style.opacity = '1';
        visibleCount++;
      } else {
        card.style.display = 'none';
        card.style.opacity = '0';
      }
    });

    if (counter) {
      counter.textContent = `${visibleCount} Line${visibleCount !== 1 ? 's' : ''}`;
    }
  });
}

/**
 * Animated metric counters when scrolled into view
 */
function initMetricCounters() {
  const metricElements = document.querySelectorAll('.metric-number[data-target]');
  if (!metricElements.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-target'), 10);
        const prefix = el.getAttribute('data-prefix') || '';
        const suffix = el.getAttribute('data-suffix') || '';
        animateValue(el, 0, target, 1200, prefix, suffix);
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.3 });

  metricElements.forEach(el => observer.observe(el));
}

function animateValue(obj, start, end, duration, prefix = '', suffix = '') {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentVal = Math.floor(easeProgress * (end - start) + start);
    obj.textContent = `${prefix}${currentVal}${suffix}`;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      obj.textContent = `${prefix}${end}${suffix}`;
    }
  };
  window.requestAnimationFrame(step);
}

/**
 * Smooth anchor scrolling
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '') return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const headerOffset = 60;
        const elementPosition = targetEl.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
