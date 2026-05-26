// --- KONFIGURASI SISTEM EKONOMI GAME ---
const NAME_CHANGE_COST = 50; // Biaya paska-gratis: 50 Diamonds

// Inisialisasi Seluruh Data & Event Listener Saat Halaman Selesai Dimuat
document.addEventListener('DOMContentLoaded', () => {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const gameCards = document.querySelectorAll('.game-card');

    // 1. ================= LOGIKA FILTER KATEGORI GAME (FIXED) =================
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const filterValue = button.getAttribute('data-filter');

            // Logika Penyaringan Kartu Game yang Halus & Akurat
            gameCards.forEach(card => {
                // Mengubah string kategori (misal: "all math") menjadi array ["all", "math"]
                const cardCategories = card.getAttribute('data-category') ? card.getAttribute('data-category').split(' ') : [];
                
                // Cek apakah tombol filter yang diklik ada di dalam list kategori kartu tersebut
                if (filterValue === 'all' || cardCategories.includes(filterValue)) {
                    // Tampilkan elemen dulu, baru jalankan animasi masuk
                    card.style.display = 'flex';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'scale(1)';
                    }, 10);
                } else {
                    // Jalankan animasi memudar dulu
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.95)';
                    // Tunggu animasi selesai (300ms), baru ubah display menjadi none
                    setTimeout(() => {
                        if (card.style.opacity === '0') {
                            card.style.display = 'none';
                        }
                    }, 300);
                }
            });
        });
    });

    // 2. ================= INISIALISASI DATA EKONOMI PEMAIN (DENGAN PROTEKSI BROWSER) =================
    let savedName = 'Player1';

    try {
        // Ambil data nama dari localStorage, jika kosong set default
        savedName = localStorage.getItem('player_name') || 'Player1';

        // Ambil status apakah sudah pernah ganti nama
        if (!localStorage.getItem('has_changed_name')) {
            localStorage.setItem('has_changed_name', 'false');
        }

        // Ambil atau set saldo Diamond awal pemain
        if (!localStorage.getItem('player_diamonds')) {
            localStorage.setItem('player_diamonds', '150');
        }
    } catch (error) {
        console.warn("Protokol keamanan browser memblokir penyimpanan lokal. Mengaktifkan memori cadangan.");
        window.temporaryStorage = window.temporaryStorage || {
            player_name: 'Player1',
            has_changed_name: 'false',
            player_diamonds: '150'
        };
        savedName = window.temporaryStorage.player_name;
    }

    // Terapkan data nama ke tampilan layar utama dashboard dan modal
    updatePlayerNameUI(savedName);
    
    // Sinkronisasikan data Diamond ke semua widget (luar & dalam modal) saat startup/refresh
    updateDiamondUI();
});

function updatePlayerNameUI(name) {
    // Mengubah semua elemen yang menggunakan class .username (di welcome text dan di table leaderboard)
    const allUsernameElements = document.querySelectorAll('.username');
    allUsernameElements.forEach(element => {
        if (element.tagName === 'SPAN' && element.closest('.welcome-text')) {
            element.textContent = name + '!'; 
        } else {
            element.textContent = name;
        }
    });

    const modalName = document.getElementById('modalPlayerName');
    if (modalName) modalName.textContent = name;
}

// Fungsi Pembantu Update Tampilan Diamond di Dashboard & Modal Profil sekaligus
function updateDiamondUI() {
    let diamondCount = '150';
    try {
        diamondCount = localStorage.getItem('player_diamonds') || '150';
    } catch (e) {
        diamondCount = window.temporaryStorage ? window.temporaryStorage.player_diamonds : '150';
    }
    
    const modalDiamondText = document.getElementById('modalDiamondCount');
    if (modalDiamondText) modalDiamondText.textContent = diamondCount;

    const dashboardDiamondText = document.getElementById('dashboardDiamondCount');
    if (dashboardDiamondText) dashboardDiamondText.textContent = diamondCount;
}

// 4. ================= LOGIKA KONTROL POP-UP MODAL PROFIL =================
function openProfileModal() {
    document.getElementById('profileModal').classList.add('active');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
    hideEditNameInput(); 
}

window.addEventListener('click', (event) => {
    const modal = document.getElementById('profileModal');
    if (event.target === modal) {
        modal.classList.remove('active');
        hideEditNameInput();
    }
});

// 5. ================= LOGIKA INTERAKSI FORM EDIT NAMA =================
function showEditNameInput() {
    document.querySelector('.name-edit-container').style.display = 'none';
    const form = document.getElementById('editNameForm');
    const costText = document.getElementById('changeNameCostText');
    const currentName = document.getElementById('modalPlayerName').textContent;
    
    document.getElementById('newNameInput').value = currentName;
    form.style.display = 'block';

    let hasChanged = 'false';
    try {
        hasChanged = localStorage.getItem('has_changed_name') || 'false';
    } catch(e) {
        hasChanged = window.temporaryStorage ? window.temporaryStorage.has_changed_name : 'false';
    }

    if (hasChanged === 'true') {
        costText.innerHTML = `Biaya ganti nama: <span style="color:#22d3ee; font-weight:700;"><i class="fa-solid fa-gem"></i> ${NAME_CHANGE_COST} Diamonds</span>`;
        costText.style.color = '#94a3b8';
    } else {
        costText.textContent = "✨ Ganti nama pertama kali: GRATIS!";
        costText.style.color = '#34d399';
    }
}

function hideEditNameInput() {
    document.getElementById('editNameForm').style.display = 'none';
    document.querySelector('.name-edit-container').style.display = 'flex';
}

function processChangeName() {
    const inputField = document.getElementById('newNameInput');
    const newName = inputField.value.trim();
    
    if (newName === "") {
        alert("Nama tidak boleh kosong!");
        return;
    }
    if (newName.length < 3) {
        alert("Nama terlalu pendek! Minimal 3 karakter.");
        return;
    }

    let hasChanged = 'false';
    let currentDiamonds = 150;
    let isStorageWorking = true;

    try {
        hasChanged = localStorage.getItem('has_changed_name') || 'false';
        currentDiamonds = parseInt(localStorage.getItem('player_diamonds')) || 150;
    } catch(e) {
        isStorageWorking = false;
        hasChanged = window.temporaryStorage.has_changed_name;
        currentDiamonds = parseInt(window.temporaryStorage.player_diamonds);
    }

    if (hasChanged === 'true') {
        if (currentDiamonds < NAME_CHANGE_COST) {
            alert(`Diamond tidak cukup! Kamu butuh ${NAME_CHANGE_COST} Diamonds. Saldo saat ini: ${currentDiamonds}`);
            return;
        }
        
        const konfirmasi = confirm(`Apakah kamu yakin ingin mengubah nama menjadi "${newName}" dengan biaya ${NAME_CHANGE_COST} Diamonds?`);
        if (!konfirmasi) return;

        currentDiamonds -= NAME_CHANGE_COST;
        
        if (isStorageWorking) {
            localStorage.setItem('player_diamonds', currentDiamonds.toString());
        } else {
            window.temporaryStorage.player_diamonds = currentDiamonds.toString();
        }
    } else {
        if (isStorageWorking) {
            localStorage.setItem('has_changed_name', 'true');
        } else {
            window.temporaryStorage.has_changed_name = 'true';
        }
    }

    if (isStorageWorking) {
        localStorage.setItem('player_name', newName);
    } else {
        window.temporaryStorage.player_name = newName;
    }

    updatePlayerNameUI(newName);
    updateDiamondUI();
    hideEditNameInput();
    
    alert("Nama sukses diperbarui!");
}

// ========================================================
// 🪙 LOGIKA KONTROL POP-UP TOP-UP DIAMOND
// ========================================================
function openTopUpModal() {
    document.getElementById('topUpModal').classList.add('active');
}

function closeTopUpModal() {
    document.getElementById('topUpModal').classList.remove('active');
}

window.addEventListener('click', (event) => {
    const topUpModal = document.getElementById('topUpModal');
    if (event.target === topUpModal) {
        topUpModal.classList.remove('active');
    }
});

function processTopUp(amount, price) {
    const konfirmasi = confirm(`Konfirmasi simulasi pembayaran untuk Paket ${amount} Diamonds seharga ${price}?`);
    if (!konfirmasi) return;

    let currentDiamonds = 150;
    let isStorageWorking = true;

    try {
        currentDiamonds = parseInt(localStorage.getItem('player_diamonds')) || 150;
    } catch(e) {
        isStorageWorking = false;
        currentDiamonds = parseInt(window.temporaryStorage.player_diamonds) || 150;
    }

    currentDiamonds += amount;

    if (isStorageWorking) {
        localStorage.setItem('player_diamonds', currentDiamonds.toString());
    } else {
        window.temporaryStorage.player_diamonds = currentDiamonds.toString();
    }

    updateDiamondUI();
    closeTopUpModal();

    alert(`🎉 Pembayaran berhasil! +${amount} Diamonds telah ditambahkan ke akunmu.`);
}

// --- SISTEM LOGOUT PENGGUNA ---
function handleLogout(event) {
    // Mencegah link me-refresh halaman secara default
    event.preventDefault(); 

    // 1. Mainkan efek suara klik yang sudah kita buat sebelumnya
    if (typeof playClickSFX === "function") {
        playClickSFX();
    }

    // 2. Berikan konfirmasi pop-up manis agar user tidak tidak sengaja keluar
    const yakinLogout = confirm("Apakah kamu yakin ingin keluar dari PramSkuyy?");
    
    if (yakinLogout) {
        // (Opsional) Jika Anda ingin menghapus nama atau data sesi sementara saat logout, buka baris ini:
        // localStorage.removeItem('player_name');

        // 3. Alihkan halaman ke file Login Anda. 
        // Ganti 'index.html' sesuai nama file halaman login/masuk Anda (misal: 'login.html')
        window.location.href = "index.html"; 
    }
}

// Tambahkan 'achievement' ke dalam switchTab yang sudah ada
function switchTab(tabName) {
    playClickSFX();
    const allTabs = document.querySelectorAll('.content-tab');
    allTabs.forEach(tab => {
        tab.classList.remove('active-tab');
    });

    const allNavLinks = document.querySelectorAll('.nav-links li');
    allNavLinks.forEach(link => {
        link.classList.remove('active');
    });

    if (tabName === 'dashboard') {
        document.getElementById('dashboard-tab').classList.add('active-tab');
        document.getElementById('nav-dashboard').classList.add('active');
    } else if (tabName === 'leaderboard') {
        document.getElementById('leaderboard-tab').classList.add('active-tab');
        document.getElementById('nav-leaderboard').classList.add('active');
        syncLeaderboardUserAvatar();
    } else if (tabName === 'achievement') {
        document.getElementById('achievement-tab').classList.add('active-tab');
        document.getElementById('nav-achievement').classList.add('active');
    } else if (tabName === 'shop') {        
        document.getElementById('shop-tab').classList.add('active-tab');
        document.getElementById('nav-shop').classList.add('active');
    } else if (tabName === 'setting') {       
        document.getElementById('setting-tab').classList.add('active-tab');
        document.getElementById('nav-setting').classList.add('active');
    }
}

function syncLeaderboardUserAvatar() {
    let currentName = "Player1";
    try {
        currentName = localStorage.getItem('player_name') || 'Player1';
    } catch(e) {
        currentName = window.temporaryStorage ? window.temporaryStorage.player_name : 'Player1';
    }
    
    const tableUserImg = document.querySelector('.current-user-avatar');
    if (tableUserImg) {
        tableUserImg.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${currentName}`;
    }
}

// --- DATABASE SIMULASI DATA LEADERBOARD ---
const dummyLeaderboardData = {
    global: {
        'exp': [
            { name: "PramSkuyy", score: "3,120 XP", cate: "Total EXP", region: "Indonesia", isSelf: true, seed: "Pram" },
            { name: "ShadowStorm", score: "2,450 XP", cate: "Total EXP", region: "Singapore", isSelf: false, seed: "Shadow" },
            { name: "AlphaElite", score: "1,980 XP", cate: "Total EXP", region: "Malaysia", isSelf: false, seed: "Alpha" },
            { name: "SlayerZ", score: "1,750 XP", cate: "Total EXP", region: "Japan", isSelf: false, seed: "Slayer" }
        ],
        'fruit-ninja': [
            { name: "NinjaMaster", score: "890 Pts", cate: "Fruit Ninja", region: "Japan", isSelf: false, seed: "Ninja" },
            { name: "PramSkuyy", score: "750 Pts", cate: "Fruit Ninja", region: "Indonesia", isSelf: true, seed: "Pram" },
            { name: "SlicingGod", score: "620 Pts", cate: "Fruit Ninja", region: "USA", isSelf: false, seed: "Slice" }
        ],
        'math-wizard': [
            { name: "Einstein2", score: "1,200 Pts", cate: "MathWizard", region: "Germany", isSelf: false, seed: "Eins" },
            { name: "Mathema", score: "1,050 Pts", cate: "MathWizard", region: "India", isSelf: false, seed: "Math" },
            { name: "PramSkuyy", score: "980 Pts", cate: "MathWizard", region: "Indonesia", isSelf: true, seed: "Pram" }
        ],
        'snapshoot-puzzle': [
            { name: "PramSkuyy", score: "42 Detik", cate: "Snapshoot Puzzle", region: "Indonesia", isSelf: true, seed: "Pram" },
            { name: "PixelPerfect", score: "48 Detik", cate: "Snapshoot Puzzle", region: "Canada", isSelf: false, seed: "Pixel" },
            { name: "DetectiveX", score: "55 Detik", cate: "Snapshoot Puzzle", region: "UK", isSelf: false, seed: "Det" }
        ]
    },
    regional: {
        'exp': [
            { name: "PramSkuyy", score: "3,120 XP", cate: "Total EXP", region: "DKI Jakarta", isSelf: true, seed: "Pram" },
            { name: "BudiGaming", score: "1,820 XP", cate: "Total EXP", region: "Jawa Barat", isSelf: false, seed: "Budi" },
            { name: "SitiChann", score: "1,450 XP", cate: "Total EXP", region: "Jawa Timur", isSelf: false, seed: "Siti" }
        ],
        'fruit-ninja': [
            { name: "PramSkuyy", score: "750 Pts", cate: "Fruit Ninja", region: "DKI Jakarta", isSelf: true, seed: "Pram" },
            { name: "AgusSlasher", score: "510 Pts", cate: "Fruit Ninja", region: "Bali", isSelf: false, seed: "Agus" },
            { name: "WawanCut", score: "490 Pts", cate: "Fruit Ninja", region: "Medan", isSelf: false, seed: "Wawan" }
        ],
        'math-wizard': [
            { name: "PramSkuyy", score: "980 Pts", cate: "MathWizard", region: "DKI Jakarta", isSelf: true, seed: "Pram" },
            { name: "DewiHitung", score: "920 Pts", cate: "MathWizard", region: "Yogyakarta", isSelf: false, seed: "Dewi" },
            { name: "RianCerdas", score: "710 Pts", cate: "MathWizard", region: "Bandung", isSelf: false, seed: "Rian" }
        ],
        'snapshoot-puzzle': [
            { name: "PramSkuyy", score: "42 Detik", cate: "Snapshoot Puzzle", region: "DKI Jakarta", isSelf: true, seed: "Pram" },
            { name: "RizkySnap", score: "59 Detik", cate: "Snapshoot Puzzle", region: "Semarang", isSelf: false, seed: "Rizky" },
            { name: "AmeliaJigsaw", score: "64 Detik", cate: "Snapshoot Puzzle", region: "Makassar", isSelf: false, seed: "Amel" }
        ]
    }
};

// Variabel Kontrol Aktif Saat Ini
let currentScope = 'global';
let currentLbFilter = 'exp';

// Jalankan pengaturan tombol setelah DOM siap
document.addEventListener('DOMContentLoaded', () => {
    const scopeButtons = document.querySelectorAll('.scope-btn');
    const lbFilterButtons = document.querySelectorAll('.lb-filter-btn');

    // Listener Tombol Scope (Global / Regional)
    scopeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            scopeButtons.forEach(s => s.classList.remove('active'));
            btn.classList.add('active');
            currentScope = btn.getAttribute('data-scope');
            renderLeaderboard();
        });
    });

    // Listener Tombol Filter Game
    lbFilterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            lbFilterButtons.forEach(f => f.classList.remove('active'));
            btn.classList.add('active');
            currentLbFilter = btn.getAttribute('data-lb-filter');
            renderLeaderboard();
        });
    });

    // Render pertama kali saat aplikasi dibuka
    renderLeaderboard();
});

// Fungsi memproses pembacaan data array ke tabel HTML dan komponen podium
function renderLeaderboard() {
    const dataList = dummyLeaderboardData[currentScope][currentLbFilter] || [];
    const tableBody = document.getElementById('leaderboard-data-rows');
    
    // Kosongkan tabel lama
    tableBody.innerHTML = "";

    // 1. Update Tampilan Podium 3 Besar Utama
    document.getElementById('podium-name-1').innerText = dataList[0] ? dataList[0].name : "-";
    document.getElementById('podium-score-1').innerText = dataList[0] ? dataList[0].score : "-";
    
    document.getElementById('podium-name-2').innerText = dataList[1] ? dataList[1].name : "-";
    document.getElementById('podium-score-2').innerText = dataList[1] ? dataList[1].score : "-";
    
    document.getElementById('podium-name-3').innerText = dataList[2] ? dataList[2].name : "-";
    document.getElementById('podium-score-3').innerText = dataList[2] ? dataList[2].score : "-";

    // 2. Isi data ke dalam baris tabel
    dataList.forEach((player, index) => {
        const row = document.createElement('tr');
        if(player.isSelf) {
            row.classList.add('current-user-row');
        }

        row.innerHTML = `
            <td class="table-rank-num">#${index + 1}</td>
            <td>
                <div class="table-player-cell">
                    <img src="https://api.dicebear.com/7.x/bottts/svg?seed=${player.seed}" alt="avatar">
                    <span>${player.name}</span>
                </div>
            </td>
            <td><span class="table-badge-cate">${player.cate}</span></td>
            <td>${player.region}</td>
            <td class="table-xp-cell">${player.score}</td>
        `;
        tableBody.appendChild(row);
    });
}

// --- SISTEM TRANSAKSI PEMBELIAN ITEM TOKO VIA DIAMOND ---
function buyItem(itemId, cost) {
    // 1. Ambil data diamond pemain dari elemen dashboard (mencari angka murni)
    const diamondElements = document.querySelectorAll('.dashboard-diamond-status span, .modal-diamond-status span');
    if (diamondElements.length === 0) return;

    let currentDiamonds = parseInt(diamondElements[0].innerText.replace(/,/g, '')) || 0;

    // 2. Validasi kecukupan saldo saldo Diamond
    if (currentDiamonds < cost) {
        alert("❌ Diamond kamu tidak mencukupi untuk membeli item ini! Ayo mainkan game lebih banyak.");
        return;
    }

    // 3. Eksekusi Pengurangan Saldo
    let newDiamondBalance = currentDiamonds - cost;

    // 4. Update tampilan angka Diamond di seluruh layar dashboard secara serentak
    diamondElements.forEach(el => {
        el.innerText = newDiamondBalance.toLocaleString();
    });

    // 5. Berikan feedback sukses kepada pemain
    alert(`🎉 Pembelian Berhasil! Item telah diaktifkan ke akun PramSkuyy milikmu. (Sisa Diamond: ${newDiamondBalance})`);
}
// --- SISTEM KONTROL PENGATURAN GAME UTAMA ---

// 1. Mengubah angka teks persentase (%) volume secara live saat digeser
function updateVolumeText(type) {
    const slider = document.getElementById(`${type}-volume`);
    const textVal = document.getElementById(`${type}-val-txt`);
    if (slider && textVal) {
        textVal.innerText = `${slider.value}%`;
    }
}

// 2. Event handler ketika saklar toggle kamera OpenCV diubah oleh player
function toggleCameraPref() {
    const isCameraEnabled = document.getElementById('camera-toggle').checked;
    
    // Simpan status preferensi ke LocalStorage agar game Fruit Ninja tahu status kamera diaktifkan/tidak
    localStorage.setItem('game_camera_allowed', isCameraEnabled);
    
    if (isCameraEnabled) {
        console.log("Izin kamera otomatis aktif untuk OpenCV.");
    } else {
        console.log("Kamera dimatikan secara manual oleh pengguna.");
    }
}

// Shortcut pembantu untuk memanggil fungsi klik buka profil bawaan kode Anda
function openProfileModal() {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
        overlay.classList.add('active');
    }
}

// 3. Mengubah Tema Warna Lingkaran Background Ambient Glows
function changeDashboardTheme(themeName) {
    // A. Atur status tombol aktif di halaman setting
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => btn.classList.remove('active'));
    
    const clickedButton = document.querySelector(`.theme-${themeName}`);
    if (clickedButton) clickedButton.classList.add('active');

    // B. Ambil elemen bulatan cahaya ambient latar belakang asli Anda
    const glow1 = document.querySelector('.glow1');
    const glow2 = document.querySelector('.glow2');

    if (!glow1 || !glow2) return;

    // C. Ubah warna gradasi sesuai pilihan tema
    if (themeName === 'cyber') {
        glow1.style.background = '#6366f1'; // Indigo bawaan awal
        glow2.style.background = '#d946ef'; // Fuchsia bawaan awal
    } else if (themeName === 'emerald') {
        glow1.style.background = '#047857'; // Deep Emerald Green
        glow2.style.background = '#06b6d4'; // Cyan Tech
    } else if (themeName === 'ruby') {
        glow1.style.background = '#b91c1c'; // Crimson Red
        glow2.style.background = '#f97316'; // Orange Blaze
    }

    // Simpan pilihan tema ke LocalStorage agar saat direfresh tema tidak kembali ke awal
    localStorage.setItem('pramskuyy_theme', themeName);
}

// Tambahkan logika pengecekan tema saat halaman pertama kali dibuka
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('pramskuyy_theme');
    if (savedTheme) {
        changeDashboardTheme(savedTheme);
    }
});

// Membuka musik latar secara otomatis setelah interaksi pertama pengguna
document.addEventListener('click', () => {
    const bgm = document.getElementById('global-bgm');
    if (bgm && bgm.paused) {
        // Set volume awal berdasarkan nilai slider setting (misal 70% -> 0.7)
        const bgmSlider = document.getElementById('bgm-volume');
        bgm.volume = bgmSlider ? bgmSlider.value / 100 : 0.7;
        bgm.play().catch(err => console.log("Audio play diblokir sementara:", err));
    }
}, { once: true }); // { once: true } memastikan fungsi ini hanya berjalan SEKALI saja di awal
// Mengubah angka teks persentase (%) dan volume audio asli secara live saat digeser
function updateVolumeText(type) {
    const slider = document.getElementById(`${type}-volume`);
    const textVal = document.getElementById(`${type}-val-txt`);
    
    if (slider && textVal) {
        textVal.innerText = `${slider.value}%`;
        
        // Sesuaikan volume asli (Skala HTML5 Audio adalah 0.0 sampai 1.0)
        if (type === 'bgm') {
            const bgm = document.getElementById('global-bgm');
            if (bgm) bgm.volume = slider.value / 100;
        } else if (type === 'sfx') {
            const sfx = document.getElementById('global-sfx');
            if (sfx) sfx.volume = slider.value / 100;
        }
    }
}

// Fungsi universal untuk membunyikan efek suara klik
function playClickSFX() {
    const sfx = document.getElementById('global-sfx');
    const sfxSlider = document.getElementById('sfx-volume');
    if (sfx) {
        sfx.volume = sfxSlider ? sfxSlider.value / 100 : 0.85;
        sfx.currentTime = 0; // Reset ke detik ke-0 agar suara bisa di-spam tanpa delay
        sfx.play();
    }
}