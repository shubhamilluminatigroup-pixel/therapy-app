import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const phoneNumber = "+91 7351154123";
const whatsappUrl = "https://wa.me/917351154123";
const address =
  "MRC Ayurveda Research Center Lotus Garden Homes VIP, Sunrakh Rd, Vrindavan, Uttar Pradesh 281121";

const socialLinks = [
  {
    color: "#1877f2",
    icon: "facebook",
    label: "Facebook",
    url: "https://www.facebook.com/share/19o7vFtbSP/",
  },
  {
    color: "#e4405f",
    icon: "instagram",
    label: "Instagram",
    url: "https://www.instagram.com/dr.abhishek__sharma/?igsh=MXNka3N5OXZqOTNnZQ%3D%3D",
  },
  {
    color: "#ff0000",
    icon: "youtube-play",
    label: "YouTube",
    url: "https://youtube.com/@drabhisheksharmamrc?si=Ypqmk2IT8k1cubJW",
  },
  {
    color: "#ff0000",
    icon: "youtube-play",
    label: "MRC YouTube",
    url: "https://youtube.com/@mrcmantratherapy?si=fzoH0OufctQzy2O8",
  },
  {
    color: "#25d366",
    icon: "whatsapp",
    label: "WhatsApp",
    url: whatsappUrl,
  },
] as const;

const openUrl = (url: string) => {
  void Linking.openURL(url);
};

export default function ContactScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Contact</Text>
        <Text style={styles.subheading}>
          Reach MRC Ayurveda Research Center for support, course help, and
          account queries.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Center</Text>
          <Text style={styles.title}>MRC Ayurveda Research Center</Text>
          <Text style={styles.body}>{address}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Doctor</Text>
          <Text style={styles.title}>Dr. Abhishek Sharma</Text>
          <Pressable
            accessibilityLabel="Open WhatsApp support"
            accessibilityRole="button"
            onPress={() => openUrl(whatsappUrl)}
            style={styles.primaryButton}
          >
            <FontAwesome name="whatsapp" size={20} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Message on WhatsApp</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Call support phone number"
            accessibilityRole="button"
            onPress={() => openUrl(`tel:${phoneNumber.replace(/\s/g, "")}`)}
            style={styles.secondaryButton}
          >
            <FontAwesome name="phone" size={18} color="#0f172a" />
            <Text style={styles.secondaryButtonText}>{phoneNumber}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Social</Text>
          <View style={styles.socialLinksRow}>
            {socialLinks.map((item) => (
              <Pressable
                key={item.label}
                accessibilityLabel={`Open ${item.label}`}
                accessibilityRole="link"
                onPress={() => openUrl(item.url)}
                style={[styles.socialLinkButton, { backgroundColor: item.color }]}
              >
                <FontAwesome name={item.icon} size={22} color="#ffffff" />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  content: {
    paddingBottom: 32,
  },
  heading: {
    color: "#0f172a",
    fontSize: 30,
    fontWeight: "800",
  },
  subheading: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
    marginTop: 4,
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e7edf5",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  label: {
    color: "#16a34a",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  title: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  body: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 21,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#25d366",
    borderRadius: 14,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 8,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
  },
  socialLinksRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 8,
  },
  socialLinkButton: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
});
