// === ALL ELEMENT DECLARATIONS ===
const desktop = document.getElementById("desktop");
const desktopImage = document.querySelector(".desktop-image"); // FIX: Deklarasikan elemen gambar wallpaper
const wallpaperIframe = document.getElementById("wallpaper-iframe");
const clickInterceptor = document.getElementById("click-interceptor"); // NEW: Invisible layer

// for notification item
const notificationList = document.getElementById("notification-list");
const notificationPlaceholder = document.getElementById(
    "notification-placeholder",
);

const clearAllBtn = document.getElementById("clear-all-notifications-btn");

// App Iframes
const controlPanelIcon = document.getElementById("control-panel-icon");
const controlPanelFrame = document.getElementById("control-panel-frame");
const musicPlayerIcon = document.getElementById("music-player-icon");
const musicPlayerFrame = document.getElementById("music-player-frame");
const live2dIcon = document.getElementById("live2d-icon");
const notificationCenterTrigger = document.getElementById(
    "notification-center-trigger",
);
const live2dWallpaperFrame = document.getElementById("live2d-wallpaper-frame");
// BARU: Video Player elements
const videoPlayerIcon = document.getElementById("video-player-icon");
const videoPlayerFrame = document.getElementById("video-player-frame");
// [KEPT] Deklarasi dari file lokal
const thisPcIcon = document.getElementById("this-pc-icon");
const fileExplorerFrame = document.getElementById("file-explorer-frame");

// Visualizer Elements
const visualizerCanvas = document.getElementById("visualizer");
const visualizerCtx = visualizerCanvas ? visualizerCanvas.getContext("2d") : null; // Tambahkan cek null

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
// BARU: Taskbar Video Player icon
const taskbarVideoPlayerIcon = document.getElementById(
    "taskbar-video-player-icon",
);
const notificationCenter = document.getElementById("notification-center");
// [KEPT] Deklarasi dari file lokal
const taskbarExplorerIcon = document.getElementById("taskbar-explorer-icon");

// Start Menu Elements
const startButton = document.getElementById("start-button");
// GANTI: Gunakan ID yang benar: #start-menu
const startMenu = document.getElementById("start-menu");

// Context Menu Elements
const contextMenu = document.getElementById("context-menu");
const contextMenuSettings = document.getElementById("context-menu-settings");
const contextMenuRefresh = document.getElementById("context-menu-refresh");
// NEW: Explorer Context Menu elements
const explorerGeneralMenu = document.getElementById(
    "explorer-context-menu-general",
);
const explorerItemMenu = document.getElementById("explorer-context-menu-item");

// BARU: Elemen Flyout Volume di Desktop
const volumeContent = document.getElementById("volume-content");
const volumeIcon = document.getElementById("volume-icon");
const volumeBarFill = document.getElementById("volume-bar-fill");
const volumeValue = document.getElementById("volume-value");

// Toast Notification
const notificationContent = document.getElementById("notification-content");
const pillContainer = document.getElementById("pill-container");
const closeButton = document.getElementById("close-button");
const notifIcon = document.getElementById("notification-icon");
const notifTitle = document.getElementById("notification-title");
const notifMessage = document.getElementById("notification-message");

// Global State Variables (Sekarang akan dilewatkan ke WindowManager)
let isMusicPlayerOpen = false;
let isControlPanelOpen = false;
let isLive2dOpen = false;
let isVideoPlayerOpen = false; // BARU
let isExplorerOpen = false; // [KEPT] Dari file lokal
let lastMusicPlayerRect = null;
let lastControlPanelRect = null;
let lastLive2dRect = null;
let lastVideoPlayerRect = null; // BARU
let lastExplorerRect = null; // [KEPT] Dari file lokal
let visualizerData = null;
let previousBarHeights = [];
let currentTaskbarPosition = "bottom";
let currentTaskbarStyle = "default";
let isTaskbarSpaceBetween = false;
let isMusicPlayerMaximized = false;
let isControlPanelMaximized = false;
let isLive2dMaximized = false;
let isVideoPlayerMaximized = false; // BARU
let isExplorerMaximized = false;

// Variabel Original Rects TIDAK DIPERLUKAN lagi di sini, dipindahkan ke WindowManager

// For toast notification
let originalTaskbarClasses = taskbar ? taskbar.className : ""; // Cek null
let originalTaskbarInlineStyles = "";
let originalTaskbarStyles = "";
let pillTimer; 
let volumeChangeTimer; 
let isPillActive = false; 
let activePillType = null;
let isVisualizerFading = false;
let isVolumeChanging = false; 

// Deklarasi global untuk WindowManager
let windowManager = null; 

// Helper untuk Debugging Taskbar (Dibiarkan di sini)
function debugTaskbarState(phase) {
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

// Show and hide pill logic (Dibiarkan di sini karena terkait Taskbar UI)
const showPill = (type, duration = 5000) => {
    if (isPillActive && type === activePillType) {
        clearTimeout(pillTimer);
        pillTimer = setTimeout(() => {
            if (type === "volume" && isVolumeChanging) return;
            hidePill();
        }, duration);
        return;
    }

    if (isPillActive && type !== activePillType) {
        const currentContent =
            activePillType === "notification"
                ? notificationContent
                : volumeContent;
        const newContent =
            type === "notification" ? notificationContent : volumeContent;

        currentContent.style.opacity = "0";

        setTimeout(() => {
            currentContent.style.display = "none";
            newContent.style.display = "flex";
            setTimeout(() => {
                newContent.style.opacity = "1";
            }, 20);
        }, 300);

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

    const taskbarRect = taskbar.getBoundingClientRect();
    const taskbarStyle = getComputedStyle(taskbar);
    $(pillContainer).data("originalRect", taskbarRect);

    taskbarMainGroup.style.opacity = "0";
    systemTray.style.opacity = "0";
    visualizerCanvas.style.opacity = "0";

    pillContainer.style.transition = "none";
    pillContainer.style.left = `${taskbarRect.left}px`;
    pillContainer.style.top = `${taskbarRect.top}px`;
    pillContainer.style.width = `${taskbarRect.width}px`;
    pillContainer.style.height = `${taskbarRect.height}px`;
    pillContainer.style.borderRadius = taskbarStyle.borderRadius;

    const activeContent =
        type === "notification" ? notificationContent : volumeContent;
    notificationContent.style.display = "none";
    volumeContent.style.display = "none";
    activeContent.style.display = "flex";
    activeContent.style.opacity = "0";

    requestAnimationFrame(() => {
        taskbar.style.opacity = "0";
        taskbar.style.pointerEvents = "none";

        pillContainer.style.transition =
            "all 0.45s cubic-bezier(0.4, 0, 0.2, 1)";
        pillContainer.classList.add("show");

        const pillWidth = 380;
        const pillHeight = 56;
        const targetLeft = window.innerWidth / 2 - pillWidth / 2;
        const targetTop = window.innerHeight - pillHeight - 8;

        pillContainer.style.left = `${targetLeft}px`;
        pillContainer.style.top = `${targetTop}px`;
        pillContainer.style.width = `${pillWidth}px`;
        pillContainer.style.height = `${pillHeight}px`;
        pillContainer.style.borderRadius = "12px";

        setTimeout(() => {
            activeContent.style.opacity = "1";
        }, 200);
    });

    pillTimer = setTimeout(() => {
        if (type === "volume" && isVolumeChanging) return;
        hidePill();
    }, duration);
};

const hidePill = () => {
    if (!isPillActive) return;

    clearTimeout(pillTimer);
    const originalRect = $(pillContainer).data("originalRect");
    const morphDuration = 450;
    const contentFadeDuration = 150;

    if (!originalRect) {
        resetPillState();
        return;
    }

    const activeContent =
        activePillType === "notification" ? notificationContent : volumeContent;
    activeContent.style.opacity = "0";

    setTimeout(() => {
        pillContainer.style.left = `${originalRect.left}px`;
        pillContainer.style.top = `${originalRect.top}px`;
        pillContainer.style.width = `${originalRect.width}px`;
        pillContainer.style.height = `${originalRect.height}px`;
        pillContainer.style.borderRadius =
            getComputedStyle(taskbar).borderRadius;

        pillContainer.classList.remove("show");

        taskbar.style.opacity = "1";
        taskbar.style.pointerEvents = "auto";

        const taskbarContentFadeInDuration = 350;
        taskbarMainGroup.style.transition = `opacity ${taskbarContentFadeInDuration}ms ease-in 0.05s`;
        systemTray.style.transition = `opacity ${taskbarContentFadeInDuration}ms ease-in 0.05s`;
        visualizerCanvas.style.transition = `opacity ${taskbarContentFadeInDuration}ms ease-in 0.05s`;

        taskbarMainGroup.style.opacity = "1";
        systemTray.style.opacity = "1";
        if (visualizerCanvas.style.display !== "none") {
            visualizerCanvas.style.opacity = "1";
        }
    }, contentFadeDuration);

    setTimeout(
        () => {
            taskbarMainGroup.style.transition = "";
            systemTray.style.transition = "";
            visualizerCanvas.style.transition = "";
            activeContent.style.display = "none";
            resetPillState();
        },
        contentFadeDuration + morphDuration + 100,
    );
};

const resetPillState = () => {
    isPillActive = false;
    activePillType = null;
    pillContainer.style.transition = "none";
    pillContainer.classList.remove("show");
    notificationContent.style.display = "none";
    volumeContent.style.display = "none";

    taskbar.style.opacity = "1";
    taskbar.style.pointerEvents = "auto";
    taskbarMainGroup.style.opacity = "1";
    systemTray.style.opacity = "1";
    if (visualizerCanvas.style.display !== "none") {
        visualizerCanvas.style.opacity = "1";
    }
};

// Fungsi untuk melanjutkan setelah pill UI hilang dan taskbar kembali normal (Dibiarkan di sini)
const proceedToShowVisualizer = () => {
    // Logika visualizer tidak perlu diubah, hanya memastikan ia ada.
};

// Wrapper untuk menampilkan notifikasi teks (Dibiarkan di sini)
const showNotification = (title, message, icon) => {
    addNotificationToCenter(title, message, icon);

    notifTitle.textContent = title;
    notifMessage.textContent = message;

    notifIcon.classList.add("flex", "items-center", "justify-center");

    if (icon && (icon.startsWith("blob:") || icon.startsWith("http"))) {
        notifIcon.innerHTML = `<img src="${icon}" class="w-full h-full object-cover rounded" alt="Notification Icon">`;
    } else if (icon) {
        notifIcon.innerHTML = icon;
        const svg = notifIcon.querySelector("svg");
        // ... (Logika SVG tetap) ...
    } else {
        notifIcon.innerHTML = "";
    }

    showPill("notification");
};

// Wrapper BARU untuk menampilkan notifikasi volume (Dibiarkan di sini)
const showVolumeNotification = (percent) => {
    if (isPillActive && activePillType !== "volume") {
        hidePill();
        setTimeout(() => {
            showVolumeNotification(percent);
        }, 300);
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
};

// Event listener untuk tombol close - DIHAPUS DARI SINI, AKAN DIPINDAH KE INITIALIZE()

// fungsi baru for notification item (Dibiarkan di sini)
const addNotificationToCenter = (title, message, icon) => {
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
        if (
            notificationList.querySelectorAll(".notification-item").length === 0
        ) {
            notificationPlaceholder.style.display = "block";
        }
    });
};

// Pindahkan ini ke initialize()
// window.addEventListener("load", () => {
//     const proTipIcon = `<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>`;

//     setTimeout(() => {
//         showNotification(
//             "Selamat Datang!",
//             "Drag & drop gambar ke desktop untuk mengganti wallpaper.",
//             proTipIcon,
//         );
//     }, 1500);
// });

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
    const now = new Date();
    clockElement.textContent = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    dateElement.textContent = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;
}

function setupWallpaperDragDrop() {
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

// FUNGSI WINDOW MANAGEMENT DIHAPUS DARI SINI DAN DIPINDAHKAN KE windowmanager.js
// openApp, closeApp, minimizeApp, maximizeApp, restoreMaximizedApp, restoreApp, bringToFront, setupAppInteractions.

// --- VISUALIZER FUNCTIONS (Dibiarkan di sini karena terkait Canvas dan State Visualizer) ---

function drawVisualizer() {
    // Tambahkan cek visualizerCtx untuk menghindari error
    if (!visualizerCtx) return; 
    
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
    const isIsland = currentTaskbarStyle.startsWith("island");
    const isSpecialCenterCase =
        currentTaskbarStyle === "island-single" && !isTaskbarSpaceBetween;
    
    // Tambahkan cek null untuk visualizerCanvas
    if (!visualizerCanvas) return;
    
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
    currentTaskbarPosition = position;
    const isVertical = position === "left" || position === "right";
    taskbarMainGroup.classList.toggle("flex-col", isVertical);
    appIconsContainer.classList.toggle("flex-col", isVertical);
    systemTray.classList.toggle("flex-col", isVertical);
    // Panggil positionVisualizer setelah layout diperbarui
    setTimeout(positionVisualizer, 50);
}

function applyTaskbarStyle(style) {
    currentTaskbarStyle = style;
    taskbar.classList.remove("island", "single", "split", "space-between");

    if (style === "default") {
        taskbar.removeAttribute("style");
    }

    if (style === "island-single") taskbar.classList.add("island", "single");
    if (style === "island-split") taskbar.classList.add("island", "split");
    if (isTaskbarSpaceBetween && style.startsWith("island"))
        taskbar.classList.add("space-between");
    
    // Panggil fungsi pembaruan ikon dari WindowManager
    if(windowManager) windowManager.updateTaskbarIconsVisibility();

    // Panggil positionVisualizer setelah style diperbarui
    setTimeout(positionVisualizer, 50);
}

// --- CONTEXT MENU FUNCTIONS (Dibiarkan di sini) ---
function showDesktopContextMenu(e) {
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
    // Hide other menus
    startMenu.classList.remove("show");
    contextMenu.style.display = "none";
    explorerGeneralMenu.style.display = "none";
    explorerItemMenu.style.display = "none";

    const { type, states, clickPosition } = data;

    const menuToShow = type === "item" ? explorerItemMenu : explorerGeneralMenu;

    // Set disabled states
    explorerGeneralMenu
        .querySelector("#explorer-general-paste")
        .classList.toggle("disabled", states.pasteDisabled);
    explorerGeneralMenu
        .querySelector("#explorer-general-undo")
        .classList.toggle("disabled", states.undoDisabled);

    explorerItemMenu
        .querySelector("#explorer-item-cut")
        .classList.toggle("disabled", states.itemActionsDisabled);
    explorerItemMenu
        .querySelector("#explorer-item-copy")
        .classList.toggle("disabled", states.itemActionsDisabled);
    explorerItemMenu
        .querySelector("#explorer-item-delete")
        .classList.toggle("disabled", states.itemActionsDisabled);
    explorerItemMenu
        .querySelector("#explorer-item-rename")
        .classList.toggle("disabled", states.renameDisabled);

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
        const subRect = submenu.getBoundingClientRect(); // this is just for width/height
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
    const menus = [explorerGeneralMenu, explorerItemMenu];
    menus.forEach((menu) => {
        menu.addEventListener("click", (e) => {
            const item = e.target.closest("[data-command]");
            if (item && !item.classList.contains("disabled")) {
                const command = item.dataset.command;
                fileExplorerFrame.contentWindow.postMessage(
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
    desktop.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        showDesktopContextMenu(e);
    });

    clickInterceptor.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        showDesktopContextMenu(e);
    });

    document.addEventListener("click", (e) => {
        if (
            contextMenu.style.display === "block" &&
            !contextMenu.contains(e.target)
        ) {
            contextMenu.style.display = "none";
        }
        if (
            startMenu.classList.contains("show") &&
            !e.composedPath().includes(startMenu) &&
            !startButton.contains(e.target)
        ) {
            startMenu.classList.remove("show");
        }
        if (!e.target.closest(".explorer-context-menu")) {
            explorerGeneralMenu.style.display = "none";
            explorerItemMenu.style.display = "none";
        }
        if (
            notificationCenter.classList.contains("show") &&
            !notificationCenter.contains(e.target) &&
            !notificationCenterTrigger.contains(e.target)
        ) {
            notificationCenter.classList.remove("show");
        }
    });

    contextMenuSettings.addEventListener("click", () => {
        if(windowManager) windowManager.openApp("cp");
        contextMenu.style.display = "none";
    });

    contextMenuRefresh.addEventListener("click", () => {
        contextMenu.style.display = "none";

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

    notificationCenterTrigger.addEventListener("click", (event) => {
        event.stopPropagation();
        startMenu.classList.remove("show");
        contextMenu.style.display = "none";
        notificationCenter.classList.toggle("show");
    });
}

function setupClickForwarding() {
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
    // 1. Kumpulkan semua state dan elemen
    const globalState = {
        isMusicPlayerOpen, isControlPanelOpen, isLive2dOpen, isVideoPlayerOpen, isExplorerOpen,
        lastMusicPlayerRect, lastControlPanelRect, lastLive2dRect, lastVideoPlayerRect, lastExplorerRect,
        isMusicPlayerMaximized, isControlPanelMaximized, isLive2dMaximized, isVideoPlayerMaximized, isExplorerMaximized,
        visualizerData, // Visualizer data tetap di sini karena drawVisualizer ada di sini
    };
    const taskbarState = {
        currentTaskbarPosition, currentTaskbarStyle, isTaskbarSpaceBetween
    };
    const elementReferences = {
        // App Frames & Icons
        musicPlayerFrame, controlPanelFrame, live2dWallpaperFrame, videoPlayerFrame, fileExplorerFrame,
        taskbarMusicIcon, taskbarControlPanelIcon, taskbarLive2dIcon, taskbarVideoPlayerIcon, taskbarExplorerIcon,
        thisPcIcon, controlPanelIcon, musicPlayerIcon, live2dIcon, videoPlayerIcon,
        // Taskbar/UI
        taskbar, startMenu, visualizerCanvas,
    };
    
    // DEBUG: Memastikan elemen Taskbar Icon tidak null sebelum dilewatkan
    console.log("[INIT] Debugging Taskbar Icon References:");
    console.log(`- taskbarControlPanelIcon: ${taskbarControlPanelIcon}`);
    console.log(`- taskbarMusicIcon: ${taskbarMusicIcon}`);
    console.log(`- taskbarExplorerIcon: ${taskbarExplorerIcon}`);

    // 2. Inisialisasi WindowManager
    windowManager = new WindowManager(elementReferences, globalState, taskbarState);

    // 3. Setup Interaksi (Sekarang menggunakan WindowManager)
    windowManager.setupAppInteractions();
    setupWallpaperDragDrop();
    setupMenus();
    setupClickForwarding();
    setupExplorerContextMenuActions();

    // Event listeners yang butuh windowManager atau elemen DOM yang dimuat
    clearAllBtn.addEventListener("click", () => {
        notificationList
            .querySelectorAll(".notification-item")
            .forEach((item) => item.remove());
        notificationPlaceholder.style.display = "block";
    });
    
    // Event listener untuk tombol close Pill
    closeButton.addEventListener("click", hidePill);
    
    // Event listener untuk Quick Settings
    document.querySelectorAll(".quick-setting-btn").forEach((button) => {
        button.addEventListener("click", () => {
            button.classList.toggle("active");
        });
    });

    // Tampilkan notifikasi selamat datang
    const proTipIcon = `<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>`;
    setTimeout(() => {
        showNotification(
            "Selamat Datang!",
            "Drag & drop gambar ke desktop untuk mengganti wallpaper.",
            proTipIcon,
        );
    }, 1500);

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
            volume,
        } = event.data;

        switch (action) {
            case "stop-music-frame": {
                // Logika closeApp("music") sudah ada di WindowManager.closeApp
                visualizerData = null;
                visualizerCanvas.style.display = "none";
                windowManager.closeApp("music");
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
                showNotification(
                    event.data.title,
                    event.data.artist,
                    event.data.albumArt,
                );
                break;
            }
            case "show-explorer-context-menu": {
                const explorerFrameRect =
                    fileExplorerFrame.getBoundingClientRect();
                showExplorerContextMenu(data, explorerFrameRect);
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
            // --- VIDEO PLAYER ACTIONS (DIPINDAHKAN KE WM) ---
            case "drag-vp-frame": 
                windowManager.dragFrame("video", dx, dy);
                break;
            case "close-vp-frame":
                windowManager.closeApp("video");
                break;
            case "minimize-vp-frame":
                windowManager.minimizeApp("video");
                break;
            case "bring-vp-to-front":
                windowManager.bringToFront("video");
                break;
            case "maximize-vp-frame":
                windowManager.maximizeApp("video");
                break;

            // --- MUSIC PLAYER ACTIONS (DIPINDAHKAN KE WM) ---
            case "drag-music-frame": 
                windowManager.dragFrame("music", dx, dy);
                break;
            case "close-music-frame":
                windowManager.closeApp("music");
                break;
            case "minimize-music-frame":
                windowManager.minimizeApp("music");
                break;
            case "bring-music-to-front":
                windowManager.bringToFront("music");
                break;
            case "maximize-music-frame":
                windowManager.maximizeApp("music");
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

            // --- CONTROL PANEL ACTIONS (DIPINDAHKAN KE WM) ---
            case "drag-cp-frame":
                windowManager.dragFrame("cp", dx, dy);
                break;
            case "close-cp-frame":
                windowManager.closeApp("cp");
                break;
            case "minimize-cp-frame":
                windowManager.minimizeApp("cp");
                break;
            case "bring-cp-to-front":
                windowManager.bringToFront("cp");
                break;
            case "maximize-cp-frame":
                windowManager.maximizeApp("cp");
                break;

            // --- FILE EXPLORER ACTIONS (DIPINDAHKAN KE WM) ---
            case "drag-explorer-frame":
                windowManager.dragFrame("explorer", dx, dy);
                break;
            case "close-explorer-frame":
                windowManager.closeApp("explorer");
                break;
            case "minimize-explorer-frame":
                windowManager.minimizeApp("explorer");
                break;
            case "bring-explorer-to-front":
                windowManager.bringToFront("explorer");
                break;
            case "maximize-explorer-frame":
                windowManager.maximizeApp("explorer");
                break;

            // --- LIVE2D WALLPAPER ACTIONS (DIPINDAHKAN KE WM) ---
            case "drag-live2d-frame":
                windowManager.dragFrame("live2d", dx, dy);
                break;
            case "close-live2d-frame":
                windowManager.closeApp("live2d");
                break;
            case "minimize-live2d-frame":
                windowManager.minimizeApp("live2d");
                break;
            case "bring-live2d-to-front":
                windowManager.bringToFront("live2d");
                break;
            case "maximize-live2d-frame":
                windowManager.maximizeApp("live2d");
                break;

            case "set-live-wallpaper":
                wallpaperIframe.src = value;
                wallpaperIframe.style.display = "block";
                clickInterceptor.style.display = "block";
                desktop.style.backgroundImage = "none";
                document.querySelector(".desktop-image").style.display = "none";
                break;
            case "clear-live-wallpaper":
                wallpaperIframe.src = "about:blank";
                wallpaperIframe.style.display = "none";
                clickInterceptor.style.display = "none";
                document.querySelector(".desktop-image").style.display =
                    "block";
                break;
            case "open-app-from-start-menu":
                windowManager.openAppFromStartMenu(appName); // MENGGUNAKAN WM
                // startMenu.classList.remove("show"); // DIHAPUS, sudah diurus oleh WM
                break;
            case "toggle-fancy-mode":
                document.body.classList.toggle("fancy-mode", value);
                musicPlayerFrame.contentWindow.postMessage(
                    { action: "toggle-fancy-mode", value: value },
                    "*",
                );
                controlPanelFrame.contentWindow.postMessage(
                    { action: "toggle-fancy-mode", value: value },
                    "*",
                );
                videoPlayerFrame.contentWindow.postMessage(
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
                live2dWallpaperFrame.contentWindow.postMessage(
                    { action: "toggle-fancy-mode", value: value },
                    "*",
                );
                fileExplorerFrame.contentWindow.postMessage(
                    { action: "toggle-fancy-mode", value: value },
                    "*",
                );
                break;
            case "request-settings":
                controlPanelFrame.contentWindow.postMessage(
                    { action: "request-settings" },
                    "*",
                );
                break;
            case "change-theme": {
                const isDark = value === "dark";
                document.body.classList.toggle("dark", isDark);
                musicPlayerFrame.contentWindow.postMessage(
                    { action: "theme-change", isDark },
                    "*",
                );
                controlPanelFrame.contentWindow.postMessage(
                    { action: "theme-change", isDark },
                    "*",
                );
                videoPlayerFrame.contentWindow.postMessage(
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
                desktopImage.style.objectFit =
                    value === "auto" ? "none" : value;
                desktop.style.backgroundSize = value;
                break;
            case "change-bg-repeat":
                if (value === "no-repeat") {
                    desktopImage.style.display = "block";
                    desktop.style.backgroundImage = "none";
                } else {
                    desktopImage.style.display = "none";
                    desktop.style.backgroundImage = `url('${desktopImage.src}')`;
                }
                desktop.style.backgroundRepeat = value;
                break;
            case "change-bg-position":
                desktopImage.style.objectPosition = value;
                desktop.style.backgroundPosition = value;
                break;
            case "change-taskbar-position":
                taskbar.className = taskbar.className.replace(
                    /taskbar-(bottom|top|left|right)/,
                    `taskbar-${value}`,
                );
                applyTaskbarLayout(value);
                // if (startMenu.classList.contains("show")) { } // Logic moved to startmenu.js
                break;
            case "change-taskbar-style":
                applyTaskbarStyle(value);
                // if (startMenu.classList.contains("show")) { } // Logic moved to startmenu.js
                break;
            case "toggle-taskbar-space-between":
                isTaskbarSpaceBetween = value;
                taskbar.classList.toggle("space-between", value);
                setTimeout(positionVisualizer, 50);
                break;
            case "toggle-clock":
                datetimeContainer.style.display = value ? "block" : "none";
                break;
        }
    });
}

// Tambahkan Event Listener untuk closeButton dan Start Menu ke dalam initialize
// closeButton.addEventListener("click", hidePill); // Dihapus dari global

// Hapus pemanggilan di luar listener "load"
// setInterval(updateClock, 1000); 
// updateClock();

window.addEventListener("load", () => {
    // 1. Panggil initialize() untuk menyiapkan semua elemen, state, dan windowManager
    initialize();

    // 2. Setup Clock dan Layout Awal (Sekarang dijamin elemen sudah ada)
    setInterval(updateClock, 1000);
    updateClock();

    applyTaskbarLayout(currentTaskbarPosition);
    window.addEventListener("resize", () => {
        setTimeout(positionVisualizer, 50);
    });
    window.addEventListener(
        "scroll",
        () => {
            // Logic moved to startmenu.js now
        },
        true,
    );

    setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
    }, 350);
    
    setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        // Panggil updateTaskbarIconsVisibility di sini untuk memastikan ikon aplikasi yang sudah terbuka
        if(windowManager) windowManager.updateTaskbarIconsVisibility(); 
    }, 100);
});
// Hapus pemanggilan initialize() di akhir file, karena sudah dipindah ke dalam window.addEventListener("load")
// initialize();