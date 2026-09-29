import type { NoteItem } from "./types";

// Notlar henüz Supabase'e bağlanmadı (sonraki adım).
export const NOTES: NoteItem[] = [
  { id: "n1", title: "Makroekonomi vize özeti", course: "İKT 102", department: "İktisat", year: "2025-2026", type: "Ders notu", author: "Zeynep A." },
  { id: "n2", title: "İstatistik çıkmış sorular", course: "İST 201", department: "İşletme", year: "2024-2025", type: "PDF", author: "Can D." },
];
