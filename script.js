const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');
const forgotLink = document.getElementById('forgot-password-link');
const forgotModal = document.getElementById('forgotModal');
const closeModal = document.getElementById('closeModal');
const sendReset = document.getElementById('sendReset');

// Buka Modal Forgot Password
forgotLink.addEventListener('click', (e) => {
    e.preventDefault();
    forgotModal.style.display = 'flex';
});

// Tutup Modal via Tombol Close
closeModal.addEventListener('click', () => {
    forgotModal.style.display = 'none';
});

// Logika Pengiriman Link Reset
sendReset.addEventListener('click', () => {
    const email = document.getElementById('resetEmail').value;

    if(email === ''){
        alert('Please enter your email');
    } else {
        alert(`Reset password link sent to ${email}`);
        forgotModal.style.display = 'none';
    }
});

// Animasi Switch Slide Form
registerBtn.addEventListener('click', () => {
    container.classList.add("active");
});

loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});

// ===================================================
// LOGIKA REDIRECT KE DASHBOARD
// ===================================================
document.addEventListener('DOMContentLoaded', () => {
    const signInForm = document.querySelector('.sign-in form');
    const signUpForm = document.querySelector('.sign-up form');

    if(signInForm) {
        signInForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Menghentikan reload halaman bawaan form
            
            // Mengamankan jeda sfx sebelum pindah halaman
            playClickSFX();
            setTimeout(() => {
                window.location.href = 'dashboard.html'; // Pindah ke Dashboard
            }, 150);
        });
    }

    if(signUpForm) {
        signUpForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Menghentikan reload halaman bawaan form
            
            playClickSFX();
            alert('Account created successfully!');
            window.location.href = 'dashboard.html'; // Pindah ke Dashboard setelah daftar
        });
    }
});

// ===================================================
// 🔊 SISTEM AUDIO GLOBAL UNTUK HALAMAN LOGIN
// ===================================================

// 1. Jalankan BGM otomatis setelah interaksi pertama user di halaman login
document.addEventListener('click', () => {
    const bgm = document.getElementById('login-bgm');
    if (bgm && bgm.paused) {
        bgm.volume = 0.5; // Set volume awal agak lembut (50%)
        bgm.play().catch(err => console.log("Autoplay musik diblokir:", err));
    }
}, { once: true }); // Berjalan sekali saja saat klik pertama

// 2. 🛠️ PERBAIKAN: Nama fungsi disamakan menjadi playClickSFX agar sinkron dengan HTML!
function playClickSFX() {
    const sfx = document.getElementById('login-sfx');
    if (sfx) {
        sfx.volume = 0.8; // Set volume efek suara tebal (80%)
        sfx.currentTime = 0; // Reset ke detik 0 agar bisa langsung berbunyi jika di-spam
        sfx.play().catch(err => console.log("Gagal memutar SFX:", err));
    } else {
        console.log("Elemen #login-sfx tidak ditemukan di HTML!");
    }
}