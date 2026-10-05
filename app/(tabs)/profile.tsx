import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { DPPColors } from "@/constants/colors";

interface MenuItem {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    title: "Manajemen Rak",
    subtitle: "Kelola data part, rak, dan alokasi format master",
    icon: "file-tray-stacked",
    route: "/admin/master-part",
  },
  {
    title: "Manajemen WOS",
    subtitle: "Kelola data urutan sequence assembly",
    icon: "list-sharp",
    route: "/admin/sequence-management",
  },
  {
    title: "Manajemen Model",
    subtitle: "Kelola data model truk",
    icon: "car-sharp",
    route: "/admin/model-management",
  },
  {
    title: "Manajemen Part",
    subtitle: "Kelola Part sesuai model truk",
    icon: "cube-outline",
    route: "/admin/partmodel-management",
  },
];

export default function Profile() {
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Profile & Info */}
        <View style={styles.header}>
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={28} color={DPPColors.redHino} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerSub}>Admin Dashboard</Text>
              <Text style={styles.headerTitle}>Picking Management</Text>
            </View>
          </View>
          <View style={styles.headerBadge}>
            <Ionicons
              name="shield-checkmark"
              size={24}
              color={DPPColors.redHino}
            />
          </View>
        </View>

        {/* Section Menu Navigasi Admin */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Menu Administrator</Text>

          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.navCard}
              activeOpacity={0.7}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.navIconContainer}>
                <Ionicons name={item.icon} size={22} color={DPPColors.redHino} />
              </View>
              <View style={styles.navTextContainer}>
                <Text style={styles.navTitle}>{item.title}</Text>
                <Text style={styles.navSub} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ADB5BD" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Tombol Logout / Info Aplikasi Singkat */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>PickPart Hino v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: DPPColors.redHinoLight || "#FDE8E8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerSub: {
    fontSize: 12,
    color: "#6C757D",
    marginBottom: 2,
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#212529",
  },
  headerBadge: {
    backgroundColor: DPPColors.redHinoLight || "#FDE8E8",
    padding: 10,
    borderRadius: 12,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6C757D",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  navCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  navIconContainer: {
    backgroundColor: DPPColors.redHinoLight || "#FDE8E8",
    padding: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  navTextContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  navTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#212529",
  },
  navSub: {
    fontSize: 12,
    color: "#6C757D",
    marginTop: 2,
  },
  footerSection: {
    padding: 30,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#ADB5BD",
  },
});
