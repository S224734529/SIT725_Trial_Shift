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
  const addAssetList = qs("#addAssetList");
  const addAssetTitle = qs("#addAssetTitle");
  const addAssetFile = qs("#addAssetFile");
  const btnAddAttachment = qs("#btnAddAttachment");
  const addAssetError = qs("#addAssetError");
  const addAssetSuccess = qs("#addAssetSuccess");
  const addAssetLoading = qs("#addAssetLoading");
  const editAssetLoading = qs("#editAssetLoading");
  const addAssetLoadingMessage = addAssetLoading ? addAssetLoading.querySelector(".asset-upload__message") : null;
  const editAssetLoadingMessage = editAssetLoading ? editAssetLoading.querySelector(".asset-upload__message") : null;
  const defaultAddLoadingMessage = addAssetLoadingMessage ? addAssetLoadingMessage.textContent.trim() : "Uploading attachments...";
  const defaultEditLoadingMessage = editAssetLoadingMessage ? editAssetLoadingMessage.textContent.trim() : "Uploading attachment...";
  const editAssetList = qs("#editAssetList");
  const editAssetTitle = qs("#editAssetTitle");
  const editAssetFile = qs("#editAssetFile");
  const btnUploadAsset = qs("#btnUploadAsset");
  const editAssetError = qs("#editAssetError");
  const editAssetSuccess = qs("#editAssetSuccess");
  const detailsAttachments = qs("#detailsAttachments");

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
  let currentEditModule = null;
  let pendingAddAttachments = [];

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

  
  // Attachment staging (create)
  function clearAddAttachmentFeedback(){
    if (addAssetError) addAssetError.style.display = 'none';
    if (addAssetSuccess) addAssetSuccess.style.display = 'none';
    setAddUploading(false);
  }

  function setAddUploading(isLoading, message){
    if (!addAssetLoading) return;
    const nextMessage = typeof message === "string" && message.length ? message : defaultAddLoadingMessage;
    if (addAssetLoadingMessage) addAssetLoadingMessage.textContent = nextMessage;
    addAssetLoading.style.display = isLoading ? "inline-flex" : "none";
    [btnSaveAdd, btnCancelAdd, btnAddAttachment, addAssetFile, addAssetTitle].forEach((control) => {
      if (control) control.disabled = !!isLoading;
    });
  }

  function resetAddForm(){
    if (addTitle) addTitle.value = "";
    if (addCategory) addCategory.value = "";
    if (addRole) addRole.value = "";
    if (addCourseContent) addCourseContent.value = "";
    if (addQuizReq) addQuizReq.checked = false;
    if (addError) addError.style.display = "none";
    if (addSuccess) addSuccess.style.display = "none";
    resetAddAttachmentState();
  }

  function renderAddAttachments(){
    if (!addAssetList) return;
    if (!pendingAddAttachments.length){
      addAssetList.innerHTML = '<div class="help-muted">No attachments staged.</div>';
      return;
    }
    addAssetList.innerHTML = pendingAddAttachments.map(item => {
      const title = escapeHtml(item.title || (item.file ? item.file.name : 'Attachment'));
      const type = item.file && item.file.type === 'application/pdf' ? 'PDF' : 'Image';
      return `<div class="asset-item" data-staged-id="${item.id}">
        <div>
          <div class="asset-name">${title}</div>
          <div class="help-muted">${type}</div>
        </div>
        <div class="asset-actions">
          <button type="button" class="btn-soft js-remove-staged">Remove</button>
        </div>
      </div>`;
    }).join('');
    addAssetList.querySelectorAll('.js-remove-staged').forEach(btn => {
      btn.addEventListener('click', () => {
        const host = btn.closest('.asset-item');
        if (!host) return;
        const id = host.dataset.stagedId;
        pendingAddAttachments = pendingAddAttachments.filter(entry => entry.id !== id);
        renderAddAttachments();
      });
    });
  }

  function stageAddAttachment(){
    clearAddAttachmentFeedback();
    const file = addAssetFile && addAssetFile.files ? addAssetFile.files[0] : null;
    const title = addAssetTitle ? addAssetTitle.value.trim() : '';
    if (!file){
      if (addAssetError) {
        addAssetError.textContent = 'Select a file to attach.';
        addAssetError.style.display = 'block';
      }
      return;
    }
    const isValid = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!isValid){
      if (addAssetError) {
        addAssetError.textContent = 'Only image or PDF files are supported.';
        addAssetError.style.display = 'block';
      }
      return;
    }
    pendingAddAttachments.push({
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      title,
    });
    if (addAssetTitle) addAssetTitle.value = '';
    if (addAssetFile) addAssetFile.value = '';
    renderAddAttachments();
    if (addAssetSuccess) {
      addAssetSuccess.textContent = 'Attachment staged.';
      addAssetSuccess.style.display = 'block';
    }
  }

  function resetAddAttachmentState(){
    pendingAddAttachments = [];
    renderAddAttachments();
    clearAddAttachmentFeedback();
    if (addAssetFile) addAssetFile.value = '';
    if (addAssetTitle) addAssetTitle.value = '';
  }
  async function uploadFileAttachment(moduleId, file, title){
    if (!moduleId || !file) {
      throw new Error('Missing attachment data');
    }
    const headers = authHeader();
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    const res = await fetch(`${API}/modules/${moduleId}/assets`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      throw new Error('Upload failed');
    }
    return res.json();
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
    if (addError) addError.style.display = "none";
    if (addSuccess) addSuccess.style.display = "none";
    clearAddAttachmentFeedback();
    const title = addTitle ? addTitle.value.trim() : "";
    const category = addCategory ? addCategory.value.trim() : "";
    const role = addRole ? addRole.value.trim() : "";
    const content = addCourseContent ? addCourseContent.value.trim() : "";
    if(!title || !category){
      if (addError) {
        addError.textContent = "Title and Category are required.";
        addError.style.display = "block";
      }
      return;
    }
    const res = await fetch(`${API}/modules`, {
      method:"POST",
      headers:{ "Content-Type":"application/json", ...authHeader() },
      body: JSON.stringify({ title, category, visibility:"public", role })
    });
    if(!res.ok){
      const t = await res.text().catch(()=> "");
      if (addError) {
        addError.textContent = `Create failed. ${t}`;
        addError.style.display = "block";
      }
      return;
    }
    const mod = await res.json();
    const id = mod.id || mod._id;
    if(content){
      const res2 = await fetch(`${API}/modules/${id}/assets`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", ...authHeader() },
        body: JSON.stringify({ type:"text", title:'', text: content })
      });
      if(!res2.ok){
        console.warn("Text asset creation failed");
      }
    }

    const stagedCount = pendingAddAttachments.length;
    if (stagedCount){
      let uploadFailures = 0;
      try {
        setAddUploading(true, stagedCount > 1 ? `Uploading ${stagedCount} attachments...` : defaultAddLoadingMessage);
        for (let index = 0; index < stagedCount; index++){
          const attachment = pendingAddAttachments[index];
          if (!attachment || !attachment.file) continue;
          const progressMessage = stagedCount > 1 ? `Uploading attachment ${index + 1} of ${stagedCount}...` : defaultAddLoadingMessage;
          setAddUploading(true, progressMessage);
          const titleForUpload = attachment.title || (attachment.file ? attachment.file.name : "Attachment");
          try {
            await uploadFileAttachment(id, attachment.file, titleForUpload);
          } catch (err) {
            uploadFailures++;
            console.error('Attachment upload failed', err);
          }
        }
      } finally {
        setAddUploading(false);
      }
      if (uploadFailures) {
        console.warn(`Failed to upload ${uploadFailures} attachment${uploadFailures === 1 ? '' : 's'}.`);
      }
    }

    if (addSuccess) addSuccess.style.display = "inline-block";
    if (addTitle) addTitle.value = "";
    if (addCategory) addCategory.value = "";
    if (addRole) addRole.value = "";
    if (addCourseContent) addCourseContent.value = "";
    if (addQuizReq) addQuizReq.checked = false;
    resetAddAttachmentState();
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
    try {
      const res = await fetch(`${API}/modules/${id}`, { headers: { ...authHeader() } });
      if(!res.ok) throw new Error('Failed to fetch course');
      const m = await res.json();
      currentEditModule = m;
      setView("edit", currentEditModule);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch course");
    }
  }

  function clearAssetFeedback(){
    if (editAssetError) editAssetError.style.display = 'none';
    if (editAssetSuccess) editAssetSuccess.style.display = 'none';
    setEditUploading(false);
  }

  function setEditUploading(isLoading, message){
    if (!editAssetLoading) return;
    const nextMessage = typeof message === "string" && message.length ? message : defaultEditLoadingMessage;
    if (editAssetLoadingMessage) editAssetLoadingMessage.textContent = nextMessage;
    editAssetLoading.style.display = isLoading ? "inline-flex" : "none";
    [btnUploadAsset, editAssetFile, editAssetTitle].forEach((control) => {
      if (control) control.disabled = !!isLoading;
    });
  }

  function reportAssetError(message){
    if (!editAssetError) return;
    editAssetError.textContent = message;
    editAssetError.style.display = 'block';
    if (editAssetSuccess) editAssetSuccess.style.display = 'none';
  }

  function reportAssetSuccess(message){
    if (!editAssetSuccess) return;
    editAssetSuccess.textContent = message;
    editAssetSuccess.style.display = 'block';
    if (editAssetError) editAssetError.style.display = 'none';
  }

  function getModuleId(mod){
    return mod ? (mod._id || mod.id) : null;
  }

  function renderEditAttachments(){
    if (!editAssetList) return;
    if (!currentEditModule){
      editAssetList.innerHTML = '<div class="help-muted">No attachments yet.</div>';
      return;
    }
    const attachments = (currentEditModule.assets || []).filter(asset => asset.type === 'image' || asset.type === 'pdf');
    if (!attachments.length){
      editAssetList.innerHTML = '<div class="help-muted">No attachments yet.</div>';
      return;
    }
    editAssetList.innerHTML = attachments.map(asset => {
      const assetId = getModuleId(asset) || asset.assetId || '';
      const title = escapeHtml(asset.title || (asset.type === 'pdf' ? 'PDF document' : 'Image'));
      const url = escapeHtml(asset.url || '#');
      const typeLabel = asset.type === 'pdf' ? 'PDF' : 'Image';
      return `<div class="asset-item" data-asset-id="${assetId}">
        <div>
          <div class="asset-name">${title}</div>
          <div class="help-muted">${typeLabel}</div>
        </div>
        <div class="asset-actions">
          <a href="${url}" target="_blank" rel="noopener" class="chip-btn">Open</a>
          <a href="${url}" download class="chip-btn">Download</a>
          <button type="button" class="btn-soft js-remove-asset">Remove</button>
        </div>
      </div>`;
    }).join('');
    editAssetList.querySelectorAll('.js-remove-asset').forEach(btn => {
      btn.addEventListener('click', () => {
        const host = btn.closest('.asset-item');
        if (!host) return;
        onDeleteAsset(host.dataset.assetId);
      });
    });
  }

  async function onUploadAsset(moduleId){
    if (!moduleId || !btnUploadAsset) return;
    const file = editAssetFile && editAssetFile.files ? editAssetFile.files[0] : null;
    const customTitle = editAssetTitle ? editAssetTitle.value.trim() : '';
    clearAssetFeedback();
    if (!file){
      reportAssetError('Select a file to upload.');
      return;
    }
    const isValid = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!isValid){
      reportAssetError('Only image and PDF uploads are allowed.');
      return;
    }
    try {
      setEditUploading(true);
      const data = await uploadFileAttachment(moduleId, file, customTitle);
      if (data && data.asset){
        const assets = Array.isArray(currentEditModule.assets) ? currentEditModule.assets : [];
        assets.push(data.asset);
        currentEditModule.assets = assets;
      }
      if (editAssetTitle) editAssetTitle.value = '';
      if (editAssetFile) editAssetFile.value = '';
      renderEditAttachments();
      reportAssetSuccess('Attachment uploaded.');
    } catch (err) {
      console.error(err);
      reportAssetError('Failed to upload attachment.');
    } finally {
      setEditUploading(false);
    }
  }
  async function onDeleteAsset(assetId){
    if (!assetId || !currentEditModule) return;
    if (!confirm('Remove this attachment?')) return;
    clearAssetFeedback();
    const moduleId = getModuleId(currentEditModule);
    try {
      const res = await fetch(`${API}/modules/${moduleId}/assets/${assetId}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Delete failed');
      currentEditModule.assets = (currentEditModule.assets || []).filter(asset => String(getModuleId(asset)) !== String(assetId));
      renderEditAttachments();
      reportAssetSuccess('Attachment removed.');
    } catch (err) {
      console.error(err);
      reportAssetError('Failed to remove attachment.');
    }
  }

  // Render edit
  function renderEditView(m){
    currentEditModule = m;
    const vEdit = qs("#courses-edit");
    if(!vEdit) return;
    vEdit.style.display = "grid";
    vEdit.setAttribute("aria-hidden", "false");
    const elErr = qs("#editError");
    const elOk = qs("#editSuccess");
    if (elErr) elErr.style.display = 'none';
    if (elOk) elOk.style.display = 'none';
    clearAssetFeedback();

    const moduleId = getModuleId(m);
    const hiddenId = qs("#editId");
    if (hiddenId) hiddenId.value = moduleId || '';

    const titleInput = qs("#editTitle");
    const categorySelect = qs("#editCategory");
    const roleSelect = qs("#editRole");
    const contentArea = qs("#editCourseContent");

    if (titleInput) titleInput.value = m.title || '';
    if (categorySelect) categorySelect.value = m.category || '';
    if (roleSelect) roleSelect.value = m.role || '';

    const textAssetList = (m.assets||[]).filter(a=>a.type==='text');
    const latestText = textAssetList.length ? textAssetList[textAssetList.length-1] : null;
    if (contentArea) contentArea.value = latestText ? (latestText.text||'') : '';

    renderEditAttachments();

    if (btnUploadAsset) {
      btnUploadAsset.onclick = function(){ onUploadAsset(moduleId); };
    }

    const saveBtn = qs("#btnSaveEdit");
    if (saveBtn) {
      saveBtn.onclick = async function(){
        const title = titleInput ? titleInput.value.trim() : '';
        const category = categorySelect ? categorySelect.value.trim() : '';
        const role = roleSelect ? roleSelect.value.trim() : '';
        const content = contentArea ? contentArea.value.trim() : '';
        if(!title || !category){
          if (elErr) {
            elErr.textContent = 'Title and Category are required.';
            elErr.style.display = 'block';
          }
          return;
        }
        try {
          const res = await fetch(`${API}/modules/${moduleId}`, {
            method: 'PATCH',
            headers: { 'Content-Type':'application/json', ...authHeader() },
            body: JSON.stringify({ title, category, role })
          });
          if(!res.ok) throw new Error('Update failed');
          const existingTextAssets = (currentEditModule.assets || []).filter(a => a.type === 'text');
          for (const asset of existingTextAssets) {
            const assetId = getModuleId(asset);
            if (!assetId) continue;
            try {
              await fetch(`${API}/modules/${moduleId}/assets/${assetId}`, {
                method: 'DELETE',
                headers: { ...authHeader() }
              });
            } catch (cleanupErr) {
              console.error('Text asset cleanup failed', cleanupErr);
            }
          }
          currentEditModule.assets = (currentEditModule.assets || []).filter(a => a.type !== 'text');
          if (content) {
            try {
              const textRes = await fetch(`${API}/modules/${moduleId}/assets`, {
                method: 'POST',
                headers: { 'Content-Type':'application/json', ...authHeader() },
                body: JSON.stringify({ type:'text', title:'', text: content })
              });
              if (textRes.ok) {
                const payload = await textRes.json().catch(() => null);
                if (payload && payload.asset) {
                  currentEditModule.assets.push(payload.asset);
                }
              } else {
                console.warn('Text asset creation failed');
              }
            } catch (textErr) {
              console.error('Text asset save failed', textErr);
            }
          }
          if (elOk) elOk.style.display = 'inline-block';
          await loadAll();
          currentEditModule = null;
          setView("manage");
        } catch (err) {
          console.error(err);
          if (elErr) {
            elErr.textContent = 'Update failed.';
            elErr.style.display = 'block';
          }
        }
      };
    }

    const cancelBtn = qs("#btnCancelEdit");
    if (cancelBtn) {
      cancelBtn.onclick = function(){
        currentEditModule = null;
        setView("manage");
      };
    }
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
      if (elContent) elContent.innerHTML = '';
      if (detailsAttachments) detailsAttachments.innerHTML = '';

      if (elTitle) elTitle.textContent = m.title || '';

      if (elMeta) {
        const parts = [];
        if (m.category) parts.push(`Category: ${m.category}`);
        if (m.role) parts.push(`Role: ${m.role}`);
        if (m.createdAt) parts.push(`Created: ${new Date(m.createdAt).toLocaleString()}`);
        elMeta.textContent = parts.join(' - ');
      }

      if (elContent) {
        let html = '';
        if (m.description) html += `<p>${escapeHtml(m.description)}</p>`;
        const textAssets = (m.assets || []).filter(a => a.type === 'text');
        textAssets.forEach(asset => {
          const safeTitle = escapeHtml((asset.title || '').trim());
          const safeText = escapeHtml(asset.text || '');
          if (safeTitle) {
            html += `<div><strong>${safeTitle}</strong><div>${safeText}</div></div>`;
          } else if (safeText) {
            html += `<div>${safeText}</div>`;
          }
        });
        elContent.innerHTML = html || '<div class="help-muted">No written content available.</div>';
      }

      if (detailsAttachments) {
        const attachments = (m.assets || []).filter(asset => asset.type === 'image' || asset.type === 'pdf');
        if (!attachments.length) {
          detailsAttachments.innerHTML = '<div class="help-muted">No attachments available.</div>';
        } else {
          const gallery = attachments.map(asset => buildAttachmentCard(asset)).join('');
          detailsAttachments.innerHTML = `<h5 class="h-title" style="margin-top: 12px;">Attachments</h5>${gallery}`;
        }
      }
    } catch (e) {
      console.error(e);
      const elTitle = qs("#detailsTitle");
      if (elTitle) elTitle.textContent = 'Error loading course';
      if (detailsAttachments) {
        detailsAttachments.innerHTML = '<div class="help-error">Unable to load attachments.</div>';
      }
    }
    const backBtn = qs("#btnBackFromDetails");
    if (backBtn) backBtn.onclick = function(){ setView("home"); };
  }

  function buildAttachmentCard(asset){
    const title = escapeHtml(asset.title || (asset.type === 'pdf' ? 'PDF document' : 'Image'));
    const url = escapeHtml(asset.url || '#');
    if (asset.type === 'image') {
      return `<div class="asset-card"><img src="${url}" alt="${title}"><div class="asset-card__title">${title}</div><div class="asset-card__actions"><a href="${url}" target="_blank" rel="noopener" class="chip-btn">View</a><a href="${url}" download class="chip-btn">Download</a></div></div>`;
    }
    return `<div class="asset-card asset-card--pdf"><span class="material-icons">picture_as_pdf</span><div><div class="asset-card__title">${title}</div><div class="asset-card__actions"><a href="${url}" target="_blank" rel="noopener" class="chip-btn">Open</a><a href="${url}" download class="chip-btn">Download</a></div></div></div>`;
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
    renderAddAttachments();
    if (window.location && window.location.pathname === '/courses/manage') {
      setView("manage");
      renderManage();
    } else {
      setView("home");
    }
    btnManage && btnManage.addEventListener("click", ()=>{ window.location.href = '/courses/manage'; });
    btnAdd && btnAdd.addEventListener("click", ()=> {
      resetAddForm();
      setView("add");
    });
    btnCancelAdd && btnCancelAdd.addEventListener("click", ()=> {
      resetAddForm();
      setView("manage");
    });
    btnSaveAdd && btnSaveAdd.addEventListener("click", onSave);
    if (btnAddAttachment) btnAddAttachment.addEventListener("click", stageAddAttachment);
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
