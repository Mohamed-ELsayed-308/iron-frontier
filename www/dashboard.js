const $ = selector => document.querySelector(selector);
const api = async (path, options) => {
  const response = await fetch(path, options);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
};

const roleSelect = $("#roleSelect");
let data = { overview: {}, players: [], runs: [], settings: {} };

function formatNumber(value) {
  return Number(value || 0).toLocaleString("ar-EG");
}

function showView(name) {
  document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
  document.querySelectorAll(".nav").forEach(nav => nav.classList.remove("active"));
  const view = $(`#${name}View`);
  if (view) view.classList.add("active");
  const nav = document.querySelector(`[data-view="${name}"]`);
  if (nav) nav.classList.add("active");
  $("#pageTitle").textContent = name === "overview" ? "نظرة عامة" : name === "profile" ? "الملف الشخصي" : name === "players" ? "اللاعبون" : name === "runs" ? "الجولات" : "الإعدادات";
}

document.querySelectorAll(".nav").forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));

function applyRole(role) {
  document.querySelectorAll(".admin-only").forEach(item => item.style.display = role === "admin" ? "" : "none");
  $("#avatar").textContent = role === "admin" ? "A" : "P";
  if (role !== "admin" && document.querySelector(".view.active")?.id?.includes("players")) showView("overview");
  if (role !== "admin" && document.querySelector(".view.active")?.id?.includes("runs")) showView("overview");
  if (role !== "admin" && document.querySelector(".view.active")?.id?.includes("settings")) showView("overview");
  loadDashboard();
}

roleSelect.addEventListener("change", () => applyRole(roleSelect.value));

function drawChart(canvas, runs) {
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * devicePixelRatio);
  canvas.height = 260 * devicePixelRatio;
  const ctx = canvas.getContext("2d");
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, rect.width, 260);
  const values = runs.slice(-10).map(run => Number(run.score) || 0);
  const max = Math.max(100, ...values);
  ctx.strokeStyle = "rgba(255,255,255,.07)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = 30 + i * 45;
    ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(rect.width - 20, y); ctx.stroke();
  }
  if (!values.length) return;
  ctx.beginPath();
  values.forEach((value, index) => {
    const x = 30 + (index / Math.max(1, values.length - 1)) * (rect.width - 50);
    const y = 220 - (value / max) * 175;
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#f2c35d"; ctx.lineWidth = 3; ctx.stroke();
}

function renderOverview() {
  const overview = data.overview || {};
  $("#bestScore").textContent = formatNumber(overview.bestScore);
  $("#bestWave").textContent = formatNumber(overview.bestWave);
  $("#gamesCount").textContent = formatNumber(overview.games);
  $("#zoneName").textContent = overview.zone === "forest" ? "الغابة" : "الصحراء";
  $("#profileName").textContent = overview.name || "لاعب Iron Frontier";
  $("#profileStats").textContent = `أعلى نتيجة ${formatNumber(overview.bestScore)} · أفضل موجة ${formatNumber(overview.bestWave)} · ${formatNumber(overview.games)} جولة`;
  const weaponArabic = {
    Knife:"سكين", Bow:"قوس", "Fire arrows":"سهام نارية", Pistol:"مسدس",
    Rifle:"بندقية", Sniper:"قناصة", Rocket:"صواريخ", Laser:"ليزر"
  };
  const weapons = (overview.weapons || ["سكين","قوس","سهام","مسدس","بندقية","قناصة","صواريخ","ليزر"])
    .map(name => weaponArabic[name] || name);
  $("#weaponProgress").innerHTML = weapons.map((name,index) => {
    const pct = 10 + Math.min(90, index * 12 + (overview.bestWave || 1));
    return `<div><span>${index+1}</span><i style="--pct:${pct}%"></i><b>${name}</b></div>`;
  }).join("");
  drawChart($("#runsChart"), data.runs || []);
}

function renderTables() {
  $("#playersTable").innerHTML = (data.players || []).map(player => `<tr><td>${player.name}</td><td>${formatNumber(player.bestScore)}</td><td>${formatNumber(player.bestWave)}</td><td>${formatNumber(player.games)}</td><td><span class="status">نشط</span></td></tr>`).join("") || `<tr><td colspan="5">لا توجد بيانات لاعبين بعد</td></tr>`;
  $("#runsTable").innerHTML = (data.runs || []).map(run => `<tr><td>${run.createdAt || "-"}</td><td>${run.playerName || "لاعب"}</td><td>${formatNumber(run.score)}</td><td>${formatNumber(run.wave)}</td><td>${run.zone === "forest" ? "الغابة" : "الصحراء"}</td></tr>`).join("") || `<tr><td colspan="5">لا توجد جولات مسجلة بعد</td></tr>`;
}

async function loadDashboard() {
  try {
    const role = roleSelect.value;
    data = await api(role === "admin" ? "/api/admin/dashboard" : "/api/player/dashboard");
    renderOverview();
    renderTables();
    if (data.settings) {
      $("#musicDefault").checked = data.settings.music !== false;
      $("#sfxDefault").checked = data.settings.sfx !== false;
      $("#adsDefault").checked = data.settings.ads !== false;
    }
  } catch (error) {
    $("#pageTitle").textContent = "الباكند غير متصل";
  }
}

$("#saveSettings").addEventListener("click", async () => {
  try {
    await api("/api/admin/settings", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ music:$("#musicDefault").checked, sfx:$("#sfxDefault").checked, ads:$("#adsDefault").checked })
    });
    $("#saveSettings").textContent = "تم الحفظ";
    setTimeout(() => $("#saveSettings").textContent = "حفظ الإعدادات", 1200);
  } catch (error) {
    $("#saveSettings").textContent = "تعذر الحفظ";
  }
});

window.addEventListener("resize", () => drawChart($("#runsChart"), data.runs || []));
loadDashboard();
