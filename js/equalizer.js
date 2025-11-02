// equalizer.js
// Logic untuk jendela equalizer terpisah

const header = document.getElementById('eq-window-header');
const closeBtn = document.getElementById('close-btn');
const minimizeBtn = document.getElementById('minimize-btn');
const closeEqBtn = document.getElementById('close-eq-btn');
const enableEqCheckbox = document.getElementById('enable-eq');
const resetBtn = document.getElementById('reset-btn');
const saveBtn = document.getElementById('save-btn'); // Tombol Save
const presetSelect = document.getElementById('preset-select'); // Select Preset
const eqSlidersContainer = document.getElementById('eq-sliders');

const MAX_GAIN = 15.0; // Maksimum gain yang diizinkan (dB)
const MIN_GAIN = -15.0; // Minimum gain yang diizinkan (dB)
// Menggunakan frekuensi 10-Band EQ yang umum
const FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]; // 10 Band EQ

let currentDraggingBand = null; // Menyimpan band yang sedang di-drag

// Inisialisasi dengan Preamp dan 10 band frekuensi
let currentGainValues = { 
    'preamp': 0.0,
    31: 0.0, 62: 0.0, 125: 0.0, 250: 0.0, 500: 0.0,
    1000: 0.0, 2000: 0.0, 4000: 0.0, 8000: 0.0, 16000: 0.0
}; 
let currentPreset = 'flat'; // Preset aktif

// --- PRESET EQ (Sama seperti di contoh React Anda) ---
const EQ_PRESETS = {
    flat: { preamp: 0.0, 31: 0.0, 62: 0.0, 125: 0.0, 250: 0.0, 500: 0.0, 1000: 0.0, 2000: 0.0, 4000: 0.0, 8000: 0.0, 16000: 0.0 },
    rock: { preamp: 0.0, 31: 4.0, 62: 2.0, 125: -2.0, 250: -4.0, 500: -2.0, 1000: 2.0, 2000: 4.0, 4000: 6.0, 8000: 8.0, 16000: 6.0 },
    pop: { preamp: 0.0, 31: -2.0, 62: 2.0, 125: 4.0, 250: 2.0, 500: 0.0, 1000: 0.0, 2000: 0.0, 4000: 2.0, 8000: 4.0, 16000: 6.0 },
    classic: { preamp: 0.0, 31: 0.0, 62: 0.0, 125: 2.0, 250: 4.0, 500: 2.0, 1000: 0.0, 2000: -2.0, 4000: -4.0, 8000: -2.0, 16000: 0.0 },
};
// --------------------------------------------------------

// --- Logika Interaksi Jendela (Sama seperti music_player.js) ---
let isWindowDragging = false;

header.addEventListener('mousedown', (e) => {
    isWindowDragging = true;
    parent.postMessage({ action: 'bring-eq-to-front' }, '*'); // Perbaiki action name
    e.preventDefault();
});
window.addEventListener('mousemove', (e) => {
    if (isWindowDragging) parent.postMessage({ action: 'drag-eq-frame', dx: e.movementX, dy: e.movementY }, '*'); // Perbaiki action name
});
window.addEventListener('mouseup', () => isWindowDragging = false);

closeBtn.addEventListener('click', () => parent.postMessage({ action: 'close-eq-frame' }, '*')); // Perbaiki action name
minimizeBtn.addEventListener('click', () => parent.postMessage({ action: 'minimize-eq-frame' }, '*')); // Perbaiki action name
closeEqBtn.addEventListener('click', () => parent.postMessage({ action: 'close-eq-frame' }, '*')); // Perbaiki action name
// -----------------------------------------------------------------

/**
 * Mengubah nilai gain menjadi persentase posisi knob (0% di bawah, 100% di atas).
 * @param {number} gain Nilai gain dalam dB.
 * @returns {number} Persentase posisi knob (0-100).
 */
function gainToKnobPercent(gain) {
    return ((gain - MIN_GAIN) / (MAX_GAIN - MIN_GAIN)) * 100;
}

/**
 * Mengubah persentase posisi knob menjadi nilai gain dalam dB.
 * @param {number} percent Persentase posisi knob (0-100).
 * @returns {number} Nilai gain dalam dB.
 */
function knobPercentToGain(percent) {
    const range = MAX_GAIN - MIN_GAIN;
    let gain = (percent / 100) * range + MIN_GAIN;
    // Bulatkan ke satu tempat desimal
    return Math.round(gain * 10) / 10;
}

/**
 * Memformat frekuensi untuk ditampilkan (mis. 1000 -> 1 kHz).
 * @param {number|string} frequency Frekuensi atau 'preamp'.
 * @returns {string} String yang diformat.
 */
function formatFrequency(frequency) {
    if (frequency === 'preamp') return 'Preamp';
    const freq = parseInt(frequency);
    if (freq >= 1000) return `${freq / 1000} kHz`;
    return `${freq} Hz`;
}

/**
 * Memperbarui tampilan slider (knob, bar gain, nilai teks) berdasarkan nilai gain baru.
 * @param {HTMLElement} bandContainer Elemen kontainer band.
 * @param {number} gain Nilai gain dalam dB.
 */
function updateSliderUI(bandContainer, gain) {
    const knob = bandContainer.querySelector('.eq-knob');
    const gainBar = bandContainer.querySelector('.eq-gain-bar');
    const valueEl = bandContainer.querySelector('span:last-child'); // elemen teks nilai

    // Pastikan gain berada dalam batas
    gain = Math.max(MIN_GAIN, Math.min(MAX_GAIN, gain));

    const knobPercent = gainToKnobPercent(gain);
    
    // Posisi top (0% = atas, 100% = bawah)
    const topPosition = 100 - knobPercent; 

    // Perbarui posisi Knob (Top 0% = Atas)
    knob.style.top = `${topPosition}%`;
    knob.style.transform = 'translate(-50%, -50%)'; 

    // Perbarui Bar Gain
    if (gain >= 0) {
        // Gain positif (bar memanjang ke atas dari tengah 50%)
        const barHeightPercent = knobPercent - 50; 
        gainBar.style.top = `${50 - barHeightPercent}%`;
        gainBar.style.height = `${barHeightPercent}%`;
    } else {
        // Gain negatif (bar memanjang ke bawah dari tengah 50%)
        const barHeightPercent = 50 - knobPercent; 
        gainBar.style.top = `50%`;
        gainBar.style.height = `${barHeightPercent}%`;
    }
    
    // Perbarui nilai teks
    valueEl.textContent = `${gain >= 0 ? '+' : ''}${gain.toFixed(1)} dB`;
    
    // Simpan nilai gain saat ini
    const freqKey = bandContainer.dataset.frequency;
    currentGainValues[freqKey] = gain;

    // Jika ini bukan dari preset/reset, set preset ke 'custom'
    if (presetSelect.value !== 'custom' && currentPreset !== 'custom') {
        presetSelect.value = 'custom';
        currentPreset = 'custom';
    }
}


/**
 * Mengirim nilai gain saat ini ke Music Player (parent window).
 */
function sendEqUpdate() {
    const eqEnabled = enableEqCheckbox.checked;
    
    // Pastikan semua frekuensi (termasuk preamp) memiliki nilai, default 0.0 jika hilang
    // Urutan harus: [Preamp, 31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] (11 elemen)
    const gains = [currentGainValues['preamp']];
    FREQUENCIES.forEach(f => {
        const gain = currentGainValues[f] !== undefined ? currentGainValues[f] : 0.0;
        gains.push(gain);
    });
    
    parent.postMessage({
        action: 'set-equalizer-gains',
        gains: gains, 
        enabled: eqEnabled
    }, '*');
    
    // console.log(`[Equalizer] Sending EQ update. Enabled: ${eqEnabled}, Gains: [${gains.map(g => g.toFixed(1)).join(', ')}]`); // Matikan log untuk performa
}

/**
 * Menangani pergerakan mouse/klik untuk slider.
 */
function handleMove(bandContainer, clientY) {
    const sliderWrapper = bandContainer.querySelector('.eq-slider-wrapper');
    const rect = sliderWrapper.getBoundingClientRect();
    
    let offsetY = clientY - rect.top;
    offsetY = Math.max(0, Math.min(rect.height, offsetY));

    const knobPercent = 100 - (offsetY / rect.height) * 100;
    const newGain = knobPercentToGain(knobPercent);
    
    // Perbarui UI dan state lokal
    updateSliderUI(bandContainer, newGain);
    
    // Kirim update ke Music Player setiap kali mouse bergerak (real-time update)
    // INI KUNCI REAKTIVITAS: SAMA DENGAN PERUBAHAN STATE DI REACT
    sendEqUpdate(); 
}

/**
 * Menginisialisasi UI Slider untuk satu band frekuensi.
 */
function createEqSlider(frequency) {
    const formattedFreq = formatFrequency(frequency);
    
    const bandContainer = document.createElement('div');
    bandContainer.className = 'eq-band-container';
    bandContainer.dataset.frequency = frequency.toString();

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

    // Inisialisasi posisi ke 0.0 dB
    currentGainValues[frequency] = 0.0;
    updateSliderUI(bandContainer, 0.0);
    
    // Set event listeners untuk drag
    setupDragEvents(bandContainer);
}

/**
 * Menyiapkan event drag untuk knob slider.
 */
function setupDragEvents(bandContainer) {
    const sliderWrapper = bandContainer.querySelector('.eq-slider-wrapper');
    const knob = bandContainer.querySelector('.eq-knob');
    
    knob.addEventListener('mousedown', (e) => {
        currentDraggingBand = bandContainer; 
        knob.classList.add('active');
        e.stopPropagation(); 
        e.preventDefault(); // Penting: cegah default drag browser
    });
    
    sliderWrapper.addEventListener('mousedown', (e) => {
        // Klik pada track juga memindahkan knob
        if (e.target !== knob) {
             handleMove(bandContainer, e.clientY);
             // sendEqUpdate() sudah dipanggil di dalam handleMove
        }
    });
}

document.addEventListener('mousemove', (e) => {
    if (currentDraggingBand) {
        handleMove(currentDraggingBand, e.clientY);
    }
});

document.addEventListener('mouseup', () => {
    if (currentDraggingBand) {
        currentDraggingBand.querySelector('.eq-knob').classList.remove('active');
        currentDraggingBand = null;
        // Tidak perlu sendEqUpdate() lagi di sini karena sudah dipanggil di handleMove
    }
});

/**
 * Menginisialisasi semua slider.
 */
function initializeSliders() {
    // 1. Inisialisasi Preamp (sudah ada di HTML, hanya perlu setup drag)
    const preampContainer = document.querySelector('.eq-band-container[data-frequency="preamp"]');
    // Pastikan nilai awal di UI adalah 0.0
    currentGainValues['preamp'] = 0.0;
    updateSliderUI(preampContainer, 0.0);
    setupDragEvents(preampContainer);
    
    // 2. Inisialisasi 10 Band EQ
    FREQUENCIES.forEach(freq => createEqSlider(freq));
}

/**
 * Menerapkan nilai preset ke UI dan mengirim update.
 * @param {string} presetName Nama preset ('flat', 'rock', dll)
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
    enableEqCheckbox.checked = true; // Aktifkan EQ saat preset dipilih
    console.log(`[Equalizer] Preset '${presetName}' applied.`);
    sendEqUpdate(); // Kirim update setelah menerapkan preset
}


/**
 * Reset semua band dan preamp ke 0.0 dB.
 */
function resetEqualizer() {
    // Terapkan preset flat
    applyPreset('flat');
    enableEqCheckbox.checked = true; 
    presetSelect.value = 'flat';
    console.log('[Equalizer] Reset button clicked. All gains set to 0.0 dB (Flat).');
}

// --- Setup Event Listeners ---
enableEqCheckbox.addEventListener('change', sendEqUpdate);
resetBtn.addEventListener('click', resetEqualizer);
presetSelect.addEventListener('change', (e) => {
    applyPreset(e.target.value);
});
// Tombol Save (placeholder fungsionalitas)
saveBtn.addEventListener('click', () => {
    alert('Fungsionalitas "Save Preset" belum diimplementasikan. Nilai EQ Anda sudah diterapkan secara real-time.');
});

window.addEventListener('load', () => {
    initializeSliders();
    // Kirim pesan ke parent untuk meminta nilai EQ terakhir (termasuk volume)
    parent.postMessage({ action: 'request-eq-state' }, '*');
    console.log('[Equalizer] Requesting current EQ state from Music Player.');
});

// Listener untuk menerima state EQ dari music_player.js
window.addEventListener('message', (event) => {
    const { action, gains, enabled, isDark, volume } = event.data;
    
    if (action === 'update-eq-state') {
        const bands = document.querySelectorAll('.eq-band-container');
        
        if (gains && gains.length === 11) {
            enableEqCheckbox.checked = enabled;
            console.log(`[Equalizer] Received state from Music Player. Enabled: ${enabled}, Gains: [${gains.map(g => g.toFixed(1)).join(', ')}]`);
            
            // Urutan gains: [Preamp, 31Hz, 62Hz, ...]
            bands.forEach((bandContainer, index) => {
                const gain = gains[index];
                if (gain !== undefined) {
                    // Update state lokal dan UI
                    updateSliderUI(bandContainer, gain); 
                }
            });
            // Atur preset ke 'custom' jika nilainya tidak flat
            const isFlat = gains.every(g => g === 0.0);
            if (!isFlat) {
                presetSelect.value = 'custom';
                currentPreset = 'custom';
            } else {
                 presetSelect.value = 'flat';
                 currentPreset = 'flat';
            }
            // Setelah UI diperbarui, kirim lagi untuk memastikan AudioContext mendapat semua nilai
            sendEqUpdate(); 
        }
    }
    
    // Logika Theme
    if (action === 'theme-change') {
        document.body.classList.toggle('dark', isDark);
    }
});