-- ============================================================================
-- Topluluk bildirimi (beğeni, yorum, takip…) oluşunca Web Push göndermek için veritabanı webhook'u.
-- instagram_upgrade.sql çalıştırıldıktan ve push_webhook.sql'deki kurulum yapıldıktan SONRA (aynı ortam değişkenleri).
-- OPSİYONELDİR: çalıştırmazsan bildirimler yine uygulama içinde (zil ve Bildirimler sayfası) görünür.
--
-- ÇALIŞTIRMADAN ÖNCE aşağıdaki iki değeri değiştir (push_webhook.sql'dekilerle aynı):
--   SITE_URL        -> sitenin adresi, örn. https://bigova.vercel.app
--   WEBHOOK_SECRET  -> .env'deki PUSH_WEBHOOK_SECRET ile BİREBİR aynı uzun rastgele metin
--
-- Alternatif (SQL yazmadan): Supabase > Database > Webhooks > Create a new hook
--   Tablo: public.community_notifications · Event: Insert · Tür: HTTP Request
--   URL: SITE_URL/api/push/notify · Method: POST · Header: x-webhook-secret = WEBHOOK_SECRET
-- ============================================================================
drop trigger if exists community_notifications_push_webhook on public.community_notifications;
create trigger community_notifications_push_webhook
  after insert on public.community_notifications
  for each row
  execute function supabase_functions.http_request(
    'SITE_URL/api/push/notify',
    'POST',
    '{"Content-Type":"application/json","x-webhook-secret":"WEBHOOK_SECRET"}',
    '{}',
    '3000'
  );
