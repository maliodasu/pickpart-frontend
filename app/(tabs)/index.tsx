import {
  Text,
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import CustomLoader from "@/components/ui/custom-loader";
import CustomAlert from "@/components/ui/custom-alert"; // Sesuaikan path import CustomAlert Anda
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { DPPColors } from "@/constants/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ScreenOrientation from "expo-screen-orientation";

const STORAGE_KEY = "@custom_api_base_url";

type Model = {
  id: number;
  model_suffix: string;
  model_name: string;
};

type WorkOrder = {
  id: number;
  sequence: number;
  model_suffix: string;
  brand?: string;
  frame_no?: string;
  colour?: string;
  lot_orders?: string;
};

type DashboardStats = {
  totalUnit: number;
  antreanSeq: number;
  selesaiHariIni: number;
  adaKendala: number;
};

const RenderItem = ({ item }: { item: WorkOrder }) => (
  <View style={styles.itemCard}>
    <View style={styles.itemLeft}>
      <View style={styles.itemHeader}>
        <Text style={styles.modelSuffix}>{item.model_suffix || "Model"}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeThemedText}>{item.brand || "DUTRO"}</Text>
        </View>
      </View>
      <Text style={styles.frameNo}>Frame: {item.frame_no || "-"}</Text>
      <Text style={styles.details}>
        Warna: {item.colour || "-"} | Lot: {item.lot_orders || "-"}
      </Text>
    </View>
    <View style={styles.itemRight}>
      <Text style={styles.seqLabel}>SEQ</Text>
      <Text style={styles.seqNumber}>
        {String(item.sequence || 0).padStart(3, "0")}
      </Text>
    </View>
  </View>
);

const Header = ({
  isConnected,
  models,
  stats,
  onOpenSettings,
}: {
  isConnected: boolean | null;
  models: Model[];
  stats: DashboardStats;
  onOpenSettings: () => void;
}) => {
  const router = useRouter();

  return (
    <View style={styles.headerContainer}>
      {/* Header Profile / Title */}
      <View style={styles.topHeader}>
        <View style={{ backgroundColor: "transparent", flex: 1 }}>
          <Text style={styles.greeting}>Halo, Operator!</Text>
          <Text style={styles.headerTitle}>Dashboard Picking</Text>
        </View>

        <View style={styles.topRightContainer}>
          {/* Indikator Status Backend / Tombol Settings IP */}
          <TouchableOpacity 
            style={[
              styles.statusBadge, 
              {
                backgroundColor: isConnected === true 
                  ? "#E8F8F0" 
                  : isConnected === false 
                  ? "#FDE8E8" 
                  : "#FFF9E6",
                borderColor: isConnected === true 
                  ? "#D1E7DD" 
                  : isConnected === false 
                  ? "#F8D7DA" 
                  : "#FFF3CD"
              }
            ]}
            onPress={onOpenSettings}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    isConnected === true
                      ? "#198754"
                      : isConnected === false
                      ? "#DC3545"
                      : "#FFC107",
                },
              ]}
            />
            <Text style={[
              styles.statusText,
              {
                color: isConnected === true
                  ? "#155724"
                  : isConnected === false
                  ? "#721C24"
                  : "#856404",
              }
            ]}>
              {isConnected === true
                ? "Connected"
                : isConnected === false
                ? "Disconnected"
                : "Connecting..."}
            </Text>
            <Ionicons 
              name="settings-outline" 
              size={13} 
              color={
                isConnected === true
                  ? "#155724"
                  : isConnected === false
                  ? "#721C24"
                  : "#856404"
              } 
              style={{ marginLeft: 4 }} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Highlight: Sesi Dolly / Kitting Cart */}
      <View style={styles.activeTaskCard}>
        <View style={styles.activeTaskHeader}>
          <Ionicons name="cart" size={26} color="#FFFFFF" />
          <Text style={styles.activeTaskTitle}>Sesi Picking (Dolly)</Text>
        </View>
        <Text style={styles.activeTaskDesc}>
          Pilih model di bawah untuk memulai pemindaian dan penyiapan komponen.
        </Text>

        <View style={[styles.containertouch]}>
          <View style={styles.gridContainer}>
            {models.map((model) => (
              <TouchableOpacity
                key={model.id}
                style={styles.touchableBox}
                onPress={() =>
                  router.push({
                    pathname: "/picking-session",
                    params: {
                      model_suffix: model.model_suffix,
                    },
                  })
                }
              >
                <Text style={styles.boxText}>{model.model_suffix}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Today&apos;s Picking Report</Text>
      </View>
      {/* Stats Grid Dinamis */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderLeftColor: "#0D6EFD" }]}>
          <Ionicons name="car-outline" size={24} color="#0D6EFD" />
          <Text style={styles.statNumber}>{stats.totalUnit}</Text>
          <Text style={styles.statLabel}>Total Unit</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#FFC107" }]}>
          <Ionicons name="time-outline" size={24} color="#FFC107" />
          <Text style={styles.statNumber}>{stats.antreanSeq}</Text>
          <Text style={styles.statLabel}>Antrean SEQ</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#198754" }]}>
          <Ionicons name="checkmark-circle-outline" size={24} color="#198754" />
          <Text style={styles.statNumber}>{stats.selesaiHariIni}</Text>
          <Text style={styles.statLabel}>Selesai Hari Ini</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#DC3545" }]}>
          <Ionicons name="warning-outline" size={24} color="#DC3545" />
          <Text style={styles.statNumber}>{stats.adaKendala}</Text>
          <Text style={styles.statLabel}>Ada Kendala</Text>
        </View>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Seq Assembly</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>Lihat Semua</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState<string>("");
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [ipInput, setIpInput] = useState<string>("");
  const [isCheckingConfig, setIsCheckingConfig] = useState<boolean>(true);

  // State untuk CustomAlert
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    onConfirm?: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalUnit: 0,
    antreanSeq: 0,
    selesaiHariIni: 0,
    adaKendala: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Helper untuk menampilkan CustomAlert dengan mudah
  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    onConfirm?: () => void
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm,
    });
  };

  // Cek penyimpanan IP saat aplikasi pertama kali dibuka
  useEffect(() => {
    async function loadConfig() {
      try {
        const savedUrl = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedUrl) {
          setApiBaseUrl(savedUrl);
          setIpInput(savedUrl);
          setIsConfigured(true);
        }
      } catch (e) {
        console.error("Gagal memuat konfigurasi IP:", e);
      } finally {
        setIsCheckingConfig(false);
      }
    }
    loadConfig();
    ScreenOrientation.unlockAsync();
  }, []);

  // Fungsi untuk memverifikasi koneksi IP server sebelum menyimpan
  const handleSaveIp = async () => {
    try {
      let formattedUrl = ipInput.trim();
      if (!formattedUrl) {
        showAlert("Error", "Alamat IP/URL tidak boleh kosong!", "error");
        return;
      }
      if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
        formattedUrl = `http://${formattedUrl}`;
      }

      // Berikan indikator checking/loading atau test fetch endpoint server (misal /api/models atau health check)
      setLoading(true);
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // timeout 4 detik

        const response = await fetch(`${formattedUrl}/api/models`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error("Server merespons dengan status error");
        }
      } catch {
        setLoading(false);
        showAlert(
          "Koneksi Gagal",
          "Tidak dapat terhubung ke server pada alamat IP tersebut. Pastikan IP benar dan server aktif.",
          "error"
        );
        return;
      }

      await AsyncStorage.setItem(STORAGE_KEY, formattedUrl);
      setApiBaseUrl(formattedUrl);
      setIsConfigured(true);
      setLoading(false);
      showAlert("Sukses", "Alamat IP valid dan berhasil terhubung!", "success");
    } catch {
      setLoading(false);
      showAlert("Error", "Gagal memverifikasi alamat IP.", "error");
    }
  };

  const fetchData = useCallback(async () => {
    if (!apiBaseUrl) return;
    try {
      setRefreshing(true);
      const resModels = await fetch(`${apiBaseUrl}/api/models`);
      const jsonModels = await resModels.json();
      if (jsonModels && Array.isArray(jsonModels.data)) {
        setModels(jsonModels.data);
      } else if (Array.isArray(jsonModels)) {
        setModels(jsonModels);
      } else {
        setModels([]);
      }

      const today = new Date().toISOString().split("T")[0];
      const resWorkOrders = await fetch(
        `${apiBaseUrl}/api/work-orders?date=${today}`
      );
      const jsonWorkOrders = await resWorkOrders.json();
      setWorkOrders(Array.isArray(jsonWorkOrders) ? jsonWorkOrders : []);

      try {
        const resStats = await fetch(`${apiBaseUrl}/api/stats/dashboard`);
        const jsonStats = await resStats.json();
        if (jsonStats && jsonStats.success) {
          setStats(jsonStats.stats);
        }
      } catch {
        setStats({
          totalUnit: Array.isArray(jsonWorkOrders) ? jsonWorkOrders.length : 0,
          antreanSeq: Array.isArray(jsonWorkOrders) ? jsonWorkOrders.length : 0,
          selesaiHariIni: 0,
          adaKendala: 0,
        });
      }

      setIsConnected(true);
    } catch (err) {
      console.error(err);
      setIsConnected(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    if (isConfigured && apiBaseUrl) {
      fetchData();
    }
  }, [isConfigured, apiBaseUrl, fetchData]);

  // Loading saat memeriksa konfigurasi awal
  if (isCheckingConfig) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={DPPColors.redHino} />
      </SafeAreaView>
    );
  }

  // Jika belum ada IP yang dikonfigurasi, tampilkan halaman input IP awal
  if (!isConfigured) {
    return (
      <SafeAreaView style={styles.setupContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.setupScrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.setupCard}>
              <Ionicons name="server-outline" size={56} color={DPPColors.redHino} style={{ alignSelf: "center", marginBottom: 16 }} />
              <Text style={styles.setupTitle}>Konfigurasi Server Backend</Text>
              <Text style={styles.setupDesc}>
                Masukkan alamat IP atau Domain backend server Anda agar aplikasi dapat terhubung.
              </Text>

              <Text style={styles.inputLabel}>URL / IP Server:</Text>
              <TextInput
                style={styles.textInput}
                value={ipInput}
                onChangeText={setIpInput}
                placeholder="192.168.1.50:3000"
                autoCapitalize="none"
                placeholderTextColor="#ADB5BD"
              />

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveIp}>
                <Text style={styles.saveButtonText}>Simpan & Hubungkan</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Global CustomAlert di dalam Setup Screen */}
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
          onConfirm={() => {
            const action = alertConfig.onConfirm;
            setAlertConfig((prev) => ({ ...prev, visible: false }));
            if (action) action();
          }}
        />
      </SafeAreaView>
    );
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
        edges={["top", "left", "right"]}
      >
        <CustomLoader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <FlatList
        data={workOrders}
        keyExtractor={(item: any, index) => String(item.id || index)}
        renderItem={({ item }) => <RenderItem item={item} />}
        ListHeaderComponent={
          <Header
            isConnected={isConnected}
            models={models}
            stats={stats}
            onOpenSettings={() => setIsConfigured(false)} // Membuka kembali menu setting lewat ikon profil
          />
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", padding: 40 }}>
            <Ionicons name="car-outline" size={48} color="#CCCCCC" />
            <Text
              style={{ color: "#6C757D", marginTop: 12, textAlign: "center" }}
            >
              {isConnected === false
                ? "Tidak dapat terhubung ke server.\nPastikan IP benar dan backend aktif."
                : "Belum ada data unit assembly."}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        onRefresh={fetchData}
        refreshing={refreshing}
      />

      {/* Global CustomAlert untuk Dashboard Utama */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
        onConfirm={() => {
          const action = alertConfig.onConfirm;
          setAlertConfig((prev) => ({ ...prev, visible: false }));
          if (action) action();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  setupContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  setupScrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  setupCard: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  setupTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#212529",
    textAlign: "center",
    marginBottom: 8,
  },
  setupDesc: {
    fontSize: 13,
    color: "#6C757D",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#CED4DA",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#212529",
    marginBottom: 20,
    backgroundColor: "#F8F9FA",
  },
  saveButton: {
    backgroundColor: DPPColors.redHino,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },
  containertouch: {
    padding: 12,
    backgroundColor: DPPColors.redHino,
    borderRadius: 12,
    marginTop: 10,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 10,
    backgroundColor: "transparent",
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "transparent",
  },
  greeting: {
    fontSize: 14,
    color: "#6C757D",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#212529",
  },
  topRightContainer: {
    alignItems: "flex-end",
    backgroundColor: "transparent",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#495057",
  },
  profileBtn: {
    padding: 2,
  },
  boxText: {
    color: DPPColors.redHino,
    fontWeight: "bold",
    fontSize: 11,
    textAlign: "center",
  },
  touchableBox: {
    width: "30%",
    minHeight: 45,
    margin: "1.5%",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  activeTaskCard: {
    backgroundColor: DPPColors.redHino,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: DPPColors.redHino,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  activeTaskHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    marginBottom: 10,
  },
  activeTaskTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  activeTaskDesc: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
    backgroundColor: "transparent",
  },
  statCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    width: "48%",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#212529",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#6C757D",
    marginTop: 4,
    fontWeight: "500",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "transparent",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#212529",
  },
  seeAllText: {
    color: DPPColors.redHino,
    fontSize: 14,
    fontWeight: "600",
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemLeft: {
    flex: 1,
    paddingRight: 12,
    backgroundColor: "transparent",
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    backgroundColor: "transparent",
    flexWrap: "wrap",
    gap: 8,
  },
  modelSuffix: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#212529",
  },
  badge: {
    backgroundColor: "#E7F1FF",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeThemedText: {
    color: DPPColors.redHino,
    fontWeight: "bold",
    fontSize: 10,
  },
  frameNo: {
    fontSize: 13,
    color: "#495057",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginBottom: 4,
  },
  details: {
    fontSize: 12,
    color: "#6C757D",
  },
  itemRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  seqLabel: {
    fontSize: 11,
    color: "#6C757D",
    fontWeight: "600",
    marginBottom: 2,
  },
  seqNumber: {
    fontSize: 18,
    fontWeight: "900",
    color: "#212529",
  },
});
