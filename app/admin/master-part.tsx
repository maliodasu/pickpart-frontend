import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Text,
  View,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import CustomLoader from "@/components/ui/custom-loader";
import { router } from "expo-router";
import { DPPColors } from "@/constants/colors";
import CustomAlert from "@/components/ui/custom-alert";
import { getActiveApiUrl } from "@/constants/api"; // Diubah menggunakan helper dinamis

interface Part {
  id: number;
  part_no: string;
  part_name: string;
  setting: string;
  old_address: string;
  new_address: string;
  supplier: string;
  unique_number: string;
  tag_id: string;
  pcs_per_kanban: number;
  packing_spec: string;
  rack_per_box: number;
  rack_per_pcs: number;
  keterangan: string;
  created_at: string;
  updated_at: string;
}

export default function MasterPartsScreen() {
  const [apiBaseUrl, setApiBaseUrl] = useState<string>("");
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formPartNo, setFormPartNo] = useState("");
  const [formPartName, setFormPartName] = useState("");
  const [formSetting, setFormSetting] = useState("");
  const [formOldAddress, setFormOldAddress] = useState("");
  const [formNewAddress, setFormNewAddress] = useState("");
  const [formSupplier, setFormSupplier] = useState("");
  const [formUniqueNumber, setFormUniqueNumber] = useState("");
  const [formTagId, setFormTagId] = useState("");
  const [formPcsPerKanban, setFormPcsPerKanban] = useState("");
  const [formPackingSpec, setFormPackingSpec] = useState("");
  const [formRackPerBox, setFormRackPerBox] = useState("");
  const [formRackPerPcs, setFormRackPerPcs] = useState("");
  const [formKeterangan, setFormKeterangan] = useState("");

  // Referensi WebSocket untuk komunikasi real-time
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const wsRef = useRef<WebSocket | null>(null);

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
    showCancel = false,
    cancelText = "Batal",
    confirmText = "OK",
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm,
      showCancel,
      cancelText,
      confirmText,
    });
  };

  // 1. Muat API URL dari AsyncStorage saat halaman pertama kali dibuka
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

  // 2. Inisialisasi Koneksi WebSocket setelah apiBaseUrl didapatkan
  useEffect(() => {
    if (!apiBaseUrl) return;

    const wsUrl = apiBaseUrl.replace(/^http/, "ws") + "/picking-part";
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS Frontend] Terhubung ke server WebSocket");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Menerima data tag RFID yang masuk secara real-time dari ESP32 atau server
        if (data.type === "scan_tag" || data.type === "modal_scan_tag") {
          if (modalVisible && data.tag_id) {
            setFormTagId(data.tag_id); // Otomatis mengisi input form saat discan perangkat
          }
        }
      } catch (err) {
        console.error("[WS Frontend] Gagal parse pesan:", err);
      }
    };

    ws.onerror = (error) => {
      console.log("[WS Frontend Error]:", error);
    };

    ws.onclose = () => {
      console.log("[WS Frontend] Koneksi terputus");
    };

    return () => {
      ws.close();
    };
  }, [apiBaseUrl, modalVisible]);

  // Interpolasi warna latar belakang dan border
  const animatedBackgroundColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#F0F4FF", "#D1E7DD"],
  });

  const animatedBorderColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#0D6EFD", "#198754"],
  });

  const fetchParts = useCallback(async (query = "", isRefresh = false) => {
    if (!apiBaseUrl) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const url = query
        ? `${apiBaseUrl}/api/parts?search=${encodeURIComponent(query)}`
        : `${apiBaseUrl}/api/parts`;

      const res = await fetch(url);
      const json = await res.json();

      if (res.ok) {
        setParts(
          Array.isArray(json.data)
            ? json.data
            : Array.isArray(json)
            ? json
            : [],
        );
      } else {
        setParts([]);
      }
    } catch (err) {
      console.error("Network Error:", err);
      setParts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!apiBaseUrl) return;
    const timer = setTimeout(() => {
      fetchParts(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, apiBaseUrl, fetchParts]);

  // Pantau perubahan formTagId untuk menjalankan kedipan
  useEffect(() => {
    if (formTagId) {
      const triggerPulse = () => {
        pulseAnim.setValue(0);
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }),
        ]).start();
      };

      triggerPulse();
    }
  }, [formTagId, pulseAnim]);

  const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setFormPartNo("");
    setFormPartName("");
    setFormSetting("");
    setFormSupplier("");
    setFormUniqueNumber("");
    setFormTagId("");
    setFormOldAddress("");
    setFormNewAddress("");
    setFormPcsPerKanban("");
    setFormPackingSpec("");
    setFormRackPerBox("");
    setFormRackPerPcs("");
    setFormKeterangan("");
    setModalVisible(true);
  };

  const handleOpenEditModal = (part: Part) => {
    setIsEditing(true);
    setFormPartNo(part.part_no || "");
    setFormPartName(part.part_name || "");
    setFormSetting(part.setting || "");
    setFormSupplier(part.supplier || "");
    setFormUniqueNumber(part.unique_number || "");
    setFormTagId(part.tag_id || "");
    setFormOldAddress(part.old_address || "");
    setFormNewAddress(part.new_address || "");
    setFormPcsPerKanban(String(part.pcs_per_kanban || ""));
    setFormPackingSpec(part.packing_spec || "");
    setFormRackPerBox(String(part.rack_per_box || ""));
    setFormRackPerPcs(String(part.rack_per_pcs || ""));
    setFormKeterangan(part.keterangan || "");
    setModalVisible(true);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "session_status",
          active: true,
          part_no: part.part_no,
        }),
      );
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "session_status",
          active: false,
          part_no: null,
        }),
      );
    }

    fetchParts(searchQuery);
  };

  const handleSavePart = async () => {
    if (!apiBaseUrl) return;
    if (!formPartNo || !formPartName) {
      showAlert("Error", "Part No dan Part Name wajib diisi!", "warning");
      return;
    }

    const payload = {
      part_no: formPartNo,
      part_name: formPartName,
      setting: formSetting,
      supplier: formSupplier,
      unique_number: formUniqueNumber,
      tag_id: formTagId,
      old_address: formOldAddress,
      new_address: formNewAddress,
      pcs_per_kanban: Number(formPcsPerKanban) || 0,
      packing_spec: formPackingSpec,
      rack_per_box: Number(formRackPerBox) || 0,
      rack_per_pcs: Number(formRackPerPcs) || 0,
      keterangan: formKeterangan,
    };

    try {
      const url = isEditing
        ? `${apiBaseUrl}/api/parts/${formPartNo}`
        : `${apiBaseUrl}/api/parts`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModalVisible(false);
        fetchParts(searchQuery);
        showAlert("Sukses", "Data part berhasil disimpan", "success");
      } else {
        const errData = await res.json();
        showAlert("Gagal", errData.error || "Terjadi kesalahan", "error");
      }
    } catch (err) {
      console.error(err);
      showAlert("Error", "Gagal terhubung ke server.", "error");
    }
  };

  const handleDeletePart = (partNo: string) => {
    if (!apiBaseUrl) return;
    showAlert(
      "Konfirmasi Hapus",
      `Apakah Anda yakin ingin menghapus part ${partNo}?`,
      "warning",
      async () => {
        try {
          const res = await fetch(`${apiBaseUrl}/api/parts/${partNo}`, {
            method: "DELETE",
          });
          if (res.ok) {
            fetchParts(searchQuery);
          } else {
            showAlert("Gagal", "Tidak dapat menghapus part.", "error");
          }
        } catch (err) {
          console.error("Delete error:", err);
          showAlert("Error", "Terjadi kesalahan saat menghapus data.", "error");
        }
      },
      true,
    );
  };

  const renderItem = ({ item }: { item: Part }) => (
    <View style={styles.partCard}>
      <View style={styles.partHeaderRow}>
        <View style={styles.tagBadge}>
          <Ionicons
            name="pricetag-outline"
            size={12}
            color={DPPColors.redHino}
          />
          <Text style={styles.tagText}>{item.part_no || "NO PART NO"}</Text>
        </View>
        <View style={styles.rackBadge}>
          <Ionicons name="location-outline" size={12} color="#2E7D32" />
          <Text style={styles.rackText}>{item.new_address || "-"}</Text>
        </View>
      </View>

      <Text style={styles.partNameText}>{item.part_name || "Tanpa Nama"}</Text>

      <View style={styles.attributesGrid}>
        <View style={styles.attrItem}>
          <Text style={styles.attrLabel}>Tag ID / Kartu</Text>
          <Text
            style={[
              styles.attrValue,
              { color: item.tag_id ? "#0D6EFD" : "#ADB5BD" },
            ]}
          >
            {item.tag_id || "Belum Discan"}
          </Text>
        </View>
        <View style={styles.attrItem}>
          <Text style={styles.attrLabel}>Setting</Text>
          <Text style={styles.attrValue}>{item.setting || "-"}</Text>
        </View>
        <View style={styles.attrItem}>
          <Text style={styles.attrLabel}>Supplier</Text>
          <Text style={styles.attrValue}>{item.supplier || "-"}</Text>
        </View>
        <View style={styles.attrItem}>
          <Text style={styles.attrLabel}>Unique No</Text>
          <Text style={styles.attrValue}>{item.unique_number || "-"}</Text>
        </View>
        <View style={styles.attrItem}>
          <Text style={styles.attrLabel}>Pcs/Kanban</Text>
          <Text style={styles.attrValue}>{item.pcs_per_kanban ?? 0}</Text>
        </View>
        <View style={styles.attrItem}>
          <Text style={styles.attrLabel}>Packing Spec</Text>
          <Text style={styles.attrValue}>{item.packing_spec || "-"}</Text>
        </View>
      </View>

      {item.keterangan ? (
        <View style={styles.keteranganContainer}>
          <Ionicons
            name="information-circle-outline"
            size={14}
            color="#6C757D"
          />
          <Text style={styles.keteranganText} numberOfLines={2}>
            {item.keterangan}
          </Text>
        </View>
      ) : null}

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionBtnEdit}
          onPress={() => handleOpenEditModal(item)}
        >
          <Ionicons name="create-outline" size={15} color="#0D6EFD" />
          <Text style={styles.actionTextEdit}>Edit / Scan Tag</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtnDelete}
          onPress={() => handleDeletePart(item.part_no)}
        >
          <Ionicons name="trash-outline" size={15} color="#DC3545" />
          <Text style={styles.actionTextDelete}>Hapus</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/profile")}>
          <Ionicons name="chevron-back" size={22} color={DPPColors.redHino} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Master Parts</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleOpenAddModal}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#6C757D"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari Part No atau Part Name..."
          placeholderTextColor="#ADB5BD"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color="#6C757D" />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <CustomLoader />
        </View>
      ) : (
        <FlatList
          data={parts}
          keyExtractor={(item, index) =>
            item.id ? item.id.toString() : index.toString()
          }
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => fetchParts(searchQuery, true)}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color="#ADB5BD" />
              <Text style={styles.emptyText}>
                Tidak ada data part ditemukan.
              </Text>
            </View>
          }
        />
      )}

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

      {/* Modal Form */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isEditing ? "Edit Part & Scan Tag" : "Tambah Part Baru"}
                </Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <Ionicons name="close" size={24} color="#212529" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={[{ key: "form" }]}
                keyExtractor={() => "modal-form"}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                renderItem={() => (
                  <View style={{ gap: 12, paddingBottom: 20 }}>
                    <View>
                      <Text style={styles.label}>Part No *</Text>
                      <TextInput
                        style={[
                          styles.input,
                          isEditing && { backgroundColor: "#E9ECEF" },
                        ]}
                        placeholder="Contoh: 23330-0U010"
                        value={formPartNo}
                        onChangeText={setFormPartNo}
                        editable={!isEditing}
                      />
                    </View>

                    <View>
                      <Text style={styles.label}>Part Name *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Contoh: PREFILTER ASSY, FUEL"
                        value={formPartName}
                        onChangeText={setFormPartName}
                      />
                    </View>

                    {/* Input Tag ID / Scan Kartu */}
                    <View>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Text style={styles.label}>Tag ID / Scan Kartu</Text>
                      </View>
                      <AnimatedTextInput
                        style={[
                          styles.input,
                          {
                            borderColor: animatedBorderColor,
                            backgroundColor: animatedBackgroundColor,
                          },
                        ]}
                        placeholder="Tempelkan kartu atau ketik Tag ID..."
                        value={formTagId}
                        onChangeText={setFormTagId}
                      />
                    </View>

                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Setting</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Setting..."
                          value={formSetting}
                          onChangeText={setFormSetting}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Supplier</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Supplier..."
                          value={formSupplier}
                          onChangeText={setFormSupplier}
                        />
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>New Address</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Rak Baru..."
                          value={formNewAddress}
                          onChangeText={setFormNewAddress}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Old Address</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Rak Lama..."
                          value={formOldAddress}
                          onChangeText={setFormOldAddress}
                        />
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Unique Number</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Unique No..."
                          value={formUniqueNumber}
                          onChangeText={setFormUniqueNumber}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Pcs / Kanban</Text>
                        <TextInput
                          style={styles.input}
                          keyboardType="numeric"
                          placeholder="0"
                          value={formPcsPerKanban}
                          onChangeText={setFormPcsPerKanban}
                        />
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Rack / Box</Text>
                        <TextInput
                          style={styles.input}
                          keyboardType="numeric"
                          placeholder="0"
                          value={formRackPerBox}
                          onChangeText={setFormRackPerBox}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Rack / Pcs</Text>
                        <TextInput
                          style={styles.input}
                          keyboardType="numeric"
                          placeholder="0"
                          value={formRackPerPcs}
                          onChangeText={setFormRackPerPcs}
                        />
                      </View>
                    </View>

                    <View>
                      <Text style={styles.label}>Packing Spec</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Packing Spec..."
                        value={formPackingSpec}
                        onChangeText={setFormPackingSpec}
                      />
                    </View>

                    <View>
                      <Text style={styles.label}>Keterangan / Remarks</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Catatan tambahan..."
                        value={formKeterangan}
                        onChangeText={setFormKeterangan}
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleSavePart}
                    >
                      <Text style={styles.saveButtonText}>
                        {isEditing
                          ? "Simpan Perubahan & Tag ID"
                          : "Tambah Part"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
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
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#212529" },
  addButton: {
    backgroundColor: DPPColors.redHino,
    padding: 8,
    borderRadius: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    height: 46,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: "#212529" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  emptyText: { marginTop: 10, color: "#6C757D", fontSize: 14 },
  partCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  partHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DPPColors.redHinoLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  tagText: { color: DPPColors.redHino, fontSize: 11, fontWeight: "700" },
  rackBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  rackText: { color: "#2E7D32", fontSize: 11, fontWeight: "700" },
  partNameText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 10,
  },
  attributesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    padding: 8,
    gap: 8,
    marginBottom: 10,
  },
  attrItem: {
    width: "31%",
    flexGrow: 1,
  },
  attrLabel: {
    fontSize: 10,
    color: "#6C757D",
    fontWeight: "500",
  },
  attrValue: {
    fontSize: 12,
    color: "#212529",
    fontWeight: "600",
    marginTop: 1,
  },
  keteranganContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF3CD",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  keteranganText: {
    fontSize: 11,
    color: "#856404",
    flex: 1,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
    paddingTop: 8,
    gap: 8,
  },
  actionBtnEdit: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E7F1FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  actionTextEdit: { color: "#0D6EFD", fontSize: 12, fontWeight: "600" },
  actionBtnDelete: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8D7DA",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  actionTextDelete: { color: "#DC3545", fontSize: 12, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#212529" },
  label: { fontSize: 12, fontWeight: "600", color: "#495057", marginBottom: 4 },
  input: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#CED4DA",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#212529",
  },
  saveButton: {
    backgroundColor: DPPColors.redHino,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  saveButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "bold" },
});
