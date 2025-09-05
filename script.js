// =================================================================
// Sanavera MP3 - v2.1 (FIX COMPLETO)
// Autor: Sebastián Sanavera (con asistencia de IA)
// Descripción: Versión corregida que implementa todas las
// funcionalidades solicitadas: Player funcional con animación de
// scroll, gestión completa de favoritos y listas de reproducción.
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Sanavera MP3 v2.1 - ¡Listo!');

    // ---------- ALIAS Y UTILIDADES ----------
    const byId = id => document.getElementById(id);
    const query = (s, p = document) => p.querySelector(s);
    const queryAll = (s, p = document) => p.querySelectorAll(s);
    const fmtTime = s => isNaN(s) || s < 0 ? '0:00' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const escapeHtml = s => (s ?? '').toString().replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    const truncate = (t, n) => (t ?? '').toString().length > n ? ((t ?? '').toString().slice(0, n - 1) + '…') : (t ?? '').toString();
    const normalizeCreator = c => Array.isArray(c) ? c.join(', ') : (c || 'Desconocido');
    const normalizeTitle = t => (Array.isArray(t) ? t.filter(Boolean).map(x => x.toString()).join(' – ') : (t || 'Sin título')).trim() || 'Sin título';

    // ---------- GESTIÓN DE DATOS (LocalStorage) ----------
    const db = {
        _get: key => JSON.parse(localStorage.getItem(key) || 'null'),
        _set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
        getFavorites: () => db._get('sanavera_favorites_v2') || [],
        saveFavorites: favs => db._set('sanavera_favorites_v2', favs),
        getPlaylists: () => db._get('sanavera_playlists_v2') || [],
        savePlaylists: lists => db._set('sanavera_playlists_v2', lists),
        getRecentlyPlayed: () => db._get('sanavera_recently_v2') || [],
        saveRecentlyPlayed: r => db._set('sanavera_recently_v2', r),
        getSearchCache: q => {
            const c = db._get('sanavera_searchCache_v2') || {};
            if (c[q] && Date.now() - c[q].timestamp < 3600000) return c[q].data;
            return null;
        },
        setSearchCache: (q, data) => {
            const c = db._get('sanavera_searchCache_v2') || {};
            c[q] = { data, timestamp: Date.now() };
            db._set('sanavera_searchCache_v2', c);
        },
    };

    // ---------- ESTADO GLOBAL DE LA APLICACIÓN ----------
    const state = {
        currentView: 'search',
        player: {
            queue: [], originalQueue: [], currentIndex: -1, isPlaying: false,
            isShuffled: false, repeatMode: 'none', currentSong: null,
            source: { type: null, id: null }, preferredFormat: 'mp3', availableFormats: ['mp3']
        },
        search: { albums: [], isLoading: false, query: 'banda XXI', page: 1, canLoadMore: true },
        songToAddToPlaylist: null, // Canción temporal para el modal
    };

    // ---------- ELEMENTOS DEL DOM (CACHE) ----------
    const el = {
        views: queryAll('.view'),
        navLinks: queryAll('.nav-link'),
        audio: byId('audio-player'),
        
        // Búsqueda
        searchInput: byId('search-input'), searchButton: byId('search-button'),
        albumList: byId('album-list'), loadingIndicator: byId('loading-indicator'),
        
        // Reproductor
        playerView: byId('player-view'), playerHero: byId('player-hero'),
        heroSongTitle: byId('hero-song-title'), heroSongArtist: byId('hero-song-artist'),
        playerTracklistWrapper: byId('player-tracklist-wrapper'), playerTracklist: byId('player-tracklist'),
        btnPlay: byId('btn-play'), btnPrev: byId('btn-prev'), btnNext: byId('btn-next'),
        btnRepeat: byId('btn-repeat'), btnShuffle: byId('btn-shuffle'), btnDownload: byId('btn-download'),
        qualityBtn: byId('quality-btn'), seekBar: byId('seek-bar'),
        currentTime: byId('current-time'), duration: byId('duration'),

        // Menú Calidad
        qualityMenu: byId('quality-menu'), qualityBackdrop: byId('quality-backdrop'),
        qualityOptions: byId('quality-options'),

        // Favoritos
        favoritesList: byId('favorites-list'),
        
        // Listas de Reproducción
        playlistsList: byId('playlists-list'),
        playlistDetailView: byId('playlist-detail-view'),
        playlistDetailTitle: byId('playlist-detail-title'),
        playlistDetailList: byId('playlist-detail-list'),
        playlistDetailBackButton: byId('playlist-detail-back-button'),
        
        // Modales
        newPlaylistModal: byId('new-playlist-modal'),
        newPlaylistForm: byId('new-playlist-form'),
        newPlaylistInput: byId('new-playlist-input'),
        addToPlaylistModal: byId('add-to-playlist-modal'),
        addToPlaylistOptions: byId('add-to-playlist-options'),
    };

    // =================================================
    // NAVEGACIÓN Y MODALES
    // =================================================
    function showView(viewId) {
        state.currentView = viewId;
        el.views.forEach(v => v.classList.toggle('active', v.id === `${viewId}-view`));
        el.navLinks.forEach(l => l.classList.toggle('active', l.dataset.view === viewId));

        if (viewId === 'favorites') renderFavorites();
        else if (viewId === 'playlists') renderPlaylists();
    }
    
    function showModal(modal) { modal.classList.add('active'); }
    function hideModal(modal) { modal.classList.remove('active'); }

    // =================================================
    // LÓGICA DEL REPRODUCTOR
    // =================================================
    function playQueue(source, songs, startIndex = 0) {
        if (!songs || songs.length === 0) return;
        state.player.source = source;
        state.player.originalQueue = [...songs];
        state.player.queue = [...songs];
        state.player.isShuffled = false;
        updateShuffleButton();
        loadTrack(startIndex, true);
        showView('player');
    }

    function loadTrack(index, autoplay = false) {
        if (index < 0 || index >= state.player.queue.length) return;

        state.player.currentIndex = index;
        const song = state.player.queue[index];
        state.player.currentSong = song;

        if (!song || !song.urls) { console.error("Canción inválida:", song); return; }

        const url = song.urls[state.player.preferredFormat] || song.urls.mp3;
        el.audio.src = url;
        el.btnDownload.href = url;
        el.btnDownload.download = `${song.title}.${state.player.preferredFormat}`;
        
        updatePlayerUI();
        addToRecentlyPlayed(song);
        if (autoplay) play(); else pause();
    }
    
    function updatePlayerUI() {
        const { currentSong } = state.player;
        if (!currentSong) return;
        const coverUrl = currentSong.coverLarge || currentSong.coverThumb || 'https://placehold.co/800x800/161821/f6f7fb?text=S-MP3';
        el.playerHero.style.setProperty('--cover-url', `url("${escapeHtml(coverUrl)}")`);
        el.heroSongTitle.textContent = currentSong.title;
        el.heroSongArtist.textContent = currentSong.artist;
        renderPlayerTracklist();
    }

    const play = () => { if (state.player.currentSong) el.audio.play().then(() => state.player.isPlaying = true, el.btnPlay.classList.add('playing')); };
    const pause = () => { el.audio.pause(); state.player.isPlaying = false; el.btnPlay.classList.remove('playing'); };
    const togglePlay = () => state.player.isPlaying ? pause() : play();
    
    function nextTrack() {
        let nextIndex = state.player.currentIndex + 1;
        if (nextIndex >= state.player.queue.length) {
            if (state.player.repeatMode === 'all') nextIndex = 0;
            else { pause(); return; }
        }
        loadTrack(nextIndex, true);
    }
    function prevTrack() {
        if (el.audio.currentTime > 3) el.audio.currentTime = 0;
        else loadTrack((state.player.currentIndex - 1 + state.player.queue.length) % state.player.queue.length, true);
    }
    
    function handleTrackEnd() {
        if (state.player.repeatMode === 'one') { el.audio.currentTime = 0; play(); } 
        else nextTrack();
    }

    function toggleShuffle() {
        state.player.isShuffled = !state.player.isShuffled;
        const currentId = state.player.currentSong?.id;
        if (state.player.isShuffled) {
            state.player.queue = [...state.player.originalQueue].sort(() => Math.random() - 0.5);
        } else {
            state.player.queue = [...state.player.originalQueue];
        }
        state.player.currentIndex = state.player.queue.findIndex(s => s.id === currentId) ?? 0;
        updateShuffleButton();
        renderPlayerTracklist();
    }
    
    function toggleRepeat() {
        const modes = ['none', 'all', 'one'];
        state.player.repeatMode = modes[(modes.indexOf(state.player.repeatMode) + 1) % modes.length];
        updateRepeatButton();
    }

    function updateShuffleButton() { el.btnShuffle.classList.toggle('active', state.player.isShuffled); }
    function updateRepeatButton() {
        el.btnRepeat.classList.remove('active', 'one');
        const icon = query('i', el.btnRepeat);
        if (state.player.repeatMode === 'all') { el.btnRepeat.classList.add('active'); icon.className = 'fas fa-repeat'; } 
        else if (state.player.repeatMode === 'one') { el.btnRepeat.classList.add('active', 'one'); icon.className = 'fas fa-repeat-1'; }
        else { icon.className = 'fas fa-repeat'; }
    }

    function buildQualityMenu() {
        el.qualityOptions.innerHTML = '';
        state.player.availableFormats.forEach(f => {
            const isActive = f === state.player.preferredFormat;
            const item = document.createElement('button');
            item.className = `quality-option ${isActive ? 'active' : ''}`;
            item.dataset.format = f;
            item.innerHTML = `<span>${f.toUpperCase()}</span><i class="fas fa-check check"></i>`;
            el.qualityOptions.appendChild(item);
        });
    }
    function selectQuality(format) {
        state.player.preferredFormat = format;
        loadTrack(state.player.currentIndex, state.player.isPlaying);
        hideModal(el.qualityMenu);
        hideModal(el.qualityBackdrop);
    }

    // =================================================
    // RENDERIZADO DE LISTAS
    // =================================================
    function createSongItemHTML(song, index, isFavorite, context = 'player') {
        const isActive = context === 'player' && index === state.player.currentIndex;
        return `
            <div class="playlist-item ${isActive ? 'active' : ''}" data-index="${index}" data-song-id="${song.id}">
                <img src="${escapeHtml(song.coverThumb)}" alt="cover" loading="lazy">
                <div class="playlist-item-info">
                    <h3>${isActive ? '<div class="eq"><span></span><span></span><span></span></div>' : ''}${escapeHtml(song.title)}</h3>
                    <p>${escapeHtml(song.artist)}</p>
                </div>
                <div class="playlist-item-actions">
                    <button class="btn-icon btn-favorite ${isFavorite ? 'active' : ''}" aria-label="Favorito"><i class="fas fa-heart"></i></button>
                    <button class="btn-icon btn-add-to-playlist" aria-label="Añadir a lista"><i class="fas fa-plus"></i></button>
                </div>
            </div>`;
    }

    function renderPlayerTracklist() {
        const favorites = db.getFavorites();
        el.playerTracklist.innerHTML = state.player.queue.map((song, i) =>
            createSongItemHTML(song, i, favorites.some(f => f.id === song.id), 'player')
        ).join('');
    }
    
    // =================================================
    // BÚSQUEDA DE ÁLBUMES
    // =================================================
    async function searchAlbums(isNewSearch = false) {
        if (state.search.isLoading) return;
        if (isNewSearch) {
            state.search.page = 1; state.search.albums = []; state.search.canLoadMore = true;
            el.albumList.innerHTML = '';
        }
        if (!state.search.query || !state.search.canLoadMore) return;
        state.search.isLoading = true; el.loadingIndicator.style.display = 'block';

        const cached = db.getSearchCache(`${state.search.query}_p${state.search.page}`);
        if (cached) { processAlbumData(cached); return; }

        try {
            const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(state.search.query)}+AND+mediatype:audio&fl=identifier,title,creator&rows=50&page=${state.search.page}&output=json&sort[]=downloads+desc`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
            const data = await res.json();
            db.setSearchCache(`${state.search.query}_p${state.search.page}`, data);
            processAlbumData(data);
        } catch (err) {
            console.error("Error en la búsqueda:", err);
            state.search.isLoading = false; el.loadingIndicator.style.display = 'none';
        }
    }

    function processAlbumData(data) {
        const docs = data.response?.docs || [];
        if (docs.length < 50) state.search.canLoadMore = false;
        
        const newAlbums = docs.map(d => ({
            id: d.identifier, title: normalizeTitle(d.title),
            artist: normalizeCreator(d.creator), image: `https://archive.org/services/img/${d.identifier}`,
        })).filter(na => !state.search.albums.some(ea => ea.id === na.id));
        
        state.search.albums.push(...newAlbums);
        renderAlbums(newAlbums, false);
        state.search.page++; state.search.isLoading = false;
        el.loadingIndicator.style.display = 'none';
    }

    function renderAlbums(albums, clear = true) {
        if (clear) el.albumList.innerHTML = '';
        if (state.search.albums.length === 0 && !state.search.isLoading) {
            el.albumList.innerHTML = `<div class="empty-state">No se encontraron álbumes.</div>`; return;
        }
        const frag = document.createDocumentFragment();
        albums.forEach(a => {
            const item = document.createElement('div');
            item.className = 'album-item'; item.dataset.albumId = a.id;
            item.innerHTML = `<img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}" loading="lazy"><div class="album-item-info"><h3>${escapeHtml(truncate(a.title, 40))}</h3><p>${escapeHtml(truncate(a.artist, 30))}</p></div>`;
            frag.appendChild(item);
        });
        el.albumList.appendChild(frag);
    }
    
    async function openAlbum(albumId) {
        showView('player');
        el.playerTracklist.innerHTML = `<div class="loading-state">Cargando álbum...</div>`;
        try {
            const res = await fetch(`https://archive.org/metadata/${albumId}`);
            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
            const data = await res.json();

            const artist = normalizeCreator(data.metadata?.creator);
            const thumbUrl = `https://archive.org/services/img/${albumId}`;
            const audioFiles = (data.files || []).filter(f => /\.(mp3|flac|wav|ogg)$/i.test(f.name || ''));
            const tracksById = {};
            
            audioFiles.forEach(f => {
                const baseName = (f.name || '').replace(/\.[^/.]+$/, "");
                if (!tracksById[baseName]) {
                    tracksById[baseName] = {
                        id: `${albumId}_${baseName}`, title: baseName.replace(/_/g, ' ').replace(/^\d+\s*-\s*/, ''),
                        artist: artist, coverThumb: thumbUrl, coverLarge: thumbUrl, urls: {}
                    };
                }
                const format = (f.name.match(/\.(\w+)$/) || [])[1]?.toLowerCase();
                if (format) tracksById[baseName].urls[format] = `https://archive.org/download/${albumId}/${encodeURIComponent(f.name)}`;
            });
            const songs = Object.values(tracksById).filter(t => t.urls.mp3);
            state.player.availableFormats = [...new Set(audioFiles.map(f => (f.name.match(/\.(\w+)$/) || [])[1]?.toLowerCase()).filter(Boolean))];
            if (!state.player.availableFormats.includes('mp3')) state.player.availableFormats.unshift('mp3');
            buildQualityMenu();
            playQueue({ type: 'album', id: albumId }, songs);
        } catch (err) {
            console.error("Error al abrir álbum:", err);
            el.playerTracklist.innerHTML = `<div class="empty-state">No se pudo cargar el álbum.</div>`;
        }
    }

    // =================================================
    // FAVORITOS, LISTAS Y HISTORIAL
    // =================================================
    function findSongById(songId) {
        return state.player.originalQueue.find(s => s.id === songId);
    }

    function toggleFavorite(songId) {
        let favorites = db.getFavorites();
        const songIndex = favorites.findIndex(s => s.id === songId);
        if (songIndex > -1) {
            favorites.splice(songIndex, 1);
        } else {
            const song = findSongById(songId);
            if (song) favorites.unshift(song);
        }
        db.saveFavorites(favorites);
        if (state.currentView === 'player') renderPlayerTracklist();
        if (state.currentView === 'favorites') renderFavorites();
    }
    
    function renderFavorites() {
        const favorites = db.getFavorites();
        if (favorites.length === 0) {
            el.favoritesList.innerHTML = `<div class="empty-state">Aún no tienes canciones favoritas.</div>`; return;
        }
        el.favoritesList.innerHTML = favorites.map((song, i) => createSongItemHTML(song, i, true, 'favorites')).join('');
    }
    
    function handleCreatePlaylist(e) {
        e.preventDefault();
        const name = el.newPlaylistInput.value.trim();
        if (name) {
            const playlists = db.getPlaylists();
            playlists.unshift({ id: `pl_${Date.now()}`, name, songs: [] });
            db.savePlaylists(playlists);
            el.newPlaylistInput.value = '';
            hideModal(el.newPlaylistModal);
            if (state.currentView === 'playlists') renderPlaylists();
            // Si estábamos añadiendo una canción, ahora la añadimos
            if(state.songToAddToPlaylist) {
                addSongToPlaylist(playlists[0].id, state.songToAddToPlaylist);
                state.songToAddToPlaylist = null;
            }
        }
    }

    function renderPlaylists() {
        const playlists = db.getPlaylists();
        el.playlistsList.innerHTML = `<button class="playlist-item new-playlist-btn"><i class="fas fa-plus"></i> Crear nueva lista</button>`;
        if (playlists.length > 0) {
            el.playlistsList.innerHTML += playlists.map(p => `
                <div class="playlist-item" data-playlist-id="${p.id}">
                    <i class="fas fa-list-music icon"></i>
                    <div class="playlist-item-info"><h3>${escapeHtml(p.name)}</h3><p>${p.songs.length} canciones</p></div>
                </div>`).join('');
        }
    }
    
    function openAddToPlaylistModal(songId) {
        state.songToAddToPlaylist = findSongById(songId);
        if (!state.songToAddToPlaylist) return;
        
        const playlists = db.getPlaylists();
        el.addToPlaylistOptions.innerHTML = `<button class="playlist-item new-playlist-btn"><i class="fas fa-plus"></i> Crear nueva lista</button>`;
        if (playlists.length > 0) {
            el.addToPlaylistOptions.innerHTML += playlists.map(p => 
                `<button class="playlist-item" data-playlist-id="${p.id}">${escapeHtml(p.name)}</button>`
            ).join('');
        }
        showModal(el.addToPlaylistModal);
    }

    function addSongToPlaylist(playlistId, song) {
        const playlists = db.getPlaylists();
        const playlist = playlists.find(p => p.id === playlistId);
        if (playlist && !playlist.songs.some(s => s.id === song.id)) {
            playlist.songs.unshift(song);
            db.savePlaylists(playlists);
        }
        hideModal(el.addToPlaylistModal);
        state.songToAddToPlaylist = null;
    }

    function addToRecentlyPlayed(song) {
        if (!song || !song.id) return;
        let recent = db.getRecentlyPlayed().filter(s => s.id !== song.id);
        recent.unshift(song);
        if (recent.length > 50) recent = recent.slice(0, 50);
        db.saveRecentlyPlayed(recent);
    }
    
    // =================================================
    // INICIALIZACIÓN Y EVENT LISTENERS
    // =================================================
    function init() {
        // Navegación
        el.navLinks.forEach(l => l.addEventListener('click', () => showView(l.dataset.view)));
        // Búsqueda
        el.searchButton.addEventListener('click', () => { state.search.query = el.searchInput.value.trim(); searchAlbums(true); });
        el.searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') { state.search.query = el.searchInput.value.trim(); searchAlbums(true); } });
        // Scroll Infinito
        query('.view-content', byId('search-view')).addEventListener('scroll', e => {
            const { scrollTop, scrollHeight, clientHeight } = e.target;
            if (scrollTop + clientHeight >= scrollHeight - 400) searchAlbums();
        });
        // Clicks en listas de álbumes
        el.albumList.addEventListener('click', e => { const item = e.target.closest('.album-item'); if (item) openAlbum(item.dataset.albumId); });
        // Clicks en la lista del reproductor
        el.playerTracklist.addEventListener('click', e => {
            const songItem = e.target.closest('.playlist-item');
            if (e.target.closest('.btn-favorite')) toggleFavorite(songItem?.dataset.songId);
            else if (e.target.closest('.btn-add-to-playlist')) openAddToPlaylistModal(songItem?.dataset.songId);
            else if (songItem) {
                const index = parseInt(songItem.dataset.index, 10);
                if (index === state.player.currentIndex) togglePlay();
                else loadTrack(index, true);
            }
        });

        // Controles del reproductor
        el.btnPlay.addEventListener('click', togglePlay); el.btnNext.addEventListener('click', nextTrack);
        el.btnPrev.addEventListener('click', prevTrack); el.btnShuffle.addEventListener('click', toggleShuffle);
        el.btnRepeat.addEventListener('click', toggleRepeat);
        
        // Eventos del tag <audio>
        el.audio.addEventListener('timeupdate', () => {
            const { currentTime, duration } = el.audio; if (isNaN(duration)) return;
            el.currentTime.textContent = fmtTime(currentTime); el.duration.textContent = fmtTime(duration);
            el.seekBar.value = (currentTime / duration) * 100 || 0;
        });
        el.audio.addEventListener('ended', handleTrackEnd);
        el.seekBar.addEventListener('input', () => { if (!isNaN(el.audio.duration)) el.audio.currentTime = (el.seekBar.value / 100) * el.audio.duration; });
        
        // Animación de Portada en Reproductor
        el.playerTracklistWrapper.addEventListener('scroll', e => {
            const scroll = e.target.scrollTop;
            const heroHeight = el.playerHero.offsetHeight;
            const scale = Math.max(0.7, 1 - (scroll / heroHeight) * 0.5);
            const opacity = Math.max(0.2, 1 - scroll / (heroHeight / 2));
            el.playerHero.style.transform = `scale(${scale})`;
            el.playerHero.style.opacity = opacity;
        });
        
        // Menú Calidad
        el.qualityBtn.addEventListener('click', () => { showModal(el.qualityMenu); showModal(el.qualityBackdrop); });
        el.qualityBackdrop.addEventListener('click', () => { hideModal(el.qualityMenu); hideModal(el.qualityBackdrop); });
        el.qualityOptions.addEventListener('click', e => { if (e.target.closest('.quality-option')) selectQuality(e.target.closest('.quality-option').dataset.format); });
        
        // Listas de reproducción
        el.playlistsList.addEventListener('click', e => { if (e.target.closest('.new-playlist-btn')) showModal(el.newPlaylistModal); });
        el.newPlaylistForm.addEventListener('submit', handleCreatePlaylist);
        queryAll('.modal-close, .modal-backdrop').forEach(btn => btn.addEventListener('click', () => hideModal(btn.closest('.modal'))));
        
        el.addToPlaylistOptions.addEventListener('click', e => {
            const btn = e.target.closest('button');
            if (!btn || !state.songToAddToPlaylist) return;
            if(btn.classList.contains('new-playlist-btn')) {
                hideModal(el.addToPlaylistModal);
                showModal(el.newPlaylistModal);
            } else {
                addSongToPlaylist(btn.dataset.playlistId, state.songToAddToPlaylist);
            }
        });

        // Carga inicial
        showView('search');
        searchAlbums(true);
    }

    init();
});
