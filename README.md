# Village LabPulse — Offline-First Laboratory Management System

A fast, resilient, and offline-first Laboratory Information Management System (LIMS) engineered specifically for diagnostic centers, pathology clinics, and village laboratories.

---

## 🌟 Key Features

### 1. 100% Offline Operation & Permanent Data Retention
- **Never Loses Data**: Uses **IndexedDB (Dexie.js)** with the HTML5 `navigator.storage.persist()` API. Local records are permanently stored on the computer's hard disk and will **never be cleared overnight**, across reboots, or during browser cleanups.
- **Fetch Any Previous Day Offline**: Quick date filters (**Today**, **Yesterday**, **Last 7 Days**, **This Month**, **All History**, or **Custom Calendar Date Picker**) allow staff to instantly look up past patients and reprint reports without internet.
- **Instant Local Search**: Search instantly by Patient Name, Phone Number, Patient ID, or Referring Doctor in less than 5 milliseconds.

### 2. Fast Patient Registration & Test Booking
- Register patient demographics (Name, Age, Gender, Mobile, Village, Referring Doctor).
- Preloaded with standard diagnostic lab test profiles:
  - **Complete Blood Count (CBC with ESR)** (14+ hematological parameters)
  - **Blood Glucose (Fasting / PP / Random Sugar)**
  - **Lipid Profile (Cholesterol, HDL, LDL, Triglycerides)**
  - **Kidney Function Test (KFT / RFT - Urea, Creatinine, Uric Acid)**
  - **Liver Function Test (LFT - Bilirubin, SGOT, SGPT, ALP, Proteins)**
  - **Urine Routine & Microscopic Examination (CUE)**
  - **Widal Slide Agglutination (Typhoid Fever)**
  - **Malaria Rapid Antigen Test (Pv / Pf)**
  - **Blood Grouping & Rh Factor**
- One-click custom test creation and pricing editor.

### 3. Smart Result Entry & Automatic Flagging
- Input test parameters with normal reference ranges pre-filled.
- **Automatic Abnormal Alerts**: As you type numbers, values outside reference intervals are highlighted as **HIGH** (red) or **LOW** (amber).
- Add pathologist remarks/clinical interpretations.

### 4. Professional A4 Clinical Lab Report Printing
- Diagnostic report formatted for standard A4 paper or pre-printed letterheads.
- Includes Lab Name, Tagline, Address, ISO/Govt Reg. No, Patient info, Tabular Results with Reference Intervals, and Doctor & Technologist Signatures.
- Direct local printing via browser print dialog (`Ctrl + P` or click Print).

### 5. Automatic Cloud Sync & Remote Owner Dashboard
- **Syncs Automatically**: Listens for internet connection. When Wi-Fi/mobile hotspot/LAN is connected, it automatically batches and uploads all pending records to the cloud database (Supabase / PostgreSQL).
- **Owner Remote Access**: Lab owner can open the exact same system from any smartphone or laptop anywhere in the world to view:
  - Today's Patient Count
  - Today's Total Collections (Cash vs UPI breakdown)
  - Pending vs Synced records
  - Most requested diagnostic tests

### 6. USB Pen Drive Backup & Restore
- Download a single `.json` backup file with all patient history, test orders, and pricing.
- One-click restore from file in case of computer replacement.

---

## 🚀 How to Run the Application

### Method 1: Double-Click Startup (Windows)
Double-click `Start-Lab.bat` in this folder. It will launch the application and open it in your default web browser at `http://localhost:4173`.

### Method 2: Command Line (Developer Mode)
```bash
# Start development server
npm run dev

# Or build and run production preview
npm run build
npm run preview
```

---

## 🛠️ Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Local Storage**: Dexie.js (IndexedDB with Persistent Storage Guarantee)
- **Cloud Backend**: Supabase / PostgreSQL Real-Time Sync
- **Printing**: Native CSS `@media print` A4 Clinical Formatting
