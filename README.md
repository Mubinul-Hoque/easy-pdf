# EasyPDF - Enterprise Client-First PDF Manipulation & Processing Platform

<div align="center">

![EasyPDF Banner](https://img.shields.io/badge/EasyPDF-Enterprise%20v1.4-indigo?style=for-the-badge&logo=adobeacrobatreader&logoColor=white)
![Next.js 15](https://img.shields.io/badge/Next.js-15.5.23-black?style=for-the-badge&logo=next.js&logoColor=white)
![React 19](https://img.shields.io/badge/React-19.0-61dafb?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0%20%2F%20MariaDB-4479a1?style=for-the-badge&logo=mysql&logoColor=white)
![Zero Retention](https://img.shields.io/badge/Security-Strict%20Zero--Retention-emerald?style=for-the-badge&logo=shieldcheck&logoColor=white)

**A high-performance, private, client-first PDF productivity suite with live thumbnail organizing, neural OCR recognition, batch compression, and an enterprise Admin Operations Dashboard.**

[Live Tools](#-core-pdf-tools-suite) • [Admin Dashboard](#-enterprise-admin-dashboard) • [Architecture](#-project-architecture) • [Getting Started](#-getting-started) • [Database Setup](#-database-setup--migrations)

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
* **Repair PDF** (`/tools/repair-pdf`): Deep-reconstruction syntax parser that recovers corrupted, damaged, or unreadable PDF file trees and objects.
* **OCR Searchable PDF** (`/tools/ocr-pdf`): High-accuracy neural OCR engine powered by Tesseract and Canvas computer vision preprocessing (contrast equalization, whitening, Laplacian sharpening). Features:
  - 12 language OCR models (English, Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Russian, Arabic, Hindi, Dutch).
  - 4 specialized presets (*Balanced (Auto)*, *Tables & Invoices*, *High Contrast Scan*, *Faded Document Recovery*).
  - Pixel-perfect word-level invisible text injection with bounding box alignment.
  - Side-by-side formatted text inspector with 1-click clipboard copy and `.txt` export.

---

## 🛡️ Privacy & Strict Zero-Retention Model

* **Client-Side Heavy**: PDF operations (rendering, parsing, page manipulation, and OCR preprocessing) run locally in the browser whenever possible.
* **Ephemeral Processing**: Server-assisted operations wipe memory buffers and temporary artifacts immediately upon user download or TTL timeout (15 mins – 24 hrs).
* **No File Persistence**: Files are never permanently stored, indexed, or shared with third parties.

---

## 🚀 Enterprise Admin Dashboard

Accessible at [`/admin`](http://localhost:3000/admin) with secure token authentication and passkey verification:

* **Executive KPI Overview**: Total operations, today's volume, active users, subscription MRR, storage purged, average latency, and uptime.
* **User & Subscription Manager**: View accounts, modify subscription tiers (Free, Pro, Business), and suspend/activate accounts.
* **Plan Pricing & Feature Limits Editor**: Edit plan prices ($), max upload file size (MB), daily operation limits, monthly OCR page allowances, and batch counts live without redeploying.
* **Storage & Zero-Retention Telemetry**: Monitor temporary footprint, inspect lifetime auto-purged counts, and execute 1-click **Force Storage Purge**.
* **PDF Tool Operational Switchboard**: Toggle individual tools into maintenance mode, update upload size thresholds, and broadcast global announcement banners.
* **Security & IP Firewall / Ban Manager**: Real-time administrative audit logs (logins, purges, tier changes) and IP address blocking engine.
* **One-Click Database Auto-Migrator**: Run DDL migrations and seed all 8 core tables with a single click from the UI.
* **Exportable Reports**: 1-click CSV downloads for Operations Audit Log and Platform KPI Summaries.

---

## 🛠️ Tech Stack & Dependencies

* **Framework**: [Next.js 15.5](https://nextjs.org/) (App Router, Server Components & Route Handlers)
* **Frontend**: [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/)
* **PDF Core**: `pdf-lib`, `pdfjs-dist`, `canvas`, `jszip`
* **Neural OCR Engine**: `tesseract.js` with Web Assembly workers
* **Database**: MySQL 8.0 / MariaDB (Connection pooling with resilient offline fallback)
* **Language & Types**: TypeScript 5.0 (Strict mode)

---

## 📁 Project Architecture

```text
EasyPDF/
├── database/
│   └── schema.sql                # Complete MySQL DDL schema and initial seed data
├── src/
│   ├── app/
│   │   ├── admin/                # Enterprise Admin Dashboard (/admin, /admin/login)
│   │   ├── api/
│   │   │   ├── admin/            # Admin API routes (auth, stats, users, plans, security, system)
│   │   │   ├── pdf/[action]/     # PDF processing pipeline dispatcher
│   │   │   └── files/            # File storage and cleanup handlers
│   │   ├── tools/                # Dedicated tool pages (merge, split, organize, rotate, compress, repair, ocr)
│   │   ├── pricing/              # Subscription pricing page
│   │   ├── layout.tsx            # Root layout with Navbar and Footer
│   │   └── page.tsx              # Homepage with categorized tool cards & search
│   ├── components/
│   │   ├── admin/                # Admin sub-views (Overview, Users, Plans, Files, Tools, Security, System)
│   │   ├── Navbar.tsx            # Global navigation with mega-dropdown
│   │   └── Footer.tsx            # Footer navigation
│   └── lib/
│       ├── admin-auth.ts         # Admin authentication, session tokens, and credentials
│       ├── admin-service.ts      # Admin KPI aggregation and database service
│       ├── db.ts                 # MySQL connection pool and resilient query runners
│       ├── db-schema.ts          # Auto-migration runner for Admin system tab
│       ├── ocr-engine.ts         # High-DPI rasterization, image sharpening & text injection
│       ├── pdf-engine.ts         # Core PDF manipulation engine
│       ├── pdf-tools-data.ts     # Tool registry metadata
│       ├── security-service.ts   # Security audit logs and IP firewall engine
│       └── types.ts              # TypeScript domain types
├── .env.example                  # Environment configuration template
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🏁 Getting Started

### 1. Prerequisites
* **Node.js**: v18.17+ or v20+ recommended
* **npm**: v9+ (or `pnpm` / `yarn`)
* **MySQL Server**: (e.g. XAMPP MySQL, Docker MySQL, or remote MySQL instance)

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/your-username/EasyPDF.git
cd EasyPDF
npm install
```

### 3. Setup Environment Variables
Copy the `.env.example` file to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your local MySQL credentials in `.env.local`:
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=easypdf

NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret_salt
ADMIN_SECRET=your_admin_secret_salt

ADMIN_EMAIL=mubinulhq@gmail.com
ADMIN_PASSWORD=606505
```

---

## 🗄️ Database Setup & Migrations

You can set up the database using either method:

### Option A: 1-Click via Admin Dashboard (Recommended)
1. Start the application: `npm run dev`
2. Open [http://localhost:3000/admin](http://localhost:3000/admin) and log in.
3. Navigate to **System Health & DB** tab.
4. Click **"Run Auto-Migration / Seed"**. All 8 tables will be automatically created and populated.

### Option B: Manual SQL Import
Import [`database/schema.sql`](database/schema.sql) into your MySQL server via phpMyAdmin, MySQL Workbench, or CLI:
```bash
mysql -u root -p < database/schema.sql
```

---

## 💻 Running the Application

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
npm run build
npm start
```

---

## 🔐 Default Administrator Login

| Field | Value |
| :--- | :--- |
| **Login URL** | `http://localhost:3000/admin/login` |
| **Admin Name** | `Mubinul Houqe` |
| **Admin Email** | `mubinulhq@gmail.com` |
| **Passkey** | `606505` |

---

## 📄 License

This project is licensed under the MIT License.
