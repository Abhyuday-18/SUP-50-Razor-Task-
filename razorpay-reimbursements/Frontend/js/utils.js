// utils.js — Shared helpers

var Utils = (function () {

  // ── Toast ──
  function showToast(message, type) {
    var container = document.getElementById('toastContainer');
    if (!container) return;

    // Cap at 3 toasts
    while (container.children.length >= 3) {
      container.removeChild(container.firstChild);
    }

    var el = document.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' toast-error' : '');
    el.textContent = message;
    container.appendChild(el);

    setTimeout(function () {
      el.style.animation = 'toast-out 200ms ease forwards';
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 200);
    }, 3000);
  }

  // ── Format Amount ──
  function formatAmount(amount) {
    var num = parseFloat(amount);
    if (isNaN(num)) return '₹0.00';
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ── Format Date ──
  function formatDate(isoString) {
    if (!isoString) return '—';
    var d = new Date(isoString);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  // ── Theme ──
  function initThemeToggle() {
    var btn = document.getElementById('themeToggle');
    var icon = document.getElementById('themeIcon');
    if (!btn) return;

    function updateIcon() {
      var isLight = document.documentElement.classList.contains('light');
      icon.innerHTML = isLight ? '&#9728;' : '&#9790;';
    }

    updateIcon();

    btn.addEventListener('click', function () {
      document.documentElement.classList.toggle('light');
      var isLight = document.documentElement.classList.contains('light');
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
      updateIcon();
    });
  }

  // ── Status Badge ──
  function statusBadge(status) {
    var s = (status || '').toUpperCase();
    var cls = 'badge ';
    if (s === 'APPROVED') cls += 'badge-approved';
    else if (s === 'REJECTED') cls += 'badge-rejected';
    else cls += 'badge-pending';
    return '<span class="' + cls + '">' + s + '</span>';
  }

  // ── Role Badge ──
  function roleBadge(role) {
    var r = (role || '').toUpperCase();
    var cls = 'badge badge-' + r.toLowerCase();
    return '<span class="' + cls + '">' + r + '</span>';
  }

  // ── Escape HTML ──
  function esc(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  return {
    showToast: showToast,
    formatAmount: formatAmount,
    formatDate: formatDate,
    initThemeToggle: initThemeToggle,
    statusBadge: statusBadge,
    roleBadge: roleBadge,
    esc: esc
  };
})();
