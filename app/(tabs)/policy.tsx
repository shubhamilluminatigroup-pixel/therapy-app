import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const policyItems = [
  {
    title: "Terms and Conditions",
    body: `We use your account details only to manage your course access, payments, support requests, and app experience.

1. Acceptance of Terms
By accessing and using this website, you agree to comply with and be bound by these terms and conditions.

2. Privacy
We value your privacy. Your personal information collected for course will be handled in accordance with our Privacy Policy.

3. Intellectual Property
The content on this website, including text, graphics, logos, and images, is protected by intellectual property laws.

4. Modifications
We reserve the right to update or modify these terms and conditions at any time without prior notice.

5. Contact Information
If you have any questions or concerns regarding these terms, please contact us at:
Email: mrcayurvedacenter@gmail.com
Phone: 7351154123`
  },
  {
    title: "No Cancellation and Refund Policy",
    body: `Thank you for choosing our products/services at Mrc Naturocare.

Please read this policy carefully. This is the No Cancellation and Refund Policy of Mrc Naturocare.

Refund Policy
We do not offer any refunds for services purchased from our website.

Contact Us
If you have any questions about our No Cancellation and Refund Policy, please contact us:
Email: mrcayurvedacenter@gmail.com
Phone: 7351154123`
  },
  {
    title: "Privacy Policy",
    body: `Your privacy is important to us. It is mrc therapy's policy to respect your privacy regarding any information we may collect from you across our website, https://mrctherapy.com , and other sites we own and operate.

Information We Collect
We only collect information you provide directly to us. This may include personal information such as your name, email address, phone number, and course details. We may also collect non-personal information like browser type, operating system, and website usage statistics.

How We Use Your Information
We may use the information we collect to:
- Respond to your inquiries
- Improve our website and user experience

Sharing Your Information
We do not share your personal information with third parties, except as required by law or to fulfill the purposes outlined in this Privacy Policy.

Cookies
We use cookies to enhance your experience on our website. You can choose to disable cookies through your browser settings, but this may affect the functionality of the site.

Security
We take reasonable measures to protect your personal information from unauthorized access or disclosure. However, no data transmission over the internet can be guaranteed as 100% secure.

Changes to This Privacy Policy
We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page.

Contact Us
If you have any questions about this Privacy Policy, please contact us at 7351154123.`
  }
];

export default function PolicyScreen() {
  const [openPolicyTitle, setOpenPolicyTitle] = useState(policyItems[0]?.title ?? "");

  const togglePolicy = (title: string) => {
    setOpenPolicyTitle((currentTitle) => (currentTitle === title ? "" : title));
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Policy</Text>
        <Text style={styles.subheading}>
          Important information about using MRC therapy courses and app services.
        </Text>
         <Text style={[styles.subheading, { marginBottom: 24 }]}>
          Last updated  : 08th June 2026
        </Text>

        

        {policyItems.map((item) => {
          const isOpen = openPolicyTitle === item.title;

          return (
            <View key={item.title} style={styles.section}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                onPress={() => togglePolicy(item.title)}
                style={styles.sectionHeader}
              >
                <Text style={styles.sectionTitle}>{item.title}</Text>
                <MaterialIcons
                  name={isOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                  size={26}
                  color="#0f172a"
                />
              </Pressable>
              {isOpen ? <Text style={styles.sectionText}>{item.body}</Text> : null}
            </View>
          );
        })}
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
  section: {
    backgroundColor: "#ffffff",
    borderColor: "#e7edf5",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minHeight: 34,
  },
  sectionTitle: {
    flex: 1,
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "800",
  },
  sectionText: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
});
