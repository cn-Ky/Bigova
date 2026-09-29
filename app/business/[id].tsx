import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fetchBusiness, fetchReviews, upsertReview } from "../../lib/api";
import { avgRating } from "../../lib/models";
import { useAuth } from "../../lib/auth";
import { useQuery } from "../../lib/useQuery";
import { State } from "../../components";

export default function BusinessDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const biz = useQuery(() => fetchBusiness(id), [id]);
  const rev = useQuery(() => fetchReviews(id), [id]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const b = biz.data;

  if (!b) return <State loading={biz.loading} error={biz.error} empty="İşletme bulunamadı." />;

  const send = async () => {
    try {
      await upsertReview(b.id, session!.user.id, rating, comment);
      setComment("");
      rev.refetch(); biz.refetch();
    } catch (e: any) { Alert.alert("Kaydedilemedi", e.message); }
  };

  return (
    <ScrollView className="flex-1 bg-foam" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View>
        <Text className="text-2xl font-bold text-ink">{b.name}</Text>
        {b.address && <Text className="text-mute mt-1">{b.address}</Text>}
      </View>

      <View className="rounded-2xl bg-white border border-line p-4 gap-2">
        {b.hours && <Row icon="time-outline" text={b.hours} />}
        <Row icon="water-outline" text={b.has_toilet ? "Tuvalet var" : "Tuvalet yok"} />
        <Row icon="school-outline" text={b.student_friendly ? "Öğrenci dostu" : "Öğrenci indirimi yok"} />
        <Row icon="star-outline" text={`${avgRating(b)?.toFixed(1) ?? "–"} (${b.reviews.length} değerlendirme)`} />
      </View>

      {b.business_items.length > 0 && (
        <View className="rounded-2xl bg-white border border-line p-4">
          <Text className="text-lg font-semibold text-ink mb-2">Fiyatlar</Text>
          {b.business_items.map((m) => (
            <View key={m.id} className="flex-row justify-between py-2 border-b border-line">
              <Text className="text-ink">{m.name}</Text>
              <Text className="text-ink font-medium">{m.price}₺</Text>
            </View>
          ))}
        </View>
      )}

      {b.phone && (
        <Pressable onPress={() => Linking.openURL(`tel:${b.phone}`)} className="rounded-xl bg-sea py-3 items-center">
          <Text className="text-white font-semibold">Ara</Text>
        </Pressable>
      )}

      <View className="rounded-2xl bg-white border border-line p-4 gap-3">
        <Text className="text-lg font-semibold text-ink">Değerlendirmeler</Text>
        {session ? (
          <View className="gap-2">
            <View className="flex-row gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setRating(n)}>
                  <Ionicons name={n <= rating ? "star" : "star-outline"} size={28} color="#F5B82E" />
                </Pressable>
              ))}
            </View>
            <TextInput value={comment} onChangeText={setComment} placeholder="Yorumun (isteğe bağlı)" multiline
              className="border border-line rounded-xl p-3 text-ink min-h-[60px]" />
            <Pressable onPress={send} className="rounded-xl bg-sea py-3 items-center">
              <Text className="text-white font-semibold">Gönder</Text>
            </Pressable>
          </View>
        ) : (
          <Text className="text-mute">Değerlendirme yazmak için Profil sekmesinden giriş yap.</Text>
        )}
        {(rev.data ?? []).map((r) => (
          <View key={r.id} className="border-t border-line pt-3">
            <Text className="text-ink font-medium">{r.profiles?.display_name ?? "Öğrenci"} · {"★".repeat(r.rating)}</Text>
            {r.comment && <Text className="text-ink mt-1">{r.comment}</Text>}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Row({ icon, text }: { icon: any; text: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Ionicons name={icon} size={18} color="#0F3D4C" />
      <Text className="text-ink">{text}</Text>
    </View>
  );
}
