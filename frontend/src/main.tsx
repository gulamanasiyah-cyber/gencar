import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './index.css'
import './routes/public/public.css'
import App from './App.tsx'
import PublicLayout from './routes/public/PublicLayout.tsx'
import PublicHome from './routes/public/PublicHome.tsx'
import { PublicKegiatanList, PublicKegiatanDetail } from './routes/public/PublicKegiatan.tsx'
import { PublicArtikelList, PublicArtikelDetail, PublicBeritaList, PublicBeritaDetail } from './routes/public/PublicArtikel.tsx'
import { PublicPengurus, PublicTentang } from './routes/public/PublicStatic.tsx'
import { PublicGaleri } from './routes/public/PublicGaleri.tsx'
import LoginPage from './routes/auth/LoginPage.tsx'
import AktivasiPage from './routes/auth/AktivasiPage.tsx'
import { AuthProvider } from './lib/auth.tsx'
import { RequireAuth } from './lib/RequireAuth.tsx'

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <PublicHome /> },
      { path: '/kegiatan', element: <PublicKegiatanList /> },
      { path: '/kegiatan/:slug', element: <PublicKegiatanDetail /> },
      { path: '/galeri', element: <PublicGaleri /> },
      { path: '/artikel', element: <PublicArtikelList /> },
      { path: '/artikel/:slug', element: <PublicArtikelDetail /> },
      { path: '/berita', element: <PublicBeritaList /> },
      { path: '/berita/:slug', element: <PublicBeritaDetail /> },
      { path: '/pengurus', element: <PublicPengurus /> },
      { path: '/tentang', element: <PublicTentang /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/aktivasi', element: <AktivasiPage /> },
  { path: '/admin', element: <RequireAuth allow="admin"><App initialMode="admin" /></RequireAuth> },
  { path: '/member', element: <RequireAuth allow="member"><App initialMode="member" /></RequireAuth> },
  { path: '/admin/*', element: <RequireAuth allow="admin"><App initialMode="admin" /></RequireAuth> },
  { path: '/member/*', element: <RequireAuth allow="member"><App initialMode="member" /></RequireAuth> },
  { path: '*', element: <Navigate to="/" replace /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
