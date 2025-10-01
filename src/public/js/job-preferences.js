// const API = '/api/job-preferences';

// function authHeaders() {
//   const token = localStorage.getItem('token');
//   return token ? { Authorization: `Bearer ${token}` } : {};
// }

// function splitCSV(value) {
//   return value.split(',').map(s => s.trim()).filter(Boolean);
// }

// const form = document.getElementById('prefForm');
// const resetBtn = document.getElementById('resetBtn');
// const tableBody = document.getElementById('prefsBody');
// const selectAll = document.getElementById('selectAll');
// const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

// function fillForm(pref) {
//   document.getElementById('prefId').value = pref?._id || '';
//   document.getElementById('preferredLocation').value = pref?.preferredLocation || '';
//   document.getElementById('preferredCategories').value = (pref?.preferredCategories || []).join(', ');
//   M.updateTextFields && M.updateTextFields();
// }

// function clearForm() { fillForm(null); }

// async function fetchPrefs() {
//   const res = await fetch(API, { headers: { ...authHeaders() } });
//   if (res.status === 401) return alert('Please login first.');
//   const data = await res.json();
//   renderRows(data);
// }

// function renderRows(prefs) {
//   tableBody.innerHTML = '';
//   prefs.forEach(p => {
//     const tr = document.createElement('tr');
//     tr.innerHTML = `
//       <td>
//         <label>
//           <input type="checkbox" class="row-check" data-id="${p._id}"/>
//           <span></span>
//         </label>
//       </td>
//       <td>${p.preferredLocation}</td>
//       <td>${(p.preferredCategories || []).join(', ')}</td>
//       <td>
//         <a class="btn-small blue lighten-1 edit-btn" data-id="${p._id}">Edit</a>
//         <a class="btn-small red lighten-1 delete-btn" data-id="${p._id}">Delete</a>
//       </td>
//     `;
//     tableBody.appendChild(tr);
//   });

//   document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', onEdit));
//   document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', onDelete));
// }

// async function onEdit(e) {
//   const id = e.target.dataset.id;
//   const res = await fetch(API, { headers: { ...authHeaders() } });
//   const prefs = await res.json();
//   const pref = prefs.find(p => p._id === id);
//   fillForm(pref);
//   window.scrollTo({ top: 0, behavior: 'smooth' });
// }

// async function onDelete(e) {
//   const id = e.target.dataset.id;
//   if (!confirm('Delete this preference?')) return;
//   await fetch(`${API}/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...authHeaders() } });
//   await fetchPrefs();
// }

// form.addEventListener('submit', async (e) => {
//   e.preventDefault();
//   const payload = {
//     preferredLocation: document.getElementById('preferredLocation').value.trim(),
//     preferredCategories: splitCSV(document.getElementById('preferredCategories').value),
//   };

//   const prefId = document.getElementById('prefId').value;
//   const isEdit = Boolean(prefId);

//   const res = await fetch(isEdit ? `${API}/${prefId}` : API, {
//     method: isEdit ? 'PUT' : 'POST',
//     headers: { 'Content-Type': 'application/json', ...authHeaders() },
//     body: JSON.stringify(payload)
//   });

//   if (!res.ok) {
//     const err = await res.json().catch(() => ({}));
//     alert(err.message || 'Request failed');
//     return;
//   }

//   clearForm();
//   await fetchPrefs();
// });

// resetBtn.addEventListener('click', (e) => {
//   e.preventDefault();
//   clearForm();
// });

// selectAll.addEventListener('change', () => {
//   document.querySelectorAll('.row-check').forEach(cb => cb.checked = selectAll.checked);
// });

// bulkDeleteBtn.addEventListener('click', async () => {
//   const ids = Array.from(document.querySelectorAll('.row-check'))
//     .filter(cb => cb.checked)
//     .map(cb => cb.dataset.id);

//   if (!ids.length) return alert('No rows selected.');
//   if (!confirm(`Delete ${ids.length} selected preference(s)?`)) return;

//   await fetch(API, {
//     method: 'DELETE',
//     headers: { 'Content-Type': 'application/json', ...authHeaders() },
//     body: JSON.stringify({ ids })
//   });

//   selectAll.checked = false;
//   await fetchPrefs();
// });

// // init
// fetchPrefs().catch(err => alert(err.message || 'Failed to load'));
// /public/js/job-preferences.js

(() => {
  const API_BASE = '/api/job-preferences';
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const els = {
    form: $('#prefForm'),
    prefId: $('#prefId'),
    preferredLocation: $('#preferredLocation'),
    preferredCategories: $('#preferredCategories'),
    resetBtn: $('#resetBtn'),
    selectAll: $('#selectAll'),
    bulkDeleteBtn: $('#bulkDeleteBtn'),
    prefsBody: $('#prefsBody')
  };

  // Inject a light "Refresh" button next to Delete Selected (no design change)
  if (!$('#refreshBtn') && els.bulkDeleteBtn) {
    els.bulkDeleteBtn.insertAdjacentHTML(
      'beforebegin',
      '<a id="refreshBtn" class="btn-flat waves-effect" style="margin-left:10px;">Refresh</a>'
    );
  }
  const refreshBtn = $('#refreshBtn');

  // Materialize toast helper (fallback to alert if unavailable)
  const toast = (msg) => {
    if (window.M && M.toast) M.toast({ html: msg });
    else alert(msg);
  };

  const token = localStorage.getItem('token');
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  });

  const handleAuth = (res) => {
    if (res.status === 401) {
      toast('Session expired. Please log in again.');
      window.location.href = '/';
      return false;
    }
    return true;
  };

  const escapeHTML = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  // --- API calls ---
  async function apiList() {
    const res = await fetch(API_BASE, { headers: authHeaders() });
    if (!handleAuth(res)) return [];
    if (!res.ok) throw new Error('Failed to load preferences');
    return res.json();
  }

  async function apiCreate(body) {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body)
    });
    if (!handleAuth(res)) return null;
    if (!res.ok) {
      const j = await safeJson(res);
      throw new Error(j?.message || 'Failed to create preference');
    }
    return res.json();
  }

  async function apiUpdate(id, body) {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(body)
    });
    if (!handleAuth(res)) return null;
    if (!res.ok) {
      const j = await safeJson(res);
      throw new Error(j?.message || 'Failed to update preference');
    }
    return res.json();
  }

  async function apiDeleteOne(id) {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!handleAuth(res)) return null;
    if (!res.ok) {
      const j = await safeJson(res);
      throw new Error(j?.message || 'Failed to delete preference');
    }
    return res.json();
  }

  async function apiBulkDelete(ids) {
    const res = await fetch(API_BASE, {
      method: 'DELETE',
      headers: authHeaders(),
      body: JSON.stringify({ ids })
    });
    if (!handleAuth(res)) return null;
    if (!res.ok) {
      const j = await safeJson(res);
      throw new Error(j?.message || 'Failed to bulk delete');
    }
    return res.json();
  }

  async function safeJson(res) {
    try { return await res.json(); } catch { return null; }
  }

  // --- Render ---
  function renderRows(prefs) {
    els.prefsBody.innerHTML = prefs.map((p) => {
      const cats = Array.isArray(p.preferredCategories) ? p.preferredCategories.join(', ') : '';
      return `
        <tr data-id="${escapeHTML(p._id)}">
          <td style="width:48px;">
            <label>
              <input type="checkbox" class="row-check" data-id="${escapeHTML(p._id)}"/>
              <span></span>
            </label>
          </td>
          <td>${escapeHTML(p.preferredLocation)}</td>
          <td>${escapeHTML(cats)}</td>
          <td>
            <a class="btn-small waves-effect edit-btn" title="Edit">
              <i class="material-icons left">edit</i>Edit
            </a>
            <a class="btn-small red lighten-1 waves-effect delete-btn" title="Delete" style="margin-left:6px;">
              <i class="material-icons left">delete</i>Delete
            </a>
          </td>
        </tr>
      `;
    }).join('');
  }

  // --- Load + refresh ---
  async function loadPrefs() {
    try {
      const data = await apiList();
      renderRows(data);
      els.selectAll.checked = false;
    } catch (err) {
      toast(err.message || 'Failed to load preferences');
    }
  }

  // --- Form helpers ---
  function parseCategories(input) {
    const raw = String(input || '').trim();
    if (!raw) return [];
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }

  function resetForm() {
    els.prefId.value = '';
    els.preferredLocation.value = '';
    els.preferredCategories.value = '';
    if (window.M && M.updateTextFields) M.updateTextFields();
  }

  // --- Events ---
  // Submit (create or update)
  els.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = els.prefId.value.trim();
    const body = {
      preferredLocation: els.preferredLocation.value.trim(),
      preferredCategories: parseCategories(els.preferredCategories.value)
    };
    if (!body.preferredLocation) {
      toast('Preferred Location is required');
      return;
    }
    try {
      if (id) {
        await apiUpdate(id, body);
        toast('Preference updated');
      } else {
        await apiCreate(body);
        toast('Preference created');
      }
      resetForm();
      await loadPrefs();
    } catch (err) {
      toast(err.message || 'Save failed');
    }
  });

  // Clear button
  els.resetBtn.addEventListener('click', (e) => {
    e.preventDefault();
    resetForm();
  });

  // Refresh button
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await loadPrefs();
      toast('Refreshed');
    });
  }

  // Select all
  els.selectAll.addEventListener('change', () => {
    $$('#prefsBody .row-check').forEach(cb => { cb.checked = els.selectAll.checked; });
  });

  // Bulk delete
  els.bulkDeleteBtn.addEventListener('click', async () => {
    const ids = $$('#prefsBody .row-check:checked').map(cb => cb.getAttribute('data-id'));
    if (ids.length === 0) {
      toast('Select at least one row');
      return;
    }
    if (!confirm(`Delete ${ids.length} selected item(s)?`)) return;
    try {
      const { removed } = await apiBulkDelete(ids);
      toast(`Deleted ${removed || 0}`);
      await loadPrefs();
    } catch (err) {
      toast(err.message || 'Bulk delete failed');
    }
  });

  // Row actions (edit / delete) via delegation
  els.prefsBody.addEventListener('click', async (e) => {
    const row = e.target.closest('tr[data-id]');
    if (!row) return;
    const id = row.getAttribute('data-id');

    // Edit
    if (e.target.closest('.edit-btn')) {
      const tds = row.querySelectorAll('td');
      const loc = tds[1].textContent.trim();
      const cats = tds[2].textContent.trim();

      els.prefId.value = id;
      els.preferredLocation.value = loc;
      els.preferredCategories.value = cats;
      if (window.M && M.updateTextFields) M.updateTextFields();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Delete one
    if (e.target.closest('.delete-btn')) {
      if (!confirm('Delete this preference?')) return;
      try {
        await apiDeleteOne(id);
        toast('Deleted');
        await loadPrefs();
      } catch (err) {
        toast(err.message || 'Delete failed');
      }
    }
  });

  // Guard for missing token
  if (!token) {
    window.location.href = '/';
    return;
  }

  // Init
  document.addEventListener('DOMContentLoaded', loadPrefs);
  // In case this file loads after DOMContentLoaded
  if (document.readyState !== 'loading') loadPrefs();
})();
