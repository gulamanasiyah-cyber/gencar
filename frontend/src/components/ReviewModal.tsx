import { useState } from "react";
import AdminModal from "./admin/Modal";

export default function ReviewModal({
  itemName,
  action,
  onClose,
  onConfirm,
}: {
  itemName: string;
  action: "approve" | "reject";
  onClose: () => void;
  onConfirm: (catatan?: string) => Promise<void> | void;
}) {
  const [catatan, setCatatan] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isApprove = action === "approve";

  async function handleConfirm() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      await onConfirm(catatan || undefined);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal
      title={isApprove ? `Approve "${itemName}"?` : `Reject "${itemName}"?`}
      onClose={onClose}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            background: isApprove ? "#ecfdf5" : "#fef2f2",
            border: isApprove ? "1px solid #a7f3d0" : "1px solid #fecaca",
            color: isApprove ? "#065f46" : "#991b1b",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {isApprove
            ? `Konten "${itemName}" akan dipublikasikan dan tampil di web.`
            : `Konten "${itemName}" akan ditolak dan tidak tampil di web.`}
        </div>

        <div className="field">
          <label>Catatan (opsional)</label>
          <textarea
            rows={3}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder={isApprove ? "Catatan untuk penulis..." : "Alasan penolakan..."}
            style={{ resize: "vertical" }}
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
            }}
          >
            {err}
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
            className={isApprove ? "btn btn-primary" : "btn btn-danger"}
            style={{ flex: 1 }}
            disabled={busy}
            onClick={() => void handleConfirm()}
          >
            {busy
              ? isApprove
                ? "Approving..."
                : "Rejecting..."
              : isApprove
                ? "Approve & Publish"
                : "Reject"}
          </button>
        </div>
      </div>
    </AdminModal>
  );
}
