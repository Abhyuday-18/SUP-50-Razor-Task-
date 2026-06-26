// dashboard.js — Dashboard shell, sidebar, role detection

(function () {
  // ── Read user from localStorage ──
  var userStr = localStorage.getItem('user');
  if (!userStr) {
    window.location.href = 'index.html';
    return;
  }

  var user;
  try {
    user = JSON.parse(userStr);
  } catch (e) {
    window.location.href = 'index.html';
    return;
  }

  if (!user || !user.role) {
    window.location.href = 'index.html';
    return;
  }

  // ── Validate session by calling backend ──
  API.getReimbursements()
    .catch(function () {
      // 401 is handled inside api.js (redirects to index.html)
      // Other errors are non-fatal — the user is still logged in
    });

  // ── Populate user info ──
  var nameEl = document.getElementById('userName');
  var badgeEl = document.getElementById('userBadge');
  nameEl.textContent = user.name || user.email;
  badgeEl.className = 'badge badge-' + (user.role || 'emp').toLowerCase();
  badgeEl.textContent = user.role;

  // ── Sign out ──
  document.getElementById('signOutBtn').addEventListener('click', function () {
    API.logout()
      .then(function () {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
      })
      .catch(function () {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
      });
  });

  // ── Theme toggle ──
  Utils.initThemeToggle();

  // ── Define nav links per role ──
  var navConfig = {
    EMP: [
      { view: 'emp-reimbursements', label: 'My Reimbursements' },
      { view: 'emp-submit', label: 'Submit Request' }
    ],
    RM: [
      { view: 'rm-pending', label: 'Pending Approvals' },
      { view: 'rm-team', label: 'My Team' }
    ],
    APE: [
      { view: 'ape-pending', label: 'Pending Approvals' },
      { view: 'ape-employees', label: 'All Employees' }
    ],
    CFO: [
      { view: 'cfo-audit', label: 'Audit Log' },
      { view: 'cfo-employees', label: 'All Employees' },
      { view: 'cfo-assign-role', label: 'Assign Role' },
      { view: 'cfo-assign-mgr', label: 'Assign Manager' },
      { view: 'cfo-remove', label: 'Remove Assignment' }
    ]
  };

  // ── Register all views ──
  EmpViews.registerViews();
  RmViews.registerViews();
  ApeViews.registerViews();
  CfoViews.registerViews();

  // ── Build sidebar nav ──
  var role = (user.role || '').toUpperCase();
  var links = navConfig[role] || navConfig.EMP;
  var navEl = document.getElementById('sidebarNav');
  var html = '';
  for (var i = 0; i < links.length; i++) {
    html += '<a class="sidebar-link" data-view="' + links[i].view + '">' + links[i].label + '</a>';
  }
  navEl.innerHTML = html;

  // ── Sidebar click handler ──
  navEl.addEventListener('click', function (e) {
    var link = e.target.closest('.sidebar-link');
    if (!link) return;
    var view = link.getAttribute('data-view');
    if (view) Router.navigateTo(view);
  });

  // ── Navigate to default view ──
  if (links.length) {
    Router.navigateTo(links[0].view);
  }
})();
