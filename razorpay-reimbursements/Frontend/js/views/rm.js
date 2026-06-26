// views/rm.js — RM dashboard views

var RmViews = (function () {
  function registerViews() {
    Router.register('rm-pending', renderPending, 'Pending Approvals');
    Router.register('rm-team', renderTeam, 'My Team');
  }

  // ── Pending Approvals ──
  function renderPending() {
    var body = document.getElementById('contentBody');
    body.innerHTML = '<div class="table-container" id="rmTableWrap">Loading\u2026</div>';

    API.getReimbursements()
      .then(function (res) {
        var list = res.data.reimbursements || [];
        var wrap = document.getElementById('rmTableWrap');
        if (!list.length) {
          wrap.innerHTML = '<div class="empty-state">No pending approvals.</div>';
          return;
        }
        renderApprovalTable(wrap, list, 'rm');
      })
      .catch(function (err) {
        document.getElementById('rmTableWrap').innerHTML =
          '<div class="empty-state" style="color:var(--danger)">' + Utils.esc(err.message) + '</div>';
      });
  }

  // ── My Team ──
  function renderTeam() {
    var body = document.getElementById('contentBody');
    body.innerHTML = '<div class="table-container" id="rmTeamWrap">Loading\u2026</div>';

    API.getEmployees()
      .then(function (res) {
        var list = res.data.users || [];
        var wrap = document.getElementById('rmTeamWrap');
        if (!list.length) {
          wrap.innerHTML = '<div class="empty-state">No team members found.</div>';
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
        document.getElementById('rmTeamWrap').innerHTML =
          '<div class="empty-state" style="color:var(--danger)">' + Utils.esc(err.message) + '</div>';
      });
  }

  return { registerViews: registerViews };
})();

// ── Shared Approval Table (used by RM and APE) ──
function renderApprovalTable(container, list, rolePrefix) {
  var html = '<table class="data-table"><thead><tr>' +
    '<th>Title</th><th>Description</th><th>Amount</th><th>Status</th><th>Actions</th>' +
    '</tr></thead><tbody>';

  for (var i = 0; i < list.length; i++) {
    var r = list[i];
    var rowId = rolePrefix + '-row-' + i;
    html += '<tr id="' + rowId + '">' +
      '<td>' + Utils.esc(r.title) + '</td>' +
      '<td class="desc-cell">' + Utils.esc(r.description || '—') + '</td>' +
      '<td class="amount-cell">' + Utils.formatAmount(r.amount) + '</td>' +
      '<td>' + Utils.statusBadge(r.status) + '</td>' +
      '<td class="actions">' +
        '<button class="btn btn-sm btn-outline-success" data-action="APPROVED" data-rid="' + Utils.esc(r.reimbursementId) + '" data-uid="' + Utils.esc(r.userId || '') + '" data-row="' + rowId + '">Approve</button>' +
        '<button class="btn btn-sm btn-outline-danger" data-action="REJECTED" data-rid="' + Utils.esc(r.reimbursementId) + '" data-uid="' + Utils.esc(r.userId || '') + '" data-row="' + rowId + '">Reject</button>' +
      '</td>' +
      '</tr>' +
      '<tr id="' + rowId + '-confirm" style="display:none"><td colspan="5"></td></tr>';
  }
  html += '</tbody></table>';
  container.innerHTML = html;

  // Attach click handlers
  container.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;

    var action = btn.getAttribute('data-action');
    var rid = btn.getAttribute('data-rid');
    var uid = btn.getAttribute('data-uid');
    var rowId = btn.getAttribute('data-row');
    var confirmRow = document.getElementById(rowId + '-confirm');
    if (!confirmRow) return;

    var actionLabel = action === 'APPROVED' ? 'Approve' : 'Reject';
    confirmRow.style.display = '';
    confirmRow.querySelector('td').innerHTML =
      '<div class="inline-confirm">' +
        '<span class="confirm-text">' + actionLabel + ' this reimbursement?</span>' +
        '<button class="btn btn-sm btn-outline-success confirm-yes">Confirm</button>' +
        '<button class="btn btn-sm btn-ghost confirm-no">Cancel</button>' +
      '</div>';

    var yesBtn = confirmRow.querySelector('.confirm-yes');
    var noBtn = confirmRow.querySelector('.confirm-no');

    noBtn.addEventListener('click', function () {
      confirmRow.style.display = 'none';
    });

    yesBtn.addEventListener('click', function () {
      yesBtn.disabled = true;
      yesBtn.textContent = 'Processing\u2026';

      API.updateReimbursement(uid, rid, action)
        .then(function () {
          Utils.showToast('Reimbursement ' + action.toLowerCase(), 'success');
          // Re-render the current view
          Router.navigateTo(Router.getCurrent());
        })
        .catch(function (err) {
          Utils.showToast(err.message, 'error');
          confirmRow.style.display = 'none';
        });
    });
  });
}
