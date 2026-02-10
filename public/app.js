const KEYS = {
  HOME_LOGIN: "l",
  HOME_APPLY: "a",
  HOME_GUEST: "g"
};

const ansiArt = {
  splash: String.raw`
  .d88888b.  888      888 d8b          d8b
 d88P" "Y88b 888      888 Y8P          Y8P
 888     888 88888b.  888 888 888  888 888  .d88b.  88888b.
 888     888 888 "88b 888 888 888  888 888 d88""88b 888 "88b
 888     888 888  888 888 888 Y88  88P 888 888  888 888  888
 Y88b. .d88P 888 d88P 888 888  Y8bd8P  888 Y88..88P 888  888
  "Y88888P"  88888P"  888 888   Y88P   888  "Y88P"  888  888

   /2 WEB BBS  ::  ACiD + iCE inspired ANSI mood  ::  Since 1994*`,
  menu: String.raw`
 .---------------------------------------------------------------.
 |  [M] Message Board   [D] BBS Directory   [F] File Board       |
 |  [S] Sysop Panel     [P] Profile         [Q] Logout           |
 '---------------------------------------------------------------'`,
  msg: String.raw`
  __  __                                  ____                      _
 |  \/  | ___  ___ ___  __ _  __ _  ___  | __ )  ___   __ _ _ __ __| |
 | |\/| |/ _ \/ __/ __|/ _ \ |/ _ \ |/ _ \ |  _ \ / _ \ / _ \ | '__/ _ \ |
 | |  | |  __/\__ \__ \ (_| | (_| |  __/ | |_) | (_) | (_| | | | (_| |
 |_|  |_|\___||___/___/\__,_|\__, |\___| |____/ \___/ \__,_|_|  \__,_|
                              |___/`,
  dir: String.raw`
  ____  ____ ____    ____  _               _
 | __ )| __ ) ___|  |  _ \(_)_ __ ___  ___| |_ ___  _ __ _   _
 |  _ \|  _ \___ \  | | | | | '__/ _ \/ __| __/ _ \| '__| | | |
 | |_) | |_) |__) | | |_| | | | |  __/ (__| || (_) | |  | |_| |
 |____/|____/____/  |____/|_|_|  \___|\___|\__\___/|_|   \__, |
                                                          |___/`,
  files: String.raw`
  _____ _ _        ____                      _
 |  ___(_) | ___  | __ )  ___   __ _ _ __ __| |
 | |_  | | |/ _ \ |  _ \ / _ \ / _ \ | '__/ _ \ |
 |  _| | | |  __/ | |_) | (_) | (_| | | | (_| |
 |_|   |_|_|\___| |____/ \___/ \__,_|_|  \__,_|
`,
  sysop: String.raw`
  ____                                ____                  _
 / ___| _   _ ___  ___  _ __   ___   / ___|___  _ __  _ __ | | ___
 \___ \| | | / __|/ _ \| '_ \ / _ \ | |   / _ \| '_ \| '_ \| |/ _ \
  ___) | |_| \__ \ (_) | |_) |  __/ | |__| (_) | | | | | | | |  __/
 |____/ \__, |___/\___/| .__/ \___|  \____\___/|_| |_|_| |_|_|\___|
        |___/          |_|
`
};

const ANSI_PACKS = {
  splash: ["splash_main.ans", "splash_alt.ans"],
  menu: ["menu_main.ans"],
  msg: ["messages_main.ans"],
  dir: ["directory_main.ans"],
  files: ["files_main.ans"],
  sysop: ["sysop_main.ans"]
};

const ansiFileCache = new Map();
const ansiSelectedPack = new Map();

let session = {
  user: null,
  view: "home",
  guest: false
};

const app = document.getElementById("app");
const statusRight = document.getElementById("statusRight");
const promptHint = document.getElementById("promptHint");

function setStatus(text) {
  statusRight.textContent = text;
}

function setPrompt(text) {
  promptHint.textContent = text;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function renderAnsi(key) {
  return `<pre class="ansi ansi-host" data-ansi-key="${key}">${escapeHtml(ansiArt[key] || "")}</pre>`;
}

function pickAnsiFile(key) {
  const pack = ANSI_PACKS[key];
  if (!pack || !pack.length) return null;
  if (ansiSelectedPack.has(key)) return ansiSelectedPack.get(key);
  const pick = pack[Math.floor(Math.random() * pack.length)];
  ansiSelectedPack.set(key, pick);
  return pick;
}

async function loadAnsiRaw(key) {
  const file = pickAnsiFile(key);
  if (!file) return ansiArt[key] || "";
  if (ansiFileCache.has(file)) return ansiFileCache.get(file);

  const response = await fetch(`/ansi/${file}`, { credentials: "same-origin" });
  if (!response.ok) {
    throw new Error(`ANSI pack missing: ${file}`);
  }
  const body = await response.text();
  const raw = body.replaceAll("\\x1b", "\u001b");
  ansiFileCache.set(file, raw);
  return raw;
}

function ansiEscape(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function ansiToHtml(input) {
  let i = 0;
  let fg = null;
  let bg = null;
  let bold = false;
  let blink = false;
  let openClass = "";
  let out = "";

  function currentClass() {
    const classes = [];
    if (fg !== null) classes.push(`ansi-fg-${fg}`);
    if (bg !== null) classes.push(`ansi-bg-${bg}`);
    if (bold) classes.push("ansi-bold");
    if (blink) classes.push("ansi-blink");
    return classes.join(" ");
  }

  function syncSpan() {
    const nextClass = currentClass();
    if (nextClass === openClass) return;
    if (openClass) out += "</span>";
    if (nextClass) out += `<span class="${nextClass}">`;
    openClass = nextClass;
  }

  while (i < input.length) {
    const ch = input[i];
    if (ch === "\u001b" && input[i + 1] === "[") {
      const end = input.indexOf("m", i + 2);
      if (end === -1) break;
      const codes = input
        .slice(i + 2, end)
        .split(";")
        .filter(Boolean)
        .map((n) => Number(n));
      if (!codes.length) codes.push(0);

      for (const code of codes) {
        if (code === 0) {
          fg = null;
          bg = null;
          bold = false;
          blink = false;
        } else if (code === 1) {
          bold = true;
        } else if (code === 22) {
          bold = false;
        } else if (code === 5) {
          blink = true;
        } else if (code === 25) {
          blink = false;
        } else if (code >= 30 && code <= 37) {
          fg = code;
        } else if (code >= 90 && code <= 97) {
          fg = code;
        } else if (code === 39) {
          fg = null;
        } else if (code >= 40 && code <= 47) {
          bg = code;
        } else if (code >= 100 && code <= 107) {
          bg = code;
        } else if (code === 49) {
          bg = null;
        }
      }

      syncSpan();
      i = end + 1;
      continue;
    }

    syncSpan();
    out += ansiEscape(ch);
    i += 1;
  }

  if (openClass) out += "</span>";
  return out;
}

function animateAnsi(pre, raw) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) {
    pre.innerHTML = ansiToHtml(raw);
    pre.classList.add("ansi-ready");
    return;
  }

  const lines = raw.split("\n");
  let idx = 0;
  let frame = "";
  pre.innerHTML = "";
  pre.classList.add("ansi-rendering");

  const step = () => {
    if (idx >= lines.length) {
      pre.classList.remove("ansi-rendering");
      pre.classList.add("ansi-ready");
      return;
    }
    frame += (idx === 0 ? "" : "\n") + lines[idx];
    pre.innerHTML = ansiToHtml(frame);
    idx += 1;
    setTimeout(step, 22);
  };
  step();
}

async function hydrateAnsiInApp() {
  const nodes = app.querySelectorAll(".ansi-host[data-ansi-key]");
  await Promise.all(
    Array.from(nodes).map(async (node) => {
      if (node.dataset.ansiHydrated === "1") return;
      const key = node.dataset.ansiKey;
      try {
        const raw = await loadAnsiRaw(key);
        animateAnsi(node, raw);
      } catch {
        node.innerHTML = ansiToHtml(ansiArt[key] || "");
        node.classList.add("ansi-ready");
      } finally {
        node.dataset.ansiHydrated = "1";
      }
    })
  );
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

function showError(el, msg) {
  el.className = "error";
  el.textContent = msg;
}

function showSuccess(el, msg) {
  el.className = "success";
  el.textContent = msg;
}

function logoutLocal() {
  session.user = null;
  session.guest = false;
  session.view = "home";
  render();
}

let ansiHydrateTimer = null;
const ansiObserver = new MutationObserver(() => {
  if (ansiHydrateTimer) clearTimeout(ansiHydrateTimer);
  ansiHydrateTimer = setTimeout(() => {
    hydrateAnsiInApp();
  }, 10);
});
ansiObserver.observe(app, { childList: true, subtree: true });

async function render() {
  if (session.view === "home") return renderHome();
  if (session.view === "apply") return renderApply();
  if (session.view === "login") return renderLogin();
  if (!session.user && !session.guest) {
    session.view = "home";
    return renderHome();
  }
  if (session.view === "main") return renderMainMenu();
  if (session.view === "messages") return renderMessages();
  if (session.view === "directory") return renderDirectory();
  if (session.view === "files") return renderFiles();
  if (session.view === "sysop") return renderSysop();
  if (session.view === "profile") return renderProfile();
  return renderHome();
}

function renderHome() {
  setStatus("AWAITING LOGIN");
  setPrompt("Hotkeys: [L]ogin  [A]pply  [G]uest");

  app.innerHTML = `
    ${renderAnsi("splash")}
    <div class="card">
      <h2>CONNECT</h2>
      <p>Welcome back to the 90s. New callers must apply before full access.</p>
      <div class="menu-grid">
        <button id="btnLogin">[L] Login</button>
        <button id="btnApply">[A] New User Application</button>
        <button id="btnGuest">[G] Continue as Guest</button>
      </div>
      <p class="muted">Default sysop: <span class="pill">SYSOP</span> pass: <span class="pill">oblivion2</span></p>
    </div>
  `;

  document.getElementById("btnLogin").onclick = () => {
    session.view = "login";
    render();
  };
  document.getElementById("btnApply").onclick = () => {
    session.view = "apply";
    render();
  };
  document.getElementById("btnGuest").onclick = () => {
    session.guest = true;
    session.user = { handle: "GUEST", role: "guest" };
    session.view = "main";
    render();
  };
}

function renderApply() {
  setStatus("NEW USER APPLICATION");
  setPrompt("Answer honestly. Sysop can review all applications.");

  app.innerHTML = `
    <div class="card">
      <h2>New User Questionnaire</h2>
      <p class="muted">Modeled after classic BBS vetting questions.</p>
      <label>Handle</label>
      <input id="aHandle" maxlength="20" placeholder="Your alias" />
      <label>Password</label>
      <input id="aPass" type="password" maxlength="40" />
      <label>Why do you want access to this board?</label>
      <textarea id="aReason" rows="3"></textarea>
      <label>What is a blue box used for?</label>
      <input id="aBlue" />
      <label>What does PBX stand for?</label>
      <input id="aPbx" />
      <label>Favorite ANSI group (ACiD, iCE, etc)?</label>
      <input id="aAnsi" />
      <div class="inline-actions">
        <button id="submitApp">Submit Application</button>
        <button id="cancelApp">Back</button>
      </div>
      <p id="applyMsg"></p>
    </div>
  `;

  document.getElementById("cancelApp").onclick = () => {
    session.view = "home";
    render();
  };
  document.getElementById("submitApp").onclick = async () => {
    const msg = document.getElementById("applyMsg");
    try {
      await api("/api/auth/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: document.getElementById("aHandle").value.trim(),
          password: document.getElementById("aPass").value,
          reason: document.getElementById("aReason").value.trim(),
          blue: document.getElementById("aBlue").value.trim(),
          pbx: document.getElementById("aPbx").value.trim(),
          ansi: document.getElementById("aAnsi").value.trim()
        })
      });
      showSuccess(msg, "Application submitted. Wait for sysop approval.");
    } catch (err) {
      showError(msg, err.message);
    }
  };
}

function renderLogin() {
  setStatus("LOGIN");
  setPrompt("Enter handle + password.");

  app.innerHTML = `
    <div class="card">
      <h2>User Login</h2>
      <label>Handle</label>
      <input id="lHandle" />
      <label>Password</label>
      <input id="lPass" type="password" />
      <div class="inline-actions">
        <button id="doLogin">Login</button>
        <button id="goHome">Back</button>
      </div>
      <p id="loginMsg"></p>
    </div>
  `;

  document.getElementById("goHome").onclick = () => {
    session.view = "home";
    render();
  };
  document.getElementById("doLogin").onclick = async () => {
    const msg = document.getElementById("loginMsg");
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: document.getElementById("lHandle").value.trim(),
          password: document.getElementById("lPass").value
        })
      });
      session.user = data.user;
      session.guest = false;
      session.view = "main";
      render();
    } catch (err) {
      showError(msg, err.message);
    }
  };
}

function renderMainMenu() {
  setStatus(`ONLINE AS ${session.user.handle}`);
  setPrompt("Hotkeys: [M]essages [D]irectory [F]iles [S]ysop [P]rofile [Q]uit");

  const isSysop = session.user.role === "sysop";
  app.innerHTML = `
    ${renderAnsi("menu")}
    <div class="card">
      <h2>Main Menu</h2>
      <div class="menu-grid">
        <button data-view="messages">Message Board</button>
        <button data-view="directory">BBS Directory</button>
        <button data-view="files">File Board</button>
        <button data-view="profile">Profile</button>
        ${isSysop ? '<button data-view="sysop">Sysop Panel</button>' : ""}
        <button id="logoutBtn">Logout</button>
      </div>
    </div>
  `;

  app.querySelectorAll("button[data-view]").forEach((btn) => {
    btn.onclick = () => {
      session.view = btn.getAttribute("data-view");
      render();
    };
  });

  document.getElementById("logoutBtn").onclick = async () => {
    if (!session.guest) {
      try {
        await api("/api/auth/logout", { method: "POST" });
      } catch {}
    }
    logoutLocal();
  };
}

function menuBackButton() {
  return `<button id="backMain">Back to Main Menu</button>`;
}

async function renderMessages() {
  if (session.guest) {
    app.innerHTML = `
      ${renderAnsi("msg")}
      <div class="card">
        <h2>Guest Access</h2>
        <p>Guests can browse menus, but posting requires login.</p>
        ${menuBackButton()}
      </div>
    `;
    document.getElementById("backMain").onclick = () => {
      session.view = "main";
      render();
    };
    return;
  }

  setStatus(`MSG BOARD :: ${session.user.handle}`);
  setPrompt("Post and read community messages.");

  let items = [];
  try {
    const data = await api("/api/messages");
    items = data.items || [];
  } catch (err) {
    app.innerHTML = `<div class="card"><p class="error">${escapeHtml(err.message)}</p>${menuBackButton()}</div>`;
    document.getElementById("backMain").onclick = () => {
      session.view = "main";
      render();
    };
    return;
  }

  const postHtml = items
    .map(
      (p) => `
    <div class="card">
      <h3>${escapeHtml(p.title)}</h3>
      <p><span class="pill">${escapeHtml(p.author_handle)}</span> ${escapeHtml(formatDate(p.created_at))}</p>
      <p>${escapeHtml(p.body)}</p>
    </div>
  `
    )
    .join("");

  app.innerHTML = `
    ${renderAnsi("msg")}
    <div class="card">
      <h2>Write Post</h2>
      <label>Title</label>
      <input id="pTitle" maxlength="80" />
      <label>Message</label>
      <textarea id="pBody" rows="4" maxlength="2000"></textarea>
      <div class="inline-actions">
        <button id="addPost">Post</button>
        ${menuBackButton()}
      </div>
      <p id="msgPostStatus"></p>
    </div>
    <div class="list">${postHtml || "<p>No posts yet.</p>"}</div>
  `;

  document.getElementById("addPost").onclick = async () => {
    const status = document.getElementById("msgPostStatus");
    try {
      await api("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: document.getElementById("pTitle").value.trim(),
          body: document.getElementById("pBody").value.trim()
        })
      });
      showSuccess(status, "Posted.");
      renderMessages();
    } catch (err) {
      showError(status, err.message);
    }
  };

  document.getElementById("backMain").onclick = () => {
    session.view = "main";
    render();
  };
}

async function renderDirectory() {
  if (session.guest) {
    app.innerHTML = `
      ${renderAnsi("dir")}
      <div class="card">
        <h2>Guest Access</h2>
        <p>Guests can browse menus, but directory access requires login.</p>
        ${menuBackButton()}
      </div>
    `;
    document.getElementById("backMain").onclick = () => {
      session.view = "main";
      render();
    };
    return;
  }

  setStatus(`BBS DIRECTORY :: ${session.user.handle}`);
  setPrompt("Collect your favorite boards.");

  let items = [];
  try {
    const data = await api("/api/directory");
    items = data.items || [];
  } catch (err) {
    app.innerHTML = `<div class="card"><p class="error">${escapeHtml(err.message)}</p>${menuBackButton()}</div>`;
    document.getElementById("backMain").onclick = () => {
      session.view = "main";
      render();
    };
    return;
  }

  const rows = items
    .map(
      (entry) => `
    <div class="card">
      <h3>${escapeHtml(entry.name)}</h3>
      <p><span class="pill">Host</span> ${escapeHtml(entry.host)}:${escapeHtml(String(entry.port))}</p>
      <p>${escapeHtml(entry.notes || "")}</p>
    </div>
  `
    )
    .join("");

  app.innerHTML = `
    ${renderAnsi("dir")}
    <div class="card">
      <h2>Add Board</h2>
      <label>Name</label>
      <input id="dName" />
      <label>Host</label>
      <input id="dHost" placeholder="bbs.example.org" />
      <label>Port</label>
      <input id="dPort" value="23" />
      <label>Notes</label>
      <input id="dNotes" />
      <div class="inline-actions">
        <button id="addDir">Add Entry</button>
        ${menuBackButton()}
      </div>
      <p id="dirStatus"></p>
    </div>
    <div class="list">${rows || "<p>No entries yet.</p>"}</div>
  `;

  document.getElementById("addDir").onclick = async () => {
    const status = document.getElementById("dirStatus");
    try {
      await api("/api/directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: document.getElementById("dName").value.trim(),
          host: document.getElementById("dHost").value.trim(),
          port: document.getElementById("dPort").value.trim() || "23",
          notes: document.getElementById("dNotes").value.trim()
        })
      });
      showSuccess(status, "Directory entry added.");
      renderDirectory();
    } catch (err) {
      showError(status, err.message);
    }
  };

  document.getElementById("backMain").onclick = () => {
    session.view = "main";
    render();
  };
}

async function renderFiles() {
  if (session.guest) {
    app.innerHTML = `
      ${renderAnsi("files")}
      <div class="card">
        <h2>Guest Access</h2>
        <p>Guests can browse menus, but file board requires login.</p>
        ${menuBackButton()}
      </div>
    `;
    document.getElementById("backMain").onclick = () => {
      session.view = "main";
      render();
    };
    return;
  }

  setStatus(`FILE BOARD :: ${session.user.handle}`);
  setPrompt("Upload/download files with server-backed storage.");

  let items = [];
  try {
    const data = await api("/api/files");
    items = data.items || [];
  } catch (err) {
    app.innerHTML = `<div class="card"><p class="error">${escapeHtml(err.message)}</p>${menuBackButton()}</div>`;
    document.getElementById("backMain").onclick = () => {
      session.view = "main";
      render();
    };
    return;
  }

  const fileRows = items
    .map(
      (file) => `
    <div class="card">
      <h3>${escapeHtml(file.original_name)}</h3>
      <p><span class="pill">By</span> ${escapeHtml(file.uploader_handle)}
         <span class="pill">Size</span> ${Math.round(Number(file.byte_size) / 1024)} KB
         <span class="pill">When</span> ${escapeHtml(formatDate(file.created_at))}</p>
      <p>${escapeHtml(file.description || "")}</p>
      <a href="/api/files/${encodeURIComponent(file.id)}/download"><button>Download</button></a>
    </div>
  `
    )
    .join("");

  app.innerHTML = `
    ${renderAnsi("files")}
    <div class="card">
      <h2>Upload File</h2>
      <label>Description</label>
      <input id="fDesc" maxlength="120" />
      <label>Select file</label>
      <input id="fInput" type="file" />
      <div class="inline-actions">
        <button id="fUpload">Upload</button>
        ${menuBackButton()}
      </div>
      <p id="fileStatus"></p>
      <p class="muted">Server-backed upload (multipart/form-data).</p>
    </div>
    <div class="list">${fileRows || "<p>No files uploaded yet.</p>"}</div>
  `;

  document.getElementById("fUpload").onclick = async () => {
    const status = document.getElementById("fileStatus");
    const input = document.getElementById("fInput");
    if (!input.files || !input.files[0]) {
      showError(status, "Pick a file first.");
      return;
    }

    const form = new FormData();
    form.append("description", document.getElementById("fDesc").value.trim());
    form.append("file", input.files[0]);

    try {
      await api("/api/files", { method: "POST", body: form });
      showSuccess(status, "Upload complete.");
      renderFiles();
    } catch (err) {
      showError(status, err.message);
    }
  };

  document.getElementById("backMain").onclick = () => {
    session.view = "main";
    render();
  };
}

async function renderSysop() {
  if (session.user.role !== "sysop") {
    session.view = "main";
    return renderMainMenu();
  }

  setStatus("SYSOP PANEL");
  setPrompt("Approve or reject new users.");

  let items = [];
  try {
    const data = await api("/api/sysop/applications");
    items = data.items || [];
  } catch (err) {
    app.innerHTML = `<div class="card"><p class="error">${escapeHtml(err.message)}</p>${menuBackButton()}</div>`;
    document.getElementById("backMain").onclick = () => {
      session.view = "main";
      render();
    };
    return;
  }

  const appRows = items
    .map(
      (a) => `
    <div class="card">
      <h3>${escapeHtml(a.handle)} <span class="pill">score ${escapeHtml(String(a.auto_score))}/2</span></h3>
      <p><b>When:</b> ${escapeHtml(formatDate(a.submitted_at))}</p>
      <p><b>Reason:</b> ${escapeHtml(a.reason || "-")}</p>
      <p><b>Blue Box:</b> ${escapeHtml(a.blue_answer)}</p>
      <p><b>PBX:</b> ${escapeHtml(a.pbx_answer)}</p>
      <p><b>ANSI:</b> ${escapeHtml(a.ansi_group || "-")}</p>
      <div class="inline-actions">
        <button data-approve="${a.id}">Approve</button>
        <button data-reject="${a.id}">Reject</button>
      </div>
    </div>
  `
    )
    .join("");

  app.innerHTML = `
    ${renderAnsi("sysop")}
    <div class="card">
      <h2>Pending Applications</h2>
      ${items.length ? "" : "<p>No pending applications.</p>"}
      <div class="list">${appRows}</div>
      <p id="sysopStatus"></p>
      <div class="inline-actions">${menuBackButton()}</div>
    </div>
  `;

  const status = document.getElementById("sysopStatus");
  app.querySelectorAll("button[data-approve]").forEach((btn) => {
    btn.onclick = async () => {
      try {
        await api(`/api/sysop/applications/${btn.getAttribute("data-approve")}/approve`, { method: "POST" });
        showSuccess(status, "Application approved.");
        renderSysop();
      } catch (err) {
        showError(status, err.message);
      }
    };
  });

  app.querySelectorAll("button[data-reject]").forEach((btn) => {
    btn.onclick = async () => {
      try {
        await api(`/api/sysop/applications/${btn.getAttribute("data-reject")}/reject`, { method: "POST" });
        showSuccess(status, "Application rejected.");
        renderSysop();
      } catch (err) {
        showError(status, err.message);
      }
    };
  });

  document.getElementById("backMain").onclick = () => {
    session.view = "main";
    render();
  };
}

async function renderProfile() {
  if (session.guest) {
    app.innerHTML = `
      <div class="card">
        <h2>Guest Access</h2>
        <p>Guest profile editing is disabled.</p>
        ${menuBackButton()}
      </div>
    `;
    document.getElementById("backMain").onclick = () => {
      session.view = "main";
      render();
    };
    return;
  }

  setStatus(`PROFILE :: ${session.user.handle}`);
  setPrompt("Edit your short bio.");

  let profile;
  try {
    const data = await api("/api/profile");
    profile = data.user;
  } catch (err) {
    app.innerHTML = `<div class="card"><p class="error">${escapeHtml(err.message)}</p>${menuBackButton()}</div>`;
    document.getElementById("backMain").onclick = () => {
      session.view = "main";
      render();
    };
    return;
  }

  app.innerHTML = `
    <div class="card">
      <h2>Caller Profile</h2>
      <p><span class="pill">Handle</span> ${escapeHtml(profile.handle)}</p>
      <p><span class="pill">Role</span> ${escapeHtml(profile.role)}</p>
      <p><span class="pill">Joined</span> ${escapeHtml(formatDate(profile.joinedAt))}</p>
      <label>Bio</label>
      <textarea id="bioText" rows="4">${escapeHtml(profile.bio || "")}</textarea>
      <div class="inline-actions">
        <button id="saveBio">Save Bio</button>
        ${menuBackButton()}
      </div>
      <p id="profileStatus"></p>
    </div>
  `;

  document.getElementById("saveBio").onclick = async () => {
    const status = document.getElementById("profileStatus");
    try {
      const data = await api("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: document.getElementById("bioText").value.trim() })
      });
      session.user = data.user;
      showSuccess(status, "Bio saved.");
    } catch (err) {
      showError(status, err.message);
    }
  };

  document.getElementById("backMain").onclick = () => {
    session.view = "main";
    render();
  };
}

document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();

  if (session.view === "home") {
    if (key === KEYS.HOME_LOGIN) {
      session.view = "login";
      render();
    }
    if (key === KEYS.HOME_APPLY) {
      session.view = "apply";
      render();
    }
    if (key === KEYS.HOME_GUEST) {
      session.guest = true;
      session.user = { handle: "GUEST", role: "guest" };
      session.view = "main";
      render();
    }
    return;
  }

  if (session.view === "main") {
    if (key === "m") {
      session.view = "messages";
      render();
    }
    if (key === "d") {
      session.view = "directory";
      render();
    }
    if (key === "f") {
      session.view = "files";
      render();
    }
    if (key === "p") {
      session.view = "profile";
      render();
    }
    if (key === "s" && session.user?.role === "sysop") {
      session.view = "sysop";
      render();
    }
    if (key === "q") {
      if (!session.guest) {
        api("/api/auth/logout", { method: "POST" }).finally(logoutLocal);
      } else {
        logoutLocal();
      }
    }
    return;
  }

  if (["messages", "directory", "files", "profile", "sysop"].includes(session.view) && key === "q") {
    session.view = "main";
    render();
  }
});

(async function boot() {
  try {
    const data = await api("/api/auth/session");
    if (data.user) {
      session.user = data.user;
      session.view = "main";
    }
  } catch {
    // Keep home screen if backend is unavailable.
  }
  render();
})();
