// api.js — Centralized fetch calls to the backend

var API = (function () {
  // TODO: Replace 'https://your-backend-url.onrender.com' with your actual Render backend URL
  var BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:7002'
    : 'https://rbac-checker.onrender.com';

  function request(method, path, body) {
    var opts = {
      method: method,
      credentials: 'include',
      headers: {}
    };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch(BASE + path, opts).then(function (res) {
      if (res.status === 401) {
        window.location.href = 'index.html';
        return Promise.reject(new Error('Unauthorized'));
      }
      return res.json().then(function (data) {
        if (res.ok) return data;
        var msg = (data && data.message) || 'Something went wrong';
        return Promise.reject(new Error(msg));
      });
    });
  }

  return {
    register: function (name, email, password) {
      return request('POST', '/rest/onboardings/register', { name: name, email: email, password: password });
    },
    login: function (email, password) {
      return request('POST', '/rest/onboardings/login', { email: email, password: password });
    },
    logout: function () {
      return request('POST', '/rest/onboardings/logout');
    },
    assignRole: function (userId, role) {
      return request('POST', '/rest/roles/assign', { userId: userId, role: role });
    },
    getEmployees: function () {
      return request('GET', '/rest/employees');
    },
    assignManager: function (empId, rmId) {
      return request('POST', '/rest/employees/assign', { empId: empId, rmId: rmId });
    },
    removeAssignment: function (empId, rmId) {
      return request('DELETE', '/rest/employees/assign', { empId: empId, rmId: rmId });
    },
    createReimbursement: function (title, description, amount) {
      return request('POST', '/rest/reimbursements', { title: title, description: description, amount: amount });
    },
    getReimbursements: function () {
      return request('GET', '/rest/reimbursements');
    },
    getReimbursementsByUser: function (userId) {
      return request('GET', '/rest/reimbursements/' + userId);
    },
    updateReimbursement: function (userId, reimbursementId, status) {
      return request('PATCH', '/rest/reimbursements', { userId: userId, reimbursementId: reimbursementId, status: status });
    }
  };
})();
