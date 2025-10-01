// public/components/sidebar.js
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
}

function loadSidebar() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/";
    return;
  }

  const user = parseJwt(token);
  if (!user) {
    window.location.href = "/";
    return;
  }

  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  // Sidebar structure
  sidebar.innerHTML = `
    <div class="logo">
      <img src="/img/logo.png" alt="Logo">
    </div>
    <ul id="menuList"></ul>
  `;

  const menuList = sidebar.querySelector("#menuList");
  let menuItems = [];

  if (user.role === "admin") {
    menuItems = [
      { name: "Dashboard", icon: "dashboard", url: "/dashboard.html" },
      { name: "Notifications", icon: "notifications", url: "/notifications.html" },
      { name: "Courses", icon: "school", url: "/courses.html" },
      { name: "Users", icon: "group", url: "/user.html" },
      { name: "Review Request", icon: "assignment", url: "/review-request.html" },
      { name: "Manage Jobs", icon: "settings", url: "/manage-jobs.html" },
      { name: "Manage Category", icon: "settings", url: "/category-manage.html" }
    ];
  } else if (user.role === "employer") {
    menuItems = [
      { name: "Dashboard", icon: "dashboard", url: "/employer-dashboard.html" },
      { name: "Job Management", icon: "work", url: "" },
      { name: "Notifications", icon: "notifications", url: "/notifications.html" },
      { name: "Courses", icon: "school", url: "/courses.html" },
      { name: "Job Post", icon: "post_add", url: "/job-post.html" } 
    ];
  } else {
    menuItems = [
      { name: "Dashboard", icon: "dashboard", url: "/job-seeker-dashboard.html" },
      { name: "Jobs", icon: "work", url: "/jobs.html" },
      { name: "Notifications", icon: "notifications", url: "/notifications.html" },
      { name: "Courses", icon: "school", url: "/courses.html" },
      { name: "Job Preferences", icon: "thumb_up", url: "/job-preferences.html" },
      { name: "Job Matches", icon: "merge_type", url: "/job-matches.html" },
    ];
  }

  menuList.innerHTML = menuItems
    .map(item => `
      <li>
        <a href="${item.url}">
          <i class="material-icons">${item.icon}</i>
          ${item.name}
        </a>
      </li>
    `)
    .join("");
}