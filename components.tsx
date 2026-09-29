import { ActivityIndicator, Text, View } from "react-native";

export function State({ loading, error, empty }: { loading: boolean; error: string | null; empty?: string }) {
  if (loading) return <ActivityIndicator className="mt-10" color="#0F3D4C" />;
  if (error) return <Text className="text-center text-red-700 mt-10 px-6">{error}</Text>;
  if (empty) return <Text className="text-center text-mute mt-10 px-6">{empty}</Text>;
  return <View />;
}
