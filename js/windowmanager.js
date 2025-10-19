// windowmanager.js
// Logika untuk mengelola jendela (iframe) seperti buka, tutup, minimize, dan z-index.

// Dapatkan semua elemen yang dibutuhkan dari index.js (semua ini diinisialisasi di initialize())
let musicPlayerFrame, controlPanelFrame, live2dWallpaperFrame, fileExplorerFrame;
let taskbarMusicIcon, taskbarControlPanelIcon, taskbarLive2dIcon, taskbarExplorerIcon;
let isMusicPlayerOpen, isControlPanelOpen, isLive2dOpen, isExplorerOpen;
let lastMusicPlayerRect, lastControlPanelRect, lastLive2dRect, lastExplorerRect;
let currentTaskbarPosition, currentTaskbarStyle, isTaskbarSpaceBetween;
let visualizerCanvas, visualizerSettings;

// Objek untuk menampung state dan referensi elemen
const state = {};

// Fungsi inisialisasi untuk menerima semua referensi dan state dari index.js
export function initializeWindowManager(refs) {
    Object.assign(state, refs);

    // Tetapkan referensi elemen
    musicPlayerFrame = refs.musicPlayerFrame;
    controlPanelFrame = refs.controlPanelFrame;
    live2dWallpaperFrame = refs.live2dWallpaperFrame;
    fileExplorerFrame = refs.fileExplorerFrame;

    // Tetapkan ikon taskbar
    taskbarMusicIcon = refs.taskbarMusicIcon;
    taskbarControlPanelIcon = refs.taskbarControlPanelIcon;
    taskbarLive2dIcon = refs.taskbarLive2dIcon;
    taskbarExplorerIcon = refs.taskbarExplorerIcon;

    // Tetapkan state
    isMusicPlayerOpen = refs.isMusicPlayerOpen;
    isControlPanelOpen = refs.isControlPanelOpen;
    isLive2dOpen = refs.isLive2dOpen;
    isExplorerOpen = refs.isExplorerOpen;

    // Tetapkan posisi terakhir
    lastMusicPlayerRect = refs.lastMusicPlayerRect;
    lastControlPanelRect = refs.lastControlPanelRect;
    lastLive2dRect = refs.lastLive2dRect;
    lastExplorerRect = refs.lastExplorerRect;

    // Tetapkan visualizer dan layout
    visualizerCanvas = refs.visualizerCanvas;
    visualizerSettings = refs.visualizerSettings;
    currentTaskbarPosition = refs.currentTaskbarPosition;
    currentTaskbarStyle = refs.currentTaskbarStyle;
    isTaskbarSpaceBetween = refs.isTaskbarSpaceBetween;
}

// Helper untuk memperbarui status state di index.js (diperlukan karena state disimpan di index.js)
const updateState = (key, value) => {
    state[key] = value;
};

// --- GENERIC APP IFRAME MANAGEMENT ---

export function openApp(appName) {
    let appFrame, taskbarIcon, isOpen;

    if (appName === 'music') {
        appFrame = musicPlayerFrame; taskbarIcon = taskbarMusicIcon; isOpen = state.isMusicPlayerOpen;
        if (isOpen) { bringToFront(appName); return; }
        updateState('isMusicPlayerOpen', true);
    } else if (appName === 'cp') {
        appFrame = controlPanelFrame; taskbarIcon = taskbarControlPanelIcon; isOpen = state.isControlPanelOpen;
        if (isOpen) { bringToFront(appName); return; }
        updateState('isControlPanelOpen', true);
    } else if (appName === 'live2d') {
        appFrame = live2dWallpaperFrame; taskbarIcon = taskbarLive2dIcon; isOpen = state.isLive2dOpen;
        if (isOpen) { bringToFront(appName); return; }
        updateState('isLive2dOpen', true);
    } else if (appName === 'explorer') {
        appFrame = fileExplorerFrame; taskbarIcon = taskbarExplorerIcon; isOpen = state.isExplorerOpen;
        if (isOpen) { bringToFront(appName); return; }
        updateState('isExplorerOpen', true);
    } else {
        return; // Aplikasi tidak ditemukan
    }

    if (taskbarIcon) taskbarIcon.style.display = 'flex';
    appFrame.style.display = 'block';

    appFrame.style.transition = 'none';
    appFrame.style.transform = 'scale(1)';
    appFrame.style.opacity = '1';

    bringToFront(appName);

    if (appName === 'music') {
        state.visualizerCanvas.style.display = 'block';
        // Memanggil fungsi drawVisualizer dari index.js
        if (state.drawVisualizer) state.drawVisualizer();
    }
}

export function closeApp(appName) {
    let appFrame, taskbarIcon;

    if (appName === 'music') {
        updateState('isMusicPlayerOpen', false);
        appFrame = musicPlayerFrame;
        taskbarIcon = taskbarMusicIcon;
        visualizerCanvas.style.display = 'none';
        updateState('visualizerData', null);
        appFrame.contentWindow.postMessage({ action: 'stop' }, '*');
    } else if (appName === 'cp') {
        updateState('isControlPanelOpen', false);
        appFrame = controlPanelFrame;
        taskbarIcon = taskbarControlPanelIcon;
    } else if (appName === 'live2d') {
        updateState('isLive2dOpen', false);
        appFrame = live2dWallpaperFrame;
        taskbarIcon = taskbarLive2dIcon;
    } else if (appName === 'explorer') {
        updateState('isExplorerOpen', false);
        appFrame = fileExplorerFrame;
        taskbarIcon = null; // Tidak ada ikon terpisah untuk disembunyikan
    } else {
        return;
    }

    appFrame.style.display = 'none';
    if (taskbarIcon) taskbarIcon.style.display = 'none';
}

export function minimizeApp(appName) {
    let appFrame, lastRect, taskbarIcon;

    if (appName === 'music') {
        appFrame = musicPlayerFrame; taskbarIcon = taskbarMusicIcon;
        lastRect = appFrame.getBoundingClientRect(); updateState('lastMusicPlayerRect', lastRect);
    } else if (appName === 'cp') {
        appFrame = controlPanelFrame; taskbarIcon = taskbarControlPanelIcon;
        lastRect = appFrame.getBoundingClientRect(); updateState('lastControlPanelRect', lastRect);
    } else if (appName === 'live2d') {
        appFrame = live2dWallpaperFrame; taskbarIcon = taskbarLive2dIcon;
        lastRect = appFrame.getBoundingClientRect(); updateState('lastLive2dRect', lastRect);
    } else if (appName === 'explorer') {
        appFrame = fileExplorerFrame; taskbarIcon = taskbarExplorerIcon;
        lastRect = appFrame.getBoundingClientRect(); updateState('lastExplorerRect', lastRect);
    } else {
        return;
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

export function restoreApp(appName) {
    let appFrame, lastRect, taskbarIcon;

    if (appName === 'music') {
        appFrame = musicPlayerFrame; taskbarIcon = taskbarMusicIcon; lastRect = state.lastMusicPlayerRect;
    } else if (appName === 'cp') {
        appFrame = controlPanelFrame; taskbarIcon = taskbarControlPanelIcon; lastRect = state.lastControlPanelRect;
    } else if (appName === 'live2d') {
        appFrame = live2dWallpaperFrame; taskbarIcon = taskbarLive2dIcon; lastRect = state.lastLive2dRect;
    } else if (appName === 'explorer') {
        appFrame = fileExplorerFrame; taskbarIcon = taskbarExplorerIcon; lastRect = state.lastExplorerRect;
    } else {
        return;
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

export function bringToFront(appName) {
    const zIndexApp = 1002;
    const zIndexOther = 1001;
    musicPlayerFrame.style.zIndex = zIndexOther;
    controlPanelFrame.style.zIndex = zIndexOther;
    live2dWallpaperFrame.style.zIndex = zIndexOther;
    fileExplorerFrame.style.zIndex = zIndexOther;

    if (appName === 'music') {
        musicPlayerFrame.style.zIndex = zIndexApp;
    } else if (appName === 'cp') {
        controlPanelFrame.style.zIndex = zIndexApp;
    } else if (appName === 'live2d') {
        live2dWallpaperFrame.style.zIndex = zIndexApp;
    } else if (appName === 'explorer') {
        fileExplorerFrame.style.zIndex = zIndexApp;
    }
}

// --- TASKBAR & LAYOUT FUNCTIONS ---

export function positionVisualizer(taskbar) {
    const { currentTaskbarPosition, currentTaskbarStyle, isTaskbarSpaceBetween, visualizerCanvas, visualizerSettings } = state;

    if (!visualizerCanvas) return; // Pastikan canvas sudah ada

    const isIsland = currentTaskbarStyle.startsWith('island');
    const isSpecialCenterCase = (currentTaskbarStyle === 'island-single' && !isTaskbarSpaceBetween);

    visualizerCanvas.style.borderRadius = isIsland ? visualizerSettings.islandBorderRadius : '0';
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

export function applyTaskbarLayout(taskbar, taskbarMainGroup, appIconsContainer, systemTray, position) {
    updateState('currentTaskbarPosition', position);
    const isVertical = position === 'left' || position === 'right';
    taskbarMainGroup.classList.toggle('flex-col', isVertical);
    appIconsContainer.classList.toggle('flex-col', isVertical);
    systemTray.classList.toggle('flex-col', isVertical);
    positionVisualizer(taskbar);
}

export function applyTaskbarStyle(taskbar, style) {
    updateState('currentTaskbarStyle', style);
    taskbar.classList.remove('island', 'single', 'split', 'space-between');

    if (style === 'default') {
        taskbar.removeAttribute('style');
    }

    if (style === 'island-single') taskbar.classList.add('island', 'single');
    if (style === 'island-split') taskbar.classList.add('island', 'split');
    if (state.isTaskbarSpaceBetween && style.startsWith('island')) taskbar.classList.add('space-between');

    // Karena taskbar.getBoundingClientRect() butuh waktu untuk menyesuaikan
    setTimeout(() => positionVisualizer(taskbar), 50);
}

export function setTaskbarSpaceBetween(taskbar, value) {
    updateState('isTaskbarSpaceBetween', value);
    taskbar.classList.toggle('space-between', value);
    setTimeout(() => positionVisualizer(taskbar), 50);
}