// --- START: EBML Helper Functions Adapted for Browser ---

// Fungsi-fungsi ini adalah adaptasi *minimal* dari ebml.js dan mkvExtract.js 
// yang diperlukan untuk memproses ArrayBuffer di browser.
// CATATAN PENTING: Implementasi EBML penuh sangat kompleks.
// Adaptasi ini mengasumsikan struktur EBML dasar yang diperlukan untuk menemukan header subtitle ASS/SSA.

function padZeroes(arr) {
    const len = Math.ceil(arr.length / 2) * 2;
    const output = new Uint8Array(len);
    output.set(arr, len - arr.length);
    return output.buffer;
}

function readUnsignedInteger(data) {
    const view = new DataView(data);
    if (data.byteLength === 2) return view.getUint16(0);
    if (data.byteLength === 4) return view.getUint32(0);
    // Tambahkan penanganan untuk integer yang lebih besar jika diperlukan oleh EBML ID/Size
    if (data.byteLength === 8) {
        // Fallback untuk integer 8-byte (hanya ambil 32 bit bawah untuk penyederhanaan)
        return view.getUint32(4);
    }
    return 0;
}

function readVint(buffer, offset) {
    if (offset >= buffer.length) return null;
    let length = 1;
    let value = buffer[offset];

    if (value & 0x80) { // 1 byte
        value &= 0x7F;
        length = 1;
    } else if (value & 0x40) { // 2 bytes
        if (offset + 1 >= buffer.length) return null;
        value &= 0x3F;
        value = (value << 8) | buffer[offset + 1];
        length = 2;
    } else if (value & 0x20) { // 3 bytes
        if (offset + 2 >= buffer.length) return null;
        value &= 0x1F;
        value = (value << 8) | buffer[offset + 1];
        value = (value << 8) | buffer[offset + 2];
        length = 3;
    } else if (value & 0x10) { // 4 bytes (Umum untuk ukuran elemen besar)
        if (offset + 3 >= buffer.length) return null;
        value &= 0x0F;
        value = (value << 8) | buffer[offset + 1];
        value = (value << 8) | buffer[offset + 2];
        value = (value << 8) | buffer[offset + 3];
        length = 4;
    } else {
        // Di luar EBML VINT yang didukung secara umum (max 8 byte)
        return null;
    }

    return { value: value, length: length };
}

function formatTimestampSRT(timestamp) {
    // Digunakan untuk konversi waktu ASS/SSA/SRT (tidak di sini, tapi dipertahankan untuk kompatibilitas nama)
    const seconds = timestamp / 1000;
    let hh = Math.floor(seconds / 3600);
    let mm = Math.floor((seconds - hh * 3600) / 60);
    let ss = (seconds - hh * 3600 - mm * 60).toFixed(3);

    if (hh < 10) hh = `0${hh}`;
    if (mm < 10) mm = `0${mm}`;
    if (ss < 10) ss = `0${ss}`;

    return `${hh}:${mm}:${ss}`;
}

// --- END: EBML Helper Functions Adapted for Browser ---


/**
 * Fungsi utama untuk mengekstrak subtitle ASS/SSA dari ArrayBuffer file MKV.
 * Ini adalah adaptasi parsial dari mkvExtract.js tanpa ketergantungan Node.js.
 * * @param {File} file File MKV yang di-drop.
 * @returns {Promise<Array<{name: string, language: string, content: string, codec: string}>>} Array of subtitle tracks.
 */
window.mkvExtractAndLoad = (file) => {
    return new Promise((resolve, reject) => {
        if (!window.SubtitlesOctopus) {
            return reject(new Error("SubtitlesOctopus.js not loaded."));
        }

        const reader = new FileReader();
        const decoder = new TextDecoder('utf-8');
        
        reader.onload = (event) => {
            const buffer = event.target.result;
            const uint8Array = new Uint8Array(buffer);
            
            // Variabel untuk menyimpan hasil yang diekstrak
            const tracks = [];
            let subtitleContent = null;
            let currentTrackNum = null;
            let currentTrackCodec = null;
            let isParsingTrackEntry = false;

            // --- Logika Parsing EBML Header (Sederhana & Heuristik) ---
            // Kita hanya mencari elemen Tracks (0x1654AE6B) dan TrackEntry (0xAE) di awal file
            
            let offset = 0;
            const maxHeaderSize = 1024 * 1024; // Cukup 1MB pertama

            try {
                while (offset < uint8Array.length && offset < maxHeaderSize) {
                    let idVint = readVint(uint8Array, offset);
                    if (!idVint) break;

                    let idHex = uint8Array.slice(offset, offset + idVint.length).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
                    let dataVintOffset = offset + idVint.length;
                    
                    let sizeVint = readVint(uint8Array, dataVintOffset);
                    if (!sizeVint) break;
                    
                    let dataStart = dataVintOffset + sizeVint.length;
                    let dataEnd = dataStart + sizeVint.value;

                    // Pastikan data tidak melebihi batas buffer
                    if (dataEnd > uint8Array.length) {
                        dataEnd = uint8Array.length;
                        sizeVint.value = dataEnd - dataStart;
                    }

                    // Elemen Penting (Contoh Hex ID):
                    // EBML (4286)
                    // Segment (18538067)
                    // Tracks (1654AE6B) - Master Element
                    // TrackEntry (AE) - Master Element
                    // TrackNumber (D7) - Unsigned Int
                    // CodecID (86) - String
                    // CodecPrivate (63A2) - Binary/Master (ASS Header data)
                    // SimpleBlock (A3) - Data Element (Subtitle Frame)

                    // Mencari TrackEntry (0xAE) dan Codec/Number
                    if (idHex === '1654ae6b' || idHex === '4286') {
                        // Master element (Tracks atau EBML) - Lanjutkan
                        offset = dataStart;
                        continue;
                    }
                    
                    if (idHex === 'ae') { // TrackEntry
                        isParsingTrackEntry = true;
                        let trackEntryOffset = dataStart;
                        let trackEntryEnd = dataEnd;
                        
                        let tempTrack = { name: 'Unknown', language: 'und', codec: null, content: null, number: null };
                        
                        // Coba parse sub-elemen di dalam TrackEntry
                        while (trackEntryOffset < trackEntryEnd) {
                            let subIdVint = readVint(uint8Array, trackEntryOffset);
                            if (!subIdVint) break;

                            let subIdHex = uint8Array.slice(trackEntryOffset, trackEntryOffset + subIdVint.length).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
                            let subDataVintOffset = trackEntryOffset + subIdVint.length;
                            
                            let subSizeVint = readVint(uint8Array, subDataVintOffset);
                            if (!subSizeVint) break;
                            
                            let subDataStart = subDataVintOffset + subSizeVint.length;
                            let subDataEnd = subDataStart + subSizeVint.value;
                            
                            let subData = uint8Array.slice(subDataStart, subDataEnd);

                            if (subIdHex === 'd7') { // TrackNumber
                                tempTrack.number = readUnsignedInteger(subData.buffer);
                            } else if (subIdHex === '86') { // CodecID
                                tempTrack.codec = decoder.decode(subData).trim();
                            } else if (subIdHex === '63a2') { // CodecPrivate (Sering berisi ASS Header)
                                // Simpan data mentah CodecPrivate
                                tempTrack.content = decoder.decode(subData); 
                            } else if (subIdHex === '536e') { // Name
                                tempTrack.name = decoder.decode(subData).trim();
                            }
                            
                            trackEntryOffset = subDataEnd;
                        }

                        if (tempTrack.codec && tempTrack.codec.includes('S_TEXT/ASS')) {
                            tracks.push(tempTrack);
                        }
                        
                        isParsingTrackEntry = false;
                        offset = dataEnd;
                        continue;
                    }
                    
                    // Lewati elemen lain
                    offset = dataEnd;
                }
            } catch (e) {
                console.error("[MKV EBML Parsing] Gagal membaca header:", e);
                // Lanjutkan, mungkin subtitle ada di dalam block (walaupun tidak direkomendasikan)
            }


            if (tracks.length === 0) {
                 // Gagal deteksi header. Kembalikan array kosong.
                 console.warn("[MKV Extract] Deteksi Header EBML gagal. Mencoba mencari block subtitle secara langsung.");
                 // Di sini, Anda bisa menambahkan logika yang lebih dalam untuk mem-parsing block subtitle (A3)
                 // jika header gagal, tetapi ini sangat tidak efisien dan rentan error.
                 return resolve([]);
            }
            
            // Hanya mengembalikan metadata untuk track yang didukung (ASS/SSA)
            resolve(tracks);
        };

        reader.onerror = () => {
            reject(new Error("File read error"));
        };
        
        // Baca hanya header (misal 5MB) untuk ekstraksi track.
        const CHUNK_SIZE = 5 * 1024 * 1024; 
        reader.readAsArrayBuffer(file.slice(0, CHUNK_SIZE));
    });
};

// --- END: MKV Subtitle Extraction Adapter ---