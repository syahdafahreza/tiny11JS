// --- Window Manager Core Logic: windowmanager.js ---

/**
 * Kelas yang menangani semua interaksi jendela (iframe) aplikasi
 * (Buka, Tutup, Minimize, Maximize, Drag, Z-Index).
 */
class WindowManager {
    // Konstruktor menerima referensi ke semua elemen yang diperlukan
    constructor(elements, state, taskbarState) {
        this.elements = elements;
        this.state = state;
        this.taskbarState = taskbarState; // Ini sekarang adalah referensi ke objek global yang mutable
        this.appFrames = {
            music: elements.musicPlayerFrame,
            cp: elements.controlPanelFrame,
            live2d: elements.live2dWallpaperFrame,
            video: elements.videoPlayerFrame,
            explorer: elements.fileExplorerFrame,
            // --- BARU: Equalizer Frame ---
            eq: elements.equalizerFrame, 
        };
        // Simpan Taskbar Icons sebagai properti, termasuk yang MISSING
        this.taskbarIcons = {
            music: elements.taskbarMusicIcon,
            cp: elements.taskbarControlPanelIcon,
            live2d: elements.taskbarLive2dIcon,
            video: elements.taskbarVideoPlayerIcon,
            explorer: elements.taskbarExplorerIcon,
            // --- BARU: Equalizer Icon ---
            eq: elements.taskbarEqualizerIcon,
        };
        this.originalRects = {
            music: null,
            cp: null,
            live2d: null,
            video: null,
            explorer: null,
            // --- BARU: Equalizer Rect ---
            eq: null,
        };

        // Konstanta
        this.Z_INDEX_APP = 1002;
        this.Z_INDEX_OTHER = 1001;
        // Gunakan 12px untuk sudut yang menempel ke layar penuh (estetika Windows 11/Modern)
        this.MAXIMIZED_RADIUS_FULL = "12px"; 
        // Gunakan 8px untuk sudut yang berdekatan dengan taskbar island (DIHAPUS KARENA JENDELA MAXIMIZED TIDAK PUNYA SUDUT DI SISI ITU)
        this.WINDOW_GAP = 8; // Gap standar 8px di sekitar jendela
        this.ANIMATION_DURATION = 300;
        
        console.log("%c[WM] Instance created.", "color: #3b82f6; font-weight: bold;");
        
        // --- PERBAIKAN KRITIS: Panggil listener di constructor ---
        this.setupIframeMessageListener(); 
        // --------------------------------------------------------
    }

    /**
     * Memperbarui visibilitas ikon Taskbar berdasarkan status aplikasi.
     * Ikon Taskbar hanya ditampilkan jika aplikasi terkait terbuka.
     */
    updateTaskbarIconsVisibility() {
        // PENTING: Gunakan taskbarIcons yang sudah dijamin ada (atau coba ambil lagi jika perlu)
        if (this.taskbarIcons.music) this.taskbarIcons.music.style.display = this.state.isMusicPlayerOpen ? 'flex' : 'none';
        if (this.taskbarIcons.cp) this.taskbarIcons.cp.style.display = this.state.isControlPanelOpen ? 'flex' : 'none';
        if (this.taskbarIcons.live2d) this.taskbarIcons.live2d.style.display = this.state.isLive2dOpen ? 'flex' : 'none';
        if (this.taskbarIcons.video) this.taskbarIcons.video.style.display = this.state.isVideoPlayerOpen ? 'flex' : 'none';
        // --- BARU: Equalizer Icon ---
        if (this.taskbarIcons.eq) this.taskbarIcons.eq.style.display = this.state.isEqualizerOpen ? 'flex' : 'none';
        // -----------------------------
        // Explorer selalu terlihat di taskbar (asumsi)
        // if (this.taskbarIcons.explorer) this.taskbarIcons.explorer.style.display = this.state.isExplorerOpen ? 'flex' : 'none'; // Biarkan default
    }

    /**
     * Membuka aplikasi dan menampilkannya.
     * @param {string} appName - Nama aplikasi ('music', 'cp', 'live2d', 'video', 'explorer', 'eq').
     */
    openApp(appName) {
        const appFrame = this.appFrames[appName];
        if (!appFrame) {
            console.error(`[WM][Open] Frame for ${appName} is not defined! Cannot open.`);
            return;
        }
        
        // Logika tambahan untuk mencegah openApp berjalan jika aplikasi sudah terbuka dan hanya perlu dikembalikan
        if (appName === "music" && this.state.isMusicPlayerOpen && appFrame.style.display !== "none") {
            this.bringToFront(appName);
            return;
        } else if (appName === "cp" && this.state.isControlPanelOpen && appFrame.style.display !== "none") {
            this.bringToFront(appName);
            return;
        } else if (appName === "live2d" && this.state.isLive2dOpen && appFrame.style.display !== "none") {
            this.bringToFront(appName);
            return;
        } else if (appName === "video" && this.state.isVideoPlayerOpen && appFrame.style.display !== "none") {
            this.bringToFront(appName);
            return;
        } else if (appName === "explorer" && this.state.isExplorerOpen && appFrame.style.display !== "none") {
            this.bringToFront(appName);
            return;
        // --- BARU: Equalizer Check ---
        } else if (appName === "eq" && this.state.isEqualizerOpen && appFrame.style.display !== "none") {
            this.bringToFront(appName);
            return;
        }

        console.log(`%c[WM][Open] Attempting to open ${appName}. (Initial Open or Forced Restore)`, "color: green;");

        // 1. Set state global
        if (appName === "music") {
            this.state.isMusicPlayerOpen = true;
        } else if (appName === "cp") {
            this.state.isControlPanelOpen = true;
        } else if (appName === "live2d") {
            this.state.isLive2dOpen = true;
        } else if (appName === "video") {
            this.state.isVideoPlayerOpen = true;
        } else if (appName === "explorer") {
            this.state.isExplorerOpen = true;
        // --- BARU: Equalizer State ---
        } else if (appName === "eq") {
            this.state.isEqualizerOpen = true;
        }

        // 2. Tampilkan frame
        appFrame.style.display = "block";
        appFrame.style.transition = "none";
        appFrame.style.transform = "scale(1)";
        appFrame.style.opacity = "1";

        // 3. Bawa ke depan
        this.bringToFront(appName);
        
        // 4. PENTING: Jika aplikasi dimaksimalkan sebelumnya, segera restore state maximize.
        if (appFrame.dataset.isMaximized === "true") {
             // Paksa restore maximize untuk apply ukuran yang benar di WM
             this._runMaximize(appName);
        }

        // 5. Logika spesifik aplikasi
        if (appName === "music") {
            // Cek elemen sebelum mengakses propertinya
            if (this.elements.visualizerCanvas) {
                this.elements.visualizerCanvas.style.display = "block";
            }
            // PENTING: Memicu drawing visualizer (fungsi ini harus tersedia secara global atau di-bind)
            if (typeof drawVisualizer === 'function') drawVisualizer();
        }

        // 6. Perbarui ikon taskbar dan visualizer
        this.updateTaskbarIconsVisibility();
        if (typeof positionVisualizer === 'function') {
            setTimeout(positionVisualizer, 50);
        }
        console.log(`[WM][Open] Successfully displayed ${appName}.`);
    }

    /**
     * Menutup aplikasi.
     * @param {string} appName - Nama aplikasi.
     */
    closeApp(appName) {
        const appFrame = this.appFrames[appName];
        if (!appFrame) return;

        console.log(`[WM][Close] Closing ${appName}.`);

        // 1. Reset state global
        if (appName === "music") {
            this.state.isMusicPlayerOpen = false;
            // Cek elemen sebelum mengakses propertinya
            if (this.elements.visualizerCanvas) {
                 this.elements.visualizerCanvas.style.display = "none";
            }
            this.state.visualizerData = null; // Reset data visualizer
            // Kirim pesan stop ke iframe anak
            appFrame.contentWindow.postMessage({ action: "stop" }, "*");
        } else if (appName === "cp") {
            this.state.isControlPanelOpen = false;
        } else if (appName === "live2d") {
            this.state.isLive2dOpen = false;
        } else if (appName === "video") {
            this.state.isVideoPlayerOpen = false;
            // Kirim pesan stop ke iframe anak
            appFrame.contentWindow.postMessage({ action: "stop" }, "*");
        } else if (appName === "explorer") {
            this.state.isExplorerOpen = false;
        // --- BARU: Equalizer State Close ---
        } else if (appName === "eq") {
            this.state.isEqualizerOpen = false;
        }
        
        // 2. Tandai sebagai tidak maximized saat ditutup (reset)
        appFrame.dataset.isMaximized = "false";
        this.state[`is${appName.charAt(0).toUpperCase() + appName.slice(1)}Maximized`] = false;


        // 3. Sembunyikan frame
        appFrame.style.display = "none";
        
        // 4. Perbarui ikon taskbar dan visualizer
        this.updateTaskbarIconsVisibility();
        if (typeof positionVisualizer === 'function') {
            setTimeout(positionVisualizer, 50);
        }
    }

    /**
     * Meminimalkan aplikasi.
     * @param {string} appName - Nama aplikasi.
     */
    minimizeApp(appName) {
        const appFrame = this.appFrames[appName];
        // PENTING: Lakukan pengecekan ganda di sini
        let taskbarIcon = this.taskbarIcons[appName] || document.getElementById(`taskbar-${appName}-icon`);
        
        if (!appFrame || !taskbarIcon) {
            console.error(`[WM][Minimize] Cannot minimize: Frame or Icon for ${appName} not found.`);
            return;
        }

        console.log(`%c[WM][Minimize] Minimizing ${appName}.`, "color: blue;");
        
        // 1. Simpan posisi terakhir sebelum minimize
        const rect = appFrame.getBoundingClientRect();
        
        // PASTIKAN RECT DISIMPAN DENGAN BENAR
        this.state[`last${appName.charAt(0).toUpperCase() + appName.slice(1)}Rect`] = {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
        };
        console.log(`[WM][Minimize] Stored last Rect for ${appName}:`, this.state[`last${appName.charAt(0).toUpperCase() + appName.slice(1)}Rect`]);
        
        // 2. Cek apakah sudah diminimalkan atau tidak terlihat
        if (appFrame.style.display === "none" || appFrame.style.opacity === "0") return;

        const targetRect = taskbarIcon.getBoundingClientRect();
        const translateX = targetRect.left - rect.left;
        const translateY = targetRect.top - rect.top;

        // 3. Animasi minimize
        appFrame.style.transition = `transform ${this.ANIMATION_DURATION}ms ease-in, opacity ${this.ANIMATION_DURATION}ms ease-in`;
        appFrame.style.transformOrigin = "top left";
        appFrame.style.transform = `translate(${translateX}px, ${translateY}px) scale(0.1)`;
        appFrame.style.opacity = "0";

        // 4. Sembunyikan setelah animasi
        setTimeout(() => {
            appFrame.style.display = "none";
        }, this.ANIMATION_DURATION);
    }

    /**
     * Mengembalikan aplikasi dari status minimize.
     * @param {string} appName - Nama aplikasi.
     */
    restoreApp(appName) {
        const appFrame = this.appFrames[appName];
        // PENTING: Lakukan pengecekan ganda di sini
        let taskbarIcon = this.taskbarIcons[appName] || document.getElementById(`taskbar-${appName}-icon`);
        
        const lastRect = this.state[`last${appName.charAt(0).toUpperCase() + appName.slice(1)}Rect`];
        
        if (!appFrame || !taskbarIcon) {
             console.error(`[WM][Restore] Cannot restore: Missing frame or icon for ${appName}.`);
             // Karena ini restore, kita tidak perlu fallback ke openApp jika icon/frame hilang
             return;
        }
        
        // Cek apakah sebelumnya maximized
        if (appFrame.dataset.isMaximized === "true") {
            console.log(`[WM][Restore] App ${appName} was maximized. Running full maximize logic.`);
            this._runMaximize(appName);
            return;
        }

        if (!lastRect) {
            console.error(`%c[WM][Restore] CRITICAL: Missing lastRect for ${appName}. Cannot restore.`, "color: red; font-weight: bold;");
            // JANGAN fallback ke openApp karena ini dipicu oleh taskbar icon yang seharusnya hanya restore/minimize
            return; 
        }

        console.log(`%c[WM][Restore] Restoring ${appName}. Last position:`, "color: green; font-weight: bold;", lastRect);

        const targetRect = taskbarIcon.getBoundingClientRect();
        
        // 1. SET POSISI AKHIR JENDELA (lastRect)
        appFrame.style.transition = "none"; 
        appFrame.style.left = `${lastRect.left}px`;
        appFrame.style.top = `${lastRect.top}px`;
        appFrame.style.width = `${lastRect.width}px`;
        appFrame.style.height = `${lastRect.height}px`;
        
        // Hitung posisi ikon Taskbar relatif terhadap posisi terakhir jendela (lastRect)
        // Ini adalah *offset* yang harus diterapkan untuk menempatkan jendela di lokasi ikon Taskbar
        const animStartX = targetRect.left - lastRect.left;
        const animStartY = targetRect.top - lastRect.top;

        // 2. SET KONDISI AWAL ANIMASI (Minimized state)
        appFrame.style.transform = `translate(${animStartX}px, ${animStartY}px) scale(0.1)`;
        appFrame.style.opacity = "0";
        appFrame.style.display = "block"; // Munculkan sebelum animasi

        // 3. Bawa ke depan
        this.bringToFront(appName);
        
        // 4. PAKSA REFLOW: Memastikan browser merender state 2 sebelum state 5
        // Mengakses offsetHeight adalah cara terbaik untuk memaksa reflow.
        appFrame.offsetHeight; 
        
        // 5. MULAI TRANSISI/ANIMASI
        // Gunakan requestAnimationFrame untuk memastikan browser siap
        requestAnimationFrame(() => {
            appFrame.style.transition = `transform ${this.ANIMATION_DURATION}ms ease-out, opacity ${this.ANIMATION_DURATION}ms ease-out`;
            
            // Tujuan akhir: Transform ke posisi (0,0) relatif terhadap lastRect dan skala 1
            appFrame.style.transform = "translate(0, 0) scale(1)"; 
            appFrame.style.opacity = "1";
            
            // Hapus transisi setelah selesai untuk memungkinkan drag
            setTimeout(() => {
                 appFrame.style.transition = 'none';
            }, this.ANIMATION_DURATION + 50);
        });
    }

    /**
     * Memaksimalkan atau mengembalikan ukuran aplikasi.
     * @param {string} appName - Nama aplikasi.
     */
    maximizeApp(appName) {
        const appFrame = this.appFrames[appName];
        // Catatan: Equalizer (eq) tidak akan memiliki tombol maximize di UI-nya, tetapi tetap di handle di sini
        if (!appFrame || appFrame.style.display === "none") return;
        
        // Cek status maximize saat ini
        const isMaximized = appFrame.dataset.isMaximized === "true";

        if (isMaximized) {
            this.restoreMaximizedApp(appName);
        } else {
            this._runMaximize(appName);
        }
    }

    /**
     * Logika internal untuk memaksimalkan jendela.
     * @param {string} appName - Nama aplikasi.
     */
    _runMaximize(appName) {
        const appFrame = this.appFrames[appName];
        const taskbarRect = this.elements.taskbar.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Pastikan taskbarRect memiliki data yang valid.
        // Jika taskbar berada di bawah dan height = 0, ini bisa jadi problem di browser.
        if (taskbarRect.width === 0 && this.taskbarState.currentTaskbarStyle !== 'default') {
             console.warn('[WM][Maximize] Taskbar rect is zero. Delaying maximize attempt.');
             setTimeout(() => this.maximizeApp(appName), 100);
             return;
        }

        console.log(`[WM][Maximize] Maximizing ${appName}.`);

        // Simpan posisi saat ini (jika belum pernah maximized)
        const rect = appFrame.getBoundingClientRect();
        this.originalRects[appName] = {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
        };

        // Perbarui status global
        this.state[`is${appName.charAt(0).toUpperCase() + appName.slice(1)}Maximized`] = true;

        // --- Perhitungan Batas Kerja (Work Area) ---
        let top = 0;
        let left = 0;
        let width = windowWidth;
        let height = windowHeight;
        let borderRadius = "0"; 

        // PERBAIKAN: Gunakan state Taskbar
        const isTaskbarIsland = this.taskbarState.currentTaskbarStyle.startsWith("island");
        
        if (!isTaskbarIsland) {
             // Taskbar dalam mode default (full width/height)
             const taskbarHeight = taskbarRect.height;
             const taskbarWidth = taskbarRect.width;
             
             // **PERBAIKAN KRITIS UNTUK MODE DEFAULT**
             // Mode default harus dimulai dari 0 dan lebarnya penuh (windowWidth/Height)
             top = 0;
             left = 0;
             width = windowWidth;
             height = windowHeight;
             borderRadius = "0"; // Tidak ada border radius
            
            if (this.taskbarState.currentTaskbarPosition === "top") {
                top = taskbarHeight;
                height = windowHeight - taskbarHeight;
            } else if (this.taskbarState.currentTaskbarPosition === "bottom") {
                // Posisi Y tetap 0, tinggi dikurangi tinggi taskbar
                height = windowHeight - taskbarHeight; 
                // Buffer 1px untuk mencegah clipping (penting di mode default/bottom)
                height -= 1;
            } else if (this.taskbarState.currentTaskbarPosition === "left") {
                left = taskbarWidth;
                width = windowWidth - taskbarWidth;
            } else if (this.taskbarState.currentTaskbarPosition === "right") {
                // Posisi X tetap 0, lebar dikurangi lebar taskbar
                width = windowWidth - taskbarWidth;
            }
             
            // Boundary checks
            if (top < 0) top = 0;
            if (left < 0) left = 0;
            if (width > windowWidth) width = windowWidth;
            if (height > windowHeight) height = windowHeight;
            
            console.log(`[WM][Maximize][Default-FIXED] Final Position: Left=${left}px, Top=${top}px, Width=${width}px, Height=${height}px, Radius=${borderRadius}`);
            
        } else {
            // Logika untuk mode Island (menggunakan WINDOW_GAP sebagai buffer/gap)
            
            // 1. Definisikan batas layar kerja penuh (semua sisi dengan gap)
            const screenTop = this.WINDOW_GAP;
            const screenLeft = this.WINDOW_GAP;
            const screenBottomLimit = windowHeight - this.WINDOW_GAP;
            const screenRightLimit = windowWidth - this.WINDOW_GAP;
            
            // 2. Inisialisasi batas kerja awal (yaitu full screen dengan 8px margin di semua sisi)
            top = screenTop;
            left = screenLeft;
            width = screenRightLimit - screenLeft;
            height = screenBottomLimit - screenTop;
            
            // 3. Set border radius default (semua 12px)
            borderRadius = `${this.MAXIMIZED_RADIUS_FULL} ${this.MAXIMIZED_RADIUS_FULL} ${this.MAXIMIZED_RADIUS_FULL} ${this.MAXIMIZED_RADIUS_FULL}`;
            
            // 4. Sesuaikan batas yang berdekatan dengan Taskbar Island
            
            const taskbarGap = this.WINDOW_GAP; // Gap antara taskbar dan jendela
            
            if (this.taskbarState.currentTaskbarPosition === "top") {
                // Batas atas jendela dimulai di Bawah Taskbar Island + gap
                top = taskbarRect.bottom + taskbarGap;
                height = screenBottomLimit - top;
                
                // Sudut yang menempel taskbar (atas kiri, atas kanan) hilang (0)
                borderRadius = `0 0 ${this.MAXIMIZED_RADIUS_FULL} ${this.MAXIMIZED_RADIUS_FULL}`; 
            
            } else if (this.taskbarState.currentTaskbarPosition === "bottom") {
                // Batas bawah jendela berakhir di Atas Taskbar Island - gap
                
                // top sudah diatur ke screenTop (8px)
                
                // Batas Y bawah mutlak (Posisi Y Taskbar - Jarak Gap)
                const bottomLimitY = taskbarRect.top - taskbarGap;

                // Tinggi Jendela = Batas Y Bawah - Posisi Y Atas
                height = bottomLimitY - top; 
                
                // Sudut yang menempel taskbar (bawah kiri, bawah kanan) hilang (0)
                borderRadius = `${this.MAXIMIZED_RADIUS_FULL} ${this.MAXIMIZED_RADIUS_FULL} 0 0`; 
                
            } else if (this.taskbarState.currentTaskbarPosition === "left") {
                // Batas kiri jendela dimulai di Kanan Taskbar Island + gap
                left = taskbarRect.right + taskbarGap;
                width = screenRightLimit - left;
                
                // Sudut yang menempel taskbar (atas kiri, bawah kiri) hilang (0)
                borderRadius = `${this.MAXIMIZED_RADIUS_FULL} ${this.MAXIMIZED_RADIUS_FULL} ${this.MAXIMIZED_RADIUS_FULL} 0`; 
                
            } else if (this.taskbarState.currentTaskbarPosition === "right") {
                // Batas kanan jendela berakhir di Kiri Taskbar Island - gap
                const rightLimitX = taskbarRect.left - taskbarGap;
                width = rightLimitX - left; 
                
                // Sudut yang menempel taskbar (atas kanan, bawah kanan) hilang (0)
                borderRadius = `${this.MAXIMIZED_RADIUS_FULL} 0 0 ${this.MAXIMIZED_RADIUS_FULL}`; 
            }
            
            // Boundary checks: Pastikan minimal 0 dan maksimal window size
            if (top < 0) top = 0;
            if (left < 0) left = 0;
            // Gunakan Math.max untuk memastikan dimensi minimal
            if (width < 50) width = 50; 
            if (height < 50) height = 50;

            console.log(`%c[WM][Maximize][Island-FINAL] Final Position: Left=${left}px, Top=${top}px, Width=${width}px, Height=${height}px, Radius=${borderRadius}`, "background: #007bff; color: white;");
        }
        
        // Terapkan transisi halus
        appFrame.style.transition = `all ${this.ANIMATION_DURATION / 1000}s ease-in-out`;
        appFrame.style.left = `${left}px`;
        appFrame.style.top = `${top}px`;
        appFrame.style.width = `${width}px`;
        appFrame.style.height = `${height}px`;
        appFrame.style.borderRadius = borderRadius;
        appFrame.style.transform = "none";

        // Tandai sebagai maximized
        appFrame.dataset.isMaximized = "true";
        // Kirim pesan kembali ke iframe anak
        appFrame.contentWindow.postMessage(
            { action: "set-maximized-state", isMaximized: true, borderRadius: borderRadius },
            "*"
        );
        
        // Hapus transisi setelah animasi selesai untuk memungkinkan drag
        setTimeout(() => {
             appFrame.style.transition = 'none';
        }, this.ANIMATION_DURATION + 50);
    }
    
    /**
     * Mengembalikan jendela aplikasi ke ukuran semula.
     * @param {string} appName - Nama aplikasi.
     */
    restoreMaximizedApp(appName) {
        const appFrame = this.appFrames[appName];
        const originalRect = this.originalRects[appName];

        console.log(`[WM][Maximize] Restoring ${appName}.`);

        if (!originalRect) {
            console.warn(`[${appName}] Original size data not found. Using default restore position.`);
            
            // Default position fallback
            let defaultWidth, defaultHeight;
            if (appName === "music" || appName === "eq") { // --- BARU: Equalizer default size ---
                defaultWidth = "420px";
                defaultHeight = "500px";
            } else if (appName === "cp") {
                defaultWidth = "550px";
                defaultHeight = "550px";
            } else if (appName === "video") {
                defaultWidth = "640px";
                defaultHeight = "500px"; 
            } else {
                defaultWidth = "800px";
                defaultHeight = "500px";
            }
            
            appFrame.style.transition = `all ${this.ANIMATION_DURATION / 1000}s ease-in-out`;
            appFrame.style.left = "15%";
            appFrame.style.top = "15%";
            appFrame.style.width = defaultWidth;
            appFrame.style.height = defaultHeight;

        } else {
            // Restore dari data yang tersimpan
            appFrame.style.transition = `all ${this.ANIMATION_DURATION / 1000}s ease-in-out`;
            appFrame.style.left = `${originalRect.left}px`;
            appFrame.style.top = `${originalRect.top}px`;
            appFrame.style.width = `${originalRect.width}px`;
            appFrame.style.height = `${originalRect.height}px`;
        }

        // Reset border radius
        appFrame.style.borderRadius = "12px";

        // Tandai sebagai tidak maximized
        appFrame.dataset.isMaximized = "false";
        // Kirim pesan kembali ke iframe anak
        appFrame.contentWindow.postMessage(
            { action: "set-maximized-state", isMaximized: false, borderRadius: "12px" },
            "*"
        );

        // Perbarui status global
        this.state[`is${appName.charAt(0).toUpperCase() + appName.slice(1)}Maximized`] = false;

        // Hapus transisi setelah animasi selesai untuk memungkinkan drag
        setTimeout(() => {
             appFrame.style.transition = 'none';
        }, this.ANIMATION_DURATION + 50);
    }

    /**
     * Membawa jendela aplikasi ke lapisan depan (Z-Index tertinggi).
     * @param {string} appName - Nama aplikasi.
     */
    bringToFront(appName) {
        console.log(`[WM][Z-Index] Bringing ${appName} to front.`);
        // Reset z-index semua frame
        Object.values(this.appFrames).forEach(frame => {
            if (frame) { // Tambahkan cek null
                frame.style.zIndex = this.Z_INDEX_OTHER;
            }
        });

        // Set z-index aplikasi yang dipilih
        const appFrame = this.appFrames[appName];
        if (appFrame) {
            appFrame.style.zIndex = this.Z_INDEX_APP;
        }
    }
    
    /**
     * Memindahkan jendela aplikasi (digunakan oleh drag dari dalam iframe).
     * @param {string} appName - Nama aplikasi.
     * @param {number} dx - Perubahan posisi x.
     * @param {number} dy - Perubahan posisi y.
     */
    dragFrame(appName, dx, dy) {
        const appFrame = this.appFrames[appName];
        
        // PENTING: Hanya drag jika tidak maximized
        if (!appFrame || appFrame.dataset.isMaximized === "true") {
             // Jika sedang maximized, dan ada drag, ini berarti user mencoba
             // me-restore dengan drag. Kita abaikan saja.
             return;
        }

        const rect = appFrame.getBoundingClientRect();
        appFrame.style.left = `${rect.left + dx}px`;
        appFrame.style.top = `${rect.top + dy}px`;
    }

    /**
     * Menyiapkan listener untuk menerima pesan dari iframe anak.
     */
    setupIframeMessageListener() {
        window.addEventListener("message", (event) => {
            // Pastikan event.data ada dan memiliki action
            if (!event.data || !event.data.action) return;
            
            const { action, appName, dx, dy } = event.data;

            // Pastikan appName terdefinisi dan merupakan aplikasi yang didukung
            if (appName && this.appFrames.hasOwnProperty(appName)) {
                
                // Jika aplikasi sedang maximized, drag hanya akan memicu restore jika drag dari area header
                const isMaximized = this.appFrames[appName].dataset.isMaximized === "true";
                
                switch (action) {
                    case "bring-to-front": // Digunakan saat mousedown header
                        this.bringToFront(appName);
                        break;
                    case "drag-frame": // Digunakan saat mousemove
                        // Jika maximized, drag tidak diizinkan di sini
                        if (!isMaximized) {
                            this.dragFrame(appName, dx, dy);
                        }
                        break;
                    case "minimize-app":
                        this.minimizeApp(appName);
                        break;
                    case "maximize-app":
                        this.maximizeApp(appName);
                        break;
                    case "close-app":
                        this.closeApp(appName);
                        break;
                    // Note: 'request-settings', 'request-volume', 'show-media-notification',
                    // dan 'toggle-volume-flyout' tidak perlu ditangani di sini
                    // karena mereka adalah pesan yang dikirimkan ke logika utama (Main.js/Desktop.js).
                    default:
                        // console.log(`[WM] Pesan dengan appName tetapi action tidak terdaftar: ${action}`);
                        break;
                }
            } else if (appName) {
                // Pesan dari aplikasi yang tidak dikenali, abaikan
                // console.warn(`[WM] Pesan diabaikan: appName tidak valid atau tidak dikenali: ${appName}`);
            }
        });
    }

    /**
     * Mempersiapkan event listener untuk interaksi ikon desktop dan taskbar.
     * @param {function} startMenuCallback - Callback untuk menutup Start Menu.
     */
    setupAppInteractions(startMenuCallback) {
        const { thisPcIcon, controlPanelIcon, musicPlayerIcon, live2dIcon, videoPlayerIcon, equalizerIcon } = this.elements;
        // PENTING: Lakukan pengecekan ganda dan perbarui referensi jika MISSING
        let { taskbarExplorerIcon, taskbarControlPanelIcon, taskbarMusicIcon, taskbarLive2dIcon, taskbarVideoPlayerIcon, taskbarEqualizerIcon } = this.taskbarIcons; // --- BARU: equalizerIcon ---

        // Jika ikon Taskbar hilang saat inisialisasi, coba ambil lagi:
        if (!taskbarExplorerIcon) taskbarExplorerIcon = document.getElementById('taskbar-explorer-icon');
        if (!taskbarControlPanelIcon) taskbarControlPanelIcon = document.getElementById('taskbar-cp-icon');
        if (!taskbarMusicIcon) taskbarMusicIcon = document.getElementById('taskbar-music-icon');
        if (!taskbarLive2dIcon) taskbarLive2dIcon = document.getElementById('taskbar-live2d-icon');
        if (!taskbarVideoPlayerIcon) taskbarVideoPlayerIcon = document.getElementById('taskbar-video-player-icon');
        // --- BARU: Equalizer Icon ---
        if (!taskbarEqualizerIcon) taskbarEqualizerIcon = document.getElementById('taskbar-eq-icon');
        
        // Perbarui properti instance WM jika ditemukan
        this.taskbarIcons.explorer = taskbarExplorerIcon;
        this.taskbarIcons.cp = taskbarControlPanelIcon;
        this.taskbarIcons.music = taskbarMusicIcon;
        this.taskbarIcons.live2d = taskbarLive2dIcon;
        this.taskbarIcons.video = taskbarVideoPlayerIcon;
        // --- BARU: Equalizer Icon ---
        this.taskbarIcons.eq = taskbarEqualizerIcon;

        // Diagnostic Log: Cek setiap elemen desktop sebelum menambahkan listener
        console.log("%c[WM][Setup] Checking Desktop Icons:", "color: orange; font-weight: bold;");
        console.log(`- This PC: ${thisPcIcon ? 'OK' : 'MISSING'}`);
        console.log(`- CP: ${controlPanelIcon ? 'OK' : 'MISSING'}`);
        console.log(`- Music: ${musicPlayerIcon ? 'OK' : 'MISSING'}`);
        console.log(`- Live2D: ${live2dIcon ? 'OK' : 'MISSING'}`);
        console.log(`- Video: ${videoPlayerIcon ? 'OK' : 'MISSING'}`);
        console.log(`- Equalizer: ${equalizerIcon ? 'OK' : 'MISSING'}`); // Asumsi ini tidak ada di desktop
        
        // Safety check before adding event listeners
        if (thisPcIcon) thisPcIcon.addEventListener("dblclick", () => this.openApp("explorer"));
        else console.error("[WM][Setup] ERROR: thisPcIcon is MISSING.");
        
        if (controlPanelIcon) controlPanelIcon.addEventListener("dblclick", () => this.openApp("cp"));
        else console.error("[WM][Setup] ERROR: controlPanelIcon is MISSING.");

        if (musicPlayerIcon) musicPlayerIcon.addEventListener("dblclick", () => this.openApp("music"));
        else console.error("[WM][Setup] ERROR: musicPlayerIcon is MISSING.");

        if (live2dIcon) live2dIcon.addEventListener("dblclick", () => this.openApp("live2d"));
        else console.error("[WM][Setup] ERROR: live2dIcon is MISSING.");

        if (videoPlayerIcon) videoPlayerIcon.addEventListener("dblclick", () => this.openApp("video")); 
        else console.error("[WM][Setup] ERROR: videoPlayerIcon is MISSING.");

        // --- BARU: Equalizer - Biasanya dibuka dari Music Player, tapi tambahkan jika ada ikon desktop ---
        if (equalizerIcon) equalizerIcon.addEventListener("dblclick", () => this.openApp("eq"));
        // --------------------------------------------------------------------------------------------------

        console.log("%c[WM][Setup] Checking Taskbar Icons (Post-Fix):", "color: orange; font-weight: bold;");
        console.log(`- Taskbar Explorer: ${taskbarExplorerIcon ? 'OK' : 'STILL MISSING'}`);
        console.log(`- Taskbar CP: ${taskbarControlPanelIcon ? 'OK' : 'STILL MISSING'}`);
        console.log(`- Taskbar Music: ${taskbarMusicIcon ? 'OK' : 'STILL MISSING'}`);
        console.log(`- Taskbar Live2D: ${taskbarLive2dIcon ? 'OK' : 'STILL MISSING'}`);
        console.log(`- Taskbar Video: ${taskbarVideoPlayerIcon ? 'OK' : 'STILL MISSING'}`);
        console.log(`- Taskbar EQ: ${taskbarEqualizerIcon ? 'OK' : 'STILL MISSING'}`); // --- BARU: Equalizer Icon ---

        // Ikon Taskbar (Click: Restore/Minimize)
        if (taskbarExplorerIcon) {
            taskbarExplorerIcon.addEventListener("click", () => {
                // Untuk explorer, kita menggunakan isExplorerOpen karena ia selalu ada di taskbar
                if (!this.state.isExplorerOpen) {
                    this.openApp("explorer");
                } else {
                    this._toggleMinimizeRestore("explorer");
                }
            });
        }
        
        // ICON LAIN (CP, MUSIC, VIDEO, LIVE2D) - hanya menggunakan toggle karena mereka muncul/hilang
        if (taskbarControlPanelIcon) taskbarControlPanelIcon.addEventListener("click", () => this._toggleMinimizeRestore("cp"));
        if (taskbarMusicIcon) taskbarMusicIcon.addEventListener("click", () => this._toggleMinimizeRestore("music"));
        if (taskbarLive2dIcon) taskbarLive2dIcon.addEventListener("click", () => this._toggleMinimizeRestore("live2d"));
        if (taskbarVideoPlayerIcon) taskbarVideoPlayerIcon.addEventListener("click", () => this._toggleMinimizeRestore("video"));
        // --- BARU: Equalizer Taskbar Icon ---
        if (taskbarEqualizerIcon) taskbarEqualizerIcon.addEventListener("click", () => this._toggleMinimizeRestore("eq"));
        
        console.log("[WM][Setup] App interactions setup completed.");
    }
    
    /**
     * Fungsi helper untuk minimize/restore dari taskbar.
     * @param {string} appName - Nama aplikasi.
     */
    _toggleMinimizeRestore(appName) {
         const appFrame = this.appFrames[appName];
         if (!appFrame) return;

         // Check berdasarkan style opacity dan display.
         // Jendela diminimalkan ketika appFrame.style.display === "none"
         // Pastikan state global sudah benar (isControlPanelOpen = true)
         const isAppOpenInState = this.state[`is${appName.charAt(0).toUpperCase() + appName.slice(1)}Open`];

         const isVisible = appFrame.style.opacity === "1" && appFrame.style.display !== "none";
         
         console.log(`[WM][Toggle] App: ${appName}, isVisible: ${isVisible}, isStateOpen: ${isAppOpenInState}, currentDisplay: ${appFrame.style.display}, currentOpacity: ${appFrame.style.opacity}`);
         
         if (isVisible) {
             this.minimizeApp(appName);
         } else if (isAppOpenInState) {
             // Jika tidak terlihat, tapi state-nya terbuka (minimised), lakukan restore
             this.restoreApp(appName);
         } else {
             // Jika tidak terlihat DAN state-nya tertutup (atau bug), coba buka ulang.
             // Ini adalah fallback yang seharusnya jarang terjadi pada klik taskbar.
             console.warn(`[WM][Toggle] App ${appName} not visible but state is closed. Forcing open.`);
             this.openApp(appName);
         }
    }

    /**
     * Membuka aplikasi dari Start Menu (termasuk callback untuk menutup Start Menu).
     * @param {string} appName - Nama aplikasi.
     */
    openAppFromStartMenu(appName) {
        this.openApp(appName);
        // Asumsi Start Menu adalah elemen global yang perlu ditutup
        if (this.elements.startMenu) {
            this.elements.startMenu.classList.remove("show");
        }
    }
}

window.WindowManager = WindowManager;