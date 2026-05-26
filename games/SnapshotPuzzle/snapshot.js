const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('gameCanvas');
const canvasCtx = canvasElement.getContext('2d');
const loadingOverlay = document.getElementById('loadingOverlay');
const cameraFlash = document.getElementById('cameraFlash');
const countdownDisplay = document.getElementById('countdownDisplay');
const endGamePanel = document.getElementById('endGamePanel');
const gameModeText = document.getElementById('gameModeText');
const timerValue = document.getElementById('timerValue');
const finalTime = document.getElementById('finalTime');
const restartBtn = document.getElementById('restartBtn');
const instructionText = document.getElementById('instructionText');

// Menggunakan Canvas memory tambahan untuk memotong gambar
const puzzleCanvas = document.createElement('canvas');
const puzzleCtx = puzzleCanvas.getContext('2d');

// Sistem State Manajemen Game
let gameState = "FRAMING"; 
let rawHandPoints = [];
let isTracking = false;
let handLandmarksRaw = []; 

// Data Kotak Pembingkaian Dinamis (Mengikuti Rasio Kamera Secara Fleksibel)
let cropX = 0, cropY = 0;
let dynamicWidth = 0;
let dynamicHeight = 0;

let pieces = [];
let selectedIndex = null; // Menampung indeks potongan yang sedang diangkat/dipegang

// Sistem Pengukur Waktu
let gameplayTimer = 0;
let timerInterval = null;
let countdownVal = 3;
let countdownInterval = null;

// Kursor Kontrol Navigasi Baru (Ujung Telunjuk & Jempol)
let cursorX = 0, cursorY = 0;
let thumbX = 0, thumbY = 0;
let targetCursorX = 0, targetCursorY = 0;
let targetThumbX = 0, targetThumbY = 0;
let isPinching = false; 
let pinchDistance = 100;

// Sistem Partikel Dot Jejak Pointer ala Fruit Ninja
let particles = [];
class TrailParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 6 + 4; 
        this.speedX = (Math.random() - 0.5) * 2;
        this.speedY = (Math.random() - 0.5) * 2;
        this.alpha = 1;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.alpha -= 0.04; 
        if (this.size > 0.2) this.size -= 0.1;
    }
    draw() {
        canvasCtx.save();
        canvasCtx.beginPath();
        canvasCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        canvasCtx.fillStyle = isPinching ? `rgba(34, 197, 94, ${this.alpha})` : `rgba(56, 189, 248, ${this.alpha})`;
        canvasCtx.shadowBlur = 10;
        canvasCtx.shadowColor = isPinching ? "#22c55e" : "#38bdf8";
        canvasCtx.fill();
        canvasCtx.restore();
    }
}

function handleParticles() {
    if (isTracking && gameState === "PLAYING") {
        particles.push(new TrailParticle(cursorX, cursorY));
    }
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].alpha <= 0) {
            particles.splice(i, 1);
            i--;
        }
    }
}

function resizeCanvas() {
    canvasElement.width = canvasElement.clientWidth;
    canvasElement.height = canvasElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class PuzzlePiece {
    constructor(id, correctX, correctY, imageBuffer) {
        this.id = id;
        this.correctX = correctX; 
        this.correctY = correctY;
        this.currentX = correctX; 
        this.currentY = correctY;
        this.img = imageBuffer;   
        
        // Properti animasi untuk efek terangkat
        this.scale = 1.0;
        this.targetScale = 1.0;
    }
}

function shufflePuzzle() {
    let positions = [];
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            positions.push({ x: c, y: r });
        }
    }
    for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    pieces.forEach((piece, index) => {
        piece.currentX = positions[index].x;
        piece.currentY = positions[index].y;
    });
}

function checkWinCondition() {
    let win = pieces.every(p => p.currentX === p.correctX && p.currentY === p.correctY);
    if (win) {
        gameState = "SOLVED";
        clearInterval(timerInterval);
        gameModeText.innerHTML = `<i class="fa-solid fa-trophy"></i> Fase: Sukses`;
        finalTime.textContent = `${gameplayTimer} detik`;
        endGamePanel.style.display = "flex";
    }
}

function captureFrameSnapshot() {
    gameState = "PLAYING";
    countdownDisplay.style.display = "none";
    
    cameraFlash.classList.add('flash-active');
    setTimeout(() => cameraFlash.classList.remove('flash-active'), 400);

    // KUNCI PERBAIKAN RASIO LANDSCAPE/PORTRAIT:
    // Konversi koordinat canvas layar game ke koordinat resolusi video asli webcam
    const scaleFactorX = videoElement.videoWidth / canvasElement.width;
    const scaleFactorY = videoElement.videoHeight / canvasElement.height;

    const videoCropX = cropX * scaleFactorX;
    const videoCropY = cropY * scaleFactorY;
    const videoCropW = dynamicWidth * scaleFactorX;
    const videoCropH = dynamicHeight * scaleFactorY;

    // Set ukuran canvas memory sama persis dengan hasil kalkulasi rasio video agar tidak terpotong
    puzzleCanvas.width = dynamicWidth;
    puzzleCanvas.height = dynamicHeight;

    puzzleCtx.save();
    // Efek mirror gambar disesuaikan secara presisi
    puzzleCtx.translate(dynamicWidth, 0);
    puzzleCtx.scale(-1, 1);
    
    // Ambil segmentasi langsung dari sumber video asli menggunakan koordinat konversi rasio video
    puzzleCtx.drawImage(
        videoElement, 
        videoElement.videoWidth - videoCropX - videoCropW, videoCropY, videoCropW, videoCropH, 
        0, 0, dynamicWidth, dynamicHeight
    );
    puzzleCtx.restore();

    pieces = [];
    let pSizeX = dynamicWidth / 3;
    let pSizeY = dynamicHeight / 3;
    
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            let segmentCanvas = document.createElement('canvas');
            segmentCanvas.width = pSizeX;
            segmentCanvas.height = pSizeY;
            let segmentCtx = segmentCanvas.getContext('2d');
            
            segmentCtx.drawImage(puzzleCanvas, c * pSizeX, r * pSizeY, pSizeX, pSizeY, 0, 0, pSizeX, pSizeY);
            
            let id = r * 3 + c;
            pieces.push(new PuzzlePiece(id, c, r, segmentCanvas));
        }
    }

    shufflePuzzle();
    
    gameplayTimer = 0;
    timerValue.textContent = gameplayTimer;
    gameModeText.innerHTML = `<i class="fa-solid fa-hand-back-fist"></i> Fase: Menyusun`;
    instructionText.innerHTML = `<i class="fa-solid fa-hand-pointer"></i> <strong>Cara Memindahkan:</strong> Rapatkan jempol & telunjuk untuk mengangkat puzzle, lalu geser tangan ke petak lain dan buka jari!`;
    
    timerInterval = setInterval(() => {
        gameplayTimer++;
        timerValue.textContent = gameplayTimer;
    }, 1000);
}

function startCountdown() {
    gameState = "COUNTDOWN";
    countdownVal = 3;
    countdownDisplay.textContent = countdownVal;
    countdownDisplay.style.display = "block";
    
    countdownInterval = setInterval(() => {
        countdownVal--;
        if (countdownVal > 0) {
            countdownDisplay.textContent = countdownVal;
        } else {
            clearInterval(countdownInterval);
            captureFrameSnapshot();
        }
    }, 1000);
}

function drawNeonSkeleton() {
    if (!isTracking || handLandmarksRaw.length === 0) return;

    const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],       
        [0, 5], [5, 6], [6, 7], [7, 8],       
        [5, 9], [9, 10], [10, 11], [11, 12],  
        [9, 13], [13, 14], [14, 15], [15, 16], 
        [13, 17], [17, 18], [18, 19], [19, 20], 
        [0, 17]                               
    ];

    handLandmarksRaw.forEach(hand => {
        canvasCtx.save();
        canvasCtx.strokeStyle = isPinching && gameState === "PLAYING" ? "#22c55e" : "#38bdf8";
        canvasCtx.lineWidth = 3;
        canvasCtx.shadowBlur = 10;
        canvasCtx.shadowColor = isPinching && gameState === "PLAYING" ? "#22c55e" : "#38bdf8";

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

        canvasCtx.save();
        canvasCtx.fillStyle = "#ffffff";
        hand.forEach(pt => {
            canvasCtx.beginPath();
            canvasCtx.arc((1 - pt.x) * canvasElement.width, pt.y * canvasElement.height, 4, 0, 2 * Math.PI);
            canvasCtx.fill();
        });
        canvasCtx.restore();
    });
}

function drawSinglePiece(piece, index, pSizeX, pSizeY) {
    let baseDrawX = cropX + piece.currentX * pSizeX;
    let baseDrawY = cropY + piece.currentY * pSizeY;
    
    piece.targetScale = (index === selectedIndex) ? 1.15 : 1.0;
    piece.scale += (piece.targetScale - piece.scale) * 0.2;

    canvasCtx.save();
    
    if (index === selectedIndex) {
        canvasCtx.shadowColor = "rgba(0, 0, 0, 0.75)";
        canvasCtx.shadowBlur = 30;
        canvasCtx.shadowOffsetX = 10;
        canvasCtx.shadowOffsetY = 15;

        canvasCtx.translate(baseDrawX + pSizeX / 2, baseDrawY + pSizeY / 2);
        canvasCtx.scale(piece.scale, piece.scale);
        canvasCtx.drawImage(piece.img, -pSizeX / 2, -pSizeY / 2);
        
        canvasCtx.strokeStyle = "#22c55e";
        canvasCtx.lineWidth = 4;
        canvasCtx.strokeRect(-pSizeX / 2, -pSizeY / 2, pSizeX, pSizeY);
    } else {
        canvasCtx.translate(baseDrawX + pSizeX / 2, baseDrawY + pSizeY / 2);
        canvasCtx.scale(piece.scale, piece.scale);
        canvasCtx.drawImage(piece.img, -pSizeX / 2, -pSizeY / 2);
        
        canvasCtx.strokeStyle = "#1e293b";
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeRect(-pSizeX / 2, -pSizeY / 2, pSizeX, pSizeY);
    }
    
    canvasCtx.restore();
}

function gameLoop() {
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        canvasCtx.save();
        canvasCtx.translate(canvasElement.width, 0);
        canvasCtx.scale(-1, 1);
        canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.restore();
    }

    if (gameState === "FRAMING" || gameState === "COUNTDOWN") {
        if (isTracking && rawHandPoints.length >= 10) {
            let minX = Math.min(...rawHandPoints.map(p => p.x));
            let maxX = Math.max(...rawHandPoints.map(p => p.x));
            let minY = Math.min(...rawHandPoints.map(p => p.y));
            let maxY = Math.max(...rawHandPoints.map(p => p.y));

            cropX = Math.max(0, minX - 20);
            cropY = Math.max(0, minY - 20);
            dynamicWidth = Math.min(canvasElement.width - cropX, (maxX - minX) + 40);
            dynamicHeight = Math.min(canvasElement.height - cropY, (maxY - minY) + 40);

            canvasCtx.strokeStyle = "#ffffff";
            canvasCtx.lineWidth = 4;
            canvasCtx.setLineDash([15, 10]); 
            canvasCtx.strokeRect(cropX, cropY, dynamicWidth, dynamicHeight);
            canvasCtx.setLineDash([]); 

            drawNeonSkeleton();

            if (gameState === "FRAMING" && dynamicWidth > 120 && dynamicHeight > 120) {
                startCountdown();
            }
        } else {
            cropX = (canvasElement.width - 300) / 2;
            cropY = (canvasElement.height - 300) / 2;
            dynamicWidth = 300;
            dynamicHeight = 300;

            canvasCtx.strokeStyle = "rgba(255, 255, 255, 0.25)";
            canvasCtx.lineWidth = 2;
            canvasCtx.strokeRect(cropX, cropY, dynamicWidth, dynamicHeight);
        }
        
        if (gameState === "COUNTDOWN" && (!isTracking || rawHandPoints.length < 10)) {
            clearInterval(countdownInterval);
            gameState = "FRAMING";
            countdownDisplay.style.display = "none";
        }
    }

    if (gameState === "PLAYING") {
        canvasCtx.fillStyle = "rgba(11, 15, 25, 0.85)";
        canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

        let pSizeX = dynamicWidth / 3;
        let pSizeY = dynamicHeight / 3;
        
        // LAYER 1 (PALING BAWAH): Gambar semua kepingan puzzle normal
        pieces.forEach((piece, index) => {
            if (index !== selectedIndex) {
                drawSinglePiece(piece, index, pSizeX, pSizeY);
            }
        });

        // LAYER 2 (TENGAH): Gambar kotak bidik hologram Cyan
        if (isTracking) {
            let gridC = Math.floor((cursorX - cropX) / pSizeX);
            let gridR = Math.floor((cursorY - cropY) / pSizeY);
            
            if (gridC >= 0 && gridC < 3 && gridR >= 0 && gridR < 3) {
                canvasCtx.save();
                canvasCtx.strokeStyle = isPinching ? "#38bdf8" : "rgba(255, 255, 255, 0.35)";
                canvasCtx.lineWidth = isPinching ? 4 : 2;
                if (isPinching) {
                    canvasCtx.shadowBlur = 15;
                    canvasCtx.shadowColor = "#38bdf8";
                }
                canvasCtx.strokeRect(cropX + gridC * pSizeX, cropY + gridR * pSizeY, pSizeX, pSizeY);
                canvasCtx.fillStyle = isPinching ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.04)";
                canvasCtx.fillRect(cropX + gridC * pSizeX, cropY + gridR * pSizeY, pSizeX, pSizeY);
                canvasCtx.restore();
            }
        }

        // LAYER 3 (PALING ATAS): Gambar potongan puzzle yang sedang diangkat
        if (selectedIndex !== null && pieces[selectedIndex]) {
            drawSinglePiece(pieces[selectedIndex], selectedIndex, pSizeX, pSizeY);
        }

        handleParticles();
        drawNeonSkeleton();

        if (isTracking) {
            let gridC = Math.floor((cursorX - cropX) / pSizeX);
            let gridR = Math.floor((cursorY - cropY) / pSizeY);

            // TAMPILAN INDIKATOR LASER PENGHUBUNG JARI
            canvasCtx.save();
            canvasCtx.beginPath();
            canvasCtx.moveTo(thumbX, thumbY);
            canvasCtx.lineTo(cursorX, cursorY);
            if (isPinching) {
                canvasCtx.strokeStyle = "#22c55e"; 
                canvasCtx.lineWidth = 3;
            } else if (pinchDistance < 60) {
                canvasCtx.strokeStyle = "#eab308"; 
                canvasCtx.lineWidth = 1.5;
            } else {
                canvasCtx.strokeStyle = "rgba(239, 68, 68, 0.3)"; 
                canvasCtx.lineWidth = 1;
            }
            canvasCtx.stroke();

            canvasCtx.beginPath();
            canvasCtx.arc(cursorX, cursorY, Math.max(12, pinchDistance * 0.4), 0, 2 * Math.PI);
            canvasCtx.strokeStyle = isPinching ? "#22c55e" : "#38bdf8";
            canvasCtx.lineWidth = 2;
            canvasCtx.stroke();

            canvasCtx.beginPath();
            canvasCtx.arc(cursorX, cursorY, 6, 0, 2 * Math.PI);
            canvasCtx.fillStyle = "#ffffff";
            canvasCtx.fill();

            canvasCtx.beginPath();
            canvasCtx.arc(thumbX, thumbY, 6, 0, 2 * Math.PI);
            canvasCtx.fillStyle = isPinching ? "#22c55e" : "rgba(255, 255, 255, 0.6)";
            canvasCtx.fill();
            canvasCtx.restore();

            if (gridC >= 0 && gridC < 3 && gridR >= 0 && gridR < 3) {
                let hoveredIndex = pieces.findIndex(p => p.currentX === gridC && p.currentY === gridR);
                
                if (isPinching && selectedIndex === null && hoveredIndex !== -1) {
                    selectedIndex = hoveredIndex; 
                }
            }

            if (!isPinching && selectedIndex !== null) {
                if (gridC >= 0 && gridC < 3 && gridR >= 0 && gridR < 3) {
                    let targetIndex = pieces.findIndex(p => p.currentX === gridC && p.currentY === gridR);
                    
                    if (targetIndex !== -1 && selectedIndex !== targetIndex) {
                        let tempX = pieces[selectedIndex].currentX;
                        let tempY = pieces[selectedIndex].currentY;
                        
                        pieces[selectedIndex].currentX = pieces[targetIndex].currentX;
                        pieces[selectedIndex].currentY = pieces[targetIndex].currentY;
                        
                        pieces[targetIndex].currentX = tempX;
                        pieces[targetIndex].currentY = tempY;

                        checkWinCondition();
                    }
                }
                selectedIndex = null; 
            }
        }
    }

    requestAnimationFrame(gameLoop);
}

// ==========================================
// PUSTAKA INTERFACES MEDIAPIPE HAND TRACKING
// ==========================================
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 2, 
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.65 
});

hands.onResults((results) => {
    if (loadingOverlay && loadingOverlay.style.display !== 'none') {
        loadingOverlay.style.display = 'none';
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        isTracking = true;
        handLandmarksRaw = results.multiHandLandmarks;
        
        rawHandPoints = [];
        results.multiHandLandmarks.forEach(hand => {
            hand.forEach(pt => {
                rawHandPoints.push({
                    x: (1 - pt.x) * canvasElement.width, 
                    y: pt.y * canvasElement.height
                });
            });
        });

        const hand = results.multiHandLandmarks[0];
        
        targetThumbX = (1 - hand[4].x) * canvasElement.width;
        targetThumbY = hand[4].y * canvasElement.height;
        
        targetCursorX = (1 - hand[8].x) * canvasElement.width;
        targetCursorY = hand[8].y * canvasElement.height;

        let filterWeight = (selectedIndex !== null) ? 0.35 : 0.16;

        cursorX += (targetCursorX - cursorX) * filterWeight;
        cursorY += (targetCursorY - cursorY) * filterWeight;
        thumbX += (targetThumbX - thumbX) * filterWeight;
        thumbY += (targetThumbY - thumbY) * filterWeight;

        pinchDistance = Math.sqrt(Math.pow(thumbX - cursorX, 2) + Math.pow(thumbY - cursorY, 2));

        if (selectedIndex !== null) {
            if (pinchDistance > 52) isPinching = false;
            else isPinching = true;
        } else {
            if (pinchDistance < 38) isPinching = true;
            else isPinching = false;
        }

    } else {
        isTracking = false;
        isPinching = false;
        rawHandPoints = [];
        handLandmarksRaw = [];
    }
});

// ==========================================
// KONEKSI HARDWARE KAMERA WEBCAM
// ==========================================
async function startWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } }, // Menggunakan resolusi HD agar fleksibel di landscape
            audio: false
        });
        videoElement.srcObject = stream;
        videoElement.addEventListener('loadedmetadata', () => {
            videoElement.play(); 
            resizeCanvas();
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            async function processFrame() {
                if (!videoElement.paused && !videoElement.ended) {
                    try { await hands.send({ image: videoElement }); } catch (e) {}
                }
                setTimeout(processFrame, 15); 
            }
            processFrame();
            requestAnimationFrame(gameLoop);
        });
    } catch (err) {
        console.error("Gagal Akses Kamera:", err);
    }
}
startWebcam();

restartBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    gameState = "FRAMING";
    gameModeText.innerHTML = `<i class="fa-solid fa-camera"></i> Fase: Pembingkaian`;
    instructionText.innerHTML = `<i class="fa-solid fa-circle-info"></i> <strong>Cara Bermain:</strong> Satukan tangan kanan & kiri untuk membuat bingkai persegi panjang guna memotret objek puzzle.`;
    timerValue.textContent = "00";
    endGamePanel.style.display = "none";
    particles = [];
});