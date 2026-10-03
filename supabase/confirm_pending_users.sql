-- OPSİYONEL: Doğrulama bekleyen ve giriş yapamayan mevcut kullanıcıları elle onaylar.
-- Dikkat: e-posta sahipliği doğrulanmadan hesap aktif edilir. Yalnızca takılı kalan
-- kullanıcıları kurtarmak veya "Confirm email" ayarını kapattıysanız kullanın.
update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;
-- Tek kullanıcı için: ... where email = 'kisi@example.com' and email_confirmed_at is null;
