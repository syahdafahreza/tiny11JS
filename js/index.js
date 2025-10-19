// === ALL ELEMENT DECLARATIONS ===
const desktop = document.getElementById('desktop');
const desktopImage = document.querySelector('.desktop-image'); // FIX: Deklarasikan elemen gambar wallpaper
const wallpaperIframe = document.getElementById('wallpaper-iframe');
const clickInterceptor = document.getElementById('click-interceptor'); // NEW: Invisible layer

// for notification item
const notificationList = document.getElementById('notification-list');
const notificationPlaceholder = document.getElementById('notification-placeholder');

const clearAllBtn = document.getElementById('clear-all-notifications-btn');

// App Iframes
const controlPanelIcon = document.getElementById('control-panel-icon');
const controlPanelFrame = document.getElementById('control-panel-frame');
const musicPlayerIcon = document.getElementById('music-player-icon');
const musicPlayerFrame = document.getElementById('music-player-frame');
const live2dIcon = document.getElementById('live2d-icon');
const notificationCenterTrigger = document.getElementById('notification-center-trigger');
const live2dWallpaperFrame = document.getElementById('live2d-wallpaper-frame');
// [KEPT] Deklarasi dari file lokal
const thisPcIcon = document.getElementById('this-pc-icon');
const fileExplorerFrame = document.getElementById('file-explorer-frame');

// Visualizer Elements
const visualizerCanvas = document.getElementById('visualizer');
const visualizerCtx = visualizerCanvas.getContext('2d');

// Taskbar Elements
const taskbar = document.getElementById('taskbar');
const datetimeContainer = document.getElementById('datetime-container');
const clockElement = document.getElementById('clock');
const dateElement = document.getElementById('date');
const systemTray = document.getElementById('system-tray');
const taskbarMainGroup = document.getElementById('taskbar-main-group');
const appIconsContainer = document.getElementById('app-icons');
const taskbarControlPanelIcon = document.getElementById('taskbar-cp-icon');
const taskbarMusicIcon = document.getElementById('taskbar-music-icon');
const taskbarLive2dIcon = document.getElementById('taskbar-live2d-icon');
const notificationCenter = document.getElementById('notification-center');
// [KEPT] Deklarasi dari file lokal
const taskbarExplorerIcon = document.getElementById('taskbar-explorer-icon');

// Start Menu Elements
const startButton = document.getElementById('start-button');
// GANTI: Gunakan ID yang benar: #start-menu
const startMenu = document.getElementById('start-menu');

// Context Menu Elements
const contextMenu = document.getElementById('context-menu');
const contextMenuSettings = document.getElementById('context-menu-settings');
const contextMenuRefresh = document.getElementById('context-menu-refresh');
// NEW: Explorer Context Menu elements
const explorerGeneralMenu = document.getElementById('explorer-context-menu-general');
const explorerItemMenu = document.getElementById('explorer-context-menu-item');


// BARU: Elemen Flyout Volume di Desktop
const volumeContent = document.getElementById('volume-content');
const volumeIcon = document.getElementById('volume-icon');
const volumeBarFill = document.getElementById('volume-bar-fill');
const volumeValue = document.getElementById('volume-value');

// Toast Notification
const notificationContent = document.getElementById('notification-content');
const pillContainer = document.getElementById('pill-container');
const closeButton = document.getElementById('close-button');
const notifIcon = document.getElementById('notification-icon');
const notifTitle = document.getElementById('notification-title');
const notifMessage = document.getElementById('notification-message');

// Global State Variables
let isMusicPlayerOpen = false;
let isControlPanelOpen = false;
let isLive2dOpen = false;
let isExplorerOpen = false; // [KEPT] Dari file lokal
let lastMusicPlayerRect = null;
let lastControlPanelRect = null;
let lastLive2dRect = null;
let lastExplorerRect = null; // [KEPT] Dari file lokal
let visualizerData = null;
let previousBarHeights = [];
let currentTaskbarPosition = 'bottom';
let currentTaskbarStyle = 'default';
let isTaskbarSpaceBetween = false;

// For toast notification
let originalTaskbarClasses = taskbar.className;
let originalTaskbarInlineStyles = '';
let originalTaskbarStyles = '';
let pillTimer; // Menggantikan notificationTimer & volumeFlyoutTimer
let volumeChangeTimer; // Timer untuk menandai bahwa volume sedang berubah
let isPillActive = false; // Menggantikan isNotifActive
let activePillType = null;
let isVisualizerFading = false;
let isVolumeChanging = false; // Status apakah volume sedang berubah

function debugTaskbarState(phase) {
    const rect = taskbar.getBoundingClientRect();
    const computed = getComputedStyle(taskbar);
    console.log(`%c[DEBUG ${phase}] TASKBAR:`, 'background: #222; color: #fff; padding: 2px 5px;', {
        classes: taskbar.className,
        position: computed.position,
        display: computed.display,
        left: computed.left,
        bottom: computed.bottom,
        width: computed.width,
        borderRadius: computed.borderRadius,
        actualRect: {
            left: rect.left.toFixed(1),
            bottom: (window.innerHeight - rect.bottom).toFixed(1),
            width: rect.width.toFixed(1)
        }
    });
}

// debugTaskbarState('Before Show Pill');
// For toast notification, Fungsi Show Pill
const showPill = (type, duration = 5000) => {
    if (isPillActive && type === activePillType) {
        // Jika tipe sama, hanya reset timer
        clearTimeout(pillTimer);
        pillTimer = setTimeout(() => {
            if (type === 'volume' && isVolumeChanging) return;
            hidePill();
        }, duration);
        return;
    }

    // Jika pill sudah aktif tapi tipenya BEDA (misal dari notif ke volume)
    if (isPillActive && type !== activePillType) {
        const currentContent = activePillType === 'notification' ? notificationContent : volumeContent;
        const newContent = type === 'notification' ? notificationContent : volumeContent;

        // 1. Fade out konten lama
        currentContent.style.opacity = '0';

        // 2. Setelah fade out, ganti konten dan fade in
        setTimeout(() => {
            currentContent.style.display = 'none';
            newContent.style.display = 'flex';
            // Beri sedikit waktu untuk browser me-render display:flex
            setTimeout(() => {
                newContent.style.opacity = '1';
            }, 20);
        }, 300); // Sesuaikan dengan durasi transisi opacity konten

        activePillType = type;
        clearTimeout(pillTimer);
        pillTimer = setTimeout(() => {
            if (type === 'volume' && isVolumeChanging) return;
            hidePill();
        }, duration);
        return;
    }


    // --- Animasi Muncul Pertama Kali ---
    isPillActive = true;
    activePillType = type;

    // 1. Dapatkan posisi & gaya taskbar saat ini
    const taskbarRect = taskbar.getBoundingClientRect();
    const taskbarStyle = getComputedStyle(taskbar);
    $(pillContainer).data('originalRect', taskbarRect); // Simpan untuk animasi kembali

    // 2. Sembunyikan konten taskbar & visualizer
    taskbarMainGroup.style.opacity = '0';
    systemTray.style.opacity = '0';
    visualizerCanvas.style.opacity = '0';

    // 3. Atur posisi awal pill agar sama persis dengan taskbar (tapi masih transparan)
    pillContainer.style.transition = 'none'; // Matikan transisi sementara
    pillContainer.style.left = `${taskbarRect.left}px`;
    pillContainer.style.top = `${taskbarRect.top}px`;
    pillContainer.style.width = `${taskbarRect.width}px`;
    pillContainer.style.height = `${taskbarRect.height}px`;
    pillContainer.style.borderRadius = taskbarStyle.borderRadius;

    // 4. Siapkan konten yang akan ditampilkan di dalam pill
    const activeContent = type === 'notification' ? notificationContent : volumeContent;
    notificationContent.style.display = 'none';
    volumeContent.style.display = 'none';
    activeContent.style.display = 'flex';
    activeContent.style.opacity = '0';

    // 5. Jalankan animasi secara sinkron
    requestAnimationFrame(() => {
        // Sembunyikan taskbar asli
        taskbar.style.opacity = '0';
        taskbar.style.pointerEvents = 'none';

        // Aktifkan lagi transisi dan mulai animasi pill
        pillContainer.style.transition = 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1)';
        pillContainer.classList.add('show');

        // Tentukan target posisi & ukuran pill
        const pillWidth = 380;
        const pillHeight = 56;
        const targetLeft = (window.innerWidth / 2) - (pillWidth / 2);
        // KEMBALIKAN: Posisi seperti semula, dekat bagian bawah
        const targetTop = window.innerHeight - pillHeight - 8;

        pillContainer.style.left = `${targetLeft}px`;
        pillContainer.style.top = `${targetTop}px`;
        pillContainer.style.width = `${pillWidth}px`;
        pillContainer.style.height = `${pillHeight}px`;
        // KEMBALIKAN: Bentuk sudut seperti semula
        pillContainer.style.borderRadius = '12px';

        // 6. Fade-in konten di dalam pill setelah animasi morphing berjalan setengah jalan
        setTimeout(() => {
            activeContent.style.opacity = '1';
        }, 200);
    });

    // 7. Atur timer untuk menyembunyikan pill secara otomatis
    pillTimer = setTimeout(() => {
        // Jangan sembunyikan jika pengguna masih menggeser volume
        if (type === 'volume' && isVolumeChanging) return;
        hidePill();
    }, duration);
};

const hidePill = () => {
    if (!isPillActive) return;

    clearTimeout(pillTimer);
    const originalRect = $(pillContainer).data('originalRect');

    if (!originalRect) {
        // Fallback jika terjadi error
        resetPillState();
        return;
    }

    // 1. Sembunyikan konten di dalam pill terlebih dahulu
    const activeContent = activePillType === 'notification' ? notificationContent : volumeContent;
    activeContent.style.opacity = '0';

    // 2. Setelah jeda singkat, mulai animasi kembali ke posisi taskbar
    setTimeout(() => {
        // Kembalikan taskbar asli (masih kosong)
        taskbar.style.opacity = '1';
        taskbar.style.pointerEvents = 'auto';

        // Animasikan pill kembali ke bentuk & posisi taskbar
        pillContainer.style.left = `${originalRect.left}px`;
        pillContainer.style.top = `${originalRect.top}px`;
        pillContainer.style.width = `${originalRect.width}px`;
        pillContainer.style.height = `${originalRect.height}px`;
        pillContainer.style.borderRadius = getComputedStyle(taskbar).borderRadius;

        // Sembunyikan pill bersamaan dengan animasi morphing
        pillContainer.classList.remove('show');

        // 3. Kembalikan konten taskbar setelah animasi kembali hampir selesai
        setTimeout(() => {
            taskbarMainGroup.style.opacity = '1';
            systemTray.style.opacity = '1';
            if (visualizerCanvas.style.display !== 'none') {
                visualizerCanvas.style.opacity = '1';
            }
            // Reset state setelah semua animasi selesai
            setTimeout(resetPillState, 450);
        }, 100);

    }, 200); // Jeda ini untuk menunggu konten pill fade out
};

// Fungsi helper untuk menyelesaikan proses hide
const completePillHide = ($taskbar, originalState) => {
    // Hapus semua style inline dan kembalikan class asli
    $taskbar.removeAttr('style');
    $taskbar.attr('class', originalState.classes);
    if (originalState.style) {
        $taskbar.attr('style', originalState.style);
    }

    // Hapus pill mode
    $taskbar.removeClass('pill-mode');

    // Fade in konten asli taskbar
    const $taskbarContent = $taskbar.find('#taskbar-main-group, #system-tray');
    $taskbarContent.css({
        transition: 'opacity 0.3s ease-in 0.1s', // Delay sedikit setelah morphing selesai
        opacity: 0 // Mulai dari opacity 0
    });

    // Tampilkan konten asli dan fade in
    $taskbarContent.css('display', '');

    setTimeout(() => {
        $taskbarContent.css({
            opacity: 1,
            pointerEvents: 'auto'
        });
    }, 100);

    // Sembunyikan konten pill
    $taskbar.find('#notification-content, #volume-content').hide();

    // Tampilkan kembali visualizer jika ada dengan fade
    if ($('#visualizer').css('display') !== 'none') {
        $('#visualizer').fadeTo(300, 1);
    }

    // Hapus data state dan reset variabel global
    $taskbar.removeData('originalState');
    isPillActive = false;
    activePillType = null;

    // Force reflow untuk memastikan taskbar kembali ke posisi semula
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 50);
};

// Fungsi bantu untuk reset transitions
const resetTransitions = () => {
    pillContainer.style.transition = '';
    notificationContent.style.transition = '';
    volumeContent.style.transition = '';
    taskbar.style.transition = '';
    visualizerCanvas.style.transition = '';
};

// Fungsi fallback untuk reset state jika ada error
const resetPillState = () => {
    isPillActive = false;
    activePillType = null;
    pillContainer.style.transition = 'none';
    pillContainer.classList.remove('show');
    notificationContent.style.display = 'none';
    volumeContent.style.display = 'none';

    // Pastikan semua state kembali normal
    taskbar.style.opacity = '1';
    taskbar.style.pointerEvents = 'auto';
    taskbarMainGroup.style.opacity = '1';
    systemTray.style.opacity = '1';
    if (visualizerCanvas.style.display !== 'none') {
        visualizerCanvas.style.opacity = '1';
    }
}

// debugTaskBarState('After Hide Pill');
// Fungsi utama untuk menyembunyikan pill, Hide Pill End
// Show and hide pill End

// Fungsi untuk melanjutkan setelah pill UI hilang dan taskbar kembali normal
const proceedToShowVisualizer = () => {
    console.log("[DEBUG] proceedToShowVisualizer dipanggil."); // Debug log
    // Cek apakah visualizer sedang dalam proses fade IN
    if (isVisualizerFading) {
        console.log("[DEBUG] proceedToShowVisualizer: Visualizer sedang fading, tunggu dulu."); // Debug log
        // Jika ya, tunggu sebentar dan cek lagi
        const checkAndProceed = () => {
            if (isVisualizerFading) {
                requestAnimationFrame(checkAndProceed); // Cek lagi di frame berikutnya
            } else {
                console.log("[DEBUG] proceedToShowVisualizer: Visualizer selesai fading, lanjutkan."); // Debug log
                // Fade in visualizer setelah status aman
                visualizerCanvas.style.transition = 'opacity 0.3s ease-in-out'; // Pastikan transisi diterapkan
                visualizerCanvas.style.opacity = '1'; // Kembalikan ke opacity aktif
                isVisualizerFading = true; // Tandai bahwa proses fade in sedang berlangsung

                setTimeout(() => {
                    isVisualizerFading = false; // Reset status fade IN selesai
                    // Panggil fungsi untuk menggambar ulang jika perlu
                    if (visualizerData && !visualizerData.isPaused) {
                        drawVisualizer(); // atau panggil fungsi untuk memulai ulang animasi
                    }
                }, 300); // Durasi harus sesuai dengan transisi CSS
            }
        };
        checkAndProceed();
    } else {
        console.log("[DEBUG] proceedToShowVisualizer: Fade in langsung."); // Debug log
        // Fade in visualizer
        visualizerCanvas.style.transition = 'opacity 0.3s ease-in-out'; // Pastikan transisi diterapkan
        visualizerCanvas.style.opacity = '1'; // Kembalikan ke opacity aktif
        isVisualizerFading = true; // Tandai bahwa proses fade in sedang berlangsung

        setTimeout(() => {
            isVisualizerFading = false; // Reset status fade IN selesai
            // Panggil fungsi untuk menggambar ulang jika perlu
            if (visualizerData && !visualizerData.isPaused) {
                drawVisualizer(); // atau panggil fungsi untuk memulai ulang animasi
            }
        }, 300); // Durasi harus sesuai dengan transisi CSS
    }
};
// Fungsi untuk melanjutkan setelah pill UI hilang dan taskbar kembali normal end

// Wrapper untuk menampilkan notifikasi teks
const showNotification = (title, message, icon) => {
    addNotificationToCenter(title, message, icon);

    notifTitle.textContent = title;
    notifMessage.textContent = message;

    notifIcon.classList.add('flex', 'items-center', 'justify-center');

    if (icon && (icon.startsWith('blob:') || icon.startsWith('http'))) {
        // Untuk gambar (img), kita juga harus memastikan gambar itu sendiri terpusat, 
        // meskipun object-cover biasanya sudah baik.
        notifIcon.innerHTML = `<img src="${icon}" class="w-full h-full object-cover rounded" alt="Notification Icon">`;
    } else if (icon) {
        // Untuk SVG, sekarang akan terpusat di dalam div 40x40
        notifIcon.innerHTML = icon;

        // Atur ukuran ikon yang dimasukkan (Contoh: untuk ProTipIcon yang ukurannya 24x24)
        const svg = notifIcon.querySelector('svg');
        if (svg) {
            // Hapus class ukuran lama (w-6 h-6) dan gunakan ukuran yang lebih baik di sini jika diperlukan
            // Atau pastikan SVG menggunakan w-full h-full untuk mengisi div 40x40
            // Namun, karena `div#notification-icon` adalah w-10 h-10 (40px x 40px), 
            // menambahkan `flex items-center justify-center` sudah cukup.
        }
    } else {
        notifIcon.innerHTML = '';
    }

    showPill('notification'); // Panggil fungsi utama
};

// Wrapper BARU untuk menampilkan notifikasi volume
const showVolumeNotification = (percent) => {
    // Pastikan tidak ada race condition
    if (isPillActive && activePillType !== 'volume') {
        hidePill();
        // Tunggu sebentar sebelum menampilkan volume pill
        setTimeout(() => {
            showVolumeNotification(percent);
        }, 300); // Tunggu animasi hide selesai
        return;
    }

    // Update konten volume dengan animasi
    volumeValue.textContent = `${percent}%`;
    volumeBarFill.style.width = `${percent}%`;

    // Update ikon volume dengan perubahan warna yang halus
    if (percent === 0) {
        volumeIcon.innerHTML = volumeIcons.mute;
    } else if (percent <= 50) {
        volumeIcon.innerHTML = volumeIcons.low;
    } else {
        volumeIcon.innerHTML = volumeIcons.high;
    }

    showPill('volume', 1800);
    console.log(`[DEBUG] showVolumeNotification: Meminta showPill('volume', 1800) untuk volume ${percent}%.`);
};

// Event listener untuk tombol close
closeButton.addEventListener('click', hidePill);
// for toast notification end

// fungsi baru for notification item
const addNotificationToCenter = (title, message, icon) => {
    // 1. Sembunyikan placeholder jika masih terlihat
    if (notificationPlaceholder.style.display !== 'none') {
        notificationPlaceholder.style.display = 'none';
    }

    // [MODIFIKASI] Tambahkan logika untuk membedakan URL gambar dan SVG
    let iconContent = '';
    if (icon && (icon.startsWith('blob:') || icon.startsWith('http'))) {
        // BARU: Jika ini adalah URL, buat tag <img>
        iconContent = `<img src="${icon}" class="w-full h-full object-cover rounded" alt="Album Art">`;
    } else if (icon) {
        // LAMA: Jika bukan URL, anggap sebagai SVG
        iconContent = icon;
    }

    // 2. Buat elemen notifikasi baru menggunakan iconContent yang sudah diproses
    const notifItem = document.createElement('div');
    notifItem.className = 'notification-item';
    notifItem.innerHTML = `
            <div class="notification-item-icon">${iconContent}</div>
            <div class="notification-item-content">
                <div class="notification-item-title">${title}</div>
                <div class="notification-item-message">${message}</div>
            </div>
            <button class="notification-item-close" title="Hapus notifikasi">
                <svg class="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
            </button>
        `;

    // 3. Tambahkan notifikasi baru ke bagian paling atas daftar
    notificationList.prepend(notifItem);

    // 4. Tambahkan event listener untuk tombol close pada notifikasi yang baru dibuat
    const closeBtn = notifItem.querySelector('.notification-item-close');
    closeBtn.addEventListener('click', () => {
        notifItem.remove();
        // Cek jika tidak ada notifikasi lagi, tampilkan kembali placeholder
        if (notificationList.querySelectorAll('.notification-item').length === 0) {
            notificationPlaceholder.style.display = 'block';
        }
    });
};
// fungsi baru for notification item end

// Bagian 3: Tambahkan event listener untuk tombol close.
// Letakkan ini bersama event listener lainnya.
closeButton.addEventListener('click', hidePill);


// Bagian 4: Cara Menggunakan/Memanggil Notifikasi
// Anda bisa memanggil fungsi `showNotification` dari mana saja.
// Contoh: panggil notifikasi saat halaman selesai dimuat.
window.addEventListener('load', () => {
    const proTipIcon = `<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>`;

    setTimeout(() => {
        showNotification(
            "Selamat Datang!",
            "Drag & drop gambar ke desktop untuk mengganti wallpaper.",
            proTipIcon
        );
    }, 1500);
});
// Toast notification end

// BARU: Ikon SVG untuk flyout
const volumeIcons = {
    mute: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`,
    low: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>`,
    high: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`
};

const visualizerSettings = {
    shadowBlur: 4, smoothingFactor: 0.5, bassMultiplier: 0.75, bassEndPercentage: 0.25, midBoostAmount: 0.8,
    trebleStartPercentage: 0.5, trebleBoostAmount: 0.2, scalingPower: 2.0,
    height: 200, width: 120, islandBorderRadius: '12px', islandGap: 6,
};

// === CORE FUNCTIONS ===

function updateClock() {
    const now = new Date();
    clockElement.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    dateElement.textContent = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
}

function setupWallpaperDragDrop() {
    desktop.addEventListener('dragover', (e) => { e.preventDefault(); desktop.classList.add('drag-over'); });
    desktop.addEventListener('dragleave', () => { desktop.classList.remove('drag-over'); });
    desktop.addEventListener('drop', (e) => {
        e.preventDefault();
        desktop.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                // When a new image is dropped, clear the live wallpaper
                wallpaperIframe.src = 'about:blank';
                wallpaperIframe.style.display = 'none';
                clickInterceptor.style.display = 'none'; // NEW: Hide interceptor too

                if (desktopImage) {
                    desktopImage.src = event.target.result;
                    // FIX: Ensure we are in <img> mode when a new image is dropped
                    desktopImage.style.display = 'block';
                }
                // FIX: Reset background properties on the container div
                desktop.style.backgroundImage = 'none';
                desktop.style.backgroundRepeat = 'no-repeat';
            };
            reader.readAsDataURL(file);
        }
    });
}

// --- GENERIC APP IFRAME MANAGEMENT ---

function openApp(appName) {
    let appFrame, taskbarIcon;
    if (appName === 'music') {
        appFrame = musicPlayerFrame;
        taskbarIcon = taskbarMusicIcon;
        if (isMusicPlayerOpen) { bringToFront(appName); return; }
        isMusicPlayerOpen = true;
    } else if (appName === 'cp') {
        appFrame = controlPanelFrame;
        taskbarIcon = taskbarControlPanelIcon;
        if (isControlPanelOpen) { bringToFront(appName); return; }
        isControlPanelOpen = true;
    } else if (appName === 'live2d') {
        appFrame = live2dWallpaperFrame;
        taskbarIcon = taskbarLive2dIcon;
        if (isLive2dOpen) { bringToFront(appName); return; }
        isLive2dOpen = true;
    } else if (appName === 'explorer') { // [KEPT] Dari file lokal
        appFrame = fileExplorerFrame;
        taskbarIcon = taskbarExplorerIcon;
        if (isExplorerOpen) { bringToFront(appName); return; }
        isExplorerOpen = true;
    }

    if (taskbarIcon && appName !== 'explorer') taskbarIcon.style.display = 'flex';
    // Jika Start Menu digunakan (div biasa), Start Menu tidak perlu class app-iframe
    if (appName === 'startMenu') {
        appFrame.style.display = 'flex';
    } else {
        appFrame.style.display = 'block';
    }

    appFrame.style.transition = 'none';
    appFrame.style.transform = 'scale(1)';
    appFrame.style.opacity = '1';

    bringToFront(appName);

    if (appName === 'music') {
        visualizerCanvas.style.display = 'block';
        drawVisualizer();
    }
}

function closeApp(appName) {
    let appFrame, taskbarIcon;
    if (appName === 'music') {
        isMusicPlayerOpen = false;
        appFrame = musicPlayerFrame;
        taskbarIcon = taskbarMusicIcon;
        visualizerCanvas.style.display = 'none';
        visualizerData = null;
        appFrame.contentWindow.postMessage({ action: 'stop' }, '*');
    } else if (appName === 'cp') {
        isControlPanelOpen = false;
        appFrame = controlPanelFrame;
        taskbarIcon = taskbarControlPanelIcon;
    } else if (appName === 'live2d') {
        isLive2dOpen = false;
        appFrame = live2dWallpaperFrame;
        taskbarIcon = taskbarLive2dIcon;
    } else if (appName === 'explorer') { // [KEPT] Dari file lokal
        isExplorerOpen = false;
        appFrame = fileExplorerFrame;
        taskbarIcon = null; // No separate icon to hide
    }
    appFrame.style.display = 'none';
    if (taskbarIcon) taskbarIcon.style.display = 'none';
}

function minimizeApp(appName) {
    let appFrame, lastRect, taskbarIcon;
    if (appName === 'music') {
        appFrame = musicPlayerFrame;
        taskbarIcon = taskbarMusicIcon;
        lastMusicPlayerRect = appFrame.getBoundingClientRect();
        lastRect = lastMusicPlayerRect;
    } else if (appName === 'cp') {
        appFrame = controlPanelFrame;
        taskbarIcon = taskbarControlPanelIcon;
        lastControlPanelRect = appFrame.getBoundingClientRect();
        lastRect = lastControlPanelRect;
    } else if (appName === 'live2d') {
        appFrame = live2dWallpaperFrame;
        taskbarIcon = taskbarLive2dIcon;
        lastLive2dRect = appFrame.getBoundingClientRect();
        lastRect = lastLive2dRect;
    } else if (appName === 'explorer') { // [KEPT] Dari file lokal
        appFrame = fileExplorerFrame;
        taskbarIcon = taskbarExplorerIcon;
        lastExplorerRect = appFrame.getBoundingClientRect();
        lastRect = lastExplorerRect;
    }

    if (appFrame.style.display === 'none' || appFrame.style.opacity === '0') return;

    const targetRect = taskbarIcon.getBoundingClientRect();
    const translateX = targetRect.left - lastRect.left;
    const translateY = targetRect.top - lastRect.top;

    appFrame.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
    appFrame.style.transformOrigin = 'top left';
    appFrame.style.transform = `translate(${translateX}px, ${translateY}px) scale(0.1)`;
    appFrame.style.opacity = '0';

    setTimeout(() => { appFrame.style.display = 'none'; }, 300);
}

function restoreApp(appName) {
    let appFrame, lastRect, taskbarIcon;
    if (appName === 'music') {
        appFrame = musicPlayerFrame;
        lastRect = lastMusicPlayerRect;
        taskbarIcon = taskbarMusicIcon;
    } else if (appName === 'cp') {
        appFrame = controlPanelFrame;
        lastRect = lastControlPanelRect;
        taskbarIcon = taskbarControlPanelIcon;
    } else if (appName === 'live2d') {
        appFrame = live2dWallpaperFrame;
        lastRect = lastLive2dRect;
        taskbarIcon = taskbarLive2dIcon;
    } else if (appName === 'explorer') { // [KEPT] Dari file lokal
        appFrame = fileExplorerFrame;
        lastRect = lastExplorerRect;
        taskbarIcon = taskbarExplorerIcon;
    }

    if (!lastRect) return;

    const targetRect = taskbarIcon.getBoundingClientRect();
    const startX = targetRect.left - lastRect.left;
    const startY = targetRect.top - lastRect.top;

    appFrame.style.transition = 'none';
    appFrame.style.transform = `translate(${startX}px, ${startY}px) scale(0.1)`;
    appFrame.style.opacity = '0';
    appFrame.style.display = 'block';

    bringToFront(appName);

    setTimeout(() => {
        appFrame.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
        appFrame.style.transform = 'translate(0, 0) scale(1)';
        appFrame.style.opacity = '1';
    }, 10);
}

function bringToFront(appName) {
    const zIndexApp = 1002;
    const zIndexOther = 1001;
    musicPlayerFrame.style.zIndex = zIndexOther;
    controlPanelFrame.style.zIndex = zIndexOther;
    live2dWallpaperFrame.style.zIndex = zIndexOther;
    fileExplorerFrame.style.zIndex = zIndexOther; // [KEPT] Dari file lokal

    if (appName === 'music') {
        musicPlayerFrame.style.zIndex = zIndexApp;
    } else if (appName === 'cp') {
        controlPanelFrame.style.zIndex = zIndexApp;
    } else if (appName === 'live2d') {
        live2dWallpaperFrame.style.zIndex = zIndexApp;
    } else if (appName === 'explorer') { // [KEPT] Dari file lokal
        fileExplorerFrame.style.zIndex = zIndexApp;
    }
}

function setupAppInteractions() {
    thisPcIcon.addEventListener('dblclick', () => openApp('explorer')); // [KEPT] Dari file lokal
    controlPanelIcon.addEventListener('dblclick', () => openApp('cp'));
    musicPlayerIcon.addEventListener('dblclick', () => openApp('music'));
    live2dIcon.addEventListener('dblclick', () => openApp('live2d'));

    taskbarExplorerIcon.addEventListener('click', () => { // [KEPT] Dari file lokal
        if (!isExplorerOpen) {
            openApp('explorer');
        } else {
            (fileExplorerFrame.style.opacity === '1' && fileExplorerFrame.style.display !== 'none') ? minimizeApp('explorer') : restoreApp('explorer');
        }
    });
    taskbarControlPanelIcon.addEventListener('click', () => {
        if (!isControlPanelOpen) return;
        (controlPanelFrame.style.opacity === '1' && controlPanelFrame.style.display !== 'none') ? minimizeApp('cp') : restoreApp('cp');
    });
    taskbarMusicIcon.addEventListener('click', () => {
        if (!isMusicPlayerOpen) return;
        (musicPlayerFrame.style.opacity === '1' && musicPlayerFrame.style.display !== 'none') ? minimizeApp('music') : restoreApp('music');
    });
    taskbarLive2dIcon.addEventListener('click', () => {
        if (!isLive2dOpen) return;
        (live2dWallpaperFrame.style.opacity === '1' && live2dWallpaperFrame.style.display !== 'none') ? minimizeApp('live2d') : restoreApp('live2d');
    });
}

// --- VISUALIZER FUNCTIONS ---

function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    visualizerCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);

    if (!visualizerData || visualizerData.isPaused) {
        if (previousBarHeights.some(h => h > 0.1)) {
            for (let i = 0; i < previousBarHeights.length; i++) { previousBarHeights[i] *= 0.9; }
        } else { return; }
    }

    const bufferLength = visualizerData ? visualizerData.bufferLength : previousBarHeights.length;
    if (bufferLength === 0) return;
    while (previousBarHeights.length < bufferLength) previousBarHeights.push(0);

    const computedStyle = getComputedStyle(document.body);
    visualizerCtx.fillStyle = computedStyle.getPropertyValue('--visualizer-fill').trim();
    visualizerCtx.shadowBlur = visualizerSettings.shadowBlur;
    visualizerCtx.shadowColor = computedStyle.getPropertyValue('--visualizer-shadow').trim();

    const bassEndIndex = Math.floor(bufferLength * visualizerSettings.bassEndPercentage);
    const trebleStartIndex = Math.floor(bufferLength * visualizerSettings.trebleStartPercentage);

    if (currentTaskbarPosition === 'top' || currentTaskbarPosition === 'bottom') {
        const barWidth = visualizerCanvas.width / bufferLength;
        for (let i = 0; i < bufferLength; i++) {
            let targetHeight = (visualizerData && !visualizerData.isPaused) ? (visualizerData.data[i] / 255) * visualizerCanvas.height : previousBarHeights[i];
            if (visualizerData && !visualizerData.isPaused) {
                if (i <= bassEndIndex) targetHeight *= visualizerSettings.bassMultiplier;
                else if (i >= trebleStartIndex) targetHeight *= (1.0 + visualizerSettings.trebleBoostAmount * ((i - trebleStartIndex) / (bufferLength - trebleStartIndex)));
                else targetHeight *= visualizerSettings.midBoostAmount;
                targetHeight = Math.pow(targetHeight / visualizerCanvas.height, visualizerSettings.scalingPower) * visualizerCanvas.height;
            }
            const smoothedHeight = (previousBarHeights[i] || 0) + (targetHeight - (previousBarHeights[i] || 0)) * visualizerSettings.smoothingFactor;
            const y = currentTaskbarPosition === 'top' ? 0 : visualizerCanvas.height - smoothedHeight;
            visualizerCtx.fillRect(i * barWidth, y, barWidth, smoothedHeight);
            previousBarHeights[i] = smoothedHeight;
        }
    } else {
        const barHeight = visualizerCanvas.height / bufferLength;
        for (let i = 0; i < bufferLength; i++) {
            let targetWidth = (visualizerData && !visualizerData.isPaused) ? (visualizerData.data[i] / 255) * visualizerCanvas.width : previousBarHeights[i];
            if (visualizerData && !visualizerData.isPaused) {
                if (i <= bassEndIndex) targetWidth *= visualizerSettings.bassMultiplier;
                else if (i >= trebleStartIndex) targetWidth *= (1.0 + visualizerSettings.trebleBoostAmount * ((i - trebleStartIndex) / (bufferLength - trebleStartIndex)));
                else targetWidth *= visualizerSettings.midBoostAmount;
                targetWidth = Math.pow(targetWidth / visualizerCanvas.width, visualizerSettings.scalingPower) * visualizerCanvas.width;
            }
            const smoothedWidth = (previousBarHeights[i] || 0) + (targetWidth - (previousBarHeights[i] || 0)) * visualizerSettings.smoothingFactor;
            const x = currentTaskbarPosition === 'left' ? 0 : visualizerCanvas.width - smoothedWidth;
            visualizerCtx.fillRect(x, i * barHeight, smoothedWidth, barHeight);
            previousBarHeights[i] = smoothedWidth;
        }
    }
}

function positionVisualizer() {
    const isIsland = currentTaskbarStyle.startsWith('island');
    const isSpecialCenterCase = (currentTaskbarStyle === 'island-single' && !isTaskbarSpaceBetween);

    if (isIsland) {
        visualizerCanvas.style.borderRadius = visualizerSettings.islandBorderRadius;
    } else {
        visualizerCanvas.style.borderRadius = '0';
    }

    ['top', 'bottom', 'left', 'right'].forEach(p => visualizerCanvas.style[p] = 'auto');

    if (isSpecialCenterCase && (currentTaskbarPosition === 'top' || currentTaskbarPosition === 'bottom')) {
        const rect = taskbar.getBoundingClientRect();
        const vizWidth = 500;
        visualizerCanvas.width = vizWidth;
        visualizerCanvas.height = visualizerSettings.height;
        visualizerCanvas.style.width = vizWidth + 'px';
        visualizerCanvas.style.height = visualizerSettings.height + 'px';
        visualizerCanvas.style.left = `calc(50% - ${vizWidth / 2}px)`;
        if (currentTaskbarPosition === 'top') {
            visualizerCanvas.style.top = (rect.bottom + visualizerSettings.islandGap) + 'px';
        } else {
            visualizerCanvas.style.top = (rect.top - visualizerSettings.height - visualizerSettings.islandGap) + 'px';
        }
    } else {
        const rect = taskbar.getBoundingClientRect();
        if (currentTaskbarPosition === 'top' || currentTaskbarPosition === 'bottom') {
            visualizerCanvas.width = rect.width;
            visualizerCanvas.height = visualizerSettings.height;
            visualizerCanvas.style.width = rect.width + 'px';
            visualizerCanvas.style.height = visualizerSettings.height + 'px';
            visualizerCanvas.style.left = rect.left + 'px';
            if (currentTaskbarPosition === 'top') {
                visualizerCanvas.style.top = (isIsland ? rect.bottom + visualizerSettings.islandGap : rect.bottom) + 'px';
            } else {
                visualizerCanvas.style.top = (isIsland ? (rect.top - visualizerSettings.height - visualizerSettings.islandGap) : (rect.top - visualizerSettings.height)) + 'px';
            }
        } else {
            visualizerCanvas.width = visualizerSettings.width;
            visualizerCanvas.height = rect.height;
            visualizerCanvas.style.width = visualizerSettings.width + 'px';
            visualizerCanvas.style.height = rect.height + 'px';
            visualizerCanvas.style.top = rect.top + 'px';
            if (currentTaskbarPosition === 'left') {
                visualizerCanvas.style.left = (isIsland ? rect.right + visualizerSettings.islandGap : rect.right) + 'px';
            } else {
                visualizerCanvas.style.left = (isIsland ? (rect.left - visualizerSettings.width - visualizerSettings.islandGap) : (rect.left - visualizerSettings.width)) + 'px';
            }
        }
    }
}

// --- TASKBAR & LAYOUT FUNCTIONS ---
function applyTaskbarLayout(position) {
    currentTaskbarPosition = position;
    const isVertical = position === 'left' || position === 'right';
    taskbarMainGroup.classList.toggle('flex-col', isVertical);
    appIconsContainer.classList.toggle('flex-col', isVertical);
    systemTray.classList.toggle('flex-col', isVertical);
    positionVisualizer();
}

function applyTaskbarStyle(style) {
    currentTaskbarStyle = style;
    taskbar.classList.remove('island', 'single', 'split', 'space-between');

    // Hapus semua inline style saat kembali ke default
    if (style === 'default') {
        // Ini cara paling bersih untuk mengembalikan taskbar ke gaya CSS aslinya
        taskbar.removeAttribute('style');
    }

    if (style === 'island-single') taskbar.classList.add('island', 'single');
    if (style === 'island-split') taskbar.classList.add('island', 'split');
    if (isTaskbarSpaceBetween && style.startsWith('island')) taskbar.classList.add('space-between');
    setTimeout(positionVisualizer, 50);
}

// --- CONTEXT MENU FUNCTIONS ---
function showDesktopContextMenu(e) {
    startMenu.classList.remove('show');
    explorerGeneralMenu.style.display = 'none';
    explorerItemMenu.style.display = 'none';

    contextMenu.style.display = 'block';
    const { clientX: mouseX, clientY: mouseY } = e;
    const { offsetWidth: menuWidth, offsetHeight: menuHeight } = contextMenu;
    const { innerWidth: windowWidth, innerHeight: windowHeight } = window;
    let x = (mouseX + menuWidth > windowWidth) ? windowWidth - menuWidth - 5 : mouseX;
    let y = (mouseY + menuHeight > windowHeight) ? windowHeight - menuHeight - 5 : mouseY;
    contextMenu.style.top = `${y}px`; contextMenu.style.left = `${x}px`;
}

function showExplorerContextMenu(data, frameRect) {
    // Hide other menus
    startMenu.classList.remove('show');
    contextMenu.style.display = 'none';
    explorerGeneralMenu.style.display = 'none';
    explorerItemMenu.style.display = 'none';

    const { type, states, clickPosition } = data;

    const menuToShow = (type === 'item') ? explorerItemMenu : explorerGeneralMenu;

    // Set disabled states
    explorerGeneralMenu.querySelector('#explorer-general-paste').classList.toggle('disabled', states.pasteDisabled);
    explorerGeneralMenu.querySelector('#explorer-general-undo').classList.toggle('disabled', states.undoDisabled);

    explorerItemMenu.querySelector('#explorer-item-cut').classList.toggle('disabled', states.itemActionsDisabled);
    explorerItemMenu.querySelector('#explorer-item-copy').classList.toggle('disabled', states.itemActionsDisabled);
    explorerItemMenu.querySelector('#explorer-item-delete').classList.toggle('disabled', states.itemActionsDisabled);
    explorerItemMenu.querySelector('#explorer-item-rename').classList.toggle('disabled', states.renameDisabled);

    menuToShow.style.display = 'block';

    const x = frameRect.left + clickPosition.x;
    const y = frameRect.top + clickPosition.y;

    // Position it, making sure it doesn't go off-screen
    const { offsetWidth: menuWidth, offsetHeight: menuHeight } = menuToShow;
    const { innerWidth: windowWidth, innerHeight: windowHeight } = window;

    let finalX = (x + menuWidth > windowWidth) ? windowWidth - menuWidth - 5 : x;
    let finalY = (y + menuHeight > windowHeight) ? windowHeight - menuHeight - 5 : y;
    menuToShow.style.left = `${finalX}px`;
    menuToShow.style.top = `${finalY}px`;

    // Submenu positioning logic
    menuToShow.querySelectorAll('.submenu').forEach(submenu => {
        const itemRect = submenu.parentElement.getBoundingClientRect();
        const subRect = submenu.getBoundingClientRect(); // this is just for width/height
        if (itemRect.right + submenu.offsetWidth > windowWidth) {
            submenu.style.left = 'auto';
            submenu.style.right = 'calc(100% - 5px)';
        } else {
            submenu.style.left = 'calc(100% - 5px)';
            submenu.style.right = 'auto';
        }
    });
}

function setupExplorerContextMenuActions() {
    const menus = [explorerGeneralMenu, explorerItemMenu];
    menus.forEach(menu => {
        menu.addEventListener('click', (e) => {
            const item = e.target.closest('[data-command]');
            if (item && !item.classList.contains('disabled')) {
                const command = item.dataset.command;
                fileExplorerFrame.contentWindow.postMessage({ action: 'execute-explorer-command', value: command }, '*');

                if (!item.querySelector('.submenu')) {
                    explorerGeneralMenu.style.display = 'none';
                    explorerItemMenu.style.display = 'none';
                }
            }
        });
    });
}

function setupMenus() {

    desktop.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showDesktopContextMenu(e);
    });

    clickInterceptor.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showDesktopContextMenu(e);
    });

    document.addEventListener('click', (e) => {
        if (contextMenu.style.display === 'block' && !contextMenu.contains(e.target)) {
            contextMenu.style.display = 'none';
        }
        if (startMenu.classList.contains('show') && !e.composedPath().includes(startMenu) && !startButton.contains(e.target)) {
            startMenu.classList.remove('show');
        }
        if (!e.target.closest('.explorer-context-menu')) {
            explorerGeneralMenu.style.display = 'none';
            explorerItemMenu.style.display = 'none';
        }
        if (notificationCenter.classList.contains('show') &&
            !notificationCenter.contains(e.target) &&
            !notificationCenterTrigger.contains(e.target)
        ) {
            notificationCenter.classList.remove('show');
        }
    });

    contextMenuSettings.addEventListener('click', () => {
        openApp('cp');
        contextMenu.style.display = 'none';
    });

    contextMenuRefresh.addEventListener('click', () => {
        contextMenu.style.display = 'none';

        const icons = Array.from(document.querySelectorAll('#desktop-icons .desktop-icon'));
        const animationDelay = 150;

        icons.forEach(icon => {
            icon.classList.remove('animate-in');
            icon.classList.add('hide-for-refresh');
        });

        setTimeout(() => {
            icons.forEach((icon, index) => {
                setTimeout(() => {
                    icon.classList.remove('hide-for-refresh');
                    icon.classList.add('animate-in');
                }, index * animationDelay);
            });
        }, 50);
    });

    notificationCenterTrigger.addEventListener('click', (event) => {
        event.stopPropagation();
        startMenu.classList.remove('show');
        contextMenu.style.display = 'none';
        notificationCenter.classList.toggle('show');
    });
}

function setupClickForwarding() {
    const interceptor = clickInterceptor;
    let reEnableTimerId = null;

    const startReEnableTimer = () => {
        clearTimeout(reEnableTimerId);
        reEnableTimerId = setTimeout(() => {
            if (interceptor.style.pointerEvents === 'none') {
                interceptor.style.pointerEvents = 'auto';
            }
        }, 500);
    };

    interceptor.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            clearTimeout(reEnableTimerId);
            interceptor.style.pointerEvents = 'none';
            const onInteractionEnd = () => {
                startReEnableTimer();
                window.removeEventListener('mouseup', onInteractionEnd);
                window.removeEventListener('mouseleave', onInteractionEnd);
            };
            window.addEventListener('mouseup', onInteractionEnd, { once: true });
            window.addEventListener('mouseleave', onInteractionEnd, { once: true });
        }
    });
}


// === APPLICATION INITIALIZATION ===
function initialize() {
    setupWallpaperDragDrop();
    setupAppInteractions();
    setupMenus();
    setupClickForwarding();
    setupExplorerContextMenuActions();

    // This listener is now handled inside startmenu.js
    // window.addEventListener('resize', () => {
    //     if (startMenu.classList.contains('show')) {
    //         positionStartMenu();
    //     }
    // });

    clearAllBtn.addEventListener('click', () => {
        // 1. Temukan dan hapus semua elemen .notification-item
        notificationList.querySelectorAll('.notification-item').forEach(item => item.remove());

        // 2. Tampilkan kembali placeholder "Tidak ada notifikasi"
        //    (Fungsi addNotificationToCenter Anda sudah menyembunyikannya)
        notificationPlaceholder.style.display = 'block';
    });

    window.addEventListener('message', (event) => {
        console.log('[Desktop] Message received from iframe. Action:', event.data.action, 'Full data:', event.data);
        const { action, dx, dy, data, bufferLength, isPaused, value, appName, volume } = event.data;

        switch (action) {
            case 'stop-music-frame': {
                isPaused = true;
                visualizerData = null;
                visualizerCanvas.style.display = 'none';
                break;
            }
            case 'volume-change-start':
                console.log('[Desktop] Volume change started.');
                isVolumeChanging = true;
                if (isPillActive && activePillType === 'volume') {
                    clearTimeout(pillTimer);
                    pillTimer = setTimeout(() => {
                        if (!isVolumeChanging) hidePill();
                    }, 2000);
                }
                break;
            case 'volume-change-end':
                console.log('[Desktop] Volume change ended.');
                isVolumeChanging = false;
                if (isPillActive && activePillType === 'volume') {
                    clearTimeout(pillTimer);
                    pillTimer = setTimeout(() => {
                        if (!isVolumeChanging) {
                            hidePill();
                        }
                    }, 500);
                }
                break;
            case 'show-media-notification': {
                console.log('[Desktop] Handling "show-media-notification". Title:', event.data.title, 'Album Art URL:', event.data.albumArt);
                showNotification(event.data.title, event.data.artist, event.data.albumArt);
                break;
            }
            case 'show-explorer-context-menu': {
                const explorerFrameRect = fileExplorerFrame.getBoundingClientRect();
                showExplorerContextMenu(data, explorerFrameRect);
                break;
            }
            case 'test-toast-notification': {
                const testIcon = `<svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
                showNotification(
                    "Test Notification",
                    "This is a test notification from the Control Panel.",
                    testIcon
                );
                break;
            }
            case 'drag-music-frame': { const rect = musicPlayerFrame.getBoundingClientRect(); musicPlayerFrame.style.left = `${rect.left + dx}px`; musicPlayerFrame.style.top = `${rect.top + dy}px`; break; }
            case 'close-music-frame': closeApp('music'); break;
            case 'minimize-music-frame': minimizeApp('music'); break;
            case 'bring-music-to-front': bringToFront('music'); break;
            case 'visualizer-data': visualizerData = { data: data, bufferLength: bufferLength, isPaused: isPaused }; break;
            case 'show-volume-flyout': { showVolumeNotification(event.data.volume); break; }
            case 'drag-cp-frame': { const rect = controlPanelFrame.getBoundingClientRect(); controlPanelFrame.style.left = `${rect.left + dx}px`; controlPanelFrame.style.top = `${rect.top + dy}px`; break; }
            case 'close-cp-frame': closeApp('cp'); break;
            case 'minimize-cp-frame': minimizeApp('cp'); break;
            case 'bring-cp-to-front': bringToFront('cp'); break;
            case 'drag-explorer-frame': { const rect = fileExplorerFrame.getBoundingClientRect(); fileExplorerFrame.style.left = `${rect.left + dx}px`; fileExplorerFrame.style.top = `${rect.top + dy}px`; break; }
            case 'close-explorer-frame': closeApp('explorer'); break;
            case 'minimize-explorer-frame': minimizeApp('explorer'); break;
            case 'bring-explorer-to-front': bringToFront('explorer'); break;
            case 'drag-live2d-frame': { const rect = live2dWallpaperFrame.getBoundingClientRect(); live2dWallpaperFrame.style.left = `${rect.left + dx}px`; live2dWallpaperFrame.style.top = `${rect.top + dy}px`; break; }
            case 'close-live2d-frame': closeApp('live2d'); break;
            case 'minimize-live2d-frame': minimizeApp('live2d'); break;
            case 'bring-live2d-to-front': bringToFront('live2d'); break;
            case 'set-live-wallpaper':
                wallpaperIframe.src = value;
                wallpaperIframe.style.display = 'block';
                clickInterceptor.style.display = 'block';
                desktop.style.backgroundImage = 'none';
                document.querySelector('.desktop-image').style.display = 'none';
                break;
            case 'clear-live-wallpaper':
                wallpaperIframe.src = 'about:blank';
                wallpaperIframe.style.display = 'none';
                clickInterceptor.style.display = 'none';
                document.querySelector('.desktop-image').style.display = 'block';
                break;
            case 'open-app-from-start-menu':
                openApp(appName);
                startMenu.classList.remove('show');
                break;
            case 'toggle-fancy-mode':
                document.body.classList.toggle('fancy-mode', value);
                musicPlayerFrame.contentWindow.postMessage({ action: 'toggle-fancy-mode', value: value }, '*');
                controlPanelFrame.contentWindow.postMessage({ action: 'toggle-fancy-mode', value: value }, '*');
                if (typeof toggleFancyMode === 'function') {
                    toggleFancyMode(value);
                }
                window.dispatchEvent(new CustomEvent('fancy-mode-toggled', { detail: { value } }));
                live2dWallpaperFrame.contentWindow.postMessage({ action: 'toggle-fancy-mode', value: value }, '*');
                fileExplorerFrame.contentWindow.postMessage({ action: 'toggle-fancy-mode', value: value }, '*');
                break;
            case 'request-settings':
                controlPanelFrame.contentWindow.postMessage({ action: 'request-settings' }, '*');
                break;
            case 'change-theme': {
                const isDark = value === 'dark';
                document.body.classList.toggle('dark', isDark);
                musicPlayerFrame.contentWindow.postMessage({ action: 'theme-change', isDark }, '*');
                controlPanelFrame.contentWindow.postMessage({ action: 'theme-change', isDark }, '*');
                if (typeof applyTheme === 'function') {
                    applyTheme(isDark);
                }
                window.dispatchEvent(new CustomEvent('theme-changed', { detail: { isDark } }));
                break;
            }
            case 'change-bg-size':
                desktopImage.style.objectFit = value === 'auto' ? 'none' : value;
                desktop.style.backgroundSize = value;
                break;
            case 'change-bg-repeat':
                if (value === 'no-repeat') {
                    desktopImage.style.display = 'block';
                    desktop.style.backgroundImage = 'none';
                } else {
                    desktopImage.style.display = 'none';
                    desktop.style.backgroundImage = `url('${desktopImage.src}')`;
                }
                desktop.style.backgroundRepeat = value;
                break;
            case 'change-bg-position':
                desktopImage.style.objectPosition = value;
                desktop.style.backgroundPosition = value;
                break;
            case 'change-taskbar-position':
                taskbar.className = taskbar.className.replace(/taskbar-(bottom|top|left|right)/, `taskbar-${value}`);
                applyTaskbarLayout(value);
                if (startMenu.classList.contains('show')) {
                    // Logic moved to startmenu.js
                }
                break;
            case 'change-taskbar-style':
                applyTaskbarStyle(value);
                if (startMenu.classList.contains('show')) {
                    // Logic moved to startmenu.js
                }
                break;
            case 'toggle-taskbar-space-between':
                isTaskbarSpaceBetween = value;
                taskbar.classList.toggle('space-between', value);
                setTimeout(positionVisualizer, 50);
                break;
            case 'toggle-clock':
                datetimeContainer.style.display = value ? 'block' : 'none';
                break;
        }
    });

    setInterval(updateClock, 1000);
    updateClock();

    window.addEventListener('load', () => {
        applyTaskbarLayout(currentTaskbarPosition);
        window.addEventListener('resize', () => {
            setTimeout(positionVisualizer, 50);
        });
        window.addEventListener('scroll', () => {
            if (startMenu.classList.contains('show')) {
                // This is handled by startmenu.js now
            }
        }, true);

        setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 350);
    });

    document.querySelectorAll('.quick-setting-btn').forEach(button => {
        button.addEventListener('click', () => {
            button.classList.toggle('active');
        });
    });

    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 100);
}

initialize();