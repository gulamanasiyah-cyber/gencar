import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import type { MemberIdentity, MemberKehadiran } from "./types";

export default function MemberStatPage({ me, stat }: { me: MemberIdentity; stat: MemberKehadiran }) {
  const pie = [
    { name: "Hadir", value: stat.hadir, fill: "#16a34a" },
    { name: "Izin", value: stat.izin, fill: "#f59e0b" },
    { name: "Alpha", value: stat.alpha, fill: "#ef4444" },
  ];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 800 }}>Statistik Kehadiran — {me.nama}</h3>
        <p className="muted" style={{ fontSize: 12 }}>Personal · {me.kelompok} · {me.desa}</p>
        <div className="kpi" style={{ marginTop: 12, gridTemplateColumns: "repeat(4, minmax(0,1fr))" as any }}>
          <div className="kpi-card">
            <div className="muted" style={{ fontSize: 11 }}>Hadir Rate</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{stat.hadirRate}%</div>
          </div>
          <div className="kpi-card">
            <div className="muted" style={{ fontSize: 11 }}>Hadir</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{stat.hadir}</div>
          </div>
          <div className="kpi-card">
            <div className="muted" style={{ fontSize: 11 }}>Izin</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{stat.izin}</div>
          </div>
          <div className="kpi-card">
            <div className="muted" style={{ fontSize: 11 }}>Alpha</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{stat.alpha}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ minWidth: 0 }}>
        <h4 style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>Tren per Bulan</h4>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stat.tren}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Area type="linear" dataKey="hadir" stroke="#16a34a" fill="#16a34a" fillOpacity={0.15} dot />
              <Area type="linear" dataKey="izin" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.12} dot />
              <Area type="linear" dataKey="alpha" stroke="#ef4444" fill="#ef4444" fillOpacity={0.10} dot />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ minWidth: 0 }}>
        <h4 style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>Komposisi</h4>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} label>
                {pie.map((e) => (
                  <Cell key={e.name} fill={e.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p className="muted" style={{ fontSize: 11, textAlign: "center" }}>Total {stat.total} kegiatan tercatat</p>
      </div>
    </div>
  );
}
