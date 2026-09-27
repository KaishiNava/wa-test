
<div align="center">

# 📱 FX Project — WhatsApp Deleted Message Catcher

<img src="https://zfile.web.id/287vrMp.jpg" alt="FX Project Banner" width="400">

```diff
+ Realtime WhatsApp Message Monitoring
- Deleted Message Detector & Recovery
! Built-in Realtime System & Heap Monitor
# Powered by Baileys, Express & Socket.IO

```
</div>
FX Project adalah aplikasi web untuk memantau pesan WhatsApp secara realtime menggunakan **Baileys**, **Node.js**, **Express**, dan **Socket.IO**.
Aplikasi ini dapat menerima pesan WhatsApp, menyimpannya sementara di backend, menampilkannya di web, serta mendeteksi pesan yang kemudian dihapus.
Selain itu, FX Project memiliki **Server Monitor realtime** untuk melihat kondisi server seperti RAM, CPU, disk, ping, uptime, heap Node.js, jumlah pesan yang tersimpan di cache, dan jumlah file media.
## ✨ Fitur
### 💬 WhatsApp Message Catcher
 * Menerima pesan WhatsApp secara realtime.
 * Menampilkan nama pengirim.
 * Menampilkan ID/nomor pengirim.
 * Menampilkan waktu pesan.
 * Menyimpan pesan ke IndexedDB browser.
 * Menyimpan cache pesan di backend.
 * Mendeteksi pesan yang dihapus.
 * Menampilkan status pesan yang telah dihapus.
 * Mendukung reconnect ketika koneksi WhatsApp terputus.
### 📎 Dukungan Media
FX Project dapat menangani beberapa tipe media WhatsApp:
 * 🖼️ Image
 * 🎥 Video
 * 🎵 Audio
 * 📄 Document
 * 🏷️ Sticker
 * 📝 Caption media
 * 🔗 File media yang dapat dibuka dari browser
Media yang diterima akan diproses oleh backend dan disimpan ke folder:
```text
media/

```
Kemudian frontend menerima URL media tersebut melalui Socket.IO.
## 🔐 WhatsApp Authentication
FX Project menggunakan authentication state dari Baileys:
```text
auth_info_baileys/

```
Authentication dapat dilakukan melalui:
 * QR Code
 * Pairing Code
Session akan disimpan oleh Baileys sehingga server dapat mempertahankan sesi WhatsApp selama data authentication masih tersedia.
> **Peringatan:** Jangan membagikan folder auth_info_baileys kepada orang lain karena folder tersebut berisi data sesi WhatsApp Anda.
> 
## 🖥️ Server Monitor
FX Project memiliki halaman monitor server realtime. Monitor diperbarui sekitar setiap **3 detik**.
| Statistik | Keterangan |
|---|---|
| **RAM** | Penggunaan RAM sistem |
| **CPU** | Penggunaan CPU Node.js/server |
| **Disk** | Penggunaan storage server |
| **Ping** | Latency browser → server |
| **Uptime** | Lama server berjalan |
| **Messages** | Jumlah pesan pada cache backend |
| **Media** | Jumlah file media tersimpan |
| **Runtime** | Versi Node.js dan arsitektur server |
| **Heap Node.js** | Penggunaan JavaScript heap V8 |
## 🧠 Heap Node.js
Heap Node.js adalah bagian memori yang digunakan oleh JavaScript/V8 untuk menyimpan objek yang sedang digunakan oleh aplikasi.
Contohnya:
```javascript
const messages = [];
const users = {};
const data = "Hello";

```
Data seperti itu dapat menggunakan JavaScript heap.
**Perlu diperhatikan:**
> **Heap Node.js ≠ seluruh RAM server**
> 
Jadi angka Heap Node.js: 89% tidak berarti seluruh RAM server sudah digunakan 89%. Monitor RAM sistem dan Heap Node.js merupakan dua statistik yang berbeda.
## 🗃️ Penyimpanan Pesan
Backend menggunakan cache Map() untuk menyimpan pesan yang baru diterima. Cache backend dibatasi hingga sekitar **2000 pesan** agar penggunaan RAM tidak terus bertambah tanpa batas.
Frontend juga menggunakan **IndexedDB** untuk menyimpan data pesan pada browser.
## 📂 Struktur Project
Struktur utama project:
```text
FX Project/
│
├── package.json
├── server.js
│
├── public/
│   ├── index.html
│   └── favicon.png
│
├── auth_info_baileys/
│   └── ...
│
└── media/
    └── ...

```
 * **server.js**: Backend utama aplikasi. Bertanggung jawab terhadap Express, Socket.IO, Baileys, WhatsApp connection, Authentication (QR & Pairing Code), Message handling, Deleted message detection, Media download, dan Server monitoring.
 * **public/index.html**: Frontend aplikasi. Berisi UI FX Project, Message viewer, WhatsApp status, Media viewer, IndexedDB, Socket.IO client, Server Monitor, dan Responsive layout.
 * **auth_info_baileys/**: Menimpan session WhatsApp dari Baileys.
 * **media/**: Menyimpan media WhatsApp yang berhasil diunduh oleh server.
## ⚙️ Requirements
Sebelum menjalankan project, pastikan sudah memiliki:
 * Node.js (Direkomendasikan versi LTS)
 * npm
 * Koneksi internet
 * Akun WhatsApp untuk koneksi Baileys
Cek versi Node.js & npm:
```bash
node -v
npm -v

```
## 📦 Installation
Clone atau download project terlebih dahulu.
 1. Masuk ke folder project:
   ```bash
   cd "FX Project"
   
   ```
 2. Install dependency:
   ```bash
   npm install
   
   ```
## ▶️ Menjalankan Server
Jalankan perintah berikut:
```bash
npm start

```
Jika berhasil, Express akan menjalankan web server dan Baileys akan mulai melakukan koneksi. Buka alamat server melalui browser.
Untuk mode development (dengan Nodemon):
```bash
npm run dev

```
## 📱 Menghubungkan WhatsApp
Setelah server berjalan:
 1. Buka website FX Project.
 2. Pilih metode authentication yang tersedia.
 3. Gunakan QR Code atau Pairing Code.
 4. Hubungkan WhatsApp.
 5. Tunggu sampai status berubah menjadi connected/online.
 6. Pesan yang masuk akan mulai diproses oleh server.
## 🔄 Cara Kerja
```text
WhatsApp ──► Baileys ──► server.js ┬──► Message Store
                                    ├──► Media Downloader
                                    ├──► Server Monitor
                                    └──► Socket.IO ──► Web Browser
                                                          ├── Message List
                                                          ├── Deleted Message
                                                          ├── Media Viewer
                                                          └── Server Monitor

```
### 💬 Alur Pesan
```text
WhatsApp ──► Baileys ──► server.js ──► Cache Backend ──► Socket.IO ──► Browser ──► IndexedDB & UI

```
### 🗑️ Deteksi Pesan Dihapus
Ketika Baileys menerima event penghapusan pesan, server mencoba mencari pesan tersebut pada cache:
```text
Pesan Asli ──► messageStore ──► Dihapus Pengirim ──► message_deleted ──► Browser UI (Marked as Deleted)

```
*Jika pesan tidak tersedia pada cache backend, server tetap dapat mengirim informasi bahwa pesan tersebut telah dihapus, tetapi isi pesan sebelumnya mungkin tidak tersedia.*
### 📎 Alur Media
```text
WhatsApp ──► Baileys ──► Download Media ──► Simpan ke /media ──► Generate URL (/media/xxx.jpg) ──► Socket.IO ──► Browser

```
## 📡 Socket.IO Events
| Event | Deskripsi |
|---|---|
| status | Mengirim status koneksi WhatsApp. |
| qr_code | Mengirim QR authentication. |
| pairing_code | Mengirim kode pairing nomor WhatsApp. |
| new_message | Dikirim ketika pesan baru diterima. |
| message_media_ready | Dikirim setelah media berhasil diproses dan disimpan. |
| message_deleted | Dikirim ketika pesan terdeteksi dihapus. |
| server_stats | Mengirim statistik RAM, CPU, Heap, Uptime, Runtime, Cache, & Media count. |
| disk_stats | Mengirim informasi penggunaan storage server. |
| monitor_ping / monitor_pong | Menghitung latency/ping antara browser dan server. |
## 💾 IndexedDB
Frontend menggunakan IndexedDB untuk penyimpanan lokal browser. Database digunakan untuk menyimpan:
 * messages
 * session
 * settings
Pesan yang tersimpan di IndexedDB dapat tetap tersedia di browser meskipun halaman direfresh, selama data browser belum dihapus.
## 🛡️ Keamanan
 * **Jangan Membagikan Session**: Jangan upload atau membagikan folder auth_info_baileys/ karena berisi kredensial WhatsApp.
 * **Batasi Akses Server**: Jika server dibuat publik, pertimbangkan untuk menambahkan Authentication, HTTPS, Access Control, Rate Limiting, Firewall, atau Reverse Proxy.
## ☁️ Deployment di Railway
Project dapat dijalankan pada platform seperti Railway.
 * Build/Start command: npm start
 * Pastikan ketersediaan file package.json, server.js, dan public/index.html.
> **⚠️ Catatan Storage Railway:**
> Folder media/ dan auth_info_baileys/ menggunakan filesystem ephemeral pada hosting cloud. File dapat hilang jika terjadi restart/redeployment. Jika ingin data bertahan permanen, gunakan **Railway Volume** atau **S3-compatible Object Storage**.
> 
## 📊 Interpretasi Monitor
 * **RAM (38.2%)**: Sekitar 38.2% RAM sistem sedang digunakan.
 * **CPU (0.0%)**: Penggunaan CPU saat pengukuran sangat rendah.
 * **Disk (30.0%)**: Storage server terpakai sekitar 30%.
 * **Ping (273 ms)**: Latency dari browser ke server adalah 273 ms.
 * **Heap Node.js (89.5%)**: Penggunaan JavaScript heap V8 mendekati batas referensi monitor (bukan RAM server).
## 🧹 Garbage Collection
Node.js menggunakan garbage collector untuk membersihkan objek yang tidak lagi digunakan. Oleh karena itu, grafik penggunaan heap akan tampak naik dan turun secara berkala:
```text
30 MB ──► 45 MB ──► 60 MB ──► 40 MB (Garbage Collected)

```
## 🐛 Troubleshooting
 * **Server Tidak Berjalan**: Jalankan npm install lalu npm start. Periksa terminal untuk melihat detail error.
 * **WhatsApp Tidak Terhubung**: Cek koneksi internet, ketersediaan QR/Pairing code, serta permission folder auth_info_baileys/. Hapus folder session jika ingin login ulang.
 * **Media Tidak Muncul**: Pastikan folder media/ memiliki write permission pada sistem/server.
 * **Pesan/Monitor Tidak Update**: Periksa status koneksi WebSockets/Socket.IO pada browser console.
## 🧪 Development
Menjalankan server menggunakan Nodemon (auto-restart saat ada perubahan kode):
```bash
npm run dev

```
Pengecekan sintaks file backend:
```bash
node --check server.js

```
## 📦 Dependencies
**Main Dependencies:**
 * @whiskeysockets/baileys
 * express
 * socket.io
 * cors
**Dev Dependencies:**
 * nodemon
## 📜 Lisensi & Disclaimer
Project ini dibuat untuk penggunaan pribadi, pengembangan, eksperimen, dan pemantauan pesan pada akun WhatsApp yang memiliki izin. Gunakan aplikasi secara bertanggung jawab dan hormati privasi pengguna lain.
<div align="center">
**FX Project — WhatsApp Deleted Message Catcher**
Stack: Node.js • Express • Socket.IO • Baileys • IndexedDB • HTML/CSS/JS
Made with ☕ + 🗿 by 
</div>
```
**KyZX Own FX Project**
```
