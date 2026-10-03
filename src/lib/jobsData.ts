export type JobType = "Yarı zamanlı" | "Tam zamanlı" | "Staj" | "Sezonluk" | "Uzaktan";

export const JOB_TYPES: JobType[] = ["Yarı zamanlı", "Tam zamanlı", "Staj", "Sezonluk", "Uzaktan"];
export const JOB_CATEGORIES = ["Kafe & Restoran", "Market & Mağaza", "Ofis & Büro", "Eğitim", "Hizmet", "Teknoloji", "Diğer"];

export type Job = {
  id: string;
  title: string;
  company: string;
  category: string;
  job_type: JobType;
  location: string | null;
  salary: string | null;
  description: string;
  requirements: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  student_friendly: boolean;
  created_at: string;
};

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

// Temsili örnek ilanlar: gerçek işletme, ücret veya iletişim bilgisi değildir.
export const demoJobs: Job[] = [
  {
    id: "demo-job-barista",
    title: "Barista (hafta sonu)",
    company: "Örnek Kampüs Kafe",
    category: "Kafe & Restoran",
    job_type: "Yarı zamanlı",
    location: "Biga merkez · temsili adres",
    salary: "Saatlik 120 TL · temsili",
    description: "Hafta sonu vardiyalarında sipariş alma, kahve hazırlama ve kasa desteği. Deneyim şart değil, öğrenmeye açık olman yeterli.",
    requirements: "Güler yüzlü, düzenli ve takım çalışmasına yatkın olmak.",
    contact_name: "Örnek yetkili",
    contact_phone: "0286 000 00 01",
    contact_whatsapp: "905000000001",
    contact_email: "ornek-kafe@example.com",
    student_friendly: true,
    created_at: daysAgo(1),
  },
  {
    id: "demo-job-kirtasiye",
    title: "Kırtasiye satış asistanı",
    company: "Örnek Öğrenci Kırtasiyesi",
    category: "Market & Mağaza",
    job_type: "Yarı zamanlı",
    location: "Biga İİBF yakını · temsili adres",
    salary: "Görüşmede belirlenir",
    description: "Ders aralarına uyumlu esnek saatlerle fotokopi, çıktı ve müşteri karşılama işleri.",
    requirements: "Ders programını paylaşabilmek, temel bilgisayar kullanımı.",
    contact_name: "Örnek yetkili",
    contact_phone: "0286 000 00 02",
    contact_whatsapp: null,
    contact_email: null,
    student_friendly: true,
    created_at: daysAgo(3),
  },
  {
    id: "demo-job-ozel-ders",
    title: "Matematik özel ders asistanı",
    company: "Örnek Etüt Merkezi",
    category: "Eğitim",
    job_type: "Yarı zamanlı",
    location: "Biga merkez · temsili adres",
    salary: "Ders başı ücret · temsili",
    description: "Lise öğrencilerine etüt desteği verecek, matematik veya fen bölümü öğrencileri aranıyor.",
    requirements: "İlgili bölümde okuyor olmak, iletişim becerisi.",
    contact_name: "Örnek koordinatör",
    contact_phone: null,
    contact_whatsapp: "905000000003",
    contact_email: "ornek-etut@example.com",
    student_friendly: true,
    created_at: daysAgo(5),
  },
  {
    id: "demo-job-sosyal-medya",
    title: "Sosyal medya içerik üreticisi",
    company: "Örnek Yerel Marka",
    category: "Teknoloji",
    job_type: "Uzaktan",
    location: "Uzaktan çalışma",
    salary: "Proje bazlı · temsili",
    description: "Yerel işletme için haftalık içerik planı hazırlama, görsel/video çekimi ve paylaşım takvimi yönetimi.",
    requirements: "Temel video düzenleme, Türkçe yazım kurallarına hakimiyet.",
    contact_name: null,
    contact_phone: null,
    contact_whatsapp: null,
    contact_email: "ornek-marka@example.com",
    student_friendly: true,
    created_at: daysAgo(7),
  },
  {
    id: "demo-job-staj",
    title: "Muhasebe stajyeri",
    company: "Örnek Mali Müşavirlik",
    category: "Ofis & Büro",
    job_type: "Staj",
    location: "Biga çarşı · temsili adres",
    salary: "Belirtilmedi",
    description: "Evrak düzenleme, fatura takibi ve muhasebe programı kullanımı konusunda uygulamalı staj imkânı.",
    requirements: "İşletme, iktisat veya maliye bölümü öğrencisi olmak.",
    contact_name: "Örnek yetkili",
    contact_phone: "0286 000 00 05",
    contact_whatsapp: null,
    contact_email: "ornek-mali@example.com",
    student_friendly: true,
    created_at: daysAgo(9),
  },
  {
    id: "demo-job-garson",
    title: "Garson (akşam vardiyası)",
    company: "Örnek Ev Yemeği Lokantası",
    category: "Kafe & Restoran",
    job_type: "Tam zamanlı",
    location: "Biga çarşı · temsili adres",
    salary: "Maaş + yemek · temsili",
    description: "Akşam vardiyası için servis ve masa düzeni işleri. Yemek işletme tarafından karşılanır.",
    requirements: "Deneyimli veya öğrenmeye istekli olmak.",
    contact_name: "Örnek yetkili",
    contact_phone: "0286 000 00 03",
    contact_whatsapp: "905000000006",
    contact_email: null,
    student_friendly: false,
    created_at: daysAgo(12),
  },
];

export function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return "Bugün";
  if (d === 1) return "Dün";
  if (d < 30) return `${d} gün önce`;
  return `${Math.floor(d / 30)} ay önce`;
}
