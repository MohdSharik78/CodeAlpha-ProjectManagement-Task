const API_URL = "http://localhost:5001/api";

function saveSession(data) {
  localStorage.setItem("pm_token", data.token);
  localStorage.setItem("pm_user", JSON.stringify(data.user));
}

function getToken() {
  return localStorage.getItem("pm_token");
}

async function submitAuth(url, payload) {
  const response = await fetch(`${API_URL}${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}


// =========================
// LOGIN
// =========================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

  if (getToken()) {
    window.location.href = "index.html";
  }

  loginForm.addEventListener("submit", async function (e) {

    e.preventDefault();

    const message = document.getElementById("message");

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    message.textContent = "Signing in...";
    message.className = "form-message";

    try {

      const data = await submitAuth("/auth/login", {
        email: emailInput.value.trim(),
        password: passwordInput.value
      });

      saveSession(data);

      window.location.href = "index.html";

    } catch (error) {

      message.textContent = error.message;
      message.className = "form-message error";
    }
  });
}


// =========================
// REGISTER
// =========================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

  registerForm.addEventListener("submit", async function (e) {

    e.preventDefault();

    const message = document.getElementById("message");

    const nameInput = document.getElementById("name");
    const usernameInput = document.getElementById("username");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    message.textContent = "Creating account...";
    message.className = "form-message";

    try {

      const data = await submitAuth("/auth/register", {
        name: nameInput.value.trim(),
        username: usernameInput.value.trim(),
        email: emailInput.value.trim(),
        password: passwordInput.value
      });

      saveSession(data);

      window.location.href = "index.html";

    } catch (error) {

      message.textContent = error.message;
      message.className = "form-message error";
    }
  });
}