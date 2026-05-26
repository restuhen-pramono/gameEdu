const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('gameCanvas');
const canvasCtx = canvasElement.getContext('2d');
const loadingOverlay = document.getElementById('loadingOverlay');
const gameOverPanel = document.getElementById('gameOverPanel');
const scoreValue = document.getElementById('scoreValue');
const livesValue = document.getElementById('livesValue');
const finalScore = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');

// State Sistem Game
let score = 0;
let lives = 3;
let isGameOver = false;
let fruits = [];

// Struktur Data untuk Menyimpan Posisi Koordinat & Seluruh Kerangka Tangan
let handData = {
    isTracking: false,
    allPoints: [],               // Menyimpan 21 koordinat mentah ter-mirror
    indexTip: { x: 0, y: 0 },    // Pisau Telunjuk (Titik 8)
    otherFingers: []             // Bumper Jari Lain (Jempol 4, Tengah 12, Manis 16, Kelingking 20)
};

// Daftar Tampilan Buah Berbasis Emoji & Variasi Ukuran
const fruitAssets = [
    { emoji: '🍉', radius: 35 },
    { emoji: '🍎', radius: 25 },
    { emoji: '🍊', radius: 25 },
    { emoji: '🍌', radius: 28 },
    { emoji: '🍍', radius: 32 }
];

// Menyesuaikan ukuran internal canvas agar sesuai dengan dimensi tampilannya di browser
function resizeCanvas() {
    canvasElement.width = canvasElement.clientWidth;
    canvasElement.height = canvasElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Kelas Struktur Objek Buah / Item Game
class GameObject {
    constructor() {
        this.reset();
    }

    reset() {
        this.type = Math.random() > 0.20 ? 'fruit' : 'bomb'; // 20% peluang bom
        
        if (this.type === 'fruit') {
            const asset = fruitAssets[Math.floor(Math.random() * fruitAssets.length)];
            this.emoji = asset.emoji;
            this.radius = asset.radius;
        } else {
            this.emoji = '💣';
            this.radius = 28;
        }

        this.x = Math.random() * (canvasElement.width - 100) + 50;
        this.y = canvasElement.height + 50;
        this.speedX = (Math.random() - 0.5) * 6;
        this.speedY = -(Math.random() * 4 + 12);
        this.gravity = 0.28;
        this.isSliced = false;
        
        this.angle = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
    }

    update() {
        this.speedY += this.gravity;
        this.x += this.speedX;
        this.y += this.speedY;
        this.angle += this.rotationSpeed;

        if (this.x < this.radius) {
            this.x = this.radius;
            this.speedX *= -0.8;
        } else if (this.x > canvasElement.width - this.radius) {
            this.x = canvasElement.width - this.radius;
            this.speedX *= -0.8;
        }

        if (this.y > canvasElement.height + 60) {
            if (this.type === 'fruit' && !this.isSliced && !isGameOver) {
                lives--;
                updateStats();
                if (lives <= 0) triggerGameOver();
            }
            this.reset();
        }
    }

    draw() {
        canvasCtx.save();
        canvasCtx.translate(this.x, this.y);
        canvasCtx.rotate(this.angle);

        canvasCtx.font = `${this.radius * 2}px Arial`;
        canvasCtx.textAlign = 'center';
        canvasCtx.textBaseline = 'middle';

        if (this.type === 'bomb') {
            canvasCtx.fillText(this.emoji, 0, 0);
        } else {
            if (this.isSliced) {
                canvasCtx.save();
                canvasCtx.translate(-15, 0);
                canvasCtx.beginPath();
                canvasCtx.rect(-this.radius * 2, -this.radius * 2, this.radius * 2, this.radius * 4);
                canvasCtx.clip();
                canvasCtx.fillText(this.emoji, 0, 0);
                canvasCtx.restore();

                canvasCtx.save();
                canvasCtx.translate(15, 0);
                canvasCtx.beginPath();
                canvasCtx.rect(0, -this.radius * 2, this.radius * 2, this.radius * 4);
                canvasCtx.clip();
                canvasCtx.fillText(this.emoji, 0, 0);
                canvasCtx.restore();
            } else {
                canvasCtx.fillText(this.emoji, 0, 0);
            }
        }
        canvasCtx.restore();
    }

    checkInteractions() {
        if (!handData.isTracking || this.isSliced) return;

        // 1. LOGIKA TELUNJUK (MEMOTONG BUAH / MELEDAKKAN BOM)
        let distToIndex = Math.hypot(this.x - handData.indexTip.x, this.y - handData.indexTip.y);
        if (distToIndex < this.radius + 22) {
            if (this.type === 'bomb') {
                lives = 0;
                updateStats();
                triggerGameOver();
            } else {
                this.isSliced = true;
                score += 10;
                updateStats();
                this.speedY = 2;
                setTimeout(() => this.reset(), 350);
            }
            return;
        }

        // 2. LOGIKA JARI LAIN (MEMANTULKAN OBJEK)
        handData.otherFingers.forEach(finger => {
            let distToFinger = Math.hypot(this.x - finger.x, this.y - finger.y);
            if (distToFinger < this.radius + 18) {
                let angle = Math.atan2(this.y - finger.y, this.x - finger.x);
                this.speedY = Math.sin(angle) * 12; 
                this.speedX = Math.cos(angle) * 8;
                this.x += this.speedX;
                this.y += this.speedY;
                this.rotationSpeed = (Math.random() - 0.5) * 0.3;
            }
        });
    }
}

// Inisialisasi Pool Buah
for (let i = 0; i < 3; i++) {
    setTimeout(() => {
        if(!isGameOver) fruits.push(new GameObject());
    }, i * 1200);
}

function updateStats() {
    scoreValue.textContent = score;
    livesValue.textContent = lives >= 0 ? lives : 0;
}

function triggerGameOver() {
    isGameOver = true;
    finalScore.textContent = score;
    gameOverPanel.style.display = 'flex';
}

function drawBoneLine(pt1, pt2, color, thickness) {
    if (!pt1 || !pt2) return;
    canvasCtx.beginPath();
    canvasCtx.moveTo(pt1.x, pt1.y);
    canvasCtx.lineTo(pt2.x, pt2.y);
    canvasCtx.strokeStyle = color;
    canvasCtx.lineWidth = thickness;
    canvasCtx.lineCap = "round";
    canvasCtx.stroke();
}

// Loop Animasi Utama
function gameLoop() {
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // 1. GAMBAR VIDEO KAMERA DENGAN EFEK MIRROR (CERMIN)
    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        canvasCtx.save();
        // Balikkan konteks canvas secara horizontal
        canvasCtx.translate(canvasElement.width, 0);
        canvasCtx.scale(-1, 1);
        // Gambar video (hasilnya otomatis ter-mirror mengikuti gerakan asli)
        canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.restore();
    }

    // 2. Perbarui Jalur Gerak Buah
    fruits.forEach(fruit => {
        fruit.update();
        fruit.checkInteractions();
        fruit.draw();
    });

    // 3. GAMBAR STRUKTUR KERANGKA TANGAN INTEGRAL
    if (handData.isTracking && handData.allPoints.length === 21) {
        const pts = handData.allPoints;

        canvasCtx.save();
        canvasCtx.shadowBlur = 10;
        canvasCtx.shadowColor = "#00f0ff";

        const cyberBlue = "rgba(59, 130, 246, 0.8)";
        const laserGreen = "rgba(34, 197, 94, 0.9)";

        // Pergelangan ke Pangkal Jari-jari
        drawBoneLine(pts[0], pts[1], cyberBlue, 4);
        drawBoneLine(pts[0], pts[5], cyberBlue, 4);
        drawBoneLine(pts[0], pts[17], cyberBlue, 4);
        
        drawBoneLine(pts[1], pts[5], cyberBlue, 3);
        drawBoneLine(pts[5], pts[9], cyberBlue, 3);
        drawBoneLine(pts[9], pts[13], cyberBlue, 3);
        drawBoneLine(pts[13], pts[17], cyberBlue, 3);

        // JEMPOL
        drawBoneLine(pts[1], pts[2], cyberBlue, 4);
        drawBoneLine(pts[2], pts[3], cyberBlue, 4);
        drawBoneLine(pts[3], pts[4], cyberBlue, 4);

        // TELUNJUK
        drawBoneLine(pts[5], pts[6], laserGreen, 5);
        drawBoneLine(pts[6], pts[7], laserGreen, 5);
        drawBoneLine(pts[7], pts[8], laserGreen, 5);

        // JARI TENGAH
        drawBoneLine(pts[9], pts[10], cyberBlue, 4);
        drawBoneLine(pts[10], pts[11], cyberBlue, 4);
        drawBoneLine(pts[11], pts[12], cyberBlue, 4);

        // JARI MANIS
        drawBoneLine(pts[13], pts[14], cyberBlue, 4);
        drawBoneLine(pts[14], pts[15], cyberBlue, 4);
        drawBoneLine(pts[15], pts[16], cyberBlue, 4);

        // KELINGKING
        drawBoneLine(pts[17], pts[18], cyberBlue, 4);
        drawBoneLine(pts[18], pts[19], cyberBlue, 4);
        drawBoneLine(pts[19], pts[20], cyberBlue, 4);

        // Titik Sendi
        pts.forEach((pt, idx) => {
            canvasCtx.beginPath();
            canvasCtx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);

            if (idx === 8) {
                canvasCtx.fillStyle = "#22c55e";
                canvasCtx.shadowColor = "#22c55e";
            } else if ([4, 12, 16, 20].includes(idx)) {
                canvasCtx.fillStyle = "#3b82f6";
                canvasCtx.shadowColor = "#60a5fa";
            } else {
                canvasCtx.fillStyle = "#e2e8f0";
                canvasCtx.shadowBlur = 0;
            }
            canvasCtx.fill();
        });

        canvasCtx.restore();
    }

    requestAnimationFrame(gameLoop);
}

// ==========================================
// CONFIG MEDIAPIPE AI HAND TRACKING
// ==========================================
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.4,
    minTrackingConfidence: 0.4
});

hands.onResults((results) => {
    if (loadingOverlay) loadingOverlay.style.display = 'none';

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        handData.isTracking = true;
        const landmarks = results.multiHandLandmarks[0];

        // SINKRONISASI CERMIN (PENTING):
        // Balikkan sumbu koordinat X (1 - pt.x) agar titik-titik kerangka mengunci 
        // dengan pas tepat di atas gambar video yang juga sudah di-mirror di atas.
        handData.allPoints = landmarks.map(pt => {
            return {
                x: (1 - pt.x) * canvasElement.width,
                y: pt.y * canvasElement.height
            };
        });

        handData.indexTip = handData.allPoints[8];
        handData.otherFingers = [
            handData.allPoints[4],  
            handData.allPoints[12], 
            handData.allPoints[16], 
            handData.allPoints[20]  
        ];

    } else {
        handData.isTracking = false;
        handData.allPoints = [];
    }
});

// ==========================================
// AKSES HARDWARE WEBCAM
// ==========================================
async function startWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, frameRate: { ideal: 30, max: 60 } },
            audio: false
        });
        videoElement.srcObject = stream;
        
        videoElement.addEventListener('loadeddata', () => {
            resizeCanvas();
            
            async function processFrame() {
                if (!videoElement.paused && !videoElement.ended) {
                    await hands.send({ image: videoElement });
                }
                requestAnimationFrame(processFrame);
            }
            processFrame();
            requestAnimationFrame(gameLoop);
        });
    } catch (err) {
        console.error("Gagal Mengakses Kamera Laptop:", err);
        alert("Mohon aktifkan izin kamera laptop Anda.");
    }
}

startWebcam();

// Tombol Main Lagi
restartBtn.addEventListener('click', () => {
    score = 0;
    lives = 3;
    isGameOver = false;
    updateStats();
    fruits.forEach(f => f.reset());
    gameOverPanel.style.display = 'none';
});