// auth.js — Login, register, logout logic for index.html

(function () {
  var tabSignIn = document.getElementById('tabSignIn');
  var tabRegister = document.getElementById('tabRegister');
  var signInForm = document.getElementById('signInForm');
  var registerForm = document.getElementById('registerForm');

  // ── Tab Switching ──
  tabSignIn.addEventListener('click', function () {
    tabSignIn.classList.add('active');
    tabRegister.classList.remove('active');
    signInForm.classList.add('visible');
    registerForm.classList.remove('visible');
    clearErrors();
  });

  tabRegister.addEventListener('click', function () {
    tabRegister.classList.add('active');
    tabSignIn.classList.remove('active');
    registerForm.classList.add('visible');
    signInForm.classList.remove('visible');
    clearErrors();
  });

  function clearErrors() {
    var errs = document.querySelectorAll('.form-error, .auth-form-error');
    for (var i = 0; i < errs.length; i++) errs[i].textContent = '';
  }

  // ── Sign In ──
  signInForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();

    var email = document.getElementById('loginEmail').value.trim();
    var password = document.getElementById('loginPassword').value;
    var btn = document.getElementById('loginBtn');

    if (!email) {
      document.getElementById('loginEmailError').textContent = 'Email is required';
      return;
    }
    if (!password) {
      document.getElementById('loginPasswordError').textContent = 'Password is required';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Signing in\u2026';

    API.login(email, password)
      .then(function (res) {
        var d = res.data;
        localStorage.setItem('user', JSON.stringify({
          userId: d.userId,
          name: d.name,
          email: d.email,
          role: d.role
        }));
        window.location.href = 'dashboard.html';
      })
      .catch(function (err) {
        document.getElementById('loginError').textContent = err.message;
        btn.disabled = false;
        btn.textContent = 'Sign in';
      });
  });

  // ── Register ──
  registerForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();

    var name = document.getElementById('regName').value.trim();
    var email = document.getElementById('regEmail').value.trim();
    var password = document.getElementById('regPassword').value;
    var btn = document.getElementById('registerBtn');

    if (!name) {
      document.getElementById('regNameError').textContent = 'Name is required';
      return;
    }
    if (!email) {
      document.getElementById('regEmailError').textContent = 'Email is required';
      return;
    }
    if (!password) {
      document.getElementById('regPasswordError').textContent = 'Password is required';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Registering\u2026';

    API.register(name, email, password)
      .then(function () {
        // Switch to sign-in tab after successful registration
        tabSignIn.click();
        document.getElementById('loginEmail').value = email;
        document.getElementById('loginPassword').focus();
        // Show a small inline success hint
        document.getElementById('loginError').style.color = 'var(--success)';
        document.getElementById('loginError').textContent = 'Account created. Sign in to continue.';
      })
      .catch(function (err) {
        document.getElementById('registerError').textContent = err.message;
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = 'Register';
      });
  });

  // ── Theme Toggle ──
  Utils.initThemeToggle();
})();
