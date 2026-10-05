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
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import CustomLoader from "@/components/ui/custom-loader";
import { router } from "expo-router";
import { DPPColors } from "@/constants/colors";
import CustomAlert from "@/components/ui/custom-alert";
import { getActiveApiUrl } from "@/constants/api"; // Diubah menggunakan helper dinamis

interface ModelTruck {
  id: number;
  model_suffix: string;
  model_name: string;
}

export default function ModelManagementScreen() {
  const [apiBaseUrl, setApiBaseUrl] = useState<string>("");
  const [models, setModels] = useState<ModelTruck[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  const [formModelSuffix, setFormModelSuffix] = useState("");
  const [formModelName, setFormModelName] = useState("");

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

  const fetchModels = useCallback(async (query = "", isRefresh = false) => {
    if (!apiBaseUrl) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const url = query
        ? `${apiBaseUrl}/api/models?search=${encodeURIComponent(query)}`
        : `${apiBaseUrl}/api/models`;
      const res = await fetch(url);
      const json = await res.json();

      setModels(
        Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [],
      );
    } catch (err) {
      console.error("Network Error:", err);
      setModels([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!apiBaseUrl) return;
    const timer = setTimeout(() => fetchModels(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery, apiBaseUrl, fetchModels]);

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormModelSuffix("");
    setFormModelName("");
    setModalVisible(true);
  };

  const handleOpenEditModal = (item: ModelTruck) => {
    setIsEditing(true);
    setCurrentId(item.id);
    setFormModelSuffix(item.model_suffix);
    setFormModelName(item.model_name || "");
    setModalVisible(true);
  };

  const handleSaveModel = async () => {
    if (!apiBaseUrl) return;
    if (!formModelSuffix) {
      showAlert("Error", "Model Suffix wajib diisi!", "warning");
      return;
    }

    const payload = {
      model_suffix: formModelSuffix,
      model_name: formModelName,
    };
    try {
      const url = isEditing
        ? `${apiBaseUrl}/api/models/${currentId}`
        : `${apiBaseUrl}/api/models`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModalVisible(false);
        fetchModels(searchQuery);
        showAlert("Sukses", "Data model berhasil disimpan", "success");
      } else {
        const errData = await res.json();
        showAlert("Gagal", errData.error || "Terjadi kesalahan", "error");
      }
    } catch (err) {
      console.error(err);
      showAlert("Error", "Gagal terhubung ke server.", "error");
    }
  };

  const handleDeleteModel = (id: number, suffix: string) => {
    if (!apiBaseUrl) return;
    showAlert(
      "Konfirmasi Hapus",
      `Hapus model ${suffix}?`,
      "warning",
      async () => {
        try {
          const res = await fetch(`${apiBaseUrl}/api/models/${id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            fetchModels(searchQuery);
          } else {
            showAlert("Gagal", "Tidak dapat menghapus model.", "error");
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

  const renderItem = ({ item }: { item: ModelTruck }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.titleText}>{item.model_suffix}</Text>
        <Text style={styles.subText}>
          {item.model_name || "Tanpa Nama Model"}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionBtnEdit}
          onPress={() => handleOpenEditModal(item)}
        >
          <Ionicons name="create-outline" size={16} color="#0D6EFD" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtnDelete}
          onPress={() => handleDeleteModel(item.id, item.model_suffix)}
        >
          <Ionicons name="trash-outline" size={16} color="#DC3545" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/profile")}>
          <Ionicons name="chevron-back" size={22} color={DPPColors.redHino} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manajemen Model</Text>
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
          placeholder="Cari Model Suffix..."
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
          data={models}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          refreshing={refreshing}
          onRefresh={() => fetchModels(searchQuery, true)}
        />
      )}

      {/* Custom Alert */}
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

      <Modal visible={modalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {isEditing ? "Edit Model" : "Tambah Model"}
              </Text>

              <Text style={styles.label}>Model Suffix *</Text>
              <TextInput
                style={[
                  styles.input,
                  isEditing && { backgroundColor: "#E9ECEF" },
                ]}
                placeholder="Contoh: CX-00"
                placeholderTextColor="#A9A9A9"
                value={formModelSuffix}
                onChangeText={setFormModelSuffix}
                editable={!isEditing}
              />

              <Text style={styles.label}>Model Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: DUTRO 136 HD"
                placeholderTextColor="#A9A9A9"
                value={formModelName}
                onChangeText={setFormModelName}
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
                  onPress={handleSaveModel}
                >
                  <Text style={styles.saveBtnText}>Simpan</Text>
                </TouchableOpacity>
              </View>
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
  searchInput: { flex: 1, fontSize: 14, color: "#000000" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#FFF",
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    elevation: 2,
  },
  titleText: { fontSize: 16, fontWeight: "bold", color: "#212529" },
  subText: { fontSize: 13, color: "#6C757D", marginTop: 4 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  actionBtnEdit: { backgroundColor: "#E7F1FF", padding: 8, borderRadius: 8 },
  actionBtnDelete: { backgroundColor: "#F8D7DA", padding: 8, borderRadius: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#FFF", padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    color: "#000000",
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#CED4DA",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: { padding: 12, backgroundColor: "#E9ECEF", borderRadius: 8 },
  cancelBtnText: { color: "#495057", fontWeight: "bold" },
  saveBtn: { padding: 12, backgroundColor: DPPColors.redHino, borderRadius: 8 },
  saveBtnText: { color: "#FFF", fontWeight: "bold" },
});
