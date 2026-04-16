function validarCredenciales(usuario, password) {
  const userOk = usuario === "Techsource";
  const passOk = password === "Techcsource.2026#" || password === "Techsource.2026#";
  return userOk && passOk;
}

function hacerLogin() {
  const usuario = document.getElementById("usuario-admin").value.trim();
  const password = document.getElementById("password-admin").value.trim();
  const errorEl = document.getElementById("login-error");

  if (validarCredenciales(usuario, password)) {
    loginAdmin();
    window.location.href = "admin.html";
    return;
  }

  if (errorEl) {
    errorEl.style.display = "block";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (isLoggedIn()) {
    window.location.href = "admin.html";
    return;
  }

  document.getElementById("btn-login-admin")?.addEventListener("click", hacerLogin);

  document.getElementById("password-admin")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      hacerLogin();
    }
  });

  document.getElementById("usuario-admin")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      hacerLogin();
    }
  });
});