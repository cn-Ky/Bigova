import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { useAuth } from "../../lib/auth";

export default function Profile() {
  const { session, loading, signIn, signUp, signOut } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <ActivityIndicator className="mt-20" color="#0F3D4C" />;

  if (session) {
    return (
      <View className="flex-1 bg-foam p-6 gap-4">
        <Text className="text-xl font-semibold text-ink">{session.user.user_metadata?.display_name ?? "Öğrenci"}</Text>
        <Text className="text-mute">{session.user.email}</Text>
        <Pressable onPress={signOut} className="rounded-xl border border-line py-3 items-center bg-white">
          <Text className="text-ink">Çıkış yap</Text>
        </Pressable>
      </View>
    );
  }

  const submit = async () => {
    setBusy(true); setMsg(null);
    const err = mode === "in" ? await signIn(email, password) : await signUp(email, password, name);
    setBusy(false);
    setMsg(err ?? (mode === "up" ? "Kayıt tamamlandı. E-postana gelen bağlantıyla hesabını doğrula." : null));
  };

  const input = "border border-line rounded-xl p-3 text-ink bg-white";
  return (
    <View className="flex-1 bg-foam p-6 gap-3 justify-center">
      <Text className="text-2xl font-bold text-ink">{mode === "in" ? "Giriş yap" : "Kayıt ol"}</Text>
      <Text className="text-mute">Üniversite e-postanla giriş yap; ilan ver, not paylaş, işletmeleri değerlendir.</Text>
      {mode === "up" && <TextInput value={name} onChangeText={setName} placeholder="Ad Soyad" className={input} />}
      <TextInput value={email} onChangeText={setEmail} placeholder="ornek@comu.edu.tr" autoCapitalize="none"
        keyboardType="email-address" className={input} />
      <TextInput value={password} onChangeText={setPassword} placeholder="Şifre (en az 6 karakter)" secureTextEntry className={input} />
      {msg && <Text className="text-red-700">{msg}</Text>}
      <Pressable onPress={submit} disabled={busy} className="rounded-xl bg-sea py-3 items-center">
        <Text className="text-white font-semibold">{busy ? "..." : mode === "in" ? "Giriş yap" : "Kayıt ol"}</Text>
      </Pressable>
      <Pressable onPress={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }} className="py-2 items-center">
        <Text className="text-sea">{mode === "in" ? "Hesabın yok mu? Kayıt ol" : "Hesabın var mı? Giriş yap"}</Text>
      </Pressable>
    </View>
  );
}
