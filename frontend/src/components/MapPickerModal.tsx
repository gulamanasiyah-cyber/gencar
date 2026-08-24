import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search as IcoSearch, X as IcoX, MapPin, Crosshair, Loader2 } from "lucide-react";

// Fix default marker icons for Vite bundling
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
// @ts-ignore - leaflet type for _getIconUrl is missing
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

export default function MapPickerModal({
  open,
  initialLat,
  initialLng,
  radiusM,
  onClose,
  onPick,
}: {
  open: boolean;
  initialLat: number | null;
  initialLng: number | null;
  radiusM: number;
  onClose: () => void;
  onPick: (lat: number, lng: number, label?: string) => void;
}) {
  const DEFAULT = { lat: -6.137, lng: 106.7 }; // Cengkareng
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [label, setLabel] = useState("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [revLabel, setRevLabel] = useState("");

  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // init picked from initial when opened
  useEffect(() => {
    if (!open) return;
    if (initialLat != null && initialLng != null) {
      setPicked({ lat: initialLat, lng: initialLng });
    } else {
      setPicked(null);
    }
    setQ("");
    setResults([]);
    setRevLabel("");
    setLabel("");
  }, [open, initialLat, initialLng]);

  // debounce search
  useEffect(() => {
    if (!open) return;
    const query = q.trim();
    if (query.length < 3) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=id&addressdetails=0`;
        const r = await fetch(url, { headers: { Accept: "application/json" } });
        if (!r.ok) throw new Error(String(r.status));
        const data: NominatimResult[] = await r.json();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [q, open]);

  // reverse geocode when picked changes
  useEffect(() => {
    if (!picked) {
      setRevLabel("");
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${picked.lat}&lon=${picked.lng}&zoom=17&addressdetails=1`;
        const r = await fetch(url, { headers: { Accept: "application/json" } });
        if (!r.ok) return;
        const data: any = await r.json();
        if (!cancelled && data?.display_name) setRevLabel(data.display_name);
      } catch {
        /* ignore */
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [picked]);

  // init leaflet map
  useEffect(() => {
    if (!open) return;
    if (!containerRef.current) return;
    // delay to let modal render
    const t = setTimeout(() => {
      if (!containerRef.current) return;
      if (mapRef.current) {
        mapRef.current.invalidateSize();
        return;
      }
      const center: [number, number] = picked ? [picked.lat, picked.lng] : [DEFAULT.lat, DEFAULT.lng];
      const map = L.map(containerRef.current, { zoomControl: true }).setView(center, picked ? 15 : 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      map.on("click", (e: L.LeafletMouseEvent) => {
        setPicked({ lat: e.latlng.lat, lng: e.latlng.lng });
        setResults([]);
      });
      mapRef.current = map;
      // force resize after mount
      setTimeout(() => map.invalidateSize(), 120);
    }, 60);
    return () => {
      clearTimeout(t);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // sync marker/circle with picked
  useEffect(() => {
    if (!mapRef.current) return;
    if (!picked) return;
    const latlng: L.LatLngExpression = [picked.lat, picked.lng];
    if (!markerRef.current) {
      const m = L.marker(latlng, { draggable: true }).addTo(mapRef.current);
      m.on("dragend", () => {
        const ll = m.getLatLng();
        setPicked({ lat: ll.lat, lng: ll.lng });
      });
      markerRef.current = m;
      circleRef.current = L.circle(latlng, {
        radius: radiusM,
        color: "#c5f54c",
        fillColor: "#c5f54c",
        fillOpacity: 0.18,
        weight: 2,
      }).addTo(mapRef.current);
    } else {
      markerRef.current.setLatLng(latlng);
      circleRef.current?.setLatLng(latlng);
      circleRef.current?.setRadius(radiusM);
    }
    mapRef.current.setView(latlng, mapRef.current.getZoom() < 14 ? 15 : mapRef.current.getZoom());
  }, [picked, radiusM]);

  // after map exists and picked null, keep default view
  useEffect(() => {
    if (!open || !mapRef.current || picked) return;
    mapRef.current.setView([DEFAULT.lat, DEFAULT.lng], 13);
  }, [open, picked]);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPicked({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  if (!open) return null;

  const canConfirm = picked != null;

  return (
    <div className="modal-backdrop modal-backdrop--map" onClick={onClose}>
      <div className="modal modal--map" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="kpi-icon kpi-icon--emerald" style={{ width: 36, height: 36 }}><MapPin size={16} /></span>
            <div>
              <strong className="modal-title" style={{ fontSize: 15 }}>Pilih Lokasi di Peta</strong>
              <div className="muted" style={{ fontSize: 11 }}>Cari alamat atau tap/geser pin — radius {radiusM}m</div>
            </div>
          </div>
          <button className="btn-close" aria-label="Tutup" onClick={onClose}><IcoX size={16} /></button>
        </div>

        <div className="map-picker-search">
          <div className="map-picker-search-input">
            <IcoSearch size={14} />
            <input
              autoFocus
              placeholder="Cari tempat — mis. Masjid Fajar, Aula Cengkareng..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {searching && <Loader2 size={14} className="map-picker-spin" />}
            {q && !searching && (
              <button className="map-picker-clear" aria-label="Hapus" onClick={() => { setQ(""); setResults([]); }}>
                <IcoX size={12} />
              </button>
            )}
          </div>
          {results.length > 0 && (
            <div className="map-picker-results">
              {results.map((r) => (
                <button
                  key={r.place_id}
                  type="button"
                  className="map-picker-result"
                  onClick={() => {
                    const lat = parseFloat(r.lat);
                    const lon = parseFloat(r.lon);
                    setPicked({ lat, lng: lon });
                    setLabel(r.display_name);
                    setRevLabel(r.display_name);
                    setResults([]);
                    setQ(r.display_name);
                  }}
                >
                  <MapPin size={12} />
                  <span>{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div ref={containerRef} className="map-picker-map" />

        <div className="map-picker-meta">
          <div className="map-picker-coords">
            <span className="detail-label"><MapPin size={10} /> Koordinat</span>
            <span className="map-picker-coords-val">
              {picked ? `${picked.lat.toFixed(6)}, ${picked.lng.toFixed(6)}` : "Belum dipilih — tap peta atau geser pin"}
            </span>
          </div>
          {(revLabel || label) && (
            <div className="map-picker-address" title={revLabel || label}>{revLabel || label}</div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={useMyLocation} disabled={locating}>
            <Crosshair size={14} /> {locating ? "Mencari..." : "Lokasi saya"}
          </button>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Batal</button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={!canConfirm}
            onClick={() => {
              if (!picked) return;
              onPick(picked.lat, picked.lng, revLabel || label || q || undefined);
              onClose();
            }}
          >
            Set Lokasi
          </button>
        </div>
        <div className="muted" style={{ fontSize: 11, textAlign: "center" }}>
          Data peta © OpenStreetMap • Pencarian via Nominatim
        </div>
      </div>
    </div>
  );
}
