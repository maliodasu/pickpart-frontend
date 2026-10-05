import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Platform,
  Text,
  View,
  KeyboardAvoidingView,
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

export interface WorkOrder {
  id: number;
  delivery_date: string | null;
  sequence: number;
  model_code: string | null;
  special_case: string | null;
  suffix: string | null;
  height_group: string | null;
  engine: string | null;
  engine_prefix: string | null;
  transmission: string | null;
  lot_orders: string | null;
  frame_no: string | null;
  wheelbase: string | null;
  brand: string | null;
  power_rating: string | null;
  frame: string | null;
  color_code: string | null;
  colour: string | null;
  suspension_spring: string | null;
  no_urut: number | null;
  common_case: string | null;
  tyre: string | null;
  tire_group: string | null;
  wheel_group: string | null;
  remarks: string | null;
  model_suffix: string | null;
  created_at?: string;
  updated_at?: string;
}

export default function SequenceManagementScreen() {
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [apiBaseUrl, setApiBaseUrl] = useState<string>("");
  const [selectedDate, setSelectedDate] =
    useState<string>(getTodayDateString());
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [choiceModalVisible, setChoiceModalVisible] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [allModels, setAllModels] = useState<any[]>([]);
  const [modelSuggestions, setModelSuggestions] = useState<any[]>([]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

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

  const initialFormState = {
    sequence: "",
    model_code: "",
    special_case: "",
    suffix: "",
    height_group: "",
    engine: "",
    engine_prefix: "",
    transmission: "",
    lot_orders: "",
    frame_no: "",
    wheelbase: "",
    brand: "",
    power_rating: "",
    frame: "",
    color_code: "",
    colour: "",
    suspension_spring: "",
    no_urut: "1",
    common_case: "",
    tyre: "",
    tire_group: "",
    wheel_group: "",
    remarks: "",
    model_suffix: "",
  };

  const [formData, setFormData] = useState(initialFormState);

  // 1. Ambil URL API aktif dari AsyncStorage saat halaman dibuka
  useEffect(() => {
    async function initConfig() {
      const url = await getActiveApiUrl();
      if (url) {
        setApiBaseUrl(url);
      } else {
        showAlert("Error", "Alamat IP server belum dikonfigurasi!", "error");
        setIsLoading(false);
      }
    }
    initConfig();
  }, []);

  // 2. Fetch Master Models
  const fetchMasterModels = useCallback(async () => {
    if (!apiBaseUrl) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/models`);
      const json = await res.json();
      const data = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];
      setAllModels(data);
    } catch (err) {
      console.error("Gagal memuat master model", err);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    if (apiBaseUrl) {
      fetchMasterModels();
    }
  }, [apiBaseUrl, fetchMasterModels]);

  // 3. Fetch Work Orders
  const fetchWorkOrders = useCallback(async () => {
    if (!apiBaseUrl) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/work-orders?date=${selectedDate}`);
      const data = await response.json();
      if (response.ok) {
        setWorkOrders(Array.isArray(data) ? data : []);
      } else {
        console.error("Gagal mengambil data", data.error || "Unknown error");
      }
    } catch (error) {
      console.error(error);
      setWorkOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, selectedDate]);

  useEffect(() => {
    if (apiBaseUrl) {
      fetchWorkOrders();
    }
  }, [apiBaseUrl, fetchWorkOrders]);

  const searchModelSuffix = (keyword: string) => {
    setFormData({ ...formData, model_suffix: keyword });
    if (keyword.length > 0) {
      const filtered = allModels.filter(
        (m) =>
          m.model_suffix.toLowerCase().includes(keyword.toLowerCase()) ||
          (m.model_name &&
            m.model_name.toLowerCase().includes(keyword.toLowerCase())),
      );
      setModelSuggestions(filtered);
      setShowModelDropdown(true);
    } else {
      setShowModelDropdown(false);
    }
  };

  const handleOpenAddOptions = () => {
    setChoiceModalVisible(true);
  };

  const handleSelectForm = () => {
    setChoiceModalVisible(false);
    setIsEditing(false);
    setEditId(null);
    setFormData(initialFormState);
    setShowModelDropdown(false);
    setModalVisible(true);
  };

  const handleDownloadTemplate = () => {
    setChoiceModalVisible(false);
    if (!apiBaseUrl) return;

    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = `${apiBaseUrl}/api/work-orders/template`;
      link.download = 'work_order_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      showAlert("Info", "Download template via browser web / desktop.", "info");
    }
  };

  const handleSelectExcelImport = () => {
    setChoiceModalVisible(false);
    if (!apiBaseUrl) return;

    if (Platform.OS === 'web') {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.xlsx, .xls, .csv';
      fileInput.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        const formDataExcel = new FormData();
        formDataExcel.append('file', file);
        formDataExcel.append('delivery_date', selectedDate);

        try {
          setIsLoading(true);
          const response = await fetch(`${apiBaseUrl}/api/work-orders/import`, {
            method: 'POST',
            body: formDataExcel,
          });
          const result = await response.json();
          if (response.ok) {
            showAlert("Sukses", "Data berhasil diimpor dari Excel!", "success");
            fetchWorkOrders();
          } else {
            showAlert("Gagal", result.error || "Gagal mengimpor file.", "error");
          }
        } catch {
          showAlert("Error", "Terjadi kesalahan saat mengunggah file.", "error");
        } finally {
          setIsLoading(false);
        }
      };
      fileInput.click();
    } else {
      showAlert("Info", "Fitur import Excel mobile sedang disiapkan.", "info");
    }
  };

  const handleEditWorkOrder = (item: WorkOrder) => {
    setIsEditing(true);
    setEditId(item.id);
    setFormData({
      sequence: item.sequence ? String(item.sequence) : "",
      model_code: item.model_code ?? "",
      special_case: item.special_case ?? "",
      suffix: item.suffix ?? "",
      height_group: item.height_group ?? "",
      engine: item.engine ?? "",
      engine_prefix: item.engine_prefix ?? "",
      transmission: item.transmission ?? "",
      lot_orders: item.lot_orders ?? "",
      frame_no: item.frame_no ?? "",
      wheelbase: item.wheelbase ?? "",
      brand: item.brand ?? "",
      power_rating: item.power_rating ?? "",
      frame: item.frame ?? "",
      color_code: item.color_code ?? "",
      colour: item.colour ?? "",
      suspension_spring: item.suspension_spring ?? "",
      no_urut: item.no_urut ? String(item.no_urut) : "1",
      common_case: item.common_case ?? "",
      tyre: item.tyre ?? "",
      tire_group: item.tire_group ?? "",
      wheel_group: item.wheel_group ?? "",
      remarks: item.remarks ?? "",
      model_suffix: item.model_suffix ?? "",
    });
    setShowModelDropdown(false);
    setModalVisible(true);
  };
  const handleSaveOrder = async () => {
    if (!apiBaseUrl) return;
    if (
      !formData.sequence ||
      !formData.model_code ||
      !formData.lot_orders ||
      !formData.no_urut
    ) {
      showAlert(
        "Error",
        "Field wajib (Sequence, Model Code, Lot Orders, No Urut) harus diisi!",
        "warning"
      );
      return;
    }

    const numNoUrut = parseInt(formData.no_urut, 10);
    if (numNoUrut < 1 || numNoUrut > 5) {
      showAlert(
        "Error Validasi",
        "No Urut harus berada di antara rentang 1 sampai 5.",
        "warning"
      );
      return;
    }

    const payload = {
      delivery_date: selectedDate,
      sequence: parseInt(formData.sequence, 10) || 0,
      model_code: formData.model_code,
      special_case: formData.special_case || null,
      suffix: formData.suffix || null,
      height_group: formData.height_group || null,
      engine: formData.engine || null,
      engine_prefix: formData.engine_prefix || null,
      transmission: formData.transmission || null,
      lot_orders: formData.lot_orders || null,
      frame_no: formData.frame_no || null,
      wheelbase: formData.wheelbase || null,
      brand: formData.brand || null,
      power_rating: formData.power_rating || null,
      frame: formData.frame || null,
      color_code: formData.color_code || null,
      colour: formData.colour || null,
      suspension_spring: formData.suspension_spring || null,
      no_urut: numNoUrut,
      common_case: formData.common_case || null,
      tyre: formData.tyre || null,
      tire_group: formData.tire_group || null,
      wheel_group: formData.wheel_group || null,
      remarks: formData.remarks || null,
      model_suffix: formData.model_suffix || null,
    };

    try {
      const url = isEditing
        ? `${apiBaseUrl}/api/work-orders/${editId}`
        : `${apiBaseUrl}/api/work-orders`;
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        setModalVisible(false);
        fetchWorkOrders();
        showAlert("Sukses", "Data instruksi produksi berhasil disimpan", "success");
      } else {
        showAlert(
          "Gagal",
          data.message || data.error || "Gagal menyimpan data.",
          "error"
        );
      }
    } catch (error) {
      showAlert(
        "Error",
        error instanceof Error ? error.message : String(error),
        "error"
      );
    }
  };

  const handleDeleteWorkOrder = (item: WorkOrder) => {
    if (!apiBaseUrl) return;
    showAlert(
      "Konfirmasi Hapus",
      `Apakah Anda yakin ingin menghapus instruksi produksi seq: ${String(item.sequence)}?`,
      "warning",
      async () => {
        try {
          const response = await fetch(
            `${apiBaseUrl}/api/work-orders/${item.id}`,
            {
              method: "DELETE",
            },
          );
          const data = await response.json().catch(() => null);
          if (response.ok) {
            setWorkOrders((prev) =>
              prev.filter((order) => order.id !== item.id),
            );
          } else {
            showAlert(
              "Gagal",
              data?.error || "Terjadi kesalahan pada server.",
              "error"
            );
          }
        } catch (err) {
          console.error(err);
          showAlert("Gagal", "Tidak dapat terhubung ke server.", "error");
        }
      },
      true,
      "Batal",
      "Hapus"
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.replace("/profile")}>
            <Ionicons name="chevron-back" size={22} color={DPPColors.redHino} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sequence Management</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleOpenAddOptions}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addButtonText}>Tambah Unit</Text>
        </TouchableOpacity>
      </View>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        <View style={styles.dateBox}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={DPPColors.redHino}
          />
          {Platform.OS === "web" ? (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                color: "#0f172a",
                fontSize: "13px",
                fontWeight: "600",
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            />
          ) : (
            <TextInput
              style={styles.dateInput}
              value={selectedDate}
              onChangeText={setSelectedDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
            />
          )}
        </View>
        <View style={styles.totalBox}>
          <Text style={styles.totalText}>
            Total :{" "}
            <Text style={styles.totalCount}>{workOrders.length} Unit</Text>
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.load}>
          <CustomLoader />
        </View>
      ) : (
        <View style={styles.main}>
          {workOrders.length === 0 ? (
            <View style={styles.emptyBoxContainer}>
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  Belum ada instruksi produksi pada tanggal{" "}
                  <Text style={{ color: "#0f172a", fontWeight: "600" }}>
                    {selectedDate}
                  </Text>
                  .
                </Text>
              </View>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContentCenter}
              refreshControl={
                <RefreshControl
                  refreshing={isLoading}
                  onRefresh={fetchWorkOrders}
                />
              }
            >
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View style={styles.tableWrapper}>
                  {/* Header Row */}
                  <View style={[styles.row, styles.headerRow]}>
                    <Text style={[styles.cell, styles.seqCell, styles.headerText]}>
                      Sequence
                    </Text>
                    <Text style={[styles.cell, styles.suffixCell, styles.headerText]}>
                      Model Suffix
                    </Text>
                    <Text style={[styles.cell, styles.lotCell, styles.headerText]}>
                      Lot Info
                    </Text>
                    <Text style={[styles.cell, styles.modelCell, styles.headerText]}>
                      Model Code
                    </Text>
                    <Text style={[styles.cell, styles.frameCell, styles.headerText]}>
                      Frame No
                    </Text>
                    <Text style={[styles.cell, styles.colorCell, styles.headerText]}>
                      Warna
                    </Text>
                    <Text style={[styles.cell, styles.caseCell, styles.headerText]}>
                      Common Case
                    </Text>
                    <Text style={[styles.cell, styles.actionCell, styles.headerText]}>
                      Actions
                    </Text>
                  </View>

                  {/* Data Rows */}
                  {workOrders.map((item) => (
                    <View key={item.id} style={styles.row}>
                      <View style={[styles.cell, styles.seqCell]}>
                        <Text style={styles.seqValue}>
                          {String(item.sequence)}
                        </Text>
                      </View>
                      <View style={[styles.cell, styles.suffixCell]}>
                        <View style={styles.brandBadge}>
                          <Text style={styles.brandBadgeText}>
                            {item.model_suffix || "-"}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.cell, styles.lotCell]}>
                        <Text style={styles.cellText}>
                          Lot: {item.lot_orders} ({item.no_urut}/5)
                        </Text>
                      </View>
                      <View style={[styles.cell, styles.modelCell]}>
                        <Text style={styles.modelText}>
                          {item.model_code}{" "}
                          <Text
                            style={{
                              color: DPPColors.redHino,
                              fontWeight: "400",
                              fontSize: 11,
                            }}
                          >
                            ({item.brand})
                          </Text>
                        </Text>
                      </View>
                      <View style={[styles.cell, styles.frameCell]}>
                        <Text style={styles.metaMono}>
                          {item.frame_no || "-"}
                        </Text>
                      </View>
                      <View style={[styles.cell, styles.colorCell]}>
                        <Text style={styles.metaMono}>
                          {item.colour || "-"}
                        </Text>
                      </View>
                      <View style={[styles.cell, styles.caseCell]}>
                        <View style={styles.caseBadge}>
                          <Text style={styles.caseBadgeText}>
                            {item.common_case || "Standard"}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.cell, styles.actionCell, styles.actionContainer]}>
                        <TouchableOpacity
                          style={styles.editBtn}
                          onPress={() => handleEditWorkOrder(item)}
                        >
                          <Text style={styles.btnText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDeleteWorkOrder(item)}
                        >
                          <Text style={styles.btnText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </ScrollView>
          )}
        </View>
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

      {/* Modal Pilihan (Tambah Manual via Form atau Import Excel) */}
      <Modal
        visible={choiceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setChoiceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 360 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Metode Tambah Unit</Text>
              <TouchableOpacity onPress={() => setChoiceModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20, gap: 12 }}>
              <TouchableOpacity
                style={styles.choiceButton}
                onPress={handleSelectForm}
              >
                <Ionicons name="create-outline" size={22} color={DPPColors.redHino} />
                <View>
                  <Text style={styles.choiceTitle}>Tambah Lewat Form</Text>
                  <Text style={styles.choiceSubtitle}>Input data unit satu per satu</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.choiceButton}
                onPress={handleSelectExcelImport}
              >
                <Ionicons name="document-text-outline" size={22} color="#10b981" />
                <View>
                  <Text style={styles.choiceTitle}>Import dari Excel</Text>
                  <Text style={styles.choiceSubtitle}>Unggah file .xlsx / .csv</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.choiceButton}
                onPress={handleDownloadTemplate}
              >
                <Ionicons name="download-outline" size={22} color="#3b82f6" />
                <View>
                  <Text style={styles.choiceTitle}>Download Template Excel</Text>
                  <Text style={styles.choiceSubtitle}>Unduh format kosong standar</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Modal Form */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isEditing
                    ? "Edit Instruksi Produksi"
                    : "Tambah Instruksi Produksi"}{" "}
                  ({selectedDate})
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={{ padding: 16 }}
                contentContainerStyle={{ gap: 12 }}
              >
                {/* Field Sequence */}
                <View>
                  <Text style={styles.fieldLabel}>Sequence No *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={formData.sequence}
                    onChangeText={(text) =>
                      setFormData({ ...formData, sequence: text })
                    }
                    placeholder="Contoh: 21030"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>

                {/* Field Model Code */}
                <View>
                  <Text style={styles.fieldLabel}>Model Code *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={formData.model_code}
                    onChangeText={(text) =>
                      setFormData({ ...formData, model_code: text })
                    }
                    placeholder="XZU349R-HKMTBD3"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                {/* Dropdown Ringan untuk Model Suffix */}
                <View style={{ zIndex: 10, position: "relative" }}>
                  <Text style={styles.fieldLabel}>Model Suffix</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={formData.model_suffix}
                    onChangeText={searchModelSuffix}
                    placeholder="Contoh: CX-00"
                    placeholderTextColor="#94a3b8"
                  />
                  {showModelDropdown && modelSuggestions.length > 0 && (
                    <View style={styles.dropdownContainer}>
                      <ScrollView
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                        style={{ maxHeight: 130 }}
                      >
                        {modelSuggestions.map((m) => (
                          <TouchableOpacity
                            key={m.id || m.model_suffix}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setFormData({
                                ...formData,
                                model_suffix: m.model_suffix,
                              });
                              setShowModelDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownText}>
                              {m.model_suffix}{" "}
                              {m.model_name ? `- ${m.model_name}` : ""}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Sisa Input Form Lainnya */}
                {[
                  { key: "special_case", label: "Special Case", placeholder: "CX" },
                  { key: "suffix", label: "Suffix", placeholder: "00" },
                  { key: "lot_orders", label: "Lot Orders *", placeholder: "CX1622" },
                  { key: "no_urut", label: "No Urut (1 - 5) *", placeholder: "1", keyboardType: "numeric" },
                  { key: "frame_no", label: "Frame No (VIN)", placeholder: "MJECCB2F5T5038000" },
                  { key: "colour", label: "Warna (Colour)", placeholder: "SUPER WHITE" },
                  { key: "color_code", label: "Color Code", placeholder: "468" },
                  { key: "brand", label: "Brand", placeholder: "DUTRO" },
                  { key: "transmission", label: "Transmisi", placeholder: "RE50 5MT" },
                  { key: "engine", label: "Engine", placeholder: "84" },
                  { key: "engine_prefix", label: "Engine Prefix", placeholder: "WY" },
                  { key: "wheelbase", label: "Wheelbase", placeholder: "LONG 1 (L1)" },
                  { key: "power_rating", label: "Power Rating", placeholder: "H" },
                  { key: "frame", label: "Frame", placeholder: "F1959" },
                  { key: "suspension_spring", label: "Suspension Spring", placeholder: "CHI" },
                  { key: "common_case", label: "Common Case", placeholder: "136HD-6.8 (OFF ROAD)" },
                  { key: "tyre", label: "Tyre", placeholder: "7" },
                  { key: "tire_group", label: "Tire Group", placeholder: "GY2" },
                  { key: "wheel_group", label: "Wheel Group", placeholder: "AK1" },
                  { key: "height_group", label: "Height Group", placeholder: "11" },
                  { key: "remarks", label: "Remarks", placeholder: "Catatan tambahan..." },
                ].map((field) => (
                  <View key={field.key}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={(formData as any)[field.key]}
                      onChangeText={(text) =>
                        setFormData({ ...formData, [field.key]: text })
                      }
                      placeholder={field.placeholder}
                      placeholderTextColor="#94a3b8"
                      keyboardType={field.keyboardType as any}
                    />
                  </View>
                ))}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveOrder}
                >
                  <Text style={styles.saveButtonText}>Simpan Unit</Text>
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
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { color: "#0f172a", fontSize: 18, fontWeight: "700" },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: DPPColors.redHino,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  filterBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "rgba(241,245,249,0.7)",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  dateInput: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "600",
    minWidth: 100,
  },
  totalBox: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  totalText: { color: "#64748b", fontSize: 13, fontWeight: "500" },
  totalCount: { color: DPPColors.redHino, fontWeight: "700" },
  main: {
    flex: 1,
    width: "100%",
  },
  load: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContentCenter: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  tableWrapper: {
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignSelf: "center",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    alignItems: "center",
    minHeight: 52,
    backgroundColor: "#fff",
  },
  headerRow: {
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 2,
    borderBottomColor: "#cbd5e1",
  },
  headerText: { fontWeight: "bold", color: "#475569", fontSize: 12 },
  cell: { paddingHorizontal: 12, justifyContent: "center" },
  cellText: { fontSize: 13, color: "#334155" },

  seqCell: { width: 80, alignItems: "center" },
  suffixCell: { width: 110 },
  lotCell: { width: 120 },
  modelCell: { width: 180 },
  frameCell: { width: 160 },
  colorCell: { width: 130 },
  caseCell: { width: 160 },
  actionCell: { width: 150 },

  seqValue: { fontWeight: "bold", color: DPPColors.redHino, fontSize: 13 },
  modelText: { fontSize: 13, fontWeight: "600", color: "#0f172a" },
  metaMono: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    color: "#334155",
  },

  brandBadge: {
    backgroundColor: DPPColors.redHinoLight,
    borderWidth: 1,
    borderColor: DPPColors.redHino,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  brandBadgeText: { color: DPPColors.redHino, fontSize: 11, fontWeight: "700" },

  caseBadge: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  caseBadgeText: { color: "#475569", fontSize: 11, fontWeight: "600" },

  actionContainer: { flexDirection: "row", gap: 6, alignItems: "center" },
  editBtn: {
    backgroundColor: "#0ea5e9",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
  },
  deleteBtn: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
  },
  btnText: { color: "#fff", fontSize: 10, fontWeight: "600" },

  emptyBoxContainer: { padding: 16 },
  emptyBox: {
    paddingVertical: 60,
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyText: {
    color: "#64748b",
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalBox: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    width: "100%",
    maxWidth: 480,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: { color: "#0f172a", fontSize: 16, fontWeight: "700" },
  choiceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
  },
  choiceTitle: { color: "#0f172a", fontSize: 14, fontWeight: "600" },
  choiceSubtitle: { color: "#64748b", fontSize: 12 },
  fieldLabel: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  fieldInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#0f172a",
    fontSize: 13,
  },
  dropdownContainer: {
    position: "absolute",
    top: 72,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 99,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dropdownText: { fontSize: 13, color: "#0f172a" },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  cancelButtonText: { color: "#475569", fontSize: 13 },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: DPPColors.redHino,
  },
  saveButtonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
