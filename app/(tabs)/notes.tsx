import { FlatList, Text, View } from "react-native";
import { NOTES } from "../../lib/data";

export default function Notes() {
  return (
    <View className="flex-1 bg-foam">
      <FlatList
        data={NOTES}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item: n }) => (
          <View className="rounded-2xl bg-white border border-line p-4">
            <Text className="text-lg font-semibold text-ink">{n.title}</Text>
            <Text className="text-mute mt-1">{n.course} · {n.department} · {n.year}</Text>
            <View className="flex-row justify-between mt-3">
              <Text className="text-sea">{n.type}</Text>
              <Text className="text-mute">{n.author}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}
