// index-main.js
/**
 * ==================================================================================
 * INDEX MAIN JAVASCRIPT
 * ==================================================================================
 * File ini mengatur logika utama desktop environment, termasuk:
 * 1. Manajemen Jendela (Open, Close, Minimize, Maximize)
 * 2. Taskbar & Layout
 * 3. Animasi Dynamic Island (Pill)
 * 4. Sistem Notifikasi
 * 5. Audio Visualizer
 * 6. Interaksi Pengguna (Context Menu, Drag & Drop)
 * 7. Event Listener Global & Komunikasi Iframe
 * ==================================================================================
 */

// ==================================================================================
// NOTE: Tolong pertahankan struktur rapi dan semua note helper, pembuka, penutup, 
// summary yang sudah ada di script ini.
// ==================================================================================

// ==================================================================================
// BAGIAN 1: DEKLARASI VARIABEL GLOBAL & DOM ELEMENTS
// ==================================================================================
// Summary: Mengambil semua elemen HTML yang dibutuhkan dan menyiapkan variabel state global.

// --- Desktop & Background Elements ---
const desktop = document.getElementById("desktop");
const desktopImage = document.querySelector(".desktop-image"); 
const wallpaperIframe = document.getElementById("wallpaper-iframe");
const clickInterceptor = document.getElementById("click-interceptor");

// --- Notification Center Elements ---
const notificationList = document.getElementById("notification-list");
const notificationPlaceholder = document.getElementById("notification-placeholder");
const clearAllBtn = document.getElementById("clear-all-notifications-btn");
const notificationCenter = document.getElementById("notification-center");
const notificationCenterTrigger = document.getElementById("notification-center-trigger");

// --- App Icons (Desktop) ---
const controlPanelIcon = document.getElementById("control-panel-icon");
const musicPlayerIcon = document.getElementById("music-player-icon");
const live2dIcon = document.getElementById("live2d-icon");
const videoPlayerIcon = document.getElementById("video-player-icon");
const thisPcIcon = document.getElementById("this-pc-icon");

// --- App Frames (Windows) ---
let musicPlayerWinBox = null;
let live2dWallpaperWinBox = null;
let videoPlayerWinBox = null;
let fileExplorerWinBox = null;

// --- Taskbar Elements ---
const taskbar = document.getElementById("taskbar");
const startButton = document.getElementById("start-button");
const startMenu = document.getElementById("start-menu"); 
const datetimeContainer = document.getElementById("datetime-container");
const clockElement = document.getElementById("clock");
const dateElement = document.getElementById("date");
const systemTray = document.getElementById("system-tray");
const taskbarMainGroup = document.getElementById("taskbar-main-group");
const appIconsContainer = document.getElementById("app-icons");

// --- Taskbar Icons ---
const taskbarControlPanelIcon = document.getElementById("taskbar-cp-icon");
const taskbarMusicIcon = document.getElementById("taskbar-music-icon");
const taskbarLive2dIcon = document.getElementById("taskbar-live2d-icon");
const taskbarVideoPlayerIcon = document.getElementById("taskbar-video-player-icon");
const taskbarExplorerIcon = document.getElementById("taskbar-explorer-icon");

// --- Context Menu Elements ---
const contextMenu = document.getElementById("context-menu");
const contextMenuSettings = document.getElementById("context-menu-settings");
const contextMenuRefresh = document.getElementById("context-menu-refresh");
const explorerGeneralMenu = document.getElementById("explorer-context-menu-general");
const explorerItemMenu = document.getElementById("explorer-context-menu-item");

// --- Pill / Dynamic Island Elements ---
const pillContainer = document.getElementById("pill-container");
const notificationContent = document.getElementById("notification-content");
const volumeContent = document.getElementById("volume-content");
const closeButton = document.getElementById("close-button");

// --- Notification Content Elements (Inside Pill) ---
const notifIcon = document.getElementById("notification-icon");
const notifTitle = document.getElementById("notification-title");
const notifMessage = document.getElementById("notification-message");

// --- Volume Content Elements (Inside Pill) ---
const volumeIcon = document.getElementById("volume-icon");
const volumeBarFill = document.getElementById("volume-bar-fill");
const volumeValue = document.getElementById("volume-value");

// --- Visualizer Elements ---
const visualizerCanvas = document.getElementById("visualizer");
const visualizerCtx = visualizerCanvas ? visualizerCanvas.getContext("2d") : null;

// --- Global State Variables (Status Aplikasi) ---
let isMusicPlayerOpen = false;
let isControlPanelOpen = false;
let controlPanelWinBox = null;
let isLive2dOpen = false;
let isVideoPlayerOpen = false; 
let isExplorerOpen = false; 

// --- State Maximize/Minimize ---
let isMusicPlayerMaximized = false;
let isControlPanelMaximized = false;
let isLive2dMaximized = false;
let isVideoPlayerMaximized = false; 
let isExplorerMaximized = false;

// --- Rect Storage (Menyimpan posisi terakhir jendela) ---
let lastMusicPlayerRect = null;
let lastControlPanelRect = null;
let lastLive2dRect = null;
let lastVideoPlayerRect = null; 
let lastExplorerRect = null; 

let originalMusicPlayerRect = null;
let originalControlPanelRect = null;
let originalLive2dRect = null;
let originalVideoPlayerRect = null; 
let originalExplorerRect = null;

// --- Taskbar & Visualizer State ---
let currentTaskbarPosition = "bottom";
let currentTaskbarStyle = "default";
let isTaskbarSpaceBetween = false;
let visualizerData = null;
let previousBarHeights = [];
let isVisualizerFading = false;

// --- Pill/Toast State ---
let pillTimer; 
let volumeChangeTimer; 
let isPillActive = false; 
let activePillType = null;
let isVolumeChanging = false; 

// --- Configuration Constants ---
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

// ==================================================================================
// BAGIAN 1: DEKLARASI VARIABEL GLOBAL & DOM ELEMENTS | END
// ==================================================================================


// ==================================================================================
// BAGIAN 2: FUNGSI CORE SISTEM
// ==================================================================================
// Summary: Fungsi dasar seperti jam dan penanganan wallpaper desktop.

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
                // Saat gambar baru didrop, reset live wallpaper
                wallpaperIframe.src = "about:blank";
                wallpaperIframe.style.display = "none";
                clickInterceptor.style.display = "none"; 

                if (desktopImage) {
                    desktopImage.src = event.target.result;
                    desktopImage.style.display = "block";
                }
                desktop.style.backgroundImage = "none";
                desktop.style.backgroundRepeat = "no-repeat";
            };
            reader.readAsDataURL(file);
        }
    });
}

// ==================================================================================
// BAGIAN 2: FUNGSI CORE SISTEM | END
// ==================================================================================


// ==================================================================================
// BAGIAN 3: SISTEM WINDOW MANAGEMENT (MANAJEMEN JENDELA)
// ==================================================================================

function openApp(appName) {
    let winBoxInstance, taskbarIcon, title, icon, url, width, height, isDark = document.body.classList.contains("dark");
    const taskbar = document.getElementById('taskbar');
    const bounds = {
        top: taskbar?.classList.contains('taskbar-top') ? 48 : 0,
        bottom: taskbar?.classList.contains('taskbar-bottom') ? 48 : 0,
        left: taskbar?.classList.contains('taskbar-left') ? 48 : 0,
        right: taskbar?.classList.contains('taskbar-right') ? 48 : 0
    };

    if (appName === "music") {
        taskbarIcon = taskbarMusicIcon;
        if (isMusicPlayerOpen) { if (musicPlayerWinBox) { if (musicPlayerWinBox.min) musicPlayerWinBox.restore(); musicPlayerWinBox.focus(); } return; }
        isMusicPlayerOpen = true;
        title = "Music Player"; icon = "https://img.icons8.com/fluency/48/000000/apple-music.png"; url = "music_player.html"; width = "420px"; height = "500px";
    } else if (appName === "cp") {
        taskbarIcon = taskbarControlPanelIcon;
        if (isControlPanelOpen) { if (controlPanelWinBox) { if (controlPanelWinBox.min) controlPanelWinBox.restore(); controlPanelWinBox.focus(); } return; }
        isControlPanelOpen = true;
        title = "Control Panel"; icon = "https://img.icons8.com/fluency/48/000000/control-panel.png"; url = "control_panel.html"; width = "550px"; height = "550px";
    } else if (appName === "live2d") {
        taskbarIcon = taskbarLive2dIcon;
        if (isLive2dOpen) { if (live2dWallpaperWinBox) { if (live2dWallpaperWinBox.min) live2dWallpaperWinBox.restore(); live2dWallpaperWinBox.focus(); } return; }
        isLive2dOpen = true;
        title = "Live2D Wallpaper"; icon = "img/live2d_icon.png"; url = "live2d_wallpaper.html"; width = "400px"; height = "255px";
    } else if (appName === "video") {
        taskbarIcon = taskbarVideoPlayerIcon;
        if (isVideoPlayerOpen) { if (videoPlayerWinBox) { if (videoPlayerWinBox.min) videoPlayerWinBox.restore(); videoPlayerWinBox.focus(); } return; }
        isVideoPlayerOpen = true;
        title = "Video Player"; icon = "img/films-and-tv_171100.png"; url = "video_player.html"; width = "800px"; height = "550px";
    } else if (appName === "explorer") {
        taskbarIcon = taskbarExplorerIcon;
        if (isExplorerOpen) { if (fileExplorerWinBox) { if (fileExplorerWinBox.min) fileExplorerWinBox.restore(); fileExplorerWinBox.focus(); } return; }
        isExplorerOpen = true;
        title = "File Explorer"; icon = "https://img.icons8.com/color/48/000000/folder-invoices--v1.png"; url = "file_explorer.html"; width = "850px"; height = "600px";
    } else {
        return;
    }

    const isFancy = document.body.classList.contains("fancy-mode");
    const stateParams = `?dark=${isDark ? 1 : 0}&fancy=${isFancy ? 1 : 0}`;
    const winBoxConf = {
        title: title,
        icon: icon,
        url: url + stateParams,
        class: [isDark ? "win11-dark" : "win11-light", "no-full"],
        top: bounds.top, bottom: bounds.bottom, left: bounds.left, right: bounds.right,
        width: width, height: height, x: "center", y: "center",
        onclose: function() {
            if (appName === "music") { musicPlayerWinBox = null; isMusicPlayerOpen = false; if (visualizerCanvas) visualizerCanvas.style.display = "none"; }
            else if (appName === "cp") { controlPanelWinBox = null; isControlPanelOpen = false; }
            else if (appName === "live2d") { live2dWallpaperWinBox = null; isLive2dOpen = false; }
            else if (appName === "video") { videoPlayerWinBox = null; isVideoPlayerOpen = false; }
            else if (appName === "explorer") { fileExplorerWinBox = null; isExplorerOpen = false; }
            updateTaskbarIconsVisibility();
        }
    };

    if (appName === "music") musicPlayerWinBox = new WinBox(winBoxConf);
    else if (appName === "cp") controlPanelWinBox = new WinBox(winBoxConf);
    else if (appName === "live2d") live2dWallpaperWinBox = new WinBox(winBoxConf);
    else if (appName === "video") videoPlayerWinBox = new WinBox(winBoxConf);
    else if (appName === "explorer") fileExplorerWinBox = new WinBox(winBoxConf);

    // Sync current theme & fancy state to the newly loaded iframe
    const createdWb = (appName === "music") ? musicPlayerWinBox
        : (appName === "cp") ? controlPanelWinBox
        : (appName === "live2d") ? live2dWallpaperWinBox
        : (appName === "video") ? videoPlayerWinBox
        : fileExplorerWinBox;
    if (createdWb) {
        const iframe = createdWb.body.querySelector('iframe');
        if (iframe) {
            iframe.addEventListener('load', function() {
                if (iframe.contentWindow) {
                    iframe.contentWindow.postMessage({ action: "theme-change", isDark: isDark }, "*");
                    iframe.contentWindow.postMessage({ action: "toggle-fancy-mode", value: isFancy }, "*");
                }
            }, { once: true });
        }
    }

    updateTaskbarIconsVisibility();
    if (appName === "music" && visualizerCanvas) {
        visualizerCanvas.style.display = "block";
        drawVisualizer();
        setTimeout(positionVisualizer, 50);
    }
}

function closeApp(appName) {
    if (appName === "music" && musicPlayerWinBox) musicPlayerWinBox.close();
    else if (appName === "cp" && controlPanelWinBox) controlPanelWinBox.close();
    else if (appName === "live2d" && live2dWallpaperWinBox) live2dWallpaperWinBox.close();
    else if (appName === "video" && videoPlayerWinBox) videoPlayerWinBox.close();
    else if (appName === "explorer" && fileExplorerWinBox) fileExplorerWinBox.close();
}

function minimizeApp(appName) {
    let wb = null;
    if (appName === "music") wb = musicPlayerWinBox;
    else if (appName === "cp") wb = controlPanelWinBox;
    else if (appName === "live2d") wb = live2dWallpaperWinBox;
    else if (appName === "video") wb = videoPlayerWinBox;
    else if (appName === "explorer") wb = fileExplorerWinBox;
    if (wb && !wb.min) wb.minimize();
}

function restoreApp(appName) {
    let wb = null;
    if (appName === "music") wb = musicPlayerWinBox;
    else if (appName === "cp") wb = controlPanelWinBox;
    else if (appName === "live2d") wb = live2dWallpaperWinBox;
    else if (appName === "video") wb = videoPlayerWinBox;
    else if (appName === "explorer") wb = fileExplorerWinBox;
    if (wb) {
        if (wb.min) wb.restore();
        wb.focus();
    }
}

function maximizeApp(appName) {
    let wb = null;
    if (appName === "music") wb = musicPlayerWinBox;
    else if (appName === "cp") wb = controlPanelWinBox;
    else if (appName === "live2d") wb = live2dWallpaperWinBox;
    else if (appName === "video") wb = videoPlayerWinBox;
    else if (appName === "explorer") wb = fileExplorerWinBox;
    if (wb) {
        wb.max ? wb.restore() : wb.maximize();
    }
}

function restoreMaximizedApp(appName) {
    restoreApp(appName);
}

function bringToFront(appName) {
    let wb = null;
    if (appName === "music") wb = musicPlayerWinBox;
    else if (appName === "cp") wb = controlPanelWinBox;
    else if (appName === "live2d") wb = live2dWallpaperWinBox;
    else if (appName === "video") wb = videoPlayerWinBox;
    else if (appName === "explorer") wb = fileExplorerWinBox;
    if (wb) wb.focus();
}
// ==================================================================================
// BAGIAN 3: SISTEM WINDOW MANAGEMENT (MANAJEMEN JENDELA) | END
// ==================================================================================


// ==================================================================================
// BAGIAN 4: TASKBAR & LAYOUT SYSTEM
// ==================================================================================
// Summary: Mengatur tata letak taskbar, style (island/default), dan visibilitas ikon aktif.

function updateTaskbarIconsVisibility() {
    if (taskbarMusicIcon) taskbarMusicIcon.style.display = isMusicPlayerOpen ? 'flex' : 'none';
    if (taskbarControlPanelIcon) taskbarControlPanelIcon.style.display = isControlPanelOpen ? 'flex' : 'none';
    if (taskbarLive2dIcon) taskbarLive2dIcon.style.display = isLive2dOpen ? 'flex' : 'none';
    if (taskbarVideoPlayerIcon) taskbarVideoPlayerIcon.style.display = isVideoPlayerOpen ? 'flex' : 'none';
}

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

// ==================================================================================
// BAGIAN 4: TASKBAR & LAYOUT SYSTEM | END
// ==================================================================================


// ==================================================================================
// BAGIAN 5: UNIFIED TASKBAR & PILL SYSTEM
// ==================================================================================
// Summary: Mengatur animasi morphing dari Taskbar menjadi "Pill" notifikasi.

// Variabel untuk menyimpan state pixel & style taskbar
let taskbarRestoreState = {
    rect: null,
    style: null,
    className: ""
};

// Konstanta Waktu Animasi (Sinkronkan dengan CSS)
const TIMING = {
    FADE_MS: 200,      // Waktu konten menghilang
    MORPH_MS: 500,     // Waktu taskbar berubah bentuk (CSS transition)
};

const showPill = (type, duration = 3000) => {
    if (!taskbar) return;

    // [VISUALIZER FIX] Fade out visualizer immediately
    if (visualizerCanvas) {
        visualizerCanvas.style.transition = "opacity 0.2s ease";
        visualizerCanvas.style.opacity = "0";
    }

    // Tentukan Ukuran Target Pill
    const isVolume = type === "volume";
    const targetWidth = isVolume ? 220 : 400;
    const targetHeight = isVolume ? 50 : 80;
    const targetRadius = "12px"; // Radius sama rata
    const targetBottom = "12px"; 

    // --- KASUS 1: Pill Sudah Aktif (Switching / Resurrect / Update) ---
    if (isPillActive) {
        // A. Cek Resurrect (Sedang mati suri?)
        const isResurrecting = !taskbar.classList.contains("pill-active");

        if (isResurrecting) {
            // [RESURRECT] Munculkan kembali segera
            taskbar.classList.add("pill-active");
            updatePillShape(targetWidth, targetHeight, targetRadius, targetBottom);
            setTimeout(() => revealPillContent(type), TIMING.MORPH_MS - 100);
            
        } else {
            // B. Cek Update Tipe Sama (Volume -> Volume) [FIX GLITCH DISINI]
            if (activePillType === type) {
                // Jangan Hide, Jangan Fade Out. Cukup update timer & shape.
                // Konten DOM (text/bar) sudah diupdate oleh fungsi pemanggil (showVolumeNotification).
                
                updatePillShape(targetWidth, targetHeight, targetRadius, targetBottom);
                
                // Pastikan class visibility ada (tanpa animasi fade in ulang)
                const targetId = type === "volume" ? "volume-content" : "notification-content";
                const el = document.getElementById(targetId); // Note: Mengambil elemen pertama yang ditemukan
                if (el && !el.classList.contains("show-pill-content")) {
                    el.classList.add("show-pill-content");
                }
                
                resetPillTimer(duration);
                return; // STOP DISINI agar tidak lanjut ke logika Switching
            }

            // C. Logika Switching (Beda Tipe, misal Notif -> Volume)
            // Fade Out -> Morph -> Fade In
            hideAllPillContent();

            setTimeout(() => {
                updatePillShape(targetWidth, targetHeight, targetRadius, targetBottom);
            }, TIMING.FADE_MS);

            setTimeout(() => {
                revealPillContent(type);
            }, TIMING.FADE_MS + 300);
        }
        
        // Update tipe aktif & Timer
        activePillType = type;
        resetPillTimer(duration);
        return;
    }

    // --- KASUS 2: Animasi Baru (Taskbar -> Pill) ---
    isPillActive = true;
    activePillType = type;

    // Simpan State
    const rect = taskbar.getBoundingClientRect();
    const computed = window.getComputedStyle(taskbar);

    taskbarRestoreState = {
        rect: rect,
        style: {
            width: taskbar.style.width,
            height: taskbar.style.height,
            left: taskbar.style.left,
            bottom: taskbar.style.bottom,
            top: taskbar.style.top,
            borderRadius: taskbar.style.borderRadius || computed.borderRadius,
            transform: taskbar.style.transform
        },
        className: taskbar.className
    };

    // Setup Posisi (Freeze & Center)
    taskbar.style.transition = "none";
    taskbar.style.width = `${rect.width}px`;
    taskbar.style.height = `${rect.height}px`;

    if (currentTaskbarPosition === 'bottom' || currentTaskbarPosition === 'top') {
        taskbar.style.left = "50%";
        taskbar.style.transform = "translateX(-50%)";
    } else {
        taskbar.style.left = "50%";
        taskbar.style.bottom = "12px";
        taskbar.style.top = "auto";
        taskbar.style.right = "auto";
        taskbar.style.transform = "translateX(-50%)";
    }

    void taskbar.offsetWidth; // Force Reflow

    // Jalankan Animasi
    taskbar.style.transition = "all 0.5s cubic-bezier(0.42, 0.24, 0.02, 1)";
    taskbar.classList.add("pill-active");

    updatePillShape(targetWidth, targetHeight, targetRadius, targetBottom);

    // Show Content
    setTimeout(() => {
        revealPillContent(type);
    }, TIMING.MORPH_MS - 100);

    resetPillTimer(duration);
};

const hidePill = () => {
    if (!isPillActive || !taskbar) return;

    // 1. Hide Content
    hideAllPillContent();

    // 2. Restore Visual (Setelah Fade Out)
    setTimeout(() => {
        if (!isPillActive) return; 

        taskbar.classList.remove("pill-active");

        // Restore Pixel Size
        if (taskbarRestoreState.rect) {
            taskbar.style.width = `${taskbarRestoreState.rect.width}px`;
            taskbar.style.height = `${taskbarRestoreState.rect.height}px`;
        }
        
        // Restore Position
        if (currentTaskbarPosition === 'left' || currentTaskbarPosition === 'right') {
            taskbar.style.left = taskbarRestoreState.style.left || "";
            taskbar.style.bottom = taskbarRestoreState.style.bottom || "";
            taskbar.style.top = taskbarRestoreState.style.top || "";
            taskbar.style.transform = taskbarRestoreState.style.transform || "";
        } else {
            taskbar.style.bottom = taskbarRestoreState.style.bottom || "";
            taskbar.style.top = taskbarRestoreState.style.top || "";
        }
        
        taskbar.style.borderRadius = taskbarRestoreState.style.borderRadius || "";

    }, TIMING.FADE_MS);

    // 3. Final Cleanup & Restore Visualizer
    setTimeout(() => {
        if (!taskbar.classList.contains("pill-active")) { 
            taskbar.style.width = "";
            taskbar.style.height = "";
            taskbar.style.left = "";
            taskbar.style.top = "";
            taskbar.style.right = "";
            taskbar.style.bottom = "";
            taskbar.style.transform = "";
            taskbar.style.borderRadius = "";
            
            applyTaskbarLayout(currentTaskbarPosition);
            applyTaskbarStyle(currentTaskbarStyle);
            
            isPillActive = false;
            activePillType = null;

            // [VISUALIZER FIX] Fade in visualizer smoothly
            proceedToShowVisualizer();
        }
    }, TIMING.FADE_MS + TIMING.MORPH_MS); 
};

// --- HELPER FUNCTIONS ---

const updatePillShape = (w, h, r, b) => {
    taskbar.style.width = `${w}px`;
    taskbar.style.height = `${h}px`;
    taskbar.style.borderRadius = r;
    
    if (currentTaskbarPosition === 'top') {
        taskbar.style.top = "12px";
        taskbar.style.bottom = "auto";
    } else {
        taskbar.style.bottom = b;
        taskbar.style.top = "auto";
    }
};

const hideAllPillContent = () => {
    // Karena ada duplikat ID di HTML, kita gunakan querySelectorAll untuk aman
    document.querySelectorAll("#notification-content, #volume-content").forEach(el => {
        el.classList.remove("show-pill-content");
        el.style.pointerEvents = "none"; // Matikan pointer events saat hide
    });
};

const revealPillContent = (type) => {
    // Helper ini KHUSUS untuk switch/new pill. 
    hideAllPillContent();

    // Menggunakan querySelectorAll untuk menargetkan elemen di dalam pill aktif (Taskbar)
    // Kita asumsikan elemen pertama yang ditemukan adalah yang di taskbar (karena struktur DOM)
    const targetId = type === "volume" ? "volume-content" : "notification-content";
    const el = document.getElementById(targetId);
    
    if(el) {
        requestAnimationFrame(() => {
            el.classList.add("show-pill-content");
            el.style.pointerEvents = "auto"; // AKTIFKAN KLIK
            
            // Fix khusus untuk tombol close di dalam elemen ini
            const btn = el.querySelector("#close-button");
            if(btn) btn.style.pointerEvents = "auto";
        });
    }
};

const resetPillTimer = (duration) => {
    clearTimeout(pillTimer);
    // Extra waktu agar tidak langsung nutup saat user mikir
    const totalDuration = duration + TIMING.FADE_MS + 200; 
    
    pillTimer = setTimeout(() => {
        if (activePillType === "volume" && isVolumeChanging) return;
        hidePill();
    }, totalDuration);
};

// [VISUALIZER FIX] Helper to restore visualizer smoothly
const proceedToShowVisualizer = () => {
    if (!visualizerCanvas || !visualizerData) return;
    
    // Pastikan posisi visualizer diupdate sebelum ditampilkan
    positionVisualizer();

    if (isVisualizerFading) {
        const checkAndProceed = () => {
            if (isVisualizerFading) {
                requestAnimationFrame(checkAndProceed); 
            } else {
                triggerFadeIn();
            }
        };
        checkAndProceed();
    } else {
        triggerFadeIn();
    }

    function triggerFadeIn() {
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

// ==================================================================================
// BAGIAN 5: UNIFIED TASKBAR & PILL SYSTEM | END
// ==================================================================================


// ==================================================================================
// BAGIAN 6: SYSTEM NOTIFIKASI
// ==================================================================================
// Summary: Wrapper untuk menampilkan notifikasi teks dan volume control.

const showNotification = (title, message, icon) => {
    if (!notifTitle || !notifMessage || !notifIcon || !pillContainer) return;

    // Tambahkan ke notification center (sidebar)
    addNotificationToCenter(title, message, icon);

    // Tampilkan Pill Toast
    notifTitle.textContent = title;
    notifMessage.textContent = message;
    notifIcon.classList.add("flex", "items-center", "justify-center");

    if (icon && (icon.startsWith("blob:") || icon.startsWith("http"))) {
        notifIcon.innerHTML = `<img src="${icon}" class="w-full h-full object-cover rounded" alt="Notification Icon">`;
    } else if (icon) {
        notifIcon.innerHTML = icon;
    } else {
        notifIcon.innerHTML = "";
    }

    showPill("notification"); 
};

const showVolumeNotification = (percent) => {
    if (!volumeValue || !volumeBarFill || !volumeIcon) return;
    
    // Cegah konflik animasi
    if (isPillActive && activePillType !== "volume") {
        hidePill();
        setTimeout(() => { showVolumeNotification(percent); }, 300);
        return;
    }

    volumeValue.textContent = `${percent}%`;
    volumeBarFill.style.width = `${percent}%`;

    if (percent === 0) {
        volumeIcon.innerHTML = volumeIcons.mute;
    } else if (percent <= 50) {
        volumeIcon.innerHTML = volumeIcons.low;
    } else {
        volumeIcon.innerHTML = volumeIcons.high;
    }

    showPill("volume", 1800);
    console.log(`[DEBUG] Volume Updated: ${percent}%`);
};

// Helper: Menambahkan item ke Notification Center Sidebar
const addNotificationToCenter = (title, message, icon) => {
    if (!notificationPlaceholder || !notificationList) return;
    
    if (notificationPlaceholder.style.display !== "none") {
        notificationPlaceholder.style.display = "none";
    }

    let iconContent = "";
    if (icon && (icon.startsWith("blob:") || icon.startsWith("http"))) {
        iconContent = `<img src="${icon}" class="w-full h-full object-cover rounded" alt="Album Art">`;
    } else if (icon) {
        iconContent = icon;
    }

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

    notificationList.prepend(notifItem);

    const closeBtn = notifItem.querySelector(".notification-item-close");
    closeBtn.addEventListener("click", () => {
        notifItem.remove();
        if (notificationList.querySelectorAll(".notification-item").length === 0) {
            notificationPlaceholder.style.display = "block";
        }
    });
};

// ==================================================================================
// BAGIAN 6: SYSTEM NOTIFIKASI | END
// ==================================================================================


// ==================================================================================
// BAGIAN 7: AUDIO VISUALIZER SYSTEM
// ==================================================================================
// Summary: Menggambar bar visualizer di canvas dan memposisikannya di taskbar.

function drawVisualizer() {
    if (!visualizerCanvas || !visualizerCtx) return;
    requestAnimationFrame(drawVisualizer);
    visualizerCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);

    // Logic Decay jika Paused
    if (!visualizerData || visualizerData.isPaused) {
        if (previousBarHeights.some((h) => h > 0.1)) {
            for (let i = 0; i < previousBarHeights.length; i++) {
                previousBarHeights[i] *= 0.9;
            }
        } else {
            return;
        }
    }

    const bufferLength = visualizerData ? visualizerData.bufferLength : previousBarHeights.length;
    if (bufferLength === 0) return;
    while (previousBarHeights.length < bufferLength) previousBarHeights.push(0);

    // Styling
    const computedStyle = getComputedStyle(document.body);
    visualizerCtx.fillStyle = computedStyle.getPropertyValue("--visualizer-fill").trim();
    visualizerCtx.shadowBlur = visualizerSettings.shadowBlur;
    visualizerCtx.shadowColor = computedStyle.getPropertyValue("--visualizer-shadow").trim();

    // Frequency Bands
    const bassEndIndex = Math.floor(bufferLength * visualizerSettings.bassEndPercentage);
    const trebleStartIndex = Math.floor(bufferLength * visualizerSettings.trebleStartPercentage);

    // Drawing Loop
    if (currentTaskbarPosition === "top" || currentTaskbarPosition === "bottom") {
        // Horizontal Mode
        const barWidth = visualizerCanvas.width / bufferLength;
        for (let i = 0; i < bufferLength; i++) {
            let targetHeight = (visualizerData && !visualizerData.isPaused) 
                ? (visualizerData.data[i] / 255) * visualizerCanvas.height 
                : previousBarHeights[i];
            
            // Apply Boosts
            if (visualizerData && !visualizerData.isPaused) {
                if (i <= bassEndIndex) targetHeight *= visualizerSettings.bassMultiplier;
                else if (i >= trebleStartIndex) targetHeight *= (1.0 + visualizerSettings.trebleBoostAmount * ((i - trebleStartIndex) / (bufferLength - trebleStartIndex)));
                else targetHeight *= visualizerSettings.midBoostAmount;
                
                targetHeight = Math.pow(targetHeight / visualizerCanvas.height, visualizerSettings.scalingPower) * visualizerCanvas.height;
            }

            const smoothedHeight = (previousBarHeights[i] || 0) + (targetHeight - (previousBarHeights[i] || 0)) * visualizerSettings.smoothingFactor;
            const y = currentTaskbarPosition === "top" ? 0 : visualizerCanvas.height - smoothedHeight;
            
            visualizerCtx.fillRect(i * barWidth, y, barWidth, smoothedHeight);
            previousBarHeights[i] = smoothedHeight;
        }
    } else {
        // Vertical Mode
        const barHeight = visualizerCanvas.height / bufferLength;
        for (let i = 0; i < bufferLength; i++) {
            let targetWidth = (visualizerData && !visualizerData.isPaused)
                ? (visualizerData.data[i] / 255) * visualizerCanvas.width
                : previousBarHeights[i];
            
            // Apply Boosts (Vertical)
            if (visualizerData && !visualizerData.isPaused) {
                if (i <= bassEndIndex) targetWidth *= visualizerSettings.bassMultiplier;
                else if (i >= trebleStartIndex) targetWidth *= (1.0 + visualizerSettings.trebleBoostAmount * ((i - trebleStartIndex) / (bufferLength - trebleStartIndex)));
                else targetWidth *= visualizerSettings.midBoostAmount;
                
                targetWidth = Math.pow(targetWidth / visualizerCanvas.width, visualizerSettings.scalingPower) * visualizerCanvas.width;
            }

            const smoothedWidth = (previousBarHeights[i] || 0) + (targetWidth - (previousBarHeights[i] || 0)) * visualizerSettings.smoothingFactor;
            const x = currentTaskbarPosition === "left" ? 0 : visualizerCanvas.width - smoothedWidth;
            
            visualizerCtx.fillRect(x, i * barHeight, smoothedWidth, barHeight);
            previousBarHeights[i] = smoothedWidth;
        }
    }
}

function positionVisualizer() {
    if (!visualizerCanvas || !taskbar) return; 

    const isIsland = currentTaskbarStyle.startsWith("island");
    const isSpecialCenterCase = currentTaskbarStyle === "island-single" && !isTaskbarSpaceBetween;
    const rect = taskbar.getBoundingClientRect(); 

    visualizerCanvas.style.borderRadius = isIsland ? visualizerSettings.islandBorderRadius : "0";
    ["top", "bottom", "left", "right"].forEach(p => (visualizerCanvas.style[p] = "auto"));

    if (isSpecialCenterCase && (currentTaskbarPosition === "top" || currentTaskbarPosition === "bottom")) {
        // Posisi Centered
        const vizWidth = 500;
        visualizerCanvas.width = vizWidth;
        visualizerCanvas.height = visualizerSettings.height;
        visualizerCanvas.style.width = vizWidth + "px";
        visualizerCanvas.style.height = visualizerSettings.height + "px";
        visualizerCanvas.style.left = `calc(50% - ${vizWidth / 2}px)`;
        
        if (currentTaskbarPosition === "top") {
            visualizerCanvas.style.top = rect.bottom + visualizerSettings.islandGap + "px";
        } else {
            visualizerCanvas.style.top = rect.top - visualizerSettings.height - visualizerSettings.islandGap + "px";
        }
    } else {
        // Posisi Mengikuti Taskbar Full
        if (currentTaskbarPosition === "top" || currentTaskbarPosition === "bottom") {
            visualizerCanvas.width = rect.width;
            visualizerCanvas.height = visualizerSettings.height;
            visualizerCanvas.style.width = rect.width + "px";
            visualizerCanvas.style.height = visualizerSettings.height + "px";
            visualizerCanvas.style.left = rect.left + "px";
            
            if (currentTaskbarPosition === "top") {
                visualizerCanvas.style.top = (isIsland ? rect.bottom + visualizerSettings.islandGap : rect.bottom) + "px";
            } else {
                visualizerCanvas.style.top = (isIsland ? rect.top - visualizerSettings.height - visualizerSettings.islandGap : rect.top - visualizerSettings.height) + "px";
            }
        } else {
            // Vertical Sidebar
            visualizerCanvas.width = visualizerSettings.width;
            visualizerCanvas.height = rect.height;
            visualizerCanvas.style.width = visualizerSettings.width + "px";
            visualizerCanvas.style.height = rect.height + "px";
            visualizerCanvas.style.top = rect.top + "px";
            
            if (currentTaskbarPosition === "left") {
                visualizerCanvas.style.left = (isIsland ? rect.right + visualizerSettings.islandGap : rect.right) + "px";
            } else {
                visualizerCanvas.style.left = (isIsland ? rect.left - visualizerSettings.width - visualizerSettings.islandGap : rect.left - visualizerSettings.width) + "px";
            }
        }
    }
}

// ==================================================================================
// BAGIAN 7: AUDIO VISUALIZER SYSTEM | END
// ==================================================================================


// ==================================================================================
// BAGIAN 8: CONTEXT MENU & INTERAKSI PENGGUNA
// ==================================================================================
// Summary: Menangani klik kanan (Desktop & Explorer), klik kiri global, dan interaksi ikon taskbar.

function showDesktopContextMenu(e) {
    if (!startMenu || !contextMenu || !explorerGeneralMenu || !explorerItemMenu) return; 
    
    // Hide elemen lain
    startMenu.classList.remove("show");
    explorerGeneralMenu.style.display = "none";
    explorerItemMenu.style.display = "none";

    contextMenu.style.display = "block";
    const { clientX: mouseX, clientY: mouseY } = e;
    const { offsetWidth: menuWidth, offsetHeight: menuHeight } = contextMenu;
    const { innerWidth: windowWidth, innerHeight: windowHeight } = window;
    
    // Prevent overflow screen
    let x = mouseX + menuWidth > windowWidth ? windowWidth - menuWidth - 5 : mouseX;
    let y = mouseY + menuHeight > windowHeight ? windowHeight - menuHeight - 5 : mouseY;
    
    contextMenu.style.top = `${y}px`;
    contextMenu.style.left = `${x}px`;
}

function showExplorerContextMenu(data, frameRect) {
    if (!startMenu || !contextMenu || !explorerGeneralMenu || !explorerItemMenu || !fileExplorerWinBox) return; 

    // Hide menus lain
    startMenu.classList.remove("show");
    contextMenu.style.display = "none";
    explorerGeneralMenu.style.display = "none";
    explorerItemMenu.style.display = "none";

    const { type, states, clickPosition } = data;
    const menuToShow = type === "item" ? explorerItemMenu : explorerGeneralMenu;

    // Set state disabled/enabled
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

    // Posisi relatif terhadap iframe Explorer
    const x = frameRect.left + clickPosition.x;
    const y = frameRect.top + clickPosition.y;

    const { offsetWidth: menuWidth, offsetHeight: menuHeight } = menuToShow;
    const { innerWidth: windowWidth, innerHeight: windowHeight } = window;

    let finalX = x + menuWidth > windowWidth ? windowWidth - menuWidth - 5 : x;
    let finalY = y + menuHeight > windowHeight ? windowHeight - menuHeight - 5 : y;
    
    menuToShow.style.left = `${finalX}px`;
    menuToShow.style.top = `${finalY}px`;

    // Submenu positioning
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
    if (!explorerGeneralMenu || !explorerItemMenu) return; 
    const menus = [explorerGeneralMenu, explorerItemMenu];
    
    menus.forEach((menu) => {
        menu.addEventListener("click", (e) => {
            const item = e.target.closest("[data-command]");
            if (item && !item.classList.contains("disabled")) {
                const command = item.dataset.command;
                const explorerIframe = fileExplorerWinBox ? fileExplorerWinBox.body.querySelector('iframe') : null;
                if (explorerIframe && explorerIframe.contentWindow) explorerIframe.contentWindow.postMessage(
                    { action: "execute-explorer-command", value: command }, "*"
                );
                
                if (!item.querySelector(".submenu")) {
                    explorerGeneralMenu.style.display = "none";
                    explorerItemMenu.style.display = "none";
                }
            }
        });
    });
}

function setupClickForwarding() {
    if (!clickInterceptor) return;

    // Meneruskan klik dari layer transparan ke elemen di bawahnya
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
            window.addEventListener("mouseup", onInteractionEnd, { once: true });
            window.addEventListener("mouseleave", onInteractionEnd, { once: true });
        }
    });
}

function setupMenus() {
    // Context Menu Desktop
    if (desktop) desktop.addEventListener("contextmenu", (e) => { e.preventDefault(); showDesktopContextMenu(e); });
    if (clickInterceptor) clickInterceptor.addEventListener("contextmenu", (e) => { e.preventDefault(); showDesktopContextMenu(e); });

    // Global Click Handler (Menutup menu jika klik di luar)
    document.addEventListener("click", (e) => {
        if (contextMenu && contextMenu.style.display === "block" && !contextMenu.contains(e.target)) {
            contextMenu.style.display = "none";
        }
        if (startMenu && startButton && startMenu.classList.contains("show") && !e.composedPath().includes(startMenu) && !startButton.contains(e.target)) {
            startMenu.classList.remove("show");
        }
        if (explorerGeneralMenu && explorerItemMenu && !e.target.closest(".explorer-context-menu")) {
            explorerGeneralMenu.style.display = "none";
            explorerItemMenu.style.display = "none";
        }
        if (notificationCenter && notificationCenterTrigger && notificationCenter.classList.contains("show") && !notificationCenter.contains(e.target) && !notificationCenterTrigger.contains(e.target) && !datetimeContainer.contains(e.target)) {
            notificationCenter.classList.remove("show");
        }
    });

    // Event Listener Menu Items
    if (contextMenuSettings) contextMenuSettings.addEventListener("click", () => { openApp("cp"); if (contextMenu) contextMenu.style.display = "none"; });
    if (contextMenuRefresh) contextMenuRefresh.addEventListener("click", () => {
        if (contextMenu) contextMenu.style.display = "none";
        const icons = Array.from(document.querySelectorAll("#desktop-icons .desktop-icon"));
        icons.forEach((icon) => { icon.classList.remove("animate-in"); icon.classList.add("hide-for-refresh"); });
        setTimeout(() => {
            icons.forEach((icon, index) => {
                setTimeout(() => { icon.classList.remove("hide-for-refresh"); icon.classList.add("animate-in"); }, index * 150);
            });
        }, 50);
    });

    // Notification Center Toggle (Button)
    if (notificationCenterTrigger) notificationCenterTrigger.addEventListener("click", (event) => {
        event.stopPropagation();
        if (startMenu) startMenu.classList.remove("show");
        if (contextMenu) contextMenu.style.display = "none";
        if (notificationCenter) notificationCenter.classList.toggle("show");
    });

    // Notification Center Toggle (Clock/Date - FIX ADDED HERE)
    if (datetimeContainer) datetimeContainer.addEventListener("click", (event) => {
        event.stopPropagation();
        if (startMenu) startMenu.classList.remove("show");
        if (contextMenu) contextMenu.style.display = "none";
        if (notificationCenter) notificationCenter.classList.toggle("show");
    });
}

function setupAppInteractions() {
    // Double Click Desktop Icons
    if (thisPcIcon) thisPcIcon.addEventListener("dblclick", () => openApp("explorer"));
    if (controlPanelIcon) controlPanelIcon.addEventListener("dblclick", () => openApp("cp"));
    if (musicPlayerIcon) musicPlayerIcon.addEventListener("dblclick", () => openApp("music"));
    if (live2dIcon) live2dIcon.addEventListener("dblclick", () => openApp("live2d"));
    if (videoPlayerIcon) videoPlayerIcon.addEventListener("dblclick", () => openApp("video")); 

    // Taskbar Icon Clicks (Toggle Minimize/Restore)
    if (taskbarExplorerIcon) taskbarExplorerIcon.addEventListener("click", () => {
        if (!isExplorerOpen) openApp("explorer");
        else (fileExplorerWinBox && !fileExplorerWinBox.min) ? minimizeApp("explorer") : restoreApp("explorer");
    });
    if (taskbarControlPanelIcon) taskbarControlPanelIcon.addEventListener("click", () => {
        if (!isControlPanelOpen) { openApp("cp"); return; }
        (controlPanelWinBox && !controlPanelWinBox.min) ? minimizeApp("cp") : restoreApp("cp");
    });
    if (taskbarMusicIcon) taskbarMusicIcon.addEventListener("click", () => {
        if (!isMusicPlayerOpen) return;
        (musicPlayerWinBox && !musicPlayerWinBox.min) ? minimizeApp("music") : restoreApp("music");
    });
    if (taskbarLive2dIcon) taskbarLive2dIcon.addEventListener("click", () => {
        if (!isLive2dOpen) return;
        (live2dWallpaperWinBox && !live2dWallpaperWinBox.min) ? minimizeApp("live2d") : restoreApp("live2d");
    });
    if (taskbarVideoPlayerIcon) taskbarVideoPlayerIcon.addEventListener("click", () => {
        if (!isVideoPlayerOpen) return;
        (videoPlayerWinBox && !videoPlayerWinBox.min) ? minimizeApp("video") : restoreApp("video");
    });
}

// ==================================================================================
// BAGIAN 8: CONTEXT MENU & INTERAKSI PENGGUNA | END
// ==================================================================================


// ==================================================================================
// BAGIAN 9: INITIALIZATION & MAIN EVENT LOOP
// ==================================================================================
// Summary: Fungsi inisialisasi utama yang dijalankan saat halaman dimuat. 
// Berisi Event Listener untuk 'message' (komunikasi iframe) dan setup awal.

function initialize() {
    // 1. Setup Basic Events & DOM Safety Check
    // Pastikan tombol close pill berfungsi
    if (closeButton) {
        // Hapus listener lama jika ada (best practice di framework, tapi ok di vanilla JS)
        closeButton.removeEventListener("click", hidePill); 
        closeButton.addEventListener("click", (e) => {
            e.stopPropagation();
            hidePill();
        });
    } else {
        // Fallback: cari manual jika variabel global belum ter-bind
        const btn = document.getElementById("close-button");
        if(btn) btn.addEventListener("click", hidePill);
    }

    // [SAFETY] Pindahkan Notification Center keluar dari Taskbar jika tidak sengaja bersarang
    // Ini memperbaiki bug "terpotong" jika HTML salah struktur.
    if (notificationCenter && taskbar && taskbar.contains(notificationCenter)) {
        document.body.appendChild(notificationCenter);
    }

    if (desktop) setupWallpaperDragDrop();
    setupAppInteractions();
    setupMenus(); // -> Ini yang mengatur klik icon notifikasi
    if (clickInterceptor) setupClickForwarding();
    setupExplorerContextMenuActions();

    // Event Listener untuk tombol "Clear All" di Notification Center
    if (clearAllBtn && notificationList && notificationPlaceholder) {
        clearAllBtn.addEventListener("click", () => {
            notificationList.querySelectorAll(".notification-item").forEach((item) => item.remove());
            notificationPlaceholder.style.display = "block";
        });
    }
    
    // 2. Welcome Notification (Muncul setelah load)
    window.addEventListener("load", () => {
        const proTipIcon = `<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>`;
        setTimeout(() => {
            showNotification("Selamat Datang!", "Drag & drop gambar ke desktop untuk mengganti wallpaper.", proTipIcon);
        }, 1500);
    });

    // 3. MAIN MESSAGE EVENT LISTENER (Komunikasi antar Iframe)
    window.addEventListener("message", (event) => {
        // console.log("[Desktop] Message received:", event.data.action);
        const { action, dx, dy, data, bufferLength, isPaused, value, appName } = event.data;

        switch (action) {
            // --- Common/System Actions ---
            case "show-media-notification":
                showNotification(event.data.title, event.data.artist, event.data.albumArt);
                break;
            case "show-volume-flyout":
                showVolumeNotification(event.data.volume);
                break;
            case "volume-change-start":
                isVolumeChanging = true;
                if (isPillActive && activePillType === "volume") {
                    clearTimeout(pillTimer);
                    pillTimer = setTimeout(() => { if (!isVolumeChanging) hidePill(); }, 2000);
                }
                break;
            case "volume-change-end":
                isVolumeChanging = false;
                if (isPillActive && activePillType === "volume") {
                    clearTimeout(pillTimer);
                    pillTimer = setTimeout(() => { if (!isVolumeChanging) hidePill(); }, 500);
                }
                break;
            case "open-app-from-start-menu":
                openApp(appName);
                if (startMenu) startMenu.classList.remove("show");
                break;
            case "test-toast-notification":
                const testIcon = `<svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
                showNotification("Test Notification", "This is a test notification from the Control Panel.", testIcon);
                break;

            // --- Music Player Actions ---
            case "drag-music-frame":
                // Legacy: WinBox handles dragging natively
                break;
            case "close-music-frame": closeApp("music"); break;
            case "minimize-music-frame": minimizeApp("music"); break;
            case "bring-music-to-front": bringToFront("music"); break;
            case "maximize-music-frame": maximizeApp("music"); break;
            case "stop-music-frame": visualizerData = null; if (visualizerCanvas) visualizerCanvas.style.display = "none"; break;
            case "visualizer-data": visualizerData = { data: data, bufferLength: bufferLength, isPaused: isPaused }; break;

            // --- Video Player Actions ---
            case "drag-vp-frame":
                // Legacy: WinBox handles dragging natively
                break;
            case "close-vp-frame": closeApp("video"); break;
            case "minimize-vp-frame": minimizeApp("video"); break;
            case "bring-vp-to-front": bringToFront("video"); break;
            case "maximize-vp-frame": maximizeApp("video"); break;

            // --- Control Panel Actions ---
            case "drag-cp-frame":
                // Legacy: WinBox handles dragging natively
                break;
            case "close-cp-frame": closeApp("cp"); break;
            case "minimize-cp-frame": minimizeApp("cp"); break;
            case "bring-cp-to-front": bringToFront("cp"); break;
            case "maximize-cp-frame": maximizeApp("cp"); break;
            case "request-settings":
                 if (controlPanelWinBox && controlPanelWinBox.body.querySelector('iframe')?.contentWindow) {
                     controlPanelWinBox.body.querySelector('iframe').contentWindow.postMessage({ action: "request-settings" }, "*");
                 }
                 break;

            // --- File Explorer Actions ---
            
            case "show-explorer-context-menu": {
                const explorerEl = fileExplorerWinBox ? fileExplorerWinBox.body : null;
                if (explorerEl) showExplorerContextMenu(data, explorerEl.getBoundingClientRect());
                break;
            }

            // --- Live2D / Wallpaper Actions ---
            case "drag-live2d-frame":
                // Legacy: WinBox handles dragging natively
                break;
            case "close-live2d-frame": closeApp("live2d"); break;
            case "minimize-live2d-frame": minimizeApp("live2d"); break;
            case "bring-live2d-to-front": bringToFront("live2d"); break;
            case "maximize-live2d-frame": maximizeApp("live2d"); break;
            case "set-live-wallpaper":
                if (wallpaperIframe) { wallpaperIframe.src = value; wallpaperIframe.style.display = "block"; }
                if (clickInterceptor) clickInterceptor.style.display = "block";
                if (desktop) desktop.style.backgroundImage = "none";
                if (document.querySelector(".desktop-image")) document.querySelector(".desktop-image").style.display = "none";
                break;
            case "clear-live-wallpaper":
                if (wallpaperIframe) { wallpaperIframe.src = "about:blank"; wallpaperIframe.style.display = "none"; }
                if (clickInterceptor) clickInterceptor.style.display = "none";
                if (document.querySelector(".desktop-image")) document.querySelector(".desktop-image").style.display = "block";
                break;

            // --- Settings & Customization Actions ---
            case "toggle-fancy-mode":
                document.body.classList.toggle("fancy-mode", value);
                [musicPlayerWinBox, videoPlayerWinBox, live2dWallpaperWinBox, fileExplorerWinBox, controlPanelWinBox].forEach(wb => {
                    if (wb) {
                        const frame = wb.body.querySelector('iframe');
                        if (frame && frame.contentWindow) {
                            frame.contentWindow.postMessage({ action: "toggle-fancy-mode", value: value }, "*");
                        }
                    }
                });
                
                if (typeof toggleFancyMode === "function") toggleFancyMode(value);
                window.dispatchEvent(new CustomEvent("fancy-mode-toggled", { detail: { value } }));
                break;
            case "change-theme": {
                const isDark = value === "dark";
                document.body.classList.toggle("dark", isDark);
                
                [musicPlayerWinBox, videoPlayerWinBox, live2dWallpaperWinBox, fileExplorerWinBox, controlPanelWinBox].forEach(wb => {
                    if (wb) {
                        wb.removeClass("win11-light").removeClass("win11-dark").addClass(isDark ? "win11-dark" : "win11-light");
                        const frame = wb.body.querySelector('iframe');
                        if (frame && frame.contentWindow) {
                            frame.contentWindow.postMessage({ action: "theme-change", isDark }, "*");
                        }
                    }
                });
                
                if (typeof applyTheme === "function") applyTheme(isDark);
                window.dispatchEvent(new CustomEvent("theme-changed", { detail: { isDark } }));
                break;
            }
            case "change-bg-size":
                if (desktopImage) desktopImage.style.objectFit = value === "auto" ? "none" : value;
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
                if (taskbar) taskbar.className = taskbar.className.replace(/taskbar-(bottom|top|left|right)/, `taskbar-${value}`);
                applyTaskbarLayout(value);
                break;
            case "change-taskbar-style":
                applyTaskbarStyle(value);
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

    // 4. Clock Interval
    setInterval(updateClock, 1000);
    updateClock();

    // 5. Resize & Scroll Handlers
    window.addEventListener("load", () => {
        applyTaskbarLayout(currentTaskbarPosition);
        window.addEventListener("resize", () => setTimeout(positionVisualizer, 50));
        setTimeout(() => window.dispatchEvent(new Event("resize")), 350);
    });

    document.querySelectorAll(".quick-setting-btn").forEach((button) => {
        button.addEventListener("click", () => button.classList.toggle("active"));
    });

    setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        updateTaskbarIconsVisibility(); 
    }, 100);
}

// ==================================================================================
// BAGIAN 9: INITIALIZATION & MAIN EVENT LOOP | END
// ==================================================================================

// ==================================================================================
// EXECUTE INITIALIZATION
// ==================================================================================
document.addEventListener('DOMContentLoaded', initialize);
// index-main.js | END