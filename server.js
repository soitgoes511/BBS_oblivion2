const fs = require("fs");
const path = require("path");

const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const multer = require("multer");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();

const PORT = Number(process.env.PORT || 8080);
const NODE_ENV = process.env.NODE_ENV || "development";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-me-session-secret";
const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://bbs:bbs@localhost:5432/bbs_oblivion2";
const DB_INIT_RETRIES = Number(process.env.DB_INIT_RETRIES || 20);
const DB_INIT_RETRY_DELAY_MS = Number(process.env.DB_INIT_RETRY_DELAY_MS || 3000);
const SESSION_COOKIE_SECURE = process.env.SESSION_COOKIE_SECURE
  ? String(process.env.SESSION_COOKIE_SECURE).toLowerCase() === "true"
  : NODE_ENV === "production";

const pool = new Pool({ connectionString: DATABASE_URL });

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}_${safe}`);
    }
  }),
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE_BYTES || 25 * 1024 * 1024)
  }
});

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new pgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: SESSION_COOKIE_SECURE,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      sameSite: "lax"
    }
  })
);

app.use(express.static(path.join(__dirname, "public")));

async function initDb() {
  const sql = fs.readFileSync(path.join(__dirname, "db", "init.sql"), "utf8");
  await pool.query(sql);

  const result = await pool.query("SELECT id FROM users WHERE handle = $1", ["SYSOP"]);
  if (result.rowCount === 0) {
    const passHash = await bcrypt.hash(process.env.SYSOP_PASSWORD || "oblivion2", 10);
    await pool.query(
      "INSERT INTO users (handle, password_hash, role, approved, bio) VALUES ($1, $2, $3, true, $4)",
      ["SYSOP", passHash, "sysop", "Keeper of the board"]
    );
  }
}

async function initDbWithRetry() {
  for (let attempt = 1; attempt <= DB_INIT_RETRIES; attempt += 1) {
    try {
      await initDb();
      return;
    } catch (err) {
      if (attempt === DB_INIT_RETRIES) throw err;
      console.error(
        `Database initialization attempt ${attempt}/${DB_INIT_RETRIES} failed. Retrying in ${DB_INIT_RETRY_DELAY_MS}ms.`,
        err.message || err
      );
      await new Promise((resolve) => setTimeout(resolve, DB_INIT_RETRY_DELAY_MS));
    }
  }
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    handle: row.handle,
    role: row.role,
    approved: row.approved,
    joinedAt: row.created_at,
    bio: row.bio
  };
}

async function loadSessionUser(req, _res, next) {
  if (!req.session.userId) {
    req.user = null;
    return next();
  }

  const result = await pool.query(
    "SELECT id, handle, role, approved, created_at, bio FROM users WHERE id = $1",
    [req.session.userId]
  );
  req.user = result.rowCount ? result.rows[0] : null;
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  next();
}

function requireSysop(req, res, next) {
  if (!req.user || req.user.role !== "sysop") {
    return res.status(403).json({ error: "Sysop access required." });
  }
  next();
}

app.use(loadSessionUser);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

app.get("/api/auth/session", (req, res) => {
  if (!req.user) return res.json({ user: null });
  res.json({ user: publicUser(req.user) });
});

app.post("/api/auth/apply", async (req, res) => {
  const { handle, password, reason, blue, pbx, ansi } = req.body;
  if (!handle || !password || !blue || !pbx) {
    return res.status(400).json({ error: "Handle, password, blue box, and PBX answers are required." });
  }

  const cleanHandle = String(handle).trim();
  const lower = cleanHandle.toLowerCase();

  const existsUser = await pool.query("SELECT id FROM users WHERE lower(handle) = $1", [lower]);
  const existsApp = await pool.query(
    "SELECT id FROM applications WHERE lower(handle) = $1 AND status = 'pending'",
    [lower]
  );
  if (existsUser.rowCount || existsApp.rowCount) {
    return res.status(409).json({ error: "Handle already exists or pending review." });
  }

  const blueNorm = String(blue).toLowerCase();
  const pbxNorm = String(pbx).toLowerCase();
  let autoScore = 0;
  if (blueNorm.includes("phone") || blueNorm.includes("phreak") || blueNorm.includes("tone")) autoScore += 1;
  if (pbxNorm.includes("private branch exchange")) autoScore += 1;

  const passHash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO applications
      (handle, password_hash, reason, blue_answer, pbx_answer, ansi_group, auto_score, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
    [cleanHandle, passHash, reason || null, blue, pbx, ansi || null, autoScore]
  );

  res.status(201).json({ ok: true });
});

app.post("/api/auth/login", async (req, res) => {
  const { handle, password } = req.body;
  if (!handle || !password) {
    return res.status(400).json({ error: "Handle and password are required." });
  }

  const result = await pool.query(
    "SELECT id, handle, password_hash, role, approved, created_at, bio FROM users WHERE lower(handle) = $1",
    [String(handle).toLowerCase()]
  );
  if (!result.rowCount) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const user = result.rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  if (!user.approved) {
    return res.status(403).json({ error: "Account is not approved yet." });
  }

  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get("/api/messages", requireAuth, async (_req, res) => {
  const result = await pool.query(
    "SELECT id, author_handle, title, body, created_at FROM posts ORDER BY created_at DESC LIMIT 200"
  );
  res.json({ items: result.rows });
});

app.post("/api/messages", requireAuth, async (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: "Title and body are required." });

  await pool.query(
    "INSERT INTO posts (author_user_id, author_handle, title, body) VALUES ($1, $2, $3, $4)",
    [req.user.id, req.user.handle, title, body]
  );

  res.status(201).json({ ok: true });
});

app.get("/api/directory", requireAuth, async (_req, res) => {
  const result = await pool.query(
    "SELECT id, name, host, port, notes, created_at FROM bbs_directory ORDER BY created_at DESC LIMIT 500"
  );
  res.json({ items: result.rows });
});

app.post("/api/directory", requireAuth, async (req, res) => {
  const { name, host, port, notes } = req.body;
  if (!name || !host) return res.status(400).json({ error: "Name and host are required." });

  await pool.query(
    "INSERT INTO bbs_directory (name, host, port, notes, created_by_user_id) VALUES ($1, $2, $3, $4, $5)",
    [name, host, Number(port || 23), notes || null, req.user.id]
  );

  res.status(201).json({ ok: true });
});

app.get("/api/files", requireAuth, async (_req, res) => {
  const result = await pool.query(
    "SELECT id, original_name, mime_type, byte_size, description, uploader_handle, created_at FROM files ORDER BY created_at DESC LIMIT 200"
  );
  res.json({ items: result.rows });
});

app.post("/api/files", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "File is required." });
  }

  const desc = req.body.description || null;
  await pool.query(
    `INSERT INTO files
      (stored_name, original_name, mime_type, byte_size, description, uploader_user_id, uploader_handle)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      req.file.filename,
      req.file.originalname,
      req.file.mimetype || "application/octet-stream",
      req.file.size,
      desc,
      req.user.id,
      req.user.handle
    ]
  );

  res.status(201).json({ ok: true });
});

app.get("/api/files/:id/download", requireAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT stored_name, original_name, mime_type FROM files WHERE id = $1",
    [req.params.id]
  );
  if (!result.rowCount) return res.status(404).json({ error: "File not found." });

  const file = result.rows[0];
  const full = path.join(uploadDir, file.stored_name);
  if (!fs.existsSync(full)) return res.status(404).json({ error: "Stored file missing." });

  res.type(file.mime_type);
  res.download(full, file.original_name);
});

app.get("/api/profile", requireAuth, async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.put("/api/profile", requireAuth, async (req, res) => {
  const bio = String(req.body.bio || "").slice(0, 2000);
  await pool.query("UPDATE users SET bio = $1 WHERE id = $2", [bio, req.user.id]);
  const result = await pool.query(
    "SELECT id, handle, role, approved, created_at, bio FROM users WHERE id = $1",
    [req.user.id]
  );
  res.json({ user: publicUser(result.rows[0]) });
});

app.get("/api/sysop/applications", requireAuth, requireSysop, async (_req, res) => {
  const result = await pool.query(
    `SELECT id, handle, reason, blue_answer, pbx_answer, ansi_group, auto_score, status, submitted_at
     FROM applications
     WHERE status = 'pending'
     ORDER BY submitted_at ASC`
  );
  res.json({ items: result.rows });
});

app.post("/api/sysop/applications/:id/approve", requireAuth, requireSysop, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const appResult = await client.query(
      `SELECT id, handle, password_hash, reason, status
       FROM applications
       WHERE id = $1
       FOR UPDATE`,
      [req.params.id]
    );
    if (!appResult.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Application not found." });
    }

    const application = appResult.rows[0];
    if (application.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Application already processed." });
    }

    const existing = await client.query("SELECT id FROM users WHERE lower(handle) = $1", [
      application.handle.toLowerCase()
    ]);
    if (existing.rowCount) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Handle already exists as user." });
    }

    await client.query(
      "INSERT INTO users (handle, password_hash, role, approved, bio) VALUES ($1, $2, 'user', true, $3)",
      [application.handle, application.password_hash, application.reason || "New caller"]
    );
    await client.query("UPDATE applications SET status = 'approved', reviewed_at = now() WHERE id = $1", [
      application.id
    ]);

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

app.post("/api/sysop/applications/:id/reject", requireAuth, requireSysop, async (req, res) => {
  const result = await pool.query(
    "UPDATE applications SET status = 'rejected', reviewed_at = now() WHERE id = $1 AND status = 'pending'",
    [req.params.id]
  );

  if (!result.rowCount) {
    return res.status(404).json({ error: "Pending application not found." });
  }

  res.json({ ok: true });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

initDbWithRetry()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`BBS server listening on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database initialization failed", err);
    process.exit(1);
  });
