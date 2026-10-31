// РЕЄСТРАЦІЯ, ВХІД, ВИХІД, ПЕРЕВІРКА ПРАВ
const ROLE_PAGES = { user: "dashboard.html", admin: "admin.html", manager: "manager.html" };

function showMsg(el, text, type = "error") {
  if (!el) return;
  el.textContent = text;
  el.className = "msg " + type;
  el.hidden = false;
}

// Профіль поточного користувача (null, якщо не увійшов)
async function getCurrentProfile() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabaseClient
    .from("profiles").select("*").eq("id", session.user.id).single();
  return error ? null : data;
}

// Пускає на сторінку лише дозволені ролі, інших перенаправляє
async function requireAuth(allowedRoles) {
  const profile = await getCurrentProfile();
  if (!profile) { window.location.href = "index.html"; return null; }
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    window.location.href = ROLE_PAGES[profile.role] || "index.html";
    return null;
  }
  return profile;
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}
document.querySelectorAll("[data-logout]").forEach(b => b.addEventListener("click", logout));

// ---- Сторінка входу ----
const loginForm = document.getElementById("login-form");
if (loginForm) {
  // Відновлення сесії: якщо вже увійшов — одразу в свій кабінет
  getCurrentProfile().then(p => { if (p) window.location.href = ROLE_PAGES[p.role]; });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("msg");
    const { email, password } = Object.fromEntries(new FormData(loginForm));
    if (!email.trim() || !password) return showMsg(msg, "Введіть електронну пошту та пароль");

    const btn = loginForm.querySelector("button");
    btn.disabled = true;
    const { error } = await supabaseClient.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      btn.disabled = false;
      return showMsg(msg, "Помилка входу: " + error.message);
    }
    const profile = await getCurrentProfile();
    window.location.href = ROLE_PAGES[profile?.role] || "dashboard.html";
  });
}

// ---- Сторінка реєстрації ----
const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("msg");
    const f = Object.fromEntries(new FormData(registerForm));
    const full_name = f.full_name.trim(), email = f.email.trim();

    if (full_name.length < 3) return showMsg(msg, "Введіть ім’я та прізвище");
    if (!/^\S+@\S+\.\S+$/.test(email)) return showMsg(msg, "Некоректна електронна пошта");
    if (f.password.length < 6) return showMsg(msg, "Пароль має містити щонайменше 6 символів");
    if (f.password !== f.password2) return showMsg(msg, "Паролі не збігаються");

    const btn = registerForm.querySelector("button");
    btn.disabled = true;
    // Роль НЕ передаємо: профіль із роллю user створює тригер у базі
    const { data, error } = await supabaseClient.auth.signUp({
      email, password: f.password, options: { data: { full_name } }
    });
    btn.disabled = false;
    if (error) return showMsg(msg, "Помилка реєстрації: " + error.message);

    if (data.session) {
      showMsg(msg, "Реєстрація успішна! Перенаправлення...", "success");
      setTimeout(() => (window.location.href = "dashboard.html"), 1000);
    } else {
      showMsg(msg, "Реєстрація успішна! Підтвердіть пошту, а потім увійдіть.", "success");
    }
  });
}