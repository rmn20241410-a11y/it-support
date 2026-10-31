// ОСОБИСТИЙ КАБІНЕТ КОРИСТУВАЧА
(async () => {
  const profile = await requireAuth(["user"]);
  if (!profile) return;
  $("user-name").textContent = profile.full_name || profile.email;
  $("p-name").value = profile.full_name || "";
  $("p-phone").value = profile.phone || "";

  let mine = [];
  const list = $("list"), msg = $("msg");

  function render() {
    const q = $("search").value.trim().toLowerCase(), st = $("f-status").value;
    const rows = mine.filter(r => (!q || r.title.toLowerCase().includes(q)) && (!st || r.status === st));
    list.innerHTML = rows.length ? rows.map(r => `
      <article class="ticket t-${r.status}">
        <div class="stub"><small>заявка</small><b>№${r.id}</b></div>
        <div class="body">
          <div class="req-head"><h3>${esc(r.title)}</h3>${badge(r.status)}</div>
          <p class="meta"><span>${fmtDate(r.created_at)}</span><span>${EQUIPMENT[r.equipment_type] || ""}</span><span>${esc(r.location)}</span></p>
          <p>${esc(r.description)}</p>
          ${r.admin_comment ? `<p class="note"><b>Коментар адміністратора:</b> ${esc(r.admin_comment)}</p>` : ""}
          ${r.resolution ? `<p class="note"><b>Виконані роботи:</b> ${esc(r.resolution)}</p>` : ""}
        </div>
      </article>`).join("") : `<p class="empty">Заявок не знайдено. Змініть фільтри або створіть нову заявку.</p>`;
  }

  $("loader").hidden = false;
  const { data, error } = await fetchMyRequests(profile.id);
  $("loader").hidden = true;
  if (error) showMsg(msg, "Не вдалося завантажити заявки: " + error.message);
  else { mine = data; render(); }

  $("search").addEventListener("input", render);
  $("f-status").addEventListener("input", render);

  $("profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const full_name = $("p-name").value.trim(), phone = $("p-phone").value.trim() || null;
    if (!full_name) return showMsg(msg, "Ім’я не може бути порожнім");
    const { error } = await supabaseClient.from("profiles").update({ full_name, phone }).eq("id", profile.id);
    if (error) return showMsg(msg, "Не вдалося зберегти профіль: " + error.message);
    $("user-name").textContent = full_name;
    showMsg(msg, "Профіль оновлено", "success");
  });
})();