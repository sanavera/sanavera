document.addEventListener('DOMContentLoaded', function() {
  console.log('DOMContentLoaded');

  // ===== Config =====
  const HQ_FORMATS = ['wav','flac','aiff','alac']; // qué consideramos HQ
  const SUG_MAX = 1; // poner 1 o 3 (tu call). 1 = como tu app Android
  const AUTO_CORRECT_DISTANCE = 2; // distancia máx para autocorregir (0-2 es conservador)

  // ===== Elements =====
  const el = {
    // Modales
    welcomeModal: byId('welcome-modal'),
    searchModal: byId('search-modal'),
    playerModal: byId('player-modal'),
    favoritesModal: byId('favorites-modal'),

    // Búsqueda
    searchInput: byId('search-input'),
    searchButton: byId('search-button'),
    albumList: byId('album-list'),
    resultsCount: byId('results-count'),
    loading: byId('loading'),
    errorMessage: byId('error-message'),

    // Sugerencias (se crea si no existe)
    suggestionsList: byId('suggestions-list'),

    // Player (legacy + hero)
    coverImage: byId('cover-image'),
    songTitle: byId('song-title'),
    songArtist: byId('song-artist'),
    playerHero: byId('player-hero'),
    heroSongTitle: byId('hero-song-title'),
    heroSongArtist: byId('hero-song-artist'),

    // Listas
    playlistElement: byId('playlist'),
    favoritesPlaylistElement: byId('favorites-playlist'),

    // Audio players
    audioPlayer: byId('audio-player'),
    favoritesAudioPlayer: byId('favorites-audio-player'),

    // Controles player
    btnPlay: byId('btn-play'),
    btnPrev: byId('btn-prev'),
    btnNext: byId('btn-next'),
    btnRepeat: byId('btn-repeat'),
    btnShuffle: byId('btn-shuffle'),
    btnDownload: byId('btn-download'),
    seekBar: byId('seek-bar'),
    currentTimeElement: byId('current-time'),
    durationElement: byId('duration'),

    // Botón/Popover de calidad (los creo si no están)
    formatSelector: byId('format-selector'), // spinner viejo (lo ocultamos)
    qualityBtn: null,
    qualityPopover: null,

    // FABs
    floatingSearchButton: byId('floating-search-button'),
    floatingPlayerButton: byId('floating-player-button'),
    floatingFavoritesButton: byId('floating-favorites-button'),

    // Favoritos (legacy + hero)
    favoritesCoverImage: byId('favorites-cover-image'),
    favoritesSongTitle: byId('favorites-song-title'),
    favoritesSongArtist: byId('favorites-song-artist'),
    favoritesHero: byId('favorites-hero'),
    favoritesHeroSongTitle: byId('favorites-hero-song-title'),
    favoritesHeroSongArtist: byId('favorites-hero-song-artist'),

    // Controles favoritos
    favoritesBtnPlay: byId('favorites-btn-play'),
    favoritesBtnPrev: byId('favorites-btn-prev'),
    favoritesBtnNext: byId('favorites-btn-next'),
    favoritesBtnRepeat: byId('favorites-btn-repeat'),
    favoritesBtnShuffle: byId('favorites-btn-shuffle'),
    favoritesBtnDownload: byId('favorites-btn-download'),
    favoritesSeekBar: byId('favorites-seek-bar'),
    favoritesCurrentTime: byId('favorites-current-time'),
    favoritesDuration: byId('favorites-duration')
  };

  // Crear lista de sugerencias si no existe
  if (!el.suggestionsList) {
    const ul = document.createElement('ul');
    ul.id = 'suggestions-list';
    document.body.appendChild(ul);
    el.suggestionsList = ul;
  }

  // Armar botón HQ + popover (si no existen)
  setupQualityUI();

  // Asegura que los botones no tengan texto adicional
  document.querySelectorAll('.btn, .btn-small, .btn-play, .btn-favorite, .btn-remove-favorite')
    .forEach(btn => {
      const icons = btn.querySelectorAll('i');
      if (icons.length) {
        btn.innerHTML = '';
        icons.forEach(i => btn.appendChild(i));
      }
    });

  // ===== Estado =====
  const mockAlbums = [
    { id: 'queen_greatest_hits', title: 'Queen - Greatest Hits', artist: 'Queen', image: 'https://indiehoy.com/wp-content/uploads/2022/05/queen-queen-ii.jpg', relevance: 0 }
  ];
  const mockTracks = [
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
  let bestSuggestion = null;

  // ===== LocalStorage favoritos =====
  try {
    const storedFavorites = localStorage.getItem('favorites');
    if (storedFavorites) {
      favoritesPlaylist = JSON.parse(storedFavorites)
        .filter(f => f && f.title && f.artist && f.urls && f.urls.mp3);
    }
  } catch {
    favoritesPlaylist = [];
    localStorage.setItem('favorites', JSON.stringify([]));
  }

  // ===== Bienvenida / arranque =====
  if (!sessionStorage.getItem('welcomeShown')) {
    showOnly(el.welcomeModal);
    hideFABs();
    lockScroll(true);
    setTimeout(() => {
      el.welcomeModal.style.animation = 'fadeOut .5s forwards';
      setTimeout(() => {
        el.welcomeModal.style.display = 'none';
        showSearchModal();
        currentQuery = 'juan_chota_dura';
        el.searchInput.value = '';
        searchAlbums(currentQuery, currentPage, true);
        sessionStorage.setItem('welcomeShown', 'true');
      }, 500);
    }, 10000);
  } else {
    showSearchModal();
    currentQuery = 'juan_chota_dura';
    el.searchInput.value = '';
    searchAlbums(currentQuery, currentPage, true);
  }

  // ===== NAV =====
  el.floatingSearchButton.addEventListener('click', showSearchModal);
  el.floatingPlayerButton.addEventListener('click', showPlayerModal);
  el.floatingFavoritesButton.addEventListener('click', showFavoritesModal);

  // ===== Búsqueda + sugerencias =====
  el.searchButton.addEventListener('click', onSearchSubmit);
  el.searchInput.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowDown' && el.suggestionsList.classList.contains('show')) {
      const first = el.suggestionsList.querySelector('li');
      if (first) first.focus();
    }
    if (ev.key === 'Enter') onSearchSubmit();
  });
  el.searchInput.addEventListener('input', debounce(onInputFetchSuggestions, 200));

  // cerrar sugerencias al click afuera
  document.addEventListener('click', (e) => {
    if (!el.suggestionsList.contains(e.target) && e.target !== el.searchInput) {
      hideSuggestions();
    }
  });
  window.addEventListener('resize', positionSuggestions);

  // ===== Player timers =====
  setupPlayerTime(el.audioPlayer, el.seekBar, el.currentTimeElement, el.durationElement);
  setupPlayerTime(el.favoritesAudioPlayer, el.favoritesSeekBar, el.favoritesCurrentTime, el.favoritesDuration);

  // ===== Controles =====
  el.btnPlay.addEventListener('click', togglePlay);
  el.btnNext.addEventListener('click', nextTrack);
  el.btnPrev.addEventListener('click', prevTrack);
  el.btnRepeat.addEventListener('click', toggleRepeat);
  el.btnShuffle.addEventListener('click', toggleShuffle);

  el.favoritesBtnPlay.addEventListener('click', togglePlay);
  el.favoritesBtnNext.addEventListener('click', nextTrack);
  el.favoritesBtnPrev.addEventListener('click', prevTrack);
  el.favoritesBtnRepeat.addEventListener('click', toggleRepeat);
  el.favoritesBtnShuffle.addEventListener('click', toggleShuffle);

  // ===== Funciones UI base =====
  function byId(id){ return document.getElementById(id); }
  function lockScroll(lock){ document.body.classList.toggle('modal-open', !!lock); }
  function showOnly(modal){
    [el.searchModal, el.playerModal, el.favoritesModal, el.welcomeModal].forEach(m => m && (m.style.display='none'));
    if(modal) modal.style.display='flex';
    lockScroll(true);
  }
  function showSearchModal(){
    showOnly(el.searchModal);
    el.floatingSearchButton.style.display = 'none';
    el.floatingPlayerButton.style.display = (isPlaying || isFavoritesPlaying) ? 'block' : 'none';
    el.floatingFavoritesButton.style.display = 'block';
    el.albumList.scrollTop = lastScrollPosition;
    positionSuggestions();
  }
  function showPlayerModal(){
    showOnly(el.playerModal);
    el.floatingSearchButton.style.display = 'block';
    el.floatingPlayerButton.style.display = 'none';
    el.floatingFavoritesButton.style.display = 'block';
  }
  function showFavoritesModal(){
    showOnly(el.favoritesModal);
    el.floatingSearchButton.style.display = 'block';
    el.floatingPlayerButton.style.display = (isPlaying || isFavoritesPlaying) ? 'block' : 'none';
    el.floatingFavoritesButton.style.display = 'none';
    loadFavorites();
  }
  function hideFABs(){
    el.floatingSearchButton.style.display='none';
    el.floatingPlayerButton.style.display='none';
    el.floatingFavoritesButton.style.display='none';
  }

  // ===== HERO =====
  function setHero(scope, coverUrl, title, artist){
    const isFav = scope === 'favorites';
    const hero = isFav ? el.favoritesHero : el.playerHero;
    const hTitle = isFav ? el.favoritesHeroSongTitle : el.heroSongTitle;
    const hArtist = isFav ? el.favoritesHeroSongArtist : el.heroSongArtist;
    const legacyImg = isFav ? el.favoritesCoverImage : el.coverImage;

    const safeCover = (coverUrl && coverUrl.trim()) ? coverUrl : 'https://via.placeholder.com/640x640?text=Sin+portada';
    if (hero) hero.style.setProperty('--cover-url', `url("${safeCover}")`);
    if (hTitle) hTitle.textContent = title || 'Sin título';
    if (hArtist) hArtist.textContent = artist || '';
    if (legacyImg) legacyImg.src = safeCover;
  }

  // ===== Formatos (HQ popover) =====
  function setupQualityUI(){
    // ocultar spinner viejo si existe
    if (el.formatSelector) el.formatSelector.style.display = 'none';

    // crear botón
    const btn = document.createElement('button');
    btn.className = 'quality-btn';
    btn.type = 'button';
    btn.innerHTML = `<i class="fa-solid fa-wave-square"></i><span class="quality-label">Calidad</span>`;
    // insertar al inicio de .player-section (debajo del hero)
    const playerSection = document.querySelector('#player-modal .player-section');
    if (playerSection) playerSection.insertBefore(btn, playerSection.firstChild);
    el.qualityBtn = btn;

    // crear popover
    const pop = document.createElement('div');
    pop.className = 'quality-popover';
    // lo agregamos dentro del modal para posicionamiento
    const modalContent = document.querySelector('#player-modal .modal-content');
    modalContent.appendChild(pop);
    el.qualityPopover = pop;

    // toggle
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      rebuildQualityPopover();
      togglePopover(true);
    });
    // cerrar al click fuera
    document.addEventListener('click', (e) => {
      if (!pop.contains(e.target) && e.target !== btn) togglePopover(false);
    });
    // reposicionar al scroll/resize
    window.addEventListener('resize', () => { if (pop.classList.contains('open')) positionPopover(); });
    document.addEventListener('scroll', () => { if (pop.classList.contains('open')) positionPopover(); }, true);
  }

  function rebuildQualityPopover(){
    if (!el.qualityPopover) return;
    const pop = el.qualityPopover;
    pop.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'q-item';
    title.style.fontWeight = '700';
    title.style.cursor = 'default';
    title.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Elegir calidad`;
    pop.appendChild(title);

    (availableFormats && availableFormats.length ? availableFormats : ['mp3']).forEach(fmt => {
      const item = document.createElement('div');
      item.className = 'q-item';
      const isHQ = HQ_FORMATS.includes(fmt.toLowerCase());
      item.innerHTML = `
        <i class="fa-solid ${fmt==='mp3' ? 'fa-bolt' : 'fa-gem'}"></i>
        <span>${fmt.toUpperCase()}</span>
        ${isHQ ? '<span class="q-badge">HQ</span>' : ''}
        ${fmt===currentFormat ? '<i class="fa-solid fa-check" style="margin-left:auto"></i>':''}
      `;
      item.addEventListener('click', () => {
        setFormat(fmt);
        togglePopover(false);
      });
      pop.appendChild(item);
    });
    positionPopover();
  }

  function positionPopover(){
    if (!el.qualityBtn || !el.qualityPopover) return;
    const rect = el.qualityBtn.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 8;
    const left = rect.left + rect.width/2 + window.scrollX;
    el.qualityPopover.style.top = `${top}px`;
    el.qualityPopover.style.left = `${left}px`;
  }
  function togglePopover(open){
    if (!el.qualityPopover) return;
    if (open) {
      rebuildQualityPopover();
      el.qualityPopover.classList.add('open');
    } else {
      el.qualityPopover.classList.remove('open');
    }
  }
  function setFormat(fmt){
    currentFormat = fmt;
    // actualizar url actual
    const currentTrack = playlistConfig[currentTrackIndex];
    if (currentTrack) {
      const url = currentTrack.urls[currentFormat] || currentTrack.urls.mp3;
      el.audioPlayer.src = url;
      el.btnDownload.setAttribute('href', url);
      el.btnDownload.setAttribute('download', `${currentTrack.title}.${currentFormat}`);
      if (isPlaying) el.audioPlayer.play().catch(()=>{});
    }
    // re-render para HQ badges junto al título
    renderPlaylist();
    // actualizar label del botón (opcional)
    const label = document.querySelector('.quality-btn .quality-label');
    if (label) label.textContent = `Calidad${HQ_FORMATS.includes(currentFormat)?' (HQ)':''}`;
  }

  // ===== Tiempo / barras =====
  function setupPlayerTime(player, seekBar, currentTimeEl, durationEl){
    player.addEventListener('loadedmetadata', () => {
      durationEl.textContent = fmtTime(player.duration);
      seekBar.value = 0;
    });
    player.addEventListener('timeupdate', () => {
      if (!isNaN(player.duration) && player.duration > 0) {
        currentTimeEl.textContent = fmtTime(player.currentTime);
        const progress = (player.currentTime / player.duration) * 100;
        seekBar.value = progress;
      }
    });
    player.addEventListener('ended', () => {
      if (repeatMode === 'one') {
        player.currentTime = 0;
        player.play().catch(()=>{});
      } else {
        nextTrack();
      }
    });
    seekBar.addEventListener('input', () => {
      if (!isNaN(player.duration) && player.duration > 0) {
        const newTime = (player.duration * seekBar.value) / 100;
        player.currentTime = newTime;
        currentTimeEl.textContent = fmtTime(newTime);
      }
    });
  }
  function fmtTime(s){
    if (isNaN(s) || s < 0) return '0:00';
    const m = Math.floor(s/60); const sec = Math.floor(s%60);
    return `${m}:${sec<10?'0':''}${sec}`;
  }

  // ===== Búsqueda =====
  function onSearchSubmit(){
    hideSuggestions();
    const raw = el.searchInput.value.trim();
    if (!raw) {
      el.errorMessage.textContent = 'Por favor, ingresa un término de búsqueda.';
      el.errorMessage.style.display = 'block';
      return;
    }

    // autocorrección si hay sugerencia muy cercana
    const chosen = pickAutoCorrect(raw, bestSuggestion, AUTO_CORRECT_DISTANCE);
    if (chosen && chosen.toLowerCase() !== raw.toLowerCase()) {
      el.searchInput.value = chosen;
    }

    currentQuery = el.searchInput.value.trim();
    currentPage = 1;
    searchAlbums(currentQuery, currentPage, true);
  }

  function positionSuggestions(){
    if (!el.suggestionsList || !el.searchInput) return;
    const sc = document.querySelector('#search-modal .search-container');
    const rect = sc ? sc.getBoundingClientRect() : el.searchInput.getBoundingClientRect();
    el.suggestionsList.style.top = `${(rect.bottom + window.scrollY)}px`;
    el.suggestionsList.style.left = `var(--side-pad)`;
    el.suggestionsList.style.right = `var(--side-pad)`;
  }
  function showSuggestions(items){
    if (!items || !items.length) return hideSuggestions();
    el.suggestionsList.innerHTML = '';
    items.slice(0, SUG_MAX).forEach((txt, idx) => {
      const li = document.createElement('li');
      li.tabIndex = 0;
      li.innerHTML = `<span class="sug-primary">${escapeHtml(txt)}</span><span class="sug-hint"></span>`;
      li.addEventListener('click', () => {
        el.searchInput.value = txt;
        hideSuggestions();
        // lanzar búsqueda
        currentQuery = txt;
        currentPage = 1;
        searchAlbums(currentQuery, currentPage, true);
      });
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') li.click();
        if (e.key === 'Escape') hideSuggestions();
      });
      el.suggestionsList.appendChild(li);
    });
    positionSuggestions();
    el.suggestionsList.classList.add('show');
  }
  function hideSuggestions(){
    el.suggestionsList.classList.remove('show');
  }
  function onInputFetchSuggestions(){
    const q = el.searchInput.value.trim();
    bestSuggestion = null;
    if (!q) return hideSuggestions();

    // Google suggest (cliente firefox suele permitir CORS)
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}`;
    fetch(url, {method:'GET'})
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        // data = [query, [sug1, sug2, ...]]
        const arr = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
        // quedarnos con las que más probablemente sean nombres de artista/álbum/canción (heurística liviana)
        const cleaned = arr
          .map(s => s.toString())
          .filter(s => s.length >= 2)
          .filter((s,i,aa) => aa.indexOf(s) === i);

        // top como “mejor” para autocorrect
        bestSuggestion = cleaned[0] || null;

        if (cleaned.length) showSuggestions(cleaned);
        else hideSuggestions();
      })
      .catch(() => {
        // si falla sugerencias, ocultamos
        hideSuggestions();
      });
  }
  function pickAutoCorrect(original, suggestion, maxDist){
    if (!suggestion) return null;
    const dist = levenshtein(original.toLowerCase(), suggestion.toLowerCase());
    return dist <= maxDist ? suggestion : null;
  }
  function levenshtein(a,b){
    const m = a.length, n = b.length;
    if (m===0) return n; if (n===0) return m;
    const dp = Array.from({length:m+1}, ()=>Array(n+1).fill(0));
    for (let i=0;i<=m;i++) dp[i][0]=i;
    for (let j=0;j<=n;j++) dp[0][j]=j;
    for (let i=1;i<=m;i++){
      for (let j=1;j<=n;j++){
        const cost = a[i-1]===b[j-1]?0:1;
        dp[i][j] = Math.min(
          dp[i-1][j]+1,
          dp[i][j-1]+1,
          dp[i-1][j-1]+cost
        );
      }
    }
    return dp[m][n];
  }
  function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) }

  function searchAlbums(query, page, clearPrevious){
    if (isLoading) return;
    isLoading = true;
    el.loading.style.display = 'block';
    el.errorMessage.style.display = 'none';
    if (clearPrevious) {
      el.albumList.innerHTML = '';
      allAlbums = [];
      el.resultsCount.textContent = 'Resultados: 0';
    }

    const queryEncoded = encodeURIComponent(query);
    const url = `https://archive.org/advancedsearch.php?q=${queryEncoded}+AND+mediatype:audio+AND+NOT+access-restricted-item:true&fl=identifier,title,creator&rows=5000&page=${page}&output=json`;

    fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`); return r.json(); })
      .then(data => {
        isLoading = false;
        el.loading.style.display = 'none';

        const docs = data.response?.docs || [];
        if (docs.length === 0 && page === 1) {
          el.errorMessage.textContent = 'No se encontraron resultados. Probá con "Amar Azul" o "Queen Greatest Hits".';
          el.errorMessage.style.display = 'block';
          if (clearPrevious) displayAlbums(mockAlbums);
          return;
        }
        if (docs.length === 0 && page > 1) return;

        const albums = docs.map(doc => ({
          id: doc.identifier,
          title: doc.title || 'Sin título',
          artist: normalizeCreator(doc.creator),
          image: `https://archive.org/services/img/${doc.identifier}`,
          relevance: calcRelevance(doc, query.toLowerCase())
        }));
        allAlbums = allAlbums.concat(albums);
        const unique = Array.from(new Map(allAlbums.map(a => [`${a.title}|${a.artist}`, a])).values());
        el.resultsCount.textContent = `Resultados: ${unique.length}`;
        displayAlbums(unique);
      })
      .catch(err => {
        isLoading = false;
        el.loading.style.display = 'none';
        if (clearPrevious && allAlbums.length === 0) {
          el.errorMessage.textContent = `Error: ${err.message}. Mostrando datos de prueba.`;
          el.errorMessage.style.display = 'block';
          displayAlbums(mockAlbums);
        } else {
          el.errorMessage.textContent = `Error: ${err.message}.`;
          el.errorMessage.style.display = 'block';
        }
      });
  }
  function normalizeCreator(c){ return Array.isArray(c)? c.join(', ') : c || 'Desconocido'; }
  function calcRelevance(doc, q){
    const title = (doc.title||'').toLowerCase();
    const creator = normalizeCreator(doc.creator).toLowerCase();
    let score = 0;
    if (title === q) score += 300;
    else if (nearMatch(title,q)) score += 250;
    else if (title.includes(q)) score += 150;
    if (creator.includes(q)) score += 50;
    return score;
  }
  function nearMatch(a,b){
    a = a.toLowerCase().replace(/[^a-z0-9]/g,'');
    b = b.toLowerCase().replace(/[^a-z0-9]/g,'');
    if (a.includes(b) || b.includes(a)) return true;
    return levenshtein(a,b) <= 2;
  }
  function displayAlbums(albums){
    if (!albums || !albums.length) {
      el.resultsCount.textContent = 'Resultados: 0';
      el.albumList.innerHTML = '<p>No se encontraron álbumes.</p>';
      return;
    }
    albums.sort((x,y)=>y.relevance-x.relevance);
    el.resultsCount.textContent = `Resultados: ${albums.length}`;
    el.albumList.innerHTML = '';
    albums.forEach(album => {
      const div = document.createElement('div');
      div.className = 'album-item';
      div.innerHTML = `
        <img src="${album.image}" alt="${escapeHtml(album.title)}" loading="lazy">
        <div class="album-item-info">
          <h3>${escapeHtml(truncate(album.title,35))}</h3>
          <p>${escapeHtml(truncate(album.artist,23))}</p>
        </div>
      `;
      div.addEventListener('click', () => openPlayer(album.id));
      el.albumList.appendChild(div);
    });
  }
  function truncate(t, n){ return t.length>n ? t.slice(0,n-2)+'..' : t; }

  // ===== Player =====
  function openPlayer(albumId){
    lastScrollPosition = el.albumList.scrollTop;
    showPlayerModal();

    // Reset UI
    el.playlistElement.innerHTML = '<p>Cargando canciones...</p>';
    el.songTitle.textContent = 'Selecciona una canción';
    el.songArtist.textContent = '';
    el.coverImage.src = '';
    el.audioPlayer.src = '';
    el.seekBar.value = 0;
    el.currentTimeElement.textContent = '0:00';
    el.durationElement.textContent = '0:00';
    togglePopover(false);

    // Reset state
    playlistConfig = [];
    originalPlaylist = [];
    currentTrackIndex = 0;
    isPlaying = false;
    availableFormats = ['mp3'];
    currentFormat = 'mp3';
    el.btnPlay.classList.remove('playing');
    el.btnPlay.setAttribute('aria-label','Reproducir');
    el.btnRepeat.classList.remove('active','repeat-one');
    el.btnShuffle.classList.remove('active');
    repeatMode = 'none';
    isShuffled = false;
    currentAlbumId = albumId;

    if (albumId === 'queen_greatest_hits') {
      const cover = mockAlbums[0].image;
      const artist = 'Queen';
      setHero('player', cover, 'Selecciona una canción', artist);
      el.songArtist.textContent = artist;
      playlistConfig = mockTracks.map(t=>({...t}));
      originalPlaylist = [...playlistConfig];
      availableFormats = ['mp3'];
      initPlayer();
      return;
    }

    fetch(`https://archive.org/metadata/${albumId}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`); return r.json(); })
      .then(data => {
        const coverUrl = `https://archive.org/services/img/${albumId}`;
        const artist = normalizeCreator(data.metadata?.creator || data.metadata?.artist || 'Desconocido');
        setHero('player', coverUrl, 'Selecciona una canción', artist);
        el.songArtist.textContent = artist;

        const files = (data.files||[]).filter(f => f.name && /\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i.test(f.name));
        playlistConfig = files.reduce((tracks,file) => {
          const title = extractSongTitle(file.name);
          const fmt = file.name.match(/\.(\w+)$/i)[1].toLowerCase();
          const url = `https://archive.org/download/${albumId}/${encodeURIComponent(file.name).replace(/\+/g,'%20')}`;
          let t = tracks.find(x => x.title === title);
          if (!t){ t = { title, artist, coverUrl, urls:{}, format: currentFormat }; tracks.push(t); }
          t.urls[fmt] = url;
          return tracks;
        }, []);
        availableFormats = [...new Set(files.map(f => f.name.match(/\.(\w+)$/i)[1].toLowerCase()))];

        if (!playlistConfig.length) {
          el.playlistElement.innerHTML = '<p>No se encontraron canciones de audio</p>';
          currentAlbumId = null;
          return;
        }

        originalPlaylist = [...playlistConfig];
        el.coverImage.src = coverUrl;

        initPlayer();
      })
      .catch(err => {
        console.error(err);
        el.playlistElement.innerHTML = `<p>Error al cargar canciones: ${err.message}. Usando datos de prueba.</p>`;
        playlistConfig = mockTracks.map(t=>({...t}));
        originalPlaylist = [...playlistConfig];
        const cover = mockAlbums[0].image;
        setHero('player', cover, 'Selecciona una canción', 'Queen');
        el.songArtist.textContent = 'Queen';
        currentAlbumId = 'queen_greatest_hits';
        availableFormats = ['mp3'];
        initPlayer();
      });
  }

  function extractSongTitle(fn){
    try {
      let name = fn.replace(/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i, '');
      const i = name.lastIndexOf('/');
      if (i !== -1) name = name.substring(i+1);
      return name.replace(/_/g,' ');
    } catch {
      return fn.replace(/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i,'').replace(/_/g,' ');
    }
  }

  function initPlayer(){
    renderPlaylist();
    loadTrack(currentTrackIndex);
    el.audioPlayer.volume = 1.0;
    el.btnPlay.classList.remove('playing');
    el.btnPlay.setAttribute('aria-label','Reproducir');
    // actualizar botón calidad label
    const label = document.querySelector('.quality-btn .quality-label');
    if (label) label.textContent = `Calidad${HQ_FORMATS.includes(currentFormat)?' (HQ)':''}`;
  }

  function renderPlaylist(){
    el.playlistElement.innerHTML = '';
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    const isCurrentHQ = HQ_FORMATS.includes(currentFormat);

    playlistConfig.forEach((track, index) => {
      const isFav = favs.some(f => f.urls && f.urls.mp3 === track.urls.mp3);
      const active = index === currentTrackIndex;

      const row = document.createElement('div');
      row.className = `playlist-item${active ? ' active' : ''}`;

      // carátula
      const img = document.createElement('img');
      img.src = track.coverUrl;
      img.alt = track.title;
      img.loading = 'lazy';
      row.appendChild(img);

      // info (título con HQ inline y EQ si activo)
      const info = document.createElement('div');
      info.className = 'playlist-item-info';
      const h3 = document.createElement('h3');

      if (isCurrentHQ) {
        const badge = document.createElement('span');
        badge.className = 'hq-indicator';
        badge.textContent = 'HQ';
        h3.appendChild(badge);
        h3.appendChild(document.createTextNode(' '));
      }

      if (active && isPlaying) {
        const eq = document.createElement('span');
        eq.className = 'eq';
        eq.innerHTML = '<span></span><span></span><span></span>';
        h3.prepend(eq);
      }
      h3.appendChild(document.createTextNode(track.title));
      const p = document.createElement('p');
      p.textContent = track.artist;

      info.appendChild(h3);
      info.appendChild(p);
      row.appendChild(info);

      // acciones (fav)
      const actions = document.createElement('div');
      actions.className = 'playlist-item-actions';
      const favBtn = document.createElement('button');
      favBtn.className = `btn-favorite${isFav ? ' active' : ''}`;
      favBtn.setAttribute('aria-label', isFav ? 'Quitar de favoritos' : 'Agregar a favoritos');
      favBtn.innerHTML = `<i class="${isFav ? 'fas fa-heart' : 'far fa-heart'}"></i>`;
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isFav) removeFromFavorites(track.urls.mp3);
        else addToFavorites(track);
      });
      actions.appendChild(favBtn);
      row.appendChild(actions);

      // click fila
      row.addEventListener('click', () => {
        currentTrackIndex = index;
        loadTrack(currentTrackIndex);
        el.audioPlayer.play().then(()=>{
          isPlaying = true;
          el.btnPlay.classList.add('playing');
          el.btnPlay.setAttribute('aria-label','Pausar');
          if (isFavoritesPlaying) {
            el.favoritesAudioPlayer.pause();
            isFavoritesPlaying = false;
            el.favoritesBtnPlay.classList.remove('playing');
            el.favoritesBtnPlay.setAttribute('aria-label','Reproducir');
          }
          el.floatingPlayerButton.style.display = 'none';
        }).catch(()=>{});
      });

      el.playlistElement.appendChild(row);
    });
  }

  function loadTrack(i){
    const track = playlistConfig[i];
    if (!track) return;

    track.format = currentFormat;

    // legacy text
    el.songTitle.textContent = track.title;
    el.songArtist.textContent = track.artist;
    // hero
    setHero('player', track.coverUrl, track.title, track.artist);

    const url = track.urls[currentFormat] || track.urls.mp3;
    el.audioPlayer.src = url;
    el.btnDownload.setAttribute('href', url);
    el.btnDownload.setAttribute('download', `${track.title}.${currentFormat}`);

    el.seekBar.value = 0;
    el.currentTimeElement.textContent = '0:00';
    el.durationElement.textContent = '0:00';

    renderPlaylist(); // para reflejar activo + EQ
  }

  // ===== Favoritos =====
  function addToFavorites(track){
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (!favs.some(f => f.urls && f.urls.mp3 === track.urls.mp3)) {
      favs.unshift({ ...track, format: currentFormat }); // guardamos formato actual
      localStorage.setItem('favorites', JSON.stringify(favs));
      if (el.favoritesModal.style.display === 'flex') loadFavorites();
      renderPlaylist();
    }
  }
  function removeFromFavorites(mp3Url){
    let favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    favs = favs.filter(f => !(f.urls && f.urls.mp3 === mp3Url));
    localStorage.setItem('favorites', JSON.stringify(favs));
    favoritesPlaylist = favs;
    if (el.favoritesModal.style.display === 'flex') loadFavorites();
    renderPlaylist();
  }
  function loadFavorites(){
    try{
      favoritesPlaylist = JSON.parse(localStorage.getItem('favorites') || '[]')
        .filter(f => f && f.title && f.artist && f.urls && f.urls.mp3);
      originalFavoritesPlaylist = [...favoritesPlaylist];
      if (!favoritesPlaylist.length){
        el.favoritesPlaylistElement.innerHTML = '<p>No hay canciones en favoritos.</p>';
        el.favoritesSongTitle.textContent = 'Selecciona una canción';
        el.favoritesSongArtist.textContent = '';
        setHero('favorites','', 'Selecciona una canción','');
        el.favoritesAudioPlayer.src = '';
        el.favoritesSeekBar.value = 0;
        el.favoritesCurrentTime.textContent = '0:00';
        el.favoritesDuration.textContent = '0:00';
        isFavoritesPlaying = false;
        el.favoritesBtnPlay.classList.remove('playing');
        el.favoritesBtnPlay.setAttribute('aria-label','Reproducir');
        el.favoritesBtnRepeat.classList.remove('active','repeat-one');
        el.favoritesBtnShuffle.classList.remove('active');
        repeatMode = 'none';
        isShuffled = false;
        return;
      }
      renderFavoritesPlaylist();
      if (!el.favoritesAudioPlayer.src) loadFavoritesTrack(currentFavoritesTrackIndex);
    }catch{
      el.favoritesPlaylistElement.innerHTML = '<p>Error al cargar favoritos.</p>';
    }
  }
  function renderFavoritesPlaylist(){
    el.favoritesPlaylistElement.innerHTML = '';
    favoritesPlaylist.forEach((track, index) => {
      const active = index === currentFavoritesTrackIndex;
      const isHQ = HQ_FORMATS.includes((track.format||'mp3').toLowerCase());

      const row = document.createElement('div');
      row.className = `playlist-item${active ? ' active' : ''}`;

      const img = document.createElement('img');
      img.src = track.coverUrl; img.alt = track.title; img.loading = 'lazy';
      row.appendChild(img);

      const info = document.createElement('div');
      info.className = 'playlist-item-info';
      const h3 = document.createElement('h3');

      if (isHQ) {
        const badge = document.createElement('span');
        badge.className = 'hq-indicator';
        badge.textContent = 'HQ';
        h3.appendChild(badge);
        h3.appendChild(document.createTextNode(' '));
      }
      if (active && isFavoritesPlaying){
        const eq = document.createElement('span');
        eq.className = 'eq';
        eq.innerHTML = '<span></span><span></span><span></span>';
        h3.prepend(eq);
      }
      h3.appendChild(document.createTextNode(track.title));
      const p = document.createElement('p');
      p.textContent = track.artist;

      info.appendChild(h3);
      info.appendChild(p);
      row.appendChild(info);

      const actions = document.createElement('div');
      actions.className = 'playlist-item-actions';
      const rm = document.createElement('button');
      rm.className = 'btn-remove-favorite';
      rm.setAttribute('aria-label','Quitar de favoritos');
      rm.innerHTML = '<i class="fas fa-times"></i>';
      rm.addEventListener('click', (e) => { e.stopPropagation(); removeFromFavorites(track.urls.mp3); });
      actions.appendChild(rm);
      row.appendChild(actions);

      row.addEventListener('click', () => {
        currentFavoritesTrackIndex = index;
        loadFavoritesTrack(currentFavoritesTrackIndex);
        el.favoritesAudioPlayer.play().then(()=>{
          isFavoritesPlaying = true;
          el.favoritesBtnPlay.classList.add('playing');
          el.favoritesBtnPlay.setAttribute('aria-label','Pausar');
          if (isPlaying){
            el.audioPlayer.pause();
            isPlaying = false;
            el.btnPlay.classList.remove('playing');
            el.btnPlay.setAttribute('aria-label','Reproducir');
          }
          el.floatingPlayerButton.style.display = 'none';
        }).catch(()=>{});
      });

      el.favoritesPlaylistElement.appendChild(row);
    });
  }
  function loadFavoritesTrack(i){
    const track = favoritesPlaylist[i];
    if (!track) return;
    el.favoritesSongTitle.textContent = track.title;
    el.favoritesSongArtist.textContent = track.artist;
    setHero('favorites', track.coverUrl, track.title, track.artist);

    const fmt = (track.format || 'mp3').toLowerCase();
    const url = track.urls[fmt] || track.urls.mp3;
    el.favoritesAudioPlayer.src = url;
    el.favoritesBtnDownload.setAttribute('href', url);
    el.favoritesBtnDownload.setAttribute('download', `${track.title}.${fmt}`);

    el.favoritesSeekBar.value = 0;
    el.favoritesCurrentTime.textContent = '0:00';
    el.favoritesDuration.textContent = '0:00';

    renderFavoritesPlaylist();
  }

  // ===== Controles comunes =====
  function togglePlay(){
    if (el.playerModal.style.display === 'flex') {
      if (isPlaying){
        el.audioPlayer.pause();
        isPlaying = false;
        el.btnPlay.classList.remove('playing');
        el.btnPlay.setAttribute('aria-label','Reproducir');
      } else {
        el.audioPlayer.play().then(()=>{
          isPlaying = true;
          el.btnPlay.classList.add('playing');
          el.btnPlay.setAttribute('aria-label','Pausar');
          if (isFavoritesPlaying){
            el.favoritesAudioPlayer.pause();
            isFavoritesPlaying = false;
            el.favoritesBtnPlay.classList.remove('playing');
            el.favoritesBtnPlay.setAttribute('aria-label','Reproducir');
          }
          el.floatingPlayerButton.style.display = 'none';
          renderPlaylist(); // para mostrar EQ en activo
        }).catch(()=>{});
      }
    } else if (el.favoritesModal.style.display === 'flex') {
      if (isFavoritesPlaying){
        el.favoritesAudioPlayer.pause();
        isFavoritesPlaying = false;
        el.favoritesBtnPlay.classList.remove('playing');
        el.favoritesBtnPlay.setAttribute('aria-label','Reproducir');
      } else {
        el.favoritesAudioPlayer.play().then(()=>{
          isFavoritesPlaying = true;
          el.favoritesBtnPlay.classList.add('playing');
          el.favoritesBtnPlay.setAttribute('aria-label','Pausar');
          if (isPlaying){
            el.audioPlayer.pause();
            isPlaying = false;
            el.btnPlay.classList.remove('playing');
            el.btnPlay.setAttribute('aria-label','Reproducir');
          }
          el.floatingPlayerButton.style.display = 'none';
          renderFavoritesPlaylist(); // mostrar EQ
        }).catch(()=>{});
      }
    }
  }
  function nextTrack(){
    if (el.playerModal.style.display === 'flex') {
      if (currentTrackIndex + 1 < playlistConfig.length) {
        currentTrackIndex = (currentTrackIndex + 1) % playlistConfig.length;
        loadTrack(currentTrackIndex);
        if (isPlaying) el.audioPlayer.play().catch(()=>{});
      } else if (repeatMode === 'all') {
        currentTrackIndex = 0;
        loadTrack(currentTrackIndex);
        if (isPlaying) el.audioPlayer.play().catch(()=>{});
      }
    } else if (el.favoritesModal.style.display === 'flex') {
      if (currentFavoritesTrackIndex + 1 < favoritesPlaylist.length) {
        currentFavoritesTrackIndex = (currentFavoritesTrackIndex + 1) % favoritesPlaylist.length;
        loadFavoritesTrack(currentFavoritesTrackIndex);
        if (isFavoritesPlaying) el.favoritesAudioPlayer.play().catch(()=>{});
      } else if (repeatMode === 'all') {
        currentFavoritesTrackIndex = 0;
        loadFavoritesTrack(currentFavoritesTrackIndex);
        if (isFavoritesPlaying) el.favoritesAudioPlayer.play().catch(()=>{});
      }
    }
  }
  function prevTrack(){
    if (el.playerModal.style.display === 'flex') {
      currentTrackIndex = (currentTrackIndex - 1 + playlistConfig.length) % playlistConfig.length;
      loadTrack(currentTrackIndex);
      if (isPlaying) el.audioPlayer.play().catch(()=>{});
    } else if (el.favoritesModal.style.display === 'flex') {
      currentFavoritesTrackIndex = (currentFavoritesTrackIndex - 1 + favoritesPlaylist.length) % favoritesPlaylist.length;
      loadFavoritesTrack(currentFavoritesTrackIndex);
      if (isFavoritesPlaying) el.favoritesAudioPlayer.play().catch(()=>{});
    }
  }
  function toggleRepeat(){
    if (repeatMode === 'none') {
      repeatMode = 'all';
      (el.playerModal.style.display==='flex'?el.btnRepeat:el.favoritesBtnRepeat).classList.add('active');
    } else if (repeatMode === 'all') {
      repeatMode = 'one';
      (el.playerModal.style.display==='flex'?el.btnRepeat:el.favoritesBtnRepeat).classList.add('repeat-one');
    } else {
      repeatMode = 'none';
      (el.playerModal.style.display==='flex'?el.btnRepeat:el.favoritesBtnRepeat).classList.remove('active','repeat-one');
    }
  }
  function toggleShuffle(){
    if (el.playerModal.style.display === 'flex') {
      isShuffled = !isShuffled;
      el.btnShuffle.classList.toggle('active', isShuffled);
      el.btnShuffle.setAttribute('aria-label', isShuffled ? 'Desactivar mezclar' : 'Mezclar');
      if (isShuffled) {
        const curr = playlistConfig[currentTrackIndex];
        playlistConfig = shuffle([...playlistConfig]);
        currentTrackIndex = playlistConfig.findIndex(t => t.urls.mp3 === curr.urls.mp3);
      } else {
        playlistConfig = [...originalPlaylist];
        currentTrackIndex = Math.max(0, playlistConfig.findIndex(t => (t.urls[currentFormat] || t.urls.mp3) === el.audioPlayer.src));
      }
      renderPlaylist();
    } else if (el.favoritesModal.style.display === 'flex') {
      isShuffled = !isShuffled;
      el.favoritesBtnShuffle.classList.toggle('active', isShuffled);
      el.favoritesBtnShuffle.setAttribute('aria-label', isShuffled ? 'Desactivar mezclar' : 'Mezclar');
      if (isShuffled) {
        const curr = favoritesPlaylist[currentFavoritesTrackIndex];
        favoritesPlaylist = shuffle([...favoritesPlaylist]);
        currentFavoritesTrackIndex = favoritesPlaylist.findIndex(t => t.urls.mp3 === curr.urls.mp3);
      } else {
        favoritesPlaylist = [...originalFavoritesPlaylist];
        currentFavoritesTrackIndex = Math.max(0, favoritesPlaylist.findIndex(t => (t.urls[t.format || 'mp3']) === el.favoritesAudioPlayer.src));
      }
      renderFavoritesPlaylist();
    }
  }
  function shuffle(a){
    for (let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }
});
