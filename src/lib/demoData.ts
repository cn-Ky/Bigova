export const demoBusinesses = [
  {
    id: "demo-business-cafe",
    name: "Örnek Kampüs Kafe",
    category: "Kafe",
    phone: "0286 000 00 01",
    price_info: "Çay 20 TL · Tost 85 TL · Filtre kahve 65 TL",
    has_toilet: true,
    opens_at: "08:00",
    closes_at: "23:00",
    address: "Biga merkez · temsili adres",
    description:
      "Ders arası uğranan, geniş masalı ve sakin bir kampüs kafesi. Grup çalışması için uygun.",
    features: ["Wi‑Fi", "Priz", "Kart geçer", "Grup çalışması"],
    student_discount: "Öğrenci kartıyla sıcak içeceklerde %10",
    instagram: "ornekkafe",
    menu: [
      {
        section: "Sıcak içecekler",
        items: [
          { name: "Çay", price: "20 TL" },
          { name: "Filtre kahve", price: "65 TL" },
          { name: "Latte", price: "85 TL", note: "Süt seçeneği +10 TL" },
          { name: "Sıcak çikolata", price: "80 TL" },
        ],
      },
      {
        section: "Atıştırmalık",
        items: [
          { name: "Karışık tost", price: "85 TL" },
          { name: "Kaşarlı tost", price: "70 TL" },
          { name: "Simit + peynir", price: "55 TL" },
        ],
      },
      {
        section: "Tatlılar",
        items: [
          { name: "Sütlü Nuriye", price: "90 TL" },
          { name: "Brownie", price: "75 TL" },
        ],
      },
    ],
  },
  {
    id: "demo-business-kirtasiye",
    name: "Örnek Öğrenci Kırtasiyesi",
    category: "Kırtasiye",
    phone: "0286 000 00 02",
    price_info: "Fotokopi 1 TL/sayfa · çıktı 2 TL/sayfa",
    has_toilet: false,
    opens_at: "08:30",
    closes_at: "20:00",
    address: "Biga İİBF yakını · temsili adres",
    description: "Fotokopi, çıktı, ciltleme ve ofis malzemeleri. Sınav haftası uzun saatler açık.",
    features: ["Kart geçer", "Hızlı çıktı"],
    student_discount: "100 sayfa üzeri fotokopide indirim",
    menu: [
      {
        section: "Baskı & fotokopi",
        items: [
          { name: "Fotokopi (A4, siyah-beyaz)", price: "1 TL", note: "sayfa başı" },
          { name: "Çıktı (A4, siyah-beyaz)", price: "2 TL", note: "sayfa başı" },
          { name: "Renkli çıktı (A4)", price: "10 TL", note: "sayfa başı" },
        ],
      },
      {
        section: "Cilt & hizmet",
        items: [
          { name: "Spiral cilt", price: "40 TL" },
          { name: "Termal cilt", price: "60 TL" },
          { name: "Laminasyon (A4)", price: "15 TL" },
        ],
      },
      {
        section: "Malzeme",
        items: [
          { name: "Tükenmez kalem", price: "12 TL" },
          { name: "Çizgili defter (80 yaprak)", price: "55 TL" },
          { name: "Fosforlu kalem", price: "25 TL" },
        ],
      },
    ],
  },
  {
    id: "demo-business-yemek",
    name: "Örnek Ev Yemeği Lokantası",
    category: "Yemek",
    phone: "0286 000 00 03",
    price_info: "Günün menüsü 145 TL · çorba 55 TL",
    has_toilet: true,
    opens_at: "11:00",
    closes_at: "21:30",
    address: "Biga çarşı · temsili adres",
    description: "Her gün değişen ev yemekleri. Öğle saatlerinde yoğun, paket servis var.",
    features: ["Paket servis", "Kart geçer", "Vejetaryen seçenek"],
    student_discount: "Öğrenci kartıyla günün menüsünde 15 TL indirim",
    menu: [
      {
        section: "Günün menüsü",
        items: [
          { name: "Çorba + ana yemek + pilav", price: "145 TL" },
          { name: "Sadece ana yemek", price: "110 TL" },
        ],
      },
      {
        section: "Çorbalar",
        items: [
          { name: "Mercimek", price: "55 TL" },
          { name: "Ezogelin", price: "55 TL" },
        ],
      },
      {
        section: "Ana yemekler",
        items: [
          { name: "Kuru fasulye", price: "120 TL" },
          { name: "Tavuk sote", price: "130 TL" },
          { name: "Etli nohut", price: "140 TL" },
        ],
      },
      {
        section: "İçecekler",
        items: [
          { name: "Ayran", price: "20 TL" },
          { name: "Kola (33 cl)", price: "35 TL" },
        ],
      },
    ],
  },
  {
    id: "demo-business-camasir",
    name: "Örnek Öğrenci Çamaşırhanesi",
    category: "Hizmet",
    phone: "0286 000 00 04",
    price_info: "Yıkama 90 TL · kurutma 60 TL",
    has_toilet: true,
    opens_at: "09:00",
    closes_at: "22:00",
    address: "Biga merkez · temsili adres",
    description: "Self-servis çamaşırhane. Deterjan ve yumuşatıcı otomattan alınır.",
    features: ["Self-servis", "Bekleme alanı", "Wi‑Fi"],
    menu: [
      {
        section: "Makineler",
        items: [
          { name: "Yıkama (8 kg)", price: "90 TL" },
          { name: "Kurutma (8 kg)", price: "60 TL" },
          { name: "Yıkama (12 kg)", price: "130 TL" },
        ],
      },
      {
        section: "Ekstra",
        items: [
          { name: "Deterjan (tek kullanım)", price: "15 TL" },
          { name: "Yumuşatıcı (tek kullanım)", price: "10 TL" },
        ],
      },
    ],
  },
];

export const demoRoutes = [
  {
    id: "demo-route-campus",
    name: "Merkez – İİBF Kampüsü",
    type: "Otobüs",
    destination: "Biga İİBF",
    first_departure: "07:00",
    last_departure: "22:30",
    price: 20,
    stops: ["Biga Otogar", "Çarşı", "Hükümet Konağı", "İİBF Kampüsü"],
  },
  {
    id: "demo-route-myo",
    name: "Merkez – Biga MYO",
    type: "Servis",
    destination: "Biga MYO",
    first_departure: "07:30",
    last_departure: "18:00",
    price: 25,
    stops: ["Çarşı", "Biga Devlet Hastanesi", "Biga MYO"],
  },
  {
    id: "demo-route-terminal",
    name: "Merkez – Otogar",
    type: "Otobüs",
    destination: "Biga Otogar",
    first_departure: "06:45",
    last_departure: "23:00",
    price: 15,
    stops: ["Cumhuriyet Meydanı", "Çarşı", "Biga Otogar"],
  },
];

export const demoBooks = [
  {
    id: "demo-book-economics",
    title: "Mikro İktisat",
    author: "N. Gregory Mankiw",
    course: "Mikroekonomi",
    condition: "İyi",
    price: 240,
    description: "Kenar notları az, sayfaları temiz.",
    seller_id: null,
    profiles: { name: "Örnek öğrenci" },
  },
  {
    id: "demo-book-accounting",
    title: "Genel Muhasebe",
    author: "Orhan Sevilengül",
    course: "Genel Muhasebe",
    condition: "Çok iyi",
    price: 190,
    description: "Dönem boyunca kapaklı kullanıldı.",
    seller_id: null,
    profiles: { name: "Örnek öğrenci" },
  },
  {
    id: "demo-book-marketing",
    title: "Pazarlama İlkeleri",
    author: "Philip Kotler",
    course: "Pazarlama",
    condition: "Kullanılmış",
    price: 150,
    description: "İçinde birkaç bölüm işaretli.",
    seller_id: null,
    profiles: { name: "Örnek öğrenci" },
  },
];

export const demoFriends = [
  { id: "demo-friend-1", name: "Ece Yılmaz", student_no: "00000001" },
  { id: "demo-friend-2", name: "Mert Kaya", student_no: "00000002" },
  { id: "demo-friend-3", name: "Deniz Arslan", student_no: "00000003" },
];
