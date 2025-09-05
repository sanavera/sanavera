// =================================================================
// Sanavera MP3 - v3.0 (FIX DEFINITIVO Y COMPLETO)
// Autor: Sebastián Sanavera (con asistencia de IA)
// Descripción: Lógica robusta que restaura la funcionalidad
// original y añade gestión completa de playlists.
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Sanavera MP3 v3.0 - ¡Listo!');

    const byId = id => document.getElementById(id);
    const query = (s, p = document) => p.querySelector(s);
    const queryAll = (s, p = document) => p.querySelectorAll(s);

    // --- Utilidades ---
    const fmtTime = s => isNaN(s) || s < 0 ? '0:00' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const escapeHtml = s => (s ?? '').toString().replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    const truncate = (t, n) => t.length > n ? t.slice(0, n - 1) + '…' : t;
    
    // --- Lógica de Limpieza de Títulos ---
    const normalizeCreator = c => Array.isArray(c) ? c.join(', ') : (c || 'Artista Desconocido');
    const normalizeAlbumTitle = t => {
        let title = Array.isArray(t) ? t.join(' - ') : (t || 'Álbum Desconocido');
        return title.replace(/\[.*?\]/g, '').replace(/\(..?\)/g, '').trim();
    };
    function extractSongTitle(fileName, albumTitle) {
        let cleanName = fileName.replace(/\.(mp3|flac|wav|ogg)$/i, '').replace(/_/g, ' ');
        cleanName = cleanName.replace(/^\d+\s*[-.]?\s*/, ''); // Remove track numbers like 01., 02 -, etc.
        if (albumTitle) {
            cleanName = cleanName.replace(new RegExp(escapeRegExp(albumTitle), 'ig'), '');
        }
        return cleanName.trim() || fileName;
    }
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // --- Estado de la Aplicación ---
    const state = {
        currentQueue: [],
        originalQueue: [],
        currentIndex: -1,
        isPlaying: false,
        isShuffled: false,
        repeatMode: 'none', // 'none', 'all', 'one'
        currentFormat: 'mp3',
        activeModal: null,
        songForAction: null,
    };

    // --- Elementos del DOM ---
    const el = {
        // Modales
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
        // Reproductor (elementos compartidos)
        audio: byId('audio-player'),
        songTitle: byId('song-title'),
        songArtist: byId('song-artist'),
        seekBar: byId('seek-bar'),
        currentTime: byId('current-time'),
        duration: byId('duration'),
        btnPlay: byId('btn-play'),
        btnNext: byId('btn-next'),
        btnPrev: byId('btn-prev'),
        btnRepeat: byId('btn-repeat'),
        btnShuffle: byId('btn-shuffle'),
        btnDownload: byId('btn-download'),
        qualityBtn: byId('quality-btn'),
        fabPlayer: byId('fab-player'),
        // Player específico
        playerBg: byId('player-bg'),
        playerCoverThumb: byId('player-cover-thumbnail'),
        playerAlbumTitle: byId('player-album-title'),
        playerAlbumArtist: byId('player-album-artist'),
        playerPlaylist: byId('player-playlist'),
        // Favoritos específico
        favoritesBg: byId('favorites-bg'),
        favoritesPlaylist: byId('favorites-playlist'),
        // Listas
        playlistsListContainer: byId('playlists-list-container'),
        btnNewPlaylist: byId('btn-new-playlist'),
        // Diálogos
        newPlaylistDialog: byId('new-playlist-dialog'),
        newPlaylistName: byId('new-playlist-name'),
        confirmNewPlaylist: byId('confirm-new-playlist'),
        cancelNewPlaylist: byId('cancel-new-playlist'),
        addToPlaylistDialog: byId('add-to-playlist-dialog'),
        addToPlaylistOptions: byId('add-to-playlist-options'),
        cancelAddToPlaylist: byId('cancel-add-to-playlist'),
        // Menú calidad
        qualityMenu: byId('quality-menu'),
        qualityBackdrop: byId('quality-backdrop'),
        qualityOptions: byId('quality-options'),
    };
    
    // --- Gestión de Datos (LocalStorage) ---
    const db = {
        get: (key, def = []) => JSON.parse(localStorage.getItem(key)) || def,
        set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
    };

    // --- Gestión de Modales ---
    function showModal(modal) {
        modal.classList.add('active');
        document.body.classList.add('modal-open');
        state.activeModal = modal;
    }
    function hideModal(modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
        if (state.activeModal === modal) state.activeModal = null;
    }

    // --- Lógica de Búsqueda ---
    async function searchAlbums() {
        const query = el.searchInput.value.trim();
        if (!query) return;
        el.loading.style.display = 'block';
        el.albumList.innerHTML = '';
        try {
            const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:audio&fl=identifier,title,creator&rows=100&output=json&sort[]=downloads+desc`;
            const res = await fetch(url);
            const data = await res.json();
            const docs = data.response.docs;

            // --- LÓGICA DE RELEVANCIA RESTAURADA ---
            const relevance = doc => {
                const t = normalizeAlbumTitle(doc.title).toLowerCase();
                const q = query.toLowerCase();
                let score = 0;
                if (t === q) score = 300;
                else if (t.includes(q)) score = 150 + (doc.downloads || 0) / 1000;
                return score;
            };
            docs.sort((a, b) => relevance(b) - relevance(a));
            
            displayAlbums(docs);
        } catch (err) {
            console.error(err);
        } finally {
            el.loading.style.display = 'none';
        }
    }

    function displayAlbums(docs) {
        el.resultsCount.textContent = `Resultados: ${docs.length}`;
        el.albumList.innerHTML = docs.map(doc => {
            const title = normalizeAlbumTitle(doc.title);
            const artist = normalizeCreator(doc.creator);
            return `
            <div class="album-item" data-id="${doc.identifier}" data-title="${escapeHtml(title)}" data-artist="${escapeHtml(artist)}">
                <img src="https://archive.org/services/img/${doc.identifier}" alt="${escapeHtml(title)}" loading="lazy">
                <div class="album-item-info">
                    <h3>${escapeHtml(truncate(title, 40))}</h3>
                    <p>${escapeHtml(truncate(artist, 30))}</p>
                </div>
            </div>`;
        }).join('');
    }

    // --- Lógica del Reproductor ---
    function playQueue(queue, index) {
        state.originalQueue = [...queue];
        state.currentQueue = [...queue];
        state.isShuffled = false;
        updateShuffleButton();
        loadTrack(index, true);
        el.fabPlayer.style.display = 'flex';
    }

    function loadTrack(index, autoplay = false) {
        if (index < 0 || index >= state.currentQueue.length) return;
        state.currentIndex = index;
        const song = state.currentQueue[index];
        const url = song.urls[state.currentFormat] || song.urls.mp3;
        el.audio.src = url;
        el.btnDownload.href = url;
        el.btnDownload.download = `${song.title}.${state.currentFormat}`;
        updatePlayerUI();
        renderActivePlaylist();
        if (autoplay) play();
    }

    function play() { el.audio.play().catch(console.error); }
    function pause() { el.audio.pause(); }
    function togglePlay() { state.isPlaying ? pause() : play(); }

    el.audio.onplay = () => { state.isPlaying = true; el.btnPlay.classList.add('playing'); };
    el.audio.onpause = () => { state.isPlaying = false; el.btnPlay.classList.remove('playing'); };
    el.audio.ontimeupdate = () => {
        const { currentTime, duration } = el.audio;
        el.currentTime.textContent = fmtTime(currentTime);
        if (!isNaN(duration)) {
            el.duration.textContent = fmtTime(duration);
            el.seekBar.value = (currentTime / duration) * 100 || 0;
        }
    };
    el.audio.onended = () => {
        if (state.repeatMode === 'one') loadTrack(state.currentIndex, true);
        else if (state.currentIndex < state.currentQueue.length - 1) nextTrack();
        else if (state.repeatMode === 'all') loadTrack(0, true);
    };
    el.seekBar.addEventListener('input', () => {
        if (!isNaN(el.audio.duration)) el.audio.currentTime = (el.seekBar.value / 100) * el.audio.duration;
    });
    
    const nextTrack = () => loadTrack(state.currentIndex + 1, true);
    const prevTrack = () => loadTrack(state.currentIndex - 1, true);
    
    function toggleShuffle() {
        state.isShuffled = !state.isShuffled;
        const currentSong = state.currentQueue[state.currentIndex];
        if (state.isShuffled) {
            state.currentQueue = [...state.originalQueue].sort(() => Math.random() - 0.5);
        } else {
            state.currentQueue = [...state.originalQueue];
        }
        state.currentIndex = state.currentQueue.findIndex(s => s.id === currentSong.id);
        updateShuffleButton();
        renderActivePlaylist();
    }

    function toggleRepeat() {
        const modes = ['none', 'all', 'one'];
        state.repeatMode = modes[(modes.indexOf(state.repeatMode) + 1) % 3];
        updateRepeatButton();
    }
    
    function updatePlayerUI() {
        const song = state.currentQueue[state.currentIndex];
        if (!song) return;
        el.songTitle.textContent = song.title;
        el.songArtist.textContent = song.artist;
    }
    
    function updateShuffleButton() { el.btnShuffle.classList.toggle('active', state.isShuffled); }
    function updateRepeatButton() {
        el.btnRepeat.classList.remove('active', 'one');
        if (state.repeatMode === 'all') el.btnRepeat.classList.add('active');
        if (state.repeatMode === 'one') el.btnRepeat.classList.add('active', 'one');
    }

    // --- Lógica de Apertura de Vistas ---
    async function openAlbumPlayer(albumData) {
        showModal(el.playerModal);
        el.playerPlaylist.innerHTML = '<div class="loading-state">Cargando canciones...</div>';
        const { id, title, artist } = albumData;
        
        el.playerAlbumTitle.textContent = title;
        el.playerAlbumArtist.textContent = artist;
        const coverUrl = `https://archive.org/services/img/${id}`;
        el.playerCoverThumb.src = coverUrl;
        el.playerBg.style.backgroundImage = `url(${coverUrl})`;

        const res = await fetch(`https://archive.org/metadata/${id}`);
        const data = await res.json();
        const audioFiles = (data.files || []).filter(f => /\.(mp3|flac|wav|ogg)$/i.test(f.name));
        
        const tracksById = {};
        audioFiles.forEach(f => {
            const baseName = f.name.replace(/\.[^/.]+$/, "");
            if (!tracksById[baseName]) {
                tracksById[baseName] = {
                    id: `${id}_${baseName}`,
                    title: extractSongTitle(f.name, title),
                    artist: artist,
                    album: title,
                    coverThumb: coverUrl,
                    urls: {},
                };
            }
            const format = (f.name.match(/\.(\w+)$/) || [])[1]?.toLowerCase();
            if (format) tracksById[baseName].urls[format] = `https://archive.org/download/${id}/${encodeURIComponent(f.name)}`;
        });
        const songs = Object.values(tracksById).filter(s => s.urls.mp3);
        
        playQueue(songs, 0); // Start playing from the first song
    }

    function openFavoritesPlayer() {
        const favorites = db.get('sanavera_favorites_v3');
        if (favorites.length === 0) {
            el.favoritesPlaylist.innerHTML = '<div class="empty-state">No tienes favoritos.</div>';
        } else {
             playQueue(favorites, 0);
        }
        el.favoritesBg.style.backgroundImage = 'linear-gradient(to bottom, #4c1a25, var(--bg))';
        showModal(el.favoritesModal);
    }
    
    function openPlaylists() {
        renderPlaylists();
        showModal(el.playlistsModal);
    }
    
    function renderActivePlaylist() {
        const container = state.activeModal === el.playerModal ? el.playerPlaylist : el.favoritesPlaylist;
        const favorites = db.get('sanavera_favorites_v3');
        container.innerHTML = state.currentQueue.map((song, i) => {
            const isFav = favorites.some(f => f.id === song.id);
            return `
            <div class="playlist-item ${i === state.currentIndex ? 'active' : ''}" data-index="${i}">
                <img src="${song.coverThumb}" alt="cover">
                <div class="playlist-item-info">
                    <h3>${song.title}</h3>
                    <p>${song.artist}</p>
                </div>
                <div class="playlist-item-actions">
                    <button class="btn-icon btn-favorite ${isFav ? 'active' : ''}" data-song-id="${song.id}"><i class="fas fa-heart"></i></button>
                    <button class="btn-icon btn-add-to-playlist" data-song-id="${song.id}"><i class="fas fa-plus"></i></button>
                </div>
            </div>`;
        }).join('');
    }

    // --- Lógica de Favoritos y Playlists ---
    function toggleFavorite(songId) {
        const song = state.originalQueue.find(s => s.id === songId);
        if (!song) return;
        let favorites = db.get('sanavera_favorites_v3');
        const index = favorites.findIndex(f => f.id === songId);
        if (index > -1) favorites.splice(index, 1);
        else favorites.unshift(song);
        db.set('sanavera_favorites_v3', favorites);
        renderActivePlaylist();
    }

    function renderPlaylists() {
        const playlists = db.get('sanavera_playlists_v3');
        el.playlistsListContainer.innerHTML = playlists.map(p => `
            <div class="playlist-entry" data-playlist-id="${p.id}">
                <i class="fas fa-list-music"></i>
                <div class="playlist-item-info">
                    <h3>${escapeHtml(p.name)}</h3>
                    <p>${p.songs.length} canciones</p>
                </div>
            </div>
        `).join('') || '<div class="empty-state">No has creado ninguna lista.</div>';
    }

    function createPlaylist() {
        const name = el.newPlaylistName.value.trim();
        if (!name) return;
        const playlists = db.get('sanavera_playlists_v3');
        playlists.unshift({ id: `pl_${Date.now()}`, name, songs: [] });
        db.set('sanavera_playlists_v3', playlists);
        el.newPlaylistName.value = '';
        query('#new-playlist-dialog').classList.remove('active');
        renderPlaylists();
    }

    function showAddToPlaylistDialog(songId) {
        state.songForAction = state.originalQueue.find(s => s.id === songId);
        if (!state.songForAction) return;
        const playlists = db.get('sanavera_playlists_v3');
        el.addToPlaylistOptions.innerHTML = playlists.map(p => `
            <button class="playlist-item" data-playlist-id="${p.id}">${escapeHtml(p.name)}</button>
        `).join('') || '<p>Primero crea una lista.</p>';
        query('#add-to-playlist-dialog').classList.add('active');
    }

    function addSongToPlaylist(playlistId) {
        const playlists = db.get('sanavera_playlists_v3');
        const playlist = playlists.find(p => p.id === playlistId);
        if (playlist && state.songForAction) {
            if (!playlist.songs.some(s => s.id === state.songForAction.id)) {
                playlist.songs.unshift(state.songForAction);
                db.set('sanavera_playlists_v3', playlists);
            }
        }
        query('#add-to-playlist-dialog').classList.remove('active');
    }
    
    // --- Event Listeners ---
    el.searchButton.addEventListener('click', searchAlbums);
    el.searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') searchAlbums(); });
    el.albumList.addEventListener('click', e => {
        const item = e.target.closest('.album-item');
        if (item) openAlbumPlayer(item.dataset);
    });

    // Delegación de eventos para listas de canciones
    [el.playerPlaylist, el.favoritesPlaylist].forEach(container => {
        container.addEventListener('click', e => {
            const item = e.target.closest('.playlist-item');
            if (!item) return;

            if (e.target.closest('.btn-favorite')) {
                toggleFavorite(e.target.closest('.btn-favorite').dataset.songId);
                return;
            }
            if (e.target.closest('.btn-add-to-playlist')) {
                showAddToPlaylistDialog(e.target.closest('.btn-add-to-playlist').dataset.songId);
                return;
            }
            
            const index = parseInt(item.dataset.index, 10);
            if(index !== state.currentIndex) loadTrack(index, true);
            else togglePlay();
        });
    });

    // Controles del player
    el.btnPlay.addEventListener('click', togglePlay);
    el.btnNext.addEventListener('click', nextTrack);
    el.btnPrev.addEventListener('click', prevTrack);
    el.btnShuffle.addEventListener('click', toggleShuffle);
    el.btnRepeat.addEventListener('click', toggleRepeat);

    // FABs y cierres de modales
    queryAll('.modal-close-btn').forEach(btn => btn.addEventListener('click', () => hideModal(byId(btn.dataset.modalId))));
    byId('fab-fav').addEventListener('click', openFavoritesPlayer);
    byId('fab-playlists').addEventListener('click', openPlaylists);
    byId('fab-player').addEventListener('click', () => {
        if (state.currentQueue.length > 0) showModal(state.activeModal || el.playerModal);
    });

    // Diálogos de Playlists
    el.btnNewPlaylist.addEventListener('click', () => query('#new-playlist-dialog').classList.add('active'));
    el.cancelNewPlaylist.addEventListener('click', () => query('#new-playlist-dialog').classList.remove('active'));
    el.confirmNewPlaylist.addEventListener('click', createPlaylist);
    el.cancelAddToPlaylist.addEventListener('click', () => query('#add-to-playlist-dialog').classList.remove('active'));
    el.addToPlaylistOptions.addEventListener('click', e => {
        const btn = e.target.closest('button');
        if (btn) addSongToPlaylist(btn.dataset.playlistId);
    });
    el.playlistsListContainer.addEventListener('click', e => {
        const item = e.target.closest('.playlist-entry');
        if(item) {
            const playlists = db.get('sanavera_playlists_v3');
            const playlist = playlists.find(p => p.id === item.dataset.playlistId);
            if(playlist && playlist.songs.length > 0) {
                 hideModal(el.playlistsModal);
                 showModal(el.favoritesModal); // Usa el modal de favoritos para mostrar la playlist
                 el.favoritesBg.style.backgroundImage = 'linear-gradient(to bottom, #1a3a4c, var(--bg))';
                 query('.header-info.full-width h2').innerHTML = `<i class="fas fa-list-music"></i> ${playlist.name}`;
                 playQueue(playlist.songs, 0);
            }
        }
    });

    // --- Inicialización ---
    showModal(el.searchModal);
    el.searchInput.value = 'Damas Gratis';
    searchAlbums();
});
