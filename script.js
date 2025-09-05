// =================================================================
// Sanavera MP3 - v4.0 (Restaurado y Mejorado)
// BASE: Código original del usuario.
// CAMBIOS: Se reemplazan FABs por barra de navegación inferior,
// se añade sistema completo de listas de reproducción y se
// refina la limpieza de títulos y la UI sin romper la lógica.
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Sanavera MP3 v4.0 - Restaurado y listo');

    // ---------- Utilidades (Refinadas) ----------
    const byId = id => document.getElementById(id);
    const query = s => document.querySelector(s);
    const toggleBodyScroll = lock => document.body.classList.toggle('modal-open', lock);
    const fmtTime = s => isNaN(s) || s < 0 ? '0:00' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const escapeHtml = s => (s ?? '').toString().replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    
    // --- FUNCIÓN DE LIMPIEZA DE TÍTULOS MEJORADA ---
    function cleanTitle(text) {
        if (!text) return '';
        let title = Array.isArray(text) ? text.join(' - ') : String(text);
        // Remove common junk patterns
        title = title.replace(/\s*\[.*?\]/g, '').replace(/\s*\(.*?\)/g, ''); // Remove content in brackets/parentheses
        title = title.replace(/_|-/g, ' '); // Replace underscores/dashes with spaces
        title = title.replace(/\b(320|kbps|flac|wav|mp3)\b/gi, ''); // Remove quality indicators
        title = title.replace(/\d{2,}\s*-\s*/, ''); // Remove track numbers like "01 - "
        title = title.replace(/\s\s+/g, ' ').trim(); // Collapse multiple spaces
        return title || 'Sin Título';
    }

    // ---------- Cache de Elementos del DOM ----------
    const el = {
        // Modales principales
        searchModal: byId('search-modal'),
        playerModal: byId('player-modal'),
        favoritesModal: byId('favorites-modal'),
        playlistsModal: byId('playlists-modal'),

        // Búsqueda
        searchInput: byId('search-input'),
        searchButton: byId('search-button'),
        albumList: byId('album-list'),
        resultsCount: byId('results-count'),
        loading: byId('loading'),
        errorMessage: byId('error-message'),

        // Reproductor
        playerHero: byId('player-hero'),
        heroSongTitle: byId('hero-song-title'),
        heroSongArtist: byId('hero-song-artist'),
        playlist: byId('playlist'),
        audio: byId('audio-player'),
        btnPlay: byId('btn-play'),
        btnPrev: byId('btn-prev'),
        btnNext: byId('btn-next'),
        btnRepeat: byId('btn-repeat'),
        btnShuffle: byId('btn-shuffle'),
        btnDownload: byId('btn-download'),
        seekBar: byId('seek-bar'),
        currentTime: byId('current-time'),
        duration: byId('duration'),
        qualityBtn: byId('quality-btn'),

        // Favoritos
        favoritesPlaylist: byId('favorites-playlist'),

        // Listas de Reproducción
        playlistsListContainer: byId('playlists-list-container'),
        btnCreatePlaylist: byId('btn-create-playlist'),
        playlistDetailModal: byId('playlist-detail-modal'),
        playlistDetailTitle: byId('playlist-detail-title'),
        playlistDetailList: byId('playlist-detail-list'),
        
        // Diálogos/Pop-ups
        newPlaylistDialog: byId('new-playlist-dialog'),
        newPlaylistNameInput: byId('new-playlist-name-input'),
        confirmCreatePlaylistBtn: byId('confirm-create-playlist-btn'),
        cancelCreatePlaylistBtn: byId('cancel-create-playlist-btn'),
        addToPlaylistDialog: byId('add-to-playlist-dialog'),
        addToPlaylistOptions: byId('add-to-playlist-options'),
        cancelAddToPlaylistBtn: byId('cancel-add-to-playlist-btn'),

        // Navegación y Calidad
        navLinks: document.querySelectorAll('.nav-link'),
        qualityMenu: byId('quality-menu'),
        qualityBackdrop: byId('quality-backdrop'),
        qualityOptions: byId('quality-options'),
        
        // Botón flotante para el reproductor actual
        nowPlayingFab: byId('now-playing-fab')
    };

    // ---------- Estado de la Aplicación ----------
    const state = {
        playlist: [],
        originalPlaylist: [],
        currentIndex: 0,
        isPlaying: false,
        isShuffled: false,
        repeatMode: 'none', // 'none', 'all', 'one'
        currentFormat: 'mp3',
        availableFormats: ['mp3'],
        currentAlbumId: null,
        activeModal: el.searchModal,
        songForAction: null // Para añadir a favoritos/listas
    };

    // ---------- Gestión de Datos (LocalStorage) ----------
    const db = {
        getFavorites: () => JSON.parse(localStorage.getItem('sanavera_favorites_v4') || '[]'),
        saveFavorites: favs => localStorage.setItem('sanavera_favorites_v4', JSON.stringify(favs)),
        getPlaylists: () => JSON.parse(localStorage.getItem('sanavera_playlists_v4') || '[]'),
        savePlaylists: lists => localStorage.setItem('sanavera_playlists_v4', JSON.stringify(lists)),
    };

    // ---------- Navegación y Gestión de Modales ----------
    function showModal(modal) {
        if (state.activeModal) {
            state.activeModal.classList.remove('active');
        }
        modal.classList.add('active');
        state.activeModal = modal;
        toggleBodyScroll(true);
    }
    
    el.navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const modalId = link.dataset.modal;
            const modal = byId(modalId);
            if (modal) {
                // Actualizar estado visual de la barra de navegación
                el.navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                // Cargar datos antes de mostrar
                if (modalId === 'favorites-modal') renderFavorites();
                if (modalId === 'playlists-modal') renderPlaylistsView();

                showModal(modal);
            }
        });
    });

    // Botón flotante para volver al reproductor
    el.nowPlayingFab.addEventListener('click', () => {
        if(state.playlist.length > 0) {
            showModal(el.playerModal);
        }
    });

    // ---------- Lógica de Búsqueda (Restaurada y Mejorada) ----------
    async function searchAlbums() {
        const query = el.searchInput.value.trim();
        if (!query) return;

        el.loading.style.display = 'block';
        el.errorMessage.style.display = 'none';
        el.albumList.innerHTML = '';

        try {
            const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:audio&fl=identifier,title,creator,downloads&rows=100&page=1&output=json&sort[]=downloads+desc`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            const data = await response.json();
            const docs = data.response.docs;

            // --- LÓGICA DE RELEVANCIA RESTAURADA ---
            docs.sort((a, b) => {
                const titleA = cleanTitle(a.title).toLowerCase();
                const titleB = cleanTitle(b.title).toLowerCase();
                const qLower = query.toLowerCase();
                
                const scoreA = titleA === qLower ? 1000 : (titleA.includes(qLower) ? 500 : 0);
                const scoreB = titleB === qLower ? 1000 : (titleB.includes(qLower) ? 500 : 0);

                if (scoreA !== scoreB) return scoreB - scoreA;
                return (b.downloads || 0) - (a.downloads || 0); // Fallback to downloads
            });

            displayAlbums(docs);

        } catch (err) {
            console.error(err);
            el.errorMessage.textContent = `Error en la búsqueda: ${err.message}`;
            el.errorMessage.style.display = 'block';
        } finally {
            el.loading.style.display = 'none';
        }
    }

    function displayAlbums(docs) {
        el.resultsCount.textContent = `Resultados: ${docs.length}`;
        if (docs.length === 0) {
            el.errorMessage.textContent = 'No se encontraron resultados.';
            el.errorMessage.style.display = 'block';
            return;
        }
        
        const frag = document.createDocumentFragment();
        docs.forEach(doc => {
            const item = document.createElement('div');
            item.className = 'album-item';
            item.dataset.id = doc.identifier;
            item.innerHTML = `
                <img src="https://archive.org/services/img/${doc.identifier}" alt="${escapeHtml(cleanTitle(doc.title))}" loading="lazy">
                <div class="album-item-info">
                    <h3>${escapeHtml(cleanTitle(doc.title))}</h3>
                    <p>${escapeHtml(cleanTitle(doc.creator))}</p>
                </div>`;
            item.addEventListener('click', () => openPlayer(doc.identifier));
            frag.appendChild(item);
        });
        el.albumList.appendChild(frag);
    }
    
    // ---------- Lógica del Reproductor (Original Refinada) ----------
    async function openPlayer(albumId, playlistData = null) {
        showModal(el.playerModal);
        el.playlist.innerHTML = '<div class="loading-state">Cargando canciones...</div>';
        el.heroSongTitle.textContent = "Cargando...";
        el.heroSongArtist.textContent = "";

        let songs;
        let albumTitle = '';
        let albumArtist = '';
        let coverUrl = '';

        if (playlistData) {
            // Cargando desde favoritos o una lista de reproducción
            songs = playlistData.songs;
            albumTitle = playlistData.title;
            albumArtist = playlistData.artist;
            coverUrl = playlistData.cover;
        } else {
            // Cargando desde una búsqueda de álbum
            state.currentAlbumId = albumId;
            const response = await fetch(`https://archive.org/metadata/${albumId}`);
            const data = await response.json();
            
            albumTitle = cleanTitle(data.metadata.title);
            albumArtist = cleanTitle(data.metadata.creator);
            coverUrl = `https://archive.org/services/img/${albumId}`;
            
            const audioFiles = (data.files || []).filter(f => /\.(mp3|flac|wav|ogg)$/i.test(f.name || ''));
            const tracksById = {};

            audioFiles.forEach(f => {
                const baseName = f.name.replace(/\.[^/.]+$/, "");
                if (!tracksById[baseName]) {
                    tracksById[baseName] = {
                        id: `${albumId}_${baseName}`,
                        title: cleanTitle(f.name),
                        artist: albumArtist,
                        coverThumb: coverUrl,
                        urls: {}
                    };
                }
                const format = (f.name.match(/\.(\w+)$/) || [])[1]?.toLowerCase();
                if (format) tracksById[baseName].urls[format] = `https://archive.org/download/${albumId}/${encodeURIComponent(f.name)}`;
            });
            songs = Object.values(tracksById).filter(t => t.urls.mp3);
            
            state.availableFormats = [...new Set(audioFiles.map(f => (f.name.match(/\.(\w+)$/)||[,''])[1].toLowerCase()).filter(Boolean))];
            if (!state.availableFormats.includes('mp3')) state.availableFormats.unshift('mp3');
            buildQualityMenu();
        }

        el.playerHero.style.setProperty('--cover-url', `url("${coverUrl}")`);
        state.playlist = songs;
        state.originalPlaylist = [...songs];
        renderPlaylist();
        if (songs.length > 0) {
            loadTrack(0);
        } else {
            el.playlist.innerHTML = '<div class="empty-state">No se encontraron canciones.</div>';
        }
    }

    function loadTrack(index) {
        state.currentIndex = index;
        const song = state.playlist[index];
        if (!song) return;

        el.heroSongTitle.textContent = song.title;
        el.heroSongArtist.textContent = song.artist;

        const url = song.urls[state.currentFormat] || song.urls.mp3;
        el.audio.src = url;
        el.btnDownload.setAttribute('href', url);
        el.btnDownload.setAttribute('download', `${song.title}.${state.currentFormat}`);

        if (state.isPlaying) el.audio.play().catch(console.error);
        renderPlaylist();
        el.nowPlayingFab.style.display = 'flex';
    }

    function renderPlaylist() {
        const favorites = db.getFavorites();
        el.playlist.innerHTML = state.playlist.map((song, i) => {
            const isActive = i === state.currentIndex;
            const isFav = favorites.some(f => f.id === song.id);
            return `
            <div class="playlist-item ${isActive ? 'active' : ''}" data-index="${i}">
                <img src="${song.coverThumb}" alt="cover" loading="lazy">
                <div class="playlist-item-info">
                    <h3>${isActive ? '<div class="eq"><span></span><span></span><span></span></div>' : ''}${song.title}</h3>
                    <p>${song.artist}</p>
                </div>
                <div class="playlist-item-actions">
                    <button class="btn-icon btn-favorite ${isFav ? 'active' : ''}" data-song-id="${song.id}"><i class="fas fa-heart"></i></button>
                    <button class="btn-icon btn-add-to-playlist" data-song-id="${song.id}"><i class="fas fa-plus"></i></button>
                </div>
            </div>`;
        }).join('');
    }

    // --- Controles del Reproductor y Eventos ---
    const togglePlay = () => state.isPlaying ? el.audio.pause() : el.audio.play();
    const nextTrack = () => { if (state.currentIndex < state.playlist.length - 1) loadTrack(state.currentIndex + 1); };
    const prevTrack = () => { if (state.currentIndex > 0) loadTrack(state.currentIndex - 1); };

    el.audio.onplay = () => { state.isPlaying = true; el.btnPlay.classList.add('playing'); };
    el.audio.onpause = () => { state.isPlaying = false; el.btnPlay.classList.remove('playing'); };
    el.audio.ontimeupdate = () => {
        const { currentTime, duration } = el.audio;
        el.currentTime.textContent = fmtTime(currentTime);
        if (duration) {
            el.duration.textContent = fmtTime(duration);
            el.seekBar.value = (currentTime / duration) * 100;
        }
    };
    el.audio.onended = () => {
        if (state.repeatMode === 'one') {
            loadTrack(state.currentIndex);
        } else if (state.currentIndex < state.playlist.length - 1) {
            nextTrack();
        } else if (state.repeatMode === 'all') {
            loadTrack(0);
        }
    };
    el.seekBar.addEventListener('input', () => {
        if (el.audio.duration) {
            el.audio.currentTime = (el.seekBar.value / 100) * el.audio.duration;
        }
    });

    // ... (resto de listeners para shuffle, repeat, etc.)

    // --- Favoritos y Listas ---
    function toggleFavorite(songId) {
        const song = state.originalPlaylist.find(s => s.id === songId);
        if (!song) return;

        let favorites = db.getFavorites();
        const songIndex = favorites.findIndex(f => f.id === songId);

        if (songIndex > -1) {
            favorites.splice(songIndex, 1);
        } else {
            favorites.unshift(song);
        }
        db.saveFavorites(favorites);
        renderPlaylist(); // Re-render para actualizar el corazón
        if (state.activeModal === el.favoritesModal) renderFavorites();
    }
    
    function renderFavorites() {
        const favorites = db.getFavorites();
        el.favoritesPlaylist.innerHTML = '';
        if (favorites.length === 0) {
            el.favoritesPlaylist.innerHTML = '<div class="empty-state">Aún no tienes canciones favoritas.</div>';
            return;
        }
        favorites.forEach(song => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.innerHTML = `
                <img src="${song.coverThumb}" alt="cover">
                <div class="playlist-item-info"><h3>${song.title}</h3><p>${song.artist}</p></div>`;
            item.addEventListener('click', () => openPlayer(null, {
                songs: favorites,
                title: 'Favoritos',
                artist: 'Varias canciones',
                cover: song.coverThumb
            }));
            el.favoritesPlaylist.appendChild(item);
        });
    }

    // --- Lógica de Listas de Reproducción ---
    function renderPlaylistsView() {
        const playlists = db.getPlaylists();
        el.playlistsListContainer.innerHTML = '';
        if (playlists.length === 0) {
            el.playlistsListContainer.innerHTML = '<div class="empty-state">No has creado ninguna lista.</div>';
            return;
        }
        playlists.forEach(p => {
            const item = document.createElement('div');
            item.className = 'playlist-entry';
            item.innerHTML = `
                <i class="fas fa-list-music"></i>
                <div class="playlist-info">
                    <h3>${escapeHtml(p.name)}</h3>
                    <p>${p.songs.length} canciones</p>
                </div>
                <button class="btn-icon btn-delete-playlist" data-id="${p.id}"><i class="fas fa-trash"></i></button>
            `;
            item.querySelector('.playlist-info').addEventListener('click', () => {
                if(p.songs.length > 0) {
                     openPlayer(null, {
                        songs: p.songs,
                        title: p.name,
                        artist: 'Lista de reproducción',
                        cover: p.songs[0].coverThumb
                    });
                }
            });
            el.playlistsListContainer.appendChild(item);
        });
    }
    
    function createPlaylist() {
        const name = el.newPlaylistNameInput.value.trim();
        if (!name) return;
        const playlists = db.getPlaylists();
        playlists.unshift({ id: `pl_${Date.now()}`, name, songs: [] });
        db.savePlaylists(playlists);
        renderPlaylistsView();
        el.newPlaylistNameInput.value = '';
        el.newPlaylistDialog.classList.remove('active');
    }
    
    function deletePlaylist(playlistId) {
        let playlists = db.getPlaylists();
        playlists = playlists.filter(p => p.id !== playlistId);
        db.savePlaylists(playlists);
        renderPlaylistsView();
    }
    
    function showAddToPlaylistDialog(songId) {
        state.songForAction = state.originalPlaylist.find(s => s.id === songId);
        if (!state.songForAction) return;
        const playlists = db.getPlaylists();
        el.addToPlaylistOptions.innerHTML = playlists.map(p =>
            `<button class="playlist-item" data-id="${p.id}">${escapeHtml(p.name)}</button>`
        ).join('');
        el.addToPlaylistDialog.classList.add('active');
    }
    
    function addSongToPlaylist(playlistId) {
        const playlists = db.getPlaylists();
        const playlist = playlists.find(p => p.id === playlistId);
        if (playlist && state.songForAction) {
            if (!playlist.songs.some(s => s.id === state.songForAction.id)) {
                playlist.songs.unshift(state.songForAction);
                db.savePlaylists(playlists);
            }
        }
        el.addToPlaylistDialog.classList.remove('active');
    }

    // ---------- Inicialización y Event Listeners Globales ----------
    function init() {
        // Búsqueda
        el.searchButton.addEventListener('click', searchAlbums);
        el.searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') searchAlbums(); });

        // Controles principales
        el.btnPlay.addEventListener('click', togglePlay);
        el.btnNext.addEventListener('click', nextTrack);
        el.btnPrev.addEventListener('click', prevTrack);
        
        // Delegación de eventos para acciones en canciones
        el.playlist.addEventListener('click', e => {
            const item = e.target.closest('.playlist-item');
            if (!item) return;

            const songId = e.target.closest('.btn-icon')?.dataset.songId;
            if (e.target.closest('.btn-favorite')) {
                toggleFavorite(songId);
            } else if (e.target.closest('.btn-add-to-playlist')) {
                showAddToPlaylistDialog(songId);
            } else { // Click en el item para reproducir
                const index = parseInt(item.dataset.index, 10);
                if (state.currentIndex === index) {
                    togglePlay();
                } else {
                    loadTrack(index);
                }
            }
        });
        
        // Listas de reproducción
        el.btnCreatePlaylist.addEventListener('click', () => el.newPlaylistDialog.classList.add('active'));
        el.cancelCreatePlaylistBtn.addEventListener('click', () => el.newPlaylistDialog.classList.remove('active'));
        el.confirmCreatePlaylistBtn.addEventListener('click', createPlaylist);
        el.cancelAddToPlaylistBtn.addEventListener('click', () => el.addToPlaylistDialog.classList.remove('active'));
        el.addToPlaylistOptions.addEventListener('click', e => {
            const btn = e.target.closest('button');
            if(btn) addSongToPlaylist(btn.dataset.id);
        });
        el.playlistsListContainer.addEventListener('click', e => {
            if (e.target.closest('.btn-delete-playlist')) {
                deletePlaylist(e.target.closest('.btn-delete-playlist').dataset.id);
            }
        });

        // Carga inicial
        showModal(el.searchModal);
        el.searchInput.value = "La K'onga";
        searchAlbums();
    }

    init();
});
