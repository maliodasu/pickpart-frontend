import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  View,
  Text,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Platform,
  Keyboard,
} from "react-native";
import CustomLoader from "@/components/ui/custom-loader";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { DPPColors } from "@/constants/colors";
import { getActiveApiUrl } from "@/constants/api";


type PartPicked = {
  part_no: string;
  location_id: string;
  qty: number;
  model_code: string;
  scannedAt: string;
};

type HistoryItem = {
  id: number;
  seq: string;
  frame_no: string;
  model_code: string;
  brand: string;
  colour: string;
  common_case: string;
  parts_picked: PartPicked[];
  total_parts: number;
  completed_at: string;
  operator: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<HistoryItem | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const apiBaseUrl = await getActiveApiUrl();
      if (!apiBaseUrl) {
        console.warn("⚠️ IP belum dikonfigurasi!");
        return;
      }
      const res = await fetch(`${apiBaseUrl}/picking_history`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory]),
  );

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
      <View style={styles.cardLeft}>
        <View style={styles.seqBadge}>
          <Text style={styles.seqBadgeText}>SEQ {item.seq}</Text>
        </View>
        <Text style={styles.modelCode}>{item.model_code}</Text>
        <Text style={styles.frameNo}>VIN: {item.frame_no}</Text>
        <Text style={styles.brand}>
          {item.brand} • {item.colour}
        </Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.date}>{formatDate(item.completed_at)}</Text>
        <Text style={styles.time}>{formatTime(item.completed_at)}</Text>
        <View style={styles.partsBadge}>
          <Ionicons name="cube-outline" size={12} color="#198754" />
          <Text style={styles.partsText}>{item.total_parts} part</Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color="#ADB5BD"
          style={{ marginTop: 6 }}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>Rekap Aktivitas</Text>
          <Text style={styles.headerTitle}>Riwayat Picking</Text>
        </View>
        <TouchableOpacity onPress={fetchHistory} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={22} color={DPPColors.redHino} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <CustomLoader />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={52} color="#ADB5BD" />
          <Text style={styles.emptyTitle}>Tidak dapat terhubung</Text>
          <Text style={styles.emptyDesc}>
            Pastikan backend server berjalan.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchHistory}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchHistory}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="time-outline" size={52} color="#ADB5BD" />
              <Text style={styles.emptyTitle}>Belum ada riwayat</Text>
              <Text style={styles.emptyDesc}>
                Selesaikan sesi picking untuk melihat riwayat di sini.
              </Text>
            </View>
          }
        />
      )}

      {/* Detail Modal */}
      <Modal
        visible={!!selected}
        animationType="fade"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalSheet}>
              {selected && (
                <>
                  <View style={styles.modalHeader}>
                    <View>
                      <Text style={styles.modalTitle}>Detail Sesi Picking</Text>
                      <Text style={styles.modalSub}>
                        SEQ {selected.seq} · {selected.model_code}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setSelected(null)}
                      style={styles.closeBtn}
                    >
                      <Ionicons name="close" size={22} color="#212529" />
                    </TouchableOpacity>
                  </View>

                  {/* Info Unit */}
                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Frame No (VIN)</Text>
                      <Text style={styles.infoValue}>{selected.frame_no}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Brand</Text>
                      <Text style={styles.infoValue}>{selected.brand}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Warna</Text>
                      <Text style={styles.infoValue}>{selected.colour}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Selesai</Text>
                      <Text style={styles.infoValue}>
                        {formatDate(selected.completed_at)}{" "}
                        {formatTime(selected.completed_at)}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Operator</Text>
                      <Text style={styles.infoValue}>{selected.operator}</Text>
                    </View>
                  </View>

                  {/* Part List */}
                  <Text style={styles.partListTitle}>
                    Part yang Di-pick ({selected.total_parts})
                  </Text>
                  <ScrollView
                    style={styles.partList}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    {(selected.parts_picked ?? []).map((p, i) => (
                      <View key={i} style={styles.partRow}>
                        <View style={styles.partCheck}>
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color="#198754"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.partNo}>{p.part_no}</Text>
                          <Text style={styles.partName}>{p.model_code}</Text>
                        </View>
                        <Text style={styles.partBin}>{p.location_id}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerSub: { fontSize: 13, color: "#6C757D", marginBottom: 2 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#212529" },
  refreshBtn: {
    padding: 8,
    backgroundColor: DPPColors.redHinoLight,
    borderRadius: 20,
  },
  listContent: { padding: 16, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 60,
  },
  loadingText: { marginTop: 12, color: "#6C757D", fontSize: 14 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#212529",
    marginTop: 16,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    color: "#6C757D",
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: DPPColors.redHino,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  retryText: { color: "#FFF", fontWeight: "bold", fontSize: 14 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardLeft: { flex: 1, paddingRight: 12 },
  seqBadge: {
    backgroundColor: "#E7F1FF",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  seqBadgeText: { color: "#0D6EFD", fontWeight: "bold", fontSize: 11 },
  modelCode: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 3,
  },
  frameNo: {
    fontSize: 12,
    color: "#495057",
    fontFamily: "monospace",
    marginBottom: 3,
  },
  brand: { fontSize: 12, color: "#6C757D" },
  cardRight: { alignItems: "flex-end" },
  date: { fontSize: 12, fontWeight: "600", color: "#212529" },
  time: { fontSize: 11, color: "#6C757D", marginBottom: 6 },
  partsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  partsText: {
    color: "#198754",
    fontWeight: "bold",
    fontSize: 11,
    marginLeft: 3,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#212529" },
  modalSub: { fontSize: 13, color: "#6C757D", marginTop: 2 },
  closeBtn: {
    padding: 6,
    backgroundColor: "#F0F0F0",
    borderRadius: 16,
  },
  infoGrid: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  infoItem: { marginBottom: 10 },
  infoLabel: {
    fontSize: 11,
    color: "#6C757D",
    fontWeight: "600",
    marginBottom: 2,
  },
  infoValue: { fontSize: 14, color: "#212529", fontWeight: "500" },
  partListTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 10,
  },
  partList: { maxHeight: 280 },
  partRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  partCheck: { marginRight: 10 },
  partNo: { fontSize: 13, fontWeight: "bold", color: "#212529" },
  partName: { fontSize: 11, color: "#6C757D", marginTop: 1 },
  partBin: { fontSize: 12, fontWeight: "600", color: "#0D6EFD", marginLeft: 8 },
});
