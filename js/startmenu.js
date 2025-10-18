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

    // Reset styles before recalculating
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
        // Calculation for right is different
        right = (window.innerWidth - taskbarRect.left) + gap;
        transformOrigin = 'top right';
    }

    // Apply calculated positions
    if (top !== undefined) startMenu.style.top = `${top}px`;
    if (left !== undefined) startMenu.style.left = `${left}px`;
    if (bottom !== undefined) startMenu.style.bottom = `${bottom}px`;
    if (right !== undefined) startMenu.style.right = `${right}px`;

    // Prevent menu from going off-screen
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

    // Main event to show/hide the menu
    startButton.addEventListener('click', (event) => {
        event.stopPropagation();
        const isShowing = startMenu.classList.contains('show');
        
        // Hide other menus
        document.getElementById('context-menu')?.style.setProperty('display', 'none');
        document.getElementById('notification-center')?.classList.remove('show');

        // Position the menu BEFORE showing it to prevent flickering
        if (!isShowing) {
            positionStartMenu();
        }
        
        startMenu.classList.toggle('show');
    });

    // Example of an app button inside the start menu
    if (musicPlayerIcon) {
        musicPlayerIcon.addEventListener('click', () => {
            // Communicate with the main script to open the app
            window.parent.postMessage({ action: 'open-app-from-start-menu', appName: 'music' }, '*');
        });
    }

    // Listener to hide menu when clicking outside is in the main index.html script
    
    // Reposition menu on window resize if it's open
    window.addEventListener('resize', () => {
        if (startMenu.classList.contains('show')) {
            positionStartMenu();
        }
    });
    
    // Listen for theme changes from the main window
    window.addEventListener('theme-changed', (e) => {
       // The CSS handles this automatically with variables, no JS needed.
       // This is just a placeholder if you need JS logic for themes in the future.
    });
}

// Wait for the main document to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', initializeStartMenu);