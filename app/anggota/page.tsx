export const runtime = "edge";
import { db } from "@/lib/db";
import { users, generus, desa, kelompok } from "@/lib/schema";
import { eq, desc, inArray } from "drizzle-orm";
import Link from "next/link";
import HomeHeader from "@/components/HomeHeader";
import HomeNav from "@/components/HomeNav";
import { getSession } from "@/lib/auth";

async function getAllMembers() {
  try {
    return await db
      .select({
        id: users.id,
        name: users.name,
        role: users.role,
        foto: generus.foto,
        desaNama: desa.nama,
        kelompokNama: kelompok.nama,
      })
      .from(users)
      .leftJoin(generus, eq(users.generusId, generus.id))
      .leftJoin(desa, eq(users.desaId, desa.id))
      .leftJoin(kelompok, eq(users.kelompokId, kelompok.id))
      .where(inArray(users.role, ["admin", "desa", "kelompok", "creator", "generus"]))
      .orderBy(desc(users.createdAt));
  } catch (error) {
    console.error("Error fetching members:", error);
    return [];
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(n => n.length > 0)
    .map(n => n[0].toUpperCase())
    .slice(0, 2)
    .join('');
}

export default async function MembersPage() {
  const session = await getSession();
  const allMembers = await getAllMembers();

  return (
    <>
      <style>{`
        body { background: #fdfdfd; font-family: 'Inter', sans-serif; color: #1e293b; }
        .wrap { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .page-header { background: linear-gradient(135deg, #0f172a, #1e293b); padding: 80px 0; border-bottom: 4px solid #2563eb; color: #fff; text-align: center; }
        .page-title { font-family: 'Merriweather', serif; font-size: 48px; font-weight: 900; color: #fff; margin-bottom: 16px; letter-spacing: -0.02em; }
        .page-subtitle { font-size: 18px; color: rgba(255,255,255,0.7); max-width: 700px; margin: 0 auto; line-height: 1.6; font-weight: 400; }
        
        .members-sec { padding: 80px 0; }
        .members-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 32px; }
        .member-card { 
          background: #fff; border-radius: 24px; padding: 32px; text-align: center; 
          border: 1px solid #f1f5f9; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          position: relative;
          display: flex; flex-direction: column; height: 100%;
        }
        .member-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.1); border-color: #2563eb; }
        
        .member-avatar { 
          width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, #f1f5f9, #e2e8f0); 
          margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;
          font-size: 36px; font-weight: 900; color: #94a3b8; border: 4px solid #fff; box-shadow: 0 10px 20px -5px rgba(0,0,0,0.1);
          overflow: hidden; flex-shrink: 0;
        }
        .member-avatar img { width: 100%; height: 100%; object-fit: cover; }
        
        .member-name { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 8px; line-height: 1.3; }
        .member-role { 
          font-size: 11px; font-weight: 800; color: #2563eb; text-transform: uppercase; 
          letter-spacing: 1px; margin-bottom: 20px; background: #eff6ff; padding: 4px 12px; border-radius: 100px; width: fit-content; margin-left: auto; margin-right: auto;
        }
        .member-info { margin-top: auto; padding-top: 20px; border-top: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 4px; }
        .member-loc { font-size: 13px; font-weight: 600; color: #64748b; }
        .member-loc-val { color: #0f172a; font-weight: 700; }
        
        @media (max-width: 640px) {
          .members-grid { grid-template-columns: 1fr; }
          .page-title { font-size: 36px; }
        }
      `}</style>
      
      <HomeHeader session={session} />
      <HomeNav />
      
      <div className="page-header">
        <div className="wrap">
          <h1 className="page-title">Profil Anggota</h1>
          <p className="page-subtitle">Daftar pengurus dan anggota komunitas Jakarta Barat 2 yang berkontribusi dalam membangun kemajuan bersama.</p>
        </div>
      </div>

      <div className="members-sec">
        <div className="wrap">
          {allMembers.length > 0 ? (
            <div className="members-grid">
              {allMembers.map((m) => (
                <div key={m.id} className="member-card">
                  <div className="member-avatar">
                    {m.foto ? (
                      <img src={m.foto} alt={m.name} />
                    ) : (
                      getInitials(m.name) || "?"
                    )}
                  </div>
                  <div className="member-name">{m.name}</div>
                  <div className="member-role">
                    {m.role === 'admin' && 'Administrator'}
                    {m.role === 'desa' && 'Pengurus Desa'}
                    {m.role === 'kelompok' && 'Pengurus Kelompok'}
                    {m.role === 'creator' && 'Kontributor'}
                    {m.role === 'generus' && 'Generasi Penerus'}
                    {(m.role === 'pending' || !m.role) && 'Member'}
                  </div>
                  
                  <div className="member-info">
                    <div className="member-loc">
                      Desa: <span className="member-loc-val">{m.desaNama || "Umum"}</span>
                    </div>
                    {m.kelompokNama && (
                      <div className="member-loc">
                        Kelompok: <span className="member-loc-val">{m.kelompokNama}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 0', opacity: 0.5 }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>👥</div>
              <p style={{ fontSize: 20, fontWeight: 700 }}>Belum ada data anggota yang tersedia.</p>
            </div>
          )}
        </div>
      </div>

      <footer style={{ background: '#0f172a', padding: '60px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
        <div className="wrap">
          <div style={{ fontWeight: 800, color: '#fff', fontSize: 20, marginBottom: 24 }}>JB2.ID</div>
          <p>© 2026 Jakarta Barat 2 — Semua profil verified oleh sistem.</p>
        </div>
      </footer>
    </>
  );
}
