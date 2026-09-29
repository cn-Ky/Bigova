import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const icon = (name: keyof typeof Ionicons.glyphMap) =>
  ({ color, size }: { color: string; size: number }) =>
    <Ionicons name={name} color={color} size={size} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#0F3D4C",
        tabBarInactiveTintColor: "#6B7F84",
        headerStyle: { backgroundColor: "#F1F6F5" },
        headerShadowVisible: false,
        headerTitleStyle: { color: "#12262B" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Keşfet", tabBarIcon: icon("compass-outline") }} />
      <Tabs.Screen name="market" options={{ title: "Kitap pazarı", tabBarIcon: icon("book-outline") }} />
      <Tabs.Screen name="notes" options={{ title: "Notlar", tabBarIcon: icon("document-text-outline") }} />
      <Tabs.Screen name="profile" options={{ title: "Profil", tabBarIcon: icon("person-outline") }} />
    </Tabs>
  );
}
