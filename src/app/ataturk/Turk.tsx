// "TÜRK" ile başlayan her sözcük (Türk, Türküm, Türkiye, Türkçü…) büyük harfle ve kan kırmızısıyla yazılır.
// Atatürk Köşesi'ndeki tüm metinler bu bileşenden geçer; kural tek yerde durur.
// Sözcük tabanlı çalışır: "Atatürk" gibi içinde "türk" geçen özel adlar renklenmez.
// (Lookbehind kullanılmaz; eski iOS Safari sürümlerinde söz dizimi hatası verirdi.)

const WORD = /(\p{L}+)/u;
const IS_TURK = /^türk/iu;

// "i/ı" Türkçe büyük harf kuralı (toLocaleUpperCase("tr") ICU'ya bağlı olmasın diye elle)
const upperTr = (s: string) =>
  s.replace(/i/g, "İ").replace(/ı/g, "I").toUpperCase();

export function Tx({ children }: { children: string }) {
  return (
    <>
      {children.split(WORD).map((part, i) =>
        i % 2 === 1 && IS_TURK.test(part) ? (
          <b key={i} className="turk">
            {upperTr(part)}
          </b>
        ) : (
          part
        ),
      )}
    </>
  );
}
