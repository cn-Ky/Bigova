/**
 * Bigocuk ekonomi ayarları.
 * NOT: DAILY_STEP_CAP ve MAX_STEPS_PER_SYNC değerleri
 * supabase/bigocuk_upgrade.sql içindeki fonksiyonla aynı olmalı.
 */
export const COIN_NAME = "Bigcoin";
export const STEPS_PER_COIN = 50; // her 50 adım = 1 Bigcoin
export const DAILY_STEP_CAP = 10000; // günlük en fazla 200 Bigcoin
export const MAX_STEPS_PER_SYNC = 100; // tek istekte sunucuya gidecek en fazla adım
export const SYNC_INTERVAL_MS = 30000; // yürürken en geç 30 sn'de bir kaydet

/**
 * Pomodoro ödülü. Değerler supabase/pomodoro_upgrade.sql içindeki fonksiyonla aynı olmalı
 * (burası yalnızca ekranda gösterim içindir; gerçek hesap sunucuda yapılır).
 */
export const POMODORO_MIN_PER_COIN = 5; // her 5 dk odak = 1 Bigcoin
export const POMODORO_MIN_REWARD_MIN = 15; // ödül için en az 15 dk'lık oturum
export const POMODORO_DAILY_COIN_CAP = 50; // günlük en fazla 50 Bigcoin
