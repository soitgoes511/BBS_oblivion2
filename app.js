const KEYS = {
  HOME_LOGIN: "l",
  HOME_APPLY: "a",
  HOME_GUEST: "g"
};

const STORAGE_KEY = "bbs90_state_v1";

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

function nowStamp() {
  return new Date().toLocaleString();
}

function defaultState() {
  return {
    users: [
      {
        id: "u_sysop",
        handle: "SYSOP",
        password: "oblivion2",
        role: "sysop",
        approved: true,
        joinedAt: nowStamp(),
        bio: "Keeper of the board"
      }
    ],
    applications: [],
    posts: [
      {
        id: crypto.randomUUID(),
        author: "SYSOP",
        title: "Welcome to Oblivion/2 Web",
        body: "Drop a line and relive the dial-up era.",
        createdAt: nowStamp()
      }
    ],
    bbsDirectory: [
      {
        id: crypto.randomUUID(),
        name: "The Cave",
        host: "cavebbs.example",
        telnet: "23",
        notes: "Retro doors and ANSI parties"
      }
    ],
    files: []
  };
}

let state = loadState();
let session = {
  user: null,
  view: "home",
  guest: false
};

const app = document.getElementById("app");
const statusRight = document.getElementById("statusRight");
const promptHint = document.getElementById("promptHint");

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = defaultState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const initial = defaultState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setStatus(text) {
  statusRight.textContent = text;
}

function setPrompt(text) {
  promptHint.textContent = text;
}

function resetData() {
  localStorage.removeItem(STORAGE_KEY);
  state = defaultState();
  saveState();
  session = { user: null, view: "home", guest: false };
  render();
}

function renderAnsi(key) {
  return `<pre class="ansi">${ansiArt[key]}</pre>`;
}

function render() {
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

  document.getElementById("btnLogin").onclick = () => { session.view = "login"; render(); };
  document.getElementById("btnApply").onclick = () => { session.view = "apply"; render(); };
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
      <div style="margin-top:10px; display:flex; gap:8px;">
        <button id="submitApp">Submit Application</button>
        <button id="cancelApp">Back</button>
      </div>
      <p id="applyMsg"></p>
    </div>
  `;

  document.getElementById("cancelApp").onclick = () => { session.view = "home"; render(); };
  document.getElementById("submitApp").onclick = () => {
    const handle = document.getElementById("aHandle").value.trim();
    const password = document.getElementById("aPass").value;
    const reason = document.getElementById("aReason").value.trim();
    const blue = document.getElementById("aBlue").value.trim();
    const pbx = document.getElementById("aPbx").value.trim();
    const ansi = document.getElementById("aAnsi").value.trim();
    const msg = document.getElementById("applyMsg");

    if (!handle || !password || !blue || !pbx) {
      msg.className = "error";
      msg.textContent = "Handle, password, and questionnaire answers are required.";
      return;
    }

    if (state.users.some(u => u.handle.toLowerCase() === handle.toLowerCase()) ||
        state.applications.some(a => a.handle.toLowerCase() === handle.toLowerCase())) {
      msg.className = "error";
      msg.textContent = "That handle already exists or is pending approval.";
      return;
    }

    const autoScore = scoreApplication(blue, pbx);

    state.applications.push({
      id: crypto.randomUUID(),
      handle,
      password,
      reason,
      blue,
      pbx,
      ansi,
      autoScore,
      submittedAt: nowStamp(),
      status: "pending"
    });
    saveState();

    msg.className = "success";
    msg.textContent = "Application submitted. Wait for sysop approval.";
  };
}

function scoreApplication(blue, pbx) {
  let score = 0;
  const blueNorm = blue.toLowerCase();
  const pbxNorm = pbx.toLowerCase();

  if (blueNorm.includes("phone") || blueNorm.includes("phreak") || blueNorm.includes("tone")) score += 1;
  if (pbxNorm.includes("private branch exchange")) score += 1;
  return score;
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
      <div style="margin-top:10px; display:flex; gap:8px;">
        <button id="doLogin">Login</button>
        <button id="goHome">Back</button>
      </div>
      <p id="loginMsg"></p>
    </div>
  `;

  document.getElementById("goHome").onclick = () => { session.view = "home"; render(); };
  document.getElementById("doLogin").onclick = () => {
    const handle = document.getElementById("lHandle").value.trim();
    const pass = document.getElementById("lPass").value;
    const msg = document.getElementById("loginMsg");

    const user = state.users.find(u => u.handle.toLowerCase() === handle.toLowerCase());
    if (!user || user.password !== pass) {
      msg.className = "error";
      msg.textContent = "Invalid credentials.";
      return;
    }

    if (!user.approved) {
      msg.className = "error";
      msg.textContent = "Your account is not approved yet.";
      return;
    }

    session.user = user;
    session.guest = false;
    session.view = "main";
    render();
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

  app.querySelectorAll("button[data-view]").forEach(btn => {
    btn.onclick = () => {
      session.view = btn.getAttribute("data-view");
      render();
    };
  });

  document.getElementById("logoutBtn").onclick = logout;
}

function logout() {
  session.user = null;
  session.guest = false;
  session.view = "home";
  render();
}

function menuBackButton() {
  return `<button id="backMain">Back to Main Menu</button>`;
}

function renderMessages() {
  setStatus(`MSG BOARD :: ${session.user.handle}`);
  setPrompt("Post and read community messages.");

  const posts = [...state.posts].reverse();
  const postHtml = posts.map(p => `
    <div class="card">
      <h3>${escapeHtml(p.title)}</h3>
      <p><span class="pill">${escapeHtml(p.author)}</span> ${escapeHtml(p.createdAt)}</p>
      <p>${escapeHtml(p.body)}</p>
    </div>
  `).join("");

  app.innerHTML = `
    ${renderAnsi("msg")}
    <div class="card">
      <h2>Write Post</h2>
      <label>Title</label>
      <input id="pTitle" maxlength="80" />
      <label>Message</label>
      <textarea id="pBody" rows="4" maxlength="500"></textarea>
      <div style="margin-top:10px; display:flex; gap:8px;">
        <button id="addPost">Post</button>
        ${menuBackButton()}
      </div>
    </div>
    <div class="list">${postHtml || "<p>No posts yet.</p>"}</div>
  `;

  document.getElementById("addPost").onclick = () => {
    const title = document.getElementById("pTitle").value.trim();
    const body = document.getElementById("pBody").value.trim();
    if (!title || !body) return;

    state.posts.push({
      id: crypto.randomUUID(),
      author: session.user.handle,
      title,
      body,
      createdAt: nowStamp()
    });
    saveState();
    renderMessages();
  };

  document.getElementById("backMain").onclick = () => { session.view = "main"; render(); };
}

function renderDirectory() {
  setStatus(`BBS DIRECTORY :: ${session.user.handle}`);
  setPrompt("Collect your favorite boards.");

  const rows = state.bbsDirectory.map(entry => `
    <div class="card">
      <h3>${escapeHtml(entry.name)}</h3>
      <p><span class="pill">Host</span> ${escapeHtml(entry.host)}:${escapeHtml(entry.telnet)}</p>
      <p>${escapeHtml(entry.notes || "")}</p>
    </div>
  `).join("");

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
      <div style="margin-top:10px; display:flex; gap:8px;">
        <button id="addDir">Add Entry</button>
        ${menuBackButton()}
      </div>
    </div>
    <div class="list">${rows || "<p>No entries yet.</p>"}</div>
  `;

  document.getElementById("addDir").onclick = () => {
    const name = document.getElementById("dName").value.trim();
    const host = document.getElementById("dHost").value.trim();
    const telnet = document.getElementById("dPort").value.trim() || "23";
    const notes = document.getElementById("dNotes").value.trim();
    if (!name || !host) return;

    state.bbsDirectory.push({ id: crypto.randomUUID(), name, host, telnet, notes });
    saveState();
    renderDirectory();
  };

  document.getElementById("backMain").onclick = () => { session.view = "main"; render(); };
}

function renderFiles() {
  setStatus(`FILE BOARD :: ${session.user.handle}`);
  setPrompt("Upload/download files with modern browser transfer.");

  const fileRows = [...state.files].reverse().map(file => `
    <div class="card">
      <h3>${escapeHtml(file.name)}</h3>
      <p><span class="pill">By</span> ${escapeHtml(file.uploader)}
         <span class="pill">Size</span> ${Math.round(file.size / 1024)} KB
         <span class="pill">When</span> ${escapeHtml(file.createdAt)}</p>
      <p>${escapeHtml(file.desc || "")}</p>
      <button data-dl="${file.id}">Download</button>
    </div>
  `).join("");

  app.innerHTML = `
    ${renderAnsi("files")}
    <div class="card">
      <h2>Upload File</h2>
      <label>Description</label>
      <input id="fDesc" maxlength="120" />
      <label>Pick file (stored in browser localStorage - keep small)</label>
      <input id="fInput" type="file" />
      <div style="margin-top:10px; display:flex; gap:8px;">
        <button id="fUpload">Upload</button>
        ${menuBackButton()}
      </div>
      <p class="muted">Modern transfer emulation: resumable/chunked can be added on server backend.</p>
    </div>
    <div class="list">${fileRows || "<p>No files uploaded yet.</p>"}</div>
  `;

  document.getElementById("fUpload").onclick = async () => {
    const input = document.getElementById("fInput");
    const desc = document.getElementById("fDesc").value.trim();
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    if (file.size > 1024 * 700) {
      alert("File too large for localStorage demo. Keep under ~700KB.");
      return;
    }

    const dataUrl = await toDataUrl(file);
    state.files.push({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      desc,
      uploader: session.user.handle,
      createdAt: nowStamp(),
      dataUrl
    });
    saveState();
    renderFiles();
  };

  app.querySelectorAll("button[data-dl]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-dl");
      const file = state.files.find(f => f.id === id);
      if (!file) return;
      const a = document.createElement("a");
      a.href = file.dataUrl;
      a.download = file.name;
      a.click();
    };
  });

  document.getElementById("backMain").onclick = () => { session.view = "main"; render(); };
}

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderSysop() {
  if (session.user.role !== "sysop") {
    session.view = "main";
    return renderMainMenu();
  }

  setStatus("SYSOP PANEL");
  setPrompt("Approve or reject new users. Reset state if needed.");

  const apps = state.applications.filter(a => a.status === "pending");
  const appRows = apps.map(a => `
    <div class="card">
      <h3>${escapeHtml(a.handle)} <span class="pill">score ${a.autoScore}/2</span></h3>
      <p><b>When:</b> ${escapeHtml(a.submittedAt)}</p>
      <p><b>Reason:</b> ${escapeHtml(a.reason || "-")}</p>
      <p><b>Blue Box:</b> ${escapeHtml(a.blue)}</p>
      <p><b>PBX:</b> ${escapeHtml(a.pbx)}</p>
      <p><b>ANSI:</b> ${escapeHtml(a.ansi || "-")}</p>
      <div style="display:flex; gap:8px;">
        <button data-approve="${a.id}">Approve</button>
        <button data-reject="${a.id}">Reject</button>
      </div>
    </div>
  `).join("");

  app.innerHTML = `
    ${renderAnsi("sysop")}
    <div class="card">
      <h2>Pending Applications</h2>
      ${apps.length ? "" : "<p>No pending applications.</p>"}
      <div class="list">${appRows}</div>
    </div>
    <div class="card">
      <h2>System</h2>
      <button id="resetAll">Reset Demo Data</button>
      ${menuBackButton()}
    </div>
  `;

  app.querySelectorAll("button[data-approve]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-approve");
      const item = state.applications.find(a => a.id === id);
      if (!item) return;

      item.status = "approved";
      state.users.push({
        id: crypto.randomUUID(),
        handle: item.handle,
        password: item.password,
        role: "user",
        approved: true,
        joinedAt: nowStamp(),
        bio: item.reason || "New caller"
      });
      saveState();
      renderSysop();
    };
  });

  app.querySelectorAll("button[data-reject]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-reject");
      const item = state.applications.find(a => a.id === id);
      if (!item) return;
      item.status = "rejected";
      saveState();
      renderSysop();
    };
  });

  document.getElementById("resetAll").onclick = () => {
    if (!confirm("Reset all demo data?")) return;
    resetData();
  };

  document.getElementById("backMain").onclick = () => { session.view = "main"; render(); };
}

function renderProfile() {
  setStatus(`PROFILE :: ${session.user.handle}`);
  setPrompt("Edit your short bio.");

  const user = state.users.find(u => u.handle === session.user.handle);

  app.innerHTML = `
    <div class="card">
      <h2>Caller Profile</h2>
      <p><span class="pill">Handle</span> ${escapeHtml(session.user.handle)}</p>
      <p><span class="pill">Role</span> ${escapeHtml(session.user.role)}</p>
      <p><span class="pill">Joined</span> ${escapeHtml(user?.joinedAt || "-")}</p>
      <label>Bio</label>
      <textarea id="bioText" rows="4">${escapeHtml(user?.bio || "")}</textarea>
      <div style="margin-top:10px; display:flex; gap:8px;">
        <button id="saveBio">Save Bio</button>
        ${menuBackButton()}
      </div>
    </div>
  `;

  document.getElementById("saveBio").onclick = () => {
    const bio = document.getElementById("bioText").value.trim();
    const idx = state.users.findIndex(u => u.handle === session.user.handle);
    if (idx >= 0) {
      state.users[idx].bio = bio;
      session.user = state.users[idx];
      saveState();
    }
  };

  document.getElementById("backMain").onclick = () => { session.view = "main"; render(); };
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();

  if (session.view === "home") {
    if (key === KEYS.HOME_LOGIN) { session.view = "login"; render(); }
    if (key === KEYS.HOME_APPLY) { session.view = "apply"; render(); }
    if (key === KEYS.HOME_GUEST) {
      session.guest = true;
      session.user = { handle: "GUEST", role: "guest" };
      session.view = "main";
      render();
    }
    return;
  }

  if (session.view === "main") {
    if (key === "m") { session.view = "messages"; render(); }
    if (key === "d") { session.view = "directory"; render(); }
    if (key === "f") { session.view = "files"; render(); }
    if (key === "p") { session.view = "profile"; render(); }
    if (key === "s" && session.user?.role === "sysop") { session.view = "sysop"; render(); }
    if (key === "q") logout();
    return;
  }

  if (["messages", "directory", "files", "profile", "sysop"].includes(session.view) && key === "q") {
    session.view = "main";
    render();
  }
});

render();
