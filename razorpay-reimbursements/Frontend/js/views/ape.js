// views/ape.js — APE dashboard views

var ApeViews = (function () {
  function registerViews() {
    Router.register('ape-pending', renderPending, 'Pending Approvals');
    Router.register('ape-employees', renderEmployees, 'All Employees');
  }

  // ── Pending Approvals ──
  function renderPending() {
    var body = document.getElementById('contentBody');
    body.innerHTML = '<div class="table-container" id="apeTableWrap">Loading\u2026</div>';

    API.getReimbursements()
      .then(function (res) {
        var list = res.data.reimbursements || [];
        var wrap = document.getElementById('apeTableWrap');
        if (!list.length) {
          wrap.innerHTML = '<div class="empty-state">No pending approvals.</div>';
          return;
        }
        renderApprovalTable(wrap, list, 'ape');
      })
      .catch(function (err) {
        document.getElementById('apeTableWrap').innerHTML =
          '<div class="empty-state" style="color:var(--danger)">' + Utils.esc(err.message) + '</div>';
      });
  }

  // ── All Employees ──
  function renderEmployees() {
    var body = document.getElementById('contentBody');
    body.innerHTML = '<div class="table-container" id="apeEmpWrap">Loading\u2026</div>';

    API.getEmployees()
      .then(function (res) {
        var list = res.data.users || [];
        var wrap = document.getElementById('apeEmpWrap');
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
        document.getElementById('apeEmpWrap').innerHTML =
          '<div class="empty-state" style="color:var(--danger)">' + Utils.esc(err.message) + '</div>';
      });
  }

  return { registerViews: registerViews };
})();
