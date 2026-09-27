const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    delay,
    downloadMediaMessage,
    getContentType,
    normalizeMessageContent
} = require('@whiskeysockets/baileys');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const MEDIA_DIR = path.join(__dirname, 'media');
fs.mkdirSync(MEDIA_DIR, { recursive: true });
app.use('/media', express.static(MEDIA_DIR, {
    maxAge: '7d',
    etag: true
}));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

let sock = null;
let starting = false;
let currentPairingType = 'qr';
let currentPhoneNumber = '';
let connectedAt = null;
let lastStatus = { status: 'disconnected', message: 'Menunggu koneksi...' };

const messageStore = new Map();
const MAX_MESSAGE_STORE = 2000;
const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

const monitorStartedAt = Date.now();
let previousCpu = process.cpuUsage();
let previousCpuWall = process.hrtime.bigint();
let cpuPercent = 0;

function cleanJid(jid = '') {
    return String(jid).split(':')[0];
}

function getAccountInfo() {
    const user = sock?.user || {};
    const id = user.id ? cleanJid(user.id) : null;
    const name = user.name || user.verifiedName || null;
    return {
        accountId: id,
        accountName: name,
        connectedAt
    };
}

function emitStatus(extra = {}) {
    const payload = {
        ...lastStatus,
        ...getAccountInfo(),
        ...extra,
        updatedAt: new Date().toISOString()
    };
    lastStatus = { status: payload.status, message: payload.message };
    io.emit('status', payload);
    io.emit('session_info', payload);
}

function emitMonitor(socketTarget = io) {
    const memory = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    socketTarget.emit('server_stats', {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cpu: {
            percent: Number(cpuPercent.toFixed(1)),
            cores: os.cpus().length,
            load1: Number((os.loadavg?.()[0] || 0).toFixed(2))
        },
        memory: {
            rss: memory.rss,
            heapUsed: memory.heapUsed,
            heapTotal: memory.heapTotal,
            external: memory.external,
            systemTotal: totalMemory,
            systemFree: freeMemory,
            systemUsed: usedMemory,
            percent: Number(((usedMemory / totalMemory) * 100).toFixed(1))
        },
        messages: {
            cached: messageStore.size,
            mediaFiles: countMediaFiles()
        },
        updatedAt: new Date().toISOString()
    });
}

function countMediaFiles() {
    try {
        return fs.readdirSync(MEDIA_DIR).length;
    } catch {
        return 0;
    }
}

function getDiskStats(callback) {
    execFile('df', ['-kP', __dirname], { timeout: 2500 }, (error, stdout) => {
        if (error) return callback(null);
        const lines = stdout.trim().split(/\r?\n/);
        if (lines.length < 2) return callback(null);
        const parts = lines[lines.length - 1].trim().split(/\s+/);
        if (parts.length < 5) return callback(null);

        const total = Number(parts[1]) * 1024;
        const used = Number(parts[2]) * 1024;
        const available = Number(parts[3]) * 1024;
        const percent = Number(String(parts[4]).replace('%', ''));
        callback({ total, used, available, percent, mount: parts[5] || '/' });
    });
}

function emitDiskStats(socketTarget = io) {
    getDiskStats(stats => {
        socketTarget.emit('disk_stats', {
            ...stats,
            updatedAt: new Date().toISOString()
        });
    });
}

function updateCpuUsage() {
    const now = process.hrtime.bigint();
    const currentCpu = process.cpuUsage();
    const cpuMicros = (currentCpu.user - previousCpu.user) + (currentCpu.system - previousCpu.system);
    const wallMicros = Number(now - previousCpuWall) / 1000;
    const cores = Math.max(os.cpus().length, 1);
    cpuPercent = wallMicros > 0 ? Math.min(100, (cpuMicros / (wallMicros * cores)) * 100) : 0;
    previousCpu = currentCpu;
    previousCpuWall = now;
}

function extFromMime(mime = '') {
    const map = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
        'video/mp4': 'mp4',
        'video/3gpp': '3gp',
        'audio/ogg': 'ogg',
        'audio/mpeg': 'mp3',
        'audio/mp4': 'm4a',
        'audio/aac': 'aac',
        'application/pdf': 'pdf',
        'application/zip': 'zip',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'application/vnd.ms-powerpoint': 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx'
    };
    return map[mime] || 'bin';
}

function unwrapMessage(message) {
    let content = normalizeMessageContent(message) || message;
    let type = getContentType(content) || 'unknown';

    if (type === 'viewOnceMessage' || type === 'viewOnceMessageV2' || type === 'ephemeralMessage') {
        content = normalizeMessageContent(content) || content;
        type = getContentType(content) || 'unknown';
    }

    return { content, type };
}

function extractText(content) {
    return content?.conversation
        || content?.extendedTextMessage?.text
        || content?.imageMessage?.caption
        || content?.videoMessage?.caption
        || content?.documentMessage?.caption
        || content?.buttonsResponseMessage?.selectedDisplayText
        || content?.listResponseMessage?.title
        || content?.templateButtonReplyMessage?.selectedDisplayText
        || '';
}

function mediaInfo(type, content) {
    const mediaMap = {
        imageMessage: content?.imageMessage,
        videoMessage: content?.videoMessage,
        audioMessage: content?.audioMessage,
        documentMessage: content?.documentMessage,
        stickerMessage: content?.stickerMessage
    };
    const media = mediaMap[type];
    if (!media) return null;

    const mime = media.mimetype || 'application/octet-stream';
    return {
        type: type.replace('Message', ''),
        mimetype: mime,
        fileName: media.fileName || null,
        fileLength: Number(media.fileLength || 0),
        seconds: Number(media.seconds || 0),
        width: Number(media.width || 0),
        height: Number(media.height || 0),
        caption: media.caption || '',
        url: null,
        downloading: true
    };
}

async function saveIncomingMedia(msg, type, content, msgId) {
    const info = mediaInfo(type, content);
    if (!info) return null;

    if (info.fileLength && info.fileLength > MAX_MEDIA_BYTES) {
        return {
            ...info,
            downloading: false,
            skipped: true,
            error: 'Media terlalu besar untuk batas 25 MB.'
        };
    }

    try {
        const ext = info.fileName
            ? path.extname(info.fileName).replace('.', '').toLowerCase() || extFromMime(info.mimetype)
            : extFromMime(info.mimetype);
        const safeId = String(msgId).replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${Date.now()}_${safeId}.${ext}`;
        const filepath = path.join(MEDIA_DIR, filename);

        const stream = await downloadMediaMessage(
            msg,
            'stream',
            {},
            {
                logger: require('pino')({ level: 'silent' }),
                reuploadRequest: sock?.updateMediaMessage
            }
        );

        await new Promise((resolve, reject) => {
            let written = 0;
            const output = fs.createWriteStream(filepath);
            stream.on('data', chunk => {
                written += chunk.length;
                if (written > MAX_MEDIA_BYTES) {
                    stream.destroy(new Error('Media exceeds 25 MB limit'));
                }
            });
            stream.on('error', error => {
                output.destroy();
                reject(error);
            });
            output.on('error', reject);
            output.on('finish', resolve);
            stream.pipe(output);
        });

        return {
            ...info,
            url: `/media/${encodeURIComponent(filename)}`,
            downloading: false,
            skipped: false
        };
    } catch (error) {
        console.error('Media download error:', error.message);
        return {
            ...info,
            downloading: false,
            skipped: true,
            error: 'Media gagal diunduh dari WhatsApp.'
        };
    }
}

async function startWhatsApp(pairingType = 'qr', phoneNumber = '') {
    if (starting) return;
    starting = true;
    currentPairingType = pairingType;
    currentPhoneNumber = phoneNumber;

    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['Mac OS', 'Chrome', '121.0.0.0'],
            logger: require('pino')({ level: 'silent' }),
            syncFullHistory: false
        });

        sock.ev.on('creds.update', saveCreds);

        if (pairingType === 'code' && phoneNumber && !sock.authState?.creds?.registered && !state.creds.registered) {
            await delay(2000);
            try {
                const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
                let code = await sock.requestPairingCode(cleanPhone);
                code = code?.match(/.{1,4}/g)?.join('-') || code;
                io.emit('pairing_code', { code });
            } catch (err) {
                console.error('Gagal Request Pairing Code:', err);
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
                connectedAt = null;
                emitStatus({ status: 'disconnected', message: shouldReconnect ? 'Koneksi terputus, mencoba reconnect...' : 'Sesi logout.' });

                sock = null;

                if (shouldReconnect) {
                    setTimeout(() => startWhatsApp(currentPairingType, currentPhoneNumber), 1500);
                }
            } else if (connection === 'open') {
                connectedAt = new Date().toISOString();
                emitStatus({ status: 'connected', message: 'WhatsApp Terhubung!' });
            }
        });

        sock.ev.on('messages.upsert', async (m) => {
            for (const msg of m.messages || []) {
                if (!msg?.message || msg.key.fromMe) continue;

                const msgId = msg.key.id;
                if (!msgId) continue;

                const sender = msg.key.participant || msg.key.remoteJid || '';
                const pushName = msg.pushName || cleanJid(sender) || 'Unknown';
                const { content, type } = unwrapMessage(msg.message);
                const text = extractText(content);

                const payload = {
                    id: msgId,
                    sender,
                    pushName,
                    text,
                    type,
                    timestamp: msg.messageTimestamp
                        ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
                        : new Date().toISOString(),
                    isDeleted: false,
                    media: mediaInfo(type, content)
                };

                messageStore.set(msgId, payload);
                while (messageStore.size > MAX_MESSAGE_STORE) {
                    const firstKey = messageStore.keys().next().value;
                    messageStore.delete(firstKey);
                }

                // Kirim pesan terlebih dahulu supaya UI tetap responsif.
                io.emit('new_message', payload);

                // Media diunduh setelah event pesan dikirim.
                if (payload.media) {
                    const savedMedia = await saveIncomingMedia(msg, type, content, msgId);
                    const stored = messageStore.get(msgId);
                    if (stored) {
                        stored.media = savedMedia;
                        io.emit('message_media_ready', {
                            id: msgId,
                            media: savedMedia
                        });
                    }
                }
            }
        });

        sock.ev.on('messages.update', async (updates) => {
            for (const update of updates) {
                if (update.update?.message?.protocolMessage?.type === 0) {
                    const deletedKey = update.update.message.protocolMessage.key;
                    const originalMsg = messageStore.get(deletedKey.id);

                    if (originalMsg) {
                        originalMsg.isDeleted = true;
                        io.emit('message_deleted', originalMsg);
                    } else {
                        io.emit('message_deleted', {
                            id: deletedKey.id,
                            sender: deletedKey.remoteJid || '',
                            pushName: 'Unknown',
                            text: '',
                            type: 'unknown',
                            timestamp: new Date().toISOString(),
                            isDeleted: true,
                            media: null
                        });
                    }
                }
            }
        });

    } catch (error) {
        console.error('Gagal start WhatsApp:', error);
        sock = null;
        emitStatus({ status: 'disconnected', message: 'Gagal memulai WhatsApp session.' });
    } finally {
        starting = false;
    }
}

io.on('connection', (client) => {
    // Kirim state terkini hanya ke client baru.
    client.emit('status', {
        ...lastStatus,
        ...getAccountInfo(),
        updatedAt: new Date().toISOString()
    });

    emitMonitor(client);
    emitDiskStats(client);

    if (!sock && !starting) {
        startWhatsApp('qr');
    }

    client.on('request_pairing_code', async ({ phoneNumber } = {}) => {
        if (!phoneNumber) return;

        io.emit('pairing_loading', { message: 'Membuat Pairing Code...' });
        await startWhatsApp('code', phoneNumber);
    });

    client.on('monitor_ping', (clientTime) => {
        client.emit('monitor_pong', clientTime);
    });

    client.on('logout', async () => {
        try {
            if (sock) {
                try {
                    await sock.logout();
                } catch (error) {
                    console.error('Logout WhatsApp:', error.message);
                }
            }

            sock = null;
            connectedAt = null;
            messageStore.clear();

            if (fs.existsSync('auth_info_baileys')) {
                fs.rmSync('auth_info_baileys', { recursive: true, force: true });
            }

            emitStatus({ status: 'disconnected', message: 'Berhasil Logout & Sesi Dihapus' });
        } catch (e) {
            console.error(e);
            client.emit('pairing_error', { message: 'Gagal logout session.' });
        }
    });
});

setInterval(() => {
    updateCpuUsage();
    emitMonitor();
    emitDiskStats();
}, 3000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server aktif di port ${PORT}`);
});
