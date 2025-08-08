document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded ejecutado');

    const elements = {
        // Modales
        welcomeModal: document.getElementById('welcome-modal'),
        searchModal: document.getElementById('search-modal'),
        playerModal: document.getElementById('player-modal'),
        favoritesModal: document.getElementById('favorites-modal'),
        // Búsqueda
        searchInput: document.getElementById('search-input'),
        searchButton: document.getElementById('search-button'),
        albumList: document.getElementById('album-list'),
        resultsCount: document.getElementById('results-count'),
        loading: document.getElementById('loading'),
        errorMessage: document.getElementById('error-message'),
        // Player (legacy + hero)
        coverImage: document.getElementById('cover-image'),
        songTitle: document.getElementById('song-title'),
        songArtist: document.getElementById('song-artist'),
        playerHero: document.getElementById('player-hero'),
        heroSongTitle: document.getElementById('hero-song-title'),
        heroSongArtist: document.getElementById('hero-song-artist'),
        // Listas
        playlistElement: document.getElementById('playlist'),
        favoritesPlaylistElement: document.getElementById('favorites-playlist'),
        // Audio players
        audioPlayer: document.getElementById('audio-player'),
        favoritesAudioPlayer: document.getElementById('favorites-audio-player'),
        // Controles player
        btnPlay: document.getElementById('btn-play'),
        btnPrev: document.getElementById('btn-prev'),
        btnNext: document.getElementById('btn-next'),
        btnRepeat: document.getElementById('btn-repeat'),
        btnShuffle: document.getElementById('btn-shuffle'),
        btnDownload: document.getElementById('btn-download'),
        seekBar: document.getElementById('seek-bar'),
        currentTimeElement: document.getElementById('current-time'),
        durationElement: document.getElementById('duration'),
        formatSelector: document.getElementById('format-selector'),
        // FABs
        floatingSearchButton: document.getElementById('floating-search-button'),
        floatingPlayerButton: document.getElementById('floating-player-button'),
        floatingFavoritesButton: document.getElementById('floating-favorites-button'),
        // Favoritos (legacy + hero)
        favoritesCoverImage: document.getElementById('favorites-cover-image'),
        favoritesSongTitle: document.getElementById('favorites-song-title'),
        favoritesSongArtist: document.getElementById('favorites-song-artist'),
        favoritesHero: document.getElementById('favorites-hero'),
        favoritesHeroSongTitle: document.getElementById('favorites-hero-song-title'),
        favoritesHeroSongArtist: document.getElementById('favorites-hero-song-artist'),
        // Controles favoritos
        favoritesBtnPlay: document.getElementById('favorites-btn-play'),
        favoritesBtnPrev: document.getElementById('favorites-btn-prev'),
        favoritesBtnNext: document.getElementById('favorites-btn-next'),
        favoritesBtnRepeat: document.getElementById('favorites-btn-repeat'),
        favoritesBtnShuffle: document.getElementById('favorites-btn-shuffle'),
        favoritesBtnDownload: document.getElementById('favorites-btn-download'),
        favoritesSeekBar: document.getElementById('favorites-seek-bar'),
        favoritesCurrentTime: document.getElementById('favorites-current-time'),
        favoritesDuration: document.getElementById('favorites-duration')
    };

    const missingElements = Object.entries(elements).filter(([_, value]) => !value);
    if (missingElements.length > 0) {
        console.error('Elementos no encontrados:', missingElements.map(([key]) => key));
        document.body.innerHTML += '<p style="color: red;">Error: No se encontraron elementos clave en la página.</p>';
        return;
    }
    console.log('Todos los elementos encontrados correctamente.');

    // Asegura que los botones no tengan texto redundante junto al <i>
    document.querySelectorAll('.btn, .btn-small, .btn-favorite, .btn-remove-favorite, .btn-play')
  .forEach(btn => {
    const icons = btn.querySelectorAll('i');
    if (icons.length) {
      btn.innerHTML = '';
      icons.forEach(i => btn.appendChild(i)); // mantiene play y pause
    }
  });

    // ===== Constantes / estado =====
    const HQ_FORMATS = ['wav', 'flac', 'aiff', 'alac'];

    let mockAlbums = [
        { id: 'queen_greatest_hits', title: 'Queen - Greatest Hits', artist: 'Queen', image: 'https://indiehoy.com/wp-content/uploads/2022/05/queen-queen-ii.jpg', relevance: 0 }
    ];
    let mockTracks = [
        { title: 'Bohemian Rhapsody', artist: 'Queen', urls: { mp3: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }, coverUrl: 'https://indiehoy.com/wp-content/uploads/2022/05/queen-queen-ii.jpg', format: 'mp3' },
        { title: 'Another One Bites the Dust', artist: 'Queen', urls: { mp3: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' }, coverUrl: 'https://indiehoy.com/wp-content/uploads/2022/05/queen-queen-ii.jpg', format: 'mp3' }
    ];
    let currentPage = 1;
    let isLoading = false;
    let currentQuery = '';
    let allAlbums = [];
    let playlistConfig = [];
    let originalPlaylist = [];
    let favoritesPlaylist = [];
    let originalFavoritesPlaylist = [];
    let currentTrackIndex = 0;
    let currentFavoritesTrackIndex = 0;
    let isPlaying = false;
    let isFavoritesPlaying = false;
    let lastScrollPosition = 0;
    let currentAlbumId = null;
    let repeatMode = 'none';
    let isShuffled = false;
    let availableFormats = ['mp3'];
    let currentFormat = 'mp3';
    const paginationEnabled = false;

    // ===== Helpers UI =====
    function setHero(scope, coverUrl, title, artist) {
        const isFav = scope === 'favorites';
        const hero = isFav ? elements.favoritesHero : elements.playerHero;
        const hTitle = isFav ? elements.favoritesHeroSongTitle : elements.heroSongTitle;
        const hArtist = isFav ? elements.favoritesHeroSongArtist : elements.heroSongArtist;
        const legacyImg = isFav ? elements.favoritesCoverImage : elements.coverImage;

        const safeCover = (coverUrl && coverUrl.trim()) ? coverUrl : 'https://via.placeholder.com/640x640?text=Sin+portada';

        if (hero) hero.style.setProperty('--cover-url', `url("${safeCover}")`);
        if (hTitle) hTitle.textContent = title || 'Sin título';
        if (hArtist) hArtist.textContent = artist || '';
        if (legacyImg) legacyImg.src = safeCover; // compat JS existente
    }

    function showFormatSelector(show, formats = []) {
        if (!elements.formatSelector) return;
        elements.formatSelector.classList.add('format-selector');
        elements.formatSelector.style.display = show ? 'block' : 'none';
        if (show && formats.length) {
            elements.formatSelector.innerHTML = formats.map(f => {
                const upper = f.toUpperCase();
                const label = f === 'mp3' ? `${upper} (más rápido)` : `${upper} (alta calidad)`;
                return `<option value="${f}"${f === currentFormat ? ' selected' : ''}>Calidad: ${label}</option>`;
            }).join('');
        }
    }

    // ===== Favoritos en storage =====
    try {
        const storedFavorites = localStorage.getItem('favorites');
        if (storedFavorites) {
            favoritesPlaylist = JSON.parse(storedFavorites);
            favoritesPlaylist = favoritesPlaylist.filter(fav => fav && fav.title && fav.artist && fav.urls && fav.urls.mp3);
            console.log('Favoritos cargados:', favoritesPlaylist);
        }
    } catch (e) {
        console.error('Error al cargar favoritos:', e);
        favoritesPlaylist = [];
        localStorage.setItem('favorites', JSON.stringify([]));
    }

    // ===== Utilidades =====
    function toggleBodyScroll(lock) {
        if (lock) document.body.classList.add('modal-open');
        else document.body.classList.remove('modal-open');
    }
    function truncateText(text, maxLength) {
        if (text.length > maxLength) return text.substring(0, maxLength - 2) + '..';
        return text;
    }
    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function setupPlayerTimeEvents(player, seekBar, currentTimeEl, durationEl) {
        player.addEventListener('loadedmetadata', () => {
            durationEl.textContent = formatTime(player.duration);
            seekBar.value = 0;
        });
        player.addEventListener('timeupdate', () => {
            if (!isNaN(player.duration) && player.duration > 0) {
                currentTimeEl.textContent = formatTime(player.currentTime);
                const progressPercent = (player.currentTime / player.duration) * 100;
                seekBar.value = progressPercent;
            }
        });
        player.addEventListener('ended', () => {
            if (repeatMode === 'one') {
                player.currentTime = 0;
                player.play().catch(error => console.error('Error repeating track:', error));
            } else {
                nextTrack();
            }
        });
        seekBar.addEventListener('input', () => {
            if (!isNaN(player.duration) && player.duration > 0) {
                const newTime = (player.duration * seekBar.value) / 100;
                player.currentTime = newTime;
                currentTimeEl.textContent = formatTime(newTime);
            }
        });
    }

    setupPlayerTimeEvents(elements.audioPlayer, elements.seekBar, elements.currentTimeElement, elements.durationElement);
    setupPlayerTimeEvents(elements.favoritesAudioPlayer, elements.favoritesSeekBar, elements.favoritesCurrentTime, elements.favoritesDuration);

    function setupFormatSelector(selector, player, btnDownload) {
        selector.addEventListener('change', () => {
            currentFormat = selector.value;
            console.log('Formato seleccionado:', currentFormat);
            playlistConfig.forEach(track => { track.format = currentFormat; });
            const currentTrack = playlistConfig[currentTrackIndex];
            if (!currentTrack) return;
            const url = currentTrack.urls[currentFormat] || currentTrack.urls.mp3;
            player.src = url;
            btnDownload.setAttribute('href', url);
            btnDownload.setAttribute('download', `${currentTrack.title}.${currentFormat}`);
            renderPlaylist();
            if (isPlaying) player.play().catch(e => console.error('Error playing track with new format:', e));
        });
    }

    setupFormatSelector(elements.formatSelector, elements.audioPlayer, elements.btnDownload);

    // ===== Bienvenida / arranque =====
    if (!sessionStorage.getItem('welcomeShown')) {
        console.log('Mostrando modal de bienvenida');
        elements.welcomeModal.style.display = 'flex';
        elements.searchModal.style.display = 'none';
        elements.playerModal.style.display = 'none';
        elements.favoritesModal.style.display = 'none';
        elements.floatingSearchButton.style.display = 'none';
        elements.floatingPlayerButton.style.display = 'none';
        elements.floatingFavoritesButton.style.display = 'none';
        toggleBodyScroll(true);
        setTimeout(() => {
            console.log('Transición del modal de bienvenida');
            elements.welcomeModal.style.animation = 'fadeOut 0.5s forwards';
            setTimeout(() => {
                elements.welcomeModal.style.display = 'none';
                showSearchModal();
                currentQuery = 'juan_chota_dura';
                elements.searchInput.value = '';
                searchAlbums(currentQuery, currentPage, true);
                sessionStorage.setItem('welcomeShown', 'true');
            }, 500);
        }, 10000);
    } else {
        console.log('Modal de bienvenida ya mostrado');
        showSearchModal();
        currentQuery = 'juan_chota_dura';
        elements.searchInput.value = '';
        searchAlbums(currentQuery, currentPage, true);
    }

    // ===== Navegación entre modales =====
    function showSearchModal() {
        elements.searchModal.style.display = 'flex';
        elements.playerModal.style.display = 'none';
        elements.favoritesModal.style.display = 'none';
        elements.welcomeModal.style.display = 'none';
        elements.floatingSearchButton.style.display = 'none';
        elements.floatingPlayerButton.style.display = (isPlaying || isFavoritesPlaying) ? 'block' : 'none';
        elements.floatingFavoritesButton.style.display = 'block';
        elements.albumList.scrollTop = lastScrollPosition;
        toggleBodyScroll(true);
    }

    function showPlayerModal() {
        elements.searchModal.style.display = 'none';
        elements.playerModal.style.display = 'flex';
        elements.favoritesModal.style.display = 'none';
        elements.welcomeModal.style.display = 'none';
        elements.floatingSearchButton.style.display = 'block';
        elements.floatingPlayerButton.style.display = 'none';
        elements.floatingFavoritesButton.style.display = 'block';
        toggleBodyScroll(true);
        document.querySelectorAll('#reproductor-container-sanavera .playlist')
            .forEach(el => el.scrollLeft = 0);
    }

    function showFavoritesModal() {
        elements.searchModal.style.display = 'none';
        elements.playerModal.style.display = 'none';
        elements.favoritesModal.style.display = 'flex';
        elements.welcomeModal.style.display = 'none';
        elements.floatingSearchButton.style.display = 'block';
        elements.floatingPlayerButton.style.display = (isPlaying || isFavoritesPlaying) ? 'block' : 'none';
        elements.floatingFavoritesButton.style.display = 'none';
        loadFavorites();
        toggleBodyScroll(true);
        document.querySelectorAll('#reproductor-container-sanavera .playlist')
            .forEach(el => el.scrollLeft = 0);
    }

    function hideAllModals() {
        elements.searchModal.style.display = 'none';
        elements.playerModal.style.display = 'none';
        elements.favoritesModal.style.display = 'none';
        elements.welcomeModal.style.display = 'none';
        toggleBodyScroll(false);
    }

    // FABs
    elements.floatingSearchButton.addEventListener('click', () => { console.log('Navegando a búsqueda'); showSearchModal(); });
    elements.floatingPlayerButton.addEventListener('click', () => { console.log('Navegando a reproductor'); showPlayerModal(); });
    elements.floatingFavoritesButton.addEventListener('click', () => { console.log('Navegando a favoritos'); showFavoritesModal(); });

    // Búsqueda
    elements.searchButton.addEventListener('click', () => {
        const query = elements.searchInput.value.trim();
        if (query) {
            console.log('Búsqueda iniciada por botón:', query);
            currentQuery = query; currentPage = 1;
            searchAlbums(currentQuery, currentPage, true);
        } else {
            console.error('Búsqueda vacía');
            elements.errorMessage.textContent = 'Por favor, ingresa un término de búsqueda.';
            elements.errorMessage.style.display = 'block';
        }
    });
    elements.searchInput.addEventListener('keypress', event => {
        if (event.key === 'Enter') {
            const query = elements.searchInput.value.trim();
            if (query) {
                console.log('Búsqueda iniciada por Enter:', query);
                currentQuery = query; currentPage = 1;
                searchAlbums(currentQuery, currentPage, true);
            } else {
                console.error('Búsqueda vacía');
                elements.errorMessage.textContent = 'Por favor, ingresa un término de búsqueda.';
                elements.errorMessage.style.display = 'block';
            }
        }
    });

    // ===== Búsqueda / resultados =====
    function searchAlbums(query, page, clearPrevious) {
        console.log('Ejecutando searchAlbums:', { query, page, clearPrevious });
        if (isLoading) return;
        isLoading = true;
        elements.loading.style.display = 'block';
        elements.errorMessage.style.display = 'none';
        if (clearPrevious) {
            elements.albumList.innerHTML = '';
            allAlbums = [];
            elements.resultsCount.textContent = 'Resultados: 0';
        }

        const queryEncoded = encodeURIComponent(query);
        const url = `https://archive.org/advancedsearch.php?q=${queryEncoded}+AND+mediatype:audio+AND+NOT+access-restricted-item:true&fl=identifier,title,creator&rows=5000&page=${page}&output=json`;

        fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                return response.json();
            })
            .then(data => {
                isLoading = false;
                elements.loading.style.display = 'none';
                const docs = data.response?.docs || [];
                if (docs.length === 0 && page === 1) {
                    elements.errorMessage.textContent = 'No se encontraron resultados. Probá con "Amar Azul" o "Queen Greatest Hits".';
                    elements.errorMessage.style.display = 'block';
                    if (clearPrevious) displayAlbums(mockAlbums);
                    return;
                }
                if (docs.length === 0 && page > 1) return;

                const albums = docs.map(doc => ({
                    id: doc.identifier,
                    title: doc.title || 'Sin título',
                    artist: normalizeCreator(doc.creator),
                    image: `https://archive.org/services/img/${doc.identifier}`,
                    relevance: calculateRelevance(doc, query.toLowerCase())
                }));
                allAlbums = allAlbums.concat(albums);
                const uniqueAlbums = Array.from(new Map(allAlbums.map(album => [`${album.title}|${album.artist}`, album])).values());
                elements.resultsCount.textContent = `Resultados: ${uniqueAlbums.length}`;
                displayAlbums(uniqueAlbums);
            })
            .catch(error => {
                isLoading = false;
                elements.loading.style.display = 'none';
                console.error('Error en searchAlbums:', error);
                if (clearPrevious && allAlbums.length === 0) {
                    elements.errorMessage.textContent = `Error: ${error.message}. Mostrando datos de prueba.`;
                    elements.errorMessage.style.display = 'block';
                    displayAlbums(mockAlbums);
                } else {
                    elements.errorMessage.textContent = `Error: ${error.message}.`;
                    elements.errorMessage.style.display = 'block';
                }
            });
    }

    function normalizeCreator(creator) {
        return Array.isArray(creator) ? creator.join(', ') : creator || 'Desconocido';
    }

    function calculateRelevance(doc, queryLower) {
        const title = (doc.title || '').toLowerCase();
        const creator = normalizeCreator(doc.creator).toLowerCase();
        let relevance = 0;
        if (title === queryLower) relevance += 300;
        else if (isNearMatch(title, queryLower)) relevance += 250;
        else if (title.includes(queryLower)) relevance += 150;
        if (creator.includes(queryLower)) relevance += 50;
        return relevance;
    }

    function isNearMatch(str1, str2) {
        str1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
        str2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (str1.includes(str2) || str2.includes(str1)) return true;
        const maxLength = Math.max(str1.length, str2.length);
        let differences = 0;
        for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
            if (str1[i] !== str2[i]) differences++;
            if (differences > maxLength * 0.2) return false;
        }
        return true;
    }

    function displayAlbums(albums) {
        console.log('Ejecutando displayAlbums:', albums);
        if (!albums || albums.length === 0) {
            elements.resultsCount.textContent = 'Resultados: 0';
            elements.albumList.innerHTML = '<p>No se encontraron álbumes.</p>';
            return;
        }
        albums.sort((a, b) => b.relevance - a.relevance);
        elements.resultsCount.textContent = `Resultados: ${albums.length}`;
        elements.albumList.innerHTML = '';
        albums.forEach(album => {
            const albumItem = document.createElement('div');
            albumItem.className = 'album-item';
            albumItem.innerHTML = `
                <img src="${album.image}" alt="${album.title}" loading="lazy">
                <div class="album-item-info">
                    <h3>${truncateText(album.title, 35)}</h3>
                    <p>${truncateText(album.artist, 23)}</p>
                </div>
            `;
            albumItem.addEventListener('click', () => openPlayer(album.id));
            elements.albumList.appendChild(albumItem);
        });
    }

    // ===== Player (abrir y preparar) =====
    function openPlayer(albumId) {
        console.log('Ejecutando openPlayer:', albumId);
        lastScrollPosition = elements.albumList.scrollTop;
        showPlayerModal();

        // Reset UI
        elements.playlistElement.innerHTML = '<p>Cargando canciones...</p>';
        elements.songTitle.textContent = 'Selecciona una canción';
        elements.songArtist.textContent = '';
        elements.coverImage.src = '';
        elements.audioPlayer.src = '';
        elements.seekBar.value = 0;
        elements.currentTimeElement.textContent = '0:00';
        elements.durationElement.textContent = '0:00';
        showFormatSelector(false);

        // Reset estado
        playlistConfig = [];
        originalPlaylist = [];
        currentTrackIndex = 0;
        isPlaying = false;
        availableFormats = ['mp3'];
        currentFormat = 'mp3';
        elements.btnPlay.classList.remove('playing');
        elements.btnPlay.setAttribute('aria-label', 'Reproducir');
        elements.btnRepeat.classList.remove('active', 'repeat-one');
        elements.btnShuffle.classList.remove('active');
        repeatMode = 'none';
        isShuffled = false;
        currentAlbumId = albumId;

        // Carga mock
        if (albumId === 'queen_greatest_hits') {
            console.log('Cargando álbum de prueba: Queen');
            const cover = mockAlbums[0].image;
            const artist = 'Queen';
            setHero('player', cover, 'Selecciona una canción', artist);
            elements.songArtist.textContent = artist;

            playlistConfig = mockTracks.map(t => ({ ...t }));
            originalPlaylist = [...playlistConfig];
            availableFormats = ['mp3'];
            showFormatSelector(false);

            initPlayer();
            return;
        }

        // Carga real
        console.log('Consultando metadata para:', albumId);
        fetch(`https://archive.org/metadata/${albumId}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                return response.json();
            })
            .then(data => {
                console.log('Metadata recibida:', data);
                const coverUrl = `https://archive.org/services/img/${albumId}`;
                const artist = normalizeCreator(data.metadata?.creator || data.metadata?.artist || 'Desconocido');

                // Seteo hero con info mínima hasta que cargue track
                setHero('player', coverUrl, 'Selecciona una canción', artist);
                elements.songArtist.textContent = artist;

                const files = (data.files || []).filter(file => file.name && (/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i.test(file.name)));
                console.log('Archivos de audio encontrados:', files);

                playlistConfig = files.reduce((tracks, file) => {
                    const title = extractSongTitle(file.name);
                    const format = file.name.match(/\.(\w+)$/i)[1].toLowerCase();
                    const url = `https://archive.org/download/${albumId}/${encodeURIComponent(file.name).replace(/\+/g, '%20')}`;
                    let track = tracks.find(t => t.title === title);
                    if (!track) {
                        track = { title, artist, coverUrl, urls: {}, format: currentFormat };
                        tracks.push(track);
                    }
                    track.urls[format] = url;
                    return tracks;
                }, []);

                availableFormats = [...new Set(files.map(file => file.name.match(/\.(\w+)$/i)[1].toLowerCase()))];

                if (playlistConfig.length === 0) {
                    console.warn('No se encontraron canciones de audio');
                    elements.playlistElement.innerHTML = '<p>No se encontraron canciones de audio</p>';
                    currentAlbumId = null;
                    return;
                }

                originalPlaylist = [...playlistConfig];
                elements.coverImage.src = coverUrl;

                // Mostrar selector si hay más de un formato
                showFormatSelector(availableFormats.length > 1, availableFormats);

                initPlayer();
            })
            .catch(error => {
                console.error('Error en openPlayer:', error);
                elements.playlistElement.innerHTML = `<p>Error al cargar canciones: ${error.message}. Usando datos de prueba.</p>`;
                playlistConfig = mockTracks.map(t => ({ ...t }));
                originalPlaylist = [...playlistConfig];
                const cover = mockAlbums[0].image;
                setHero('player', cover, 'Selecciona una canción', 'Queen');
                elements.songArtist.textContent = 'Queen';
                currentAlbumId = 'queen_greatest_hits';
                availableFormats = ['mp3'];
                showFormatSelector(false);
                initPlayer();
            });
    }

    function extractSongTitle(fileName) {
        try {
            let name = fileName.replace(/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i, '');
            const lastSlash = name.lastIndexOf('/');
            if (lastSlash !== -1) name = name.substring(lastSlash + 1);
            return name.replace(/_/g, ' ');
        } catch (e) {
            return fileName.replace(/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i, '').replace(/_/g, ' ');
        }
    }

    function initPlayer() {
        console.log('Inicializando reproductor con:', playlistConfig);
        renderPlaylist();
        loadTrack(currentTrackIndex);
        elements.audioPlayer.volume = 1.0;
        elements.btnPlay.classList.remove('playing');
        elements.btnPlay.setAttribute('aria-label', 'Reproducir');
    }

    function renderPlaylist() {
        elements.playlistElement.innerHTML = '';
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

        playlistConfig.forEach((track, index) => {
            const isHQ = HQ_FORMATS.includes(currentFormat);
            const isFav = favorites.some(fav => fav.urls && fav.urls.mp3 === track.urls.mp3);
            const item = document.createElement('div');
            item.className = `playlist-item${index === currentTrackIndex ? ' active' : ''}`;
            item.innerHTML = `
                <img src="${track.coverUrl}" alt="${track.title}" loading="lazy" />
                <div class="playlist-item-info">
                    <h3>${track.title}</h3>
                    <p>${track.artist}</p>
                </div>
                <div class="playlist-item-actions">
                    ${isHQ ? '<span class="hq-indicator">HQ</span>' : ''}
                    <button class="btn-favorite${isFav ? ' active' : ''}" data-index="${index}" aria-label="${isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
                        <i class="${isFav ? 'fas fa-heart' : 'far fa-heart'}"></i>
                    </button>
                </div>
            `;

            item.querySelector('.btn-favorite').addEventListener('click', () => {
                const t = playlistConfig[index];
                if (favorites.some(fav => fav.urls && fav.urls.mp3 === t.urls.mp3)) {
                    removeFromFavorites(t.urls.mp3);
                } else {
                    addToFavorites(t);
                }
            });

            item.addEventListener('click', e => {
                if (!e.target.closest('.btn-favorite')) {
                    currentTrackIndex = index;
                    loadTrack(currentTrackIndex);
                    elements.audioPlayer.play().then(() => {
                        isPlaying = true;
                        elements.btnPlay.classList.add('playing');
                        elements.btnPlay.setAttribute('aria-label', 'Pausar');
                        if (isFavoritesPlaying) {
                            elements.favoritesAudioPlayer.pause();
                            isFavoritesPlaying = false;
                            elements.favoritesBtnPlay.classList.remove('playing');
                            elements.favoritesBtnPlay.setAttribute('aria-label', 'Reproducir');
                        }
                        elements.floatingPlayerButton.style.display = 'none';
                    }).catch(error => console.error('Error playing track:', error));
                }
            });

            elements.playlistElement.appendChild(item);
        });
    }

    function loadTrack(index) {
        const track = playlistConfig[index];
        if (!track) return;
        console.log('Cargando pista:', track, 'Formato:', currentFormat);

        track.format = currentFormat;

        // Texto legacy (debajo del hero)
        elements.songTitle.textContent = track.title;
        elements.songArtist.textContent = track.artist;

        // HERO (lo nuevo)
        setHero('player', track.coverUrl, track.title, track.artist);

        const url = track.urls[currentFormat] || track.urls.mp3;
        elements.audioPlayer.src = url;
        elements.btnDownload.setAttribute('href', url);
        elements.btnDownload.setAttribute('download', `${track.title}.${currentFormat}`);

        elements.seekBar.value = 0;
        elements.currentTimeElement.textContent = '0:00';
        elements.durationElement.textContent = '0:00';

        // Asegura selector coherente
        showFormatSelector(availableFormats.length > 1, availableFormats);
        if (elements.formatSelector) elements.formatSelector.value = currentFormat;

        renderPlaylist();
    }

    // ===== Favoritos =====
    function addToFavorites(track) {
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        if (!favorites.some(fav => fav.urls && fav.urls.mp3 === track.urls.mp3)) {
            favorites.unshift({ ...track, format: currentFormat });
            localStorage.setItem('favorites', JSON.stringify(favorites));
            console.log('Canción añadida a favoritos:', track.title, 'Formato:', currentFormat);
            renderPlaylist();
            if (elements.favoritesModal.style.display === 'flex') loadFavorites();
        }
    }

    function removeFromFavorites(mp3Url) {
        let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        favorites = favorites.filter(fav => !(fav.urls && fav.urls.mp3 === mp3Url));
        localStorage.setItem('favorites', JSON.stringify(favorites));
        favoritesPlaylist = favorites;
        console.log('Canción eliminada de favoritos:', mp3Url);
        if (elements.favoritesModal.style.display === 'flex') loadFavorites();
        renderPlaylist();
    }

    function loadFavorites() {
        console.log('Cargando favoritos');
        try {
            favoritesPlaylist = JSON.parse(localStorage.getItem('favorites') || '[]');
            favoritesPlaylist = favoritesPlaylist.filter(fav => fav && fav.title && fav.artist && fav.urls && fav.urls.mp3);
            console.log('Favoritos filtrados:', favoritesPlaylist);
            originalFavoritesPlaylist = [...favoritesPlaylist];
            if (favoritesPlaylist.length === 0) {
                elements.favoritesPlaylistElement.innerHTML = '<p>No hay canciones en favoritos.</p>';
                elements.favoritesSongTitle.textContent = 'Selecciona una canción';
                elements.favoritesSongArtist.textContent = '';
                setHero('favorites', '', 'Selecciona una canción', '');
                elements.favoritesAudioPlayer.src = '';
                elements.favoritesSeekBar.value = 0;
                elements.favoritesCurrentTime.textContent = '0:00';
                elements.favoritesDuration.textContent = '0:00';
                isFavoritesPlaying = false;
                elements.favoritesBtnPlay.classList.remove('playing');
                elements.favoritesBtnPlay.setAttribute('aria-label', 'Reproducir');
                elements.favoritesBtnRepeat.classList.remove('active', 'repeat-one');
                elements.favoritesBtnShuffle.classList.remove('active');
                repeatMode = 'none';
                isShuffled = false;
                return;
            }
            renderFavoritesPlaylist();
            if (!elements.favoritesAudioPlayer.src) loadFavoritesTrack(currentFavoritesTrackIndex);
        } catch (e) {
            console.error('Error al cargar favoritos:', e);
            elements.favoritesPlaylistElement.innerHTML = '<p>Error al cargar favoritos.</p>';
        }
    }

    function renderFavoritesPlaylist() {
        console.log('Renderizando lista de favoritos:', favoritesPlaylist);
        elements.favoritesPlaylistElement.innerHTML = '';
        favoritesPlaylist.forEach((track, index) => {
            const isHQ = HQ_FORMATS.includes(track.format);
            const item = document.createElement('div');
            item.className = `playlist-item${index === currentFavoritesTrackIndex ? ' active' : ''}`;
            item.innerHTML = `
                <img src="${track.coverUrl}" alt="${track.title}" loading="lazy" />
                <div class="playlist-item-info">
                    <h3>${track.title}</h3>
                    <p>${track.artist}</p>
                </div>
                <div class="playlist-item-actions">
                    ${isHQ ? '<span class="hq-indicator">HQ</span>' : ''}
                    <button class="btn-remove-favorite" data-index="${index}" aria-label="Quitar de favoritos">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            item.querySelector('.btn-remove-favorite').addEventListener('click', () => removeFromFavorites(track.urls.mp3));
            item.addEventListener('click', e => {
                if (!e.target.closest('.btn-remove-favorite')) {
                    currentFavoritesTrackIndex = index;
                    loadFavoritesTrack(currentFavoritesTrackIndex);
                    elements.favoritesAudioPlayer.play().then(() => {
                        isFavoritesPlaying = true;
                        elements.favoritesBtnPlay.classList.add('playing');
                        elements.favoritesBtnPlay.setAttribute('aria-label', 'Pausar');
                        if (isPlaying) {
                            elements.audioPlayer.pause();
                            isPlaying = false;
                            elements.btnPlay.classList.remove('playing');
                            elements.btnPlay.setAttribute('aria-label', 'Reproducir');
                        }
                        elements.floatingPlayerButton.style.display = 'none';
                    }).catch(error => console.error('Error playing track:', error));
                }
            });
            elements.favoritesPlaylistElement.appendChild(item);
        });
    }

    function loadFavoritesTrack(index) {
        const track = favoritesPlaylist[index];
        if (!track) return;
        console.log('Cargando pista de favoritos:', track);

        elements.favoritesSongTitle.textContent = track.title;
        elements.favoritesSongArtist.textContent = track.artist;
        setHero('favorites', track.coverUrl, track.title, track.artist);

        const format = track.format || 'mp3';
        const url = track.urls[format] || track.urls.mp3;
        elements.favoritesAudioPlayer.src = url;
        elements.favoritesBtnDownload.setAttribute('href', url);
        elements.favoritesBtnDownload.setAttribute('download', `${track.title}.${format}`);

        elements.favoritesSeekBar.value = 0;
        elements.favoritesCurrentTime.textContent = '0:00';
        elements.favoritesDuration.textContent = '0:00';

        renderFavoritesPlaylist();
    }

    // ===== Controles =====
    function togglePlay() {
        if (elements.playerModal.style.display === 'flex') {
            if (isPlaying) {
                elements.audioPlayer.pause();
                isPlaying = false;
                elements.btnPlay.classList.remove('playing');
                elements.btnPlay.setAttribute('aria-label', 'Reproducir');
            } else {
                elements.audioPlayer.play().then(() => {
                    isPlaying = true;
                    elements.btnPlay.classList.add('playing');
                    elements.btnPlay.setAttribute('aria-label', 'Pausar');
                    if (isFavoritesPlaying) {
                        elements.favoritesAudioPlayer.pause();
                        isFavoritesPlaying = false;
                        elements.favoritesBtnPlay.classList.remove('playing');
                        elements.favoritesBtnPlay.setAttribute('aria-label', 'Reproducir');
                    }
                    elements.floatingPlayerButton.style.display = 'none';
                }).catch(error => console.error('Error playing audio:', error));
            }
        } else if (elements.favoritesModal.style.display === 'flex') {
            if (isFavoritesPlaying) {
                elements.favoritesAudioPlayer.pause();
                isFavoritesPlaying = false;
                elements.favoritesBtnPlay.classList.remove('playing');
                elements.favoritesBtnPlay.setAttribute('aria-label', 'Reproducir');
            } else {
                elements.favoritesAudioPlayer.play().then(() => {
                    isFavoritesPlaying = true;
                    elements.favoritesBtnPlay.classList.add('playing');
                    elements.favoritesBtnPlay.setAttribute('aria-label', 'Pausar');
                    if (isPlaying) {
                        elements.audioPlayer.pause();
                        isPlaying = false;
                        elements.btnPlay.classList.remove('playing');
                        elements.btnPlay.setAttribute('aria-label', 'Reproducir');
                    }
                    elements.floatingPlayerButton.style.display = 'none';
                }).catch(error => console.error('Error playing audio:', error));
            }
        }
    }

    function nextTrack() {
        if (elements.playerModal.style.display === 'flex') {
            if (currentTrackIndex + 1 < playlistConfig.length) {
                currentTrackIndex = (currentTrackIndex + 1) % playlistConfig.length;
                loadTrack(currentTrackIndex);
                if (isPlaying) elements.audioPlayer.play().catch(error => console.error('Error playing next track:', error));
            } else if (repeatMode === 'all') {
                currentTrackIndex = 0;
                loadTrack(currentTrackIndex);
                if (isPlaying) elements.audioPlayer.play().catch(error => console.error('Error playing next track:', error));
            }
        } else if (elements.favoritesModal.style.display === 'flex') {
            if (currentFavoritesTrackIndex + 1 < favoritesPlaylist.length) {
                currentFavoritesTrackIndex = (currentFavoritesTrackIndex + 1) % favoritesPlaylist.length;
                loadFavoritesTrack(currentFavoritesTrackIndex);
                if (isFavoritesPlaying) elements.favoritesAudioPlayer.play().catch(error => console.error('Error playing next track:', error));
            } else if (repeatMode === 'all') {
                currentFavoritesTrackIndex = 0;
                loadFavoritesTrack(currentFavoritesTrackIndex);
                if (isFavoritesPlaying) elements.favoritesAudioPlayer.play().catch(error => console.error('Error playing next track:', error));
            }
        }
    }

    function prevTrack() {
        if (elements.playerModal.style.display === 'flex') {
            currentTrackIndex = (currentTrackIndex - 1 + playlistConfig.length) % playlistConfig.length;
            loadTrack(currentTrackIndex);
            if (isPlaying) elements.audioPlayer.play().catch(error => console.error('Error playing previous track:', error));
        } else if (elements.favoritesModal.style.display === 'flex') {
            currentFavoritesTrackIndex = (currentFavoritesTrackIndex - 1 + favoritesPlaylist.length) % favoritesPlaylist.length;
            loadFavoritesTrack(currentFavoritesTrackIndex);
            if (isFavoritesPlaying) elements.favoritesAudioPlayer.play().catch(error => console.error('Error playing previous track:', error));
        }
    }

    function toggleRepeat() {
        if (elements.playerModal.style.display === 'flex') {
            if (repeatMode === 'none') {
                repeatMode = 'all';
                elements.btnRepeat.classList.add('active');
                elements.btnRepeat.setAttribute('aria-label', 'Repetir todo');
            } else if (repeatMode === 'all') {
                repeatMode = 'one';
                elements.btnRepeat.classList.add('repeat-one');
                elements.btnRepeat.setAttribute('aria-label', 'Repetir una canción');
            } else {
                repeatMode = 'none';
                elements.btnRepeat.classList.remove('active', 'repeat-one');
                elements.btnRepeat.setAttribute('aria-label', 'Repetir');
            }
            console.log('Modo de repetición:', repeatMode);
        } else if (elements.favoritesModal.style.display === 'flex') {
            if (repeatMode === 'none') {
                repeatMode = 'all';
                elements.favoritesBtnRepeat.classList.add('active');
                elements.favoritesBtnRepeat.setAttribute('aria-label', 'Repetir todo');
            } else if (repeatMode === 'all') {
                repeatMode = 'one';
                elements.favoritesBtnRepeat.classList.add('repeat-one');
                elements.favoritesBtnRepeat.setAttribute('aria-label', 'Repetir una canción');
            } else {
                repeatMode = 'none';
                elements.favoritesBtnRepeat.classList.remove('active', 'repeat-one');
                elements.favoritesBtnRepeat.setAttribute('aria-label', 'Repetir');
            }
            console.log('Modo de repetición (favoritos):', repeatMode);
        }
    }

    function toggleShuffle() {
        if (elements.playerModal.style.display === 'flex') {
            isShuffled = !isShuffled;
            elements.btnShuffle.classList.toggle('active', isShuffled);
            elements.btnShuffle.setAttribute('aria-label', isShuffled ? 'Desactivar mezclar' : 'Mezclar');
            if (isShuffled) {
                const currentTrack = playlistConfig[currentTrackIndex];
                playlistConfig = shuffleArray([...playlistConfig]);
                currentTrackIndex = playlistConfig.findIndex(track => track.urls.mp3 === currentTrack.urls.mp3);
            } else {
                playlistConfig = [...originalPlaylist];
                currentTrackIndex = Math.max(0, playlistConfig.findIndex(t => (t.urls[currentFormat] || t.urls.mp3) === elements.audioPlayer.src));
            }
            renderPlaylist();
            console.log('Modo shuffle:', isShuffled);
        } else if (elements.favoritesModal.style.display === 'flex') {
            isShuffled = !isShuffled;
            elements.favoritesBtnShuffle.classList.toggle('active', isShuffled);
            elements.favoritesBtnShuffle.setAttribute('aria-label', isShuffled ? 'Desactivar mezclar' : 'Mezclar');
            if (isShuffled) {
                const currentTrack = favoritesPlaylist[currentFavoritesTrackIndex];
                favoritesPlaylist = shuffleArray([...favoritesPlaylist]);
                currentFavoritesTrackIndex = favoritesPlaylist.findIndex(track => track.urls.mp3 === currentTrack.urls.mp3);
            } else {
                favoritesPlaylist = [...originalFavoritesPlaylist];
                currentFavoritesTrackIndex = Math.max(0, favoritesPlaylist.findIndex(t => (t.urls[t.format || 'mp3']) === elements.favoritesAudioPlayer.src));
            }
            renderFavoritesPlaylist();
            console.log('Modo shuffle (favoritos):', isShuffled);
        }
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Eventos de control
    elements.btnPlay.addEventListener('click', togglePlay);
    elements.btnNext.addEventListener('click', nextTrack);
    elements.btnPrev.addEventListener('click', prevTrack);
    elements.btnRepeat.addEventListener('click', toggleRepeat);
    elements.btnShuffle.addEventListener('click', toggleShuffle);

    elements.favoritesBtnPlay.addEventListener('click', togglePlay);
    elements.favoritesBtnNext.addEventListener('click', nextTrack);
    elements.favoritesBtnPrev.addEventListener('click', prevTrack);
    elements.favoritesBtnRepeat.addEventListener('click', toggleRepeat);
    elements.favoritesBtnShuffle.addEventListener('click', toggleShuffle);
});
