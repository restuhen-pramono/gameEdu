const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('gameCanvas');
const canvasCtx = canvasElement.getContext('2d');
const loadingOverlay = document.getElementById('loadingOverlay');
const questionBoard = document.getElementById('questionBoard');
const questionText = document.getElementById('questionText');
const scoreValue = document.getElementById('scoreValue');
const levelValue = document.getElementById('levelValue');
const healthValue = document.getElementById('healthValue');
const gameOverPanel = document.getElementById('gameOverPanel');
const finalScoreText = document.getElementById('finalScoreText');
const restartBtn = document.getElementById('restartBtn');

// State Manajemen Game
let gameState = "INITIALIZING"; 
let score = 0;
let level = 1;
let hp = 3;
let isTracking = false;

// Variabel Kunci Data Mentah dari AI (Tangan & Titik Jari)
let handLandmarksRaw = []; // Menampung objek landmarks multi-tangan mentah dari MediaPipe

// Variabel Pertanyaan Matematika & Deteksi Jari
let currentAnswer = 0;
let detectedFingersCount = 0;
let shieldActive = false;

// Kunci Pengukur Deteksi Stabil (Mencegah salah baca instan)
let correctMatchTimer = 0; 
const TARGET_MATCH_TIME = 25; // Butuh sekitar 400 milidetik jari stabil di kamera

// Data Entitas Animasi Karakter & Musuh
let wizardAnimY = 0;
let monsterAnimY = 0;
let timeCounter = 0;

// Properti Animasi Bola Energi Monster (Attack Orb)
let attackOrb = {
    x: 0,
    y: 0,
    radius: 24,
    speed: 1.8,
    active: false,
    progress: 0 // Rentang 0 (Monster) sampai 1 (Penyihir)
};

// Sistem Partikel Sihir (Visual Feedback)
let magicParticles = [];
class MagicParticle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 5 + 3;
        this.speedX = (Math.random() - 0.5) * 6;
        this.speedY = (Math.random() - 0.5) * 6;
        this.alpha = 1;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.alpha -= 0.03;
        if (this.size > 0.1) this.size -= 0.1;
    }
    draw() {
        canvasCtx.save();
        canvasCtx.globalAlpha = this.alpha;
        canvasCtx.beginPath();
        canvasCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        canvasCtx.fillStyle = this.color;
        canvasCtx.shadowBlur = 12;
        canvasCtx.shadowColor = this.color;
        canvasCtx.fill();
        canvasCtx.restore();
    }
}

function resizeCanvas() {
    canvasElement.width = canvasElement.clientWidth;
    canvasElement.height = canvasElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Pembuat Soal Matematika Otomatis Dinamis Berdasarkan Level (Progressive Difficulty)
// Pembuat Soal Matematika Otomatis Dinamis Hingga Level 10 (Boss Battle)
function generateMathQuestion() {
    let num1 = 0, num2 = 0;
    let operator = "";

    if (level === 1) {
        // LEVEL 1: Hanya Penjumlahan (Hasil Maksimal 5)
        num1 = Math.floor(Math.random() * 4) + 1; 
        num2 = Math.floor(Math.random() * (5 - num1)) + 1;
        currentAnswer = num1 + num2;
        operator = "+";
    } 
    else if (level === 2) {
        // LEVEL 2: Hanya Pengurangan (Hasil Maksimal 5)
        num1 = Math.floor(Math.random() * 5) + 5; 
        num2 = Math.floor(Math.random() * 4) + 1; 
        currentAnswer = num1 - num2;
        if (currentAnswer <= 0) { currentAnswer = 2; num1 = 5; num2 = 3; }
        operator = "-";
    } 
    else if (level === 3) {
        // LEVEL 3: Hanya Perkalian Dasar (Hasil Maksimal 6)
        const perkalianValid = [
            {n1: 1, n2: 3, ans: 3}, {n1: 3, n2: 1, ans: 3},
            {n1: 1, n2: 4, ans: 4}, {n1: 4, n2: 1, ans: 4}, {n1: 2, n2: 2, ans: 4},
            {n1: 1, n2: 5, ans: 5}, {n1: 5, n2: 1, ans: 5},
            {n1: 1, n2: 6, ans: 6}, {n1: 2, n2: 3, ans: 6}, {n1: 3, n2: 2, ans: 6}
        ];
        let pick = perkalianValid[Math.floor(Math.random() * perkalianValid.length)];
        num1 = pick.n1; num2 = pick.n2; currentAnswer = pick.ans;
        operator = "×";
    } 
    else if (level === 4) {
        // LEVEL 4: Hanya Pembagian Bulat (Hasil Maksimal 5)
        currentAnswer = Math.floor(Math.random() * 5) + 1; 
        num2 = Math.floor(Math.random() * 2) + 2; 
        num1 = currentAnswer * num2; 
        if (num1 > 15) { num1 = 6; num2 = 2; currentAnswer = 3; } 
        operator = "÷";
    } 
    else if (level >= 5 && level <= 9) {
        // LEVEL 5 - 9: Campuran Acak (Hasil Mulai Meningkat ke 6 - 10)
        let tipeAcak = Math.floor(Math.random() * 4);
        // Menyesuaikan rentang angka atas agar merangkak naik perlahan setiap naik level
        let maxLimit = level + 1; // Level 5 batas hasil 6, Level 9 batas hasil 10

        if (tipeAcak === 0) { // Penjumlahan Campuran
            num1 = Math.floor(Math.random() * (maxLimit - 2)) + 2;
            num2 = Math.floor(Math.random() * (maxLimit - num1)) + 1;
            currentAnswer = num1 + num2;
            operator = "+";
        } else if (tipeAcak === 1) { // Pengurangan Campuran
            num1 = Math.floor(Math.random() * 5) + maxLimit; 
            currentAnswer = Math.floor(Math.random() * (maxLimit - 2)) + 2; 
            num2 = num1 - currentAnswer;
            operator = "-";
        } else if (tipeAcak === 2) { // Perkalian Campuran
            const perkalianMenengah = [
                {n1: 2, n2: 3, ans: 6}, {n1: 3, n2: 2, ans: 6},
                {n1: 1, n2: 7, ans: 7}, {n1: 2, n2: 4, ans: 8},
                {n1: 4, n2: 2, ans: 8}, {n1: 3, n2: 3, ans: 9},
                {n1: 2, n2: 5, ans: 10}, {n1: 5, n2: 2, ans: 10}
            ];
            let listValid = perkalianMenengah.filter(p => p.ans <= maxLimit);
            if(listValid.length === 0) listValid = [perkalianMenengah[0]];
            let pick = listValid[Math.floor(Math.random() * listValid.length)];
            num1 = pick.n1; num2 = pick.n2; currentAnswer = pick.ans;
            operator = "×";
        } else { // Pembagian Campuran
            currentAnswer = Math.floor(Math.random() * (maxLimit - 2)) + 2;
            num2 = Math.floor(Math.random() * 2) + 2; 
            num1 = currentAnswer * num2;
            operator = "÷";
        }
    } 
    else {
        // ========================================================
        // LEVEL 10: ULTIMATE MONSTER BOSS (SOAL CHARGED & SUPER CEPAT!)
        // ========================================================
        let tipeAcak = Math.floor(Math.random() * 4);
        
        if (tipeAcak === 0) { // Penjumlahan Boss (Angka Mepet 10)
            num1 = Math.floor(Math.random() * 3) + 6; // 6 - 8
            num2 = Math.floor(Math.random() * 2) + 2; // 2 - 3
            currentAnswer = num1 + num2; // Hasil pasti 8, 9, atau 10
            operator = "+";
        } else if (tipeAcak === 1) { // Pengurangan Boss
            num1 = Math.floor(Math.random() * 4) + 12; // 12 - 15
            currentAnswer = Math.floor(Math.random() * 3) + 8; // Jawaban sulit: 8, 9, 10
            num2 = num1 - currentAnswer;
            operator = "-";
        } else if (tipeAcak === 2) { // Perkalian Boss (Mencari jawaban mutlak tinggi)
            const perkalianBoss = [
                {n1: 3, n2: 3, ans: 9}, {n1: 2, n2: 4, ans: 8},
                {n1: 4, n2: 2, ans: 8}, {n1: 2, n2: 5, ans: 10},
                {n1: 5, n2: 2, ans: 10}
            ];
            let pick = perkalianBoss[Math.floor(Math.random() * perkalianBoss.length)];
            num1 = pick.n1; num2 = pick.n2; currentAnswer = pick.ans;
            operator = "×";
        } else { // Pembagian Boss
            currentAnswer = Math.floor(Math.random() * 3) + 8; // Jawaban: 8, 9, atau 10 (Sangat sulit!)
            num2 = 2; 
            num1 = currentAnswer * num2; // Contoh: 16 ÷ 2, 18 ÷ 2, 20 ÷ 2
            operator = "÷";
        }
    }

    // Set Teks Papan Pertanyaan
    if (level === 10) {
        questionText.innerHTML = `<span style="color: #ef4444; text-shadow: 0 0 15px #f43f5e;">⚡ ${num1} ${operator} ${num2} ⚡</span>`;
    } else {
        questionText.textContent = `${num1} ${operator} ${num2} = ?`;
    }

    // PENGATURAN KECEPATAN BOLA ENERGI
    attackOrb.progress = 0;
    if (level === 10) {
        // Level Bos: Kecepatan lompat drastis (hampir 2.5x lipat dari Level 1)
        attackOrb.speed = 0.0135; 
    } else {
        // Level 1-9 merangkak naik konstan
        attackOrb.speed = 0.0025 + (level * 0.0008); 
    }
    
    attackOrb.active = true;
    shieldActive = false;
    correctMatchTimer = 0;
}

function handleParticles() {
    for (let i = 0; i < magicParticles.length; i++) {
        magicParticles[i].update();
        magicParticles[i].draw();
        if (magicParticles[i].alpha <= 0) {
            magicParticles.splice(i, 1);
            i--;
        }
    }
}

function triggerExplosion(x, y, color, count = 20) {
    for (let i = 0; i < count; i++) {
        magicParticles.push(new MagicParticle(x, y, color));
    }
}

function initGame() {
    score = 0;
    level = 1;
    hp = 3;
    scoreValue.textContent = score;
    levelValue.textContent = level;
    healthValue.textContent = hp;
    
    gameOverPanel.style.display = "none";
    questionBoard.style.display = "block";
    gameState = "BATTLE";
    
    generateMathQuestion();
}

// FUNGSI BARU: Menggambar Struktur Tulang & Titik Jari Jelas di Layar
function drawFingerDotsSkeleton() {
    if (!isTracking || handLandmarksRaw.length === 0) return;

    // Koneksi struktur kerangka jari (MediaPipe Standard)
    const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],       // Jempol
        [0, 5], [5, 6], [6, 7], [7, 8],       // Telunjuk
        [5, 9], [9, 10], [10, 11], [11, 12],  // Jari Tengah
        [9, 13], [13, 14], [14, 15], [15, 16], // Jari Manis
        [13, 17], [17, 18], [18, 19], [19, 20], // Kelingking
        [0, 17]                               // Telapak Bawah
    ];

    // Tentukan warna neon dinamis: Biru Cyan (Sihir Pelindung) atau Hijau (Jawaban Benar)
    let dotColor = shieldActive ? "#22c55e" : "#38bdf8";
    let glowColor = shieldActive ? "#22c55e" : "#0ea5e9";

    handLandmarksRaw.forEach(hand => {
        // 1. Gambar Garis Kerangka Jari (Laser Beam)
        canvasCtx.save();
        canvasCtx.strokeStyle = dotColor;
        canvasCtx.lineWidth = 3;
        canvasCtx.shadowBlur = 12;
        canvasCtx.shadowColor = glowColor;

        connections.forEach(assoc => {
            const pt1 = hand[assoc[0]];
            const pt2 = hand[assoc[1]];
            
            if (pt1 && pt2) {
                canvasCtx.beginPath();
                canvasCtx.moveTo((1 - pt1.x) * canvasElement.width, pt1.y * canvasElement.height);
                canvasCtx.lineTo((1 - pt2.x) * canvasElement.width, pt2.y * canvasElement.height);
                canvasCtx.stroke();
            }
        });
        canvasCtx.restore();

        // 2. Gambar Bulatan Titik (*Dots*) di Setiap Engsel Sendi Jari
        canvasCtx.save();
        canvasCtx.fillStyle = "#ffffff"; // Inti titik putih agar kontras
        canvasCtx.shadowBlur = 6;
        canvasCtx.shadowColor = "#ffffff";
        hand.forEach(pt => {
            canvasCtx.beginPath();
            canvasCtx.arc((1 - pt.x) * canvasElement.width, pt.y * canvasElement.height, 4.5, 0, 2 * Math.PI);
            canvasCtx.fill();
        });
        canvasCtx.restore();
    });
}

// LOGIKA UTAMA GAME LOOP RENDERER (VERSI: PAK USTADZ VS HANTU POCONG)
function gameLoop() {
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    timeCounter += 0.05;

    // Gambar Video Kamera Sebagai Latar Belakang (Mirror Mode)
    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        canvasCtx.save();
        canvasCtx.translate(canvasElement.width, 0);
        canvasCtx.scale(-1, 1); 
        canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.restore();
    }

    // Koordinat Dasar Karakter di Layar
    const ustadX = canvasElement.width * 0.18;
    const ustadY = canvasElement.height * 0.65 + Math.sin(timeCounter) * 5; // Melayang halus
    const hantuX = canvasElement.width * 0.82;
    const hantuY = canvasElement.height * 0.62 + Math.cos(timeCounter) * 12; // Pocong melayang lebih dinamis

    if (gameState === "BATTLE") {
        // Overlay Transparan tipis agar grafis tetap terlihat kontras
        canvasCtx.fillStyle = "rgba(11, 6, 23, 0.7)";
        canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

        // Gambar Titik & Kerangka Jari AI
        drawFingerDotsSkeleton();

        // ========================================================
        // 1. GAMBAR KARAKTER: PAK USTADZ (SISI KIRI)
        // ========================================================
        canvasCtx.save();
        
        // --- BAJU KOKO PUTIH & SARUNG HIJAU ---
        canvasCtx.beginPath();
        canvasCtx.moveTo(ustadX, ustadY + 10);
        canvasCtx.lineTo(ustadX - 35, ustadY + 75); // Badan/Baju
        canvasCtx.lineTo(ustadX + 35, ustadY + 75);
        canvasCtx.closePath();
        canvasCtx.fillStyle = "#ffffff"; // Baju Koko Putih
        canvasCtx.fill();
        
        // Sarung Hijau di bagian bawah baju
        canvasCtx.fillStyle = "#16a34a"; 
        canvasCtx.fillRect(ustadX - 33, ustadY + 55, 66, 20);

        // --- WAJAH & SORBAN/PECI ---
        canvasCtx.beginPath();
        canvasCtx.arc(ustadX, ustadY - 10, 20, 0, Math.PI * 2);
        canvasCtx.fillStyle = "#ffedd5"; // Warna Kulit
        canvasCtx.fill();

        // Peci Hitam Nasional
        canvasCtx.fillStyle = "#1e293b";
        canvasCtx.fillRect(ustadX - 16, ustadY - 35, 32, 14);

        // Janggut Tipis Ramah
        canvasCtx.beginPath();
        canvasCtx.arc(ustadX, ustadY + 5, 8, 0, Math.PI);
        canvasCtx.fillStyle = "#475569";
        canvasCtx.fill();

        // --- SORBAN DI BAHU ---
        canvasCtx.strokeStyle = "#15803d";
        canvasCtx.lineWidth = 4;
        canvasCtx.beginPath();
        canvasCtx.moveTo(ustadX - 20, ustadY + 15);
        canvasCtx.lineTo(ustadX - 10, ustadY + 45);
        canvasCtx.moveTo(ustadX + 20, ustadY + 15);
        canvasCtx.lineTo(ustadX + 10, ustadY + 45);
        canvasCtx.stroke();
        
        canvasCtx.restore();


        // ========================================================
        // 2. GAMBAR KARAKTER: HANTU POCONG (SISI KANAN)
        // ========================================================
        canvasCtx.save();
        
        if (level === 10) {
            // --- RAJA POCONG RAKSASA (BOSS LEVEL 10) ---
            canvasCtx.shadowBlur = 35;
            canvasCtx.shadowColor = "#ef4444"; // Aura merah kutukan

            // Badan Pocong Besar (Kafan Lusuh Berdarah)
            canvasCtx.fillStyle = "#cbd5e1";
            canvasCtx.fillRect(hantuX - 55, hantuY - 55, 110, 135);
            
            // Ikatan Kafan Atas (Kuncung Boss)
            canvasCtx.beginPath();
            canvasCtx.arc(hantuX, hantuY - 55, 15, 0, Math.PI * 2);
            canvasCtx.fillStyle = "#94a3b8";
            canvasCtx.fill();

            // Wajah Hitam Gosong Bermata Tiga Merah Menyala
            canvasCtx.fillStyle = "#1e1b4b";
            canvasCtx.fillRect(hantuX - 40, hantuY - 35, 80, 50);
            
            for (let i = -1; i <= 1; i++) {
                canvasCtx.beginPath();
                canvasCtx.arc(hantuX + (i * 22), hantuY - 10, 8, 0, Math.PI * 2);
                canvasCtx.fillStyle = "#ef4444";
                canvasCtx.fill();
            }
        } else {
            // --- HANTU POCONG BIASA (LEVEL 1-9) ---
            canvasCtx.shadowBlur = 20;
            canvasCtx.shadowColor = "#a78bfa"; // Aura mistis ungu/putih

            // Badan Lonjong Kain Kafan Putih
            canvasCtx.fillStyle = "#f8fafc";
            canvasCtx.beginPath();
            canvasCtx.roundRect(hantuX - 35, hantuY - 45, 70, 110, [20, 20, 10, 10]);
            canvasCtx.fill();

            // Tali Ikatan Kafan Atas (Kuncung Pocong)
            canvasCtx.beginPath();
            canvasCtx.moveTo(hantuX, hantuY - 45);
            canvasCtx.lineTo(hantuX - 10, hantuY - 65);
            canvasCtx.lineTo(hantuX + 10, hantuY - 65);
            canvasCtx.closePath();
            canvasCtx.fillStyle = "#cbd5e1";
            canvasCtx.fill();
            
            // Ikatan Bawah
            canvasCtx.fillRect(hantuX - 8, hantuY + 65, 16, 8);

            // Tatapan Mata Bulat Hitam (Efek Menyeramkan tapi Lucu)
            canvasCtx.beginPath();
            canvasCtx.arc(hantuX - 12, hantuY - 15, 7, 0, Math.PI * 2);
            canvasCtx.arc(hantuX + 12, hantuY - 15, 7, 0, Math.PI * 2);
            canvasCtx.fillStyle = "#0f172a";
            canvasCtx.fill();
            
            // Pupil Merah Kecil
            canvasCtx.beginPath();
            canvasCtx.arc(hantuX - 12, hantuY - 15, 2.5, 0, Math.PI * 2);
            canvasCtx.arc(hantuX + 12, hantuY - 15, 2.5, 0, Math.PI * 2);
            canvasCtx.fillStyle = "#ef4444";
            canvasCtx.fill();

            // Lingkaran Hitam di Sekitar Mata (Mata Panda Mistis)
            canvasCtx.strokeStyle = "rgba(0,0,0,0.15)";
            canvasCtx.lineWidth = 3;
            canvasCtx.strokeRect(hantuX - 25, hantuY - 25, 50, 20);
        }
        
        canvasCtx.restore();


        // ========================================================
        // 3. LOGIKA ATOMIK BOLA ENERGI MISTIS (ORB)
        // ========================================================
        if (attackOrb.active) {
            attackOrb.progress += attackOrb.speed;
            
            attackOrb.x = hantuX - (hantuX - ustadX) * attackOrb.progress;
            attackOrb.y = hantuY - (hantuY - ustadY) * attackOrb.progress;

            canvasCtx.save();
            canvasCtx.beginPath();
            canvasCtx.arc(attackOrb.x, attackOrb.y, attackOrb.radius, 0, Math.PI * 2);
            
            if (level === 10) {
                // Aura Bola Energi Raja Pocong: Hitam Berkabut Api Merah
                canvasCtx.fillStyle = "#020617";
                canvasCtx.strokeStyle = "#ef4444";
                canvasCtx.lineWidth = 3;
                canvasCtx.shadowBlur = 30;
                canvasCtx.shadowColor = "#dc2626";
                canvasCtx.fill();
                canvasCtx.stroke();
            } else {
                // Bola Roh Hijau Ectoplasm Lemparan Pocong Biasa
                canvasCtx.fillStyle = "#22c55e";
                canvasCtx.shadowBlur = 25;
                canvasCtx.shadowColor = "#4ade80";
                canvasCtx.fill();
            }
            
            canvasCtx.fillStyle = "#ffffff";
            canvasCtx.font = "bold 16px Arial";
            canvasCtx.textAlign = "center";
            canvasCtx.textBaseline = "middle";
            canvasCtx.fillText(level === 10 ? "☠️" : "?", attackOrb.x, attackOrb.y);
            canvasCtx.restore();

            // Deteksi Jari Validasi Jawaban
            if (detectedFingersCount === currentAnswer) {
                correctMatchTimer++;
                if (Math.random() > 0.4) {
                    // Partikel Tasbih Emas mulai mengitari benteng Pak Ustadz
                    magicParticles.push(new MagicParticle(ustadX + 60, ustadY, "#fbbf24"));
                }

                if (correctMatchTimer >= TARGET_MATCH_TIME) {
                    shieldActive = true;
                }
            } else {
                if (correctMatchTimer > 0) correctMatchTimer--;
            }

            // --- BENTENG PERISAI KALIGRAFI PAK USTADZ ---
            if (shieldActive) {
                canvasCtx.save();
                canvasCtx.beginPath();
                canvasCtx.arc(ustadX + 55, ustadY, 70, -Math.PI / 2, Math.PI / 2);
                
                // Warna Perisai Menjadi Emas Islami yang Berpendar Suci
                canvasCtx.strokeStyle = "#fbbf24";
                canvasCtx.lineWidth = 6;
                canvasCtx.shadowBlur = 25;
                canvasCtx.shadowColor = "#f59e0b";
                canvasCtx.stroke();
                
                // Efek Guratan Cahaya Ayat di Dalam Tameng
                canvasCtx.fillStyle = "rgba(251, 191, 36, 0.2)";
                canvasCtx.font = "italic bold 12px Georgia";
                canvasCtx.fillText("🛡️ AMAN", ustadX + 70, ustadY);
                canvasCtx.restore();

                // Cek Benturan Bola Hantu dengan Perisai Emas Ustadz
                if (attackOrb.x <= ustadX + 65) {
                    triggerExplosion(attackOrb.x, attackOrb.y, "#fbbf24", 35); // Ledakan Emas
                    score += 10;
                    scoreValue.textContent = score;

                    if (score % 30 === 0) {
                        level++;
                        levelValue.textContent = level;
                    }
                    
                    attackOrb.active = false;
                    setTimeout(generateMathQuestion, 800);
                }
            } 
            // Jika Gagal Menahan dan Terkena Serangan Mistis Pocong
            else if (attackOrb.progress >= 0.95) {
                triggerExplosion(attackOrb.x, attackOrb.y, "#ef4444", 40);
                hp--;
                healthValue.textContent = hp;
                attackOrb.active = false;

                if (hp <= 0) {
                    gameState = "GAME_OVER";
                    questionBoard.style.display = "none";
                    finalScoreText.textContent = score;
                    gameOverPanel.style.display = "flex";
                } else {
                    setTimeout(generateMathQuestion, 1000);
                }
            }
        }

        // 4. DISPLAY FEEDBACK JUMLAH JARI DI INDIKATOR CANVAS BAWAH
        canvasCtx.save();
        canvasCtx.fillStyle = "rgba(17, 9, 36, 0.85)";
        canvasCtx.fillRect(20, canvasElement.height - 70, 220, 45);
        canvasCtx.strokeStyle = "#16a34a"; // Garis Hijau Islami
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeRect(20, canvasElement.height - 70, 220, 45);
        
        canvasCtx.fillStyle = "#ffffff";
        canvasCtx.font = "bold 15px Quicksand";
        canvasCtx.fillText(`Jari Terdeteksi AI: ${detectedFingersCount}`, 35, canvasElement.height - 42);
        canvasCtx.restore();
    }

    handleParticles();
    requestAnimationFrame(gameLoop);
}

// ==========================================================
// ARSITEKTUR DETEKSI AI MEDIAPIPE: MENGHITUNG JARI TERBUKA
// ==========================================================
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 2, 
    modelComplexity: 1,
    minDetectionConfidence: 0.55,
    minTrackingConfidence: 0.55
});

hands.onResults((results) => {
    if (loadingOverlay && loadingOverlay.style.display !== 'none') {
        loadingOverlay.style.display = 'none';
        initGame(); 
    }

    let totalFingersOpen = 0;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        isTracking = true;
        handLandmarksRaw = results.multiHandLandmarks; // Simpan objeklandmarks Multi-Tangan mentah untuk digambar garisnya di Loop

        for (let h = 0; h < results.multiHandLandmarks.length; h++) {
            const landmarks = results.multiHandLandmarks[h];
            const handLabel = results.multiHandedness[h].label; 

            if (landmarks[8].y < landmarks[6].y) totalFingersOpen++;   
            if (landmarks[12].y < landmarks[10].y) totalFingersOpen++; 
            if (landmarks[16].y < landmarks[14].y) totalFingersOpen++; 
            if (landmarks[20].y < landmarks[18].y) totalFingersOpen++; 

            if (handLabel === "Left" || handLabel === "Kiri") {
                if (landmarks[4].x > landmarks[2].x) totalFingersOpen++;
            } else {
                if (landmarks[4].x < landmarks[2].x) totalFingersOpen++;
            }
        }
        detectedFingersCount = totalFingersOpen;
    } else {
        isTracking = false;
        detectedFingersCount = 0;
        handLandmarksRaw = [];
    }
});

// MEMBUKA AKSES WEBCAM DAN MENYALAKAN HARDWARE
async function startWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false
        });
        videoElement.srcObject = stream;
        videoElement.addEventListener('loadedmetadata', () => {
            videoElement.play();
            resizeCanvas();
            
            async function processFrame() {
                if (!videoElement.paused && !videoElement.ended) {
                    try { await hands.send({ image: videoElement }); } catch (e) {}
                }
                setTimeout(processFrame, 22); 
            }
            processFrame();
            requestAnimationFrame(gameLoop);
        });
    } catch (err) {
        console.error("Gagal Membuka Hardware Kamera:", err);
        alert("Akses kamera ditolak! Game Math Wizard memerlukan kamera untuk menghitung jari.");
    }
}

startWebcam();

restartBtn.addEventListener('click', () => {
    initGame();
});