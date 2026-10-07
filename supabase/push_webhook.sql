-- ============================================================================
-- Yeni mesaj gelince Web Push göndermek için veritabanı webhook'u
-- (bigova_v3_upgrade.sql çalıştırıldıktan ve Vercel/sunucu ortam değişkenleri girildikten SONRA)
--
-- ÇALIŞTIRMADAN ÖNCE aşağıdaki iki değeri değiştir:
--   SITE_URL        -> sitenin adresi, örn. https://bigova.vercel.app
--   WEBHOOK_SECRET  -> .env'deki PUSH_WEBHOOK_SECRET ile BİREBİR aynı uzun rastgele metin
--
-- Alternatif (SQL yazmadan): Supabase > Database > Webhooks > Create a new hook
--   Tablo: public.messages · Event: Insert · Tür: HTTP Request
--   URL: SITE_URL/api/push/send · Method: POST
--   Header: x-webhook-secret = WEBHOOK_SECRET
-- ============================================================================
drop trigger if exists messages_push_webhook on public.messages;
create trigger messages_push_webhook
  after insert on public.messages
  for each row
  execute function supabase_functions.http_request(
    'SITE_URL/api/push/send',
    'POST',
    '{"Content-Type":"application/json","x-webhook-secret":"WEBHOOK_SECRET"}',
    '{}',
    '3000'
  );
