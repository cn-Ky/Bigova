export const iibfPrograms = [
  "Çalışma Ekonomisi ve Endüstri İlişkileri",
  "Ekonometri",
  "İktisat",
  "İşletme",
  "Kamu Yönetimi",
  "Maliye",
  "Uluslararası İlişkiler",
];

export const scheduleSources = {
  iibf: {
    updated: "1 Ekim 2026",
    href: "https://biibf.comu.edu.tr/arsiv/duyurular/2026-2027-akademik-yili-guz-yariyili-guncellenen01-r2901.html",
    programs: {
      "Çalışma Ekonomisi ve Endüstri İlişkileri": [
        "https://cdn.comu.edu.tr/cms/biibf/files/2672-calisma-ekonomisi-1-sinif-guncellendi16092026.pdf",
        "https://cdn.comu.edu.tr/cms/biibf/files/2671-calisma-ekonomisi-2-sinif-guncellendi16092026.pdf",
        "https://cdn.comu.edu.tr/cms/biibf/files/2691-calisma-ekonomisi-3-sinif-guncellendi01102026.pdf",
        "https://cdn.comu.edu.tr/cms/biibf/files/2683-calisma-ekonomisi-4-sinif-guncellendi22092026.pdf",
      ],
      Ekonometri: [
        "https://cdn.comu.edu.tr/cms/biibf/files/2663-ekonometri-1-sinif-guncellendi14092026.pdf",
        "https://cdn.comu.edu.tr/cms/biibf/files/2634-ekonometri-2-sinif.pdf",
        "https://cdn.comu.edu.tr/cms/biibf/files/2635-ekonometri-3-sinif.pdf",
        "https://cdn.comu.edu.tr/cms/biibf/files/2664-ekonometri-4-sinif-guncellendi14092026.pdf",
      ],
      İktisat: [
        "https://cdn.comu.edu.tr/cms/biibf/files/2676-iktisat-1-sinif-guncellendi17092026.pdf",
        "https://cdn.comu.edu.tr/cms/biibf/files/2638-iktisat-2-sinif.pdf",
        "https://cdn.comu.edu.tr/cms/biibf/files/2639-iktisat-3-sinif.pdf",
        "https://cdn.comu.edu.tr/cms/biibf/files/2640-iktisat-4-sinif.pdf",
      ],
      İşletme: [
        "https://cdn.comu.edu.tr/cms/biibf/files/2679-isletme-1-sinif-guncellendi21092026.pdf",
        "https://cdn.comu.edu.tr/cms/biibf/files/2680-isletme-2-sinif-guncellendi21092026.pdf",
        "https://cdn.comu.edu.tr/cms/biibf/files/2643-isletme-3-sinif.pdf",
        "https://cdn.comu.edu.tr/cms/biibf/files/2686-isletme-4-sinif-f-guncellendi25092026.pdf",
      ],
      "Kamu Yönetimi": [
        "https://cdn.comu.edu.tr/cms/biibf/files/2675-kamu-yonetimi-1-sinif-guncellendi17092026.pdf",
        "https://cdn.comu.edu.tr/cms/biibf/files/2646-kamu-yonetimi-2-sinifi.pdf",
        "https://cdn.comu.edu.tr/cms/biibf/files/2647-kamu-yonetimi-3-sinif.pdf",
        "https://cdn.comu.edu.tr/cms/biibf/files/2649-kamu-yonetimi-4-sinif.pdf",
      ],
      Maliye: [
        "https://cdn.comu.edu.tr/cms/biibf/files/2678-maliye-bolumu-1-sinif-guncellendi21092026.pdf",
        "https://cdn.comu.edu.tr/cms/biibf/files/2685-maliye-bolumu-2-sinif-guncellendi23092026.pdf",
        "https://cdn.comu.edu.tr/cms/biibf/files/2652-maliye-bolumu-3-sinif.pdf",
        "https://cdn.comu.edu.tr/cms/biibf/files/2654-maliye-bolumu-4-sinif.pdf",
      ],
      "Uluslararası İlişkiler": [
        "https://cdn.comu.edu.tr/cms/biibf/files/2661-uluslararasi-iliskiler-30-ing-1-sinif.pdf",
        "https://cdn.comu.edu.tr/cms/biibf/files/2688-uluslararasi-iliskiler-30-ing-2-sinif-guncellendi2.pdf",
        "https://cdn.comu.edu.tr/cms/biibf/files/2658-uluslararasi-iliskiler-30-ing-3-sinif.pdf",
        "https://cdn.comu.edu.tr/cms/biibf/files/2660-uluslararasi-iliskiler-30-ing-4-sinif.pdf",
      ],
    } as Record<string, string[]>,
    additional: [
      {
        program: "Kamu Yönetimi",
        yearIndex: 3,
        label: "İkinci öğretim PDF'si",
        href: "https://cdn.comu.edu.tr/cms/biibf/files/2648-kamu-yonetimi-4-sinif-i-o.pdf",
      },
      {
        program: "Maliye",
        yearIndex: 3,
        label: "İkinci öğretim PDF'si",
        href: "https://cdn.comu.edu.tr/cms/biibf/files/2653-maliye-bolumu-4-sinif-i-o.pdf",
      },
      {
        program: "Uluslararası İlişkiler",
        yearIndex: 2,
        label: "İkinci öğretim PDF'si",
        href: "https://cdn.comu.edu.tr/cms/biibf/files/2657-uluslararasi-iliskiler-30-ing-3-sinif-i-o.pdf",
      },
      {
        program: "Uluslararası İlişkiler",
        yearIndex: 3,
        label: "İkinci öğretim PDF'si",
        href: "https://cdn.comu.edu.tr/cms/biibf/files/2659-uluslararasi-iliskiler-30-ing-4-sinif-i-o.pdf",
      },
    ],
  },
  myo: {
    updated: "18 Eylül 2026",
    href: "https://cdn.comu.edu.tr/cms/bigamyo/files/1557-siniflar-haftalik-ders-programi-3.pdf",
    source:
      "https://bigamyo.comu.edu.tr/arsiv/duyurular/2026-2027-guz-yariyili-guncellenen-haftalik-ders-p-r1774.html",
  },
};
