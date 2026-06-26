// router.js — Client-side view switcher

var Router = (function () {
  var views = {};
  var currentView = null;

  function register(name, renderFn, title) {
    views[name] = { render: renderFn, title: title || name };
  }

  function navigateTo(name) {
    if (!views[name]) return;

    // Update sidebar active state
    var links = document.querySelectorAll('.sidebar-link');
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      if (link.getAttribute('data-view') === name) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    }

    // Update header title
    var titleEl = document.getElementById('viewTitle');
    if (titleEl) titleEl.textContent = views[name].title;

    // Render view
    currentView = name;
    views[name].render();
  }

  function getCurrent() {
    return currentView;
  }

  return {
    register: register,
    navigateTo: navigateTo,
    getCurrent: getCurrent
  };
})();
