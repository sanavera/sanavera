// =================================================================
// Sanavera MP3 - v2.0 Refactor Completo
// Autor: Sebastián Sanavera (con asistencia de IA)
// Descripción: Lógica principal de la aplicación con navegación por
// vistas, gestión de estado y persistencia en localStorage.
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Sanavera MP3 v2.0 - ¡Listo!');

    // ---------- ALIAS Y UTILIDADES ----------
    const byId = id => document.getElementById(id);
    const query = (selector, parent = document) => parent.querySelector(selector);
    const queryAll = (selector, parent = document) => parent.querySelectorAll(selector);

    const fmtTime = s => (isNaN(s) || s < 0) ? '0:00' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const escapeHtml = s => (s ?? '').toString().replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    const truncate = (t, n) => (t ?? '').toString().length > n ? ((t ?? '').toString().slice(0, n - 1) + '…') : (t ?? '').toString();
    const normalizeCreator = c => Array.isArray(c) ? c.join(', ') : (c || 'Desconocido');
    const normalizeTitle = t => (Array.isArray(t) ? t.filter(Boolean).map(x => x.toString()).join(' – ') : (t || 'Sin título')).trim() || 'Sin título';
    const qualityIsHQ = fmt => ['wav', 'flac', 'aiff', 'alac'].includes((fmt || '').toLowerCase());
    const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;


    // ---------- GESTIÓN DE DATOS (LocalStorage) ----------
    const db = {
        _get: key => JSON.parse(localStorage.getItem(key) || 'null'),
        _set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),

        getFavorites: () => db._get('sanavera_favorites_v2') || [],
        saveFavorites: favs => db._set('sanavera_favorites_v2', favs),

        getPlaylists: () => db._get('sanavera_playlists_v2') || [],
        savePlaylists: playlists => db._set('sanavera_playlists_v2', playlists),

        getRecentlyPlayed: () => db._get('sanavera_recently_v2') || [],
        saveRecentlyPlayed: recent => db._set('sanavera_recently_v2', recent),

        getSearchCache: query => {
            const cache = db._get('sanavera_searchCache_v2') || {};
            // Cache de 1 hora
            if (cache[query] && Date.now() - cache[query].timestamp < 3600000) {
                return cache[query].data;
            }
            return null;
        },
        setSearchCache: (query, data) => {
            const cache = db._get('sanavera_searchCache_v2') || {};
            cache[query] = { data, timestamp: Date.now() };
            db._set('sanavera_searchCache_v2', cache);
        },
    };

    // ---------- ESTADO GLOBAL DE LA APLICACIÓN ----------
    const state = {
        currentView: 'search',
        player: {
            queue: [],
            originalQueue: [],
            currentIndex: -1,
            isPlaying: false,
            isShuffled: false,
            repeatMode: 'none', // 'none', 'all', 'one'
            currentSong: null,
            source: { type: null, id: null }, // ej: { type: 'album', id: 'queen_live' }
            preferredFormat: 'mp3',
        },
        search: {
            albums: [],
            isLoading: false,
            query: 'juan_chota_dura',
            page: 1,
            canLoadMore: true,
        },
    };


    // ---------- ELEMENTOS DEL DOM (CACHE) ----------
    const el = {
        // Vistas principales
        views: queryAll('.view'),
        searchView: byId('search-view'),
        favoritesView: byId('favorites-view'),
        playlistsView: byId('playlists-view'),
        playerView: byId('player-view'),
        playlistDetailView: byId('playlist-detail-view'),

        // Barra de navegación
        navLinks: queryAll('.nav-link'),

        // Búsqueda
        searchInput: byId('search-input'),
        searchButton: byId('search-button'),
        albumList: byId('album-list'),
        loadingIndicator: byId('loading-indicator'),
        
        // Reproductor
        audio: byId('audio-player'),
        playerHero: byId('player-hero'),
        heroSongTitle: byId('hero-song-title'),
        heroSongArtist: byId('hero-song-artist'),
        playerTracklist: byId('player-tracklist'),
        btnPlay: byId('btn-play'),
        btnPrev: byId('btn-prev'),
        btnNext: byId('btn-next'),
        btnRepeat: byId('btn-repeat'),
        btnShuffle: byId('btn-shuffle'),
        btnDownload: byId('btn-download'),
        qualityBtn: byId('quality-btn'),
        seekBar: byId('seek-bar'),
        currentTime: byId('current-time'),
        duration: byId('duration'),
        
        // Menú de Calidad
        qualityMenu: byId('quality-menu'),
        qualityBackdrop: byId('quality-backdrop'),
        qualityOptions: byId('quality-options'),

        // Favoritos
        favoritesList: byId('favorites-list'),
        
        // Listas de Reproducción
        playlistsList: byId('playlists-list'),
        playlistDetailTitle: byId('playlist-detail-title'),
        playlistDetailList: byId('playlist-detail-list'),
        
        // Mini reproductor (a implementar en el futuro)
        miniPlayer: byId('mini-player'),
    };

    // =================================================
    // NAVEGACIÓN PRINCIPAL
    // =================================================
    function showView(viewId) {
        state.currentView = viewId;
        el.views.forEach(view => {
            view.style.display = view.id === `${viewId}-view` ? 'flex' : 'none';
        });

        el.navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewId);
        });
        
        // Lógica específica al abrir una vista
        switch (viewId) {
            case 'favorites':
                renderFavorites();
                break;
            case 'playlists':
                renderPlaylists();
                break;
        }
    }

    // =================================================
    // LÓGICA DEL REPRODUCTOR
    // =================================================

    function playQueue(source, songs, startIndex = 0) {
        if (!songs || songs.length === 0) return;
        
        state.player.source = source;
        state.player.queue = [...songs];
        state.player.originalQueue = [...songs];
        state.player.isShuffled = false;

        updateShuffleButton();
        loadTrack(startIndex);
        play();
        showView('player');
    }

    function loadTrack(index, autoplay = false) {
        if (index < 0 || index >= state.player.queue.length) return;

        state.player.currentIndex = index;
        const song = state.player.queue[index];
        state.player.currentSong = song;

        if (!song || !song.urls) {
            console.error("Canción inválida:", song);
            return;
        }

        const url = song.urls[state.player.preferredFormat] || song.urls.mp3;
        el.audio.src = url;
        el.btnDownload.href = url;
        el.btnDownload.download = `${song.title}.${state.player.preferredFormat}`;
        
        updatePlayerUI(song);
        addToRecentlyPlayed(song);

        if (autoplay) play();
    }
    
    function updatePlayerUI(song) {
        if (!song) song = state.player.currentSong;
        if (!song) return;

        const coverUrl = song.coverLarge || song.coverThumb || 'https://placehold.co/800x800/161821/f6f7fb?text=S-MP3';
        el.playerHero.style.setProperty('--cover-url', `url("${escapeHtml(coverUrl)}")`);
        el.heroSongTitle.textContent = song.title;
        el.heroSongArtist.textContent = song.artist;

        renderTracklist();
    }

    function play() {
        if (!state.player.currentSong) return;
        el.audio.play().then(() => {
            state.player.isPlaying = true;
            el.btnPlay.classList.add('playing');
            el.btnPlay.setAttribute('aria-label', 'Pausar');
        }).catch(err => console.error("Error al reproducir:", err));
    }

    function pause() {
        el.audio.pause();
        state.player.isPlaying = false;
        el.btnPlay.classList.remove('playing');
        el.btnPlay.setAttribute('aria-label', 'Reproducir');
    }

    function togglePlay() {
        state.player.isPlaying ? pause() : play();
    }

    function nextTrack() {
        let nextIndex = state.player.currentIndex + 1;
        if (nextIndex >= state.player.queue.length) {
            if (state.player.repeatMode === 'all') {
                nextIndex = 0;
            } else {
                pause();
                return; // Fin de la cola
            }
        }
        loadTrack(nextIndex, true);
    }

    function prevTrack() {
        // Si la canción lleva más de 3 segundos, la reinicia. Si no, va a la anterior.
        if (el.audio.currentTime > 3) {
            el.audio.currentTime = 0;
        } else {
            let prevIndex = state.player.currentIndex - 1;
            if (prevIndex < 0) {
                 prevIndex = state.player.queue.length - 1; // Vuelve al final
            }
            loadTrack(prevIndex, true);
        }
    }
    
    function handleTrackEnd() {
        if (state.player.repeatMode === 'one') {
            el.audio.currentTime = 0;
            play();
        } else {
            nextTrack();
        }
    }

    function toggleShuffle() {
        state.player.isShuffled = !state.player.isShuffled;
        
        if (state.player.isShuffled) {
            const current = state.player.currentSong;
            // Mezcla la cola pero mantiene la canción actual al principio
            const shuffled = [...state.player.originalQueue]
                .filter(s => s.id !== current.id)
                .sort(() => Math.random() - 0.5);
            state.player.queue = [current, ...shuffled];
            state.player.currentIndex = 0;
        } else {
            const current = state.player.currentSong;
            state.player.queue = [...state.player.originalQueue];
            state.player.currentIndex = state.player.queue.findIndex(s => s.id === current.id);
        }
        updateShuffleButton();
        renderTracklist();
    }
    
    function toggleRepeat() {
        const modes = ['none', 'all', 'one'];
        const currentModeIndex = modes.indexOf(state.player.repeatMode);
        state.player.repeatMode = modes[(currentModeIndex + 1) % modes.length];
        updateRepeatButton();
    }

    function updateShuffleButton() {
        el.btnShuffle.classList.toggle('active', state.player.isShuffled);
    }
    
    function updateRepeatButton() {
        el.btnRepeat.classList.remove('active', 'one');
        const icon = el.btnRepeat.querySelector('i');
        if (state.player.repeatMode === 'all') {
            el.btnRepeat.classList.add('active');
            icon.className = 'fas fa-repeat';
        } else if (state.player.repeatMode === 'one') {
            el.btnRepeat.classList.add('active', 'one');
            icon.className = 'fas fa-repeat-1';
        } else {
            icon.className = 'fas fa-repeat';
        }
    }
    
    // =================================================
    // RENDERIZADO DE LISTAS
    // =================================================

    function renderTracklist() {
        const listEl = el.playerTracklist;
        listEl.innerHTML = '';
        if (!state.player.queue || state.player.queue.length === 0) {
            listEl.innerHTML = `<div class="empty-state">No hay canciones en la cola.</div>`;
            return;
        }
        
        const favorites = db.getFavorites();
        const frag = document.createDocumentFragment();

        state.player.queue.forEach((song, index) => {
            const isActive = index === state.player.currentIndex;
            const isFavorite = favorites.some(f => f.id === song.id);

            const item = document.createElement('div');
            item.className = `playlist-item ${isActive ? 'active' : ''}`;
            item.dataset.index = index;
            item.innerHTML = `
                <img src="${escapeHtml(song.coverThumb)}" alt="cover" loading="lazy">
                <div class="playlist-item-info">
                    <h3>
                        ${isActive ? '<div class="eq"><span></span><span></span><span></span></div>' : ''}
                        ${escapeHtml(song.title)}
                    </h3>
                    <p>${escapeHtml(song.artist)}</p>
                </div>
                <div class="playlist-item-actions">
                    <button class="btn-favorite ${isFavorite ? 'active' : ''}" data-song-id="${song.id}">
                        <i class="fa-solid fa-heart"></i>
                    </button>
                    <!-- Aquí se podría añadir un botón para agregar a playlist -->
                </div>
            `;
            frag.appendChild(item);
        });
        listEl.appendChild(frag);
    }
    
    // =================================================
    // BÚSQUEDA DE ÁLBUMES
    // =================================================

    function searchAlbums(isNewSearch = false) {
        if (state.search.isLoading) return;

        if (isNewSearch) {
            state.search.page = 1;
            state.search.albums = [];
            state.search.canLoadMore = true;
            el.albumList.innerHTML = '';
        }

        const query = state.search.query;
        if (!query || !state.search.canLoadMore) return;

        state.search.isLoading = true;
        el.loadingIndicator.style.display = 'block';

        const cached = db.getSearchCache(`${query}_p${state.search.page}`);
        if (cached) {
            processAlbumData(cached, isNewSearch);
            return;
        }

        const sortParam = encodeURIComponent('downloads desc');
        const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:audio&fl=identifier,title,creator&rows=50&page=${state.search.page}&output=json&sort[]=${sortParam}`;

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
                return res.json();
            })
            .then(data => {
                db.setSearchCache(`${query}_p${state.search.page}`, data);
                processAlbumData(data, isNewSearch);
            })
            .catch(err => {
                console.error("Error en la búsqueda:", err);
                state.search.isLoading = false;
                el.loadingIndicator.style.display = 'none';
            });
    }

    function processAlbumData(data) {
        const docs = data.response?.docs || [];

        if (docs.length === 0) {
            state.search.canLoadMore = false;
        }

        const newAlbums = docs.map(d => ({
            id: d.identifier,
            title: normalizeTitle(d.title),
            artist: normalizeCreator(d.creator),
            image: `https://archive.org/services/img/${d.identifier}`,
        }));

        const uniqueAlbums = newAlbums.filter(newAlbum => 
            !state.search.albums.some(existing => existing.id === newAlbum.id)
        );

        state.search.albums.push(...uniqueAlbums);
        renderAlbums(uniqueAlbums, false); // false para añadir, no reemplazar

        state.search.page++;
        state.search.isLoading = false;
        el.loadingIndicator.style.display = 'none';
    }

    function renderAlbums(albums, clear = true) {
        if (clear) {
            el.albumList.innerHTML = '';
        }
        if (state.search.albums.length === 0 && !state.search.isLoading) {
             el.albumList.innerHTML = `<div class="empty-state">No se encontraron álbumes. Intenta con otro término.</div>`;
             return;
        }

        const frag = document.createDocumentFragment();
        albums.forEach(album => {
            const item = document.createElement('div');
            item.className = 'album-item';
            item.dataset.albumId = album.id;
            item.innerHTML = `
                <img src="${escapeHtml(album.image)}" alt="${escapeHtml(album.title)}" loading="lazy">
                <div class="album-item-info">
                    <h3>${escapeHtml(truncate(album.title, 40))}</h3>
                    <p>${escapeHtml(truncate(album.artist, 30))}</p>
                </div>
            `;
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

            const artist = normalizeCreator(data.metadata?.creator || data.metadata?.artist);
            const thumbUrl = `https://archive.org/services/img/${albumId}`;
            const coverLarge = `https://archive.org/services/img/${albumId}`; // Simplificado por ahora

            const audioFiles = (data.files || []).filter(f => /\.(mp3|flac|wav|ogg)$/i.test(f.name || ''));
            const tracksById = {};
            
            audioFiles.forEach(f => {
                const baseName = (f.name || '').replace(/\.[^/.]+$/, "");
                if (!tracksById[baseName]) {
                    tracksById[baseName] = {
                        id: generateId(),
                        title: baseName.replace(/_/g, ' ').replace(/^\d+\s*-\s*/, ''),
                        artist: artist,
                        coverThumb: thumbUrl,
                        coverLarge: coverLarge,
                        urls: {}
                    };
                }
                const format = (f.name.match(/\.(\w+)$/) || [])[1]?.toLowerCase();
                if(format) {
                    tracksById[baseName].urls[format] = `https://archive.org/download/${albumId}/${encodeURIComponent(f.name)}`;
                }
            });

            const songs = Object.values(tracksById);
            playQueue({ type: 'album', id: albumId }, songs);

        } catch (err) {
            console.error("Error al abrir el álbum:", err);
            el.playerTracklist.innerHTML = `<div class="empty-state">No se pudo cargar el álbum.</div>`;
        }
    }

    // =================================================
    // FAVORITOS, LISTAS Y HISTORIAL
    // =================================================
    function toggleFavorite(songId) {
        let favorites = db.getFavorites();
        const songIndex = favorites.findIndex(s => s.id === songId);
        
        let song;
        if (songIndex > -1) { // Ya es favorito, quitarlo
            favorites.splice(songIndex, 1);
        } else { // No es favorito, añadirlo
            song = state.player.queue.find(s => s.id === songId) || state.search.albums.flatMap(a => a.songs || []).find(s => s.id === songId);
            if (song) {
                favorites.unshift(song);
            }
        }
        
        db.saveFavorites(favorites);
        renderTracklist(); // Actualiza el corazón en el reproductor
        if (state.currentView === 'favorites') renderFavorites();
    }
    
    function renderFavorites() {
        const favorites = db.getFavorites();
        el.favoritesList.innerHTML = '';
        if (favorites.length === 0) {
            el.favoritesList.innerHTML = `<div class="empty-state">Aún no tienes canciones favoritas. Toca el corazón <i class="fa-solid fa-heart"></i> para añadir una.</div>`;
            return;
        }
        // ... Lógica para renderizar la lista de favoritos (similar a renderTracklist)
    }

    function renderPlaylists() {
        // ... Lógica para renderizar la lista de playlists
    }
    
    function addToRecentlyPlayed(song) {
        if (!song || !song.id) return;
        let recent = db.getRecentlyPlayed();
        // Quita la canción si ya existe para moverla al principio
        recent = recent.filter(s => s.id !== song.id);
        recent.unshift(song);
        // Limita el historial a 50 canciones
        if (recent.length > 50) {
            recent = recent.slice(0, 50);
        }
        db.saveRecentlyPlayed(recent);
    }

    // =================================================
    // INICIALIZACIÓN Y EVENT LISTENERS
    // =================================================

    function init() {
        // Navegación
        el.navLinks.forEach(link => {
            link.addEventListener('click', () => showView(link.dataset.view));
        });

        // Búsqueda
        el.searchButton.addEventListener('click', () => {
            state.search.query = el.searchInput.value.trim();
            searchAlbums(true);
        });
        el.searchInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                state.search.query = el.searchInput.value.trim();
                searchAlbums(true);
            }
        });
        
        // Scroll Infinito
        el.albumList.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = el.albumList;
            if (scrollTop + clientHeight >= scrollHeight - 300) { // Cargar 300px antes del final
                searchAlbums();
            }
        });

        // Clicks en listas
        el.albumList.addEventListener('click', e => {
            const albumItem = e.target.closest('.album-item');
            if (albumItem) openAlbum(albumItem.dataset.albumId);
        });

        el.playerTracklist.addEventListener('click', e => {
            const trackItem = e.target.closest('.playlist-item');
            const favoriteBtn = e.target.closest('.btn-favorite');
            
            if (favoriteBtn) {
                toggleFavorite(favoriteBtn.dataset.songId);
                return;
            }
            if (trackItem) {
                const index = parseInt(trackItem.dataset.index, 10);
                if (index === state.player.currentIndex) {
                    togglePlay();
                } else {
                    loadTrack(index, true);
                }
            }
        });

        // Controles del reproductor
        el.btnPlay.addEventListener('click', togglePlay);
        el.btnNext.addEventListener('click', nextTrack);
        el.btnPrev.addEventListener('click', prevTrack);
        el.btnShuffle.addEventListener('click', toggleShuffle);
        el.btnRepeat.addEventListener('click', toggleRepeat);
        
        // Eventos del tag <audio>
        el.audio.addEventListener('timeupdate', () => {
             const { currentTime, duration } = el.audio;
             if (isNaN(duration)) return;
             el.currentTime.textContent = fmtTime(currentTime);
             el.duration.textContent = fmtTime(duration);
             el.seekBar.value = (currentTime / duration) * 100;
        });
        el.audio.addEventListener('ended', handleTrackEnd);
        el.seekBar.addEventListener('input', () => {
            if (isNaN(el.audio.duration)) return;
            el.audio.currentTime = (el.seekBar.value / 100) * el.audio.duration;
        });

        // Carga inicial
        showView('search');
        searchAlbums(true);
    }

    init();
});
