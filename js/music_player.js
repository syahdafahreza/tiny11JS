// music_player.js
// Logic untuk music_player.html DAN equalizer.html
// DIBAWAH INI MENGGUNAKAN AudioContext.createBufferSource()

// =================================================================
// --- BAGIAN 1: VARIABEL DAN KONFIGURASI GLOBAL ---
// =================================================================

// Elemen DOM untuk Music Player (diperlukan untuk music_player.html)
const header = document.getElementById('music-window-header');
const closeBtn = document.getElementById('close-btn');
const minimizeBtn = document.getElementById('minimize-btn');
const maximizeBtn = document.getElementById('maximize-btn');
const musicDropZone = document.getElementById('music-drop-zone');
// const audioPlayer = document.getElementById('audio-player'); // Dihapus, tidak digunakan lagi
const albumArt = document.getElementById('album-art');
const albumArtPlaceholder = document.getElementById('album-art-placeholder');
const songTitle = document.getElementById('song-title');
const songArtist = document.getElementById('song-artist');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const rewindBtn = document.getElementById('rewind-btn');
const forwardBtn = document.getElementById('forward-btn');
const stopBtn = document.getElementById('stop-btn');
const equalizerBtn = document.getElementById('equalizer-btn');

// Elemen Slider Progres & Volume
const progressBarContainer = document.getElementById('progress-slider-container');
const progressTrack = document.getElementById('progress-track');
const progressThumb = document.getElementById('progress-thumb');
const volumeSliderContainer = document.getElementById('volume-slider-container');
const volumeTrack = document.getElementById('volume-track');
const volumeThumb = document.getElementById('volume-thumb');

// --- Variabel State AudioContext & EQ ---
let isWindowDragging = false;
let audioContext; 
let analyser;
let currentSource = null; // AudioBufferSourceNode yang sedang aktif
let audioBuffer = null;   // Audio data yang telah didekode
let volumeGain; 
let eqFilters = [];

// State Playback untuk BufferSource
let isPlaying = false;
let startTime = 0;      // Waktu AudioContext saat pemutaran dimulai
let pausedAt = 0;       // Waktu lagu (detik) saat dijeda
let duration = 0;       // Durasi total lagu (detik)
let progressAnimationId; // ID untuk requestAnimationFrame
let currentVolume = 1.0; // Volume (0.0 - 1.0)

// Konfigurasi EQ
const MAX_GAIN = 12.0; 
const MIN_GAIN = -12.0; 
const Q_FACTOR = 1.414; 
const FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]; // 10 Band
let eqGains = new Array(FREQUENCIES.length).fill(0.0); 
let isEqEnabled = true; 
let isAudioSetup = false;
let currentAlbumArtUrl = null;
let dataArray, bufferLength; 

// --- PRESET EQ ---
const EQ_PRESETS = {
    flat: { 
        31: 0.0, 62: 0.0, 125: 0.0, 250: 0.0, 500: 0.0, 
        1000: 0.0, 2000: 0.0, 4000: 0.0, 8000: 0.0, 16000: 0.0 
    },
    rock: { 
        31: 4.0, 62: 2.0, 125: -2.0, 250: -4.0, 500: -2.0, 
        1000: 2.0, 2000: 4.0, 4000: 6.0, 8000: 8.0, 16000: 6.0 
    },
    pop: { 
        31: -2.0, 62: 2.0, 125: 4.0, 250: 2.0, 500: 0.0, 
        1000: 0.0, 2000: 0.0, 4000: 2.0, 8000: 4.0, 16000: 6.0 
    },
    classic: { 
        31: 0.0, 62: 0.0, 125: 2.0, 250: 4.0, 500: 2.0, 
        1000: 0.0, 2000: -2.0, 4000: -4.0, 8000: -2.0, 16000: 0.0 
    },
    custom: null, 
};
let currentPreset = 'flat'; 
let currentGainValues = EQ_PRESETS.flat; 


// =================================================================
// --- BAGIAN 2: LOGIKA WEB AUDIO API & ROUTING (BUFFER SOURCE) ---
// =================================================================

/**
 * Mengatur semua node Web Audio API (Filter, Analyser, Volume Gain).
 * Audio Routing: BufferSource -> Filter Chain (10 Band) -> Analyser -> VolumeGain -> Destination
 */
function setupAudioContext() {
    if (isAudioSetup) return true;
    
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') { audioContext.resume(); }
    } catch(e) {
        console.error("[Music Player] Gagal inisialisasi AudioContext:", e);
        return false;
    }

    // Node Filter (10 Band)
    eqFilters = [];
    FREQUENCIES.forEach((freq) => {
        const filter = audioContext.createBiquadFilter();
        filter.type = "peaking"; 
        filter.frequency.setValueAtTime(freq, audioContext.currentTime);
        filter.Q.setValueAtTime(Q_FACTOR, audioContext.currentTime);
        // Tetapkan nilai gain awal secara langsung
        filter.gain.value = 0.0; 
        eqFilters.push(filter);
    });

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    volumeGain = audioContext.createGain();
    // Atur volume awal secara langsung
    volumeGain.gain.value = currentVolume; 
    
    // Sambungan Node (Ini akan menjadi rantai target)
    let lastNode = null; 
    
    // Rantai Filter -> Analyser -> Volume Gain -> Destination
    if (eqFilters.length > 0) {
        lastNode = eqFilters[0];
        for (let i = 0; i < eqFilters.length - 1; i++) {
            eqFilters[i].connect(eqFilters[i+1]);
        }
        eqFilters[eqFilters.length - 1].connect(analyser);
    } else {
        lastNode = analyser; // Langsung ke analyser jika tidak ada filter
    }
    
    analyser.connect(volumeGain);
    volumeGain.connect(audioContext.destination);
    
    isAudioSetup = true;
    applyEqGains(eqGains, isEqEnabled); 
    if (window.location.pathname.endsWith('music_player.html')) {
        sendVisualizerData(); 
    }
    
    console.log('[Music Player] Audio Context dan rantai Equalizer 10-Band berhasil diinisialisasi.');
    return true;
}

/**
 * Memperbarui nilai gain pada node Equalizer SECARA INSTAN.
 * Logika ini meniru perilaku "live EQ" dari contoh yang berfungsi.
 */
function applyEqGains(gains, enabled) {
    if (!isAudioSetup || !audioContext) {
        eqGains = gains;
        isEqEnabled = enabled;
        return; 
    }

    eqGains = gains;
    isEqEnabled = enabled;
    
    // Ubah nilai gain secara langsung (INSTAN)
    eqFilters.forEach((filter, index) => {
        const uiGainDb = eqGains[index]; 
        const filterGainDb = enabled ? uiGainDb : 0.0; 
        
        // PENTING: Mengganti setTargetAtTime dengan set value langsung
        filter.gain.value = filterGainDb;
    });

    // console.log(`[Music Player] EQ state applied. Enabled: ${enabled}`);
}

/**
 * Mengontrol Volume Gain Node SECARA INSTAN.
 * @param {number} volume Nilai volume (0.0 hingga 1.0)
 */
function handleVolumeChange(volume) {
    currentVolume = volume; // Simpan state volume
    if (isAudioSetup && volumeGain && audioContext) {
        // PENTING: Mengganti setTargetAtTime dengan set value langsung
        volumeGain.gain.value = volume;
    }
}

// =================================================================
// --- BAGIAN 3: LOGIKA PLAYBACK (BUFFER SOURCE) ---
// =================================================================

/**
 * Menghentikan source yang sedang berjalan (jika ada)
 */
function stopCurrentSource() {
    if (currentSource) {
        cancelAnimationFrame(progressAnimationId);
        currentSource.onended = null;
        try {
            // Memanggil stop pada BufferSourceNode yang sedang aktif
            currentSource.stop(0); 
        } catch(e) {
            console.warn('[Music Player] Error stopping audio source:', e);
        }
        currentSource.disconnect();
        currentSource = null;
    }
}

/**
 * Memutar AudioBuffer dari waktu tertentu.
 * @param {number} offset Waktu (detik) untuk memulai pemutaran.
 */
async function playAudio(offset = pausedAt) {
    if (!audioBuffer) return;
    
    stopCurrentSource(); // Hentikan source sebelumnya

    // Buat source node baru
    currentSource = audioContext.createBufferSource();
    currentSource.buffer = audioBuffer;
    
    // Hubungkan source ke rantai filter pertama atau analyser
    if (eqFilters.length > 0) {
        currentSource.connect(eqFilters[0]);
    } else {
        currentSource.connect(analyser); 
    }

    // Pastikan AudioContext berjalan
    if (audioContext.state !== 'running') {
        await audioContext.resume();
    }
    
    // Simpan status playback
    startTime = audioContext.currentTime;
    pausedAt = offset;
    isPlaying = true;

    try {
        currentSource.start(0, offset); 
    } catch (e) {
         console.error('[Music Player] Error starting audio buffer source:', e);
         isPlaying = false;
         return;
    }
    
    // Set listener saat lagu selesai
    currentSource.onended = (e) => {
        if (e.target.buffer === audioBuffer && isPlaying) {
             // Pastikan onended dipicu oleh selesai normal, bukan stop()
             // Jeda/Stop playback setelah selesai
             if (audioContext.currentTime - startTime + pausedAt >= duration) {
                 stopPlaybackAndReset();
             }
        }
    };
    
    // Mulai animasi progress bar
    cancelAnimationFrame(progressAnimationId); 
    progressAnimationId = requestAnimationFrame(updateProgress);
    
    updatePlayPauseUI(true);
}

/**
 * Menjeda playback.
 */
async function pauseAudio() {
    if (!isPlaying) return;
    
    // Hitung posisi dijeda
    pausedAt = pausedAt + (audioContext.currentTime - startTime);
    isPlaying = false;
    stopCurrentSource();
    
    // PENTING: Hapus suspend(). Biarkan AudioContext tetap 'running'
    // agar filter EQ tetap aktif dan dapat diubah secara 'live' dari jendela equalizer.
    if (audioContext.state === 'running') {
        // Cukup hentikan sumber, jangan tangguhkan konteks.
        // Jika konteks ditangguhkan, perubahan EQ tidak akan berfungsi.
    }
    
    updatePlayPauseUI(false);
}

/**
 * Menghentikan playback dan mereset posisi.
 */
function stopPlaybackAndReset() {
    stopCurrentSource();
    pausedAt = 0;
    isPlaying = false;
    
    // Reset UI
    updateThumbAndProgress(0);
    currentTimeEl.textContent = formatTime(0);
    updatePlayPauseUI(false);
    
    // Secara opsional, tangguhkan konteks saat Stop total untuk menghemat daya.
    if (audioContext && audioContext.state === 'running') {
        audioContext.suspend();
    }
}

// =================================================================
// --- BAGIAN 4: LOGIKA UI/UX (Diadaptasi) ---
// =================================================================

/**
 * Fungsi untuk memperbarui UI tombol Play/Pause.
 * @param {boolean} playing Status sedang bermain atau tidak.
 */
function updatePlayPauseUI(playing) {
    isPlaying = playing;
    if (playing) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }
}

/**
 * Memperbarui progress bar dan waktu.
 */
function updateProgress() {
    if (!isPlaying || !audioBuffer) return;

    let elapsed = pausedAt + (audioContext.currentTime - startTime);

    if (elapsed >= duration) {
        stopPlaybackAndReset();
        return;
    }

    // Update slider
    const percent = (elapsed / duration) * 100;
    updateThumbAndProgress(percent);
    // Update waktu
    currentTimeEl.textContent = formatTime(elapsed);
    
    progressAnimationId = requestAnimationFrame(updateProgress);
}


// --- Fungsi Pemuatan File (DIREVISI) ---

/**
 * Fungsi Utama untuk memuat file audio yang di-drop.
 * File dibaca sebagai ArrayBuffer dan didekode.
 */
async function loadAndPlayMusic(file) {
    console.log('[Music Player] Starting loadAndPlayMusic for file:', file.name);
    
    if (!isAudioSetup) {
        setupAudioContext();
        if (!isAudioSetup) return;
    }
    
    // Pastikan AudioContext berjalan sebelum decoding
    if (audioContext.state !== 'running') {
         await audioContext.resume();
    }


    // Tampilkan loading
    songTitle.textContent = `Loading: ${file.name}...`;
    songArtist.textContent = 'Decoding Audio Buffer...';
    
    // 1. Baca File sebagai ArrayBuffer
    const reader = new FileReader();
    const arrayBuffer = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    }).catch(e => {
        console.error("Error reading file:", e);
        songTitle.textContent = 'Error Loading File';
        songArtist.textContent = 'Check console for details.';
        return null;
    });

    if (!arrayBuffer) return;

    // 2. Decode ArrayBuffer menjadi AudioBuffer
    try {
        const newAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioBuffer = newAudioBuffer;
        duration = audioBuffer.duration;
        durationEl.textContent = formatTime(duration);
    } catch (e) {
        console.error("Error decoding audio data:", e);
        songTitle.textContent = 'Error Decoding Audio';
        songArtist.textContent = 'Unsupported file format or corrupted file.';
        return;
    }
    
    // 3. Muat Metadata (Sama seperti sebelumnya)
    // ... (Logika jsmediatags, album art, dan notifikasi media tetap sama)
    const fileName = file.name.replace(/\.[^/.]+$/, ""); 
    let [artist, title] = fileName.split(' - '); 
    if (!title) { title = artist; artist = 'Unknown Artist'; }
    songTitle.textContent = title.trim();
    songArtist.textContent = artist.trim();

    if (currentAlbumArtUrl) { URL.revokeObjectURL(currentAlbumArtUrl); } 
    albumArtPlaceholder.style.display = 'none';
    albumArt.style.display = 'block';
    const defaultIcon = "https://img.icons8.com/fluency/96/000000/apple-music.png";
    albumArt.src = defaultIcon;
    
    window.jsmediatags.read(file, {
        onSuccess: function (tag) {
            const tags = tag.tags;
            songTitle.textContent = tags.title || title.trim();
            songArtist.textContent = tags.artist || artist.trim();

            const picture = tags.picture;
            if (picture) {
                const blob = new Blob([new Uint8Array(picture.data)], { type: picture.format });
                currentAlbumArtUrl = URL.createObjectURL(blob);
                albumArt.src = currentAlbumArtUrl; 
            } 
        },
        onError: function (error) {
            console.warn("Error reading metadata:", error);
        }
    });

    // 4. Mulai Putar
    playAudio(0);
}

// --- Kontrol Playback & Slider (DIREVISI) ---

function seekAudio(clientX) {
    if (!audioBuffer) return;
    const percent = getPercentFromClientX(progressBarContainer, clientX);
    updateThumbAndProgress(percent);
    
    const newTime = (percent / 100) * duration;

    if (isPlaying) {
        playAudio(newTime); // Mulai BufferSource baru dari posisi seek
    } else {
        pausedAt = newTime; // Update posisi dijeda
        currentTimeEl.textContent = formatTime(newTime);
        
        // Pastikan AudioContext aktif saat seek jika EQ sedang digunakan
        if (isAudioSetup && audioContext.state !== 'running') {
             audioContext.resume().catch(e => console.error("Resume failed on seek:", e));
        }
    }
}

function onSliderMove(clientX) {
    if (!audioBuffer) return;
    const percent = getPercentFromClientX(progressBarContainer, clientX);
    updateThumbAndProgress(percent);
    const newTime = (percent / 100) * duration;
    currentTimeEl.textContent = formatTime(newTime);
}

function setupMusicPlayerControls() {
    playPauseBtn.addEventListener('click', async () => {
        if (!audioBuffer) return;
        if (isPlaying) {
            pauseAudio();
        } else {
            // Jika context disuspend saat stop, kita harus resume di sini
            if (audioContext.state !== 'running') {
                 await audioContext.resume();
            }
            playAudio(pausedAt); // Lanjutkan dari pausedAt
        }
    });
    
    stopBtn.addEventListener('click', stopPlaybackAndReset);

    // ... (Kontrol lain tetap sama)
    equalizerBtn.addEventListener('click', () => {
        parent.postMessage({ action: 'open-app', appName: 'eq' }, '*');
        // Pastikan konteks dihidupkan/dilanjutkan saat EQ dibuka
        if (isAudioSetup && audioContext.state !== 'running') {
             audioContext.resume().catch(e => console.error("Resume failed on EQ open:", e));
        }
    });

    // Volume listener (dipanggil oleh setVolumeFromSlider)
    
    rewindBtn.addEventListener('click', () => { 
        if (!audioBuffer) return;
        const newTime = Math.max(0, pausedAt - 10);
        if (isPlaying) {
            playAudio(newTime); 
        } else {
            pausedAt = newTime;
            updateThumbAndProgress((newTime / duration) * 100);
            currentTimeEl.textContent = formatTime(newTime);
            
            // Pastikan AudioContext aktif saat seek jika EQ sedang digunakan
            if (isAudioSetup && audioContext.state !== 'running') {
                 audioContext.resume().catch(e => console.error("Resume failed on rewind:", e));
            }
        }
    });
    
    forwardBtn.addEventListener('click', () => { 
        if (!audioBuffer) return;
        const newTime = Math.min(duration, pausedAt + 10);
         if (isPlaying) {
            playAudio(newTime); 
        } else {
            pausedAt = newTime;
            updateThumbAndProgress((newTime / duration) * 100);
            currentTimeEl.textContent = formatTime(newTime);
            
            // Pastikan AudioContext aktif saat seek jika EQ sedang digunakan
            if (isAudioSetup && audioContext.state !== 'running') {
                 audioContext.resume().catch(e => console.error("Resume failed on forward:", e));
            }
        }
    });

    musicDropZone.addEventListener('dragover', (e) => { e.preventDefault(); musicDropZone.classList.add('drag-over'); });
    musicDropZone.addEventListener('dragleave', () => musicDropZone.classList.remove('drag-over'));
    musicDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        musicDropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('audio/')) loadAndPlayMusic(file);
    });
}

// ... (Fungsi Helper dan Listener Jendela tetap dipertahankan)

// Logika Slider Progres (tidak diubah)
let isSliderDragging = false;
function updateThumbAndProgress(percent) {
    percent = Math.max(0, Math.min(100, percent));
    const sliderWidth = progressBarContainer.offsetWidth;
    const px = (percent / 100) * sliderWidth;
    progressTrack.style.width = `${percent}%`;
    progressThumb.style.left = `${px}px`;
}
function getPercentFromClientX(container, clientX) {
    const sliderRect = container.getBoundingClientRect();
    const offsetX = clientX - sliderRect.left;
    const sliderWidth = container.offsetWidth;
    return (offsetX / sliderWidth) * 100;
}
function setupSliderEvents() {
    progressThumb.addEventListener('mousedown', (e) => {
        isSliderDragging = true;
        progressThumb.classList.add('active');
        document.body.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', (e) => {
        if (isSliderDragging) onSliderMove(e.clientX);
    });
    document.addEventListener('mouseup', (e) => {
        if (isSliderDragging) {
            isSliderDragging = false;
            progressThumb.classList.remove('active');
            document.body.style.cursor = 'default';
            seekAudio(e.clientX);
        }
    });
    progressBarContainer.addEventListener('mousedown', (e) => {
        if (e.target !== progressThumb) seekAudio(e.clientX);
    });
}
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const formattedSeconds = remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds;
    return `${minutes}:${formattedSeconds}`;
}

// Logika Slider Volume (sedikit dimodifikasi untuk memanggil handleVolumeChange)
let isVolumeSliderDragging = false;
function updateVolumeSlider(volume) { 
    const percent = volume * 100;
    const sliderWidth = volumeSliderContainer.offsetWidth;
    const px = (percent / 100) * sliderWidth;
    volumeTrack.style.width = `${percent}%`;
    volumeThumb.style.left = `${px}px`;
}
function setVolumeFromSlider(clientX) {
    const percent = getPercentFromClientX(volumeSliderContainer, clientX);
    const volume = Math.max(0, Math.min(100, percent)) / 100;
    
    // Panggil logika volume API
    handleVolumeChange(volume); 
    // Update UI slider
    updateVolumeSlider(volume); 
    
    // Tampilkan flyout volume
    parent.postMessage({ action: 'show-volume-flyout', volume: Math.round(volume * 100) }, '*');
}
function setupVolumeSliderEvents() {
    // Inisialisasi volume ke 1.0
    currentVolume = 1.0;
    handleVolumeChange(currentVolume);
    updateVolumeSlider(currentVolume); 
    
    volumeThumb.addEventListener('mousedown', (e) => {
        isVolumeSliderDragging = true;
        volumeThumb.classList.add('active');
        document.body.style.cursor = 'grabbing';
        e.stopPropagation();
        parent.postMessage({ action: 'volume-change-start' }, '*');
    });
    document.addEventListener('mousemove', (e) => {
        if (isVolumeSliderDragging) { setVolumeFromSlider(e.clientX); }
    });
    document.addEventListener('mouseup', (e) => {
        if (isVolumeSliderDragging) {
            isVolumeSliderDragging = false;
            volumeThumb.classList.remove('active');
            document.body.style.cursor = 'default';
            parent.postMessage({ action: 'volume-change-end' }, '*');
        }
    });
    volumeSliderContainer.addEventListener('mousedown', (e) => {
        if (e.target !== volumeThumb) { setVolumeFromSlider(e.clientX); }
    });
}

// --- LOGIKA EQUALIZER UI KHUSUS (Dipindahkan dari Bagian 3) ---

/**
 * Memperbarui UI Slider lokal (Knob, Bar Gain, Nilai Teks).
 */
function updateSliderUI(bandContainer, gain) {
    const knob = bandContainer.querySelector('.eq-knob');
    const gainBar = bandContainer.querySelector('.eq-gain-bar');
    const valueEl = bandContainer.querySelector('span:last-child');
    const freqKey = bandContainer.dataset.frequency;

    // Konfigurasi EQ
    const MAX_GAIN = 12.0; 
    const MIN_GAIN = -12.0; 
    
    const gainToKnobPercent = (gain) => ((gain - MIN_GAIN) / (MAX_GAIN - MIN_GAIN)) * 100;

    // Pastikan gain berada dalam batas
    gain = Math.max(MIN_GAIN, Math.min(MAX_GAIN, gain));

    const knobPercent = gainToKnobPercent(gain);
    const topPosition = 100 - knobPercent; // Posisi top (0% = Atas)

    // Perbarui posisi Knob
    knob.style.top = `${topPosition}%`;
    knob.style.transform = 'translate(-50%, -50%)'; 

    // Perbarui Bar Gain
    if (gain >= 0) {
        // Gain positif (bar dari tengah ke atas)
        const barHeightPercent = knobPercent - 50; 
        gainBar.style.top = `${50 - barHeightPercent}%`;
        gainBar.style.height = `${barHeightPercent}%`;
    } else {
        // Gain negatif (bar dari tengah ke bawah)
        const barHeightPercent = 50 - knobPercent; 
        gainBar.style.top = `50%`;
        gainBar.style.height = `${barHeightPercent}%`;
    }
    
    // Perbarui nilai teks
    valueEl.textContent = `${gain >= 0 ? '+' : ''}${gain.toFixed(1)} dB`;
    
    // Simpan nilai gain ke state global (currentGainValues - format objek)
    currentGainValues[freqKey] = gain;

    // Jika gain tidak 0.0, set preset ke 'custom'
    if (Math.abs(gain) > 0.0) {
        const presetSelect = document.getElementById('preset-select');
        if (presetSelect && presetSelect.value !== 'custom') {
            presetSelect.value = 'custom';
            currentPreset = 'custom';
        }
    }
}

/**
 * Mengambil nilai gain saat ini dari state global (currentGainValues)
 * dan mengirimkannya ke `applyEqGains` di Music Player.
 */
function sendEqUpdateToPlayer() {
    // Susun array 10-elemen: [31Hz, 62Hz, ...]
    const gainsArray = [];
    FREQUENCIES.forEach(f => {
        gainsArray.push(currentGainValues[f] !== undefined ? currentGainValues[f] : 0.0);
    });
    
    const targetWindow = window.opener || window.parent; 
    if (targetWindow && window.location.pathname.endsWith('equalizer.html')) {
        targetWindow.postMessage({
            action: 'set-equalizer-gains',
            gains: gainsArray, 
            enabled: document.getElementById('enable-eq').checked
        }, '*');
    } else if (window.location.pathname.endsWith('music_player.html')) {
        // Jika kode ini berjalan di music_player.html, langsung terapkan
        applyEqGains(gainsArray, isEqEnabled); 
    }
}

/**
 * Menangani pergerakan mouse/klik untuk slider.
 */
function handleMove(bandContainer, clientY) {
    const sliderWrapper = bandContainer.querySelector('.eq-slider-wrapper');
    const rect = sliderWrapper.getBoundingClientRect();
    
    let offsetY = clientY - rect.top;
    offsetY = Math.max(0, Math.min(rect.height, offsetY));

    // Konversi Gain
    const MAX_GAIN = 12.0; 
    const MIN_GAIN = -12.0; 
    const knobPercentToGain = (percent) => {
        const range = MAX_GAIN - MIN_GAIN;
        let gain = (percent / 100) * range + MIN_GAIN;
        return Math.round(gain * 10) / 10;
    };
    
    const knobPercent = 100 - (offsetY / rect.height) * 100;
    const newGain = knobPercentToGain(knobPercent);
    
    updateSliderUI(bandContainer, newGain);
    sendEqUpdateToPlayer(); 
}

/**
 * Menyiapkan event drag untuk knob slider.
 * (LOGIKA INI YANG SANGAT PENTING UNTUK DIPASTIKAN BERJALAN)
 */
let currentDraggingBand = null;
function setupDragEvents(bandContainer) {
    const sliderWrapper = bandContainer.querySelector('.eq-slider-wrapper');
    const knob = bandContainer.querySelector('.eq-knob');
    
    // Event Mousedown pada Knob
    knob.addEventListener('mousedown', (e) => {
        currentDraggingBand = bandContainer; 
        knob.classList.add('active');
        e.stopPropagation(); // PENTING: Mencegah event mencapai sliderWrapper
        e.preventDefault(); 
    });
    
    // Event Mousedown pada Track (untuk klik langsung/set)
    sliderWrapper.addEventListener('mousedown', (e) => {
        // Jika target bukan knob (yaitu, track), lakukan perpindahan
        if (e.target !== knob && !knob.contains(e.target)) {
             handleMove(bandContainer, e.clientY);
             // Karena mouseup tidak akan terpicu jika diklik, kita lakukan satu kali update
             currentDraggingBand = null; 
        }
    });
}

// Global Move/Up Listeners (Hanya perlu di `equalizer.html` / iframe)
function setupGlobalDragListeners() {
    document.addEventListener('mousemove', (e) => {
        if (currentDraggingBand) {
            handleMove(currentDraggingBand, e.clientY);
        }
    });

    document.addEventListener('mouseup', () => {
        if (currentDraggingBand) {
            currentDraggingBand.querySelector('.eq-knob').classList.remove('active');
            currentDraggingBand = null;
        }
    });
}


/**
 * Menerapkan nilai preset ke UI lokal dan mengirim update ke player.
 */
function applyPreset(presetName) {
    const preset = EQ_PRESETS[presetName];
    if (!preset) return;

    currentPreset = presetName;
    
    document.querySelectorAll('.eq-band-container').forEach(bandContainer => {
        const freqKey = bandContainer.dataset.frequency;
        const gain = preset[freqKey];
        if (gain !== undefined) {
            updateSliderUI(bandContainer, gain);
        }
    });
    
    const enableEqCheckbox = document.getElementById('enable-eq');
    if (enableEqCheckbox) {
        enableEqCheckbox.checked = true; 
    }

    const gainsArray = [];
    FREQUENCIES.forEach(f => gainsArray.push(currentGainValues[f]));
    eqGains = gainsArray;
    isEqEnabled = true;

    sendEqUpdateToPlayer(); 
    console.log(`[Equalizer] Preset '${presetName}' applied and sent.`);
}

/**
 * Reset semua band ke 0.0 dB (preset flat).
 */
function resetEqualizer() {
    applyPreset('flat');
    const presetSelect = document.getElementById('preset-select');
    if (presetSelect) { presetSelect.value = 'flat'; }
    console.log('[Equalizer] Reset button clicked. All gains set to 0.0 dB (Flat).');
}

/**
 * Fungsi Utama untuk Inisialisasi UI Equalizer
 * Dipanggil oleh equalizer.html saat dimuat.
 */
function initEqualizerApp() {
    console.log('[Equalizer] Initializing UI and Listeners...');
    const eqSlidersContainer = document.getElementById('eq-sliders');
    if (!eqSlidersContainer) {
        console.error("EQ Container not found. Is this running in equalizer.html?");
        return;
    }
    
    eqSlidersContainer.innerHTML = ''; // Pastikan bersih

    FREQUENCIES.forEach(freq => {
        let formattedFreq;
        if (freq >= 1000) {
            formattedFreq = `${freq / 1000}k`;
        } else {
            formattedFreq = `${freq}Hz`;
        }

        const bandContainer = document.createElement('div');
        bandContainer.className = 'eq-band-container';
        bandContainer.dataset.frequency = freq.toString();

        bandContainer.innerHTML = `
            <span class="text-xs opacity-70">${formattedFreq}</span>
            <div class="eq-slider-wrapper">
                <div class="eq-center-line"></div>
                <div class="eq-gain-bar"></div>
                <div class="eq-knob"></div>
            </div>
            <span class="text-xs font-mono">+0.0 dB</span>
        `;
        eqSlidersContainer.appendChild(bandContainer);

        // Inisialisasi state awal
        currentGainValues[freq] = 0.0;
        updateSliderUI(bandContainer, 0.0);
        // PENTING: Setup drag events untuk container yang baru dibuat!
        setupDragEvents(bandContainer); 
    });
    
    setupGlobalDragListeners(); 
    
    // Setup Kontrol EQ (Checkboxes, Preset, Reset)
    const enableEqCheckbox = document.getElementById('enable-eq');
    const resetBtn = document.getElementById('reset-btn');
    const saveBtn = document.getElementById('save-btn');
    const presetSelect = document.getElementById('preset-select');

    if (enableEqCheckbox) {
        enableEqCheckbox.addEventListener('change', sendEqUpdateToPlayer);
        enableEqCheckbox.checked = isEqEnabled;
    }
    if (resetBtn) resetBtn.addEventListener('click', resetEqualizer);
    if (presetSelect) presetSelect.addEventListener('change', (e) => applyPreset(e.target.value));
    
    // Fungsionalitas Save Preset
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            EQ_PRESETS.custom = JSON.parse(JSON.stringify(currentGainValues)); 
            
            if (!presetSelect.querySelector('option[value="custom"]')) {
                 const customOption = document.createElement('option');
                 customOption.value = 'custom';
                 customOption.textContent = 'Custom';
                 presetSelect.appendChild(customOption);
            }
            
            // Mengganti alert dengan console.log/custom UI jika memungkinkan
            console.log('Preset disimpan sebagai "Custom"');
            if (presetSelect) presetSelect.value = 'custom';
            currentPreset = 'custom';
            sendEqUpdateToPlayer();
        });
    }

    // Sinkronisasi Awal dari Music Player (Parent)
    const targetWindow = window.opener || window.parent;
    if (targetWindow) {
        targetWindow.postMessage({ action: 'request-eq-state' }, '*');
    }
    
    // Setup Kontrol Jendela (di equalizer.html)
    document.getElementById('eq-window-header').addEventListener('mousedown', (e) => {
        isWindowDragging = true;
        parent.postMessage({ action: 'bring-eq-to-front' }, '*'); 
        e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
        if (isWindowDragging) parent.postMessage({ action: 'drag-eq-frame', dx: e.movementX, dy: e.movementY }, '*');
    });
    window.addEventListener('mouseup', () => isWindowDragging = false);
    document.getElementById('close-btn').addEventListener('click', () => parent.postMessage({ action: 'close-eq-frame' }, '*')); 
    document.getElementById('minimize-btn').addEventListener('click', () => parent.postMessage({ action: 'minimize-eq-frame' }, '*'));
    document.getElementById('close-eq-btn').addEventListener('click', () => parent.postMessage({ action: 'close-eq-frame' }, '*'));
}


// --- Music Player Init (music_player.html) ---
if (window.location.pathname.endsWith('music_player.html')) {
    // ... (Logika init music player)
    
    // Logika window (tidak diubah)
    header.addEventListener('mousedown', (e) => {
        isWindowDragging = true;
        parent.postMessage({ action: 'bring-music-to-front' }, '*');
        e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
        if (isWindowDragging) parent.postMessage({ action: 'drag-music-frame', dx: e.movementX, dy: e.movementY }, '*');
    });
    window.addEventListener('mouseup', () => isWindowDragging = false);

    closeBtn.addEventListener('click', () => {
        stopPlaybackAndReset(); // Pastikan audio berhenti sebelum menutup
        parent.postMessage({ action: 'close-music-frame' }, '*');
    });
    minimizeBtn.addEventListener('click', () => parent.postMessage({ action: 'minimize-music-frame' }, '*'));
    maximizeBtn.addEventListener('click', () => { 
        parent.postMessage({ action: 'maximize-music-frame' }, '*');
    });

    window.addEventListener('message', (event) => {
        const { action, isDark, value, isMaximized, borderRadius, gains, enabled } = event.data; 
        const windowElement = document.querySelector('.app-window');

        if (action === 'stop') {
            stopPlaybackAndReset();
            songTitle.textContent = 'No song playing';
            songArtist.textContent = 'Drop a music file to start';
            albumArt.style.display = 'none';
            albumArt.src = '';
            albumArtPlaceholder.style.display = 'flex';
        }
        if (action === 'theme-change') document.body.classList.toggle('dark', isDark);
        if (action === 'toggle-fancy-mode') document.body.classList.toggle('fancy-mode', value);

        // --- Menerima state EQ dari equalizer.html (iframe) ---
        if (action === 'set-equalizer-gains') {
            if (gains && gains.length === FREQUENCIES.length) { 
                if (isAudioSetup) {
                     applyEqGains(gains, enabled);
                } else {
                    eqGains = gains;
                    isEqEnabled = enabled;
                }
            }
        }
        // --- Merespons permintaan state EQ dari equalizer.html (iframe) ---
        if (action === 'request-eq-state') {
            const stateObject = {};
            FREQUENCIES.forEach((f, i) => stateObject[f] = eqGains[i]);
            
            event.source.postMessage({
                action: 'update-eq-state',
                gains: eqGains, 
                enabled: isEqEnabled, 
                volume: currentVolume, // Kirim state volume yang tersimpan
                isDark: document.body.classList.contains('dark'),
                gainValues: stateObject
            }, event.origin);
        }

        if (action === 'set-maximized-state') {
            if (isMaximized) {
                maximizeBtn.title = "Restore Down";
                maximizeBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3 1H9V7H3V1ZM2 0H10V8H2V0Z" fill="currentColor"/><path d="M1 3H7V9H1V3ZM0 2H8V10H0V2Z" fill="currentColor" opacity="0.5"/></svg>`;
                windowElement.style.borderRadius = borderRadius || '0';
                header.style.cursor = 'default';
                isWindowDragging = false;
            } else {
                maximizeBtn.title = "Maximize";
                maximizeBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 1V9H1V1H9ZM10 0H0V10H10V0Z" fill="currentColor"/></svg>`;
                windowElement.style.borderRadius = '8px'; 
                header.style.cursor = 'move';
            }
        }
    });

    setupMusicPlayerControls();
    setupSliderEvents();
    setupVolumeSliderEvents();

    window.addEventListener('load', () => {
        setupAudioContext(); 
        updateVolumeSlider(currentVolume); 
        parent.postMessage({ action: 'request-settings' }, '*');
    });
} 

// --- Equalizer Init (equalizer.html) ---
else if (window.location.pathname.endsWith('equalizer.html')) {
    // Dipanggil jika ini adalah jendela Equalizer yang menggunakan logika dari file ini
    window.addEventListener('load', initEqualizerApp);
    
    // Menerima update state dari Music Player (Parent) untuk sinkronisasi UI EQ
    window.addEventListener('message', (event) => {
        const { action, enabled, gainValues, isDark } = event.data;
        
        if (action === 'update-eq-state') {
            const enableEqCheckbox = document.getElementById('enable-eq');
            const presetSelect = document.getElementById('preset-select');
            
            if (enableEqCheckbox) enableEqCheckbox.checked = enabled;
            if (gainValues) {
                currentGainValues = gainValues; 
                
                document.querySelectorAll('.eq-band-container').forEach(bandContainer => {
                    const freqKey = bandContainer.dataset.frequency;
                    const gain = gainValues[freqKey];
                    if (gain !== undefined) {
                        updateSliderUI(bandContainer, gain); 
                    }
                });

                const gainsArray = [];
                FREQUENCIES.forEach(f => gainsArray.push(gainValues[f]));
                
                const isFlat = gainsArray.every(g => Math.abs(g) < 0.1);
                if (!isFlat) {
                    if (presetSelect) presetSelect.value = 'custom';
                    currentPreset = 'custom';
                } else {
                    if (presetSelect) presetSelect.value = 'flat';
                    currentPreset = 'flat';
                }
            }
        }
        
        if (action === 'theme-change') {
            document.body.classList.toggle('dark', isDark);
        }
    });
}