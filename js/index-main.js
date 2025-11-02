// === ALL ELEMENT DECLARATIONS (Diambil dari DOM saat script dimuat) ===
const desktop = document.getElementById("desktop");
const desktopImage = document.querySelector(".desktop-image"); 
const wallpaperIframe = document.getElementById("wallpaper-iframe");
const clickInterceptor = document.getElementById("click-interceptor");

const notificationList = document.getElementById("notification-list");
const notificationPlaceholder = document.getElementById("notification-placeholder");
const clearAllBtn = document.getElementById("clear-all-notifications-btn");

const controlPanelIcon = document.getElementById("control-panel-icon");
const controlPanelFrame = document.getElementById("control-panel-frame");
const musicPlayerIcon = document.getElementById("music-player-icon");
const musicPlayerFrame = document.getElementById("music-player-frame");
const live2dIcon = document.getElementById("live2d-icon");
const notificationCenterTrigger = document.getElementById("notification-center-trigger");
const live2dWallpaperFrame = document.getElementById("live2d-wallpaper-frame");
const videoPlayerIcon = document.getElementById("video-player-icon");
const videoPlayerFrame = document.getElementById("video-player-frame");
const thisPcIcon = document.getElementById("this-pc-icon");
const fileExplorerFrame = document.getElementById("file-explorer-frame");

// Visualizer Elements
const visualizerCanvas = document.getElementById("visualizer");
const visualizerCtx = visualizerCanvas ? visualizerCanvas.getContext("2d") : null;

// Taskbar Elements
const taskbar = document.getElementById("taskbar");
const datetimeContainer = document.getElementById("datetime-container");
const clockElement = document.getElementById("clock");
const dateElement = document.getElementById("date");
const systemTray = document.getElementById("system-tray");
const taskbarMainGroup = document.getElementById("taskbar-main-group");
const appIconsContainer = document.getElementById("app-icons");
const taskbarControlPanelIcon = document.getElementById("taskbar-cp-icon");
const taskbarMusicIcon = document.getElementById("taskbar-music-icon");
const taskbarLive2dIcon = document.getElementById("taskbar-live2d-icon");
const taskbarVideoPlayerIcon = document.getElementById("taskbar-video-player-icon");
const notificationCenter = document.getElementById("notification-center");
const taskbarExplorerIcon = document.getElementById("taskbar-explorer-icon");

const startButton = document.getElementById("start-button");
// FIX: Pastikan Start Menu ada di DOM (perlu dikembalikan ke index.html jika hilang)
const startMenu = document.getElementById("start-menu"); 

// Context Menu Elements
const contextMenu = document.getElementById("context-menu");
const contextMenuSettings = document.getElementById("context-menu-settings");
const contextMenuRefresh = document.getElementById("context-menu-refresh");
const explorerGeneralMenu = document.getElementById("explorer-context-menu-general");
const explorerItemMenu = document.getElementById("explorer-context-menu-item");

// Pill/Flyout Elements
const volumeContent = document.getElementById("volume-content");
const volumeIcon = document.getElementById("volume-icon");
const volumeBarFill = document.getElementById("volume-bar-fill");
const volumeValue = document.getElementById("volume-value");

const notificationContent = document.getElementById("notification-content");
const pillContainer = document.getElementById("pill-container");
const closeButton = document.getElementById("close-button");
const notifIcon = document.getElementById("notification-icon");
const notifTitle = document.getElementById("notification-title");
const notifMessage = document.getElementById("notification-message");

// Global State Variables
let isMusicPlayerOpen = false;
let isControlPanelOpen = false;
let isLive2dOpen = false;
let isVideoPlayerOpen = false; 
let isExplorerOpen = false; 
let lastMusicPlayerRect = null;
let lastControlPanelRect = null;
let lastLive2dRect = null;
let lastVideoPlayerRect = null; 
let lastExplorerRect = null; 
let visualizerData = null;
let previousBarHeights = [];
let currentTaskbarPosition = "bottom";
let currentTaskbarStyle = "default";
let isTaskbarSpaceBetween = false;
let isMusicPlayerMaximized = false;
let isControlPanelMaximized = false;
let isLive2dMaximized = false;
let isVideoPlayerMaximized = false; 
let isExplorerMaximized = false;

let originalMusicPlayerRect = null;
let originalControlPanelRect = null;
let originalLive2dRect = null;
let originalVideoPlayerRect = null; 
let originalExplorerRect = null;

// For toast notification
let pillTimer; 
let volumeChangeTimer; 
let isPillActive = false; 
let activePillType = null;
let isVisualizerFading = false;
let isVolumeChanging = false; 

function debugTaskbarState(phase) {
    if (!taskbar) return;
    const rect = taskbar.getBoundingClientRect();
    const computed = getComputedStyle(taskbar);
    console.log(
        `%c[DEBUG ${phase}] TASKBAR:`,
        "background: #222; color: #fff; padding: 2px 5px;",
        {
            classes: taskbar.className,
            position: computed.position,
            display: computed.display,
            left: computed.left,
            bottom: (window.innerHeight - rect.bottom).toFixed(1),
            width: rect.width.toFixed(1),
            borderRadius: computed.borderRadius,
            actualRect: {
                left: rect.left.toFixed(1),
                bottom: (window.innerHeight - rect.bottom).toFixed(1),
                width: rect.width.toFixed(1),
            },
        },
    );
}

// For toast notification, Fungsi Show Pill
const showPill = (type, duration = 5000) => {
    // FIX: Tambahkan pengecekan elemen penting
    if (!pillContainer || !taskbar || !visualizerCanvas || !taskbarMainGroup || !systemTray || !notificationContent || !volumeContent) {
        console.error("Pill/Taskbar elements not initialized. Cannot show pill.");
        return;
    }

    if (isPillActive && type === activePillType) {
        // Jika tipe sama, hanya reset timer
        clearTimeout(pillTimer);
        pillTimer = setTimeout(() => {
            if (type === "volume" && isVolumeChanging) return;
            hidePill();
        }, duration);
        return;
    }

    // Jika pill sudah aktif tapi tipenya BEDA (misal dari notif ke volume)
    if (isPillActive && type !== activePillType) {
        const currentContent =
            activePillType === "notification"
                ? notificationContent
                : volumeContent;
        const newContent =
            type === "notification" ? notificationContent : volumeContent;

        // 1. Fade out konten lama
        currentContent.style.opacity = "0";

        // 2. Setelah fade out, ganti konten dan fade in
        setTimeout(() => {
            currentContent.style.display = "none";
            newContent.style.display = "flex";
            // Beri sedikit waktu untuk browser me-render display:flex
            setTimeout(() => {
                newContent.style.opacity = "1";
            }, 20);
        }, 300); // Sesuaikan dengan durasi transisi opacity konten

        activePillType = type;
        clearTimeout(pillTimer);
        pillTimer = setTimeout(() => {
            if (type === "volume" && isVolumeChanging) return;
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
    $(pillContainer).data("originalRect", taskbarRect); // Simpan untuk animasi kembali

    // 2. Sembunyikan konten taskbar & visualizer
    taskbarMainGroup.style.opacity = "0";
    systemTray.style.opacity = "0";
    visualizerCanvas.style.opacity = "0";

    // 3. Atur posisi awal pill agar sama persis dengan taskbar (tapi masih transparan)
    pillContainer.style.transition = "none"; // Matikan transisi sementara
    pillContainer.style.left = `${taskbarRect.left}px`;
    pillContainer.style.top = `${taskbarRect.top}px`;
    pillContainer.style.width = `${taskbarRect.width}px`;
    pillContainer.style.height = `${taskbarRect.height}px`;
    pillContainer.style.borderRadius = taskbarStyle.borderRadius;

    // 4. Siapkan konten yang akan ditampilkan di dalam pill
    const activeContent =
        type === "notification" ? notificationContent : volumeContent;
    notificationContent.style.display = "none";
    volumeContent.style.display = "none";
    activeContent.style.display = "flex";
    activeContent.style.opacity = "0";

    // 5. Jalankan animasi secara sinkron
    requestAnimationFrame(() => {
        // Sembunyikan taskbar asli
        taskbar.style.opacity = "0";
        taskbar.style.pointerEvents = "none";
        pillContainer.classList.remove("hidden"); // Tampilkan pill container

        // Aktifkan lagi transisi dan mulai animasi pill
        pillContainer.style.transition =
            "all 0.45s cubic-bezier(0.4, 0, 0.2, 1)";
        pillContainer.classList.add("show");

        // Tentukan target posisi & ukuran pill
        const pillWidth = 380;
        const pillHeight = 56;
        const targetLeft = window.innerWidth / 2 - pillWidth / 2;
        // KEMBALIKAN: Posisi seperti semula, dekat bagian bawah
        const targetTop = window.innerHeight - pillHeight - 8;

        pillContainer.style.left = `${targetLeft}px`;
        pillContainer.style.top = `${targetTop}px`;
        pillContainer.style.width = `${pillWidth}px`;
        pillContainer.style.height = `${pillHeight}px`;
        // KEMBALIKAN: Bentuk sudut seperti semula
        pillContainer.style.borderRadius = "12px";

        // 6. Fade-in konten di dalam pill setelah animasi morphing berjalan setengah jalan
        setTimeout(() => {
            activeContent.style.opacity = "1";
        }, 200);
    });

    // 7. Atur timer untuk menyembunyikan pill secara otomatis
    pillTimer = setTimeout(() => {
        // Jangan sembunyikan jika pengguna masih menggeser volume
        if (type === "volume" && isVolumeChanging) return;
        hidePill();
    }, duration);
};

const hidePill = () => {
    if (!isPillActive || !pillContainer || !taskbar || !visualizerCanvas || !taskbarMainGroup || !systemTray || !notificationContent || !volumeContent) return;

    clearTimeout(pillTimer);
    const originalRect = $(pillContainer).data("originalRect");
    const morphDuration = 450; 
    const contentFadeDuration = 150; 

    if (!originalRect) {
        // Fallback jika terjadi error
        resetPillState();
        return;
    }

    // 1. Sembunyikan konten di dalam pill (Fade out: 150ms)
    const activeContent =
        activePillType === "notification" ? notificationContent : volumeContent;
    activeContent.style.opacity = "0";

    // 2. Setelah konten pill hilang, mulai animasi morphing balik dan tampilkan konten taskbar
    setTimeout(() => {
        // A. Set target posisi morphing (kembali ke taskbar)
        pillContainer.style.left = `${originalRect.left}px`;
        pillContainer.style.top = `${originalRect.top}px`;
        pillContainer.style.width = `${originalRect.width}px`;
        pillContainer.style.height = `${originalRect.height}px`;
        // Ambil border radius taskbar saat ini (bisa berubah)
        pillContainer.style.borderRadius =
            getComputedStyle(taskbar).borderRadius;

        // Sembunyikan pill bersamaan dengan animasi morphing
        pillContainer.classList.remove("show");

        // B. Tampilkan taskbar asli dan mulai fade in konten taskbar
        taskbar.style.opacity = "1";
        taskbar.style.pointerEvents = "auto";

        // Set transisi untuk fade in konten taskbar (350ms, 50ms delay)
        const taskbarContentFadeInDuration = 350;
        taskbarMainGroup.style.transition = `opacity ${taskbarContentFadeInDuration}ms ease-in 0.05s`;
        systemTray.style.transition = `opacity ${taskbarContentFadeInDuration}ms ease-in 0.05s`;
        visualizerCanvas.style.transition = `opacity ${taskbarContentFadeInDuration}ms ease-in 0.05s`;

        // Mulai fade in konten taskbar
        taskbarMainGroup.style.opacity = "1";
        systemTray.style.opacity = "1";
        if (visualizerCanvas.style.display !== "none") {
            visualizerCanvas.style.opacity = "1";
        }
    }, contentFadeDuration); 

    // 3. Setelah morphing dan fade-in taskbar selesai, reset state
    setTimeout(
        () => {
            // Hapus transisi inline untuk menghindari masalah di kemudian hari
            taskbarMainGroup.style.transition = "";
            systemTray.style.transition = "";
            visualizerCanvas.style.transition = "";
            activeContent.style.display = "none"; // Sembunyikan konten pill secara permanen
            pillContainer.classList.add("hidden"); // Sembunyikan pill container sepenuhnya
            resetPillState();
        },
        contentFadeDuration + morphDuration + 100,
    ); 
};

// Fungsi helper untuk reset transitions
const resetTransitions = () => {
    if (pillContainer) pillContainer.style.transition = "";
    if (notificationContent) notificationContent.style.transition = "";
    if (volumeContent) volumeContent.style.transition = "";
    if (taskbar) taskbar.style.transition = "";
    if (visualizerCanvas) visualizerCanvas.style.transition = "";
};

// Fungsi fallback untuk reset state jika ada error
const resetPillState = () => {
    isPillActive = false;
    activePillType = null;
    // Matikan transisi agar pillContainer segera hilang
    if (pillContainer) {
        pillContainer.style.transition = "none";
        pillContainer.classList.remove("show");
        pillContainer.classList.add("hidden"); // Sembunyikan pill container sepenuhnya
    }
    // Set display to none untuk memastikan elemen tersembunyi
    if (notificationContent) notificationContent.style.display = "none";
    if (volumeContent) volumeContent.style.display = "none";

    // Pastikan semua state kembali normal
    if (taskbar) {
        taskbar.style.opacity = "1";
        taskbar.style.pointerEvents = "auto";
    }
    if (taskbarMainGroup) taskbarMainGroup.style.opacity = "1";
    if (systemTray) systemTray.style.opacity = "1";
    if (visualizerCanvas && visualizerCanvas.style.display !== "none") {
        visualizerCanvas.style.opacity = "1";
    }
};

// Fungsi untuk melanjutkan setelah pill UI hilang dan taskbar kembali normal
const proceedToShowVisualizer = () => {
    if (!visualizerCanvas || !visualizerData) return;
    
    console.log("[DEBUG] proceedToShowVisualizer dipanggil."); 
    
    if (isVisualizerFading) {
        const checkAndProceed = () => {
            if (isVisualizerFading) {
                requestAnimationFrame(checkAndProceed); 
            } else {
                visualizerCanvas.style.transition = "opacity 0.3s ease-in-out"; 
                visualizerCanvas.style.opacity = "1"; 
                isVisualizerFading = true; 

                setTimeout(() => {
                    isVisualizerFading = false; 
                    if (visualizerData && !visualizerData.isPaused) {
                        drawVisualizer(); 
                    }
                }, 300); 
            }
        };
        checkAndProceed();
    } else {
        visualizerCanvas.style.transition = "opacity 0.3s ease-in-out"; 
        visualizerCanvas.style.opacity = "1"; 
        isVisualizerFading = true; 

        setTimeout(() => {
            isVisualizerFading = false; 
            if (visualizerData && !visualizerData.isPaused) {
                drawVisualizer(); 
            }
        }, 300);
    }
};
// Fungsi untuk melanjutkan setelah pill UI hilang dan taskbar kembali normal end

// Wrapper untuk menampilkan notifikasi teks
const showNotification = (title, message, icon) => {
    if (!notifTitle || !notifMessage || !notifIcon || !pillContainer) return;

    addNotificationToCenter(title, message, icon);

    notifTitle.textContent = title;
    notifMessage.textContent = message;

    notifIcon.classList.add("flex", "items-center", "justify-center");

    if (icon && (icon.startsWith("blob:") || icon.startsWith("http"))) {
        notifIcon.innerHTML = `<img src="${icon}" class="w-full h-full object-cover rounded" alt="Notification Icon">`;
    } else if (icon) {
        notifIcon.innerHTML = icon;

        const svg = notifIcon.querySelector("svg");
        if (svg) {
            // No action needed, flex properties handle centering
        }
    } else {
        notifIcon.innerHTML = "";
    }

    showPill("notification"); // Panggil fungsi utama
};

// Wrapper BARU untuk menampilkan notifikasi volume
const showVolumeNotification = (percent) => {
    if (!volumeValue || !volumeBarFill || !volumeIcon) return;
    
    // Pastikan tidak ada race condition
    if (isPillActive && activePillType !== "volume") {
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

    showPill("volume", 1800);
    console.log(
        `[DEBUG] showVolumeNotification: Meminta showPill('volume', 1800) untuk volume ${percent}%.`,
    );
};

// fungsi baru for notification item
const addNotificationToCenter = (title, message, icon) => {
    if (!notificationPlaceholder || !notificationList) return;
    
    // 1. Sembunyikan placeholder jika masih terlihat
    if (notificationPlaceholder.style.display !== "none") {
        notificationPlaceholder.style.display = "none";
    }

    let iconContent = "";
    if (icon && (icon.startsWith("blob:") || icon.startsWith("http"))) {
        iconContent = `<img src="${icon}" class="w-full h-full object-cover rounded" alt="Album Art">`;
    } else if (icon) {
        iconContent = icon;
    }

    // 2. Buat elemen notifikasi baru menggunakan iconContent yang sudah diproses
    const notifItem = document.createElement("div");
    notifItem.className = "notification-item";
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
    const closeBtn = notifItem.querySelector(".notification-item-close");
    closeBtn.addEventListener("click", () => {
        notifItem.remove();
        // Cek jika tidak ada notifikasi lagi, tampilkan kembali placeholder
        if (
            notificationList.querySelectorAll(".notification-item").length === 0
        ) {
            notificationPlaceholder.style.display = "block";
        }
    });
};
// fungsi baru for notification item end

// BARU: Ikon SVG untuk flyout
const volumeIcons = {
    mute: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`,
    low: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>`,
    high: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
};

const visualizerSettings = {
    shadowBlur: 4,
    smoothingFactor: 0.5,
    bassMultiplier: 0.75,
    bassEndPercentage: 0.25,
    midBoostAmount: 0.8,
    trebleStartPercentage: 0.5,
    trebleBoostAmount: 0.2,
    scalingPower: 2.0,
    height: 200,
    width: 120,
    islandBorderRadius: "12px",
    islandGap: 6,
};

// === CORE FUNCTIONS ===

function updateClock() {
    if (!clockElement || !dateElement) return; 
    const now = new Date();
    clockElement.textContent = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    dateElement.textContent = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;
}

function setupWallpaperDragDrop() {
    if (!desktop || !desktopImage || !wallpaperIframe || !clickInterceptor) return;

    desktop.addEventListener("dragover", (e) => {
        e.preventDefault();
        desktop.classList.add("drag-over");
    });
    desktop.addEventListener("dragleave", () => {
        desktop.classList.remove("drag-over");
    });
    desktop.addEventListener("drop", (e) => {
        e.preventDefault();
        desktop.classList.remove("drag-over");
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (event) => {
                // When a new image is dropped, clear the live wallpaper
                wallpaperIframe.src = "about:blank";
                wallpaperIframe.style.display = "none";
                clickInterceptor.style.display = "none"; // NEW: Hide interceptor too

                if (desktopImage) {
                    desktopImage.src = event.target.result;
                    // FIX: Ensure we are in <img> mode when a new image is dropped
                    desktopImage.style.display = "block";
                }
                // FIX: Reset background properties on the container div
                desktop.style.backgroundImage = "none";
                desktop.style.backgroundRepeat = "no-repeat";
            };
            reader.readAsDataURL(file);
        }
    });
}

// Fungsi untuk memperbarui visibilitas ikon Taskbar
function updateTaskbarIconsVisibility() {
    if (taskbarMusicIcon) taskbarMusicIcon.style.display = isMusicPlayerOpen ? 'flex' : 'none';
    if (taskbarControlPanelIcon) taskbarControlPanelIcon.style.display = isControlPanelOpen ? 'flex' : 'none';
    if (taskbarLive2dIcon) taskbarLive2dIcon.style.display = isLive2dOpen ? 'flex' : 'none';
    if (taskbarVideoPlayerIcon) taskbarVideoPlayerIcon.style.display = isVideoPlayerOpen ? 'flex' : 'none';
}


// --- GENERIC APP IFRAME MANAGEMENT ---

function openApp(appName) {
    let appFrame, taskbarIcon;
    if (appName === "music") {
        appFrame = musicPlayerFrame;
        taskbarIcon = taskbarMusicIcon;
        if (isMusicPlayerOpen) {
            bringToFront(appName);
            return;
        }
        isMusicPlayerOpen = true;
    } else if (appName === "cp") {
        appFrame = controlPanelFrame;
        taskbarIcon = taskbarControlPanelIcon;
        if (isControlPanelOpen) {
            bringToFront(appName);
            return;
        }
        isControlPanelOpen = true;
    } else if (appName === "live2d") {
        appFrame = live2dWallpaperFrame;
        taskbarIcon = taskbarLive2dIcon;
        if (isLive2dOpen) {
            bringToFront(appName);
            return;
        }
        isLive2dOpen = true;
    } else if (appName === "video") {
        appFrame = videoPlayerFrame;
        taskbarIcon = taskbarVideoPlayerIcon;
        if (isVideoPlayerOpen) {
            bringToFront(appName);
            return;
        }
        isVideoPlayerOpen = true;
    } else if (appName === "explorer") {
        appFrame = fileExplorerFrame;
        taskbarIcon = taskbarExplorerIcon; 
        if (isExplorerOpen) {
            bringToFront(appName);
            return;
        }
        isExplorerOpen = true;
    }

    if (!appFrame) return; 

    if (appName === "startMenu") {
        appFrame.style.display = "flex";
    } else {
        appFrame.style.display = "block";
    }

    appFrame.style.transition = "none";
    appFrame.style.transform = "scale(1)";
    appFrame.style.opacity = "1";

    bringToFront(appName);

    if (appName === "music" && visualizerCanvas) {
        visualizerCanvas.style.display = "block";
        drawVisualizer();
    }
    
    updateTaskbarIconsVisibility();

    setTimeout(positionVisualizer, 50);
}

function closeApp(appName) {
    let appFrame, taskbarIcon;
    if (appName === "music") {
        isMusicPlayerOpen = false;
        appFrame = musicPlayerFrame;
        taskbarIcon = taskbarMusicIcon;
        if (visualizerCanvas) visualizerCanvas.style.display = "none";
        visualizerData = null;
        if (appFrame && appFrame.contentWindow) appFrame.contentWindow.postMessage({ action: "stop" }, "*");
    } else if (appName === "cp") {
        isControlPanelOpen = false;
        appFrame = controlPanelFrame;
        taskbarIcon = taskbarControlPanelIcon;
    } else if (appName === "live2d") {
        isLive2dOpen = false;
        appFrame = live2dWallpaperFrame;
        taskbarIcon = taskbarLive2dIcon;
    } else if (appName === "video") {
        isVideoPlayerOpen = false;
        appFrame = videoPlayerFrame;
        taskbarIcon = taskbarVideoPlayerIcon;
        if (appFrame && appFrame.contentWindow) appFrame.contentWindow.postMessage({ action: "stop" }, "*");
    } else if (appName === "explorer") {
        isExplorerOpen = false;
        appFrame = fileExplorerFrame;
        taskbarIcon = taskbarExplorerIcon;
    }

    if (!appFrame) return; 

    appFrame.style.display = "none";

    setTimeout(positionVisualizer, 50);
    updateTaskbarIconsVisibility(); 
}

function minimizeApp(appName) {
    let appFrame, lastRect, taskbarIcon;
    if (appName === "music") {
        appFrame = musicPlayerFrame;
        taskbarIcon = taskbarMusicIcon;
        if (appFrame) lastMusicPlayerRect = appFrame.getBoundingClientRect();
        lastRect = lastMusicPlayerRect;
    } else if (appName === "cp") {
        appFrame = controlPanelFrame;
        taskbarIcon = taskbarControlPanelIcon;
        if (appFrame) lastControlPanelRect = appFrame.getBoundingClientRect();
        lastRect = lastControlPanelRect;
    } else if (appName === "live2d") {
        appFrame = live2dWallpaperFrame;
        taskbarIcon = taskbarLive2dIcon;
        if (appFrame) lastLive2dRect = appFrame.getBoundingClientRect();
        lastRect = lastLive2dRect;
    } else if (appName === "video") {
        appFrame = videoPlayerFrame;
        taskbarIcon = taskbarVideoPlayerIcon;
        if (appFrame) lastVideoPlayerRect = appFrame.getBoundingClientRect();
        lastRect = lastVideoPlayerRect;
    } else if (appName === "explorer") {
        appFrame = fileExplorerFrame;
        taskbarIcon = taskbarExplorerIcon;
        if (appFrame) lastExplorerRect = appFrame.getBoundingClientRect();
        lastRect = lastExplorerRect;
    }

    if (!appFrame || !taskbarIcon || !lastRect) return; 

    if (appFrame.style.display === "none" || appFrame.style.opacity === "0")
        return;

    const targetRect = taskbarIcon.getBoundingClientRect();
    const translateX = targetRect.left - lastRect.left;
    const translateY = targetRect.top - lastRect.top;

    appFrame.style.transition = "transform 0.3s ease-in, opacity 0.3s ease-in";
    appFrame.style.transformOrigin = "top left";
    appFrame.style.transform = `translate(${translateX}px, ${translateY}px) scale(0.1)`;
    appFrame.style.opacity = "0";

    setTimeout(() => {
        appFrame.style.display = "none";
    }, 300);
}

// Fungsi untuk memaksimalkan jendela aplikasi
function maximizeApp(appName) {
    let appFrame, originalRectStorage;
    if (!taskbar) return;
    const taskbarHeight = taskbar.offsetHeight;
    const taskbarWidth = taskbar.offsetWidth;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const MAXIMIZED_RADIUS = "8px";
    const WINDOW_GAP = 8; 

    // Tentukan frame dan state yang sesuai
    if (appName === "music") {
        appFrame = musicPlayerFrame;
        originalRectStorage = originalMusicPlayerRect;
    } else if (appName === "cp") {
        appFrame = controlPanelFrame;
        originalRectStorage = originalControlPanelRect;
    } else if (appName === "live2d") {
        appFrame = live2dWallpaperFrame;
        originalRectStorage = originalLive2dRect;
    } else if (appName === "video") {
        appFrame = videoPlayerFrame;
        originalRectStorage = originalVideoPlayerRect;
    } else if (appName === "explorer") {
        appFrame = fileExplorerFrame;
        originalRectStorage = originalExplorerRect;
    } else {
        return;
    }

    if (!appFrame || appFrame.style.display === "none") return; 

    if (
        !appFrame.dataset.isMaximized ||
        appFrame.dataset.isMaximized === "false"
    ) {
        const rect = appFrame.getBoundingClientRect();

        if (!originalRectStorage || rect.width > 100) {
            if (appName === "music") originalMusicPlayerRect = rect;
            else if (appName === "cp") originalControlPanelRect = rect;
            else if (appName === "live2d") originalLive2dRect = rect;
            else if (appName === "video") originalVideoPlayerRect = rect; 
            else if (appName === "explorer") originalExplorerRect = rect;
        }

        let top = WINDOW_GAP;
        let left = WINDOW_GAP;
        let width = windowWidth - 2 * WINDOW_GAP;
        let height = windowHeight - 2 * WINDOW_GAP;
        let borderRadius = `${MAXIMIZED_RADIUS} ${MAXIMIZED_RADIUS} ${MAXIMIZED_RADIUS} ${MAXIMIZED_RADIUS}`;

        const isTaskbarIsland = currentTaskbarStyle.startsWith("island");

        if (isTaskbarIsland) {
            const taskbarRect = taskbar.getBoundingClientRect();
            if (currentTaskbarPosition === "top") {
                const taskbarBottom = taskbarRect.bottom;
                top = taskbarBottom + WINDOW_GAP;
                height = windowHeight - top - WINDOW_GAP;
                borderRadius = `0 0 ${MAXIMIZED_RADIUS} ${MAXIMIZED_RADIUS}`;
            } else if (currentTaskbarPosition === "bottom") {
                const bottomLimitY = taskbarRect.top - WINDOW_GAP;
                height = bottomLimitY - top;
                borderRadius = `${MAXIMIZED_RADIUS} ${MAXIMIZED_RADIUS} ${MAXIMIZED_RADIUS} ${MAXIMIZED_RADIUS}`;
            } else if (currentTaskbarPosition === "left") {
                const taskbarRight = taskbarRect.right;
                left = taskbarRight + WINDOW_GAP;
                width = windowWidth - left - WINDOW_GAP;
                borderRadius = `${MAXIMIZED_RADIUS} ${MAXIMIZED_RADIUS} ${MAXIMIZED_RADIUS} 0`;
            } else if (currentTaskbarPosition === "right") {
                const taskbarLeft = taskbarRect.left;
                width = taskbarLeft - left - WINDOW_GAP;
                borderRadius = `${MAXIMIZED_RADIUS} 0 0 ${MAXIMIZED_RADIUS}`;
            }
        } else {
            left = 0;
            top = 0;
            width = windowWidth;
            height = windowHeight;
            borderRadius = "0"; 

            if (currentTaskbarPosition === "top") {
                top = taskbarHeight;
                height = windowHeight - taskbarHeight;
            } else if (currentTaskbarPosition === "bottom") {
                height = windowHeight - taskbarHeight;
            } else if (currentTaskbarPosition === "left") {
                left = taskbarWidth;
                width = windowWidth - taskbarWidth;
            } else if (currentTaskbarPosition === "right") {
                width = windowWidth - taskbarWidth;
            }
        }

        if (currentTaskbarStyle === 'default' && currentTaskbarPosition === 'bottom') {
            height = windowHeight - taskbarHeight; 
            const CLIP_BUFFER = 1; 
            height -= CLIP_BUFFER; 
        }

        appFrame.style.transition = "all 0.3s ease-in-out";
        appFrame.style.left = `${left}px`;
        appFrame.style.top = `${top}px`;
        appFrame.style.width = `${width}px`;
        appFrame.style.height = `${height}px`;
        appFrame.style.borderRadius = borderRadius;

        appFrame.style.transform = "none";

        appFrame.dataset.isMaximized = "true";
        if (appFrame.contentWindow) appFrame.contentWindow.postMessage(
            {
                action: "set-maximized-state",
                isMaximized: true,
                borderRadius: borderRadius,
            },
            "*",
        );

        if (appName === "music") isMusicPlayerMaximized = true;
        else if (appName === "cp") isControlPanelMaximized = true;
        else if (appName === "live2d") isLive2dMaximized = true;
        else if (appName === "video") isVideoPlayerMaximized = true; 
        else if (appName === "explorer") isExplorerMaximized = true;
    } else {
        restoreMaximizedApp(appName);
    }
}

// Fungsi untuk mengembalikan jendela aplikasi ke ukuran semula
function restoreMaximizedApp(appName) {
    let appFrame, originalRect;

    if (appName === "music") {
        appFrame = musicPlayerFrame;
        originalRect = originalMusicPlayerRect;
    } else if (appName === "cp") {
        appFrame = controlPanelFrame;
        originalRect = originalControlPanelRect;
    } else if (appName === "live2d") {
        appFrame = live2dWallpaperFrame;
        originalRect = originalLive2dRect;
    } else if (appName === "video") {
        appFrame = videoPlayerFrame;
        originalRect = originalVideoPlayerRect;
    } else if (appName === "explorer") {
        appFrame = fileExplorerFrame;
        originalRect = originalExplorerRect;
    } else {
        return;
    }

    if (!appFrame) return; 

    if (!originalRect) {
        console.warn(
            `[${appName}] Original size data not found. Using default restore position.`,
        );
        appFrame.style.transition = "all 0.3s ease-in-out";
        appFrame.style.left = "15%";
        appFrame.style.top = "15%";
        let defaultWidth, defaultHeight;
        if (appName === "music") {
            defaultWidth = "420px";
            defaultHeight = "500px";
        } else if (appName === "cp") {
            defaultWidth = "550px";
            defaultHeight = "550px";
        } else if (appName === "video") {
            defaultWidth = "640px";
            defaultHeight = "500px"; 
        } 
        else {
            defaultWidth = "800px";
            defaultHeight = "500px";
        }

        appFrame.style.width = defaultWidth;
        appFrame.style.height = defaultHeight;
        
        setTimeout(() => {
            appFrame.style.transition = 'none';
            appFrame.offsetHeight; 
        }, 350); 
        
    } else {
        appFrame.style.transition = "all 0.3s ease-in-out";
        appFrame.style.left = `${originalRect.left}px`;
        appFrame.style.top = `${originalRect.top}px`;
        appFrame.style.width = `${originalRect.width}px`;
        appFrame.style.height = `${originalRect.height}px`;

        setTimeout(() => {
            appFrame.style.transition = 'none';
            appFrame.offsetHeight; 
        }, 350); 
    }

    appFrame.dataset.isMaximized = "false";
    if (appFrame.contentWindow) appFrame.contentWindow.postMessage(
        { action: "set-maximized-state", isMaximized: false },
        "*",
    );

    if (appName === "music") isMusicPlayerMaximized = false;
    else if (appName === "cp") isControlPanelMaximized = false;
    else if (appName === "live2d") isLive2dMaximized = false;
    else if (appName === "video") isVideoPlayerMaximized = false; 
    else if (appName === "explorer") isExplorerMaximized = false;
}

function restoreApp(appName) {
    let appFrame, lastRect, taskbarIcon;
    if (appName === "music") {
        appFrame = musicPlayerFrame;
        lastRect = lastMusicPlayerRect;
        taskbarIcon = taskbarMusicIcon;
    } else if (appName === "cp") {
        appFrame = controlPanelFrame;
        lastRect = lastControlPanelRect;
        taskbarIcon = taskbarControlPanelIcon;
    } else if (appName === "live2d") {
        appFrame = live2dWallpaperFrame;
        lastRect = lastLive2dRect;
        taskbarIcon = taskbarLive2dIcon;
    } else if (appName === "video") {
        appFrame = videoPlayerFrame;
        lastRect = lastVideoPlayerRect;
        taskbarIcon = taskbarVideoPlayerIcon;
    } else if (appName === "explorer") {
        appFrame = fileExplorerFrame;
        lastRect = lastExplorerRect;
        taskbarIcon = taskbarExplorerIcon;
    }

    if (!appFrame || !lastRect || !taskbarIcon) return; 

    const targetRect = taskbarIcon.getBoundingClientRect();
    const startX = targetRect.left - lastRect.left;
    const startY = targetRect.top - lastRect.top;

    appFrame.style.transition = "none";
    appFrame.style.transform = `translate(${startX}px, ${startY}px) scale(0.1)`;
    appFrame.style.opacity = "0";
    appFrame.style.display = "block";

    bringToFront(appName);

    setTimeout(() => {
        appFrame.style.transition =
            "transform 0.3s ease-out, opacity 0.3s ease-out";
        appFrame.style.transform = "translate(0, 0) scale(1)";
        appFrame.style.opacity = "1";
    }, 10);
}

function bringToFront(appName) {
    const zIndexApp = 1002;
    const zIndexOther = 1001;

    if (musicPlayerFrame) musicPlayerFrame.style.zIndex = zIndexOther;
    if (controlPanelFrame) controlPanelFrame.style.zIndex = zIndexOther;
    if (live2dWallpaperFrame) live2dWallpaperFrame.style.zIndex = zIndexOther;
    if (videoPlayerFrame) videoPlayerFrame.style.zIndex = zIndexOther; 
    if (fileExplorerFrame) fileExplorerFrame.style.zIndex = zIndexOther; 

    if (appName === "music" && musicPlayerFrame) {
        musicPlayerFrame.style.zIndex = zIndexApp;
    } else if (appName === "cp" && controlPanelFrame) {
        controlPanelFrame.style.zIndex = zIndexApp;
    } else if (appName === "live2d" && live2dWallpaperFrame) {
        live2dWallpaperFrame.style.zIndex = zIndexApp;
    } else if (appName === "video" && videoPlayerFrame) {
        videoPlayerFrame.style.zIndex = zIndexApp;
    } else if (appName === "explorer" && fileExplorerFrame) {
        fileExplorerFrame.style.zIndex = zIndexApp;
    }
}

function setupAppInteractions() {
    if (thisPcIcon) thisPcIcon.addEventListener("dblclick", () => openApp("explorer"));
    if (controlPanelIcon) controlPanelIcon.addEventListener("dblclick", () => openApp("cp"));
    if (musicPlayerIcon) musicPlayerIcon.addEventListener("dblclick", () => openApp("music"));
    if (live2dIcon) live2dIcon.addEventListener("dblclick", () => openApp("live2d"));
    if (videoPlayerIcon) videoPlayerIcon.addEventListener("dblclick", () => openApp("video")); 

    if (taskbarExplorerIcon) taskbarExplorerIcon.addEventListener("click", () => {
        if (!isExplorerOpen) {
            openApp("explorer");
        } else {
            fileExplorerFrame.style.opacity === "1" &&
            fileExplorerFrame.style.display !== "none"
                ? minimizeApp("explorer")
                : restoreApp("explorer");
        }
    });
    if (taskbarControlPanelIcon) taskbarControlPanelIcon.addEventListener("click", () => {
        if (!isControlPanelOpen) return;
        controlPanelFrame.style.opacity === "1" &&
        controlPanelFrame.style.display !== "none"
            ? minimizeApp("cp")
            : restoreApp("cp");
    });
    if (taskbarMusicIcon) taskbarMusicIcon.addEventListener("click", () => {
        if (!isMusicPlayerOpen) return;
        musicPlayerFrame.style.opacity === "1" &&
        musicPlayerFrame.style.display !== "none"
            ? minimizeApp("music")
            : restoreApp("music");
    });
    if (taskbarLive2dIcon) taskbarLive2dIcon.addEventListener("click", () => {
        if (!isLive2dOpen) return;
        live2dWallpaperFrame.style.opacity === "1" &&
        live2dWallpaperFrame.style.display !== "none"
            ? minimizeApp("live2d")
            : restoreApp("live2d");
    });
    if (taskbarVideoPlayerIcon) taskbarVideoPlayerIcon.addEventListener("click", () => {
        if (!isVideoPlayerOpen) return;
        videoPlayerFrame.style.opacity === "1" &&
        videoPlayerFrame.style.display !== "none"
            ? minimizeApp("video")
            : restoreApp("video");
    });
}

// --- VISUALIZER FUNCTIONS ---

function drawVisualizer() {
    if (!visualizerCanvas || !visualizerCtx) return;
    requestAnimationFrame(drawVisualizer);
    visualizerCtx.clearRect(
        0,
        0,
        visualizerCanvas.width,
        visualizerCanvas.height,
    );

    if (!visualizerData || visualizerData.isPaused) {
        if (previousBarHeights.some((h) => h > 0.1)) {
            for (let i = 0; i < previousBarHeights.length; i++) {
                previousBarHeights[i] *= 0.9;
            }
        } else {
            return;
        }
    }

    const bufferLength = visualizerData
        ? visualizerData.bufferLength
        : previousBarHeights.length;
    if (bufferLength === 0) return;
    while (previousBarHeights.length < bufferLength) previousBarHeights.push(0);

    const computedStyle = getComputedStyle(document.body);
    visualizerCtx.fillStyle = computedStyle
        .getPropertyValue("--visualizer-fill")
        .trim();
    visualizerCtx.shadowBlur = visualizerSettings.shadowBlur;
    visualizerCtx.shadowColor = computedStyle
        .getPropertyValue("--visualizer-shadow")
        .trim();

    const bassEndIndex = Math.floor(
        bufferLength * visualizerSettings.bassEndPercentage,
    );
    const trebleStartIndex = Math.floor(
        bufferLength * visualizerSettings.trebleStartPercentage,
    );

    if (
        currentTaskbarPosition === "top" ||
        currentTaskbarPosition === "bottom"
    ) {
        const barWidth = visualizerCanvas.width / bufferLength;
        for (let i = 0; i < bufferLength; i++) {
            let targetHeight =
                visualizerData && !visualizerData.isPaused
                    ? (visualizerData.data[i] / 255) * visualizerCanvas.height
                    : previousBarHeights[i];
            if (visualizerData && !visualizerData.isPaused) {
                if (i <= bassEndIndex)
                    targetHeight *= visualizerSettings.bassMultiplier;
                else if (i >= trebleStartIndex)
                    targetHeight *=
                        1.0 +
                        visualizerSettings.trebleBoostAmount *
                            ((i - trebleStartIndex) /
                                (bufferLength - trebleStartIndex));
                else targetHeight *= visualizerSettings.midBoostAmount;
                targetHeight =
                    Math.pow(
                        targetHeight / visualizerCanvas.height,
                        visualizerSettings.scalingPower,
                    ) * visualizerCanvas.height;
            }
            const smoothedHeight =
                (previousBarHeights[i] || 0) +
                (targetHeight - (previousBarHeights[i] || 0)) *
                    visualizerSettings.smoothingFactor;
            const y =
                currentTaskbarPosition === "top"
                    ? 0
                    : visualizerCanvas.height - smoothedHeight;
            visualizerCtx.fillRect(i * barWidth, y, barWidth, smoothedHeight);
            previousBarHeights[i] = smoothedHeight;
        }
    } else {
        const barHeight = visualizerCanvas.height / bufferLength;
        for (let i = 0; i < bufferLength; i++) {
            let targetWidth =
                visualizerData && !visualizerData.isPaused
                    ? (visualizerData.data[i] / 255) * visualizerCanvas.width
                    : previousBarHeights[i];
            if (visualizerData && !visualizerData.isPaused) {
                if (i <= bassEndIndex)
                    targetWidth *= visualizerSettings.bassMultiplier;
                else if (i >= trebleStartIndex)
                    targetWidth *=
                        1.0 +
                        visualizerSettings.trebleBoostAmount *
                            ((i - trebleStartIndex) /
                                (bufferLength - trebleStartIndex));
                else targetWidth *= visualizerSettings.midBoostAmount;
                targetWidth =
                    Math.pow(
                        targetWidth / visualizerCanvas.width,
                        visualizerSettings.scalingPower,
                    ) * visualizerCanvas.width;
            }
            const smoothedWidth =
                (previousBarHeights[i] || 0) +
                (targetWidth - (previousBarHeights[i] || 0)) *
                    visualizerSettings.smoothingFactor;
            const x =
                currentTaskbarPosition === "left"
                    ? 0
                    : visualizerCanvas.width - smoothedWidth;
            visualizerCtx.fillRect(x, i * barHeight, smoothedWidth, barHeight);
            previousBarHeights[i] = smoothedWidth;
        }
    }
}

function positionVisualizer() {
    if (!visualizerCanvas || !taskbar) return; 

    const isIsland = currentTaskbarStyle.startsWith("island");
    const isSpecialCenterCase =
        currentTaskbarStyle === "island-single" && !isTaskbarSpaceBetween;
    
    const rect = taskbar.getBoundingClientRect(); 

    if (isIsland) {
        visualizerCanvas.style.borderRadius =
            visualizerSettings.islandBorderRadius;
    } else {
        visualizerCanvas.style.borderRadius = "0";
    }

    ["top", "bottom", "left", "right"].forEach(
        (p) => (visualizerCanvas.style[p] = "auto"),
    );

    if (
        isSpecialCenterCase &&
        (currentTaskbarPosition === "top" ||
            currentTaskbarPosition === "bottom")
    ) {
        
        const vizWidth = 500;
        visualizerCanvas.width = vizWidth;
        visualizerCanvas.height = visualizerSettings.height;
        visualizerCanvas.style.width = vizWidth + "px";
        visualizerCanvas.style.height = visualizerSettings.height + "px";
        visualizerCanvas.style.left = `calc(50% - ${vizWidth / 2}px)`;
        if (currentTaskbarPosition === "top") {
            visualizerCanvas.style.top =
                rect.bottom + visualizerSettings.islandGap + "px";
        } else {
            visualizerCanvas.style.top =
                rect.top -
                visualizerSettings.height -
                visualizerSettings.islandGap +
                "px";
        }
    } else {
        
        if (
            currentTaskbarPosition === "top" ||
            currentTaskbarPosition === "bottom"
        ) {
            visualizerCanvas.width = rect.width;
            visualizerCanvas.height = visualizerSettings.height;
            visualizerCanvas.style.width = rect.width + "px";
            visualizerCanvas.style.height = visualizerSettings.height + "px";
            visualizerCanvas.style.left = rect.left + "px";
            if (currentTaskbarPosition === "top") {
                visualizerCanvas.style.top =
                    (isIsland
                        ? rect.bottom + visualizerSettings.islandGap
                        : rect.bottom) + "px";
            } else {
                visualizerCanvas.style.top =
                    (isIsland
                        ? rect.top -
                          visualizerSettings.height -
                          visualizerSettings.islandGap
                        : rect.top - visualizerSettings.height) + "px";
            }
        } else {
            visualizerCanvas.width = visualizerSettings.width;
            visualizerCanvas.height = rect.height;
            visualizerCanvas.style.width = visualizerSettings.width + "px";
            visualizerCanvas.style.height = rect.height + "px";
            visualizerCanvas.style.top = rect.top + "px";
            if (currentTaskbarPosition === "left") {
                visualizerCanvas.style.left =
                    (isIsland
                        ? rect.right + visualizerSettings.islandGap
                        : rect.right) + "px";
            } else {
                visualizerCanvas.style.left =
                    (isIsland
                        ? rect.left -
                          visualizerSettings.width -
                          visualizerSettings.islandGap
                        : rect.left - visualizerSettings.width) + "px";
            }
        }
    }
}

// --- TASKBAR & LAYOUT FUNCTIONS ---
function applyTaskbarLayout(position) {
    if (!taskbarMainGroup || !appIconsContainer || !systemTray) return; 

    currentTaskbarPosition = position;
    const isVertical = position === "left" || position === "right";
    taskbarMainGroup.classList.toggle("flex-col", isVertical);
    appIconsContainer.classList.toggle("flex-col", isVertical);
    systemTray.classList.toggle("flex-col", isVertical);
    setTimeout(positionVisualizer, 50);
}

function applyTaskbarStyle(style) {
    if (!taskbar) return; 

    currentTaskbarStyle = style;
    taskbar.classList.remove("island", "single", "split", "space-between");

    if (style === "default") {
        taskbar.removeAttribute("style");
    }

    if (style === "island-single") taskbar.classList.add("island", "single");
    if (style === "island-split") taskbar.classList.add("island", "split");
    if (isTaskbarSpaceBetween && style.startsWith("island"))
        taskbar.classList.add("space-between");
    
    updateTaskbarIconsVisibility();

    setTimeout(positionVisualizer, 50);
}

// --- CONTEXT MENU FUNCTIONS ---
function showDesktopContextMenu(e) {
    if (!startMenu || !contextMenu || !explorerGeneralMenu || !explorerItemMenu) return; 
    startMenu.classList.remove("show");
    explorerGeneralMenu.style.display = "none";
    explorerItemMenu.style.display = "none";

    contextMenu.style.display = "block";
    const { clientX: mouseX, clientY: mouseY } = e;
    const { offsetWidth: menuWidth, offsetHeight: menuHeight } = contextMenu;
    const { innerWidth: windowWidth, innerHeight: windowHeight } = window;
    let x =
        mouseX + menuWidth > windowWidth ? windowWidth - menuWidth - 5 : mouseX;
    let y =
        mouseY + menuHeight > windowHeight
            ? windowHeight - menuHeight - 5
            : mouseY;
    contextMenu.style.top = `${y}px`;
    contextMenu.style.left = `${x}px`;
}

function showExplorerContextMenu(data, frameRect) {
    if (!startMenu || !contextMenu || !explorerGeneralMenu || !explorerItemMenu || !fileExplorerFrame) return; 

    // Hide other menus
    startMenu.classList.remove("show");
    contextMenu.style.display = "none";
    explorerGeneralMenu.style.display = "none";
    explorerItemMenu.style.display = "none";

    const { type, states, clickPosition } = data;

    const menuToShow = type === "item" ? explorerItemMenu : explorerGeneralMenu;

    // Set disabled states
    const pasteBtn = explorerGeneralMenu.querySelector("#explorer-general-paste");
    const undoBtn = explorerGeneralMenu.querySelector("#explorer-general-undo");
    const cutBtn = explorerItemMenu.querySelector("#explorer-item-cut");
    const copyBtn = explorerItemMenu.querySelector("#explorer-item-copy");
    const deleteBtn = explorerItemMenu.querySelector("#explorer-item-delete");
    const renameBtn = explorerItemMenu.querySelector("#explorer-item-rename");

    if(pasteBtn) pasteBtn.classList.toggle("disabled", states.pasteDisabled);
    if(undoBtn) undoBtn.classList.toggle("disabled", states.undoDisabled);

    if(cutBtn) cutBtn.classList.toggle("disabled", states.itemActionsDisabled);
    if(copyBtn) copyBtn.classList.toggle("disabled", states.itemActionsDisabled);
    if(deleteBtn) deleteBtn.classList.toggle("disabled", states.itemActionsDisabled);
    if(renameBtn) renameBtn.classList.toggle("disabled", states.renameDisabled);

    menuToShow.style.display = "block";

    const x = frameRect.left + clickPosition.x;
    const y = frameRect.top + clickPosition.y;

    // Position it, making sure it doesn't go off-screen
    const { offsetWidth: menuWidth, offsetHeight: menuHeight } = menuToShow;
    const { innerWidth: windowWidth, innerHeight: windowHeight } = window;

    let finalX = x + menuWidth > windowWidth ? windowWidth - menuWidth - 5 : x;
    let finalY =
        y + menuHeight > windowHeight ? windowHeight - menuHeight - 5 : y;
    menuToShow.style.left = `${finalX}px`;
    menuToShow.style.top = `${finalY}px`;

    // Submenu positioning logic
    menuToShow.querySelectorAll(".submenu").forEach((submenu) => {
        const itemRect = submenu.parentElement.getBoundingClientRect();
        if (itemRect.right + submenu.offsetWidth > windowWidth) {
            submenu.style.left = "auto";
            submenu.style.right = "calc(100% - 5px)";
        } else {
            submenu.style.left = "calc(100% - 5px)";
            submenu.style.right = "auto";
        }
    });
}

function setupExplorerContextMenuActions() {
    if (!explorerGeneralMenu || !explorerItemMenu || !fileExplorerFrame) return; 
    const menus = [explorerGeneralMenu, explorerItemMenu];
    menus.forEach((menu) => {
        menu.addEventListener("click", (e) => {
            const item = e.target.closest("[data-command]");
            if (item && !item.classList.contains("disabled")) {
                const command = item.dataset.command;
                if (fileExplorerFrame.contentWindow) fileExplorerFrame.contentWindow.postMessage(
                    { action: "execute-explorer-command", value: command },
                    "*",
                );

                if (!item.querySelector(".submenu")) {
                    explorerGeneralMenu.style.display = "none";
                    explorerItemMenu.style.display = "none";
                }
            }
        });
    });
}

function setupMenus() {
    if (desktop) desktop.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        showDesktopContextMenu(e);
    });

    if (clickInterceptor) clickInterceptor.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        showDesktopContextMenu(e);
    });

    document.addEventListener("click", (e) => {
        // FIX: Periksa apakah elemen ada sebelum mencoba mengakses propertinya
        if (
            contextMenu && contextMenu.style.display === "block" &&
            !contextMenu.contains(e.target)
        ) {
            contextMenu.style.display = "none";
        }
        
        if (
            startMenu && startButton && startMenu.classList.contains("show") &&
            !e.composedPath().includes(startMenu) &&
            !startButton.contains(e.target)
        ) {
            startMenu.classList.remove("show");
        }
        
        // FIX: Periksa apakah elemen ada sebelum mencoba mengakses propertinya
        if (
            explorerGeneralMenu && explorerItemMenu && !e.target.closest(".explorer-context-menu")
        ) {
            explorerGeneralMenu.style.display = "none";
            explorerItemMenu.style.display = "none";
        }
        
        if (
            notificationCenter && notificationCenterTrigger && notificationCenter.classList.contains("show") &&
            !notificationCenter.contains(e.target) &&
            !notificationCenterTrigger.contains(e.target)
        ) {
            notificationCenter.classList.remove("show");
        }
    });

    if (contextMenuSettings) contextMenuSettings.addEventListener("click", () => {
        openApp("cp");
        if (contextMenu) contextMenu.style.display = "none";
    });

    if (contextMenuRefresh) contextMenuRefresh.addEventListener("click", () => {
        if (contextMenu) contextMenu.style.display = "none";

        const icons = Array.from(
            document.querySelectorAll("#desktop-icons .desktop-icon"),
        );
        const animationDelay = 150;

        icons.forEach((icon) => {
            icon.classList.remove("animate-in");
            icon.classList.add("hide-for-refresh");
        });

        setTimeout(() => {
            icons.forEach((icon, index) => {
                setTimeout(() => {
                    icon.classList.remove("hide-for-refresh");
                    icon.classList.add("animate-in");
                }, index * animationDelay);
            });
        }, 50);
    });

    if (notificationCenterTrigger) notificationCenterTrigger.addEventListener("click", (event) => {
        event.stopPropagation();
        if (startMenu) startMenu.classList.remove("show");
        if (contextMenu) contextMenu.style.display = "none";
        if (notificationCenter) notificationCenter.classList.toggle("show");
    });
}

function setupClickForwarding() {
    if (!clickInterceptor) return;

    const interceptor = clickInterceptor;
    let reEnableTimerId = null;

    const startReEnableTimer = () => {
        clearTimeout(reEnableTimerId);
        reEnableTimerId = setTimeout(() => {
            if (interceptor.style.pointerEvents === "none") {
                interceptor.style.pointerEvents = "auto";
            }
        }, 500);
    };

    interceptor.addEventListener("mousedown", (e) => {
        if (e.button === 0) {
            clearTimeout(reEnableTimerId);
            interceptor.style.pointerEvents = "none";
            const onInteractionEnd = () => {
                startReEnableTimer();
                window.removeEventListener("mouseup", onInteractionEnd);
                window.removeEventListener("mouseleave", onInteractionEnd);
            };
            window.addEventListener("mouseup", onInteractionEnd, {
                once: true,
            });
            window.addEventListener("mouseleave", onInteractionEnd, {
                once: true,
            });
        }
    });
}

// === APPLICATION INITIALIZATION ===
function initialize() {
    // FIX: closeButton harus ada karena dipanggil di global scope di file lama
    if (closeButton) closeButton.addEventListener("click", hidePill);

    if (desktop) setupWallpaperDragDrop();
    setupAppInteractions();
    setupMenus();
    if (clickInterceptor) setupClickForwarding();
    setupExplorerContextMenuActions();

    if (clearAllBtn && notificationList && notificationPlaceholder) clearAllBtn.addEventListener("click", () => {
        notificationList
            .querySelectorAll(".notification-item")
            .forEach((item) => item.remove());

        notificationPlaceholder.style.display = "block";
    });
    
    // Perbaikan: Tambahkan notifikasi awal seperti di file lama
    window.addEventListener("load", () => {
        const proTipIcon = `<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>`;

        setTimeout(() => {
            showNotification(
                "Selamat Datang!",
                "Drag & drop gambar ke desktop untuk mengganti wallpaper.",
                proTipIcon,
            );
        }, 1500);
    });
    // Akhir perbaikan notifikasi awal

    window.addEventListener("message", (event) => {
        console.log(
            "[Desktop] Message received from iframe. Action:",
            event.data.action,
            "Full data:",
            event.data,
        );
        const {
            action,
            dx,
            dy,
            data,
            bufferLength,
            isPaused,
            value,
            appName,
        } = event.data;

        switch (action) {
            case "stop-music-frame": {
                // Pastikan variabel diperbarui
                visualizerData = null;
                if (visualizerCanvas) visualizerCanvas.style.display = "none";
                break;
            }
            case "volume-change-start":
                console.log("[Desktop] Volume change started.");
                isVolumeChanging = true;
                if (isPillActive && activePillType === "volume") {
                    clearTimeout(pillTimer);
                    pillTimer = setTimeout(() => {
                        if (!isVolumeChanging) hidePill();
                    }, 2000);
                }
                break;
            case "volume-change-end":
                console.log("[Desktop] Volume change ended.");
                isVolumeChanging = false;
                if (isPillActive && activePillType === "volume") {
                    clearTimeout(pillTimer);
                    pillTimer = setTimeout(() => {
                        if (!isVolumeChanging) {
                            hidePill();
                        }
                    }, 500);
                }
                break;
            case "show-media-notification": {
                console.log(
                    '[Desktop] Handling "show-media-notification". Title:',
                    event.data.title,
                    "Album Art URL:",
                    event.data.albumArt,
                );
                showNotification(
                    event.data.title,
                    event.data.artist,
                    event.data.albumArt,
                );
                break;
            }
            case "show-explorer-context-menu": {
                if (fileExplorerFrame) {
                    const explorerFrameRect =
                        fileExplorerFrame.getBoundingClientRect();
                    showExplorerContextMenu(data, explorerFrameRect);
                }
                break;
            }
            case "test-toast-notification": {
                const testIcon = `<svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
                showNotification(
                    "Test Notification",
                    "This is a test notification from the Control Panel.",
                    testIcon,
                );
                break;
            }
            // --- VIDEO PLAYER ACTIONS (BARU) ---
            case "drag-vp-frame": {
                if (!videoPlayerFrame) return;
                if (videoPlayerFrame.dataset.isMaximized === "true") return;
                const rect = videoPlayerFrame.getBoundingClientRect();
                videoPlayerFrame.style.left = `${rect.left + dx}px`;
                videoPlayerFrame.style.top = `${rect.top + dy}px`;
                break;
            }
            case "close-vp-frame":
                closeApp("video");
                break;
            case "minimize-vp-frame":
                minimizeApp("video");
                break;
            case "bring-vp-to-front":
                bringToFront("video");
                break;
            case "maximize-vp-frame":
                maximizeApp("video");
                break;

            // --- MUSIC PLAYER ACTIONS ---
            case "drag-music-frame": {
                if (!musicPlayerFrame) return;
                if (musicPlayerFrame.dataset.isMaximized === "true") return;
                const rect = musicPlayerFrame.getBoundingClientRect();
                musicPlayerFrame.style.left = `${rect.left + dx}px`;
                musicPlayerFrame.style.top = `${rect.top + dy}px`;
                break;
            }
            case "close-music-frame":
                closeApp("music");
                break;
            case "minimize-music-frame":
                minimizeApp("music");
                break;
            case "bring-music-to-front":
                bringToFront("music");
                break;
            case "maximize-music-frame":
                maximizeApp("music");
                break; 
            case "visualizer-data":
                visualizerData = {
                    data: data,
                    bufferLength: bufferLength,
                    isPaused: isPaused,
                };
                break;
            case "show-volume-flyout": {
                showVolumeNotification(event.data.volume);
                break;
            }

            // --- CONTROL PANEL ACTIONS ---
            case "drag-cp-frame": {
                if (!controlPanelFrame) return;
                if (controlPanelFrame.dataset.isMaximized === "true") return;
                const rect = controlPanelFrame.getBoundingClientRect();
                controlPanelFrame.style.left = `${rect.left + dx}px`;
                controlPanelFrame.style.top = `${rect.top + dy}px`;
                break;
            }
            case "close-cp-frame":
                closeApp("cp");
                break;
            case "minimize-cp-frame":
                minimizeApp("cp");
                break;
            case "bring-cp-to-front":
                bringToFront("cp");
                break;
            case "maximize-cp-frame":
                maximizeApp("cp");
                break;

            // --- FILE EXPLORER ACTIONS ---
            case "drag-explorer-frame": {
                if (!fileExplorerFrame) return;
                if (fileExplorerFrame.dataset.isMaximized === "true") return;
                const rect = fileExplorerFrame.getBoundingClientRect();
                fileExplorerFrame.style.left = `${rect.left + dx}px`;
                fileExplorerFrame.style.top = `${rect.top + dy}px`;
                break;
            }
            case "close-explorer-frame":
                closeApp("explorer");
                break;
            case "minimize-explorer-frame":
                minimizeApp("explorer");
                break;
            case "bring-explorer-to-front":
                bringToFront("explorer");
                break;
            case "maximize-explorer-frame":
                maximizeApp("explorer");
                break;

            // --- LIVE2D WALLPAPER ACTIONS ---
            case "drag-live2d-frame": {
                if (!live2dWallpaperFrame) return;
                if (live2dWallpaperFrame.dataset.isMaximized === "true") return;
                const rect = live2dWallpaperFrame.getBoundingClientRect();
                live2dWallpaperFrame.style.left = `${rect.left + dx}px`;
                live2dWallpaperFrame.style.top = `${rect.top + dy}px`;
                break;
            }
            case "close-live2d-frame":
                closeApp("live2d");
                break;
            case "minimize-live2d-frame":
                minimizeApp("live2d");
                break;
            case "bring-live2d-to-front":
                bringToFront("live2d");
                break;
            case "maximize-live2d-frame":
                maximizeApp("live2d");
                break; 

            case "set-live-wallpaper":
                if (wallpaperIframe) wallpaperIframe.src = value;
                if (wallpaperIframe) wallpaperIframe.style.display = "block";
                if (clickInterceptor) clickInterceptor.style.display = "block";
                if (desktop) desktop.style.backgroundImage = "none";
                const img = document.querySelector(".desktop-image");
                if (img) img.style.display = "none";
                break;
            case "clear-live-wallpaper":
                if (wallpaperIframe) wallpaperIframe.src = "about:blank";
                if (wallpaperIframe) wallpaperIframe.style.display = "none";
                if (clickInterceptor) clickInterceptor.style.display = "none";
                const imgClear = document.querySelector(".desktop-image");
                if (imgClear) imgClear.style.display = "block";
                break;
            case "open-app-from-start-menu":
                openApp(appName);
                if (startMenu) startMenu.classList.remove("show");
                break;
            case "toggle-fancy-mode":
                document.body.classList.toggle("fancy-mode", value);
                if (musicPlayerFrame && musicPlayerFrame.contentWindow) musicPlayerFrame.contentWindow.postMessage(
                    { action: "toggle-fancy-mode", value: value },
                    "*",
                );
                if (controlPanelFrame && controlPanelFrame.contentWindow) controlPanelFrame.contentWindow.postMessage(
                    { action: "toggle-fancy-mode", value: value },
                    "*",
                );
                if (videoPlayerFrame && videoPlayerFrame.contentWindow) videoPlayerFrame.contentWindow.postMessage(
                    { action: "toggle-fancy-mode", value: value },
                    "*",
                ); 
                if (typeof toggleFancyMode === "function") {
                    toggleFancyMode(value);
                }
                window.dispatchEvent(
                    new CustomEvent("fancy-mode-toggled", {
                        detail: { value },
                    }),
                );
                if (live2dWallpaperFrame && live2dWallpaperFrame.contentWindow) live2dWallpaperFrame.contentWindow.postMessage(
                    { action: "toggle-fancy-mode", value: value },
                    "*",
                );
                if (fileExplorerFrame && fileExplorerFrame.contentWindow) fileExplorerFrame.contentWindow.postMessage(
                    { action: "toggle-fancy-mode", value: value },
                    "*",
                );
                break;
            case "request-settings":
                if (controlPanelFrame && controlPanelFrame.contentWindow) controlPanelFrame.contentWindow.postMessage(
                    { action: "request-settings" },
                    "*",
                );
                break;
            case "change-theme": {
                const isDark = value === "dark";
                document.body.classList.toggle("dark", isDark);
                if (musicPlayerFrame && musicPlayerFrame.contentWindow) musicPlayerFrame.contentWindow.postMessage(
                    { action: "theme-change", isDark },
                    "*",
                );
                if (controlPanelFrame && controlPanelFrame.contentWindow) controlPanelFrame.contentWindow.postMessage(
                    { action: "theme-change", isDark },
                    "*",
                );
                if (videoPlayerFrame && videoPlayerFrame.contentWindow) videoPlayerFrame.contentWindow.postMessage(
                    { action: "theme-change", isDark },
                    "*",
                ); 
                if (typeof applyTheme === "function") {
                    applyTheme(isDark);
                }
                window.dispatchEvent(
                    new CustomEvent("theme-changed", { detail: { isDark } }),
                );
                break;
            }
            case "change-bg-size":
                if (desktopImage) desktopImage.style.objectFit =
                    value === "auto" ? "none" : value;
                if (desktop) desktop.style.backgroundSize = value;
                break;
            case "change-bg-repeat":
                if (desktopImage) {
                    if (value === "no-repeat") {
                        desktopImage.style.display = "block";
                        if (desktop) desktop.style.backgroundImage = "none";
                    } else {
                        desktopImage.style.display = "none";
                        if (desktop) desktop.style.backgroundImage = `url('${desktopImage.src}')`;
                    }
                }
                if (desktop) desktop.style.backgroundRepeat = value;
                break;
            case "change-bg-position":
                if (desktopImage) desktopImage.style.objectPosition = value;
                if (desktop) desktop.style.backgroundPosition = value;
                break;
            case "change-taskbar-position":
                if (taskbar) taskbar.className = taskbar.className.replace(
                    /taskbar-(bottom|top|left|right)/,
                    `taskbar-${value}`,
                );
                applyTaskbarLayout(value);
                if (startMenu && startMenu.classList.contains("show")) {
                    // Logic moved to startmenu.js
                }
                break;
            case "change-taskbar-style":
                applyTaskbarStyle(value);
                if (startMenu && startMenu.classList.contains("show")) {
                    // Logic moved to startmenu.js
                }
                break;
            case "toggle-taskbar-space-between":
                isTaskbarSpaceBetween = value;
                if (taskbar) taskbar.classList.toggle("space-between", value);
                setTimeout(positionVisualizer, 50);
                break;
            case "toggle-clock":
                if (datetimeContainer) datetimeContainer.style.display = value ? "block" : "none";
                break;
        }
    });

    setInterval(updateClock, 1000);
    updateClock();

    window.addEventListener("load", () => {
        applyTaskbarLayout(currentTaskbarPosition);
        window.addEventListener("resize", () => {
            setTimeout(positionVisualizer, 50);
        });
        window.addEventListener(
            "scroll",
            () => {
                if (startMenu && startMenu.classList.contains("show")) {
                    // This is handled by startmenu.js now
                }
            },
            true,
        );

        setTimeout(() => {
            window.dispatchEvent(new Event("resize"));
        }, 350);
    });

    document.querySelectorAll(".quick-setting-btn").forEach((button) => {
        button.addEventListener("click", () => {
            button.classList.toggle("active");
        });
    });

    setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        updateTaskbarIconsVisibility(); 
    }, 100);
}

// Pindahkan semua inisialisasi ke dalam DOMContentLoaded
document.addEventListener('DOMContentLoaded', initialize);