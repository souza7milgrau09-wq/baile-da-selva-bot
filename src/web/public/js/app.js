document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-confirm]");
  if (!target) {
    return;
  }

  if (!window.confirm(target.dataset.confirm)) {
    event.preventDefault();
  }
});

const navSearch = document.querySelector("[data-nav-search]");
if (navSearch) {
  navSearch.addEventListener("input", () => {
    const query = navSearch.value.trim().toLowerCase();
    document.querySelectorAll("[data-nav-item]").forEach((item) => {
      item.hidden = query.length > 0 && !item.textContent.toLowerCase().includes(query);
    });
    document.querySelectorAll("[data-nav-section]").forEach((section) => {
      const hasMatch = [...section.querySelectorAll("[data-nav-item]")]
        .some((item) => !item.hidden);
      section.classList.toggle("is-searching", query.length > 0 && hasMatch);
      section.hidden = query.length > 0 && !hasMatch;
    });
  });
}

async function refreshStatus() {
  const pill = document.querySelector(".status-pill");
  if (!pill) {
    return;
  }

  try {
    const response = await fetch("/api/status", { headers: { Accept: "application/json" } });
    if (!response.ok) {
      return;
    }
    const status = await response.json();
    pill.classList.toggle("is-online", Boolean(status.ready));
    pill.classList.toggle("is-offline", !status.ready);
    const dot = pill.querySelector("span");
    pill.textContent = status.ready ? status.user : (status.lastError || "Bot offline");
    if (dot) {
      pill.prepend(dot);
    }
  } catch {
    // O painel continua funcionando mesmo se a consulta de status falhar.
  }
}

setInterval(refreshStatus, 15000);
