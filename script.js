document.addEventListener('DOMContentLoaded', function () {
  console.log('Sanavera: DOMContentLoaded');

  // ====== Query de elementos ======
  const el = {
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

    // HERO (player + favs)
    playerHero: document.getElementById('player-hero'),
    heroSongTitle: document.getElementById('hero-song-title'),
    heroSongArtist: document.getElementById('hero-song-artist'),
    favoritesHero: document.getElementById('favorites-hero'),
    favoritesHeroSongTitle: document.getElementById('favorites-hero-song-title'),
    favoritesHeroSongArtist: document.getElementById('favorites-hero-song-artist'),

    // Legacy (oculto por CSS pero lo uso para accesibilidad)
    coverImage: document.getElementById('cover-image'),
    songTitle: document.getElementById('song-title'),
    songArtist: document.getElementById('song-artist'),
    favoritesCoverImage: document.getElementById('favorites-cover-image'),
    favoritesSongTitle: document.getElementById('favorites-song-title'),
    favoritesSongArtist: document.getElementById('favorites-song-artist'),

    // Listas
    playlist: document.getElementById('playlist'),
    favoritesPlaylist: document.getElementById('favorites-playlist'),

    // Players
    audio: document.getElementById('audio-player'),
    favAudio: document.getElementById('favorites-audio-player'),

    // Controles player
    btnPlay: document.getElementById('btn-play'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    btnRepeat: document.getElementById('btn-repeat'),
    btnShuffle: document.getElementById('btn-shuffle'),
    btnDownload: document.getElementById('btn-download'),
    seek: document.getElementById('seek-bar'),
    curTime: document.getElementById('current-time'),
    duration: document.getElementById('duration'),

    // Controles favoritos
    favBtnPlay: document.getElementById('favorites-btn-play'),
    favBtnPrev: document.getElementById('favorites-btn-prev'),
    favBtnNext: document.getElementById('favorites-btn-next'),
    favBtnRepeat: document.getElementById('favorites-btn-repeat'),
    favBtnShuffle: document.getElementById('favorites-btn-shuffle'),
    favBtnDownload: document.getElementById('favorites-btn-download'),
    favSeek: document.getElementById('favorites-seek-bar'),
    favCurTime: document.getElementById('favorites-current-time'),
    favDuration: document.getElementById('favorites-duration'),

    // FABs
    fabSearch: document.getElementById('floating-search-button'),
    fabPlayer: document.getElementById('floating-player-button'),
    fabFavs: document.getElementById('floating-favorites-button'),

    // Calidad (botones + sheets)
    qualityBtn: document.getElementById('quality-button'),
    qualitySheet: document.getElementById('quality-sheet'),
    qualityOpts: document.getElementById('quality-options'),
    qualityClose: document.getElementById('quality-close'),

    favQualityBtn: document.getElementById('favorites-quality-button'),
    favQualitySheet: document.getElementById('favorites-quality-sheet'),
    favQualityOpts: document.getElementById('favorites-quality-options'),
    favQualityClose: document.getElementById('favorites-quality-close')
  };

  // Validación básica
  const missing = Object.entries(el).filter(([_, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.error('Faltan elementos:', missing);
    document.body.innerHTML += '<p style="color:red">Faltan elementos en el DOM.</p>';
    return;
  }

  // ====== Estado ======
  const HQ_FORMATS = ['wav', 'flac', 'aiff', 'alac'];
  const isHQFormat = f => HQ_FORMATS.includes((f || '').toLowerCase());

  let mockAlbums = [
    { id: 'queen_greatest_hits', title: 'Queen - Greatest Hits', artist: 'Queen', image: 'https://indiehoy.com/wp-content/uploads/2022/05/queen-queen-ii.jpg', relevance: 0 }
  ];
  let mockTracks = [
    { title: 'Bohemian Rhapsody', artist: 'Queen', urls: { mp3: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }, coverUrl: 'https://indiehoy.com/wp-content/uploads/2022/05/queen-queen-ii.jpg' },
    { title: 'Another One Bites the Dust', artist: 'Queen', urls: { mp3: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' }, coverUrl: 'https://indiehoy.com/wp-content/uploads/2022/05/queen-queen-ii.jpg' }
  ];

  let currentPage = 1;
  let isLoading = false;
  let currentQuery = '';
  let allAlbums = [];

  // Player principal
  let playlist = [];
  let originalPlaylist = [];
  let currentTrackIndex = 0;
  let isPlaying = false;
  let availableFormats = ['mp3'];
  let currentFormat = 'mp3';
  let repeatMode = 'none';
  let isShuffled = false;

  // Favoritos
  let favorites = []; // persistidos
  let favList = [];
  let originalFavList = [];
  let favIndex = 0;
  let isFavPlaying = false;

  let lastScrollPosition = 0;
  let currentAlbumId = null;

  // ====== Utilidades ======
  function toggleBodyScroll(lock) {
    document.body.classList.toggle('modal-open', !!lock);
  }
  function truncate(text, n) {
    if (!text) return '';
    return text.length > n ? text.slice(0, n - 2) + '..' : text;
  }
  function formatTime(s) {
    if (isNaN(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  }
  function normalizeCreator(creator) {
    return Array.isArray(creator) ? creator.join(', ') : creator || 'Desconocido';
  }
  function isNearMatch(a, b) {
    a = (a || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    b = (b || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (a.includes(b) || b.includes(a)) return true;
    const maxL = Math.max(a.length, b.length);
    let diff = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] !== b[i]) diff++;
      if (diff > maxL * 0.2) return false;
    }
    return true;
  }

  function setHero(scope, coverUrl, title, artist) {
    const isFav = scope === 'favorites';
    const hero = isFav ? el.favoritesHero : el.playerHero;
    const hTitle = isFav ? el.favoritesHeroSongTitle : el.heroSongTitle;
    const hArtist = isFav ? el.favoritesHeroSongArtist : el.heroSongArtist;
    const legacyImg = isFav ? el.favoritesCoverImage : el.coverImage;

    const safe = (coverUrl && coverUrl.trim()) ? coverUrl : 'https://via.placeholder.com/640x640?text=Sin+portada';
    hero.style.setProperty('--cover-url', `url("${safe}")`);
    hTitle.textContent = title || 'Selecciona una canción';
    hArtist.textContent = artist || '';
    legacyImg.src = safe;

    // Accesibilidad (legacy oculto por CSS)
    if (!isFav) {
      el.songTitle.textContent = title || 'Selecciona una canción';
      el.songArtist.textContent = artist || '';
    } else {
      el.favoritesSongTitle.textContent = title || 'Selecciona una canción';
      el.favoritesSongArtist.textContent = artist || '';
    }
  }

  // ====== Tiempo / barras ======
  function wireTime(player, seek, cur, dur, onEndNext) {
    player.addEventListener('loadedmetadata', () => {
      dur.textContent = formatTime(player.duration);
      seek.value = 0;
    });
    player.addEventListener('timeupdate', () => {
      if (!isNaN(player.duration) && player.duration > 0) {
        cur.textContent = formatTime(player.currentTime);
        seek.value = (player.currentTime / player.duration) * 100;
      }
    });
    player.addEventListener('ended', onEndNext);
    seek.addEventListener('input', () => {
      if (!isNaN(player.duration) && player.duration > 0) {
        const t = (player.duration * seek.value) / 100;
        player.currentTime = t;
        cur.textContent = formatTime(t);
      }
    });
  }

  wireTime(el.audio, el.seek, el.curTime, el.duration, () => {
    if (repeatMode === 'one') {
      el.audio.currentTime = 0;
      el.audio.play().catch(() => {});
    } else {
      nextTrack();
    }
  });
  wireTime(el.favAudio, el.favSeek, el.favCurTime, el.favDuration, () => {
    if (repeatMode === 'one') {
      el.favAudio.currentTime = 0;
      el.favAudio.play().catch(() => {});
    } else {
      nextTrack();
    }
  });

  // ====== Calidad (sheets) ======
  function openQualitySheet(scope) {
    if (scope === 'player') {
      // opciones a partir de availableFormats del álbum
      renderQualityOptions(el.qualityOpts, availableFormats, currentFormat, fmt => {
        setPlayerFormat(fmt);
        closeQualitySheet('player');
      });
      el.qualitySheet.classList.add('is-open');
    } else {
      // favoritos: opciones según track actual (o union básica si quisieras)
      const t = favList[favIndex];
      const fmts = t ? Object.keys(t.urls || {}) : ['mp3'];
      const curr = (t && t.format) ? t.format : 'mp3';
      renderQualityOptions(el.favQualityOpts, fmts, curr, fmt => {
        setFavFormat(fmt);
        closeQualitySheet('favorites');
      });
      el.favQualitySheet.classList.add('is-open');
    }
    toggleBodyScroll(true);
  }
  function closeQualitySheet(scope) {
    if (scope === 'player') el.qualitySheet.classList.remove('is-open');
    else el.favQualitySheet.classList.remove('is-open');
    toggleBodyScroll(true); // seguimos en modal
  }
  function renderQualityOptions(container, fmts, current, onPick) {
    container.innerHTML = '';
    const uniq = Array.from(new Set(fmts.map(f => f.toLowerCase())));
    uniq.forEach(f => {
      const btn = document.createElement('button');
      btn.className = 'option-btn' + (f === current ? ' is-current' : '');
      const label = f.toUpperCase() + (isHQFormat(f) ? ' — HQ' : ' — rápido');
      btn.textContent = label;
      btn.addEventListener('click', () => onPick(f));
      container.appendChild(btn);
    });
  }
  function setPlayerFormat(fmt) {
    currentFormat = fmt;
    // Actualizar URLs y descarga
    const t = playlist[currentTrackIndex];
    if (t) {
      const url = t.urls[currentFormat] || t.urls.mp3;
      el.audio.src = url;
      el.btnDownload.setAttribute('href', url);
      el.btnDownload.setAttribute('download', `${t.title}.${currentFormat}`);
      // Mantener play si estaba sonando
      if (isPlaying) el.audio.play().catch(() => {});
    }
    // Re-render para HQ badges
    renderPlaylist();
  }
  function setFavFormat(fmt) {
    const t = favList[favIndex];
    if (!t) return;
    t.format = fmt;
    const url = t.urls[fmt] || t.urls.mp3;
    el.favAudio.src = url;
    el.favBtnDownload.setAttribute('href', url);
    el.favBtnDownload.setAttribute('download', `${t.title}.${fmt}`);
    if (isFavPlaying) el.favAudio.play().catch(() => {});
    renderFavorites();
    // Persistir cambio en storage
    persistFavorites();
  }

  el.qualityBtn.addEventListener('click', () => openQualitySheet('player'));
  el.qualityClose.addEventListener('click', () => closeQualitySheet('player'));
  el.qualitySheet.addEventListener('click', e => {
    if (e.target === el.qualitySheet) closeQualitySheet('player');
  });

  el.favQualityBtn.addEventListener('click', () => openQualitySheet('favorites'));
  el.favQualityClose.addEventListener('click', () => closeQualitySheet('favorites'));
  el.favQualitySheet.addEventListener('click', e => {
    if (e.target === el.favQualitySheet) closeQualitySheet('favorites');
  });

  // ====== Bienvenida ======
  if (!sessionStorage.getItem('welcomeShown')) {
    showOnly('welcome');
    toggleBodyScroll(true);
    setTimeout(() => {
      el.welcomeModal.style.animation = 'fadeOut .5s forwards';
      setTimeout(() => {
        el.welcomeModal.style.display = 'none';
        showSearch();
        currentQuery = 'juan_chota_dura';
        el.searchInput.value = '';
        searchAlbums(currentQuery, currentPage, true);
        sessionStorage.setItem('welcomeShown', 'true');
      }, 500);
    }, 10000);
  } else {
    showSearch();
    currentQuery = 'juan_chota_dura';
    el.searchInput.value = '';
    searchAlbums(currentQuery, currentPage, true);
  }

  // ====== Navegación ======
  function showOnly(which) {
    const map = {
      welcome: [el.welcomeModal],
      search: [el.searchModal],
      player: [el.playerModal],
      favorites: [el.favoritesModal]
    };
    [el.searchModal, el.playerModal, el.favoritesModal, el.welcomeModal].forEach(m => m.style.display = 'none');
    (map[which] || []).forEach(m => m.style.display = 'flex');

    // FABs
    el.fabSearch.style.display = which === 'search' ? 'none' : 'block';
    el.fabFavs.style.display = which === 'favorites' ? 'none' : 'block';
    el.fabPlayer.style.display = (isPlaying || isFavPlaying) && which !== 'player' ? 'block' : 'none';

    toggleBodyScroll(true);
  }
  function showSearch() {
    showOnly('search');
    el.albumList.scrollTop = lastScrollPosition;
  }
  function showPlayer() {
    showOnly('player');
    document.querySelectorAll('#reproductor-container-sanavera .playlist')
      .forEach(pl => pl.scrollLeft = 0);
  }
  function showFavorites() {
    showOnly('favorites');
    loadFavoritesList();
    document.querySelectorAll('#reproductor-container-sanavera .playlist')
      .forEach(pl => pl.scrollLeft = 0);
  }

  el.fabSearch.addEventListener('click', showSearch);
  el.fabPlayer.addEventListener('click', showPlayer);
  el.fabFavs.addEventListener('click', showFavorites);

  // ====== Búsqueda ======
  el.searchButton.addEventListener('click', () => doSearch());
  el.searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') doSearch(); });
  function doSearch() {
    const q = el.searchInput.value.trim();
    if (!q) {
      el.errorMessage.textContent = 'Por favor, ingresa un término de búsqueda.';
      el.errorMessage.style.display = 'block';
      return;
    }
    currentQuery = q;
    currentPage = 1;
    searchAlbums(currentQuery, currentPage, true);
  }

  function searchAlbums(query, page, clear) {
    if (isLoading) return;
    isLoading = true;
    el.loading.style.display = 'block';
    el.errorMessage.style.display = 'none';
    if (clear) {
      el.albumList.innerHTML = '';
      allAlbums = [];
      el.resultsCount.textContent = 'Resultados: 0';
    }

    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:audio+AND+NOT+access-restricted-item:true&fl=identifier,title,creator&rows=5000&page=${page}&output=json`;
    fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`); return r.json(); })
      .then(data => {
        isLoading = false;
        el.loading.style.display = 'none';
        const docs = data.response?.docs || [];
        if (docs.length === 0 && page === 1) {
          el.errorMessage.textContent = 'No se encontraron resultados. Probá con "Amar Azul" o "Queen Greatest Hits".';
          el.errorMessage.style.display = 'block';
          if (clear) displayAlbums(mockAlbums);
          return;
        }
        const albums = docs.map(doc => ({
          id: doc.identifier,
          title: doc.title || 'Sin título',
          artist: normalizeCreator(doc.creator),
          image: `https://archive.org/services/img/${doc.identifier}`,
          relevance: calcRelevance(doc, query.toLowerCase())
        }));
        allAlbums = allAlbums.concat(albums);
        const unique = Array.from(new Map(allAlbums.map(a => [`${a.title}|${a.artist}`, a])).values());
        displayAlbums(unique);
      })
      .catch(err => {
        isLoading = false;
        el.loading.style.display = 'none';
        console.error(err);
        if (clear && allAlbums.length === 0) {
          el.errorMessage.textContent = `Error: ${err.message}. Mostrando datos de prueba.`;
          el.errorMessage.style.display = 'block';
          displayAlbums(mockAlbums);
        } else {
          el.errorMessage.textContent = `Error: ${err.message}.`;
          el.errorMessage.style.display = 'block';
        }
      });
  }
  function calcRelevance(doc, q) {
    const t = (doc.title || '').toLowerCase();
    const c = normalizeCreator(doc.creator).toLowerCase();
    let r = 0;
    if (t === q) r += 300;
    else if (isNearMatch(t, q)) r += 250;
    else if (t.includes(q)) r += 150;
    if (c.includes(q)) r += 50;
    return r;
  }
  function displayAlbums(albums) {
    albums.sort((a, b) => b.relevance - a.relevance);
    el.resultsCount.textContent = `Resultados: ${albums.length}`;
    el.albumList.innerHTML = '';
    albums.forEach(a => {
      const row = document.createElement('div');
      row.className = 'album-item';
      row.innerHTML = `
        <img src="${a.image}" alt="${a.title}" loading="lazy">
        <div class="album-item-info">
          <h3>${truncate(a.title, 35)}</h3>
          <p>${truncate(a.artist, 23)}</p>
        </div>
      `;
      row.addEventListener('click', () => openPlayer(a.id));
      el.albumList.appendChild(row);
    });
  }

  // ====== Player ======
  function openPlayer(albumId) {
    lastScrollPosition = el.albumList.scrollTop;
    showPlayer();

    // Reset UI/estado
    el.playlist.innerHTML = '<p style="padding:10px;color:#b3b3b3">Cargando canciones...</p>';
    el.songTitle.textContent = 'Selecciona una canción';
    el.songArtist.textContent = '';
    el.coverImage.src = '';
    el.audio.src = '';
    el.seek.value = 0; el.curTime.textContent = '0:00'; el.duration.textContent = '0:00';

    playlist = []; originalPlaylist = []; currentTrackIndex = 0;
    isPlaying = false; availableFormats = ['mp3']; currentFormat = 'mp3';
    el.btnPlay.classList.remove('playing');
    el.btnPlay.setAttribute('aria-label', 'Reproducir');
    el.btnRepeat.classList.remove('active', 'repeat-one');
    el.btnShuffle.classList.remove('active');
    repeatMode = 'none'; isShuffled = false;
    currentAlbumId = albumId;

    // Mock
    if (albumId === 'queen_greatest_hits') {
      const cover = mockAlbums[0].image;
      setHero('player', cover, 'Selecciona una canción', 'Queen');
      playlist = mockTracks.map(t => ({ ...t }));
      originalPlaylist = [...playlist];
      availableFormats = ['mp3'];
      renderPlaylist();
      loadTrack(0); // pre-carga
      return;
    }

    // Real
    fetch(`https://archive.org/metadata/${albumId}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`); return r.json(); })
      .then(data => {
        const cover = `https://archive.org/services/img/${albumId}`;
        const artist = normalizeCreator(data.metadata?.creator || data.metadata?.artist || 'Desconocido');
        setHero('player', cover, 'Selecciona una canción', artist);

        const files = (data.files || []).filter(f => f.name && /\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i.test(f.name));
        playlist = files.reduce((acc, file) => {
          const title = extractSongTitle(file.name);
          const fmt = file.name.match(/\.(\w+)$/i)[1].toLowerCase();
          const url = `https://archive.org/download/${albumId}/${encodeURIComponent(file.name).replace(/\+/g, '%20')}`;
          let t = acc.find(x => x.title === title);
          if (!t) { t = { title, artist, coverUrl: cover, urls: {} }; acc.push(t); }
          t.urls[fmt] = url;
          return acc;
        }, []);
        availableFormats = Array.from(new Set(files.map(f => f.name.match(/\.(\w+)$/i)[1].toLowerCase())));

        if (playlist.length === 0) {
          el.playlist.innerHTML = '<p style="padding:10px;color:#b3b3b3">No se encontraron canciones de audio.</p>';
          currentAlbumId = null;
          return;
        }

        originalPlaylist = [...playlist];
        el.coverImage.src = cover;
        renderPlaylist();
        loadTrack(0);
      })
      .catch(err => {
        console.error('openPlayer', err);
        const cover = mockAlbums[0].image;
        setHero('player', cover, 'Selecciona una canción', 'Queen');
        playlist = mockTracks.map(t => ({ ...t }));
        originalPlaylist = [...playlist];
        availableFormats = ['mp3'];
        renderPlaylist();
        loadTrack(0);
      });
  }

  function extractSongTitle(fileName) {
    try {
      let name = fileName.replace(/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i, '');
      const i = name.lastIndexOf('/');
      if (i !== -1) name = name.substring(i + 1);
      return name.replace(/_/g, ' ');
    } catch {
      return fileName.replace(/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i, '').replace(/_/g, ' ');
    }
  }

  function loadTrack(idx) {
    currentTrackIndex = Math.max(0, Math.min(idx, playlist.length - 1));
    const t = playlist[currentTrackIndex];
    if (!t) return;
    setHero('player', t.coverUrl, t.title, t.artist);

    const url = t.urls[currentFormat] || t.urls.mp3;
    el.audio.src = url;
    el.btnDownload.setAttribute('href', url);
    el.btnDownload.setAttribute('download', `${t.title}.${currentFormat}`);

    el.seek.value = 0; el.curTime.textContent = '0:00'; el.duration.textContent = '0:00';
    renderPlaylist(); // para resaltar .is-playing y HQ badge
  }

  function renderPlaylist() {
    el.playlist.innerHTML = '';
    const isHQGlobal = isHQFormat(currentFormat);
    playlist.forEach((t, i) => {
      const playing = i === currentTrackIndex && isPlaying && el.playerModal.style.display === 'flex';
      const hasChosenFmt = !!t.urls[currentFormat];
      const showHQ = isHQGlobal && hasChosenFmt;

      const row = document.createElement('div');
      row.className = 'playlist-item' + (playing ? ' is-playing' : '');
      row.innerHTML = `
        <img src="${t.coverUrl}" alt="${t.title}" loading="lazy" />
        <div class="playlist-item-info">
          <h3>
            ${t.title}
            ${showHQ ? '<span class="hq-badge">HQ</span>' : ''}
            ${playing ? '<span class="eq-mini"><span></span><span></span><span></span><span></span></span>' : ''}
          </h3>
          <p>${t.artist}</p>
        </div>
        <div class="playlist-item-actions">
          <button class="btn-favorite" aria-label="Agregar a favoritos">
            <i class="${isInFavorites(t) ? 'fas fa-heart' : 'far fa-heart'}"></i>
          </button>
        </div>
      `;

      // Click en favorito
      row.querySelector('.btn-favorite').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(t);
        renderPlaylist();
      });

      // Click en la fila
      row.addEventListener('click', () => {
        loadTrack(i);
        el.audio.play().then(() => {
          isPlaying = true;
          el.btnPlay.classList.add('playing');
          el.btnPlay.setAttribute('aria-label', 'Pausar');
          if (isFavPlaying) {
            el.favAudio.pause();
            isFavPlaying = false;
            el.favBtnPlay.classList.remove('playing');
            el.favBtnPlay.setAttribute('aria-label', 'Reproducir');
          }
          el.fabPlayer.style.display = 'none';
          renderPlaylist();
        }).catch(() => {});
      });

      el.playlist.appendChild(row);
    });
  }

  // ====== Favoritos (storage + lista) ======
  try {
    favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    favorites = favorites.filter(f => f && f.title && f.artist && f.urls && f.urls.mp3);
  } catch {
    favorites = [];
    localStorage.setItem('favorites', JSON.stringify([]));
  }

  function persistFavorites() {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }
  function isInFavorites(track) {
    const mp3 = track.urls?.mp3;
    return !!favorites.find(f => f.urls && f.urls.mp3 === mp3);
  }
  function toggleFavorite(track) {
    const mp3 = track.urls?.mp3;
    const idx = favorites.findIndex(f => f.urls && f.urls.mp3 === mp3);
    if (idx >= 0) favorites.splice(idx, 1);
    else favorites.unshift({ ...track, format: currentFormat });
    persistFavorites();
    if (el.favoritesModal.style.display === 'flex') loadFavoritesList();
  }

  function loadFavoritesList() {
    try {
      favorites = JSON.parse(localStorage.getItem('favorites') || '[]')
        .filter(f => f && f.title && f.artist && f.urls && f.urls.mp3);
      favList = [...favorites];
      originalFavList = [...favList];

      if (favList.length === 0) {
        el.favoritesPlaylist.innerHTML = '<p style="padding:10px;color:#b3b3b3">No hay canciones en favoritos.</p>';
        setHero('favorites', '', 'Selecciona una canción', '');
        el.favAudio.src = '';
        el.favSeek.value = 0; el.favCurTime.textContent = '0:00'; el.favDuration.textContent = '0:00';
        isFavPlaying = false;
        el.favBtnPlay.classList.remove('playing');
        el.favBtnPlay.setAttribute('aria-label', 'Reproducir');
        el.favBtnRepeat.classList.remove('active', 'repeat-one');
        el.favBtnShuffle.classList.remove('active');
        return;
      }

      renderFavorites();
      if (!el.favAudio.src) loadFavTrack(favIndex);
    } catch (e) {
      console.error('loadFavoritesList', e);
      el.favoritesPlaylist.innerHTML = '<p style="padding:10px;color:#b3b3b3">Error al cargar favoritos.</p>';
    }
  }

  function renderFavorites() {
    el.favoritesPlaylist.innerHTML = '';
    favList.forEach((t, i) => {
      const playing = i === favIndex && isFavPlaying && el.favoritesModal.style.display === 'flex';
      const fmt = (t.format || 'mp3');
      const showHQ = isHQFormat(fmt) && !!t.urls[fmt];

      const row = document.createElement('div');
      row.className = 'playlist-item' + (playing ? ' is-playing' : '');
      row.innerHTML = `
        <img src="${t.coverUrl}" alt="${t.title}" loading="lazy" />
        <div class="playlist-item-info">
          <h3>
            ${t.title}
            ${showHQ ? '<span class="hq-badge">HQ</span>' : ''}
            ${playing ? '<span class="eq-mini"><span></span><span></span><span></span><span></span></span>' : ''}
          </h3>
          <p>${t.artist}</p>
        </div>
        <div class="playlist-item-actions">
          <button class="btn-remove-favorite" aria-label="Quitar de favoritos">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
      row.querySelector('.btn-remove-favorite').addEventListener('click', (e) => {
        e.stopPropagation();
        const mp3 = t.urls?.mp3;
        favorites = favorites.filter(f => f.urls && f.urls.mp3 !== mp3);
        persistFavorites();
        loadFavoritesList();
        renderPlaylist(); // sync corazón
      });
      row.addEventListener('click', () => {
        favIndex = i;
        loadFavTrack(favIndex);
        el.favAudio.play().then(() => {
          isFavPlaying = true;
          el.favBtnPlay.classList.add('playing');
          el.favBtnPlay.setAttribute('aria-label', 'Pausar');
          if (isPlaying) {
            el.audio.pause();
            isPlaying = false;
            el.btnPlay.classList.remove('playing');
            el.btnPlay.setAttribute('aria-label', 'Reproducir');
          }
          el.fabPlayer.style.display = 'none';
          renderFavorites();
        }).catch(() => {});
      });
      el.favoritesPlaylist.appendChild(row);
    });
  }

  function loadFavTrack(i) {
    favIndex = Math.max(0, Math.min(i, favList.length - 1));
    const t = favList[favIndex];
    if (!t) return;

    setHero('favorites', t.coverUrl, t.title, t.artist);
    const fmt = t.format || 'mp3';
    const url = t.urls[fmt] || t.urls.mp3;
    el.favAudio.src = url;
    el.favBtnDownload.setAttribute('href', url);
    el.favBtnDownload.setAttribute('download', `${t.title}.${fmt}`);

    el.favSeek.value = 0; el.favCurTime.textContent = '0:00'; el.favDuration.textContent = '0:00';
    renderFavorites();
  }

  // ====== Controles ======
  function togglePlay() {
    if (el.playerModal.style.display === 'flex') {
      if (isPlaying) {
        el.audio.pause();
        isPlaying = false;
        el.btnPlay.classList.remove('playing');
        el.btnPlay.setAttribute('aria-label', 'Reproducir');
      } else {
        el.audio.play().then(() => {
          isPlaying = true;
          el.btnPlay.classList.add('playing');
          el.btnPlay.setAttribute('aria-label', 'Pausar');
          if (isFavPlaying) {
            el.favAudio.pause();
            isFavPlaying = false;
            el.favBtnPlay.classList.remove('playing');
            el.favBtnPlay.setAttribute('aria-label', 'Reproducir');
          }
          el.fabPlayer.style.display = 'none';
          renderPlaylist();
        }).catch(() => {});
      }
    } else if (el.favoritesModal.style.display === 'flex') {
      if (isFavPlaying) {
        el.favAudio.pause();
        isFavPlaying = false;
        el.favBtnPlay.classList.remove('playing');
        el.favBtnPlay.setAttribute('aria-label', 'Reproducir');
      } else {
        el.favAudio.play().then(() => {
          isFavPlaying = true;
          el.favBtnPlay.classList.add('playing');
          el.favBtnPlay.setAttribute('aria-label', 'Pausar');
          if (isPlaying) {
            el.audio.pause();
            isPlaying = false;
            el.btnPlay.classList.remove('playing');
            el.btnPlay.setAttribute('aria-label', 'Reproducir');
          }
          el.fabPlayer.style.display = 'none';
          renderFavorites();
        }).catch(() => {});
      }
    }
  }

  function nextTrack() {
    if (el.playerModal.style.display === 'flex') {
      if (currentTrackIndex + 1 < playlist.length) {
        loadTrack(currentTrackIndex + 1);
        if (isPlaying) el.audio.play().catch(() => {});
      } else if (repeatMode === 'all') {
        loadTrack(0);
        if (isPlaying) el.audio.play().catch(() => {});
      }
    } else if (el.favoritesModal.style.display === 'flex') {
      if (favIndex + 1 < favList.length) {
        loadFavTrack(favIndex + 1);
        if (isFavPlaying) el.favAudio.play().catch(() => {});
      } else if (repeatMode === 'all') {
        loadFavTrack(0);
        if (isFavPlaying) el.favAudio.play().catch(() => {});
      }
    }
  }

  function prevTrack() {
    if (el.playerModal.style.display === 'flex') {
      loadTrack((currentTrackIndex - 1 + playlist.length) % playlist.length);
      if (isPlaying) el.audio.play().catch(() => {});
    } else if (el.favoritesModal.style.display === 'flex') {
      loadFavTrack((favIndex - 1 + favList.length) % favList.length);
      if (isFavPlaying) el.favAudio.play().catch(() => {});
    }
  }

  function toggleRepeat() {
    if (repeatMode === 'none') {
      repeatMode = 'all';
      (el.playerModal.style.display === 'flex' ? el.btnRepeat : el.favBtnRepeat).classList.add('active');
    } else if (repeatMode === 'all') {
      repeatMode = 'one';
      (el.playerModal.style.display === 'flex' ? el.btnRepeat : el.favBtnRepeat).classList.add('repeat-one');
    } else {
      (el.playerModal.style.display === 'flex' ? el.btnRepeat : el.favBtnRepeat).classList.remove('active', 'repeat-one');
      repeatMode = 'none';
    }
  }

  function toggleShuffle() {
    if (el.playerModal.style.display === 'flex') {
      isShuffled = !isShuffled;
      el.btnShuffle.classList.toggle('active', isShuffled);
      if (isShuffled) {
        const cur = playlist[currentTrackIndex];
        playlist = shuffle([...playlist]);
        currentTrackIndex = playlist.findIndex(t => t.urls.mp3 === cur.urls.mp3);
      } else {
        playlist = [...originalPlaylist];
        const src = el.audio.src;
        currentTrackIndex = Math.max(0, playlist.findIndex(t => (t.urls[currentFormat] || t.urls.mp3) === src));
      }
      renderPlaylist();
    } else {
      isShuffled = !isShuffled;
      el.favBtnShuffle.classList.toggle('active', isShuffled);
      if (isShuffled) {
        const cur = favList[favIndex];
        favList = shuffle([...favList]);
        favIndex = favList.findIndex(t => t.urls.mp3 === cur.urls.mp3);
      } else {
        favList = [...originalFavList];
        const src = el.favAudio.src;
        favIndex = Math.max(0, favList.findIndex(t => (t.urls[t.format || 'mp3']) === src));
      }
      renderFavorites();
    }
  }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Botones
  el.btnPlay.addEventListener('click', togglePlay);
  el.btnNext.addEventListener('click', nextTrack);
  el.btnPrev.addEventListener('click', prevTrack);
  el.btnRepeat.addEventListener('click', toggleRepeat);
  el.btnShuffle.addEventListener('click', toggleShuffle);

  el.favBtnPlay.addEventListener('click', togglePlay);
  el.favBtnNext.addEventListener('click', nextTrack);
  el.favBtnPrev.addEventListener('click', prevTrack);
  el.favBtnRepeat.addEventListener('click', toggleRepeat);
  el.favBtnShuffle.addEventListener('click', toggleShuffle);
});
