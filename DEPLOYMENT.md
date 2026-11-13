# 🚀 Gencar — Panduan Running & Deployment

> **Stack**: Next.js 14 · Turso (libSQL) · Docker · Nginx · Ubuntu 24.04 LTS
>
> **Port**: `127.0.0.1:3102` (Next.js container, hanya loopback) · `80/443` (nginx di server)

---

## 📋 Daftar Isi

1. [Prasyarat](#-prasyarat)
2. [Running di Local (Development)](#-running-di-local-development)
3. [Running di Local dengan Docker](#-running-di-local-dengan-docker)
4. [Deployment ke Server (Ubuntu 24)](#-deployment-ke-server-ubuntu-24)
5. [Otomasi CI/CD (GitHub Actions + GHCR)](#-otomasi-cicd-github-actions--ghcr)
6. [Model 2 User (sysadmin & deploy)](#-model-2-user-sysadmin--deploy)
7. [Auto-Restart Saat Server Reboot](#-auto-restart-saat-server-reboot)
8. [Struktur Direktori Server](#-struktur-direktori-server)
9. [Konfigurasi Environment](#-konfigurasi-environment)
10. [SSL / HTTPS](#-ssl--https)
11. [Maintenance & Operasional](#-maintenance--operasional)
12. [Troubleshooting](#-troubleshooting)

---

## 🔧 Prasyarat

### Local Development

| Software       | Versi Minimum | Cek Versi                |
|----------------|---------------|--------------------------|
| Node.js        | 20.x          | `node -v`                |
| npm            | 10.x          | `npm -v`                 |
| Docker         | 24.x          | `docker --version`       |
| Docker Compose | v2            | `docker compose version` |
| Git            | 2.x           | `git --version`          |

### Server (Ubuntu 24.04)

- VPS / Dedicated Server dengan Ubuntu 24.04 LTS
- Minimal 1 GB RAM, 1 vCPU
- Domain yang sudah di-pointing ke IP server
- Akses SSH (root atau sudo)

---

## 💻 Running di Local (Development)

### 1. Clone Repository

```bash
git clone git@github.com:gulamanasiyah-cyber/gencar.git
cd gencar
```

### 2. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 3. Setup Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` dan isi value yang diperlukan:

```env
# Turso Database
TURSO_DATABASE_URL=libsql://YOUR_DB.turso.io
TURSO_AUTH_TOKEN=your_token_here

# JWT Secret (generate: openssl rand -base64 64)
JWT_SECRET=your_random_secret_min_64_chars

# App URL (local)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cloudinary Config
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Pusher Config
PUSHER_APP_ID=your_app_id
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
NEXT_PUBLIC_PUSHER_CLUSTER=ap1
```

### 4. Push Database Schema (Pertama Kali)

```bash
npm run db:push
```

### 5. Seed Data (Opsional)

```bash
npm run seed
```

### 6. Jalankan Development Server

```bash
npm run dev
```

Aplikasi berjalan di **http://localhost:3000**

> **Tips:** Jika ingin reset cache Next.js: `npm run dev:reset`

---

## 🐳 Running di Local dengan Docker

### 1. Setup Environment

```bash
cp .env.example .env.local
# Edit .env.local sesuai kebutuhan
```

### 2. Build & Run

```bash
docker build -t gencar:terbaru .
docker run -d --name gencar-app --env-file .env.local -p 127.0.0.1:3102:3102 gencar:terbaru
```

Aplikasi berjalan di **http://localhost:3102**

### 3. Stop

```bash
docker stop gencar-app && docker rm gencar-app
```

---

## 🌐 Deployment ke Server (Ubuntu 24)

### Arsitektur

```
                    Internet
                       │
                       ▼
              ┌────────────────┐
              │   UFW Firewall │
              │  22, 80, 443   │
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │  Nginx (host)  │
              │ :80 → redirect │
              │ :443 → :3102   │
              └───────┬────────┘
                      │ (proxy_pass 127.0.0.1:3102)
              ┌───────▼────────┐
              │  Docker        │
              │  Next.js App   │
              │  127.0.0.1:3102│
              └────────────────┘
                      │
              ┌───────▼────────┐
              │  Turso (Cloud) │
              │  libSQL DB     │
              └────────────────┘
```

> **Hemat CPU**: Tidak ada nginx di dalam Docker. Nginx jalan langsung di server (host),
> Next.js di-build sebagai `standalone` (tanpa `node_modules` lengkap, tanpa `npm`),
> dan container dibatasi CPU/memory.

### Step 1: Sekali Running Jalan Semua (All-in-One Deploy)

Skrip `deploy.sh` sudah dirancang cerdas mendeteksi user (`sysadmin` atau `deploy`):

* **Jika dijalankan sebagai `sysadmin` (atau dengan sudo):**
  Skrip otomatis memastikan permission direktori `/srv/apps/gencar` dan `/srv/data/gencar` milik `deploy`, mengecek file `.env`, lalu **langsung mengalihkan eksekusi build & docker ke user `deploy` secara aman** tanpa Anda perlu login ulang manual!

* **Jika dijalankan sebagai `deploy`:**
  Skrip langsung menjalankan proses deployment (git pull, build image, swap container, health check).

```bash
# Jalankan dari folder gencar:
bash deploy.sh

# Atau jika baru pertama kali setup server baru:
sudo bash deploy.sh --setup --domain gencar.pintarsolusi.com
```

### Step 2: Konfigurasi Database (Turso / libSQL)

> **💡 FAQ Database:** Mengapa web app ini memakai `libSQL` sedangkan server memakai `MySQL`?
>
> 1. **Tidak Bentrok:** Gencar menggunakan database cloud **Turso (libSQL)** via internet. Aplikasi Gencar **TIDAK menggunakan MySQL lokal**, sehingga MySQL yang ada di server Anda tetap aman dan berjalan untuk aplikasi lain (seperti `satudata`).
> 2. **Sangat Hemat CPU:** Karena database di-host di Cloud Turso, beban query, indexing, dan memory DB **0% di server VPS Anda**.
> 3. Cukup masukkan token Turso Anda ke `/srv/data/gencar/.env`:
>    ```env
>    TURSO_DATABASE_URL=libsql://YOUR_DB_NAME.aws-ap-northeast-1.turso.io
>    TURSO_AUTH_TOKEN=your_token_here
>    ```
>    *(Jika ingin database offline/file lokal tanpa Turso cloud, bisa diset: `TURSO_DATABASE_URL=file:/srv/data/gencar/gencar.db`)*

### Step 3: Deploy Selanjutnya

Cukup jalankan satu perintah:

```bash
bash deploy.sh
```

Script akan otomatis:
1. `git pull --ff-only`
2. Cek apakah image pre-built tersedia di GitHub Container Registry (GHCR via CI/CD):
   - Jika tersedia: image langsung diunduh via `docker pull` (**selesai dalam ~15 detik tanpa beban CPU server!**).
   - Jika belum ada / offline: script fallback otomatis mem-build image di server.
3. Ganti wadah lama → baru tanpa downtime
4. Cek health (`/api/health`); jika gagal dalam 90s, otomatis rollback!

> **Tips:** Jika ingin memaksa build di server (tanpa menarik dari registry), gunakan:
> ```bash
> bash deploy.sh --build-lokal
> ```

### Step 4: Rollback (Jika Diperlukan)

```bash
bash deploy.sh --kembali
```

### Operasional Sehari-hari

```bash
# Semua perintah docker compose — jalankan sebagai deploy:
bash deploy/dc.sh ps                     # keadaan wadah
bash deploy/dc.sh logs -f --tail 200     # catatan aplikasi
bash deploy/dc.sh restart                # menyalakan ulang container (TIDAK meng-update kode!)
bash deploy/dc.sh up -d --force-recreate # menerapkan perubahan .env
bash deploy/dc.sh exec app sh            # masuk ke dalam wadah
```

> ⚠️ **PENTING: Kapan menggunakan `restart` vs `deploy.sh`?**
> - **Update Kode / Fitur Baru:** Wajib jalankan `bash deploy.sh` (atau via GitHub Actions push). Perintah `dc.sh restart` **TIDAK AKAN** mengubah kode karena container menggunakan image ter-bundle.
> - **Update File `.env` Saja:** Jalankan `bash deploy/dc.sh up -d --force-recreate` (tidak perlu build ulang).
> - **Restart Proses Container:** Jalankan `bash deploy/dc.sh restart` jika app macet tanpa ada perubahan kode.

---

## 🤖 Otomasi CI/CD (GitHub Actions + GHCR)

Project ini dilengkapi pipeline CI/CD otomatis di `.github/workflows/deploy.yml` untuk memindahkan seluruh beban build (compile Next.js) dari server VPS ke cloud runner GitHub.

### 1. Bagaimana Cara Kerja Pipeline CI/CD

```mermaid
flowchart TD
    subgraph Local["💻 Developer Local"]
        A["git commit & git push<br/>(branch: main / ubuntu-deploy)"]
    end

    subgraph GitHub["☁️ GitHub Actions Runner (Cloud ~7 GB RAM)"]
        B["1. Trigger Workflow 'deploy.yml'"]
        C["2. Checkout & Setup Docker Buildx"]
        D["3. Docker Build Next.js (Multi-stage & Cache GHA)"]
        E["4. Push Docker Image ke GHCR<br/>ghcr.io/gulamanasiyah-cyber/gencar:tag"]
        F["5. SSH Action (appleboy/ssh-action) ke VPS"]
    end

    subgraph VPS["🖥️ Server VPS (Ubuntu 24.04)"]
        G["User 'deploy' via SSH menerima instruksi"]
        H["cd /srv/apps/gencar && bash deploy.sh"]
        I["Server git pull (update script) & docker pull image terbaru"]
        J["Graceful reload / swap container port 3102"]
        K["Auto Health Check (/api/health)"]
        L["Nginx me-route traffic publik (80/443) ke port 3102"]
    end

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    J --> K
    K --> L
```

#### Alur Eksekusi:
1. **Developer Push**: Kode di-push ke branch target (`main` atau `ubuntu-deploy`).
2. **Build di Cloud**: GitHub Actions runner melakukan build container. Next.js di-bundle di cloud sehingga RAM VPS Anda (misal 1-2 GB) tidak akan crash akibat kehabisan memori (*Out-of-Memory / OOM*) saat proses compile.
3. **Registry Penyimpanan**: Image disimpan di GitHub Container Registry (`ghcr.io`) dengan tag short commit hash, tag `terbaru`, dan `latest`.
4. **SSH Trigger**: Runner GitHub menghubungi VPS melalui user `deploy` menggunakan private key yang aman.
5. **Zero-Downtime Swap & Healthcheck**: VPS men-download image pre-built (hanya ~10-15 detik), mengganti container yang berjalan, lalu melakukan verifikasi apakah endpoint `/api/health` merespons `200 OK`. Jika gagal, otomatis rollback.

---

### 2. Apa Saja yang Perlu Disiapkan?

Untuk mengaktifkan CI/CD ini pertama kali, ikuti checklist berikut:

#### A. Persiapan di Server VPS
1. **User `deploy` dan Hak Akses**:
   User `deploy` harus menjadi anggota grup `docker` (tanpa perlu hak akses `sudo`):
   ```bash
   sudo usermod -aG docker deploy
   ```
2. **Setup SSH Key untuk User `deploy`**:
   Di komputer lokal (atau di VPS), buat SSH keypair khusus deploy jika belum ada:
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key
   ```
   - Masukkan isi `deploy_key.pub` ke file `/home/deploy/.ssh/authorized_keys` di VPS:
     ```bash
     mkdir -p /home/deploy/.ssh
     cat deploy_key.pub >> /home/deploy/.ssh/authorized_keys
     chmod 700 /home/deploy/.ssh
     chmod 600 /home/deploy/.ssh/authorized_keys
     chown -R deploy:deploy /home/deploy/.ssh
     ```
   - Simpan isi teks `deploy_key` (private key) untuk dimasukkan ke GitHub Secrets.
3. **Folder Proyek & Environment**:
   Pastikan folder repository sudah di-clone dan permission sesuai:
   ```bash
   sudo chown -R deploy:deploy /srv/apps/gencar /srv/data/gencar
   ```
   Pastikan `/srv/data/gencar/.env` sudah terisi variabel konfigurasi production (DB Turso, Secret, Cloudinary, Pusher, dsb).

#### B. Persiapan di Repository GitHub (GitHub Secrets)
Buka repo GitHub: **Settings > Secrets and variables > Actions > New repository secret**. Tambahkan:

| Secret Name | Deskripsi | Contoh Nilai |
|-------------|-----------|--------------|
| `SSH_HOST` | IP Publik VPS atau Hostname Domain server | `103.xxx.xxx.xxx` atau `vps.namadomain.com` |
| `SSH_PORT` | Port SSH server Anda (opsional, default: `22`) | `22` |
| `SSH_PRIVATE_KEY` | Isi teks lengkap dari SSH Private Key (`deploy_key`) | `-----BEGIN OPENSSH PRIVATE KEY----- ... -----END OPENSSH PRIVATE KEY-----` |

#### C. Pengaturan Visibility Image di GitHub Container Registry (GHCR)
Secara default, image pertama kali di-push oleh GitHub Actions bisa berstatus *Private*. Agar server VPS bisa langsung men-download tanpa konfigurasi autentikasi rumit:

##### Opsi 1: Ubah Package Menjadi Public (Sangat Disarankan ⭐)
> [!NOTE]
> Aman dijadikan Public karena file `.env` dan password database **tidak pernah dimasukkan** ke dalam Docker image. Konfigurasi rahasia dibaca runtime dari `/srv/data/gencar/.env` di host server.

1. Jalankan action pertama kali (atau buat commit kecil).
2. Setelah step *Build & Push* sukses, buka halaman utama repositori GitHub Anda.
3. Di panel sebelah kanan bawah, klik **Packages** $\rightarrow$ pilih **gencar**.
4. Klik tab **Package settings** $\rightarrow$ gulir ke paling bawah ke bagian **Danger Zone**.
5. Klik **Change package visibility** $\rightarrow$ pilih **Public** $\rightarrow$ Konfirmasi dengan mengetik nama package.
6. Selesai! Server VPS kini dapat menarik image kapan saja secara instan.

##### Opsi 2: Tetap Private (Gunakan Personal Access Token)
Jika ingin image tetap private:
1. Buat token di **GitHub > Settings > Developer Settings > Personal access tokens (classic)** dengan izin centang `read:packages`.
2. Login sekali di server VPS sebagai user `deploy`:
   ```bash
   echo "GITHUB_TOKEN_ANDA" | docker login ghcr.io -u "GITHUB_USERNAME" --password-stdin
   ```

---

### 3. Pengujian & Monitoring Deployment

1. **Trigger Manual (Workflow Dispatch)**:
   - Anda bisa menguji alur deploy tanpa push commit dengan membuka tab **Actions** di GitHub $\rightarrow$ pilih **🚀 Build & Deploy to Production** $\rightarrow$ klik tombol **Run workflow**.
2. **Lihat Log di Server**:
   Setelah Actions berhasil SSH ke VPS, Anda bisa mengecek status kontainer langsung di VPS:
   ```bash
   # Login sebagai user deploy
   ssh deploy@IP_SERVER

   # Cek status dan log kontainer
   bash /srv/apps/gencar/deploy/dc.sh ps
   bash /srv/apps/gencar/deploy/dc.sh logs -f --tail 100
   ```
3. **Rollback Otomatis & Manual**:
   - Skrip `deploy.sh` otomatis mendeteksi jika container crash atau gagal lolos `/api/health`, lalu mengembalikan image ke versi sebelumnya.
   - Jika ingin rollback manual kapan saja, cukup jalankan:
     ```bash
     bash /srv/apps/gencar/deploy.sh --kembali
     ```

---

## 👥 Model 2 User (sysadmin & deploy)

Project ini menggunakan **2 user** dengan separation of concerns:

### `sysadmin` — System Administrator

| Aspek       | Detail                                             |
|-------------|------------------------------------------------------|
| **Groups**  | `sudo`, `docker`                                   |
| **Bisa**    | Install packages, edit firewall, systemd, SSL, fix permissions |
| **Login**   | `ssh sysadmin@YOUR_SERVER_IP`                      |

**Kapan pakai sysadmin:**
```bash
# Install/update packages
sudo apt-get update && sudo apt-get upgrade -y

# Manage firewall
sudo ufw status

# Manage systemd service
sudo systemctl status gencar
sudo systemctl restart gencar

# Fix permissions
sudo chown -R deploy:deploy /srv/apps/gencar /srv/data/gencar

# Lihat system logs
sudo journalctl -u gencar.service -f
```

### `deploy` — Deployment User

| Aspek       | Detail                                             |
|-------------|------------------------------------------------------|
| **Groups**  | `docker` (TANPA sudo)                              |
| **Bisa**    | git pull, build docker, deploy, rollback           |
| **Tidak bisa** | Install packages, edit firewall, manage systemd |
| **Login**   | `ssh deploy@YOUR_SERVER_IP`                        |

**Kapan pakai deploy:**
```bash
cd /srv/apps/gencar
bash deploy/deploy.sh            # Deploy
bash deploy/deploy.sh --kembali  # Rollback
bash deploy/dc.sh ps             # Status
bash deploy/dc.sh logs -f        # Logs
nano /srv/data/gencar/.env       # Edit env
```

### Ringkasan Siapa Melakukan Apa

| Task                              | sysadmin | deploy |
|-----------------------------------|:--------:|:------:|
| Setup server (pertama kali)       | ✅       | ❌     |
| Install Docker / packages         | ✅       | ❌     |
| Manage UFW firewall               | ✅       | ❌     |
| Manage systemd service            | ✅       | ❌     |
| Setup SSL certificate             | ✅       | ❌     |
| Fix file permissions              | ✅       | ❌     |
| Deploy / rollback                 | ❌       | ✅     |
| Build Docker image                | ❌       | ✅     |
| Lihat logs (`bash deploy/dc.sh`)  | ❌       | ✅     |
| Edit `.env`                       | ❌       | ✅     |

---

## 🔄 Auto-Restart Saat Server Reboot

### 1. Docker Restart Policy (di `docker-compose.yml`)

```yaml
services:
  app:
    restart: unless-stopped    # ← otomatis restart
```

### 2. Systemd Service (Safety Net)

`setup-server.sh` otomatis membuat `/etc/systemd/system/gencar.service`:

```ini
[Unit]
Description=Gencar App (Docker Compose)
Requires=docker.service
After=docker.service network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
User=deploy
WorkingDirectory=/srv/apps/gencar
ExecStart=/usr/bin/docker compose up -d --remove-orphans
ExecStop=/usr/bin/docker compose down --timeout 30
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### Manage Systemd Service (Login sebagai sysadmin)

```bash
sudo systemctl status gencar     # Cek status
sudo systemctl restart gencar    # Restart
sudo systemctl stop gencar       # Stop
sudo systemctl start gencar      # Start
sudo journalctl -u gencar -f     # Logs
```

---

## 📁 Struktur Direktori Server

```
/srv/
├── apps/
│   └── gencar/                         (owner: deploy:deploy)
│       ├── .git/                       (repo langsung, bukan releases)
│       ├── deploy/
│       │   ├── umum.sh                 (bagian bersama)
│       │   ├── dc.sh                   (docker compose wrapper)
│       │   ├── deploy.sh               (pasang versi terbaru)
│       │   ├── rollback.sh             (kembali ke versi sebelumnya)
│       │   ├── setup-server.sh         (siapkan server)
│       │   └── nginx/
│       │       └── gencar.conf         (template nginx)
│       ├── docker-compose.yml
│       ├── Dockerfile
│       └── ...
│
└── data/
    └── gencar/                         (owner: deploy:deploy)
        ├── .env                        (environment production — RAHASIA)
        ├── .tag-aktif                  (tag image yang sedang berjalan)
        └── .tag-sebelumnya             (tag sebelumnya, untuk rollback)

/etc/nginx/sites-available/
└── gencar.conf                         (nginx reverse proxy)

/etc/systemd/system/
└── gencar.service                      (auto-restart)
```

---

## ⚙️ Konfigurasi Environment

### Port yang Digunakan

| Service        | Port | Keterangan                             |
|----------------|------|----------------------------------------|
| Next.js App    | 3102 | 127.0.0.1 saja (tidak dari internet)  |
| Nginx HTTP     | 80   | Redirect ke HTTPS                      |
| Nginx HTTPS    | 443  | Reverse proxy ke 127.0.0.1:3102       |
| SSH            | 22   | Akses remote                           |

> **Port sudah terpakai di server ini:**
> - `127.0.0.1:30055→3000/tcp` (lain)
> - `127.0.0.1:3101→3101/tcp` (satudata)
> - `127.0.0.1:3000→3000/tcp` (lain)
> - `127.0.0.1:3102→3102/tcp` ← **Gencar**

### Resource Limits (docker-compose.yml)

| Resource     | Default  | Variabel              |
|-------------|----------|------------------------|
| CPU limit   | 1.0 core | `GC_CPU_LIMIT`         |
| CPU reserve | 0.25     | `GC_CPU_RESERVATION`   |
| Memory limit| 512M     | `GC_MEM_LIMIT`         |
| Memory reserve| 128M   | `GC_MEM_RESERVATION`   |

### Security Hardening

- ✅ `read_only: true` — filesystem read-only (tulis hanya ke tmpfs)
- ✅ `cap_drop: ALL` — hapus semua Linux capabilities
- ✅ `no-new-privileges` — tidak bisa escalate privileges
- ✅ `user: deploy` — bukan root
- ✅ Port hanya `127.0.0.1` — tidak bisa diakses langsung dari internet
- ✅ Standalone build — tanpa `node_modules` lengkap, tanpa `npm`

### File Konfigurasi Penting

| File                          | Lokasi    | Fungsi                           |
|-------------------------------|-----------|----------------------------------|
| `Dockerfile`                  | Project   | Multi-stage standalone build     |
| `docker-compose.yml`          | Project   | Produksi: app saja (tanpa nginx) |
| `deploy/umum.sh`              | Project   | Bagian bersama semua skrip       |
| `deploy/dc.sh`                | Project   | Docker compose wrapper           |
| `deploy/deploy.sh`            | Project   | Deploy + auto-rollback           |
| `deploy/rollback.sh`          | Project   | Pintasan --kembali               |
| `deploy/setup-server.sh`      | Project   | One-time server setup            |
| `deploy/nginx/gencar.conf`    | Project   | Template nginx (diisi oleh setup)|
| `.env.example`                | Project   | Template environment variables   |

---

## 🔒 SSL / HTTPS

### Otomatis via setup-server.sh

Jika `--domain` diberikan saat setup, sertifikat Let's Encrypt diminta otomatis:

```bash
sudo bash deploy/setup-server.sh \
  --domain gencar.pintarsolusi.com \
  --email admin@example.com
```

### Manual via Certbot

```bash
# Login sebagai sysadmin
ssh sysadmin@YOUR_SERVER_IP

# Generate SSL certificate
sudo certbot certonly --webroot \
  -w /srv/apps/gencar \
  -d gencar.pintarsolusi.com

# Reload nginx
sudo systemctl reload nginx
```

### Auto-Renew Certificate

Certbot otomatis memasang timer systemd untuk renew. Cek:

```bash
sudo systemctl list-timers | grep certbot
```

---

## 🛠 Maintenance & Operasional

### Cek Status (deploy user)

```bash
cd /srv/apps/gencar
bash deploy/dc.sh ps
bash deploy/dc.sh logs -f          # Log semua
bash deploy/dc.sh logs -f app      # Log app saja
```

### Restart

```bash
# Via dc.sh (deploy user)
bash deploy/dc.sh restart

# Via systemd (sysadmin user)
sudo systemctl restart gencar
```

### Rebuild Tanpa Downtime (deploy user)

```bash
cd /srv/apps/gencar
bash deploy/deploy.sh
```

### Rollback (deploy user)

```bash
bash deploy/deploy.sh --kembali
```

### Lihat Resource Usage

```bash
docker stats
```

### Bersihkan Docker Resources

```bash
# Hapus images yang tidak terpakai
docker image prune -f

# Hapus semua resources yang tidak terpakai (hati-hati!)
docker system prune -af
```

### Database Operations (local only)

```bash
# Push schema perubahan ke Turso
npm run db:push

# Buka Drizzle Studio
npm run db:studio
```

---

## 🐛 Troubleshooting

### App Tidak Bisa Start atau Login Gagal (Kesalahan Server)

```bash
# Cek logs real-time (deploy user)
bash deploy/dc.sh logs -f app

# Cek status koneksi dan isi database libSQL / Turso
bash deploy/cek-db.sh

# Cek apakah file .env berisi konfigurasi TURSO yang benar
cat /srv/data/gencar/.env
```

### Error: Cannot find module `@libsql/linux-x64-musl`

**Gejala:** API mengembalikan status `500` dengan pesan error seperti:

```json
{
  "error": "Gagal mengambil pengaturan",
  "details": "Cannot find module '@libsql/linux-x64-musl'\nRequire stack:\n- /app/node_modules/libsql/index.js\n- /app/node_modules/@libsql/client/lib-cjs/sqlite3.js\n..."
}
```

**Penyebab:** Docker image menggunakan `node:20-alpine` (musl libc). Paket `@libsql/client`
membutuhkan native binding melalui rantai:

```
@libsql/client → libsql (tanpa @) → @libsql/linux-x64-musl (.node binary)
```

Next.js standalone output **tidak otomatis** menyertakan native optional dependencies ini.
Oleh karena itu, `Dockerfile` harus meng-COPY manual dari stage `deps`.

**Solusi — pastikan 2 file berikut sudah benar:**

1. **`Dockerfile`** — stage `runner` harus menyalin **dua** folder dari `deps`:

   ```dockerfile
   # Pastikan modul libsql (termasuk native musl) tetap tersedia.
   # "libsql" (tanpa @) berisi index.js yang me-require "@libsql/linux-x64-musl".
   COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@libsql ./node_modules/@libsql
   COPY --from=deps --chown=nextjs:nodejs /app/node_modules/libsql ./node_modules/libsql
   ```

   > ⚠️ Jika hanya meng-COPY `@libsql` tanpa `libsql` (unscoped), maka `index.js`
   > yang melakukan `require('@libsql/linux-x64-musl')` tidak akan ditemukan.

2. **`next.config.mjs`** — tambahkan ke `outputFileTracingIncludes` agar standalone
   tracer menyertakan file native:

   ```js
   experimental: {
     serverComponentsExternalPackages: ["@libsql/isomorphic-ws", "@libsql/client"],
     outputFileTracingIncludes: {
       '/**/*': [
         './node_modules/@libsql/isomorphic-ws/**/*',
         './node_modules/@libsql/client/**/*',
         './node_modules/libsql/**/*',                  // ← loader
         './node_modules/@libsql/linux-x64-musl/**/*',  // ← native binary
       ],
     },
   },
   ```

**Setelah memperbaiki, rebuild image:**

```bash
cd /srv/apps/gencar
bash deploy/deploy.sh
# atau manual:
bash deploy/dc.sh build --no-cache && bash deploy/dc.sh up -d --force-recreate
```

**Verifikasi di dalam container:**

```bash
bash deploy/dc.sh exec app node -e "
  fetch('http://127.0.0.1:3102/api/settings')
    .then(r => { console.log('Status:', r.status); return r.text(); })
    .then(t => console.log('Body:', t))
    .catch(e => console.error('Error:', e.message))
"
# Harus mengembalikan Status: 200
```

> **Catatan:** Jika di masa depan `@libsql/client` di-upgrade dan menambah/mengganti
> native binding (misalnya `@libsql/linux-arm64-musl` untuk arsitektur ARM), sesuaikan
> baris COPY di `Dockerfile` dan entri `outputFileTracingIncludes` di `next.config.mjs`.

---

### Update Kode Tidak Berefek Setelah `dc.sh restart`

- **Penyebab**: Container Docker Next.js bersifat *standalone compiled*. File JavaScript di dalam image bersifat statis. Menjalankan `restart` hanya me-reboot container dengan image lama.
- **Solusi**: Jangan jalankan `dc.sh restart` untuk update kode. Jalankan:
  ```bash
  bash deploy.sh
  ```
  Atau cukup lakukan `git push` ke GitHub jika CI/CD aktif.

### Error: `access denied, repository does not exist or may require 'docker login'`

- **Penyebab**: Perintah `docker compose pull` mencoba mencari image di remote registry. Error ini terjadi jika:
  1. Image belum pernah di-push ke registry oleh GitHub Actions CI/CD.
  2. Image di GitHub Container Registry (GHCR) berstatus *Private* dan Docker di server belum login.
- **Solusi**:
  - **Jika menggunakan CI/CD**: Jadikan package di GitHub menjadi **Public** (*Repo > Packages > gencar > Package settings > Change visibility > Public*).
  - **Atau login ke GHCR di server**:
    ```bash
    echo "TOKEN_GITHUB_ANDA" | docker login ghcr.io -u "USERNAME" --password-stdin
    ```
  - **Jika ingin build langsung di server tanpa pull**:
    ```bash
    bash deploy.sh --build-lokal
    ```

### Nginx 502 Bad Gateway

```bash
# Pastikan container app sudah healthy
bash deploy/dc.sh ps

# Cek apakah app menjawab
curl http://127.0.0.1:3102/api/health

# Restart
bash deploy/dc.sh restart
```

### Container Tidak Auto-Start Setelah Reboot

```bash
# Login sebagai sysadmin
sudo systemctl status gencar
sudo systemctl start gencar
sudo systemctl enable gencar
sudo journalctl -u gencar --no-pager -n 50
```

### Port Sudah Digunakan

```bash
# Cek port 3102
sudo ss -tulnp | grep 3102
```

### Permission Denied (sysadmin fix)

```bash
sudo chown -R deploy:deploy /srv/apps/gencar /srv/data/gencar
sudo chmod -R 755 /srv/apps/gencar /srv/data/gencar
```

### Disk Space Penuh

```bash
df -h
docker system prune -af
docker volume prune -f
```

---

## 📝 Quick Reference

```bash
# ═══════════════════════════════════════════════════
# LOCAL DEVELOPMENT
# ═══════════════════════════════════════════════════
npm run dev                    # Dev server (port 3000)
npm run build                  # Build production
npm run db:push                # Push schema ke DB

# ═══════════════════════════════════════════════════
# SERVER — deploy user
# ═══════════════════════════════════════════════════
sudo -iu deploy
cd /srv/apps/gencar
bash deploy/deploy.sh                  # Deploy
bash deploy/deploy.sh --kembali        # Rollback
bash deploy/dc.sh ps                   # Status
bash deploy/dc.sh logs -f              # Logs
bash deploy/dc.sh restart              # Restart

# ═══════════════════════════════════════════════════
# SERVER — sysadmin user
# ═══════════════════════════════════════════════════
ssh sysadmin@YOUR_SERVER_IP
sudo systemctl status gencar           # Service status
sudo systemctl restart gencar          # Restart via systemd
sudo journalctl -u gencar -f           # Service logs
sudo ufw status                        # Firewall status
sudo certbot renew                     # Renew SSL
```
