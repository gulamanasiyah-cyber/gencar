import { Search as IcoSearch } from "lucide-react";

export default function SearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ariaLabel?: string;
}) {
  return (
    <label className="search">
      <IcoSearch size={14} aria-hidden />
      <input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel ?? placeholder} />
    </label>
  );
}
