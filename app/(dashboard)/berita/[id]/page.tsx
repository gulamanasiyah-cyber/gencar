import { db } from "@/lib/db";
import { artikel, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import PublishButton from "./PublishButton";
import Topbar from "@/components/Topbar";

export default async function ArtikelDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getSession();

  const data = await db.query.artikel.findFirst({ where: eq(artikel.id, id) });
  if (!data) notFound();

  if (data.status !== "published") {
    if (!session || (session.userId !== data.authorId && !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role))) {
      notFound();
    }
  }

  const author = await db.query.users.findFirst({ where: eq(users.id, data.authorId) });

  return (
    <div>
      <Topbar title={data.tipe === "berita" ? "Berita" : "Artikel"} role={session?.role} />
      <div className="page-content">
        <div style={{ maxWidth: 760 }}>
          <div className="flex items-center gap-2 mb-6" style={{ marginBottom: 20 }}>
            <Link href="/berita" className="btn btn-secondary btn-sm">← Kembali</Link>
            <span className={`badge ${data.status === "published" ? "badge-green" : data.status === "pending" ? "badge-orange" : "badge-red"}`}>
              {data.status}
            </span>
          </div>

          <div className="card">
            <div className="card-body">
              {data.status === "pending" && ["admin", "pengurus_daerah", "kmm_daerah"].includes(session?.role || "") && (
                <div className="alert alert-info" style={{ marginBottom: 20 }}>
                  <div className="flex items-center justify-between w-full">
                    <span>{data.tipe === "berita" ? "Berita" : "Artikel"} ini menunggu persetujuan admin</span>
                    <PublishButton id={id} tipe={data.tipe} />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 mb-4">
                <h1 style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.3 }}>{data.judul}</h1>
                {(session?.userId === data.authorId || ["admin", "pengurus_daerah", "kmm_daerah"].includes(session?.role || "")) && (
                  <Link href={`/berita/${id}/edit`} className="btn btn-sm btn-secondary">✏️ Edit Berita</Link>
                )}
              </div>

              {data.coverImage && (
                <div style={{ marginBottom: 20, borderRadius: 8, overflow: 'hidden' }}>
                  <img src={data.coverImage} alt={data.judul} style={{ width: '100%', height: 'auto', maxHeight: 400, objectFit: 'cover' }} />
                </div>
              )}

              <div className="flex items-center gap-3" style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>
                  {author?.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{author?.name || "Anonim"}</div>
                  <div className="text-sm text-muted">
                    {data.publishedAt
                      ? new Date(data.publishedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                      : new Date(data.createdAt || "").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                </div>
              </div>

              {data.ringkasan && (
                <div style={{ padding: "12px 16px", background: "var(--bg)", borderRadius: 8, marginBottom: 20, borderLeft: "3px solid var(--primary)", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
                  {data.ringkasan}
                </div>
              )}

              <div style={{ lineHeight: 1.8, fontSize: 15, color: "var(--text)", whiteSpace: "pre-wrap" }}>
                {data.konten}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
