import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { fetchBusinesses } from "../../lib/api";
import { avgRating } from "../../lib/models";
import { useQuery } from "../../lib/useQuery";
import { State } from "../../components";
import { CATEGORIES, type CategoryKey } from "../../lib/types";

export default function Discover() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CategoryKey | null>(null);

  const { data, loading, error, refetch } = useQuery(fetchBusinesses);
  const list = useMemo(
    () =>
      (data ?? []).filter(
        (b) =>
          (!cat || b.category === cat) &&
          b.name.toLocaleLowerCase("tr").includes(q.trim().toLocaleLowerCase("tr"))
      ),
    [q, cat, data]
  );

  return (
    <View className="flex-1 bg-foam">
      <View className="px-4 pt-2">
        <View className="flex-row items-center rounded-xl bg-white border border-line px-3">
          <Ionicons name="search" size={18} color="#6B7F84" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Biga'da ara"
            className="flex-1 py-3 px-2 text-ink"
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="grow-0 py-3"
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {CATEGORIES.map((c) => {
          const on = cat === c.key;
          return (
            <Pressable key={c.key} onPress={() => setCat(on ? null : c.key)}
              className={`flex-row items-center gap-1 rounded-full px-3 py-2 border ${on ? "bg-sea border-sea" : "bg-white border-line"}`}>
              <Ionicons name={c.icon as any} size={16} color={on ? "#fff" : "#0F3D4C"} />
              <Text className={on ? "text-white" : "text-ink"}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={list}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshing={loading}
        onRefresh={refetch}
        ListEmptyComponent={<State loading={loading} error={error} empty="Sonuç yok. Başka bir kategori dene." />}
        renderItem={({ item: b }) => (
          <Link href={{ pathname: "/business/[id]", params: { id: b.id } }} asChild>
            <Pressable className="rounded-2xl bg-white border border-line p-4">
              <View className="flex-row justify-between">
                <Text className="text-lg font-semibold text-ink">{b.name}</Text>
                <View className="flex-row items-center gap-1">
                  <Ionicons name="star" size={14} color="#F5B82E" />
                  <Text className="text-ink">{avgRating(b)?.toFixed(1) ?? "–"}</Text>
                </View>
              </View>
              <Text className="text-mute mt-1">{b.address} · {b.hours}</Text>
              <View className="flex-row gap-2 mt-3">
                <Text className="text-sea">{"₺".repeat(b.price_level)}</Text>
                {b.student_friendly && <Text className="text-sea">Öğrenci dostu</Text>}
                <Text className="text-mute">{b.has_toilet ? "Tuvalet var" : "Tuvalet yok"}</Text>
              </View>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}
