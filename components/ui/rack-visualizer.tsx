import React from "react";
import { View, Text, StyleSheet } from "react-native";
// Hapus baris ini jika ada di atas file:
interface RackVisualizerProps {
  partAddress: string; // Contoh: "TL 01-1-1"
}

const parseRackAddress = (address: string) => {
  if (!address) return null;

  // Deteksi apakah ini Trimming Left (TL) atau Trimming Right (TR)
  const side = address.startsWith("TR") ? "TR" : "TL";

  // Hapus awalan "TL " atau "TR " (baik dengan spasi atau tanpa spasi)
  const cleanAddress = address.replace(/^(TL|TR)\s*/, "");

  // Pecah sisa string berdasarkan tanda strip (-)
  const parts = cleanAddress.split("-");

  return {
    side: side, // Menyimpan "TL" atau "TR"
    rack: parseInt(parts[0], 10) || 1,
    row: parseInt(parts[1], 10) || 1, // Baris / Lantai
    col: parseInt(parts[2], 10) || 1, // Kolom
  };
};

export default function RackVisualizer({ partAddress }: RackVisualizerProps) {
  // Parse alamat part yang aktif discan/dipilih
  const activeLocation = parseRackAddress(partAddress);

  // Simulasi ukuran rak (Misal: 3 Baris/Lantai, 4 Kolom dalam 1 Rak)
  const totalRows = 3;
  const totalCols = 4;

  return (
      <View style={{ flex: 1 }}>

      {/*<Header />*/}
      <View style={styles.container}>
        {/* Loop Baris / Lantai */}
        {Array.from({ length: totalRows }, (_, rowIndex) => {
          const currentRow = totalRows - rowIndex; // Urutan lantai dari atas ke bawah (3, 2, 1)

          return (
            <View key={`row-${currentRow}`} style={styles.rowContainer}>
              <Text style={styles.rowLabel}>Tingkat {currentRow}</Text>

              <View style={styles.colContainer}>
                {/* Loop Kolom */}
                {Array.from({ length: totalCols }, (_, colIndex) => {
                  const currentCol = colIndex + 1;

                  // Cek apakah koordinat ini yang dituju oleh part_address
                  const isTarget =
                    activeLocation &&
                    activeLocation.row === currentRow &&
                    activeLocation.col === currentCol;

                  return (
                    <View
                      key={`col-${currentCol}`}
                      style={[
                        styles.cellBox,
                        isTarget && styles.cellActive, // Menyala hijau jika cocok
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
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#212529",
  },
  rackFrame: {
    backgroundColor: "#F8F9FA",
    padding: 12,
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
    fontSize: 12,
    color: "#6C757D",
    fontWeight: "600",
  },
  colContainer: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  cellBox: {
    flex: 1,
    height: 40,
    backgroundColor: "#E9ECEF",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CED4DA",
  },
  cellActive: {
    backgroundColor: "#198754", // Hijau menyala
    borderColor: "#146c43",
    elevation: 4, // Efek bayangan menyala di Android
    shadowColor: "#198754", // Efek glow di iOS
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  cellText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#495057",
  },
  cellTextActive: {
    color: "#FFFFFF",
  },
});
