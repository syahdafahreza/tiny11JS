/**
 * This script is dedicated to the functionality of the Start Menu.
 * It handles its positioning, visibility, and interactions.
 */

function positionStartMenu() {
    const startMenu = document.getElementById('start-menu');
    const startButton = document.getElementById('start-button');
    const taskbar = document.getElementById('taskbar');

    if (!startMenu || !startButton || !taskbar) return;

    const buttonRect = startButton.getBoundingClientRect();
    const taskbarRect = taskbar.getBoundingClientRect();
    const gap = 8; // 8px gap between taskbar and menu

    let top, left, bottom, right, transformOrigin;

    startMenu.style.top = '';
    startMenu.style.left = '';
    startMenu.style.bottom = '';
    startMenu.style.right = '';

    if (taskbar.classList.contains('taskbar-bottom')) {
        bottom = (window.innerHeight - taskbarRect.top) + gap;
        left = buttonRect.left;
        transformOrigin = 'bottom left';
    } else if (taskbar.classList.contains('taskbar-top')) {
        top = taskbarRect.bottom + gap;
        left = buttonRect.left;
        transformOrigin = 'top left';
    } else if (taskbar.classList.contains('taskbar-left')) {
        top = buttonRect.top;
        left = taskbarRect.right + gap;
        transformOrigin = 'top left';
    } else if (taskbar.classList.contains('taskbar-right')) {
        top = buttonRect.top;
        right = (window.innerWidth - taskbarRect.left) + gap;
        transformOrigin = 'top right';
    }

    if (top !== undefined) startMenu.style.top = `${top}px`;
    if (left !== undefined) startMenu.style.left = `${left}px`;
    if (bottom !== undefined) startMenu.style.bottom = `${bottom}px`;
    if (right !== undefined) startMenu.style.right = `${right}px`;

    const finalMenuRect = startMenu.getBoundingClientRect();
    if (finalMenuRect.right > window.innerWidth) {
        startMenu.style.left = 'auto';
        startMenu.style.right = `${gap}px`;
        transformOrigin = transformOrigin.replace('left', 'right');
    }
    if (finalMenuRect.left < 0) {
        startMenu.style.right = 'auto';
        startMenu.style.left = `${gap}px`;
        transformOrigin = transformOrigin.replace('right', 'left');
    }
    
    startMenu.style.transformOrigin = transformOrigin;
}

function initializeStartMenu() {
    const startButton = document.getElementById('start-button');
    const startMenu = document.getElementById('start-menu');
    const musicPlayerIcon = document.getElementById('start-menu-music-player');

    if (!startButton || !startMenu) {
        console.error("Start Menu essential elements not found!");
        return;
    }

    startButton.addEventListener('click', (event) => {
        event.stopPropagation();
        const isShowing = startMenu.classList.contains('show');
        
        document.getElementById('context-menu')?.style.setProperty('display', 'none');
        document.getElementById('notification-center')?.classList.remove('show');

        if (!isShowing) {
            positionStartMenu();
        }
        
        startMenu.classList.toggle('show');
    });

    if (musicPlayerIcon) {
        musicPlayerIcon.addEventListener('click', () => {
            // [FIX] Panggil fungsi openApp() secara langsung.
            // Fungsi ini tersedia secara global dari index.html.
            if (typeof openApp === 'function') {
                openApp('music');
            }
            startMenu.classList.remove('show');
        });
    }

    document.addEventListener('click', (e) => {
        const path = e.composedPath();
        if (startMenu.classList.contains('show') && !path.includes(startMenu) && !path.includes(startButton)) {
            startMenu.classList.remove('show');
        }
    });

    window.addEventListener('resize', () => {
        if (startMenu.classList.contains('show')) {
            positionStartMenu();
        }
    });

    // NOTE: Logika untuk tema dan fancy mode tidak diperlukan di sini.
    // CSS di startmenu.css sudah menanganinya secara otomatis
    // karena ia memeriksa class 'dark' dan 'fancy-mode' pada tag <body> utama.
}

document.addEventListener('DOMContentLoaded', initializeStartMenu);