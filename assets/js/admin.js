// admin.js — Meycauayan City Emergency Portal — Admin Dashboard Logic
'use strict';

let cachedBarangays = [];
let cachedFacilities = { police: [], fire: [], hospital: [], healthCenter: [] };
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
      document.getElementById('admin-username-display').textContent = data.username;
      document.getElementById('dash-last-updated').textContent = new Date().toLocaleString();
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
}

/* ============================================================
   DASHBOARD STATS
   ============================================================ */
function refreshDashboardStats() {
  document.getElementById('dash-barangay-count').textContent = cachedBarangays.length;
  document.getElementById('dash-police-count').textContent   = cachedFacilities.police.length;
  document.getElementById('dash-fire-count').textContent     = cachedFacilities.fire.length;
  document.getElementById('dash-hosp-count').textContent     = cachedFacilities.hospital.length;
  document.getElementById('dash-health-count').textContent   = cachedFacilities.healthCenter.length;

  document.getElementById('dash-last-updated').textContent = new Date().toLocaleString();
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
  const tbody = document.getElementById('barangay-tbody');
  if (!tbody) return;

  tbody.innerHTML = cachedBarangays.map(b => `
    <tr>
      <td style="font-weight:600; color: var(--clr-text-primary);">${b.name}</td>
      <td>${b.captain || '—'}</td>
      <td>${b.population ? b.population.toLocaleString() : 0}</td>
      <td>${b.area || '—'}</td>
      <td>${b.contact || '—'}</td>
      <td>
        <button class="btn-tbl" onclick="openBarangayModal(${b.id})" style="margin-right:4px;">
          <i class="fas fa-pen"></i> Edit
        </button>
      </td>
    </tr>
  `).join('');
}

/* ============================================================
   BARANGAY MODAL
   ============================================================ */
let barangayModal;

function openBarangayModal(barangayId) {
  document.getElementById('brgy-id').value = barangayId || '';
  document.getElementById('barangay-modal-label').textContent = barangayId ? 'Edit Barangay' : 'Add Barangay';

  if (barangayId) {
    const b = cachedBarangays.find(x => x.id === barangayId);
    if (b) {
      document.getElementById('brgy-name').value        = b.name;
      document.getElementById('brgy-captain').value     = b.captain || '';
      document.getElementById('brgy-population').value  = b.population || '';
      document.getElementById('brgy-contact').value     = b.contact || '';
      document.getElementById('brgy-description').value = b.description || '';
    }
  } else {
    document.getElementById('brgy-name').value        = '';
    document.getElementById('brgy-captain').value     = '';
    document.getElementById('brgy-population').value  = '';
    document.getElementById('brgy-contact').value     = '';
    document.getElementById('brgy-description').value = '';
  }

  barangayModal = barangayModal || new bootstrap.Modal(document.getElementById('barangay-modal'));
  barangayModal.show();
}

async function saveBarangay() {
  const id   = parseInt(document.getElementById('brgy-id').value);
  const name = document.getElementById('brgy-name').value.trim();
  const cap  = document.getElementById('brgy-captain').value.trim();
  const pop  = parseInt(document.getElementById('brgy-population').value) || 0;
  const con  = document.getElementById('brgy-contact').value.trim();
  const desc = document.getElementById('brgy-description').value.trim();

  if (!name) { showToast('Barangay name is required.', 'error'); return; }

  const payload = { id, name, captain: cap, population: pop, contact: con, description: desc };
  try {
    const res = await fetch('api/barangays.php', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      barangayModal.hide();
      showToast('Barangay saved successfully.', 'success');
      initAdminApp();
    } else {
      showToast(data.error || 'Failed to save.', 'error');
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
    healthCenter: 'health-tbody'
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
    hospital: 'Hospital',
    healthCenter: 'Health Center'
  };

  document.getElementById('fac-type').value = type;
  document.getElementById('fac-id').value   = facilityId || '';
  document.getElementById('facility-modal-label').textContent =
    facilityId ? `Edit ${typeLabels[type]}` : `Add ${typeLabels[type]}`;

  // Populate barangay select
  const brgySelect = document.getElementById('fac-barangay');
  brgySelect.innerHTML = `<option value="">Select Barangay</option>` +
    cachedBarangays.map(b => `<option value="${b.name}">${b.name}</option>`).join('');

  // Load existing data if editing
  if (facilityId) {
    const list = cachedFacilities[type] || [];
    const f = list.find(x => x.id === facilityId);

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

  facilityModal = facilityModal || new bootstrap.Modal(document.getElementById('facility-modal'));
  facilityModal.show();
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
   ANNOUNCEMENTS
   ============================================================ */
function renderAnnouncementsTable() {
  const tbody = document.getElementById('announcements-tbody');
  if (!tbody) return;

  if (cachedAnnouncements.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="color:var(--clr-text-muted); text-align:center; padding:20px;">No announcements saved.</td></tr>`;
    return;
  }

  tbody.innerHTML = cachedAnnouncements.map((ann, i) => `
    <tr>
      <td style="width:40px;">${i + 1}</td>
      <td style="color:var(--clr-text-secondary);">${ann.message}</td>
      <td>
        <button class="btn-tbl danger" onclick="deleteAnnouncement(${ann.id})">
          <i class="fas fa-trash"></i> Delete
        </button>
      </td>
    </tr>
  `).join('');
}

async function saveAnnouncement() {
  const text = document.getElementById('announcement-text').value.trim();
  if (!text) { showToast('Please enter an announcement message.', 'error'); return; }

  try {
    const res = await fetch('api/announcements.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      document.getElementById('announcement-text').value = '';
      showToast('Announcement saved.', 'success');
      initAdminApp();
    } else {
      showToast(data.error || 'Failed to save.', 'error');
    }
  } catch (err) {
    showToast('Server error: ' + err.message, 'error');
  }
}

async function deleteAnnouncement(id) {
  if (!confirm('Are you sure you want to delete this announcement?')) return;
  try {
    const res = await fetch('api/announcements.php', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Announcement deleted.', 'info');
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

    cachedFacilities = { police: [], fire: [], hospital: [], healthCenter: [] };
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
    document.getElementById('admin-username-display').textContent = username;
    document.getElementById('dash-last-updated').textContent = new Date().toLocaleString();
    initAdminApp();
  } else {
    document.getElementById('admin-app').style.display = 'none';
  }
});
