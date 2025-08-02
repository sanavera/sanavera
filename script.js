// Elementos del DOM
const searchModal = document.getElementById('search-modal');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const resultsCount = document.getElementById('results-count');
const albumList = document.getElementById('album-list');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const playerModal = document.getElementById('player-modal');
const closeModal = document.getElementById('close-modal');
const coverImage = document.getElementById('cover-image');
const songTitle = document.getElementById('song-title');
const songArtist = document.getElementById('song-artist');
const playlist = document.getElementById('playlist');
const audioPlayer = document.getElementById('audio-player');
const btnPlay = document.getElementById('btn-play');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnRepeat = document.getElementById('btn-repeat');
const btnShuffle = document.getElementById('btn-shuffle');
const btnDownload = document.getElementById('btn-download');
const progressBar = document.getElementById('progress-bar');
const progress = document.getElementById('progress');
const currentTime = document.getElementById('current-time');
const duration = document.getElementById('duration');
const favoritesModal = document.getElementById('favorites-modal');
const favoritesCloseModal = document.getElementById('favorites-close-modal');
const favoritesList = document.getElementById('favorites-list');
const floatingButton = document.getElementById('favorites-floating-button');

// Variables globales
let currentPlaylist = [];
let currentTrackIndex = 0;
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let isPlaying = false;
let isRepeat = false;
let isShuffle = false;

// Función para buscar álbumes en archive.org
async function searchAlbums(query) {
    albumList.innerHTML = '';
    resultsCount.textContent = 'Resultados: 0';
    loading.style.display = 'block';
    errorMessage.style.display = 'none';

    try {
        const response = await fetch(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:audio&fl[]=identifier,title,creator&sort[]=&sort[]=&sort[]=&rows=50&page=1&output=json`);
        const data = await response.json();

        loading.style.display = 'none';

        if (!data.response || !data.response.docs || data.response.docs.length === 0) {
            errorMessage.textContent = 'No se encontraron resultados.';
            errorMessage.style.display = 'block';
            resultsCount.textContent = 'Resultados: 0';
            return;
        }

        resultsCount.textContent = `Resultados: ${data.response.docs.length}`;
        data.response.docs.forEach(doc => {
            const albumItem = document.createElement('div');
            albumItem.classList.add('album-item');
            albumItem.innerHTML = `
                <img class="lazy-image" data-src="https://archive.org/services/img/${doc.identifier}" alt="${doc.title || 'Álbum'}">
                <div class="album-item-info">
                    <h3>${doc.title || 'Sin título'}</h3>
                    <p>${doc.creator ? doc.creator.join(', ') : 'Artista desconocido'}</p>
                </div>
            `;
            albumItem.addEventListener('click', () => loadAlbum(doc.identifier));
            albumList.appendChild(albumItem);
        });

        // Lazy loading de imágenes
        const lazyImages = document.querySelectorAll('.lazy-image');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            });
        });
        lazyImages.forEach(img => observer.observe(img));
    } catch (error) {
        loading.style.display = 'none';
        errorMessage.textContent = 'Error al buscar álbumes. Intenta de nuevo.';
        errorMessage.style.display = 'block';
        console.error('Error en la búsqueda:', error);
    }
}

// Cargar canciones de un álbum
async function loadAlbum(identifier) {
    try {
        const response = await fetch(`https://archive.org/metadata/${identifier}`);
        const data = await response.json();

        if (!data.files || !data.files.length) {
            errorMessage.textContent = 'No se encontraron canciones para este álbum.';
            errorMessage.style.display = 'block';
            return;
        }

        currentPlaylist = data.files
            .filter(file => file.format === 'MP3' || file.format === 'VBR MP3')
            .map(file => ({
                title: file.title || file.name,
                artist: data.metadata.creator ? data.metadata.creator.join(', ') : 'Artista desconocido',
                url: `https://archive.org/download/${identifier}/${file.name}`,
                cover: `https://archive.org/services/img/${identifier}`
            }));

        if (currentPlaylist.length === 0) {
            errorMessage.textContent = 'No se encontraron canciones MP3 en este álbum.';
            errorMessage.style.display = 'block';
            return;
        }

        currentTrackIndex = 0;
        searchModal.style.display = 'none';
        playerModal.style.display = 'flex';
        loadTrack(currentTrackIndex);
    } catch (error) {
        errorMessage.textContent = 'Error al cargar el álbum. Intenta de nuevo.';
        errorMessage.style.display = 'block';
        console.error('Error al cargar álbum:', error);
    }
}

// Cargar una canción específica
function loadTrack(index) {
    const track = currentPlaylist[index];
    if (!track) return;

    songTitle.textContent = track.title;
    songArtist.textContent = track.artist;
    coverImage.src = track.cover;
    audioPlayer.src = track.url;
    btnDownload.href = track.url;
    floatingButton.style.backgroundImage = `url(${track.cover})`;

    // Actualizar lista de reproducción
    playlist.innerHTML = '';
    currentPlaylist.forEach((song, i) => {
        const isFavorite = favorites.some(fav => fav.url === song.url);
        const playlistItem = document.createElement('div');
        playlistItem.classList.add('playlist-item');
        if (i === index) playlistItem.classList.add('active');
        playlistItem.innerHTML = `
            <img src="${song.cover}" alt="${song.title}">
            <div class="playlist-item-info">
                <h3>${song.title}</h3>
                <p>${song.artist}</p>
            </div>
            <button class="btn-favorite-song ${isFavorite ? 'active' : ''}" data-index="${i}">
                <i class="fas fa-heart"></i>
            </button>
        `;
        playlistItem.addEventListener('click', () => {
            currentTrackIndex = i;
            loadTrack(i);
            playTrack();
        });
        playlistItem.querySelector('.btn-favorite-song').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(song);
        });
        playlist.appendChild(playlistItem);
    });

    updateProgress();
}

// Reproducir canción
function playTrack() {
    audioPlayer.play();
    isPlaying = true;
    btnPlay.classList.add('playing');
}

// Pausar canción
function pauseTrack() {
    audioPlayer.pause();
    isPlaying = false;
    btnPlay.classList.remove('playing');
}

// Alternar reproducción
btnPlay.addEventListener('click', () => {
    if (isPlaying) {
        pauseTrack();
    } else {
        playTrack();
    }
});

// Canción anterior
btnPrev.addEventListener('click', () => {
    currentTrackIndex = (currentTrackIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    loadTrack(currentTrackIndex);
    playTrack();
});

// Canción siguiente
btnNext.addEventListener('click', () => {
    currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.length;
    loadTrack(currentTrackIndex);
    playTrack();
});

// Repetir
btnRepeat.addEventListener('click', () => {
    isRepeat = !isRepeat;
    audioPlayer.loop = isRepeat;
    btnRepeat.classList.toggle('active', isRepeat);
});

// Mezclar
btnShuffle.addEventListener('click', () => {
    isShuffle = !isShuffle;
    btnShuffle.classList.toggle('active', isShuffle);
    if (isShuffle) {
        shufflePlaylist();
    } else {
        currentPlaylist.sort((a, b) => a.title.localeCompare(b.title));
    }
    loadTrack(currentTrackIndex);
});

// Mezclar lista de reproducción
function shufflePlaylist() {
    for (let i = currentPlaylist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentPlaylist[i], currentPlaylist[j]] = [currentPlaylist[j], currentPlaylist[i]];
    }
}

// Actualizar barra de progreso
function updateProgress() {
    audioPlayer.addEventListener('timeupdate', () => {
        const current = audioPlayer.currentTime;
        const dur = audioPlayer.duration || 0;
        progress.style.width = `${(current / dur) * 100}%`;
        currentTime.textContent = formatTime(current);
        duration.textContent = formatTime(dur);
    });
}

// Formatear tiempo
function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// Barra de progreso clic
progressBar.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    audioPlayer.currentTime = pos * audioPlayer.duration;
});

// Cerrar modal del reproductor
closeModal.addEventListener('click', () => {
    playerModal.style.display = 'none';
    searchModal.style.display = 'flex';
    pauseTrack();
});

// Botón flotante para abrir el reproductor
floatingButton.addEventListener('click', () => {
    if (currentPlaylist.length > 0) {
        playerModal.style.display = 'flex';
        searchModal.style.display = 'none';
    }
});

// Gestionar favoritos
function toggleFavorite(song) {
    const index = favorites.findIndex(fav => fav.url === song.url);
    if (index === -1) {
        favorites.push(song);
    } else {
        favorites.splice(index, 1);
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateFavoritesList();
    loadTrack(currentTrackIndex); // Actualizar el ícono de favorito en la lista
}

// Actualizar lista de favoritos
function updateFavoritesList() {
    favoritesList.innerHTML = '';
    if (favorites.length === 0) {
        favoritesList.innerHTML = '<p class="no-favorites">No hay canciones favoritas.</p>';
        return;
    }
    favorites.forEach((song, i) => {
        const favoriteItem = document.createElement('div');
        favoriteItem.classList.add('favorites-item');
        favoriteItem.innerHTML = `
            <img src="${song.cover}" alt="${song.title}">
            <div class="favorites-item-info">
                <h3>${song.title}</h3>
                <p>${song.artist}</p>
            </div>
            <button class="btn-remove-favorite" data-index="${i}">
                <i class="fas fa-trash"></i>
            </button>
        `;
        favoriteItem.addEventListener('click', () => {
            currentPlaylist = [song];
            currentTrackIndex = 0;
            loadTrack(0);
            playerModal.style.display = 'flex';
            favoritesModal.style.display = 'none';
            playTrack();
        });
        favoriteItem.querySelector('.btn-remove-favorite').addEventListener('click', (e) => {
            e.stopPropagation();
            favorites.splice(i, 1);
            localStorage.setItem('favorites', JSON.stringify(favorites));
            updateFavoritesList();
        });
        favoritesList.appendChild(favoriteItem);
    });
}

// Abrir modal de favoritos
favoritesCloseModal.addEventListener('click', () => {
    favoritesModal.style.display = 'none';
    searchModal.style.display = 'flex';
});

// Evento de búsqueda
searchButton.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
        searchAlbums(query);
    }
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
            searchAlbums(query);
        }
    }
});

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    searchModal.style.display = 'flex';
    updateFavoritesList();
});
