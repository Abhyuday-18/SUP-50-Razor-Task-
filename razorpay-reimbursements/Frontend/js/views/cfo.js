// views/cfo.js — CFO dashboard views

var CfoViews = (function () {
  function registerViews() {
    Router.register('cfo-audit', renderAudit, 'Audit Log');
    Router.register('cfo-employees', renderEmployees, 'All Employees');
    Router.register('cfo-assign-role', renderAssignRole, 'Assign Role');
    Router.register('cfo-assign-mgr', renderAssignManager, 'Assign Manager');
    Router.register('cfo-remove', renderRemoveAssignment, 'Remove Assignment');
  }

  // ── Audit Log ──
  function renderAudit() {
    var body = document.getElementById('contentBody');
    body.innerHTML = '<div class="table-container" id="cfoAuditWrap">Loading\u2026</div>';

    API.getReimbursements()
      .then(function (res) {
        var list = res.data.reimbursements || [];
        var wrap = document.getElementById('cfoAuditWrap');
        if (!list.length) {
          wrap.innerHTML = '<div class="empty-state">No records found.</div>';
          return;
        }
        var html = '<table class="data-table"><thead><tr>' +
          '<th>Title</th><th>Amount</th><th>Status</th>' +
          '</tr></thead><tbody>';
        for (var i = 0; i < list.length; i++) {
          var r = list[i];
          html += '<tr>' +
            '<td>' + Utils.esc(r.title) + '</td>' +
            '<td class="amount-cell">' + Utils.formatAmount(r.amount) + '</td>' +
            '<td>' + Utils.statusBadge(r.status) + '</td>' +
            '</tr>';
        }
        html += '</tbody></table>';
        wrap.innerHTML = html;
      })
      .catch(function (err) {
        document.getElementById('cfoAuditWrap').innerHTML =
          '<div class="empty-state" style="color:var(--danger)">' + Utils.esc(err.message) + '</div>';
      });
  }

  // ── All Employees ──
  function renderEmployees() {
    var body = document.getElementById('contentBody');
    body.innerHTML = '<div class="table-container" id="cfoEmpWrap">Loading\u2026</div>';

    API.getEmployees()
      .then(function (res) {
        var list = res.data.users || [];
        var wrap = document.getElementById('cfoEmpWrap');
        if (!list.length) {
          wrap.innerHTML = '<div class="empty-state">No employees found.</div>';
          return;
        }
        var html = '<table class="data-table"><thead><tr>' +
          '<th>Name</th><th>Email</th><th>Role</th>' +
          '</tr></thead><tbody>';
        for (var i = 0; i < list.length; i++) {
          var u = list[i];
          html += '<tr>' +
            '<td>' + Utils.esc(u.name) + '</td>' +
            '<td>' + Utils.esc(u.email) + '</td>' +
            '<td>' + Utils.roleBadge(u.role) + '</td>' +
            '</tr>';
        }
        html += '</tbody></table>';
        wrap.innerHTML = html;
      })
      .catch(function (err) {
        document.getElementById('cfoEmpWrap').innerHTML =
          '<div class="empty-state" style="color:var(--danger)">' + Utils.esc(err.message) + '</div>';
      });
  }

  // ── Assign Role ──
  function renderAssignRole() {
    var body = document.getElementById('contentBody');
    body.innerHTML =
      '<div class="view-form">' +
        '<form id="cfoRoleForm" autocomplete="off">' +
          '<div class="form-group">' +
            '<label class="form-label" for="roleUserId">User ID</label>' +
            '<input class="form-input" type="text" id="roleUserId" required>' +
            '<span class="form-error" id="roleUserIdError"></span>' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label" for="roleSelect">Role</label>' +
            '<select class="form-input form-select" id="roleSelect" required>' +
              '<option value="">Select role</option>' +
              '<option value="EMP">EMP</option>' +
              '<option value="RM">RM</option>' +
              '<option value="APE">APE</option>' +
            '</select>' +
            '<span class="form-error" id="roleSelectError"></span>' +
          '</div>' +
          '<button class="btn btn-primary" type="submit" id="roleSubmitBtn">Assign Role</button>' +
          '<p class="view-form-error" id="roleFormError"></p>' +
        '</form>' +
      '</div>';

    document.getElementById('cfoRoleForm').addEventListener('submit', function (e) {
      e.preventDefault();
      document.getElementById('roleUserIdError').textContent = '';
      document.getElementById('roleSelectError').textContent = '';
      document.getElementById('roleFormError').textContent = '';

      var userId = document.getElementById('roleUserId').value.trim();
      var role = document.getElementById('roleSelect').value;
      var btn = document.getElementById('roleSubmitBtn');

      if (!userId) { document.getElementById('roleUserIdError').textContent = 'User ID is required'; return; }
      if (!role) { document.getElementById('roleSelectError').textContent = 'Select a role'; return; }

      btn.disabled = true;
      btn.textContent = 'Assigning\u2026';

      API.assignRole(userId, role)
        .then(function () {
          Utils.showToast('Role assigned successfully', 'success');
          document.getElementById('cfoRoleForm').reset();
        })
        .catch(function (err) {
          document.getElementById('roleFormError').textContent = err.message;
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = 'Assign Role';
        });
    });
  }

  // ── Assign Manager ──
  function renderAssignManager() {
    var body = document.getElementById('contentBody');
    body.innerHTML =
      '<div class="view-form">' +
        '<form id="cfoMgrForm" autocomplete="off">' +
          '<div class="form-group">' +
            '<label class="form-label" for="mgrEmpId">Employee ID</label>' +
            '<input class="form-input" type="text" id="mgrEmpId" required>' +
            '<span class="form-error" id="mgrEmpIdError"></span>' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label" for="mgrRmId">Manager ID</label>' +
            '<input class="form-input" type="text" id="mgrRmId" required>' +
            '<span class="form-error" id="mgrRmIdError"></span>' +
          '</div>' +
          '<button class="btn btn-primary" type="submit" id="mgrSubmitBtn">Assign Manager</button>' +
          '<p class="view-form-error" id="mgrFormError"></p>' +
        '</form>' +
      '</div>';

    document.getElementById('cfoMgrForm').addEventListener('submit', function (e) {
      e.preventDefault();
      document.getElementById('mgrEmpIdError').textContent = '';
      document.getElementById('mgrRmIdError').textContent = '';
      document.getElementById('mgrFormError').textContent = '';

      var empId = document.getElementById('mgrEmpId').value.trim();
      var rmId = document.getElementById('mgrRmId').value.trim();
      var btn = document.getElementById('mgrSubmitBtn');

      if (!empId) { document.getElementById('mgrEmpIdError').textContent = 'Employee ID is required'; return; }
      if (!rmId) { document.getElementById('mgrRmIdError').textContent = 'Manager ID is required'; return; }

      btn.disabled = true;
      btn.textContent = 'Assigning\u2026';

      API.assignManager(empId, rmId)
        .then(function () {
          Utils.showToast('Manager assigned successfully', 'success');
          document.getElementById('cfoMgrForm').reset();
        })
        .catch(function (err) {
          document.getElementById('mgrFormError').textContent = err.message;
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = 'Assign Manager';
        });
    });
  }

  // ── Remove Assignment ──
  function renderRemoveAssignment() {
    var body = document.getElementById('contentBody');
    body.innerHTML =
      '<div class="view-form">' +
        '<form id="cfoRemoveForm" autocomplete="off">' +
          '<div class="form-group">' +
            '<label class="form-label" for="rmvEmpId">Employee ID</label>' +
            '<input class="form-input" type="text" id="rmvEmpId" required>' +
            '<span class="form-error" id="rmvEmpIdError"></span>' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label" for="rmvRmId">Manager ID</label>' +
            '<input class="form-input" type="text" id="rmvRmId" required>' +
            '<span class="form-error" id="rmvRmIdError"></span>' +
          '</div>' +
          '<button class="btn btn-primary" type="submit" id="rmvSubmitBtn">Remove Assignment</button>' +
          '<p class="view-form-error" id="rmvFormError"></p>' +
        '</form>' +
      '</div>';

    document.getElementById('cfoRemoveForm').addEventListener('submit', function (e) {
      e.preventDefault();
      document.getElementById('rmvEmpIdError').textContent = '';
      document.getElementById('rmvRmIdError').textContent = '';
      document.getElementById('rmvFormError').textContent = '';

      var empId = document.getElementById('rmvEmpId').value.trim();
      var rmId = document.getElementById('rmvRmId').value.trim();
      var btn = document.getElementById('rmvSubmitBtn');

      if (!empId) { document.getElementById('rmvEmpIdError').textContent = 'Employee ID is required'; return; }
      if (!rmId) { document.getElementById('rmvRmIdError').textContent = 'Manager ID is required'; return; }

      btn.disabled = true;
      btn.textContent = 'Removing\u2026';

      API.removeAssignment(empId, rmId)
        .then(function () {
          Utils.showToast('Assignment removed successfully', 'success');
          document.getElementById('cfoRemoveForm').reset();
        })
        .catch(function (err) {
          document.getElementById('rmvFormError').textContent = err.message;
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = 'Remove Assignment';
        });
    });
  }

  return { registerViews: registerViews };
})();
