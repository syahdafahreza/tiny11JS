/**
 * MKVExtractor - Kelas utilitas untuk melakukan probing dan ekstraksi stream dari file MKV
 * menggunakan Web Workers FFprobe dan FFmpeg (diasumsikan tersedia secara eksternal).
 *
 * Catatan Penting:
 * 1. Pustaka StreamSaver HARUS dimuat secara terpisah sebelum menggunakan script ini.
 * 2. File worker (ffprobe-worker-mkve.js, ffmpeg-worker-mkve.js, dan file .wasm terkait)
 * harus tersedia di jalur yang benar (secara default, di direktori yang sama).
 */

(function (global) {
    // --- Konfigurasi dan Konstanta ---
    // Path relatif ini akan mencari di direktori yang sama dengan skrip utama.
    const FFPROBE_WORKER_PATH = 'ffprobe-worker-mkve.js';
    const FFMPEG_WORKER_PATH = 'ffmpeg-worker-mkve.js';

    // --- Helper untuk Mengelola Web Worker ---

    /**
     * Kelas dasar untuk mengelola komunikasi dengan Web Worker.
     */
    class WorkerService {
        /**
         * @param {string} workerUrl - URL dari Web Worker.
         */
        constructor(workerUrl) {
            // Menggunakan URL relatif yang akan diresolusi berdasarkan path script.
            this.worker = new Worker(workerUrl);
            this.resolvers = new Map();
            this.idCounter = 0;

            this.worker.onmessage = this.handleMessage.bind(this);
            this.worker.onerror = (e) => console.error("Worker Error:", e);
        }

        /**
         * Menangani pesan dari worker.
         * @param {MessageEvent} e
         */
        handleMessage(e) {
            const { id, type, payload } = e.data;
            const resolver = this.resolvers.get(id);

            if (type === 'progress') {
                // Handle progress/status updates separately if needed,
                // but for simplicity, we only resolve on 'done' or 'error'.
                return;
            }

            if (resolver) {
                if (type === 'done') {
                    resolver.resolve(payload);
                } else if (type === 'error') {
                    resolver.reject(new Error(payload.message || 'Worker operation failed.'));
                }
                this.resolvers.delete(id);
            }
        }

        /**
         * Mengirim pesan ke worker dan menunggu hasilnya.
         * @param {string} command - Perintah untuk worker.
         * @param {any} payload - Payload data.
         * @returns {Promise<any>}
         */
        postMessage(command, payload = {}) {
            return new Promise((resolve, reject) => {
                const id = this.idCounter++;
                this.resolvers.set(id, { resolve, reject });
                this.worker.postMessage({ id, command, payload });
            });
        }

        /**
         * Mengakhiri worker.
         */
        terminate() {
            this.worker.terminate();
        }
    }

    // --- Kelas Utama MKVExtractor ---

    class MKVExtractor {
        /**
         * @param {string} probeWorkerUrl - Jalur ke ffprobe worker.
         * @param {string} ffmpegWorkerUrl - Jalur ke ffmpeg worker.
         */
        constructor(probeWorkerUrl = FFPROBE_WORKER_PATH, ffmpegWorkerUrl = FFMPEG_WORKER_PATH) {
            this.probeWorkerUrl = probeWorkerUrl;
            this.ffmpegWorkerUrl = ffmpegWorkerUrl;
            this.ffprobe = new WorkerService(this.probeWorkerUrl);
            this.ffmpegs = new Map(); // Untuk mengelola beberapa FFmpeg worker (opsional, tapi disiapkan)
        }

        /**
         * Mendapatkan informasi stream dari file MKV.
         * @param {File} file - Objek File yang akan di-probe.
         * @returns {Promise<object>} Informasi stream dari ffprobe.
         */
        async probeFile(file) {
            // Perhatian: Setelah pemanggilan ini, worker ffprobe akan di-terminate.
            // Anda mungkin perlu memanggil probeFile lagi jika ingin mem-probe
            // file yang berbeda tanpa membuat instance MKVExtractor baru.

            // Buat instance worker baru karena yang lama mungkin sudah di-terminate
            this.ffprobe = new WorkerService(this.probeWorkerUrl);

            try {
                // Inisialisasi worker dengan file
                await this.ffprobe.postMessage('init', {
                    file: file,
                    fileName: file.name
                });

                // Dapatkan informasi stream
                const info = await this.ffprobe.postMessage('probe', { file: file });

                // Hentikan worker setelah selesai
                this.ffprobe.terminate();

                return info;
            } catch (error) {
                console.error('Gagal probing file:', error);
                // Pastikan worker di-terminate meski ada error
                this.ffprobe.terminate();
                throw new Error('Gagal mendapatkan informasi stream dari file.');
            }
        }

        /**
         * Melakukan ekstraksi stream dari file dan menyimpannya.
         * Jika lebih dari satu stream, akan dibuat file ZIP (saat ini tidak didukung).
         *
         * @param {File} inputFile - Objek File MKV input.
         * @param {Array<object>} streamsToExtract - Array objek stream yang akan diekstrak.
         * Format: [{ index: 0, filename: 'video.h264', codec_type: 'video', codec_name: 'h264' }, ...]
         * @param {function} onProgress - Callback untuk pembaruan progres (0-100).
         * @returns {Promise<void>}
         */
        async extractAndSave(inputFile, streamsToExtract, onProgress = () => {}) {
            if (!global.streamSaver) {
                throw new Error("StreamSaver is not loaded. Please load it before calling extractAndSave.");
            }

            if (streamsToExtract.length === 0) {
                return;
            }

            // Batasan: Implementasi ini hanya mendukung ekstraksi satu stream karena
            // kompleksitas ZipStream dan multiple output FFmpeg di Web Worker yang
            // di-pipe ke stdout.
            if (streamsToExtract.length > 1) {
                throw new Error("Ekstraksi multi-stream/ZIP saat ini tidak didukung di implementasi satu file ini. Harap pilih satu stream saja.");
            }

            const stream = streamsToExtract[0];
            const outputFileName = stream.filename;

            // Dapatkan output stream dari streamsaver
            const fileStream = global.streamSaver.createWriteStream(outputFileName, {
                size: inputFile.size, // Gunakan ukuran file input sebagai perkiraan
                writableStrategy: undefined,
                readableStrategy: undefined
            });

            // Writer untuk menulis ke streamSaver
            const writer = fileStream.getWriter();

            // Setup FFmpeg Worker
            const ffmpegWorker = new WorkerService(this.ffmpegWorkerUrl);
            this.ffmpegs.set('main', ffmpegWorker);

            // Konfigurasi argumen FFmpeg (untuk single stream)
            const ffmpegArgs = [
                '-i', 'input.mkv',
                '-map', `0:${stream.index}`,
                '-c', 'copy', // Salin stream tanpa re-encode
                '-f', this.getOutputFormat(stream), // Tentukan format output
                '-y', // Timpa file output
                'pipe:1' // Output ke stdout/pipe
            ];

            try {
                // 1. Inisialisasi Worker dengan file input
                await ffmpegWorker.postMessage('init', {
                    file: inputFile,
                    fileName: 'input.mkv'
                });

                onProgress(5); // Inisialisasi Worker Selesai

                // 2. Eksekusi FFmpeg (Mode Single Stream)
                const response = await ffmpegWorker.postMessage('extract', {
                    args: ffmpegArgs,
                });

                // 3. Proses output
                if (response.output) {
                    const outputData = response.output.find(o => o.path === 'pipe:1');
                    if (outputData && outputData.buffer) {
                        const arrayBuffer = outputData.buffer;
                        // Tulis data biner ke StreamSaver
                        await writer.write(new Uint8Array(arrayBuffer));
                    }
                }

                onProgress(100);

            } catch (error) {
                console.error('Gagal Ekstraksi MKV:', error);
                // Coba hentikan streamSaver jika ada error
                await writer.abort();
                throw new Error('Ekstraksi gagal: ' + error.message);
            } finally {
                // Tutup writer dan worker
                await writer.close();
                ffmpegWorker.terminate();
                this.ffmpegs.delete('main');
            }
        }

        /**
         * Helper: Mendapatkan format output berdasarkan tipe stream.
         * @param {object} stream
         */
        getOutputFormat(stream) {
            switch (stream.codec_type) {
                case 'video':
                    // Elementary stream formats
                    if (stream.codec_name === 'h264') return 'h264';
                    if (stream.codec_name === 'hevc') return 'hevc';
                    if (stream.codec_name === 'mjpeg') return 'mjpeg';
                    return 'rawvideo';
                case 'audio':
                    // Elementary stream formats
                    if (stream.codec_name === 'aac') return 'adts'; // AAC raw stream container
                    if (stream.codec_name === 'ac3') return 'ac3';
                    if (stream.codec_name === 'dts') return 'dts';
                    if (stream.codec_name === 'eac3') return 'eac3';
                    if (stream.codec_name === 'truehd') return 'truehd';
                    if (stream.codec_name === 'mp3') return 'mp3';
                    return 'rawaudio'; // Default fallback
                case 'subtitle':
                    // Subtitle formats
                    if (stream.codec_name === 'subrip') return 'srt';
                    if (stream.codec_name === 'ass') return 'ass';
                    if (stream.codec_name === 'mov_text') return 'mov_text';
                    return 'rawsub'; // Default fallback
                case 'attachment':
                    // Biasanya, lampiran (seperti font) dapat diekstrak sebagai raw data.
                    return 'rawsub';
                default:
                    return 'raw';
            }
        }
    }

    // Ekspor kelas ke objek global (window)
    global.MKVExtractor = MKVExtractor;
})(window);