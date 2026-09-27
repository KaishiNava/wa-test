const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let sock = null;
const messageStore = new Map();

async function startWhatsApp(pairingType = 'qr', phoneNumber = '') {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        // ANTI-BAN: Identifikasi diri sebagai peramban Chrome Desktop resmi
        browser: ["Mac OS", "Chrome", "121.0.0.0"],
        // ANTI-BAN: Batasi pencatatan log agar tidak memicu deteksi mencurigakan
        logger: require('pino')({ level: 'silent' }),
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    // MINTA PAIRING CODE BILA DIMINTA FRONTEND
    if (pairingType === 'code' && phoneNumber && !sock.authState.creds.registered) {
        // Beri jeda kecil agar socket terinisialisasi sempurna
        await delay(2000);
        try {
            const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
            let code = await sock.requestPairingCode(cleanPhone);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            
            // Kirim Kode Langsung ke Frontend Web
            io.emit('pairing_code', { code });
        } catch (err) {
            console.error("Gagal Request Pairing Code:", err);
            io.emit('pairing_error', { message: 'Gagal mendapatkan kode. Pastikan nomor benar & belum terhubung.' });
        }
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && pairingType === 'qr') {
            io.emit('qr_code', { qr });
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            io.emit('status', { status: 'disconnected', message: 'Koneksi Terputus' });
            
            if (shouldReconnect) {
                startWhatsApp(pairingType, phoneNumber);
            }
        } else if (connection === 'open') {
            io.emit('status', { status: 'connected', message: 'WhatsApp Terhubung!' });
        }
    });

    // TANGKAP PESAN (DENGAN ANTI-BAN & ANTI-SPAM LOGIC)
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return; // Abaikan pesan dari diri sendiri untuk kurangi aktivitas server

        // ANTI-BAN: Beri jeda simulasi membaca/memproses pesan secara acak (1 - 2.5 detik)
        const randomDelay = Math.floor(Math.random() * 1500) + 1000;
        await delay(randomDelay);

        const msgId = msg.key.id;
        const sender = msg.key.remoteJid;
        const pushName = msg.pushName || sender.split('@')[0];

        let text = msg.message.conversation 
            || msg.message.extendedTextMessage?.text 
            || msg.message.imageMessage?.caption 
            || "";

        const payload = {
            id: msgId,
            sender: sender,
            pushName: pushName,
            text: text,
            timestamp: new Date().toISOString(),
            isDeleted: false
        };

        // Simpan sementara di memori server
        messageStore.set(msgId, payload);

        // Bersihkan memori jika menyimpan lebih dari 2000 pesan (Anti-Memory Leak)
        if (messageStore.size > 2000) {
            const firstKey = messageStore.keys().next().value;
            messageStore.delete(firstKey);
        }

        io.emit('new_message', payload);
    });

    // TANGKAP PESAN DIHAPUS (REVOKE)
    sock.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
            if (update.update?.message?.protocolMessage?.type === 0) {
                const deletedKey = update.update.message.protocolMessage.key;
                const originalMsg = messageStore.get(deletedKey.id);

                if (originalMsg) {
                    originalMsg.isDeleted = true;
                    io.emit('message_deleted', originalMsg);
                }
            }
        }
    });
}

// SOCKET.IO CONTROLLER
io.on('connection', (socket) => {
    // Jalankan sesi koneksi awal
    if (!sock) startWhatsApp('qr');

    socket.on('request_pairing_code', async ({ phoneNumber }) => {
        if (phoneNumber) {
            io.emit('pairing_loading', { message: 'Membuat Pairing Code...' });
            await startWhatsApp('code', phoneNumber);
        }
    });

    socket.on('logout', async () => {
        try {
            if (sock) await sock.logout();
            sock = null;
            if (fs.existsSync('auth_info_baileys')) {
                fs.rmSync('auth_info_baileys', { recursive: true, force: true });
            }
            io.emit('status', { status: 'disconnected', message: 'Berhasil Logout & Sesi Dihapus' });
        } catch (e) {
            console.error(e);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server aktif di port ${PORT}`);
});
