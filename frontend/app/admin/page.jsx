"use client";

import { useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const TOKEN_KEY = "malangfest_admin_token";
const categories = ["Musik & Konser", "Opera & Klasik", "Teater & Drama", "Tari & Budaya", "Pameran Seni & Rupa", "Seni Rupa"];
const statuses = ["DRAFT", "UPCOMING", "PUBLISHED", "ARCHIVED"];

const blankEvent = {
  title: "",
  category: "Musik & Konser",
  posterUrl: "",
  borderStyle: "washi-tape",
  pinRotation: 0,
  date: "",
  time: "",
  venue: "",
  venueAddress: "",
  priceType: "Gratis",
  price: "Gratis",
  ticketUrl: "",
  performer: "",
  curator: "",
  synopsis: "",
  highlight: "",
  status: "DRAFT",
};

function dateForInput(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function Icon({ name, size = 18 }) {
  const icons = {
    grid: <><rect x="3.5" y="3.5" width="6.5" height="6.5"/><rect x="14" y="3.5" width="6.5" height="6.5"/><rect x="3.5" y="14" width="6.5" height="6.5"/><rect x="14" y="14" width="6.5" height="6.5"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    upload: <><path d="M12 16V3"/><path d="m7 8 5-5 5 5"/><path d="M5 14v5h14v-5"/></>,
    edit: <><path d="m4 20 4.2-1 10.5-10.5a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z"/><path d="m13.8 7.5 3 3"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M6.5 7l.8 13h9.4l.8-13M10 11v5M14 11v5"/></>,
    logout: <><path d="M10 5H5v14h5"/><path d="M14 8l4 4-4 4M18 12H9"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 4.5 4.5"/></>,
    check: <><path d="m5 12 4.2 4.2L19 6.5"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="1"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 18 5.7-5.7 3.6 3.4 2.2-2.2 4.5 4.5"/></>,
    x: <><path d="m6 6 12 12M18 6 6 18"/></>,
    external: <><path d="M14 4h6v6"/><path d="m20 4-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>;
}

function Status({ value }) {
  return <span className={"admin-status " + value.toLowerCase()}>{value === "UPCOMING" ? "TAYANG" : value}</span>;
}

function Login({ onLogin, error, busy }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  function submit(event) {
    event.preventDefault();
    onLogin(username, password);
  }
  return (
    <main className="admin-login">
      <a className="admin-login-brand" href="/"><span>MF</span> MALANG<br/>FEST</a>
      <section className="login-panel">
        <div className="login-copy">
          <span className="admin-eyebrow">RUANG KURATOR / TERKUNCI</span>
          <h1>Rawat<br/><i>madingmu.</i></h1>
          <p>Masuk untuk menempel, menyunting, dan merapikan kabar panggung Malang.</p>
          <div className="login-art"><b>✳</b><span>POSTER<br/>YANG BAIK<br/>MENCARI<br/>MATA.</span><em>2026</em></div>
        </div>
        <form className="login-form" onSubmit={submit}>
          <span className="admin-eyebrow">IDENTITAS ADMIN</span>
          <h2>Masuk ke<br/>ruang kerja.</h2>
          <label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required placeholder="nama pengguna" /></label>
          <label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required placeholder="••••••••" /></label>
          {error && <p className="admin-error">{error}</p>}
          <button className="admin-primary login-submit" disabled={busy}>{busy ? "MEMERIKSA..." : <>MASUK <Icon name="arrow" size={17}/></>}</button>
          <a href="/" className="back-to-mading">← kembali ke mading publik</a>
        </form>
      </section>
    </main>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [admin, setAdmin] = useState(null);
  const [events, setEvents] = useState([]);
  const [borders, setBorders] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [form, setForm] = useState(blankEvent);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function request(path, activeToken, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (activeToken) headers.Authorization = "Bearer " + activeToken;
    if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
    const response = await fetch(API_URL + path, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || payload.error || "Permintaan tidak berhasil.");
    return payload;
  }

  async function loadWorkspace(activeToken) {
    const [me, eventsData, bordersData, dashboardData] = await Promise.all([
      request("/admin/me", activeToken),
      request("/admin/events", activeToken),
      request("/borders", activeToken),
      request("/admin/dashboard", activeToken),
    ]);
    setAdmin(me.data);
    setEvents(eventsData.data);
    setBorders(bordersData.data);
    setDashboard(dashboardData.data);
  }

  useEffect(() => {
    const storedToken = window.sessionStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setLoading(false);
      return;
    }
    setToken(storedToken);
    loadWorkspace(storedToken)
      .catch(() => {
        window.sessionStorage.removeItem(TOKEN_KEY);
        setToken("");
        setError("Sesi berakhir. Silakan masuk kembali.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password) {
    setBusy(true);
    setError("");
    try {
      const response = await request("/admin/login", "", { method: "POST", body: JSON.stringify({ username, password }) });
      window.sessionStorage.setItem(TOKEN_KEY, response.data.token);
      setToken(response.data.token);
      await loadWorkspace(response.data.token);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }

  function logout() {
    window.sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
    setAdmin(null);
    setEvents([]);
    setDashboard(null);
    setForm(blankEvent);
    setEditingId(null);
  }

  function notify(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  }

  function updateForm(field, nextValue) {
    setForm((current) => ({ ...current, [field]: nextValue }));
  }

  function createNew() {
    setEditingId(null);
    setForm(blankEvent);
    document.getElementById("poster-composer")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function editEvent(event) {
    setEditingId(event.id);
    setForm({
      ...blankEvent,
      ...event,
      date: dateForInput(event.date),
      ticketUrl: event.ticketUrl || "",
      curator: event.curator || "",
      highlight: event.highlight || "",
    });
    document.getElementById("poster-composer")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveEvent(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const endpoint = editingId ? "/admin/events/" + editingId : "/admin/events";
      const response = await request(endpoint, token, { method: editingId ? "PUT" : "POST", body: JSON.stringify(form) });
      const saved = response.data;
      setEvents((current) => editingId ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setEditingId(null);
      setForm(blankEvent);
      notify(response.message);
      const nextDashboard = await request("/admin/dashboard", token);
      setDashboard(nextDashboard.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeEvent(event) {
    if (!window.confirm('Copot poster "' + event.title + '" dari mading? Tindakan ini tidak dapat dibatalkan.')) return;
    try {
      const response = await request("/admin/events/" + event.id, token, { method: "DELETE" });
      setEvents((current) => current.filter((item) => item.id !== event.id));
      if (editingId === event.id) createNew();
      notify(response.message);
      const nextDashboard = await request("/admin/dashboard", token);
      setDashboard(nextDashboard.data);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function uploadPoster(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran poster maksimal 5 MB.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const data = new FormData();
      data.append("poster", file);
      const response = await request("/admin/uploads/poster", token, { method: "POST", body: data });
      updateForm("posterUrl", response.data.url);
      notify("Poster berhasil diunggah. Pilih bingkainya, lalu simpan.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  const visibleEvents = useMemo(() => events.filter((event) => {
    const matchesSearch = (event.title + " " + event.venue + " " + event.performer).toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (statusFilter === "ALL" || event.status === statusFilter);
  }), [events, search, statusFilter]);

  if (loading) return <main className="admin-loading">Memuat ruang kurator…</main>;
  if (!token || !admin) return <Login onLogin={login} error={error} busy={busy} />;

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-side-brand" href="/"><span>MF</span><b>MALANG<br/>FEST</b></a>
        <div className="admin-side-title">RUANG<br/><i>KURATOR</i></div>
        <nav><a className="active" href="#ringkasan"><Icon name="grid"/> Ringkasan</a><a href="#poster-list"><Icon name="image"/> Semua poster</a><button onClick={createNew}><Icon name="plus"/> Tempel poster</button></nav>
        <div className="admin-account"><span>{admin.displayName}</span><small>@{admin.username} · ADMIN</small><button onClick={logout}><Icon name="logout" size={16}/> Keluar</button></div>
      </aside>

      <section className="admin-content">
        <header className="admin-header">
          <div><span className="admin-eyebrow">DASBOR / EDISI HARI INI</span><h1>Halo, <i>{admin.displayName.split(" ")[0]}.</i></h1></div>
          <div className="admin-header-actions"><a className="admin-view-public" href="/" target="_blank">Lihat mading <Icon name="external" size={15}/></a><button className="admin-primary" onClick={createNew}><Icon name="plus"/> TAMBAH POSTER</button></div>
        </header>

        <section id="ringkasan" className="admin-stats">
          <article><span>TOTAL POSTER</span><strong>{dashboard?.totalEvents || 0}</strong><small>{dashboard?.categoryCount || 0} ragam acara</small></article>
          <article><span>AKAN TAYANG</span><strong>{dashboard?.live || 0}</strong><small>poster publik mendatang</small></article>
          <article><span>MASIH DRAF</span><strong>{dashboard?.drafts || 0}</strong><small>butuh sentuhan kurator</small></article>
          <article><span>TEPUK TANGAN</span><strong>{dashboard?.applause || 0}</strong><small>akumulasi apresiasi</small></article>
        </section>

        <section id="poster-list" className="admin-workspace">
          <div className="admin-list-panel">
            <div className="admin-section-heading"><div><span className="admin-eyebrow">KOLEKSI MADING</span><h2>Poster yang<br/><i>sedang dirawat.</i></h2></div><button className="admin-plain-button" onClick={createNew}><Icon name="plus"/> Baru</button></div>
            <div className="admin-list-controls"><label className="admin-search"><Icon name="search" size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="cari judul atau tempat..." /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">Semua status</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
            <div className="admin-event-list">
              {visibleEvents.map((event) => <article className="admin-event-row" key={event.id}>
                <img src={event.posterUrl} alt="" />
                <div className="admin-event-main"><Status value={event.status}/><strong>{event.title}</strong><span>{new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(event.date))} · {event.venue}</span></div>
                <span className="admin-frame-tag">{borders.find((border) => border.id === event.borderStyle)?.badge || event.borderStyle}</span>
                <div className="admin-row-actions"><button onClick={() => editEvent(event)} aria-label={"Edit " + event.title}><Icon name="edit" size={17}/></button><button onClick={() => removeEvent(event)} aria-label={"Hapus " + event.title}><Icon name="trash" size={17}/></button></div>
              </article>)}
              {!visibleEvents.length && <p className="admin-empty">Tidak ada poster yang cocok.</p>}
            </div>
          </div>

          <form id="poster-composer" className="poster-composer" onSubmit={saveEvent}>
            <div className="composer-heading"><div><span className="admin-eyebrow">{editingId ? "MENYUNTING POSTER" : "POSTER BARU"}</span><h2>{editingId ? "Rapikan karya." : "Tempel karya."}</h2></div>{editingId && <button type="button" className="composer-close" onClick={createNew}><Icon name="x" size={17}/></button>}</div>
            {error && <p className="admin-error">{error}</p>}
            <section className="composer-poster">
              <div className="poster-upload-preview">{form.posterUrl ? <img src={form.posterUrl} alt="Pratinjau poster" /> : <span><Icon name="image" size={28}/>Poster<br/>4 : 5</span>}</div>
              <div className="poster-upload-copy"><b>Materi visual</b><small>JPG, PNG, WebP · maks. 5 MB</small><label className="upload-button"><Icon name="upload" size={16}/>{uploading ? "MENGUNGGAH..." : "UNGGAH POSTER"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPoster} disabled={uploading}/></label><input value={form.posterUrl} onChange={(event) => updateForm("posterUrl", event.target.value)} placeholder="atau tempel URL poster" required /></div>
            </section>
            <div className="poster-size-guide"><span>RATIO WAJIB</span><b>4 : 5</b><p>Rekomendasi 1080 × 1350 px. Sisakan ruang aman 80 px di tepi agar judul tidak tertutup bingkai.</p></div>
            <fieldset><legend>Identitas pertunjukan</legend><label className="field-full">Judul pertunjukan<input value={form.title} onChange={(event) => updateForm("title", event.target.value)} required placeholder="Contoh: Simfoni di Kayutangan" /></label><div className="field-grid"><label>Kategori<select value={form.category} onChange={(event) => updateForm("category", event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Status poster<select value={form.status} onChange={(event) => updateForm("status", event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label></div><label className="field-full">Penampil / kolektif<input value={form.performer} onChange={(event) => updateForm("performer", event.target.value)} required placeholder="Nama musisi, teater, atau seniman" /></label></fieldset>
            <fieldset><legend>Waktu & tempat</legend><div className="field-grid"><label>Tanggal<input type="date" value={form.date} onChange={(event) => updateForm("date", event.target.value)} required /></label><label>Jam<input value={form.time} onChange={(event) => updateForm("time", event.target.value)} required placeholder="19.00 WIB" /></label></div><label className="field-full">Nama venue<input value={form.venue} onChange={(event) => updateForm("venue", event.target.value)} required placeholder="Gedung / ruang pertunjukan" /></label><label className="field-full">Alamat venue<input value={form.venueAddress} onChange={(event) => updateForm("venueAddress", event.target.value)} placeholder="Alamat lengkap (opsional)" /></label></fieldset>
            <fieldset><legend>Bingkai & harga</legend><div className="frame-select-grid">{borders.map((border) => <button type="button" key={border.id} onClick={() => updateForm("borderStyle", border.id)} className={"frame-select " + (form.borderStyle === border.id ? "selected " : "") + "frame-" + border.id}><span /><b>{border.badge}</b></button>)}</div><div className="field-grid"><label>Harga<select value={form.priceType} onChange={(event) => updateForm("priceType", event.target.value)}><option>Gratis</option><option>Berbayar</option><option>Donasi Sukarela</option></select></label><label>Nominal / keterangan<input value={form.price} onChange={(event) => updateForm("price", event.target.value)} placeholder="Rp 50.000 / Gratis" /></label></div><label className="field-full">URL tiket (opsional)<input type="url" value={form.ticketUrl} onChange={(event) => updateForm("ticketUrl", event.target.value)} placeholder="https://..." /></label></fieldset>
            <fieldset><legend>Cerita acara</legend><label className="field-full">Sinopsis<textarea value={form.synopsis} onChange={(event) => updateForm("synopsis", event.target.value)} required placeholder="Ceritakan mengapa orang perlu datang..." /></label><label className="field-full">Kurator / pengarah (opsional)<input value={form.curator} onChange={(event) => updateForm("curator", event.target.value)} placeholder="Nama kurator" /></label><label className="field-full">Highlight (opsional)<input value={form.highlight} onChange={(event) => updateForm("highlight", event.target.value)} placeholder="Contoh: Kapasitas hanya 60 kursi" /></label></fieldset>
            <button className="admin-primary composer-save" disabled={busy}>{busy ? "MENYIMPAN..." : <>{editingId ? "SIMPAN PERUBAHAN" : "TEMPEL KE MADING"} <Icon name="check" size={17}/></>}</button>
          </form>
        </section>
      </section>
      {notice && <div className="admin-toast"><Icon name="check" size={16}/>{notice}</div>}
    </main>
  );
}
