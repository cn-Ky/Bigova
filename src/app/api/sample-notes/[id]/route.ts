import { NextResponse } from "next/server";

const samples: Record<string, { title: string; lines: string[] }> = {
  mikroekonomi: {
    title: "Mikroekonomi Vize Ozeti",
    lines: [
      "Temsili ornek materyaldir; resmi ders notu degildir.",
      "",
      "1. Arz ve talep",
      "Talep egirisi fiyatla ters, arz egirisi fiyatla ayni yonlu hareket eder.",
      "Denge noktasi, arz ve talep miktarlarinin esit oldugu noktadir.",
      "",
      "2. Esneklik",
      "Fiyat esnekligi = miktardaki yuzde degisim / fiyattaki yuzde degisim.",
      "Esneklik mutlak degeri 1'den buyukse talep esnektir.",
      "",
      "3. Tuketici dengesi",
      "Butce kisiti altinda faydayi en yuksek yapan sepet tercih edilir.",
    ],
  },
  pazarlama: {
    title: "Pazarlama Ilkeleri Ders Notu",
    lines: [
      "Temsili ornek materyaldir; resmi ders notu degildir.",
      "",
      "1. Pazarlama karmasi",
      "Urun, fiyat, tutundurma ve dagitim kararlarini birlikte ele alir.",
      "",
      "2. Segmentasyon",
      "Pazar; ihtiyac, davranis, cografi veya demografik ozelliklere gore ayrilir.",
      "Hedef kitle secimi, kaynaklarin uygun musteri gruplarina yoneltilmesini saglar.",
      "",
      "3. Konumlandirma",
      "Markanin hedef kitlenin zihninde ayirt edici bir yer edinmesidir.",
      "Tutarlilik, guven ve olculebilir farklilik temel ilkeler arasindadir.",
    ],
  },
};

function makePdf(title: string, lines: string[]) {
  const escape = (value: string) =>
    value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const commands = [
    `BT`,
    `/F1 18 Tf`,
    `54 780 Td`,
    `(${escape(title)}) Tj`,
    `/F1 11 Tf`,
    ...lines.flatMap((line) => [`0 -24 Td`, `(${escape(line)}) Tj`]),
    `ET`,
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${new TextEncoder().encode(commands).length} >>\nstream\n${commands}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1))
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const sample = samples[params.id];
  if (!sample)
    return NextResponse.json(
      { error: "Örnek PDF bulunamadı." },
      { status: 404 },
    );
  return new NextResponse(makePdf(sample.title, sample.lines), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${params.id}.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
