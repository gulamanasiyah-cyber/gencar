import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import './routes/public/public.css'
import App from './App.tsx'
import PublicLayout from './routes/public/PublicLayout.tsx'
import PublicHome from './routes/public/PublicHome.tsx'
import { PublicKegiatanList, PublicKegiatanDetail } from './routes/public/PublicKegiatan.tsx'
import { PublicArtikelList, PublicArtikelDetail, PublicBeritaList, PublicBeritaDetail } from './routes/public/PublicArtikel.tsx'
import { PublicPengurus, PublicTentang } from './routes/public/PublicStatic.tsx'

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <PublicHome /> },
      { path: '/kegiatan', element: <PublicKegiatanList /> },
      { path: '/kegiatan/:slug', element: <PublicKegiatanDetail /> },
      { path: '/artikel', element: <PublicArtikelList /> },
      { path: '/artikel/:slug', element: <PublicArtikelDetail /> },
      { path: '/berita', element: <PublicBeritaList /> },
      { path: '/berita/:slug', element: <PublicBeritaDetail /> },
      { path: '/pengurus', element: <PublicPengurus /> },
      { path: '/tentang', element: <PublicTentang /> },
    ],
  },
  { path: '/admin/*', element: <App initialMode="admin" /> },
  { path: '/member/*', element: <App initialMode="member" /> },
  // fallback: /admin or /member without trailing slash handled by App; keep / direct mount for backward compat in dev
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
