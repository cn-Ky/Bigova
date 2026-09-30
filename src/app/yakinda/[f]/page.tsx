import Link from "next/link";
import Mascot from "@/components/Mascot";

const info: Record<string, [string, string]> = {
  ulasim: ["Ulaşım", "Otobüs ve servis saatleri, güzergâh ve ücretler burada olacak."],
  notlar: ["Notlar", "Ders notlarını ve PDF'leri paylaşıp arayabileceksin."],
  kitap: ["Kitap pazarı", "Kullanmadığın kitapları diğer öğrencilere satabileceksin."],
  arkadaslar: ["Arkadaşlar", "Arkadaş ekle, mesajlaş ve konumunu paylaş."],
  dergi: ["Dergi", "Okulun dergisini uygulamada okuyabileceksin."],
};
export default function Yakinda({ params }: { params: { f: string } }) {
  const [t, d] = info[params.f] ?? ["Yeni özellik", "Bu bölüm hazırlanıyor."];
  return (
    <main className="grid min-h-[80dvh] place-items-center px-8 text-center">
      <div>
        <Mascot size={140} className="mx-auto" />
        <h1 className="mt-3 font-display text-3xl font-extrabold">{t}</h1>
        <p className="mt-2 text-sea/75">{d}</p>
        <p className="mt-1 font-bold text-coral">Çok yakında geliyor.</p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-sea px-6 py-3 font-bold text-white">Keşfet'e dön</Link>
      </div>
    </main>
  );
}
