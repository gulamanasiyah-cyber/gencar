import React, { useRef, useState } from "react";
import { Image as IcoImage, Loader2, Upload, X } from "lucide-react";
import { uploadImageDirect } from "../../lib/storage";

export default function ImageUploadInput({
  label = "Foto / Cover Image",
  value,
  onChange,
  placeholder = "Pilih file gambar atau masukkan URL...",
  helperText,
}: {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  helperText?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Hanya file gambar (JPG, PNG, WebP) yang diperbolehkan.");
      return;
    }
    setUploading(true);
    try {
      const result = await uploadImageDirect(file);
      onChange(result.viewUrl);
    } catch {
      // Fallback base64 data URL if R2/backend upload fails in local environment
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onChange(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileUpload(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileUpload(f);
  };

  return (
    <div className="field">
      {label && <label>{label}</label>}

      {/* Input File & Drag-Drop Trigger */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        accept="image/*"
        style={{ display: "none" }}
      />

      <div
        className={`cms-image-upload-box ${dragOver ? "is-dragover" : ""} ${value ? "has-image" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        {uploading ? (
          <div className="cms-upload-loading">
            <Loader2 size={24} className="cms-spin" />
            <span>Mengunggah gambar...</span>
          </div>
        ) : value ? (
          <div className="cms-upload-preview-wrap">
            <img
              src={value}
              alt="Preview foto"
              className="cms-upload-preview-img"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
            <div className="cms-upload-overlay" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => fileInputRef.current?.click()}
                title="Ganti file foto"
              >
                <Upload size={13} /> Ganti File
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => onChange("")}
                title="Hapus foto"
              >
                <X size={13} /> Hapus
              </button>
            </div>
          </div>
        ) : (
          <div className="cms-upload-empty">
            <div className="cms-upload-icon-wrap">
              <Upload size={18} />
            </div>
            <div className="cms-upload-text">
              <strong>Klik untuk pilih file foto</strong> atau seret gambar ke sini
            </div>
            <span className="muted" style={{ fontSize: 11 }}>JPG, PNG, WebP (Maks 5MB)</span>
          </div>
        )}
      </div>

      {/* URL Alternate Text Input */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
        <IcoImage size={13} className="muted" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ fontSize: 11, padding: "6px 10px", borderRadius: 8 }}
        />
      </div>
      {helperText && <span className="muted" style={{ fontSize: 11 }}>{helperText}</span>}
    </div>
  );
}
