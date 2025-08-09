// reproductor.js

let audio = new Audio();
let currentPlaylist = [];
let currentIndex = -1;
let isPlaying = false;

// Elementos del DOM
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const seekBar = document.getElementById('seekBar');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const coverImg = document.getElementById('coverImg');
const songTitle = document.getElementById('songTitle');
const songArtist = document.getElementById('songArtist');
const qualityMenu = document.getElementById('qualityMenu');
const qualityBtn = document.getElementById('qualityBtn');
const qualityBackdrop = document.getElementById('qualityBackdrop');

// Inicializa reproductor con una playlist
function initPlayer(playlist, startIndex = 0) {
    currentPlaylist = playlist;
    currentIndex = startIndex;
    loadSong(currentPlaylist[currentIndex]);
    playSong();
}

// Carga canción en el reproductor
function loadSong(song) {
    if (!song) return;

    audio.src = song.url;
    songTitle.textContent = cleanSongTitle(song.title);
    songArtist.textContent = song.artist || '';
    loadCoverImage(coverImg, song.cover, 'img/default.jpg');

    audio.addEventListener('loadedmetadata', () => {
        totalTimeEl.textContent = formatTime(audio.duration);
        seekBar.max = Math.floor(audio.duration);
    });

    highlightPlayingSong(document.querySelector(`[data-id="${song.id}"]`));
}

// Reproducir canción
function playSong() {
    audio.play();
    isPlaying = true;
    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
}

// Pausar canción
function pauseSong() {
    audio.pause();
    isPlaying = false;
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
}

// Cambiar estado de reproducción
playBtn.addEventListener('click', () => {
    if (isPlaying) {
        pauseSong();
    } else {
        playSong();
    }
});

// Canción anterior
prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
        currentIndex--;
        loadSong(currentPlaylist[currentIndex]);
        playSong();
    }
});

// Siguiente canción
nextBtn.addEventListener('click', () => {
    if (currentIndex < currentPlaylist.length - 1) {
        currentIndex++;
        loadSong(currentPlaylist[currentIndex]);
        playSong();
    }
});

// Actualizar seekbar y tiempo
audio.addEventListener('timeupdate', () => {
    seekBar.value = Math.floor(audio.currentTime);
    currentTimeEl.textContent = formatTime(audio.currentTime);
});

// Cambiar tiempo manualmente
seekBar.addEventListener('input', () => {
    audio.currentTime = seekBar.value;
});

// Al terminar la canción, pasar a la siguiente
audio.addEventListener('ended', () => {
    if (currentIndex < currentPlaylist.length - 1) {
        currentIndex++;
        loadSong(currentPlaylist[currentIndex]);
        playSong();
    } else {
        pauseSong();
    }
});

// Menú de calidad
qualityBtn.addEventListener('click', () => {
    qualityMenu.classList.toggle('show');
    qualityBackdrop.classList.toggle('show');
});

// Cerrar menú de calidad si clickeas fuera
qualityBackdrop.addEventListener('click', () => {
    qualityMenu.classList.remove('show');
    qualityBackdrop.classList.remove('show');
});

// Cambiar calidad
document.querySelectorAll('#qualityMenu button').forEach(btn => {
    btn.addEventListener('click', () => {
        let selectedQuality = btn.dataset.quality;
        console.log("Calidad seleccionada:", selectedQuality);
        qualityMenu.classList.remove('show');
        qualityBackdrop.classList.remove('show');

        // Aquí podríamos recargar la canción en HQ si está disponible
    });
});
