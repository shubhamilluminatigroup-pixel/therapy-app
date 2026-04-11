import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs, useRouter } from "expo-router";
import { useAuthUser } from "../../lib/useAuth";

export default function TabsLayout() {
  const router = useRouter();
  const { user } = useAuthUser();

  const requireLogin = (target: string) => (event: { preventDefault: () => void }) => {
    if (user) return;
    event.preventDefault();
    router.push({
      pathname: "/login",
      params: { redirect: target },
    });
  };

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#16a34a" }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-course"
        options={{
          title: "My Course",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="play-circle-outline" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: requireLogin("/(tabs)/my-course"),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person-outline" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: requireLogin("/(tabs)/account"),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: user?.isStaff ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="admin-panel-settings" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: requireLogin("/(tabs)/admin"),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
