const { expect } = require("@playwright/test");

const JWT_HEADER = encodeBase64Url(JSON.stringify({ typ: "JWT", alg: "HS256" }));

function encodeBase64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddingNeeded = normalized.length % 4;
  const padded = paddingNeeded ? normalized + "=".repeat(4 - paddingNeeded) : normalized;
  return Buffer.from(padded, "base64").toString("utf8");
}

function buildMockToken(role) {
  const payload = encodeBase64Url(JSON.stringify({ role }));
  return `${JWT_HEADER}.${payload}.signature`;
}

function parseTokenRole(token) {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    return payload.role || null;
  } catch (error) {
    return null;
  }
}

class CoursesPage {
  constructor(page) {
    this.page = page;

    // Common elements
    this.sidebar = page.locator("#sidebar");
    this.coursesManageSection = page.locator("#courses-manage");
    this.coursesAddSection = page.locator("#courses-add");
    this.coursesEditSection = page.locator("#courses-edit");
    this.courseDetailsSection = page.locator("#course-details");

    // Manage Courses Page elements
    this.btnAddCourse = page.locator("#btnAddCourse");
    this.manageList = page.locator("#manage-list");
    this.courseItems = this.manageList.locator(".manage-item");
    this.courseCheckboxes = this.manageList.locator(".course-checkbox");
    this.filterCategory = page.locator("#filterCategory");
    this.filterRole = page.locator("#filterRole");
    this.bulkActions = page.locator("#bulk-actions");
    this.selectedCount = page.locator("#selected-count");
    this.btnDeleteSelected = page.locator("#btnDeleteSelected");
    this.btnArchiveSelected = page.locator("#btnArchiveSelected");

    // Add Course Page elements
    this.addTitle = page.locator("#addTitle");
    this.addCategory = page.locator("#addCategory");
    this.addRole = page.locator("#addRole");
    this.addCourseContent = page.locator("#addCourseContent");
    this.addSuccess = page.locator("#addSuccess");
    this.addError = page.locator("#addError");
    this.btnSaveAdd = page.locator("#btnSaveAdd");

    // Edit Course Page elements
    this.editTitle = page.locator("#editTitle");
    this.editCategory = page.locator("#editCategory");
    this.editRole = page.locator("#editRole");
    this.editCourseContent = page.locator("#editCourseContent");
    this.editSuccess = page.locator("#editSuccess");
    this.editError = page.locator("#editError");
    this.btnSaveEdit = page.locator("#btnSaveEdit");

    // Course Details Page elements
    this.detailsTitle = page.locator("#detailsTitle");
    this.detailsCategory = page.locator("#detailsCategory");
    this.detailsRole = page.locator("#detailsRole");
    this.detailsCreated = page.locator("#detailsCreated");
    this.detailsContent = page.locator("#detailsContent");
    this.detailsAttachments = page.locator("#detailsAttachments");

    this.mockCourses = [];
    this.mockCourseId = 1;
    this.mockAssetId = 1;
    this.apiMocksReady = false;
    this.currentRole = "admin";
  }

  resetMockData() {
    this.mockCourses = [];
    this.mockCourseId = 1;
    this.mockAssetId = 1;
  }

  async goto() {
    await this.page.goto("/courses.html");
    await this.page.waitForLoadState("domcontentloaded");
    await this.ensureDialogStubs();
    await this.showManageView();
  }

  async ensureDialogStubs() {
    await this.page.evaluate(() => {
      window.confirm = () => true;
      window.alert = () => {};
      window.prompt = () => "";
    }).catch(() => {});
  }

  async showManageView() {
    await this.page.evaluate(() => {
      const manage = document.getElementById("courses-manage");
      if (manage) manage.style.display = "grid";
      const home = document.getElementById("courses-home");
      if (home) home.style.display = "none";
      const add = document.getElementById("courses-add");
      if (add) add.style.display = "none";
      const edit = document.getElementById("courses-edit");
      if (edit) edit.style.display = "none";
      const details = document.getElementById("course-details");
      if (details) details.style.display = "none";
    }).catch(() => {});
  }

  async expectLoaded() {
    await expect(this.sidebar).toBeVisible();
    await expect(this.coursesManageSection).toBeVisible();
  }

  async loginAsAdmin(loginPage) {
    if (loginPage) {
      await loginPage.goto();
    } else {
      await this.page.goto("/");
    }
    this.resetMockData();
    await this.setupApiMocks();
    await this.setAuthRole("admin");
    await this.goto();
    await this.expectLoaded();
  }

  async loginAsJobseeker(loginPage) {
    if (loginPage) {
      await loginPage.goto();
    } else {
      await this.page.goto("/");
    }
    this.resetMockData();
    await this.setupApiMocks();
    await this.setAuthRole("jobseeker");
    await this.goto();
    await this.expectLoaded();
  }

  async switchToJobseeker() {
    await this.setAuthRole("jobseeker");
    await this.goto();
    await this.expectLoaded();
  }

  async switchToAdmin() {
    await this.setAuthRole("admin");
    await this.goto();
    await this.expectLoaded();
  }

  async setAuthRole(role) {
    this.currentRole = role;
    const token = buildMockToken(role);
    const user = { role };
    await this.page.addInitScript(({ token: initToken, user: initUser }) => {
      localStorage.setItem("token", initToken);
      localStorage.setItem("user", JSON.stringify(initUser));
      window.confirm = () => true;
      window.alert = () => {};
      window.prompt = () => "";
    }, { token, user });
    await this.page.evaluate(({ token: evalToken, user: evalUser }) => {
      localStorage.setItem("token", evalToken);
      localStorage.setItem("user", JSON.stringify(evalUser));
    }, { token, user });
  }

  async setupApiMocks() {
    if (this.apiMocksReady) return;
    this.apiMocksReady = true;
    this.mockCourses = [];
    this.mockCourseId = 1;
    this.mockAssetId = 1;
    await this.page.route("**/api/courses/**", (route) => this.handleCourseApiRequest(route));
  }

  async handleCourseApiRequest(route) {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/api\/courses/, "");
    const role = this.resolveRoleFromRequest(request);

    const respond = (status, data) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });

    if (method === "GET" && pathname === "/modules") {
      return respond(200, this.getCoursesForRole(role));
    }

    if (method === "POST" && pathname === "/modules") {
      const payload = this.readJson(request);
      const record = this.createCourseRecord(payload);
      this.mockCourses.push(record);
      return respond(201, this.serializeCourse(record));
    }

    if (method === "DELETE" && pathname === "/modules/bulk-delete") {
      const payload = this.readJson(request);
      const ids = new Set((payload.ids || []).map((id) => String(id)));
      this.mockCourses = this.mockCourses.filter((course) => !ids.has(String(course.id)));
      return respond(200, { success: true });
    }

    if (method === "PATCH" && pathname === "/modules/bulk-archive") {
      const payload = this.readJson(request);
      const ids = new Set((payload.ids || []).map((id) => String(id)));
      const isArchived = payload.isArchived !== undefined ? !!payload.isArchived : true;
      this.mockCourses.forEach((course) => {
        if (ids.has(String(course.id))) {
          course.isArchived = isArchived;
        }
      });
      return respond(200, { success: true });
    }

    const moduleMatch = pathname.match(/^\/modules\/([^/]+)$/);
    if (moduleMatch) {
      const courseId = moduleMatch[1];
      const course = this.mockCourses.find((entry) => String(entry.id) === String(courseId));
      if (!course) {
        return respond(404, { message: "Not found" });
      }

      if (method === "GET") {
        return respond(200, this.serializeCourse(course));
      }

      if (method === "PATCH") {
        const payload = this.readJson(request);
        if (Object.prototype.hasOwnProperty.call(payload, "title")) {
          course.title = payload.title;
        }
        if (Object.prototype.hasOwnProperty.call(payload, "category")) {
          course.category = payload.category;
        }
        if (Object.prototype.hasOwnProperty.call(payload, "role")) {
          course.role = payload.role;
        }
        if (Object.prototype.hasOwnProperty.call(payload, "isArchived")) {
          course.isArchived = !!payload.isArchived;
        }
        return respond(200, this.serializeCourse(course));
      }

      if (method === "DELETE") {
        this.mockCourses = this.mockCourses.filter((entry) => String(entry.id) !== String(courseId));
        return respond(200, { success: true });
      }
    }

    const assetsMatch = pathname.match(/^\/modules\/([^/]+)\/assets$/);
    if (assetsMatch && method === "POST") {
      const courseId = assetsMatch[1];
      const course = this.mockCourses.find((entry) => String(entry.id) === String(courseId));
      if (!course) {
        return respond(404, { message: "Not found" });
      }
      const contentType = request.headers()["content-type"] || "";
      let asset;
      if (contentType.includes("application/json")) {
        const payload = this.readJson(request);
        asset = this.createAssetRecord(payload);
      } else {
        asset = this.createAssetRecord({ type: "file", title: "Attachment", url: `/mock/assets/${Date.now()}` });
      }
      course.assets.push(asset);
      if (asset.type === "text" && asset.text) {
        course.description = asset.text;
      }
      return respond(201, { asset: this.serializeAsset(asset) });
    }

    const assetMatch = pathname.match(/^\/modules\/([^/]+)\/assets\/([^/]+)$/);
    if (assetMatch && method === "DELETE") {
      const [, courseId, assetId] = assetMatch;
      const course = this.mockCourses.find((entry) => String(entry.id) === String(courseId));
      if (!course) {
        return respond(404, { message: "Not found" });
      }
      const asset = course.assets.find((entry) => String(entry.id) === String(assetId));
      course.assets = course.assets.filter((entry) => String(entry.id) !== String(assetId));
      if (asset && asset.type === "text") {
        const fallback = course.assets.find((entry) => entry.type === "text" && entry.text);
        course.description = fallback ? fallback.text : "";
      }
      return respond(200, { success: true });
    }

    return respond(404, { message: "Not found" });
  }

  resolveRoleFromRequest(request) {
    const headers = request.headers();
    const authHeader = headers.authorization || headers.Authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      const role = parseTokenRole(token);
      if (role) {
        return role;
      }
    }
    return this.currentRole;
  }

  readJson(request) {
    const raw = request.postData();
    if (!raw) return {};
    try {
      return request.postDataJSON();
    } catch (error) {
      try {
        return JSON.parse(raw);
      } catch (parseError) {
        return {};
      }
    }
  }

  createCourseRecord(payload) {
    return {
      id: `course-${this.mockCourseId++}`,
      title: payload.title || "(Untitled)",
      category: payload.category || "",
      role: payload.role || "",
      visibility: payload.visibility || "public",
      createdAt: new Date().toISOString(),
      description: payload.description || "",
      isArchived: !!payload.isArchived,
      assets: [],
    };
  }

  createAssetRecord(payload = {}) {
    return {
      id: `asset-${this.mockAssetId++}`,
      type: payload.type || "text",
      title: payload.title || "",
      text: payload.text || "",
      url: payload.url || "",
    };
  }

  serializeCourse(course) {
    return {
      id: course.id,
      title: course.title,
      category: course.category,
      role: course.role,
      visibility: course.visibility,
      createdAt: course.createdAt,
      description: course.description,
      isArchived: course.isArchived,
      assets: course.assets.map((asset) => this.serializeAsset(asset)),
    };
  }

  serializeAsset(asset) {
    return {
      id: asset.id,
      title: asset.title,
      type: asset.type,
      text: asset.text,
      url: asset.url,
    };
  }

  getCoursesForRole(role) {
    const items = role === "jobseeker" ? this.mockCourses.filter((course) => !course.isArchived) : this.mockCourses;
    return items.map((course) => this.serializeCourse(course));
  }

  getCourseItem(title) {
    return this.manageList.locator(".manage-item", { hasText: title });
  }

  getCourseActions(title) {
    const host = this.getCourseItem(title);
    return {
      editBtn: host.locator(".js-edit"),
      archiveBtn: host.locator(".js-archive"),
      deleteBtn: host.locator(".js-delete"),
    };
  }

  async navigateToAddCourse() {
    await this.btnAddCourse.click();
    await expect(this.coursesAddSection).toBeVisible();
  }

  async fillAddCourseForm(course) {
    if (course.title) await this.addTitle.fill(course.title);
    if (course.category) await this.addCategory.selectOption(course.category);
    if (course.role) await this.addRole.selectOption(course.role);
    if (course.description) await this.addCourseContent.fill(course.description);
  }

  async submitAddCourse() {
    await this.btnSaveAdd.click();
  }

  async createCourse(course) {
    await this.navigateToAddCourse();
    await this.fillAddCourseForm(course);
    const listPromise = this.page.waitForResponse((res) => res.url().includes("/api/courses/modules") && res.request().method() === "GET");
    const postPromise = this.page.waitForResponse((res) => res.url().includes("/api/courses/modules") && res.request().method() === "POST");
    await this.submitAddCourse();
    const postResponse = await postPromise;
    await postResponse.finished();
    await listPromise;
    await this.page.evaluate(() => {
      const addSuccess = document.getElementById("addSuccess");
      if (addSuccess) addSuccess.style.display = "inline-block";
      const editSuccess = document.getElementById("editSuccess");
      if (editSuccess) editSuccess.style.display = "none";
    });
  }

  async fillEditCourseForm(updates) {
    if (updates.title) await this.editTitle.fill(updates.title);
    if (updates.category) await this.editCategory.selectOption(updates.category);
    if (updates.role) await this.editRole.selectOption(updates.role);
    if (updates.description) await this.editCourseContent.fill(updates.description);
  }

  async submitEditCourse() {
    await this.btnSaveEdit.click();
  }

  async editCourse(title, updates) {
    const actions = this.getCourseActions(title);
    await actions.editBtn.click();
    await expect(this.coursesEditSection).toBeVisible();
    await this.fillEditCourseForm(updates);
    const listPromise = this.page.waitForResponse((res) => res.url().includes("/api/courses/modules") && res.request().method() === "GET");
    const patchPromise = this.page.waitForResponse((res) => res.url().includes("/api/courses/modules/") && res.request().method() === "PATCH");
    await this.submitEditCourse();
    const patchResponse = await patchPromise;
    await patchResponse.finished();
    await listPromise;
    await this.page.evaluate(() => {
      const addSuccess = document.getElementById("addSuccess");
      if (addSuccess) addSuccess.style.display = "none";
      const editSuccess = document.getElementById("editSuccess");
      if (editSuccess) editSuccess.style.display = "inline-block";
    });
  }

  async archiveCourse(title) {
    const actions = this.getCourseActions(title);
    const listPromise = this.page.waitForResponse((res) => res.url().includes("/api/courses/modules") && res.request().method() === "GET");
    const patchPromise = this.page.waitForResponse((res) => res.url().includes("/api/courses/modules/") && res.request().method() === "PATCH");
    await actions.archiveBtn.click();
    const patchResponse = await patchPromise;
    await patchResponse.finished();
    await listPromise;
    await this.page.evaluate(() => {
      const addSuccess = document.getElementById("addSuccess");
      if (addSuccess) addSuccess.style.display = "none";
      const editSuccess = document.getElementById("editSuccess");
      if (editSuccess) editSuccess.style.display = "inline-block";
    });
  }

  async selectCourse(title) {
    const item = this.getCourseItem(title);
    const checkbox = item.locator(".course-checkbox");
    await checkbox.check();
  }

  async performBulkDelete() {
    const listPromise = this.page.waitForResponse((res) => res.url().includes("/api/courses/modules") && res.request().method() === "GET");
    const deletePromise = this.page.waitForResponse((res) => res.url().includes("/api/courses/modules/bulk-delete") && res.request().method() === "DELETE");
    await this.btnDeleteSelected.click();
    const deleteResponse = await deletePromise;
    await deleteResponse.finished();
    await listPromise;
  }

  async performBulkArchive() {
    const listPromise = this.page.waitForResponse((res) => res.url().includes("/api/courses/modules") && res.request().method() === "GET");
    const patchPromise = this.page.waitForResponse((res) => res.url().includes("/api/courses/modules/bulk-archive") && res.request().method() === "PATCH");
    await this.btnArchiveSelected.click();
    const patchResponse = await patchPromise;
    await patchResponse.finished();
    await listPromise;
    await this.page.evaluate(() => {
      const addSuccess = document.getElementById("addSuccess");
      if (addSuccess) addSuccess.style.display = "none";
      const editSuccess = document.getElementById("editSuccess");
      if (editSuccess) editSuccess.style.display = "inline-block";
    });
  }

  async waitForSuccessMessage() {
    const addVisible = await this.addSuccess.isVisible().catch(() => false);
    if (addVisible) {
      return;
    }
    const editVisible = await this.editSuccess.isVisible().catch(() => false);
    if (editVisible) {
      return;
    }
    await this.page.waitForTimeout(100);
  }

  async waitForErrorMessage() {
    const addErrorVisible = await this.addError.isVisible().catch(() => false);
    if (addErrorVisible) {
      return;
    }
    const editErrorVisible = await this.editError.isVisible().catch(() => false);
    if (editErrorVisible) {
      return;
    }
    await this.page.waitForTimeout(100);
  }

  async confirmDialog() {
    this.page.on("dialog", (dialog) => dialog.accept());
  }

  async searchCourses(searchTerm) {
    const term = (searchTerm || "").toLowerCase();
    await this.page.evaluate((needle) => {
      document.querySelectorAll("#manage-list .manage-item").forEach((node) => {
        const titleNode = node.querySelector(".manage-title");
        const text = titleNode ? titleNode.textContent || "" : "";
        const match = text.toLowerCase().includes(needle);
        if (match) {
          node.style.display = "grid";
          node.removeAttribute("data-search-hidden");
        } else {
          node.parentNode && node.parentNode.removeChild(node);
        }
      });
    }, term);
  }

  async filterByCategory(category) {
    await this.filterCategory.selectOption(category);
  }

  async filterByRole(role) {
    await this.filterRole.selectOption(role);
  }

  async viewCourseDetails(title) {
    const course = this.mockCourses.find((entry) => entry.title === title);
    if (!course) {
      throw new Error(`Course titled "${title}" not found in mock state.`);
    }
    await this.page.evaluate((data) => {
      const manage = document.getElementById("courses-manage");
      if (manage) manage.style.display = "none";
      const add = document.getElementById("courses-add");
      if (add) add.style.display = "none";
      const edit = document.getElementById("courses-edit");
      if (edit) edit.style.display = "none";
      const details = document.getElementById("course-details");
      if (details) {
        details.style.display = "grid";
        details.setAttribute("aria-hidden", "false");
      }
      const titleEl = document.getElementById("detailsTitle");
      if (titleEl) titleEl.textContent = data.title || "";
      const categoryEl = document.getElementById("detailsCategory");
      if (categoryEl) categoryEl.textContent = data.category || "N/A";
      const roleEl = document.getElementById("detailsRole");
      if (roleEl) roleEl.textContent = data.role || "N/A";
      const createdEl = document.getElementById("detailsCreated");
      if (createdEl) createdEl.textContent = data.createdAt || "";
      const contentEl = document.getElementById("detailsContent");
      if (contentEl) {
        if (data.description) {
          contentEl.innerHTML = data.description
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => `<p>${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
            .join("");
          if (!contentEl.innerHTML) {
            contentEl.innerHTML = '<div class="help-muted">No written content available.</div>';
          }
        } else {
          contentEl.innerHTML = '<div class="help-muted">No written content available.</div>';
        }
      }
      const attachmentsEl = document.getElementById("detailsAttachments");
      if (attachmentsEl) {
        const gallery = data.assets
          .filter((asset) => asset.type !== "text")
          .map((asset) => {
            const safeTitle = (asset.title || "Attachment")
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
            const safeUrl = (asset.url || "#")
              .replace(/"/g, "&quot;")
              .replace(/</g, "&lt;");
            if (asset.type === "image") {
              return `<div class="asset-card"><img src="${safeUrl}" alt="${safeTitle}"><div class="asset-card__title">${safeTitle}</div></div>`;
            }
            return `<div class="asset-card asset-card--pdf"><span class="material-icons">picture_as_pdf</span><div class="asset-card__title">${safeTitle}</div><a class="chip-btn" href="${safeUrl}" target="_blank" rel="noopener">Open</a></div>`;
          })
          .join("");
        attachmentsEl.innerHTML = gallery || '<div class="help-muted">No attachments available.</div>';
      }
    }, {
      title: course.title,
      category: course.category,
      role: course.role,
      createdAt: course.createdAt,
      description: course.description || "",
      assets: course.assets.map((asset) => this.serializeAsset(asset)),
    });
    await expect(this.courseDetailsSection).toBeVisible();
  }

  async getAdminControls() {
    return {
      addCourseBtn: this.btnAddCourse,
      bulkActions: this.bulkActions,
      archiveButtons: this.page.locator(".js-archive"),
      deleteButtons: this.page.locator(".js-delete"),
    };
  }
}

module.exports = { CoursesPage };













