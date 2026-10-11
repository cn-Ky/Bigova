# Safari hayvan noktaları

Bu klasör `npm run safari:points` ile üretilen SQL dosyalarını içerir (`000_reset.sql`, `001_points.sql`…, `999_finish.sql`).
Dosyalar OpenStreetMap verisinden otomatik oluşur; elle düzenleme, betiği yeniden çalıştırınca silinir.

Supabase SQL Editor'e yapıştıracaksan sırayla çalıştır: `000_reset` → `001…` → `999_finish`.
Ya da hiç dosya uğraşmadan: `npm run safari:points -- --upload` (ayrıntı: ana README > Bigocuk > Biga Safari).
