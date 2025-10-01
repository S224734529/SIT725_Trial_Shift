(function(){
  const qs = (s) => document.querySelector(s);
  const parseJwt = token => { try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; } };

  const homeSection = qs("#courses-home");
  const manageSection = qs("#courses-manage");
  const addSection = qs("#courses-add");
  const editSection = qs("#courses-edit");
  const detailsSection = qs("#course-details");
  const pillList = qs("#courses-pills");
  const btnManage = qs("#btnManageCourses");
  const btnAdd = qs("#btnAddCourse");
  const btnCancelAdd = qs("#btnCancelAdd");
  const btnSaveAdd = qs("#btnSaveAdd");
  const addTitle = qs("#addTitle");
  const addCategory = qs("#addCategory");
  const addRole = qs("#addRole");
  const addCourseContent = qs("#addCourseContent");
  const addQuizReq = qs("#addQuizReq");
  const addError = qs("#addError");
  const addSuccess = qs("#addSuccess");
  const filterCategory = qs("#filterCategory");
  const filterRole = qs("#filterRole");
  const manageList = qs("#manage-list");
  const managePager = qs("#manage-pagination");
  const coursesError = qs("#courses-error");
  const coursesEmpty = qs("#courses-empty");

  const bulkActions = qs("#bulk-actions");
  const selectedCount = qs("#selected-count");
  const btnDeleteSelected = qs("#btnDeleteSelected");
  const btnArchiveSelected = qs("#btnArchiveSelected");
  const btnCancelBulk = qs("#btnCancelBulk");

  const API = "/api/courses";
  let state = {
    all: [],
    page: 1,
    limit: 5,
    homePage: 1,
    category: "",
    role: "",
    selectedCourses: [],
  };

  // Auth header
  function authHeader(){
    const t = localStorage.getItem("token");
    return t ? { Authorization: `Bearer ${t}` } : {};
  }
  // Role check
  function isAdmin() {
    try {
      const tok = localStorage.getItem("token");
      const payload = JSON.parse(atob((tok||"").split(".")[1]));
      return payload.role === "admin";
    } catch { return false; }
  }

  // View switching
  function setView(name, data) {
    homeSection && (homeSection.style.display = name === "home" ? "grid" : "none");
    manageSection && (manageSection.style.display = name === "manage" ? "grid" : "none");
    addSection && (addSection.style.display = name === "add" ? "grid" : "none");

    const editEl = qs("#courses-edit");
    const detailsEl = qs("#course-details");
    editEl && (editEl.style.display = name === "edit" ? "grid" : "none");
    detailsEl && (detailsEl.style.display = name === "details" ? "grid" : "none");
    if(name==="edit" && data) renderEditView(data);
    if(name==="details" && data) renderDetailsView(data);
    if (pillList) pillList.style.display = (name==="home") ? "flex" : "none";
    if (btnManage) {
      btnManage.style.display = isAdmin() ? "inline-flex" : "none";
    }
  }

  // Fetch modules
  async function fetchModules(){
    const url = new URL(`${API}/modules`, window.location.origin);
    url.searchParams.set("page", "1");
    url.searchParams.set("limit", "100");
    const res = await fetch(url, { headers:{...authHeader()} });
    if(!res.ok) throw new Error(`modules fetch failed (${res.status})`);
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.items || data.modules || []);
    state.all = items.map(m => ({
      id: m.id || m._id,
      title: m.title || "(Untitled)",
      category: m.category || "",
      role: m.role || "",
      visibility: m.visibility || "public",
      createdAt: m.createdAt || "",
      description: m.description || "",
      assets: m.assets || [],
      isArchived: !!m.isArchived
    }));
  }

  // Render home
  function renderHome(){
    const list = state.all.filter(m => !m.isArchived);
    coursesEmpty && (coursesEmpty.style.display = list.length ? "none" : "block");
    if (!pillList) return;

    pillList.innerHTML = list
      .map(p => `<div class="pill" data-id="${p.id}">${escapeHtml(p.title)}</div>`)
      .join("");

    pillList.querySelectorAll('.pill').forEach(el => {
      el.addEventListener('click', function(){
        const id = this.getAttribute('data-id');
        setView("details", id);
      });
    });


    const homePager = document.getElementById("courses-home-pagination");
    if (homePager) homePager.remove();
  }

  // Render manage
  function renderManage(){
    const filtered = state.all.filter(m =>
      (!state.category || m.category===state.category) &&
      (!state.role || m.role===state.role)
    );
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / state.limit));
    if(state.page > pages) state.page = pages;
    const start = (state.page-1)*state.limit;
    const pageItems = filtered.slice(start, start + state.limit);
    manageList.innerHTML = pageItems.map(m=>`
      <div class="manage-item" data-id="${m.id}">
        <input type="checkbox" class="course-checkbox" data-id="${m.id}" />
        <div class="manage-title">${escapeHtml(m.title)} ${m.isArchived ? '<span class="muted">(Archived)</span>' : ''}</div>
        <div class="manage-actions">
          <button class="icon-btn js-edit" title="Edit"><i class="material-icons">edit</i></button>
          <button class="icon-btn js-archive" title="${m.isArchived ? 'Unarchive' : 'Archive'}"><i class="material-icons">${m.isArchived ? 'unarchive' : 'archive'}</i></button>
          <button class="icon-btn js-delete" title="Delete"><i class="material-icons">delete_forever</i></button>
        </div>
      </div>
    `).join("");
    let html = "";
    for(let i=1;i<=pages;i++){
      html += `<button class="page-btn ${i===state.page?'active':''}" data-page="${i}" style="display:inline-block;">${i}</button>`;
    }
    managePager.innerHTML = html;
    managePager.style.display = "flex";
    managePager.querySelectorAll(".page-btn").forEach(b=>{
      b.addEventListener("click", ()=>{
        state.page = Number(b.dataset.page);
        renderManage();
      });
    });
    manageList.querySelectorAll(".js-archive").forEach(btn=>{
      btn.addEventListener("click", ()=> onArchive(btn.closest(".manage-item").dataset.id));
    });
    manageList.querySelectorAll(".js-delete").forEach(btn=>{
      btn.addEventListener("click", ()=> onDelete(btn.closest(".manage-item").dataset.id));
    });
    manageList.querySelectorAll(".js-edit").forEach(btn=>{
      btn.addEventListener("click", ()=> onEdit(btn.closest(".manage-item").dataset.id));
    });

    manageList.querySelectorAll(".course-checkbox").forEach(checkbox => {
      checkbox.addEventListener("change", () => handleCheckboxChange());
    });
  }

  // Bulk selection
  function handleCheckboxChange() {
    state.selectedCourses = Array.from(manageList.querySelectorAll(".course-checkbox:checked")).map(cb => cb.dataset.id);
    if (state.selectedCourses.length > 0) {
      bulkActions.style.display = "flex";
      selectedCount.textContent = `${state.selectedCourses.length} selected`;
      if (btnArchiveSelected) {
        const selected = state.selectedCourses
          .map(id => state.all.find(c => String(c.id) === String(id)))
          .filter(Boolean);
        const allArchived = selected.length > 0 && selected.every(c => c.isArchived);
        if (allArchived) {
          btnArchiveSelected.textContent = "Unarchive all";
          btnArchiveSelected.onclick = () => onBulkArchive(false);
        } else {
          btnArchiveSelected.textContent = "Archive all";
          btnArchiveSelected.onclick = () => onBulkArchive(true);
        }
      }
    } else {
      bulkActions.style.display = "none";
    }
  }

  // Bulk delete
  async function onBulkDelete() {
    if (state.selectedCourses.length === 0) {
      return alert("No courses selected for deletion.");
    }
    if (!confirm(`Are you sure you want to delete ${state.selectedCourses.length} courses?`)) {
      return;
    }
    try {
      const res = await fetch(`${API}/modules/bulk-delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ ids: state.selectedCourses }),
      });
      if (!res.ok) {
        throw new Error("Bulk delete failed");
      }
      await loadAll();
      state.selectedCourses = [];
      handleCheckboxChange();
    } catch (error) {
      console.error("Bulk delete error:", error);
      alert("Failed to delete courses. Please try again.");
    }
  }


  // Save add
  async function onSave(){
    addError.style.display = "none"; addSuccess.style.display = "none";
    const title = addTitle.value.trim();
    const category = addCategory.value.trim();
    const role = addRole.value.trim();
    const content = addCourseContent.value.trim();
    if(!title || !category){
      addError.textContent = "Title and Category are required.";
      addError.style.display = "block"; return;
    }
    const res = await fetch(`${API}/modules`, {
      method:"POST",
      headers:{ "Content-Type":"application/json", ...authHeader() },
      body: JSON.stringify({ title, category, visibility:"public", role })
    });
    if(!res.ok){
      const t = await res.text().catch(()=> "");
      addError.textContent = `Create failed. ${t}`;
      addError.style.display = "block"; return;
    }
    const mod = await res.json();
    const id = mod.id || mod._id;
    if(content){
      const res2 = await fetch(`${API}/modules/${id}/assets`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", ...authHeader() },
        body: JSON.stringify({ type:"text", title:"Overview", text: content })
      });
      if(!res2.ok){
        console.warn("Text asset creation failed");
      }
    }
    addSuccess.style.display = "inline-block";
    addTitle.value = "";
    addCourseContent.value = "";
    addQuizReq.checked = false;
    await loadAll();
    setView("manage");
  }

  // Archive toggle
  async function onArchive(id){
    const course = state.all.find(c => String(c.id) === String(id));
    const willArchive = !(course && course.isArchived === true);
    if(!confirm(willArchive ? "Archive this course?" : "Unarchive this course?")) return;
    const res = await fetch(`${API}/modules/${id}`, {
      method:"PATCH",
      headers:{ "Content-Type":"application/json", ...authHeader() },
      body: JSON.stringify({ isArchived: willArchive })
    });
    if(!res.ok){ alert(willArchive ? "Archive failed" : "Unarchive failed"); return; }
    await loadAll(); setView("manage");
  }

  // Bulk archive
  async function onBulkArchive(archiveState = true) {
    if (state.selectedCourses.length === 0) {
      return alert(`No courses selected to ${archiveState ? 'archive' : 'unarchive'}.`);
    }
    if (!confirm(`Are you sure you want to ${archiveState ? 'archive' : 'unarchive'} ${state.selectedCourses.length} courses?`)) {
      return;
    }
    try {
      const res = await fetch(`${API}/modules/bulk-archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ ids: state.selectedCourses, isArchived: archiveState })
      });
      if (!res.ok) throw new Error('Bulk archive failed');
      await loadAll();
      state.selectedCourses = [];
      handleCheckboxChange();
    } catch (err) {
      console.error('Bulk archive error:', err);
      alert('Failed to update archive state. Please try again.');
    }
  }

  // Delete
  async function onDelete(id){
    if(!confirm("Permanently delete this course?")) return;
    const res = await fetch(`${API}/modules/${id}`, {
      method:"DELETE",
      headers:{ ...authHeader() }
    });
    if(!res.ok){ alert("Delete failed"); return; }
    await loadAll(); setView("manage");
  }

  // Load edit
  async function onEdit(id){
    const res = await fetch(`${API}/modules/${id}`, { headers: { ...authHeader() } });
    if(!res.ok){ alert("Failed to fetch course"); return; }
    const m = await res.json();
    setView("edit", m);
  }

  // Render edit
  function renderEditView(m){
    const vEdit = qs("#courses-edit");
    if(!vEdit) return;
    vEdit.style.display = "grid";
    vEdit.setAttribute("aria-hidden", "false");
    const elErr = qs("#editError");
    const elOk = qs("#editSuccess");
    if (elErr) elErr.style.display = 'none';
    if (elOk) elOk.style.display = 'none';
    qs("#editTitle").value = m.title || "";
    qs("#editCategory").value = m.category || "";
    qs("#editRole").value = m.role || "";
    const textAssetList = (m.assets||[]).filter(a=>a.type==='text');
    const latestText = textAssetList.length ? textAssetList[textAssetList.length-1] : null;
    qs("#editCourseContent").value = latestText ? (latestText.text||"") : "";
    qs("#btnSaveEdit").onclick = async function(){
      const title = qs("#editTitle").value.trim();
      const category = qs("#editCategory").value.trim();
      const role = qs("#editRole").value.trim();
      const content = qs("#editCourseContent").value.trim();
      if(!title || !category){
        qs("#editError").textContent = 'Title and Category are required.';
        qs("#editError").style.display = 'block'; return;
      }
      const res = await fetch(`${API}/modules/${m._id||m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json', ...authHeader() },
        body: JSON.stringify({ title, category, role })
      });
      if(!res.ok){
        qs("#editError").textContent = 'Update failed.';
        qs("#editError").style.display = 'block'; return;
      }
      if (content) {
        try {
          await fetch(`${API}/modules/${m._id||m.id}/assets`, {
            method: 'POST',
            headers: { 'Content-Type':'application/json', ...authHeader() },
            body: JSON.stringify({ type:'text', title:'Overview', text: content })
          });
        } catch {}
      }
      qs("#editSuccess").style.display = 'inline-block';
      await loadAll();
      setView("manage");
    };
    qs("#btnCancelEdit").onclick = function(){ setView("manage"); };
  }

  // Render details
  async function renderDetailsView(id){
    const vDetails = qs("#course-details");
    if (!vDetails) return;
    vDetails.style.display = "grid";
    vDetails.setAttribute("aria-hidden", "false");
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API}/modules/${id}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch course');
      const m = await res.json();

      const elTitle = qs("#detailsTitle");
      const elMeta = qs("#detailsMeta");
      const elContent = qs("#detailsContent");

      if (elTitle) elTitle.textContent = m.title || '';

      if (elMeta) {
        const parts = [];
        if (m.category) parts.push(`Category: ${m.category}`);
        if (m.role) parts.push(`Role: ${m.role}`);
        if (m.createdAt) parts.push(`Created: ${new Date(m.createdAt).toLocaleString()}`);
        elMeta.textContent = parts.join(' • ');
      }

      if (elContent) {
        let html = '';
        if (m.description) html += `<p>${escapeHtml(m.description)}</p>`;
        const assets = m.assets || [];
        const lastText = assets.filter(a=>a.type==='text').slice(-1);
        const others = assets.filter(a=>a.type!=='text');
        const ordered = [...lastText, ...others];
        ordered.forEach(asset => {
          let block = `<div><b>${escapeHtml(asset.title || '')}</b><br>`;
          if (asset.type === 'video') {
            block += `<video src="${asset.url}" controls width="100%"></video>`;
          } else if (asset.type === 'pdf') {
            block += `<a href="${asset.url}" target="_blank">PDF</a>`;
          } else if (asset.type === 'link') {
            block += `<a href="${asset.url}" target="_blank">${asset.url}</a>`;
          } else if (asset.type === 'text') {
            block += `<div>${escapeHtml(asset.text || '')}</div>`;
          }
          block += '</div>';
          html += block;
        });
        elContent.innerHTML = html;
      }
    } catch (e) {
      const elTitle = qs("#detailsTitle");
      if (elTitle) elTitle.textContent = 'Error loading course';
    }
    const backBtn = qs("#btnBackFromDetails");
    if (backBtn) backBtn.onclick = function(){ setView("home"); };
  }

  // Filters
  function computeFilters(){
    const dummyCats = ['kitchen','accounting','delivery','devops'];
    const cats = [...new Set([...dummyCats, ...state.all.map(m=>m.category).filter(Boolean)])].sort();
    filterCategory.innerHTML = `<option value="">All</option>` + cats.map(c=>`<option value="${c}">${escapeHtml(cap(c))}</option>`).join("");
    addCategory.innerHTML = `<option value="">Select Category</option>` + cats.map(c=>`<option value="${c}">${escapeHtml(cap(c))}</option>`).join("");
    const dummyRoles = ['beginner','intermediate','advanced'];
    const roles = [...new Set([...dummyRoles, ...state.all.map(m=>m.role).filter(Boolean)])].sort();
    filterRole.innerHTML = `<option value="">All</option>` + roles.map(r=>`<option value="${r}">${escapeHtml(cap(r))}</option>`).join("");
  }
  function escapeHtml(s){ return (s||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function cap(s){ return s ? s[0].toUpperCase()+s.slice(1) : s; }

  // Load all
  async function loadAll(){
    try { await fetchModules(); computeFilters(); renderHome(); renderManage(); }
    catch(e){ console.error(e); coursesError && (coursesError.style.display = "block"); }
  }

  // Event listeners
  document.addEventListener("DOMContentLoaded", ()=>{
    if (window.location && window.location.pathname === '/courses/manage') {
      setView("manage");
      renderManage();
    } else {
      setView("home");
    }
    btnManage && btnManage.addEventListener("click", ()=>{ window.location.href = '/courses/manage'; });
    btnAdd && btnAdd.addEventListener("click", ()=> setView("add"));
    btnCancelAdd && btnCancelAdd.addEventListener("click", ()=> setView("manage"));
    btnSaveAdd && btnSaveAdd.addEventListener("click", onSave);
    filterCategory && filterCategory.addEventListener("change", ()=>{ state.category = filterCategory.value; state.page=1; renderManage(); });
    filterRole && filterRole.addEventListener("change", ()=>{ state.role = filterRole.value; state.page=1; renderManage(); });
    btnDeleteSelected && btnDeleteSelected.addEventListener("click", onBulkDelete);
    btnCancelBulk && btnCancelBulk.addEventListener("click", () => {
      state.selectedCourses = [];
      manageList.querySelectorAll(".course-checkbox").forEach(cb => cb.checked = false);
      handleCheckboxChange();
    });
  });
  document.addEventListener("DOMContentLoaded", loadAll);
})();
