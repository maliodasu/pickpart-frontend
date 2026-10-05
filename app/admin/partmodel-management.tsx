import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import CustomLoader from "@/components/ui/custom-loader";
import { router } from "expo-router";
import { DPPColors } from "@/constants/colors";
import CustomAlert from "@/components/ui/custom-alert";
import { getActiveApiUrl } from "@/constants/api"; // Diubah menggunakan helper dinamis

interface PickingSequence {
  id: number;
  part_no: string;
  model_suffix: string;
  quantity: number;
}

export default function PartModelManagementScreen() {
  const [apiBaseUrl, setApiBaseUrl] = useState<string>("");
  const [sequences, setSequences] = useState<PickingSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [formPartNo, setFormPartNo] = useState("");
  const [formQty, setFormQty] = useState("");

  const [allModels, setAllModels] = useState<any[]>([]);
  const [partSuggestions, setPartSuggestions] = useState<any[]>([]);
  const [modelFilterText, setModelFilterText] = useState("");
  const [showPartDropdown, setShowPartDropdown] = useState(false);

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
    confirmText = "OK"
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

  // 1. Muat API URL dari AsyncStorage saat pertama kali dibuka
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

  const fetchMasterModels = useCallback(async () => {
    if (!apiBaseUrl) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/models`);
      const json = await res.json();
      setAllModels(
        Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [],
      );
    } catch (err) {
      console.error("Gagal memuat master model", err);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    if (apiBaseUrl) {
      fetchMasterModels();
    }
  }, [apiBaseUrl, fetchMasterModels]);

  const searchParts = async (keyword: string) => {
    setFormPartNo(keyword);
    if (!apiBaseUrl) return;
    if (keyword.length > 0) {
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/parts?search=${encodeURIComponent(keyword)}`,
        );
        const json = await res.json();
        setPartSuggestions(
          Array.isArray(json.data)
            ? json.data
            : Array.isArray(json)
            ? json
            : [],
        );
        setShowPartDropdown(true);
      } catch (err) {
        console.error(err);
        setPartSuggestions([]);
      }
    } else {
      setShowPartDropdown(false);
    }
  };

  const fetchSequences = useCallback(async (query = "", isRefresh = false) => {
    if (!apiBaseUrl) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const url = query
        ? `${apiBaseUrl}/api/picking-sequences?search=${encodeURIComponent(query)}`
        : `${apiBaseUrl}/api/picking-sequences`;
      const res = await fetch(url);
      const json = await res.json();

      setSequences(
        Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [],
      );
    } catch (err) {
      console.error("Network Error:", err);
      setSequences([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!apiBaseUrl) return;
    const timer = setTimeout(() => fetchSequences(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery, apiBaseUrl, fetchSequences]);

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setSelectedModels([]);
    setModelFilterText("");
    setFormPartNo("");
    setFormQty("");
    setModalVisible(true);
  };

  const handleOpenEditModal = (item: PickingSequence) => {
    setIsEditing(true);
    setCurrentId(item.id);
    setSelectedModels([item.model_suffix]);
    setFormPartNo(item.part_no);
    setFormQty(String(item.quantity));
    setModalVisible(true);
  };

  const toggleModelSelection = (suffix: string) => {
    setModelFilterText("");
    if (selectedModels.includes(suffix)) {
      setSelectedModels(selectedModels.filter((s) => s !== suffix));
    } else {
      setSelectedModels([...selectedModels, suffix]);
    }
  };

  const handleSaveSequence = async () => {
    if (!apiBaseUrl) return;
    if (selectedModels.length === 0 || !formPartNo || !formQty) {
      showAlert(
        "Error",
        "Pilih minimal 1 Model Suffix, isi Part No, dan Quantity!",
        "warning"
      );
      return;
    }

    const payload = isEditing
      ? {
          model_suffix: selectedModels[0],
          part_no: formPartNo,
          quantity: parseInt(formQty, 10),
        }
      : {
          model_suffixes: selectedModels,
          part_no: formPartNo,
          quantity: parseInt(formQty, 10),
        };

    try {
      const url = isEditing
        ? `${apiBaseUrl}/api/picking-sequences/${currentId}`
        : `${apiBaseUrl}/api/picking-sequences`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModalVisible(false);
        fetchSequences(searchQuery);
        showAlert("Sukses", "Alokasi part berhasil disimpan", "success");
      } else {
        const errData = await res.json();
        showAlert("Gagal", errData.message || "Terjadi kesalahan.", "error");
      }
    } catch (err: any) {
      showAlert("Error", "Gagal terhubung ke server. " + err.message, "error");
    }
  };

  const handleDeleteSequence = (id: number) => {
    if (!apiBaseUrl) return;
    showAlert(
      "Konfirmasi Hapus",
      "Hapus alokasi part ini?",
      "warning",
      async () => {
        try {
          const res = await fetch(
            `${apiBaseUrl}/api/picking-sequences/${id}`,
            {
              method: "DELETE",
            },
          );
          if (res.ok) {
            fetchSequences(searchQuery);
          } else {
            showAlert("Gagal", "Tidak dapat menghapus data.", "error");
          }
        } catch (err) {
          console.error(err);
          showAlert("Error", "Terjadi kesalahan saat menghapus data.", "error");
        }
      },
      true,
      "Batal",
      "Hapus"
    );
  };

  const filteredModels = allModels.filter(
    (m) =>
      m.model_suffix.toLowerCase().includes(modelFilterText.toLowerCase()) ||
      (m.model_name &&
        m.model_name.toLowerCase().includes(modelFilterText.toLowerCase())),
  );

  const renderChipItem = ({ item }: { item: any }) => {
    const isSelected = selectedModels.includes(item.model_suffix);
    return (
      <TouchableOpacity
        style={[styles.chip, isSelected && styles.chipSelected]}
        onPress={() => toggleModelSelection(item.model_suffix)}
      >
        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
          {item.model_suffix}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark" size={12} color="#FFF" style={{ marginLeft: 4 }} />
        )}
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: PickingSequence }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.badge}>
          <Ionicons name="car-sport" size={12} color="#0D6EFD" />
          <Text style={styles.badgeText}>{item.model_suffix}</Text>
        </View>
        <View style={styles.qtyBadge}>
          <Text style={styles.qtyText}>Qty: {item.quantity}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.partNoText}>{item.part_no}</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionBtnEdit}
          onPress={() => handleOpenEditModal(item)}
        >
          <Ionicons name="create-outline" size={16} color="#0D6EFD" />
          <Text style={{ color: "#0D6EFD", fontSize: 12, fontWeight: "bold", marginLeft: 4 }}>
            Edit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtnDelete}
          onPress={() => handleDeleteSequence(item.id)}
        >
          <Ionicons name="trash-outline" size={16} color="#DC3545" />
          <Text style={{ color: "#DC3545", fontSize: 12, fontWeight: "bold", marginLeft: 4 }}>
            Hapus
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* MODAL RINGAN PILIH BANYAK MODEL */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "android" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeaderTop}>
                <Text style={styles.modalTitle}>
                  {isEditing
                    ? "Edit Alokasi Part"
                    : "Pilih Banyak Model Suffix"}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#6C757D" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>
                Pilih Model ({selectedModels.length} dipilih) *
              </Text>

              <TextInput
                style={styles.inputSearchMini}
                placeholder="Cari model cepat..."
                placeholderTextColor="#ADB5BD"
                value={modelFilterText}
                onChangeText={setModelFilterText}
              />

              <View style={styles.chipContainerWrapper}>
                <FlatList
                  keyboardShouldPersistTaps="handled"
                  data={filteredModels}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(m) => (m.id ? m.id.toString() : m.model_suffix)}
                  renderItem={renderChipItem}
                  contentContainerStyle={{ gap: 6, alignItems: "center" }}
                  initialNumToRender={15}
                  windowSize={5}
                />
              </View>

              <View>
                <Text style={styles.label}>Part No *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ketik part no..."
                  placeholderTextColor="#ADB5BD"
                  value={formPartNo}
                  onChangeText={searchParts}
                  editable={!isEditing}
                />
                {showPartDropdown && partSuggestions.length > 0 && (
                  <View style={styles.dropdownContainer}>
                    <FlatList
                      data={partSuggestions}
                      keyExtractor={(item) => item.id.toString()}
                      nestedScrollEnabled={true}
                      style={{ maxHeight: 120 }}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.dropdownItem}
                          onPress={() => {
                            setFormPartNo(item.part_no);
                            setShowPartDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownText}>
                            {item.part_no} ({item.part_name})
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                )}
              </View>

              <Text style={styles.label}>Quantity *</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#ADB5BD"
                keyboardType="numeric"
                value={formQty}
                onChangeText={setFormQty}
              />

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveSequence}
                >
                  <Text style={styles.saveBtnText}>Simpan Alokasi</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* HEADER UTAMA */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/profile")}>
          <Ionicons name="chevron-back" size={22} color={DPPColors.redHino} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manajemen Part Model</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleOpenAddModal}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#6C757D"
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari Model Suffix atau Part No..."
          placeholderTextColor="#A9A9A9"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <CustomLoader />
        </View>
      ) : (
        <FlatList
          data={sequences}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          refreshing={refreshing}
          onRefresh={() => fetchSequences(searchQuery, true)}
        />
      )}

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  inputSearchMini: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#CED4DA",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    marginBottom: 8,
  },
  chipContainerWrapper: {
    height: 50,
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#CED4DA",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    height: 32,
  },
  chipSelected: {
    backgroundColor: DPPColors.redHino,
    borderColor: DPPColors.redHino,
  },
  chipText: {
    fontSize: 12,
    color: "#495057",
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "#FFF",
    fontWeight: "bold",
  },
  dropdownContainer: {
    position: "absolute",
    top: 65,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CED4DA",
    borderRadius: 8,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 99,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  dropdownText: {
    fontSize: 12,
    color: "#212529",
  },
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderColor: "#E9ECEF",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#212529" },
  addButton: {
    backgroundColor: DPPColors.redHino,
    padding: 6,
    borderRadius: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 14 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E7F1FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: { color: "#0D6EFD", fontSize: 12, fontWeight: "bold" },
  qtyBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  qtyText: { color: "#198754", fontSize: 12, fontWeight: "bold" },
  cardBody: { marginBottom: 12 },
  partNoText: { fontSize: 18, fontWeight: "bold", color: "#212529" },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    borderTopWidth: 1,
    borderColor: "#F1F3F5",
    paddingTop: 10,
  },
  actionBtnEdit: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E7F1FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnDelete: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8D7DA",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#FFF",
    padding: 18,
    borderRadius: 16,
    maxHeight: "85%",
  },
  modalTitle: { fontSize: 16, fontWeight: "bold" },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    color: "#000000",
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#CED4DA",
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
    borderTopWidth: 1,
    borderColor: "#E9ECEF",
    paddingTop: 10,
  },
  cancelBtn: { padding: 10, backgroundColor: "#E9ECEF", borderRadius: 8 },
  cancelBtnText: { color: "#495057", fontWeight: "bold", fontSize: 12 },
  saveBtn: { padding: 10, backgroundColor: DPPColors.redHino, borderRadius: 8 },
  saveBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 12 },
});
