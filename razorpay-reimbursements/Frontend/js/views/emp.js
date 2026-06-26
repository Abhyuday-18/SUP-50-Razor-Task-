// views/emp.js — EMP dashboard views

var EmpViews = (function () {
  function registerViews() {
    Router.register('emp-reimbursements', renderMyReimbursements, 'My Reimbursements');
    Router.register('emp-submit', renderSubmitRequest, 'Submit Request');
  }

  // ── My Reimbursements ──
  function renderMyReimbursements() {
    var body = document.getElementById('contentBody');
    body.innerHTML = '<div class="table-container" id="empTableWrap">Loading\u2026</div>';

    API.getReimbursements()
      .then(function (res) {
        var list = res.data.reimbursements || [];
        var wrap = document.getElementById('empTableWrap');
        if (!list.length) {
          wrap.innerHTML = '<div class="empty-state">No reimbursements yet.</div>';
          return;
        }
        var html = '<table class="data-table"><thead><tr>' +
          '<th>Title</th><th>Description</th><th>Amount</th><th>Status</th>' +
          '</tr></thead><tbody>';
        for (var i = 0; i < list.length; i++) {
          var r = list[i];
          html += '<tr>' +
            '<td>' + Utils.esc(r.title) + '</td>' +
            '<td class="desc-cell">' + Utils.esc(r.description || '—') + '</td>' +
            '<td class="amount-cell">' + Utils.formatAmount(r.amount) + '</td>' +
            '<td>' + Utils.statusBadge(r.status) + '</td>' +
            '</tr>';
        }
        html += '</tbody></table>';
        wrap.innerHTML = html;
      })
      .catch(function (err) {
        document.getElementById('empTableWrap').innerHTML =
          '<div class="empty-state" style="color:var(--danger)">' + Utils.esc(err.message) + '</div>';
      });
  }

  // ── Submit Request ──
  function renderSubmitRequest() {
    var body = document.getElementById('contentBody');
    body.innerHTML =
      '<div class="view-form">' +
        '<form id="empSubmitForm" autocomplete="off">' +
          '<div class="form-group">' +
            '<label class="form-label" for="riTitle">Title</label>' +
            '<input class="form-input" type="text" id="riTitle" required>' +
            '<span class="form-error" id="riTitleError"></span>' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label" for="riDesc">Description</label>' +
            '<textarea class="form-input form-textarea" id="riDesc" rows="4"></textarea>' +
            '<span class="form-error" id="riDescError"></span>' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label" for="riAmount">Amount</label>' +
            '<input class="form-input" type="number" id="riAmount" min="0.01" step="0.01" required>' +
            '<span class="form-error" id="riAmountError"></span>' +
          '</div>' +
          '<button class="btn btn-primary" type="submit" id="riSubmitBtn">Submit Request</button>' +
          '<p class="view-form-error" id="riFormError"></p>' +
        '</form>' +
      '</div>';

    document.getElementById('empSubmitForm').addEventListener('submit', function (e) {
      e.preventDefault();
      // Clear errors
      document.getElementById('riTitleError').textContent = '';
      document.getElementById('riDescError').textContent = '';
      document.getElementById('riAmountError').textContent = '';
      document.getElementById('riFormError').textContent = '';

      var title = document.getElementById('riTitle').value.trim();
      var desc = document.getElementById('riDesc').value.trim();
      var amount = document.getElementById('riAmount').value;
      var btn = document.getElementById('riSubmitBtn');

      if (!title) { document.getElementById('riTitleError').textContent = 'Title is required'; return; }
      if (!amount || parseFloat(amount) <= 0) { document.getElementById('riAmountError').textContent = 'Enter a valid positive amount'; return; }

      btn.disabled = true;
      btn.textContent = 'Submitting\u2026';

      API.createReimbursement(title, desc, parseFloat(amount))
        .then(function () {
          Utils.showToast('Reimbursement submitted successfully', 'success');
          Router.navigateTo('emp-reimbursements');
        })
        .catch(function (err) {
          document.getElementById('riFormError').textContent = err.message;
          btn.disabled = false;
          btn.textContent = 'Submit Request';
        });
    });
  }

  return { registerViews: registerViews };
})();
