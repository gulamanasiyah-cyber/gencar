import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link,
  Code,
  Undo,
  Redo,
  RemoveFormatting,
} from "lucide-react";

export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Tulis artikel lengkap di sini...",
  minHeight = 220,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});

  // Sync value into contentEditable without breaking cursor position
  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      // Only update if external value differs significantly
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value]);

  const updateFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
    });
  };

  const exec = (command: string, val: string | undefined = undefined) => {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    updateFormats();
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const setBlock = (tag: string) => {
    exec("formatBlock", `<${tag}>`);
  };

  const addLink = () => {
    const url = prompt("Masukkan URL Link (contoh: https://...):");
    if (url) {
      exec("createLink", url);
    }
  };

  const onInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
      updateFormats();
    }
  };

  return (
    <div className="cms-rich-editor">
      {/* TOOLBAR */}
      <div className="cms-rich-toolbar" role="toolbar" aria-label="Format Teks">
        <div className="cms-rich-btn-group">
          <button
            type="button"
            className={`cms-rich-btn ${activeFormats.bold ? "active" : ""}`}
            onClick={() => exec("bold")}
            title="Tebal (Ctrl+B)"
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            className={`cms-rich-btn ${activeFormats.italic ? "active" : ""}`}
            onClick={() => exec("italic")}
            title="Miring (Ctrl+I)"
          >
            <Italic size={14} />
          </button>
          <button
            type="button"
            className={`cms-rich-btn ${activeFormats.underline ? "active" : ""}`}
            onClick={() => exec("underline")}
            title="Garis Bawah (Ctrl+U)"
          >
            <Underline size={14} />
          </button>
          <button
            type="button"
            className={`cms-rich-btn ${activeFormats.strikeThrough ? "active" : ""}`}
            onClick={() => exec("strikeThrough")}
            title="Coret"
          >
            <Strikethrough size={14} />
          </button>
        </div>

        <div className="cms-rich-divider" />

        <div className="cms-rich-btn-group">
          <button
            type="button"
            className="cms-rich-btn"
            onClick={() => setBlock("h2")}
            title="Judul Besar (Heading 2)"
          >
            <Heading1 size={14} />
          </button>
          <button
            type="button"
            className="cms-rich-btn"
            onClick={() => setBlock("h3")}
            title="Subjudul (Heading 3)"
          >
            <Heading2 size={14} />
          </button>
          <button
            type="button"
            className="cms-rich-btn"
            onClick={() => setBlock("p")}
            title="Paragraf Normal"
          >
            <Heading3 size={14} />
          </button>
        </div>

        <div className="cms-rich-divider" />

        <div className="cms-rich-btn-group">
          <button
            type="button"
            className={`cms-rich-btn ${activeFormats.insertUnorderedList ? "active" : ""}`}
            onClick={() => exec("insertUnorderedList")}
            title="Daftar Poin (Bullet List)"
          >
            <List size={14} />
          </button>
          <button
            type="button"
            className={`cms-rich-btn ${activeFormats.insertOrderedList ? "active" : ""}`}
            onClick={() => exec("insertOrderedList")}
            title="Daftar Angka (Numbered List)"
          >
            <ListOrdered size={14} />
          </button>
          <button
            type="button"
            className="cms-rich-btn"
            onClick={() => setBlock("blockquote")}
            title="Kutipan (Blockquote)"
          >
            <Quote size={14} />
          </button>
          <button
            type="button"
            className="cms-rich-btn"
            onClick={() => setBlock("pre")}
            title="Blok Kode / Monospace"
          >
            <Code size={14} />
          </button>
        </div>

        <div className="cms-rich-divider" />

        <div className="cms-rich-btn-group">
          <button type="button" className="cms-rich-btn" onClick={addLink} title="Tambah Link">
            <Link size={14} />
          </button>
          <button
            type="button"
            className="cms-rich-btn"
            onClick={() => exec("removeFormat")}
            title="Hapus Format"
          >
            <RemoveFormatting size={14} />
          </button>
        </div>

        <div className="cms-rich-divider" />

        <div className="cms-rich-btn-group" style={{ marginLeft: "auto" }}>
          <button type="button" className="cms-rich-btn" onClick={() => exec("undo")} title="Undo (Ctrl+Z)">
            <Undo size={14} />
          </button>
          <button type="button" className="cms-rich-btn" onClick={() => exec("redo")} title="Redo (Ctrl+Y)">
            <Redo size={14} />
          </button>
        </div>
      </div>

      {/* EDITABLE CONTENT STAGE */}
      <div
        ref={editorRef}
        className="cms-rich-content pub-prose"
        contentEditable
        onInput={onInput}
        onKeyUp={updateFormats}
        onMouseUp={updateFormats}
        data-placeholder={placeholder}
        style={{ minHeight }}
      />
    </div>
  );
}
