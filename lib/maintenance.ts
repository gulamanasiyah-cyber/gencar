import { getSession } from "@/lib/auth";
import { getSettingValue } from "@/lib/cached-queries";

export async function checkMaintenance() {
  try {
    // Dibaca dari cache settings (di-invalidate saat POST /api/settings), sehingga
    // layout dashboard tidak perlu round-trip ke database di setiap render.
    const isMaintenance = (await getSettingValue("MAINTENANCE_MODE")) === "true";

    if (isMaintenance) {
      const session = await getSession();
      const isPanitia = [
        "admin",
        "pengurus_daerah",
        "kmm_daerah",
        "tim_pnkb",
        "admin_romantic_room",
        "admin_keuangan",
        "admin_kegiatan"
      ].includes(session?.role || "");

      if (!isPanitia) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Error checking maintenance mode:", error);
    return false;
  }
}
