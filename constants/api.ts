import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@custom_api_base_url';

// Default awal kosong (atau penanda bahwa belum dikonfigurasi)
const DEFAULT_EMPTY_URL = '';

let currentApiBaseUrl: string = DEFAULT_EMPTY_URL;

/**
 * Inisialisasi: Cek apakah user sudah pernah menyimpan IP server mereka sendiri.
 */
export async function initializeApiConfig(): Promise<string> {
  try {
    const savedUrl = await AsyncStorage.getItem(STORAGE_KEY);
    if (savedUrl) {
      currentApiBaseUrl = savedUrl;
      console.log("📌 Menggunakan IP server kustom:", currentApiBaseUrl);
    } else {
      console.log("⚠️ Belum ada IP server yang dikonfigurasi.");
      currentApiBaseUrl = DEFAULT_EMPTY_URL;
    }
  } catch (error) {
    console.error("❌ Gagal memuat konfigurasi API:", error);
    currentApiBaseUrl = DEFAULT_EMPTY_URL;
  }

  return currentApiBaseUrl;
}

/**
 * Menyimpan IP/Domain backend yang diinput sendiri oleh pengguna.
 */
export async function setCustomApiUrl(newUrl: string): Promise<void> {
  try {
    let formattedUrl = newUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `http://${formattedUrl}`;
    }

    currentApiBaseUrl = formattedUrl;
    await AsyncStorage.setItem(STORAGE_KEY, formattedUrl);
    console.log("💾 IP server berhasil disimpan:", formattedUrl);
  } catch (error) {
    console.error("❌ Gagal menyimpan IP server:", error);
    throw error;
  }
}

export async function getActiveApiUrl(): Promise<string> {
  try {
    const url = await AsyncStorage.getItem(STORAGE_KEY);
    return url ? url : '';
  } catch (error) {
    console.error("Gagal mengambil URL API:", error);
    return '';
  }
}

/**
 * Mengecek apakah API sudah dikonfigurasi atau belum.
 */
export function isApiConfigured(): boolean {
  return currentApiBaseUrl !== DEFAULT_EMPTY_URL && currentApiBaseUrl.trim() !== '';
}

export function getApiBaseUrl(): string {
  return currentApiBaseUrl;
}
