import { useState } from "react";
import { Alert, FlatList, Linking, Modal, Pressable, Text, TextInput, View } from "react-native";
import { addBook, deleteBook, fetchBooks } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useQuery } from "../../lib/useQuery";
import { State } from "../../components";

const empty = { title: "", course: "", department: "", price: "", contact: "" };

export default function Market() {
  const { session } = useAuth();
  const { data, loading, error, refetch } = useQuery(fetchBooks);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(empty);

  const save = async () => {
    if (!f.title || !f.price || !f.contact) return Alert.alert("Eksik bilgi", "Başlık, fiyat ve iletişim gerekli.");
    try {
      await addBook({ seller_id: session!.user.id, title: f.title, course: f.course, department: f.department,
        price: Number(f.price), condition: "İyi", contact: f.contact });
      setOpen(false); setF(empty); refetch();
    } catch (e: any) { Alert.alert("Kaydedilemedi", e.message); }
  };

  const field = (k: keyof typeof empty, ph: string, kb?: "numeric") => (
    <TextInput value={f[k]} onChangeText={(v) => setF({ ...f, [k]: v })} placeholder={ph} keyboardType={kb}
      className="border border-line rounded-xl p-3 text-ink" />
  );

  return (
    <View className="flex-1 bg-foam">
      <FlatList
        data={data ?? []}
        keyExtractor={(b) => b.id}
        refreshing={loading}
        onRefresh={refetch}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={<State loading={loading} error={error} empty="Henüz ilan yok. İlk ilanı sen ver." />}
        renderItem={({ item: b }) => (
          <View className="rounded-2xl bg-white border border-line p-4">
            <View className="flex-row justify-between">
              <Text className="text-lg font-semibold text-ink flex-1">{b.title}</Text>
              <Text className="text-lg font-bold text-sea">{b.price}₺</Text>
            </View>
            <Text className="text-mute mt-1">{[b.course, b.department, b.condition].filter(Boolean).join(" · ")}</Text>
            <Text className="text-mute mt-1">Satıcı: {b.profiles?.display_name ?? "Öğrenci"}</Text>
            {session?.user.id === b.seller_id ? (
              <Pressable onPress={async () => { await deleteBook(b.id); refetch(); }}
                className="mt-3 rounded-xl border border-line py-2 items-center">
                <Text className="text-mute">İlanı kaldır</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => Alert.alert("İletişim", b.contact, [
                  { text: "Kapat" }, { text: "Ara", onPress: () => Linking.openURL(`tel:${b.contact}`) }])}
                className="mt-3 rounded-xl border border-sea py-2 items-center">
                <Text className="text-sea font-medium">Satıcıyla iletişime geç</Text>
              </Pressable>
            )}
          </View>
        )}
      />
      <Pressable
        onPress={() => (session ? setOpen(true) : Alert.alert("Giriş gerekli", "İlan vermek için Profil sekmesinden giriş yap."))}
        className="absolute right-4 bottom-4 rounded-full bg-sun px-5 py-3">
        <Text className="text-ink font-semibold">İlan ver</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-foam p-4 gap-3">
          <Text className="text-xl font-bold text-ink">Kitap ilanı</Text>
          {field("title", "Kitap adı")}
          {field("course", "Ders (örn. İKT 101)")}
          {field("department", "Bölüm")}
          {field("price", "Fiyat (₺)", "numeric")}
          {field("contact", "Telefon veya Instagram")}
          <Pressable onPress={save} className="rounded-xl bg-sea py-3 items-center">
            <Text className="text-white font-semibold">Yayınla</Text>
          </Pressable>
          <Pressable onPress={() => setOpen(false)} className="py-2 items-center">
            <Text className="text-mute">Vazgeç</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
