const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const DEFAULT_ADMIN_USERNAME = process.env.INITIAL_ADMIN_USERNAME || "admin";
const DEFAULT_ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || "admin123";
const JWT_EXPIRES_IN = "8h";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET wajib diisi ketika backend berjalan di production.");
  }

  return "malangfest-local-development-secret-change-before-production";
}

function publicAdmin(admin) {
  return {
    id: admin.id,
    username: admin.username,
    displayName: admin.displayName,
    role: admin.role,
  };
}

async function ensureDefaultAdmin(prisma) {
  const existing = await prisma.admin.findUnique({
    where: { username: DEFAULT_ADMIN_USERNAME },
  });

  if (existing) return existing;

  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);
  const admin = await prisma.admin.create({
    data: {
      username: DEFAULT_ADMIN_USERNAME,
      passwordHash,
      displayName: "Admin Malang Fest",
      role: "ADMIN",
    },
  });

  console.log("Akun admin awal berhasil dibuat: admin");
  return admin;
}

function signAdminToken(admin) {
  return jwt.sign(
    { sub: admin.id, username: admin.username, role: admin.role },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function requireAdmin(req, res, next) {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ success: false, message: "Login admin diperlukan." });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    const admin = await req.prisma.admin.findUnique({ where: { id: Number(payload.sub) } });

    if (!admin || admin.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Akses khusus admin ditolak." });
    }

    req.admin = publicAdmin(admin);
    next();
  } catch (_) {
    return res.status(401).json({ success: false, message: "Sesi admin tidak valid atau sudah berakhir." });
  }
}

module.exports = {
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USERNAME,
  ensureDefaultAdmin,
  publicAdmin,
  requireAdmin,
  signAdminToken,
};
