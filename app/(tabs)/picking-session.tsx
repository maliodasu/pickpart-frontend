import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DPPColors } from "@/constants/colors";
import CustomLoader from "@/components/ui/custom-loader";
import CustomAlert from "@/components/ui/custom-alert";
import { getActiveApiUrl } from "@/constants/api";

// --- 1. FUNGSI PARSER ALAMAT RAK (TL & TR) ---
const parseRackAddress = (address: string) => {
  if (!address) return null;
  const side = address.startsWith("TR") ? "TR" : "TL";
  const cleanAddress = address.replace(/^(TL|TR)\s*/, "");
  const parts = cleanAddress.split("-");

  return {
    side: side,
    rack: parseInt(parts[0], 10) || 1,
    row: parseInt(parts[1], 10) || 1,
    col: parseInt(parts[2], 10) || 1,
  };
};

// --- 2. KOMPONEN VISUALISASI RAK ---
const RackVisualizer = ({ partAddress }: { partAddress: string }) => {
  const activeLocation = parseRackAddress(partAddress);
  const totalRows = Math.max(3, activeLocation ? activeLocation.row : 3);
  const totalCols = Math.max(3, activeLocation ? activeLocation.col : 3);

  return (
    <View style={styles.rackContainer}>
      <View style={styles.rackHeaderRow}>
        <Text style={styles.sectionTitle}>Visualisasi Lokasi Rak</Text>
        {activeLocation && (
          <View
            style={[
              styles.sideBadge,
              activeLocation.side === "TR" ? styles.badgeTR : styles.badgeTL,
            ]}
          >
            <Text style={styles.badgeText}>
              {activeLocation.side} - Rak{" "}
              {String(activeLocation.rack).padStart(2, "0")}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.rackSubTitle}>
        Alamat: {partAddress || "Belum ditentukan"}
      </Text>

      <View style={styles.rackFrame}>
        {Array.from({ length: totalRows }, (_, rowIndex) => {
          const currentRow = totalRows - rowIndex;

          return (
            <View key={`row-${currentRow}`} style={styles.rowContainer}>
              <Text style={styles.rowLabel}>Tingkat {currentRow}</Text>

              <View style={styles.colContainer}>
                {Array.from({ length: totalCols }, (_, colIndex) => {
                  const currentCol = colIndex + 1;
                  const isTarget =
                    activeLocation &&
                    activeLocation.row === currentRow &&
                    activeLocation.col === currentCol;

                  return (
                    <View
                      key={`col-${currentCol}`}
                      style={[
                        styles.cellBox,
                        isTarget && styles.cellActive,
                        totalCols > 5 && { height: 32 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          isTarget && styles.cellTextActive,
                        ]}
                      >
                        {currentCol}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// --- 3. HALAMAN UTAMA PICKING SESSION ---
export default function PickingSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const model_suffix = params.model_suffix;

  const [apiBaseUrl, setApiBaseUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [sequenceItems, setSequenceItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isWsConnected, setIsWsConnected] = useState(false);

  // Referensi WebSocket & Flag Pengunci (Lock) untuk mencegah double scan terlalu cepat
  const wsRef = useRef<WebSocket | null>(null);
  const isProcessingRef = useRef(false);

  // State Custom Alert
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info" as "success" | "error" | "warning" | "info",
    onConfirm: undefined as (() => void) | undefined,
    showCancel: false,
    cancelText: "Batal",
    confirmText: "OK",
  });

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "warning" | "info" = "info",
    onConfirm?: () => void,
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm,
      showCancel: false,
      cancelText: "Batal",
      confirmText: "OK",
    });
  };

  // 1. Ambil API URL dari AsyncStorage terlebih dahulu saat halaman dibuka
  useEffect(() => {
    async function initConfig() {
      const url = await getActiveApiUrl();
      if (url) {
        setApiBaseUrl(url);
      } else {
        showAlert("Error", "Alamat IP server belum dikonfigurasi!", "error");
        setLoading(false);
      }
    }
    initConfig();
  }, []);

  // 2. Fetch data sequence setelah apiBaseUrl berhasil didapatkan
  const fetchSequenceData = useCallback(async () => {
    if (!apiBaseUrl) return;
    try {
      setLoading(true);
      const res = await fetch(
        `${apiBaseUrl}/api/picking-sequences?model_suffix=${model_suffix}`,
      );
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        setSequenceItems(json.data);
      } else {
        setSequenceItems([]);
      }
    } catch (err) {
      console.error("Gagal mengambil data picking sequence:", err);
      setSequenceItems([]);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, model_suffix]);

  useEffect(() => {
    if (apiBaseUrl) {
      fetchSequenceData();
    }
  }, [apiBaseUrl, fetchSequenceData]);

  const currentItem = React.useMemo(() => {
    return sequenceItems[currentIndex] || {};
  }, [sequenceItems, currentIndex]);

  const currentItemRef = useRef(currentItem);
  const sequenceItemsRef = useRef(sequenceItems);
  const currentIndexRef = useRef(currentIndex);

  useEffect(() => {
    currentItemRef.current = currentItem;
    sequenceItemsRef.current = sequenceItems;
    currentIndexRef.current = currentIndex;
  }, [currentItem, sequenceItems, currentIndex]);

  // --- INTEGRASI WEBSOCKET & ALUR SESI SCAN ---
  useEffect(() => {
    if (!apiBaseUrl) return;

    const wsUrl = apiBaseUrl.replace(/^http/, "ws") + "/picking-part";
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    // Ref untuk menyimpan waktu dan ID tag terakhir guna mencegah double scan kartu yang sama
    const lastScanRef = { tagId: "", time: 0 };

    ws.onopen = () => {
      console.log("[Picking WS] Terhubung ke server WebSocket");
      setIsWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Ambil data item aktif berdasarkan index terbaru dari ref
        const currentItems = sequenceItemsRef.current;
        const activeIdx = currentIndexRef.current;
        const activeItem = currentItems[activeIdx];

        if (activeItem && activeItem.part_no) {
          if (data.type === "scan_tag" || data.type === "modal_scan_tag") {
            const scannedTagId = data.tag_id;
            const now = Date.now();

            // PENGAMAN DEBOUNCE: Tolak jika tag yang sama dipindai dalam rentang < 2000ms (2 detik)
            if (
              scannedTagId === lastScanRef.tagId &&
              now - lastScanRef.time < 2000
            ) {
              return;
            }

            // PENGAMAN LOCK: Jika sedang memproses alert/transisi, abaikan
            if (isProcessingRef.current) return;

            if (!activeItem.tag_id) {
              showAlert(
                "Peringatan",
                `Part ${activeItem.part_no} belum memiliki Tag ID terdaftar di master rak!`,
                "warning",
              );
              return;
            }

            if (scannedTagId === activeItem.tag_id) {
              // Rekam scan terakhir untuk cooldown
              lastScanRef.tagId = scannedTagId;
              lastScanRef.time = now;

              // Kunci proses
              isProcessingRef.current = true;

              // Tampilkan alert sukses
              showAlert(
                "Berhasil",
                `Part ${activeItem.part_no} terverifikasi!`,
                "success",
              );

              // Timer otomatis tutup alert dan lanjut ke item berikutnya setelah 1 detik
              setTimeout(() => {
                setAlertConfig((prev) => ({ ...prev, visible: false }));

                if (currentIndexRef.current < currentItems.length - 1) {
                  setCurrentIndex((prev) => prev + 1);
                } else {
                  showAlert(
                    "Selesai",
                    "Semua item picking telah selesai!",
                    "success",
                  );
                }

                // Buka kembali kunci setelah transisi selesai
                isProcessingRef.current = false;
              }, 1000);
            } else {
              showAlert(
                "Peringatan",
                `Tag discan (${scannedTagId}) tidak sesuai dengan part target saat ini (${activeItem.part_no}).`,
                "warning",
              );
            }
          }
        }
      } catch (err) {
        console.error("[Picking WS] Gagal parse pesan:", err);
        isProcessingRef.current = false;
      }
    };

    ws.onerror = (error) => {
      console.log("[Picking WS Error]:", error);
      setIsWsConnected(false);
    };

    ws.onclose = () => {
      console.log("[Picking WS] Koneksi terputus");
      setIsWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [apiBaseUrl]);

  const handleNext = () => {
    if (currentIndex < sequenceItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <CustomLoader />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#212529" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sesi Picking: {model_suffix}</Text>
        <Text style={styles.progressIndicator}>
          {sequenceItems.length > 0
            ? `${currentIndex + 1}/${sequenceItems.length}`
            : "0/0"}
        </Text>
      </View>

      {/* Indikator Status Koneksi & Scan Live */}
      <View
        style={[
          styles.scanIndicatorBar,
          { backgroundColor: isWsConnected ? "#E8F5E9" : "#F8D7DA" },
        ]}
      >
        <Ionicons
          name={isWsConnected ? "radio-outline" : "alert-circle-outline"}
          size={14}
          color={isWsConnected ? "#2E7D32" : "#DC3545"}
        />
        <Text
          style={[
            styles.scanIndicatorText,
            { color: isWsConnected ? "#2E7D32" : "#DC3545" },
          ]}
        >
          {isWsConnected
            ? "Menunggu Scan RFID dari Smart Glove..."
            : "Terputus dari Server (Reconnecting...)"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* GAMBAR PART */}
        <View style={styles.imageCard}>
          {currentItem.part_no ? (
            <Image
              source={{
                uri: `${apiBaseUrl}/uploads/parts/${currentItem.part_no}.jpg`,
              }}
              style={styles.partImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="cube-outline" size={64} color="#ADB5BD" />
              <Text style={styles.placeholderText}>Foto Komponen / Part</Text>
            </View>
          )}
        </View>

        {/* DETAIL PART */}
        <View style={styles.detailCard}>
          <Text style={styles.partNoLabel}>Nomor Part (Part Number)</Text>
          <Text style={styles.partNoValue}>{currentItem.part_no || "-"}</Text>

          <Text style={styles.partNameLabel}>Nama Komponen</Text>
          <Text style={styles.partNameValue}>
            {currentItem.part_name || "-"}
          </Text>

          <View style={styles.rowDetail}>
            <View style={styles.detailBadge}>
              <Text style={styles.detailBadgeText}>
                Qty: {currentItem.quantity || 1} Pcs
              </Text>
            </View>
            <View style={[styles.detailBadge, { backgroundColor: "#E7F1FF" }]}>
              <Text style={[styles.detailBadgeText, { color: "#0D6EFD" }]}>
                Lokasi: {currentItem.part_address || "-"}
              </Text>
            </View>
          </View>
        </View>

        {/* VISUALISASI RAK */}
        <RackVisualizer partAddress={currentItem.part_address || ""} />
      </ScrollView>

      {/* Custom Alert Component */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        showCancel={alertConfig.showCancel}
        cancelText={alertConfig.cancelText}
        confirmText={alertConfig.confirmText}
        onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
        onConfirm={() => {
          if (alertConfig.onConfirm) alertConfig.onConfirm();
          setAlertConfig({ ...alertConfig, visible: false });
        }}
      />

      {/* Footer Navigasi */}
      <View style={styles.footerNav}>
        <TouchableOpacity
          style={[
            styles.navButton,
            (currentIndex === 0 || sequenceItems.length === 0) &&
              styles.disabledBtn,
          ]}
          onPress={handlePrev}
          disabled={currentIndex === 0 || sequenceItems.length === 0}
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          <Text style={styles.navButtonText}>Sebelumnya</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            (currentIndex >= sequenceItems.length - 1 ||
              sequenceItems.length === 0) &&
              styles.disabledBtn,
          ]}
          onPress={handleNext}
          disabled={
            currentIndex >= sequenceItems.length - 1 ||
            sequenceItems.length === 0
          }
        >
          <Text style={styles.navButtonText}>Selanjutnya</Text>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  progressIndicator: {
    fontSize: 14,
    fontWeight: "bold",
    color: DPPColors.redHino,
  },
  scanIndicatorBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 16,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  scanIndicatorText: {
    fontSize: 12,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  imageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    overflow: "hidden",
  },
  partImage: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 13,
    color: "#6C757D",
    marginTop: 8,
  },
  detailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  partNoLabel: {
    fontSize: 11,
    color: "#6C757D",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  partNoValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#212529",
    marginBottom: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  partNameLabel: {
    fontSize: 11,
    color: "#6C757D",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  partNameValue: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#495057",
    marginBottom: 14,
  },
  rowDetail: {
    flexDirection: "row",
    gap: 8,
  },
  detailBadge: {
    backgroundColor: "#F8F9FA",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  detailBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#495057",
  },
  rackContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  rackHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#212529",
  },
  rackSubTitle: {
    fontSize: 12,
    color: "#6C757D",
    marginBottom: 12,
  },
  sideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeTL: {
    backgroundColor: "#E7F1FF",
  },
  badgeTR: {
    backgroundColor: "#F8D7DA",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#495057",
  },
  rackFrame: {
    backgroundColor: "#F8F9FA",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CED4DA",
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  rowLabel: {
    width: 60,
    fontSize: 11,
    color: "#6C757D",
    fontWeight: "600",
  },
  colContainer: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  cellBox: {
    flex: 1,
    height: 38,
    backgroundColor: "#E9ECEF",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CED4DA",
  },
  cellActive: {
    backgroundColor: "#198754",
    borderColor: "#146c43",
    elevation: 3,
    shadowColor: "#198754",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  cellText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#495057",
  },
  cellTextActive: {
    color: "#FFFFFF",
  },
  footerNav: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
    gap: 12,
  },
  navButton: {
    flex: 1,
    backgroundColor: DPPColors.redHino,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  disabledBtn: {
    backgroundColor: "#CED4DA",
  },
  navButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
});
