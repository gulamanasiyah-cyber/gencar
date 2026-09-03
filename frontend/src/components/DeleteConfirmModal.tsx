import { useState } from "react";
import AdminModal from "./admin/Modal";

export default function DeleteConfirmModal({
  title,
  itemName,
  description,
  onClose,
  onConfirm,
}: {
  title?: string;
  itemName: string;
  description?: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const confirmText = `Hapus ${itemName}`;
  const isMatch = typed.trim().toLowerCase() === confirmText.toLowerCase();

  async function handleConfirm() {
    if (!isMatch || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await onConfirm();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal title={title || `Hapus ${itemName}?`} onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            background: "#fffbeb",
            border: "1px solid #fde68a",
            color: "#78350f",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {description || (
            <>
              <strong>{itemName}</strong> akan dihapus permanen dari sistem.
            </>
          )}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          Ketik{" "}
          <strong
            style={{
              fontFamily: "monospace",
              background: "#f1f5f9",
              padding: "2px 6px",
              borderRadius: 6,
            }}
          >
            {confirmText}
          </strong>{" "}
          untuk melanjutkan.
        </div>
        <div className="field">
          <label>Konfirmasi *</label>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmText}
            disabled={busy}
            autoComplete="off"
            autoFocus
          />
        </div>
        {err && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#991b1b",
              fontSize: 13,
              display: "flex",
              gap: 8,
            }}
          >
            <span style={{ flex: 1, wordBreak: "break-word" }}>{err}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setErr(null)}
            >
              Tutup
            </button>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ flex: 1 }}
            disabled={busy}
            onClick={onClose}
          >
            Batal
          </button>
          <button
            type="button"
            className="btn btn-danger"
            style={{ flex: 1 }}
            disabled={!isMatch || busy}
            onClick={() => void handleConfirm()}
          >
            {busy ? "Menghapus…" : "Hapus Permanen"}
          </button>
        </div>
      </div>
    </AdminModal>
  );
}
