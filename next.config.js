const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

module.exports = {
  reactStrictMode: true,
  env: {
    ...(supabaseUrl ? { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl } : {}),
    ...(supabaseAnonKey
      ? { NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey }
      : {}),
  },
};
