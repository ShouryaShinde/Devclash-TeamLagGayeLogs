/**
 * login.js — Client-side validation and UX enhancements for login & register forms.
 */
document.addEventListener("DOMContentLoaded", () => {
  // ─── Password visibility toggle ─────────────────────────────
  const toggleBtn = document.getElementById("togglePassword");
  const toggleIcon = document.getElementById("togglePasswordIcon");
  const passwordInput = document.getElementById("passwordInput");

  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener("click", () => {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      toggleIcon.classList.toggle("bi-eye", isPassword);
      toggleIcon.classList.toggle("bi-eye-slash", !isPassword);
    });
  }

  // ─── Helper: show / clear validation errors ─────────────────
  function showError(input, errorEl) {
    input.classList.add("is-invalid");
    if (errorEl) errorEl.style.display = "block";
  }

  function clearError(input, errorEl) {
    input.classList.remove("is-invalid");
    if (errorEl) errorEl.style.display = "none";
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ─── LOGIN form validation ──────────────────────────────────
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    const emailInput = document.getElementById("emailInput");
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");
    const loginBtn = document.getElementById("loginBtn");
    const loginBtnText = document.getElementById("loginBtnText");
    const loginBtnSpinner = document.getElementById("loginBtnSpinner");

    // Clear errors on input
    emailInput.addEventListener("input", () => clearError(emailInput, emailError));
    passwordInput.addEventListener("input", () => clearError(passwordInput, passwordError));

    loginForm.addEventListener("submit", (e) => {
      let valid = true;

      if (!emailInput.value.trim() || !isValidEmail(emailInput.value.trim())) {
        showError(emailInput, emailError);
        valid = false;
      }

      if (!passwordInput.value) {
        showError(passwordInput, passwordError);
        valid = false;
      }

      if (!valid) {
        e.preventDefault();
        return;
      }

      // Show loading state
      loginBtn.disabled = true;
      loginBtnText.textContent = "Signing in…";
      loginBtnSpinner.classList.remove("d-none");
    });
  }

  // ─── REGISTER form validation ───────────────────────────────
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    const nameInput = document.getElementById("nameInput");
    const emailInput = document.getElementById("emailInput");
    const confirmInput = document.getElementById("confirmPasswordInput");
    const nameError = document.getElementById("nameError");
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");
    const confirmError = document.getElementById("confirmPasswordError");
    const registerBtn = document.getElementById("registerBtn");
    const registerBtnText = document.getElementById("registerBtnText");
    const registerBtnSpinner = document.getElementById("registerBtnSpinner");

    // Clear errors on input
    nameInput.addEventListener("input", () => clearError(nameInput, nameError));
    emailInput.addEventListener("input", () => clearError(emailInput, emailError));
    passwordInput.addEventListener("input", () => clearError(passwordInput, passwordError));
    confirmInput.addEventListener("input", () => clearError(confirmInput, confirmError));

    registerForm.addEventListener("submit", (e) => {
      let valid = true;

      if (!nameInput.value.trim()) {
        showError(nameInput, nameError);
        valid = false;
      }

      if (!emailInput.value.trim() || !isValidEmail(emailInput.value.trim())) {
        showError(emailInput, emailError);
        valid = false;
      }

      if (!passwordInput.value || passwordInput.value.length < 6) {
        showError(passwordInput, passwordError);
        valid = false;
      }

      if (confirmInput.value !== passwordInput.value) {
        showError(confirmInput, confirmError);
        valid = false;
      }

      if (!valid) {
        e.preventDefault();
        return;
      }

      // Show loading state
      registerBtn.disabled = true;
      registerBtnText.textContent = "Creating account…";
      registerBtnSpinner.classList.remove("d-none");
    });
  }

  // ─── Auto-dismiss server error alert ────────────────────────
  const serverError = document.getElementById("serverError");
  if (serverError) {
    setTimeout(() => {
      serverError.style.transition = "opacity 0.5s ease";
      serverError.style.opacity = "0";
      setTimeout(() => serverError.remove(), 500);
    }, 5000);
  }
});
