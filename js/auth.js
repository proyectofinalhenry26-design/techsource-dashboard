function isLoggedIn() {
  return localStorage.getItem("ts_admin_logged") === "true";
}

function loginAdmin() {
  localStorage.setItem("ts_admin_logged", "true");
}

function logoutAdmin() {
  localStorage.removeItem("ts_admin_logged");
}

function requireAdmin() {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
  }
}