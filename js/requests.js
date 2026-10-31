// РОБОТА ІЗ ЗАЯВКАМИ (спільні функції, створення заявки, панель admin/manager)
const $ = (id) => document.getElementById(id);

const STATUS = { new: "Нова", in_progress: "У роботі", waiting: "Очікування", completed: "Завершена", rejected: "Відхилена" };
const PRIORITY = { low: "Низький", medium: "Середній", high: "Високий", critical: "Критичний" };
const EQUIPMENT = { computer: "Комп’ютер", laptop: "Ноутбук", printer: "Принтер", monitor: "Монітор", other: "Інше" };

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("uk-UA") : "—");
const badge = (s) => `<span class="badge s-${s}">${STATUS[s] || s}</span>`;
const prioBadge = (p) => `<span class="badge p-${p}">${PRIORITY[p] || p}</span>`;

// ---- Запити до бази ----
// user_id не передаємо: його підставляє база (auth.uid()) з поточного сеансу
const createRequest = (fields) =>
  supabaseClient.from("repair_requests").insert(fields).select().single();

const fetchMyRequests = (userId) =>
  supabaseClient.from("repair_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false });

const fetchAllRequests = () =>
  supabaseClient.from("repair_requests").select("*, profiles(full_name, email, phone)").order("created_at", { ascending: false });

const updateRequest = (id, fields) =>
  supabaseClient.from("repair_requests").update(fields).eq("id", id).select().single();

// ---- Сторінка створення заявки ----
const requestForm = $("request-form");
if (requestForm) {
  (async () => {
    const profile = await requireAuth(["user"]);
    if (!profile) return;
    $("user-name").textContent = profile.full_name || profile.email;
    $("created-date").value = new Date().toLocaleDateString("uk-UA");
    if (profile.phone) requestForm.elements["contact"].value = profile.phone;

    requestForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = $("msg");
      const d = Object.fromEntries(new FormData(requestForm));
      const fields = {
        title: d.title.trim(),
        equipment_type: d.equipment_type,
        inventory_number: d.inventory_number.trim() || null,
        location: d.location.trim(),
        description: d.description.trim(),
        contact: d.contact.trim(),
      };
      if (!fields.title || !fields.location || !fields.description || !fields.contact)
        return showMsg(msg, "Заповніть усі обов’язкові поля");

      const btn = requestForm.querySelector("button[type=submit]");
      btn.disabled = true;
      const { data, error } = await createRequest(fields);
      if (error) {
        btn.disabled = false;
        return showMsg(msg, "Не вдалося створити заявку: " + error.message);
      }
      showMsg(msg, `Заявку №${data.id} створено!`, "success");
      setTimeout(() => (window.location.href = "dashboard.html"), 1200);
    });
  })();
}

// ---- Спільна панель для admin і manager ----
async function initStaffPanel(role) {
  const profile = await requireAuth([role]);
  if (!profile) return;
  $("user-name").textContent = profile.full_name || profile.email;
  const body = $("table-body"), msg = $("msg");
  let all = [], current = null;

  const today = () => new Date().toLocaleDateString("sv-SE");

  async function load() {
    $("loader").hidden = false;
    const { data, error } = await fetchAllRequests();
    $("loader").hidden = true;
    if (error) return showMsg(msg, "Не вдалося завантажити заявки: " + error.message);
    all = data;
    render();
  }

  function filtered() {
    const q = $("search").value.trim().toLowerCase();
    const st = $("f-status").value, pr = $("f-priority").value, dt = $("f-date").value;
    return all.filter(r => {
      const author = `${r.profiles?.full_name || ""} ${r.profiles?.email || ""}`;
      const text = `${r.id} ${r.title} ${author}`.toLowerCase();
      return (!q || text.includes(q)) && (!st || r.status === st) && (!pr || r.priority === pr)
        && (!dt || new Date(r.created_at).toLocaleDateString("sv-SE") === dt);
    });
  }

  function render() {
    $("st-new").textContent = all.filter(r => r.status === "new").length;
    $("st-active").textContent = all.filter(r => ["in_progress", "waiting"].includes(r.status)).length;
    $("st-done").textContent = all.filter(r => r.status === "completed").length;

    const rows = filtered();
    body.innerHTML = rows.length ? rows.map(r => {
      const late = r.due_date && r.due_date < today() && !["completed", "rejected"].includes(r.status);
      return `<tr data-id="${r.id}" class="${late ? "overdue" : ""}">
        <td>${r.id}</td><td>${fmtDate(r.created_at)}</td>
        <td>${esc(r.profiles?.full_name || r.profiles?.email)}</td>
        <td>${EQUIPMENT[r.equipment_type] || ""}</td><td>${esc(r.title)}</td>
        <td>${badge(r.status)}</td><td>${prioBadge(r.priority)}</td><td>${fmtDate(r.due_date)}</td></tr>`;
    }).join("") : `<tr><td colspan="8">Заявок не знайдено</td></tr>`;
  }

  function openDetail(id) {
    current = all.find(r => r.id === id);
    if (!current) return;
    const p = current.profiles || {};
    $("d-title").textContent = `Заявка №${current.id}: ${current.title}`;
    $("d-info").innerHTML = `
      <p><b>Заявник:</b> ${esc(p.full_name)} (${esc(p.email)}), тел. профілю: ${esc(p.phone || "—")}</p>
      <p><b>Контакти із заявки:</b> ${esc(current.contact)}</p>
      <p><b>Обладнання:</b> ${EQUIPMENT[current.equipment_type] || ""}, інв. № ${esc(current.inventory_number || "—")}, місце: ${esc(current.location)}</p>
      <p><b>Створено:</b> ${fmtDate(current.created_at)} &nbsp; <b>Оновлено:</b> ${fmtDate(current.updated_at)}</p>
      <p><b>Опис проблеми:</b><br>${esc(current.description)}</p>`;
    $("d-status").value = current.status;
    $("d-priority").value = current.priority;
    $("d-due").value = current.due_date || "";
    $("d-comment").value = current.admin_comment || "";
    $("d-resolution").value = current.resolution || "";
    // Менеджер змінює лише пріоритет і термін (те саме перевіряє база)
    ["d-status", "d-comment", "d-resolution"].forEach(i => ($(i).disabled = role !== "admin"));
    $("detail").hidden = false;
    $("detail").scrollIntoView({ behavior: "smooth" });
  }

  body.addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-id]");
    if (tr) openDetail(Number(tr.dataset.id));
  });
  ["search", "f-status", "f-priority", "f-date"].forEach(i => $(i).addEventListener("input", render));
  $("d-close").addEventListener("click", () => ($("detail").hidden = true));

  $("detail-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const base = { priority: $("d-priority").value, due_date: $("d-due").value || null };
    const fields = role === "admin"
      ? { ...base, status: $("d-status").value,
          admin_comment: $("d-comment").value.trim() || null,
          resolution: $("d-resolution").value.trim() || null }
      : base;
    const { data, error } = await updateRequest(current.id, fields);
    if (error) return showMsg(msg, "Не вдалося зберегти: " + error.message);
    all = all.map(r => (r.id === data.id ? { ...r, ...data } : r));
    render();
    $("detail").hidden = true;
    showMsg(msg, `Заявку №${data.id} оновлено`, "success");
  });

  load();
}