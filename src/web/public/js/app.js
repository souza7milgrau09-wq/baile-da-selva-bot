document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-confirm]");
  if (!target) {
    return;
  }

  if (!window.confirm(target.dataset.confirm)) {
    event.preventDefault();
  }
});

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
