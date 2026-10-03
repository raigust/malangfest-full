require("dotenv").config();

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("../generated/prisma");
const { ensureDefaultAdmin, publicAdmin, requireAdmin, signAdminToken } = require("./auth");

const prisma = new PrismaClient();
const app = express();
const PORT = Number(process.env.PORT || 5000);
const uploadDirectory = path.join(__dirname, "..", "uploads");
const EVENT_STATUSES = ["DRAFT", "UPCOMING", "PUBLISHED", "ARCHIVED"];
const PUBLIC_STATUSES = ["UPCOMING", "PUBLISHED"];

const BORDER_STYLES = [
  { id: "washi-tape", name: "Papan Mading Lakban & Pin", description: "Kertas karton mading dengan potongan lakban washi tape dan paku payung merah.", accentColor: "#FFE600", badge: "Mading Klasik" },
  { id: "baroque-gold", name: "Bingkai Ukir Klasik Emas", description: "Border ukiran seni opera bergaya barok emas dengan plakat galeri.", accentColor: "#F59E0B", badge: "Opera & Megah" },
  { id: "postage-stamp", name: "Perangko Seni Bergerigi", description: "Tepi perforasi perangko pos tempo dulu dengan cap Malang.", accentColor: "#EF4444", badge: "Vintage Heritage" },
  { id: "ticket-stub", name: "Karcis Teater Klasik", description: "Sobekan tiket pertunjukan opera dan teater dengan detail perforasi.", accentColor: "#8B5CF6", badge: "Lakon & Karcis" },
  { id: "riso-zine", name: "Risograph Neon Punk Zine", description: "Gaya cetak sablon risograph dua warna kontras dengan bayangan offset.", accentColor: "#EC4899", badge: "Eksperimental" },
  { id: "classic-wood", name: "Galeri Kayu Jati Gajayana", description: "Bingkai kayu gelap tebal khas galeri seni murni dengan plakat kuningan.", accentColor: "#78350F", badge: "Gedung Kesenian" },
  { id: "wavy-doodle", name: "Gelombang Psikedelik Neobrutal", description: "Garis kontur asimetris tebal khas poster konser jazz dan festival alternatif.", accentColor: "#06B6D4", badge: "Jazz & Konser" },
];

fs.mkdirSync(uploadDirectory, { recursive: true });
const allowedOrigins = (process.env.FRONTEND_URL || "").split(",").map((origin) => origin.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin tidak diizinkan oleh konfigurasi CORS."));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(uploadDirectory));
app.use((req, _res, next) => {
  req.prisma = prisma;
  next();
});

const uploadPoster = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, done) => done(null, uploadDirectory),
    filename: (_req, file, done) => {
      const extension = path.extname(file.originalname || "").toLowerCase();
      done(null, Date.now() + "-" + crypto.randomUUID() + extension);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, done) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) return done(null, true);
    return done(new Error("Format poster harus JPG, PNG, atau WebP."));
  },
});

function slugify(text) {
  return text.toString().toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w\-]+/g, "").replace(/\-\-+/g, "-").replace(/^-+/, "").replace(/-+$/, "");
}
function has(body, key) { return Object.prototype.hasOwnProperty.call(body, key); }
function value(body, key) { return typeof body[key] === "string" ? body[key].trim() : body[key]; }
function validDate(date) { return date && !Number.isNaN(new Date(date).getTime()); }

function validateEvent(body, isUpdate = false) {
  const errors = [];
  const required = ["title", "category", "posterUrl", "date", "time", "venue", "performer", "synopsis"];
  if (!isUpdate) required.forEach((field) => { if (!value(body, field)) errors.push(field + " wajib diisi."); });
  required.forEach((field) => { if (isUpdate && has(body, field) && !value(body, field)) errors.push(field + " tidak boleh kosong."); });
  if (has(body, "date") && !validDate(body.date)) errors.push("Tanggal pertunjukan tidak valid.");
  if (has(body, "borderStyle") && !BORDER_STYLES.some((style) => style.id === body.borderStyle)) errors.push("Gaya bingkai tidak tersedia.");
  if (has(body, "status") && !EVENT_STATUSES.includes(body.status)) errors.push("Status poster tidak valid.");
  if (has(body, "pinRotation") && (!Number.isFinite(Number(body.pinRotation)) || Math.abs(Number(body.pinRotation)) > 12)) errors.push("Rotasi poster harus antara -12 sampai 12 derajat.");
  return errors;
}

async function uniqueSlug(title, excludedId) {
  const root = slugify(title) || "poster-malangfest";
  let slug = root;
  let number = 2;
  while (true) {
    const existing = await prisma.event.findUnique({ where: { slug } });
    if (!existing || existing.id === excludedId) return slug;
    slug = root + "-" + number;
    number += 1;
  }
}

function buildEventData(body, existing) {
  const data = {};
  const stringFields = ["title", "category", "posterUrl", "time", "venue", "venueAddress", "priceType", "price", "performer", "synopsis", "status", "borderStyle"];
  stringFields.forEach((field) => { if (has(body, field)) data[field] = value(body, field); });
  ["ticketUrl", "curator", "highlight"].forEach((field) => { if (has(body, field)) data[field] = value(body, field) || null; });
  if (has(body, "date")) data.date = new Date(body.date);
  if (has(body, "pinRotation")) data.pinRotation = Number.parseInt(body.pinRotation, 10) || 0;
  if (!existing) {
    data.borderStyle = data.borderStyle || "washi-tape";
    data.pinRotation = data.pinRotation || 0;
    data.venueAddress = data.venueAddress || data.venue;
    data.priceType = data.priceType || "Gratis";
    data.price = data.price || (data.priceType === "Gratis" ? "Gratis" : "Donasi Terbuka");
    data.status = data.status || "DRAFT";
  } else if (has(body, "priceType") && !has(body, "price") && data.priceType === "Gratis") {
    data.price = "Gratis";
  }
  return data;
}

const failedLogins = new Map();
function loginGuard(req, res, next) {
  const key = req.ip || "unknown";
  const record = failedLogins.get(key);
  const now = Date.now();
  if (record && record.until > now) {
    const minutes = Math.ceil((record.until - now) / 60000);
    return res.status(429).json({ success: false, message: "Terlalu banyak percobaan login. Coba lagi dalam " + minutes + " menit." });
  }
  if (record && record.until <= now) failedLogins.delete(key);
  req.loginAttemptKey = key;
  next();
}
function noteFailedLogin(key) {
  const record = failedLogins.get(key) || { count: 0, until: 0 };
  record.count += 1;
  if (record.count >= 5) {
    record.count = 0;
    record.until = Date.now() + 15 * 60 * 1000;
  }
  failedLogins.set(key, record);
}

// Public endpoints
app.get("/api/health", (_req, res) => res.json({ success: true, service: "malangfest-api" }));
app.get("/api/borders", (_req, res) => res.json({ success: true, data: BORDER_STYLES }));

app.get("/api/stats", async (_req, res) => {
  try {
    const [totalEvents, categoriesGroup, likesSum, stickersCount] = await Promise.all([
      prisma.event.count({ where: { status: { in: PUBLIC_STATUSES } } }),
      prisma.event.groupBy({ by: ["category"], where: { status: { in: PUBLIC_STATUSES } }, _count: { id: true } }),
      prisma.event.aggregate({ where: { status: { in: PUBLIC_STATUSES } }, _sum: { likesCount: true } }),
      prisma.sticker.count(),
    ]);
    res.json({ success: true, data: { totalEvents, totalCategories: categoriesGroup.length, totalApplause: likesSum._sum.likesCount || 0, totalStickers: stickersCount } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/events", async (req, res) => {
  try {
    const { category, borderStyle, search } = req.query;
    const where = { status: { in: PUBLIC_STATUSES } };
    if (category && category !== "Semua") where.category = category;
    if (borderStyle && borderStyle !== "all") where.borderStyle = borderStyle;
    if (search) where.OR = [{ title: { contains: search } }, { venue: { contains: search } }, { performer: { contains: search } }, { synopsis: { contains: search } }];
    const events = await prisma.event.findMany({ where, include: { stickers: { orderBy: { createdAt: "desc" } } }, orderBy: { date: "asc" } });
    res.json({ success: true, count: events.length, data: events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/events/:idOrSlug", async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const numericId = /^\d+$/.test(idOrSlug) ? Number(idOrSlug) : undefined;
    const event = await prisma.event.findFirst({
      where: { ...(numericId ? { id: numericId } : { slug: idOrSlug }), status: { in: PUBLIC_STATUSES } },
      include: { stickers: { orderBy: { createdAt: "desc" } } },
    });
    if (!event) return res.status(404).json({ success: false, message: "Pertunjukan tidak ditemukan di mading." });
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/events/:id/like", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const event = await prisma.event.findFirst({ where: { id, status: { in: PUBLIC_STATUSES } } });
    if (!event) return res.status(404).json({ success: false, message: "Poster tidak ditemukan." });
    const updated = await prisma.event.update({ where: { id }, data: { likesCount: { increment: 1 } } });
    res.json({ success: true, likesCount: updated.likesCount });
  } catch (_) {
    res.status(404).json({ success: false, message: "Poster tidak ditemukan." });
  }
});

app.post("/api/events/:id/stickers", async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const text = value(req.body, "text");
    const color = value(req.body, "color") || "#FFE600";
    if (!text || text.length > 42) return res.status(400).json({ success: false, message: "Teks stiker wajib diisi (maksimum 42 karakter)." });
    const event = await prisma.event.findFirst({ where: { id: eventId, status: { in: PUBLIC_STATUSES } } });
    if (!event) return res.status(404).json({ success: false, message: "Poster tidak ditemukan." });
    const sticker = await prisma.sticker.create({ data: { eventId, text, color, rotation: Number((Math.random() * 16 - 8).toFixed(1)) } });
    res.status(201).json({ success: true, message: "Stiker apresiasi berhasil ditempelkan.", data: sticker });
  } catch (_) {
    res.status(404).json({ success: false, message: "Poster tidak ditemukan." });
  }
});

// Authentication
app.post("/api/admin/login", loginGuard, async (req, res) => {
  const username = value(req.body, "username");
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!username || !password) return res.status(400).json({ success: false, message: "Username dan password wajib diisi." });
  try {
    const admin = await prisma.admin.findUnique({ where: { username } });
    const isValid = admin && await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      noteFailedLogin(req.loginAttemptKey);
      return res.status(401).json({ success: false, message: "Username atau password tidak tepat." });
    }
    failedLogins.delete(req.loginAttemptKey);
    res.json({ success: true, data: { token: signAdminToken(admin), admin: publicAdmin(admin), expiresIn: "8h" } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
app.get("/api/admin/me", requireAdmin, (req, res) => res.json({ success: true, data: req.admin }));

app.get("/api/admin/dashboard", requireAdmin, async (_req, res) => {
  try {
    const now = new Date();
    const [totalEvents, drafts, live, applause, categories, recentEvents] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({ where: { status: "DRAFT" } }),
      prisma.event.count({ where: { status: { in: PUBLIC_STATUSES }, date: { gte: now } } }),
      prisma.event.aggregate({ _sum: { likesCount: true } }),
      prisma.event.groupBy({ by: ["category"], _count: { id: true } }),
      prisma.event.findMany({ take: 5, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, status: true, updatedAt: true, borderStyle: true } }),
    ]);
    res.json({ success: true, data: { totalEvents, drafts, live, applause: applause._sum.likesCount || 0, categoryCount: categories.length, recentEvents } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Protected admin CRUD
app.get("/api/admin/events", requireAdmin, async (req, res) => {
  try {
    const { search, status } = req.query;
    const where = {};
    if (status && EVENT_STATUSES.includes(status)) where.status = status;
    if (search) where.OR = [{ title: { contains: search } }, { venue: { contains: search } }, { performer: { contains: search } }];
    const events = await prisma.event.findMany({ where, include: { stickers: { orderBy: { createdAt: "desc" } } }, orderBy: { date: "asc" } });
    res.json({ success: true, count: events.length, data: events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/admin/uploads/poster", requireAdmin, (req, res, next) => {
  uploadPoster.single("poster")(req, res, (error) => {
    if (error) return next(error);
    if (!req.file) return res.status(400).json({ success: false, message: "Pilih berkas poster terlebih dahulu." });
    const origin = process.env.PUBLIC_API_ORIGIN || (req.protocol + "://" + req.get("host"));
    return res.status(201).json({ success: true, data: { url: origin + "/uploads/" + req.file.filename, filename: req.file.filename, size: req.file.size } });
  });
});

app.post("/api/admin/events", requireAdmin, async (req, res) => {
  const errors = validateEvent(req.body);
  if (errors.length) return res.status(400).json({ success: false, message: "Periksa data poster.", errors });
  try {
    const data = buildEventData(req.body);
    data.slug = await uniqueSlug(data.title);
    const event = await prisma.event.create({ data, include: { stickers: true } });
    res.status(201).json({ success: true, message: "Poster berhasil ditambahkan ke mading.", data: event });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/admin/events/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const errors = validateEvent(req.body, true);
  if (errors.length) return res.status(400).json({ success: false, message: "Periksa data poster.", errors });
  try {
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: "Poster tidak ditemukan." });
    const data = buildEventData(req.body, existing);
    if (data.title && data.title !== existing.title) data.slug = await uniqueSlug(data.title, id);
    const event = await prisma.event.update({ where: { id }, data, include: { stickers: true } });
    res.json({ success: true, message: "Poster berhasil diperbarui.", data: event });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/admin/events/:id", requireAdmin, async (req, res) => {
  try {
    await prisma.event.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true, message: "Poster berhasil dicopot dari mading." });
  } catch (_) {
    res.status(404).json({ success: false, message: "Poster tidak ditemukan." });
  }
});

// Old mutation paths are no longer public.
app.post("/api/events", requireAdmin, (req, res) => res.redirect(307, "/api/admin/events"));
app.put("/api/events/:id", requireAdmin, (req, res) => res.redirect(307, "/api/admin/events/" + req.params.id));
app.delete("/api/events/:id", requireAdmin, (req, res) => res.redirect(307, "/api/admin/events/" + req.params.id));

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) return res.status(400).json({ success: false, message: "Unggah poster gagal: " + error.message });
  if (error?.message === "Format poster harus JPG, PNG, atau WebP.") return res.status(400).json({ success: false, message: error.message });
  if (error?.message === "Origin tidak diizinkan oleh konfigurasi CORS.") return res.status(403).json({ success: false, message: error.message });
  console.error(error);
  return res.status(500).json({ success: false, message: "Terjadi kesalahan pada server." });
});

async function start() {
  await ensureDefaultAdmin(prisma);
  app.listen(PORT, () => console.log("Backend Malang Fest berjalan di http://localhost:" + PORT));
}
start().catch((error) => {
  console.error("Backend gagal dijalankan:", error);
  process.exit(1);
});
