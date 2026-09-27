# 📱 FX Project — WhatsApp Deleted Message Catcher

FX Project adalah aplikasi web untuk memantau pesan WhatsApp secara realtime menggunakan **Baileys**, **Node.js**, **Express**, dan **Socket.IO**.

Aplikasi ini dapat menerima pesan WhatsApp, menyimpannya sementara di backend, menampilkannya di web, serta mendeteksi pesan yang kemudian dihapus.

Selain itu, FX Project memiliki **Server Monitor realtime** untuk melihat kondisi server seperti RAM, CPU, disk, ping, uptime, heap Node.js, jumlah pesan yang tersimpan di cache, dan jumlah file media.

---

## ✨ Fitur

### 💬 WhatsApp Message Catcher

- Menerima pesan WhatsApp secara realtime.
- Menampilkan nama pengirim.
- Menampilkan ID/nomor pengirim.
- Menampilkan waktu pesan.
- Menyimpan pesan ke IndexedDB browser.
- Menyimpan cache pesan di backend.
- Mendeteksi pesan yang dihapus.
- Menampilkan status pesan yang telah dihapus.
- Mendukung reconnect ketika koneksi WhatsApp terputus.

### 📎 Dukungan Media

FX Project dapat menangani beberapa tipe media WhatsApp:

- 🖼️ Image
- 🎥 Video
- 🎵 Audio
- 📄 Document
- 🏷️ Sticker
- 📝 Caption media
- 🔗 File media yang dapat dibuka dari browser

Media yang diterima akan diproses oleh backend dan disimpan ke folder:

```text
media/

Kemudian frontend menerima URL media tersebut melalui Socket.IO.


---

🔐 WhatsApp Authentication

FX Project menggunakan authentication state dari Baileys:

auth_info_baileys/

Authentication dapat dilakukan melalui:

QR Code

Pairing Code


Session akan disimpan oleh Baileys sehingga server dapat mempertahankan sesi WhatsApp selama data authentication masih tersedia.

> Jangan membagikan folder auth_info_baileys kepada orang lain karena folder tersebut berisi data sesi WhatsApp.




---

🖥️ Server Monitor

FX Project memiliki halaman monitor server realtime.

Monitor diperbarui sekitar setiap:

3 detik

Statistik yang tersedia:

Statistik	Keterangan

RAM	Penggunaan RAM sistem
CPU	Penggunaan CPU Node.js/server
Disk	Penggunaan storage server
Ping	Latency browser → server
Uptime	Lama server berjalan
Messages	Jumlah pesan pada cache backend
Media	Jumlah file media tersimpan
Runtime	Versi Node.js dan arsitektur server
Heap Node.js	Penggunaan JavaScript heap V8



---

🧠 Heap Node.js

Heap Node.js adalah bagian memori yang digunakan oleh JavaScript/V8 untuk menyimpan objek yang sedang digunakan oleh aplikasi.

Contohnya:

const messages = [];
const users = {};
const data = "Hello";

Data seperti itu dapat menggunakan JavaScript heap.

Perlu diperhatikan:

Heap Node.js ≠ seluruh RAM server

Jadi angka:

Heap Node.js: 89%

tidak berarti seluruh RAM server sudah digunakan 89%.

Monitor RAM sistem dan Heap Node.js merupakan dua statistik yang berbeda.


---

🗃️ Penyimpanan Pesan

Backend menggunakan cache:

Map()

untuk menyimpan pesan yang baru diterima.

Cache backend dibatasi hingga sekitar:

2000 pesan

Agar penggunaan RAM tidak terus bertambah tanpa batas.

Frontend juga menggunakan:

IndexedDB

untuk menyimpan data pesan pada browser.


---

📂 Struktur Project

Struktur utama project:

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

server.js

Backend utama aplikasi.

Bertanggung jawab terhadap:

Express

Socket.IO

Baileys

WhatsApp connection

Authentication

QR Code

Pairing Code

Message handling

Deleted message detection

Media download

Server monitoring


public/index.html

Frontend aplikasi.

Berisi:

UI FX Project

Message viewer

WhatsApp status

Media viewer

IndexedDB

Socket.IO client

Server Monitor

Responsive layout


auth_info_baileys/

Menyimpan session WhatsApp dari Baileys.

media/

Menyimpan media WhatsApp yang berhasil diunduh oleh server.


---

⚙️ Requirements

Sebelum menjalankan project, pastikan sudah memiliki:

Node.js

npm

Koneksi internet

Akun WhatsApp untuk koneksi Baileys


Direkomendasikan menggunakan Node.js versi LTS.

Cek versi Node.js:

node -v

Cek npm:

npm -v


---

📦 Installation

Clone atau download project terlebih dahulu.

Masuk ke folder project:

cd "FX Project"

Kemudian install dependency:

npm install


---

▶️ Menjalankan Server

Jalankan:

npm start

Jika berhasil, Express akan menjalankan web server dan Baileys akan mulai melakukan koneksi.

Buka alamat server melalui browser.

Untuk development dengan Nodemon:

npm run dev


---

📱 Menghubungkan WhatsApp

Setelah server berjalan:

1. Buka website FX Project.


2. Pilih metode authentication yang tersedia.


3. Gunakan QR Code atau Pairing Code.


4. Hubungkan WhatsApp.


5. Tunggu sampai status berubah menjadi connected/online.


6. Pesan yang masuk akan mulai diproses oleh server.



Setelah koneksi berhasil, informasi akun WhatsApp yang terhubung dapat dikirim ke frontend.


---

🔄 Cara Kerja

Secara sederhana alurnya:

WhatsApp
    │
    ▼
Baileys
    │
    ▼
server.js
    │
    ├── Message Store
    │
    ├── Media Downloader
    │
    ├── Server Monitor
    │
    └── Socket.IO
            │
            ▼
       Web Browser
            │
            ├── Message List
            ├── Deleted Message
            ├── Media Viewer
            └── Server Monitor


---

💬 Alur Pesan

Ketika pesan masuk:

WhatsApp
   ↓
Baileys menerima message
   ↓
server.js memproses message
   ↓
Pesan dimasukkan ke cache
   ↓
Socket.IO mengirim event
   ↓
Browser menerima event
   ↓
Pesan disimpan ke IndexedDB
   ↓
Pesan ditampilkan di UI


---

🗑️ Deteksi Pesan Dihapus

Ketika Baileys menerima event penghapusan pesan, server mencoba mencari pesan tersebut pada cache.

Jika pesan ditemukan:

Pesan asli
     ↓
messageStore
     ↓
Pesan dihapus oleh pengirim
     ↓
message_deleted
     ↓
Browser
     ↓
UI menandai pesan sebagai deleted

Jika pesan tidak tersedia pada cache backend, server tetap dapat mengirim informasi bahwa pesan tersebut telah dihapus, tetapi isi pesan sebelumnya mungkin tidak tersedia.


---

📎 Alur Media

Untuk pesan media:

WhatsApp
   ↓
Baileys
   ↓
Deteksi tipe media
   ↓
Download media
   ↓
Simpan ke /media
   ↓
Generate URL
   ↓
Socket.IO
   ↓
Browser

Contoh URL media:

/media/xxxxxxxx.jpg

Backend menyediakan folder tersebut melalui Express.


---

📡 Socket.IO Events

Beberapa event utama yang digunakan aplikasi:

Status

status

Digunakan untuk mengirim status koneksi WhatsApp.


---

QR Code

qr_code

Digunakan untuk mengirim QR authentication.


---

Pairing Code

pairing_code

Digunakan untuk proses pairing menggunakan nomor WhatsApp.


---

New Message

new_message

Dikirim ketika pesan baru diterima.


---

Message Media Ready

message_media_ready

Dikirim setelah media berhasil diproses dan disimpan.


---

Deleted Message

message_deleted

Dikirim ketika pesan terdeteksi telah dihapus.


---

Server Stats

server_stats

Mengirim statistik server seperti:

RAM

CPU

Heap

Uptime

Runtime

Message cache

Media count



---

Disk Stats

disk_stats

Mengirim informasi penggunaan storage server.


---

Monitor Ping

Frontend mengirim:

monitor_ping

Kemudian server membalas:

monitor_pong

Nilai tersebut digunakan untuk menghitung latency/ping antara browser dan server.


---

💾 IndexedDB

Frontend menggunakan IndexedDB untuk penyimpanan lokal browser.

Database digunakan untuk menyimpan:

messages
session
settings

Pesan yang tersimpan di IndexedDB dapat tetap tersedia di browser meskipun halaman direfresh, selama data browser belum dihapus.


---

🛡️ Keamanan

Beberapa hal penting:

Jangan membagikan session

Jangan upload atau membagikan:

auth_info_baileys/

karena folder tersebut berisi kredensial/session WhatsApp.

Jangan expose server secara sembarangan

Jika server dibuat publik, pertimbangkan menambahkan:

Authentication

HTTPS

Access control

Rate limiting

Firewall

Reverse proxy


Terutama jika website dapat diakses oleh orang lain.


---

☁️ Deployment di Railway

Project dapat dijalankan pada platform seperti Railway.

Build/Start command menggunakan:

npm start

Pastikan project memiliki:

package.json
server.js
public/index.html

Railway kemudian akan menjalankan:

node server.js


---

⚠️ Catatan Storage Railway

Media yang disimpan ke:

media/

menggunakan filesystem server.

Pada environment hosting yang filesystem-nya ephemeral, file dapat hilang ketika instance/redeployment tertentu terjadi.

Jika ingin media bertahan secara permanen, gunakan persistent storage seperti:

Railway Volume

Object Storage

S3-compatible storage

Storage service lainnya


Hal yang sama perlu diperhatikan untuk:

auth_info_baileys/

Jika session WhatsApp hilang setelah instance dibuat ulang, akun dapat meminta authentication ulang.


---

📊 Interpretasi Monitor

Contoh:

RAM
38.2%

Berarti sekitar 38.2% RAM sistem sedang digunakan.

Contoh:

CPU
0.0%

Berarti penggunaan CPU pada saat pengukuran sangat rendah.

Contoh:

Disk
30.0%

Berarti sekitar 30% storage yang terdeteksi sedang digunakan.

Contoh:

Ping
273 ms

Berarti latency browser ke server pada saat pengukuran sekitar 273 ms.

Contoh:

Heap Node.js
89.5%

Berarti penggunaan JavaScript heap terhadap batas heap yang digunakan sebagai referensi monitor sedang berada di sekitar 89.5%.

Heap tersebut bukan representasi seluruh RAM server.


---

🧹 Garbage Collection

Node.js menggunakan garbage collector untuk membersihkan object JavaScript yang sudah tidak digunakan.

Karena itu penggunaan heap dapat terlihat seperti:

30 MB
↓
45 MB
↓
60 MB
↓
40 MB

Penurunan tersebut dapat terjadi ketika garbage collector membersihkan object yang sudah tidak diperlukan.

Jika penggunaan heap terus meningkat dan tidak pernah turun dalam waktu lama, hal tersebut dapat menjadi indikasi bahwa aplikasi menyimpan object lebih banyak dari yang seharusnya.


---

🐛 Troubleshooting

Server tidak berjalan

Coba:

npm install
npm start

Pastikan tidak ada error pada terminal.


---

WhatsApp tidak terhubung

Periksa:

koneksi internet

QR Code

Pairing Code

folder auth_info_baileys

log server


Jika session bermasalah, authentication dapat dilakukan ulang.


---

Media tidak muncul

Periksa:

media/

Pastikan server memiliki permission untuk membuat dan menulis file.

Periksa juga log server untuk melihat apakah proses download media mengalami error.


---

Pesan tidak muncul di browser

Periksa:

Socket.IO connection

status server

koneksi internet

console browser

log Node.js



---

Monitor tidak update

Pastikan koneksi Socket.IO aktif.

Monitor menggunakan event:

server_stats
disk_stats
monitor_pong

dan frontend melakukan refresh statistik secara berkala.


---

🧪 Development

Menjalankan dengan Nodemon:

npm run dev

Nodemon akan melakukan restart ketika file backend berubah.

Untuk mengecek syntax backend:

node --check server.js


---

📦 Dependencies

Project menggunakan beberapa dependency utama:

@whiskeysockets/baileys
express
socket.io
cors

Development dependency:

nodemon


---

📜 Lisensi

Project ini menggunakan dependency open-source dengan lisensi masing-masing.

Periksa lisensi masing-masing dependency sebelum melakukan redistribusi atau penggunaan komersial.


---

⚠️ Disclaimer

FX Project dibuat untuk penggunaan pribadi, pengembangan, eksperimen, dan pemantauan pesan pada akun WhatsApp yang memang memiliki izin untuk digunakan.

Gunakan aplikasi secara bertanggung jawab dan hormati privasi pengguna lain.

Jangan menggunakan aplikasi untuk mengakses, menyimpan, atau menyebarkan pesan maupun media orang lain tanpa izin.


---

👤 Project

FX Project — WhatsApp Deleted Message Catcher

Stack:

Node.js
Express
Socket.IO
Baileys
IndexedDB
HTML
CSS
JavaScript

Made with ☕ + 🗿
KyZX Own FX Project
