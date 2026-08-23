# EasyPDF - Enterprise Client-First PDF Manipulation & Processing Platform

<div align="center">

![EasyPDF Banner](https://img.shields.io/badge/EasyPDF-Enterprise%20v1.4-indigo?style=for-the-badge&logo=adobeacrobatreader&logoColor=white)
![Next.js 15](https://img.shields.io/badge/Next.js-15.5.23-black?style=for-the-badge&logo=next.js&logoColor=white)
![React 19](https://img.shields.io/badge/React-19.0-61dafb?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0%20%2F%20MariaDB-4479a1?style=for-the-badge&logo=mysql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ed?style=for-the-badge&logo=docker&logoColor=white)
![Zero Retention](https://img.shields.io/badge/Security-Strict%20Zero--Retention-emerald?style=for-the-badge&logo=shieldcheck&logoColor=white)

**A high-performance, private, client-first PDF productivity suite with live thumbnail organizing, neural OCR recognition, batch compression, and an enterprise Admin Operations Dashboard.**

[Live Tools](#-core-pdf-tools-suite) • [Admin Dashboard](#-enterprise-admin-dashboard) • [Deployment Guide](#-production-deployment-guide) • [Architecture](#-project-architecture) • [Getting Started](#-getting-started)

</div>

---

## ✨ Core PDF Tools Suite

EasyPDF is engineered around a clean, modern 2-pillar architecture:

### 1. Organize PDF
* **Merge PDF** (`/tools/merge-pdf`): Seamlessly combine multiple PDF documents into a single cohesive document with live order adjustment and file preview.
* **Split PDF** (`/tools/split-pdf`): Extract individual pages or custom ranges (e.g. `1, 3-5, 8`) into standalone PDF files or a bundled ZIP archive.
* **Organize PDF** (`/tools/organize-pdf`): Live visual drag-and-drop page reordering, page rotation, and one-click deletion with dynamic aspect-ratio thumbnail grids.
* **Rotate PDF** (`/tools/rotate-pdf`): Permanent 90°, 180°, and 270° orientation correction with live visual canvas renderers.

### 2. Optimize PDF
* **Compress PDF** (`/tools/compress-pdf`): Multi-file batch PDF compression with customizable compression levels (*Extreme*, *Recommended*, *Low Compression*), percentage savings calculation, and ZIP / individual download packaging.
* **Repair PDF** (`/tools/repair-pdf`): Two-stage deep reconstruction parser that recovers corrupted, damaged, or unreadable PDF file trees and objects.
* **OCR Searchable PDF** (`/tools/ocr-pdf`): High-accuracy neural OCR engine powered by Tesseract and Canvas computer vision preprocessing (contrast equalization, whitening, Laplacian sharpening). Features:
  - 12 language OCR models (English, Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Russian, Arabic, Hindi, Dutch).
  - 4 specialized presets (*Balanced (Auto)*, *Tables & Invoices*, *High Contrast Scan*, *Faded Document Recovery*).
  - Pixel-perfect word-level invisible text injection with bounding box alignment.
  - Side-by-side formatted text inspector with 1-click clipboard copy and `.txt` export.

---

## 🛡️ Privacy & Strict Zero-Retention Model

* **Client-Side Heavy**: PDF operations (rendering, parsing, page manipulation, and OCR preprocessing) run locally in the browser whenever possible.
* **Ephemeral Processing**: Server-assisted operations wipe memory buffers and temporary artifacts immediately upon user download or TTL timeout (15 mins – 24 hrs).
* **HMAC-SHA256 Token Signing**: File upload and download tickets use tamper-proof signatures with strict expiration timeouts.
* **No File Persistence**: Files are never permanently stored, indexed, or shared with third parties.

---

## 🚀 Enterprise Admin Dashboard

Accessible at [`/admin`](http://localhost:3000/admin) with secure token authentication:

* **Executive KPI Overview**: Total operations, today's volume, active users, subscription MRR, storage purged, average latency, and uptime.
* **User & Subscription Manager**: View accounts with server-side pagination, modify subscription tiers (Free, Pro, Business), and suspend/activate accounts.
* **Plan Pricing & Feature Limits Editor**: Edit plan prices ($), max upload file size (MB), daily operation limits, monthly OCR page allowances, and batch counts live without redeploying.
* **Storage & Zero-Retention Telemetry**: Monitor temporary footprint, inspect lifetime auto-purged counts, and execute 1-click **Force Storage Purge**.
* **PDF Tool Operational Switchboard**: Toggle individual tools into maintenance mode, update upload size thresholds, and broadcast global announcement banners.
* **Security & IP Firewall / Ban Manager**: Real-time administrative audit logs (logins, purges, tier changes) and IP address blocking engine.
* **One-Click Database Auto-Migrator**: Run DDL migrations and seed all 8 core tables with a single click from the UI.
* **Exportable Reports**: 1-click CSV downloads for Operations Audit Log and Platform KPI Summaries.

---

## 🐳 Production Deployment Guide

EasyPDF is configured for high-performance standalone deployments with Next.js 15.

### Option 1: Docker (Recommended)
Build and run the multi-stage standalone container:
```bash
# Build the production container
docker build -t easypdf:latest .

# Run with environment variables
docker run -d \
  --name easypdf \
  -p 3000:3000 \
  -e MYSQL_HOST=your-db-host \
  -e MYSQL_USER=easypdf_user \
  -e MYSQL_PASSWORD=your_secure_password \
  -e MYSQL_DATABASE=easypdf \
  -e ADMIN_EMAIL=mubinulhq@gmail.com \
  -e ADMIN_PASSWORD=your_admin_password \
  easypdf:latest
```

### Option 2: PM2 Cluster on Ubuntu / Linux VPS
```bash
# 1. Install dependencies and build standalone package
npm ci
npm run build

# 2. Start using PM2 cluster mode
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Option 3: Vercel / Cloud Edge
1. Push your repository to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. Set the Environment Variables (`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`, `ADMIN_SECRET`).
4. Click **Deploy**.

---

## 🏥 Health Checks & Monitoring

EasyPDF provides a production health check endpoint at `/api/health`:
```bash
curl -I http://localhost:3000/api/health
```
Returns:
```json
{
  "status": "UP",
  "timestamp": "2026-08-23T14:27:00.000Z",
  "uptimeSeconds": 18420,
  "environment": "production",
  "services": {
    "database": {
      "status": "HEALTHY",
      "latencyMs": 2
    }
  }
}
```

---

## 🛠️ Tech Stack & Dependencies

* **Framework**: [Next.js 15.5](https://nextjs.org/) (Standalone App Router)
* **Frontend**: [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/)
* **PDF Core**: `pdf-lib`, `pdfjs-dist`, `canvas`, `jszip`
* **Neural OCR Engine**: `tesseract.js` with Web Assembly workers
* **Database**: MySQL 8.0 / MariaDB (Connection pooling with resilient offline fallback)
* **Language & Types**: TypeScript 5.0 (Strict mode)

---

## 🏁 Getting Started (Local Development)

### 1. Clone and Install Dependencies
```bash
git clone https://github.com/your-username/EasyPDF.git
cd EasyPDF
npm install
```

### 2. Setup Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Administrator Credentials

| Field | Value |
| :--- | :--- |
| **Login URL** | `http://localhost:3000/admin/login` |
| **Admin Name** | `Mubinul Houqe` |
| **Admin Email** | `mubinulhq@gmail.com` |
| **Passkey** | `606505` |

---

## 📄 License

This project is licensed under the MIT License.
