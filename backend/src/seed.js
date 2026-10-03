const { PrismaClient } = require('../generated/prisma');
const { ensureDefaultAdmin } = require('./auth');
const prisma = new PrismaClient();

const sampleEvents = [
  {
    title: "Opera Carmen van Oost-Java: Epos Romantika Klasik",
    slug: "opera-carmen-van-oost-java",
    category: "Opera & Klasik",
    posterUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=1000&auto=format&fit=crop",
    borderStyle: "baroque-gold",
    pinRotation: -2,
    date: new Date("2026-10-18T19:30:00Z"),
    time: "19:30 - 22:30 WIB",
    venue: "Gedung Kesenian Gajayana",
    venueAddress: "Jl. Nusakambangan No.19, Kasin, Kec. Klojen, Kota Malang",
    priceType: "Berbayar",
    price: "Rp 65.000 - Rp 150.000",
    ticketUrl: "https://tiket.malangfest.id/carmen-oost-java",
    performer: "Malang Classical Opera Ensemble ft. Soprano Sekar Arum & Surabaya Chamber Philharmonic",
    curator: "Maestro Hendro Sasongko (Dewan Kesenian Jatim)",
    synopsis: "Pementasan opera megah 4 babak yang mengadaptasi karya agung Georges Bizet 'Carmen' dengan sentuhan orkestrasi gamelan slendro malangan dan tata panggung neobrutalisme kolonial. Mengisahkan gairah cinta membara dan nasib tragis di pelataran stasiun trem tua.",
    highlight: "★ Pementasan Opera Megah Pertama Tahun Ini di Gedung Kesenian Gajayana!",
    status: "UPCOMING",
    likesCount: 128,
    stickers: [
      { text: "Apik Pol! 🎭", color: "#FFE600", rotation: -4 },
      { text: "Wajib Nonton!", color: "#00F0FF", rotation: 5 },
      { text: "Mbois Ilakes!", color: "#FF4365", rotation: -2 }
    ]
  },
  {
    title: "Simfoni Suropati: Masterpieces of Tchaikovsky & Gombloh",
    slug: "simfoni-suropati-tchaikovsky-gombloh",
    category: "Musik & Konser",
    posterUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1000&auto=format&fit=crop",
    borderStyle: "classic-wood",
    pinRotation: 1,
    date: new Date("2026-10-25T19:00:00Z"),
    time: "19:00 - 22:00 WIB",
    venue: "Graha Cakrawala Universitas Negeri Malang",
    venueAddress: "Jl. Semarang No.5, Sumbersari, Kec. Lowokwaru, Kota Malang",
    priceType: "Berbayar",
    price: "Rp 50.000 - Rp 120.000",
    ticketUrl: "https://tiket.malangfest.id/simfoni-suropati",
    performer: "Brawijaya Symphony Orchestra ft. Paduan Suara Mahasiswa Gitasurya UM",
    curator: "Dr. FX. Sutopo, M.Sn",
    synopsis: "Kolaborasi simfoni 60-piece orchestra yang meleburkan melodi klasik Tchaikovsky '1812 Overture' dengan repertoar legendaris Gombloh dalam aransemen megah. Menggetarkan gedung dengan brass section menggelegar dan visual lighting analog eksperimental.",
    highlight: "★ 60 Musisi Orkestra Klasik + 40 Vokalis Paduan Suara!",
    status: "UPCOMING",
    likesCount: 215,
    stickers: [
      { text: "Merinding! 🎻", color: "#00D664", rotation: -6 },
      { text: "Mahakarya!", color: "#FFE600", rotation: 3 }
    ]
  },
  {
    title: "Lakon Arok Dedes: Tragedi Cinta, Keris & Tahta Singhasari",
    slug: "lakon-arok-dedes-tragedi-tahta",
    category: "Teater & Drama",
    posterUrl: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?q=80&w=1000&auto=format&fit=crop",
    borderStyle: "ticket-stub",
    pinRotation: -3,
    date: new Date("2026-11-05T20:00:00Z"),
    time: "20:00 - 22:30 WIB",
    venue: "Gedung Dewan Kesenian Malang (DKM)",
    venueAddress: "Jl. Majapahit No.3, Kauman, Kec. Klojen, Kota Malang",
    priceType: "Donasi Sukarela",
    price: "Donasi Terbuka (Apresiasi)",
    ticketUrl: "https://tiket.malangfest.id/arok-dedes-dkm",
    performer: "Teater Celaket & Bengkel Seni Kutho Lawas",
    curator: "Wahyu Eko Setiawan (Pemerhati Sejarah Malang)",
    synopsis: "Pentas teater kontemporer berdurasi 150 menit yang membongkar mitos dan fakta intrik politik Ken Arok dan Ken Dedes. Menggunakan dialog bahasa Jawa Kawi dialek Arekan, tata kostum lurik dekonstruktif, dan musik ambient gamelan distorsi.",
    highlight: "★ Karya Teater Eksperimental Pemenang Hibah Seni Teater Jatim 2026",
    status: "UPCOMING",
    likesCount: 94,
    stickers: [
      { text: "Seni Banget! 🎭", color: "#FF4365", rotation: 4 },
      { text: "Tiket Terbatas!", color: "#FFE600", rotation: -3 }
    ]
  },
  {
    title: "Gelar Tari Topeng Malangan: Sang Panji Pulang Jiwa",
    slug: "gelar-tari-topeng-malangan-panji",
    category: "Tari & Budaya",
    posterUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop",
    borderStyle: "postage-stamp",
    pinRotation: 2,
    date: new Date("2026-11-12T18:30:00Z"),
    time: "18:30 - 21:30 WIB",
    venue: "Padepokan Seni Topeng Asmorobangun",
    venueAddress: "Dusun Kedungmonggo, Karangpandan, Pakisaji, Malang",
    priceType: "Gratis",
    price: "Gratis untuk Umum",
    ticketUrl: "https://tiket.malangfest.id/tari-topeng-asmorobangun",
    performer: "Generasi Muda Penari Wayang Topeng Kedungmonggo & Karawitan Panji Asmoro",
    curator: "Tri Handoyo (Pewaris Maestro Topeng Malangan)",
    synopsis: "Ritual dan pertunjukan kolosal tari Wayang Topeng khas Kedungmonggo Malang. Menyajikan 24 karakter topeng ukir kayu cempaka berusia puluhan tahun dengan gerak tari dinamis, mistis, dan sarat filosofi persatuan jiwa agung.",
    highlight: "★ Warisan Budaya Takbenda Dunia UNESCO • Terbuka & Ramah Semua Usia",
    status: "UPCOMING",
    likesCount: 340,
    stickers: [
      { text: "Bangga Malang! 🪵", color: "#00F0FF", rotation: -5 },
      { text: "Lestarikan!", color: "#00D664", rotation: 2 }
    ]
  },
  {
    title: "Retrospeksi Kuas Semeru: Pameran Lukisan & Instalasi Rupa",
    slug: "retrospeksi-kuas-semeru",
    category: "Pameran Seni & Rupa",
    posterUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=1000&auto=format&fit=crop",
    borderStyle: "riso-zine",
    pinRotation: -1,
    date: new Date("2026-11-20T10:00:00Z"),
    time: "10:00 - 21:00 WIB (Berlangsung 7 Hari)",
    venue: "Galeri Dewan Kesenian Malang & Ruang Terbuka Hijau",
    venueAddress: "Jl. Majapahit No.3, Kauman, Kec. Klojen, Kota Malang",
    priceType: "Gratis",
    price: "Gratis (Registrasi Pengunjung)",
    ticketUrl: "https://tiket.malangfest.id/kuas-semeru-exhibition",
    performer: "18 Seniman Rupa Arek Malang & Kolektif Perupa Lereng Bromo",
    curator: "Agus 'Koecink' Sukamto",
    synopsis: "Pameran seni visual bertaraf nasional yang menampilkan 45 lukisan kanvas cat minyak, instalasi bambu kinetik, dan video-art pemandangan lanskap spiritual Gunung Semeru dan Malang tempo doeloe. Disertai art talk dan demo live painting.",
    highlight: "★ Eksplorasi Garis & Warna Neobrutalisme Seni Murni Jawa Timuran",
    status: "UPCOMING",
    likesCount: 167,
    stickers: [
      { text: "Estetik Parah! 🎨", color: "#FFE600", rotation: 6 },
      { text: "Kuas Gahar!", color: "#FF4365", rotation: -4 }
    ]
  },
  {
    title: "Nocturne di Kayutangan: String Quartet & Harpsichord Recital",
    slug: "nocturne-di-kayutangan-recital",
    category: "Opera & Klasik",
    posterUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1000&auto=format&fit=crop",
    borderStyle: "washi-tape",
    pinRotation: 3,
    date: new Date("2026-11-28T20:00:00Z"),
    time: "20:00 - 22:00 WIB",
    venue: "Rumah Heritage 1870 Kayutangan",
    venueAddress: "Koridor Utama Jl. Basuki Rahmat No.56, Kauman, Klojen, Kota Malang",
    priceType: "Berbayar",
    price: "Rp 75.000 (Termasuk Kopi & Kue Tradisional)",
    ticketUrl: "https://tiket.malangfest.id/nocturne-kayutangan",
    performer: "Kayutangan Chamber Quartet ft. Pianis & Harpsichordist Daniel Kristianto",
    curator: "Komunitas Musik Klasik Malang",
    synopsis: "Pertunjukan malam intim di beranda rumah peninggalan kolonial abad ke-19. Mengalunkan karya-karya malam karya Chopin, Vivaldi, dan Bach yang dipadukan dengan kidung Jawa klasik. Dikelilingi temaram lampu teplok dan semilir angin dingin Malang tempo dulu.",
    highlight: "★ Kapasitas Sangat Terbatas (Hanya 60 Kursi Eksklusif)!",
    status: "UPCOMING",
    likesCount: 189,
    stickers: [
      { text: "Syahdu Pol! ☕", color: "#00F0FF", rotation: 1 },
      { text: "Vibe Klasik!", color: "#FFE600", rotation: -3 }
    ]
  },
  {
    title: "Malang Vintage Brass & Big Band Jazz Nocturnal 2026",
    slug: "malang-vintage-brass-jazz-2026",
    category: "Musik & Konser",
    posterUrl: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=1000&auto=format&fit=crop",
    borderStyle: "wavy-doodle",
    pinRotation: -2,
    date: new Date("2026-12-04T18:00:00Z"),
    time: "18:00 - 23:00 WIB",
    venue: "Amphitheater Taman Krida Budaya Jawa Timur (TKBJ)",
    venueAddress: "Jl. Soekarno - Hatta No.7, Jatimulyo, Kec. Lowokwaru, Kota Malang",
    priceType: "Berbayar",
    price: "Rp 35.000 - Rp 85.000",
    ticketUrl: "https://tiket.malangfest.id/brass-jazz-malang",
    performer: "Malang Brass Syndicate, Surabaya All-Star Jazz, & Guest Trombonist",
    curator: "Malang Jazz Society",
    synopsis: "Ledakan harmoni brass trumpet, trombone, saxophone, dan drum berirama swing-bebop era 1940-an hingga funk eksperimental. Digelar di ruang terbuka TKBJ di bawah naungan pohon trembesi dengan instalasi neon neobrutalisme.",
    highlight: "★ Festival Terompet & Big Band Terbesar se-Jawa Timur!",
    status: "UPCOMING",
    likesCount: 290,
    stickers: [
      { text: "Swing Abis! 🎺", color: "#FF4365", rotation: 5 },
      { text: "Groovy Rek!", color: "#00D664", rotation: -2 }
    ]
  }
];

async function main() {
  await ensureDefaultAdmin(prisma);
  console.log("Menghapus data lama...");
  await prisma.sticker.deleteMany({});
  await prisma.event.deleteMany({});

  console.log("Memulai seeding data pertunjukan seni Malang...");
  for (const ev of sampleEvents) {
    const { stickers, ...eventData } = ev;
    const createdEvent = await prisma.event.create({
      data: eventData
    });

    if (stickers && stickers.length > 0) {
      for (const st of stickers) {
        await prisma.sticker.create({
          data: {
            eventId: createdEvent.id,
            text: st.text,
            color: st.color,
            rotation: st.rotation
          }
        });
      }
    }
  }

  console.log(`Berhasil seeding ${sampleEvents.length} pertunjukan seni khas Malang!`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
