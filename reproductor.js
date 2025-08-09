// ========================================================
// Sanavera MP3 - reproductor.js
// Lógica del reproductor (álbum → pistas, calidad, EQ, etc.)
// Depende de: utilidades.js
// Expuesto como: window.Player
// ========================================================

(function () {
  const { $, qs, qsa, show, toggleBodyScroll, truncate, formatTime, escapeHtml,
          normalizeCreator, extractSongTitle, IA, App } = window.$U;

  // ------- Referencias UI (player modal) -------
  const UI = {
    playerModal: $('player-modal'),

    // HERO
    hero: $('player-hero'),
    heroTitle: $('hero-song-title'),
    heroArtist: $('hero-song-artist'),

    // Legacy (oculto por CSS pero usado como fallback accesibilidad)
    legacyCover: $('cover-image'),
    legacyTitle: $('song-title'),
    legacyArtist: $('song-artist'),

    // Lista + tiempos
    playlist: $('playlist'),
    audio: $('audio-player'),
    seek: $('seek-bar'),
    cur: $('current-time'),
    dur: $('duration'),

    // Controles
    btnPlay: $('btn-play'),
    btnPrev: $('btn-prev'),
    btnNext: $('btn-next'),
    btnRepeat: $('btn-repeat'),
    btnShuffle: $('btn-shuffle'),
    btnDownload: $('btn-download'),

    // Calidad
    qualityBtn: $('quality-btn'),
    qualityMenu: $('quality-menu'),
    qualityBackdrop: $('quality-backdrop'),
    qualityList: $('quality-options'),
  };

  // ------- Util -------
  const HQ_FORMATS = ['wav','flac','aiff','alac'];
  const MOCK_ALBUMS = [
    { id:'queen_greatest_hits', title:'Queen - Greatest Hits', artist:'Queen',
      image:'https://indiehoy.com/wp-content/uploads/2022/05/queen-queen-ii.jpg' }
  ];
  const MOCK_TRACKS = [
    { title:'Bohemian Rhapsody', artist:'Queen',
      urls:{ mp3:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
      coverUrl:MOCK_ALBUMS[0].image, format:'mp3' },
    { title:'Another One Bites the Dust', artist:'Queen',
      urls:{ mp3:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
      coverUrl:MOCK_ALBUMS[0].image, format:'mp3' },
  ];

  const qualityIsHQ = (f) => HQ_FORMATS.includes((f||'').toLowerCase());

  function setHero(coverUrl, title, artist){
    const safe = (coverUrl && coverUrl.trim())
      ? coverUrl
      : 'https://via.placeholder.com/1200x1200?text=Sanavera';
    if (UI.hero) UI.hero.style.setProperty('--cover-url', `url("${safe}")`);
    if (UI.heroTitle) UI.heroTitle.textContent = title || 'Selecciona una canción';
    if (UI.heroArtist) UI.heroArtist.textContent = artist || '';
    if (UI.legacyCover) UI.legacyCover.src = safe;
    if (UI.legacyTitle) UI.legacyTitle.textContent = title || '';
    if (UI.legacyArtist) UI.legacyArtist.textContent = artist || '';
  }

  function wireTime(player, seek, cur, dur, scope){
    player.addEventListener('loadedmetadata', ()=>{
      dur.textContent = formatTime(player.duration);
      seek.value = 0;
    });
    player.addEventListener('timeupdate', ()=>{
      if (!isNaN(player.duration) && player.duration > 0) {
        cur.textContent = formatTime(player.currentTime);
        seek.value = (player.currentTime / player.duration) * 100;
      }
    });
    player.addEventListener('ended', ()=>{
      if (App.repeatMode === 'one') {
        player.currentTime = 0; player.play().catch(console.error);
      } else {
        next('player');
      }
    });
    seek.addEventListener('input', ()=>{
      if (!isNaN(player.duration) && player.duration > 0) {
        const t = (player.duration * seek.value) / 100;
        player.currentTime = t; cur.textContent = formatTime(t);
      }
    });
  }
  wireTime(UI.audio, UI.seek, UI.cur, UI.dur, 'player');

  // ------- Calidad (menú flotante) -------
  function buildQualityMenu(){
    if (!UI.qualityList) return;
    UI.qualityList.innerHTML = '';
    const fmts = [...App.availableFormats];
    if (!fmts.includes('mp3')) fmts.unshift('mp3');
    const frag = document.createDocumentFragment();
    fmts.forEach(f=>{
      const btn = document.createElement('button');
      btn.className = 'quality-option';
      btn.type = 'button';
      btn.setAttribute('data-format', f);
      btn.innerHTML = `
        <span>${f.toUpperCase()}</span>
        <div class="center">
          ${qualityIsHQ(f)?'<span class="badge-hq">HQ</span>':''}
          <i class="fa-solid fa-check check" style="${f===App.currentFormat?'opacity:1':'opacity:.2'}"></i>
        </div>`;
      btn.addEventListener('click', ()=> selectQuality(f));
      frag.appendChild(btn);
    });
    UI.qualityList.appendChild(frag);
  }
  function openQualityMenu(){
    if (!UI.qualityMenu) return;
    buildQualityMenu();
    UI.qualityBtn?.classList.add('active');
    UI.qualityBackdrop?.classList.add('show');
    const rect = UI.qualityBtn?.getBoundingClientRect?.();
    const top = rect ? Math.min(window.innerHeight-220, rect.bottom + 10) : 80;
    UI.qualityMenu.style.top = `${top + window.scrollY}px`;
    UI.qualityMenu.classList.add('show');
  }
  function closeQualityMenu(){
    UI.qualityBtn?.classList.remove('active');
    UI.qualityBackdrop?.classList.remove('show');
    UI.qualityMenu?.classList.remove('show');
  }
  function selectQuality(fmt){
    App.currentFormat = fmt;

    // Actualiza pista actual
    const t = App.playlist[App.currentIndex];
    if (t) {
      const url = t.urls[App.currentFormat] || t.urls.mp3;
      UI.audio.src = url;
      UI.btnDownload.setAttribute('href', url);
      UI.btnDownload.setAttribute('download', `${t.title}.${App.currentFormat}`);
      if (App.isPlaying) UI.audio.play().catch(console.error);
    }
    renderPlaylist();
    buildQualityMenu();
    closeQualityMenu();
  }

  // Cerrar por backdrop o ESC
  UI.qualityBtn?.addEventListener('click', ()=>{
    if (!App.availableFormats.length) return;
    if (UI.qualityMenu.classList.contains('show')) closeQualityMenu(); else openQualityMenu();
  });
  UI.qualityBackdrop?.addEventListener('click', closeQualityMenu);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeQualityMenu(); });

  // ------- Covers: buscar la mejor imagen grande -------
  function pickBestCover(files, albumId){
    // 1) intentá con archivos de imagen grandes
    const imgs = (files||[]).filter(f => /\.(jpg|jpeg|png)$/i.test(f.name||''));
    if (imgs.length) {
      // priorizá nombres "front|cover|large" y mayor tamaño
      imgs.sort((a,b)=>{
        const ta = (a.name||'').toLowerCase();
        const tb = (b.name||'').toLowerCase();
        const score = (s)=> (/(front|cover|large|original)/.test(s)?2:0);
        const sa = score(ta), sb = score(tb);
        if (sa!==sb) return sb-sa;
        const la = Number(a.size)||0, lb = Number(b.size)||0;
        return lb-la;
      });
      const best = imgs[0];
      return `https://archive.org/download/${albumId}/${encodeURIComponent(best.name).replace(/\+/g,'%20')}`;
    }
    // 2) fallback a services/img
    return `https://archive.org/services/img/${albumId}`;
  }

  // ------- Render playlist -------
  function renderPlaylist(){
    const favs = App.getFavorites();
    UI.playlist.innerHTML = '';

    App.playlist.forEach((t, i) => {
      const active = (i === App.currentIndex);
      const showHQ = qualityIsHQ(App.currentFormat);
      const row = document.createElement('div');
      row.className = `playlist-item${active?' active':''}`;
      row.innerHTML = `
        <img src="${t.coverUrl}" alt="${escapeHtml(t.title)}" loading="lazy">
        <div class="playlist-item-info">
          <h3>
            ${active ? `<span class="eq"><span></span><span></span><span></span></span>` : ''}
            ${showHQ ? `<span class="hq-indicator">HQ</span>` : ''}
            ${escapeHtml(t.title)}
          </h3>
          <p>${escapeHtml(t.artist)}</p>
        </div>
        <div class="playlist-item-actions">
          <button class="btn-favorite ${favs.some(f=>f.urls && f.urls.mp3===t.urls.mp3)?'active':''}"
                  aria-label="Favorito">
            <i class="${favs.some(f=>f.urls && f.urls.mp3===t.urls.mp3)?'fas fa-heart':'far fa-heart'}"></i>
          </button>
        </div>
      `;

      // fav
      row.querySelector('.btn-favorite').addEventListener('click', (e)=>{
        e.stopPropagation();
        const now = App.getFavorites();
        if (now.some(f=>f.urls && f.urls.mp3===t.urls.mp3)) {
          const next = now.filter(f=>!(f.urls && f.urls.mp3===t.urls.mp3));
          App.setFavorites(next);
        } else {
          App.setFavorites([{...t, format: App.currentFormat}, ...now]);
        }
        renderPlaylist();
        // si está abierto favoritos, que se actualice allá
        window.Favoritos?.refresh();
      });

      // play
      row.addEventListener('click', ()=>{
        loadTrack(i);
        UI.audio.play().then(()=>{
          App.isPlaying = true;
          UI.btnPlay.classList.add('playing');
          UI.btnPlay.setAttribute('aria-label','Pausar');
          // pausá favoritos si sonaba
          if (App.isFavPlaying) {
            window.Favoritos?.pause();
          }
        }).catch(console.error);
      });

      UI.playlist.appendChild(row);
    });
  }

  // ------- Cargar pista -------
  function loadTrack(i){
    App.currentIndex = i;
    const t = App.playlist[i];
    if (!t) return;

    setHero(t.coverUrl, t.title, t.artist);

    const url = t.urls[App.currentFormat] || t.urls.mp3;
    UI.audio.src = url;
    UI.btnDownload.setAttribute('href', url);
    UI.btnDownload.setAttribute('download', `${t.title}.${App.currentFormat}`);

    UI.seek.value = 0; UI.cur.textContent='0:00'; UI.dur.textContent='0:00';
    renderPlaylist();
  }

  // ------- Controles -------
  function togglePlay(){
    if (UI.playerModal.style.display !== 'flex') return;
    if (App.isPlaying) {
      UI.audio.pause();
      App.isPlaying = false;
      UI.btnPlay.classList.remove('playing');
      UI.btnPlay.setAttribute('aria-label','Reproducir');
    } else {
      UI.audio.play().then(()=>{
        App.isPlaying = true;
        UI.btnPlay.classList.add('playing');
        UI.btnPlay.setAttribute('aria-label','Pausar');
        // parar favoritos si venía sonando
        if (App.isFavPlaying) window.Favoritos?.pause();
      }).catch(console.error);
    }
    renderPlaylist();
  }

  function next(){
    if (UI.playerModal.style.display !== 'flex') return;
    if (App.currentIndex + 1 < App.playlist.length) {
      App.currentIndex = (App.currentIndex + 1) % App.playlist.length;
      loadTrack(App.currentIndex);
      if (App.isPlaying) UI.audio.play().catch(console.error);
    } else if (App.repeatMode === 'all') {
      App.currentIndex = 0;
      loadTrack(App.currentIndex);
      if (App.isPlaying) UI.audio.play().catch(console.error);
    }
  }

  function prev(){
    if (UI.playerModal.style.display !== 'flex') return;
    App.currentIndex = (App.currentIndex - 1 + App.playlist.length) % App.playlist.length;
    loadTrack(App.currentIndex);
    if (App.isPlaying) UI.audio.play().catch(console.error);
  }

  function toggleRepeat(){
    if (App.repeatMode === 'none') {
      App.repeatMode = 'all'; UI.btnRepeat.classList.add('active');
    } else if (App.repeatMode === 'all') {
      App.repeatMode = 'one'; UI.btnRepeat.classList.add('repeat-one');
    } else {
      App.repeatMode = 'none'; UI.btnRepeat.classList.remove('active','repeat-one');
    }
  }

  function toggleShuffle(){
    if (UI.playerModal.style.display !== 'flex') return;
    App.shuffled = !App.shuffled;
    UI.btnShuffle.classList.toggle('active', App.shuffled);
    if (App.shuffled) {
      const cur = App.playlist[App.currentIndex];
      App.playlist = shuffle([...App.playlist]);
      App.currentIndex = App.playlist.findIndex(t => t.urls.mp3 === cur.urls.mp3);
    } else {
      App.playlist = [...App.originalPlaylist];
      const curUrl = UI.audio.src;
      App.currentIndex = Math.max(0, App.playlist.findIndex(t => (t.urls[App.currentFormat]||t.urls.mp3) === curUrl));
    }
    renderPlaylist();
  }
  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

  // ------- Abrir álbum -------
  async function open(albumId){
    // Reset UI
    show(UI.playerModal, true);
    window.Modales?.showPlayer?.(); // navegación centralizada (inicio.js)
    UI.playlist.innerHTML = '<p style="padding:10px;color:#b3b3b3">Cargando canciones…</p>';
    setHero('', 'Selecciona una canción', '');
    UI.audio.src = '';
    UI.seek.value = 0; UI.cur.textContent='0:00'; UI.dur.textContent='0:00';
    closeQualityMenu();

    // Reset estado
    App.playlist = []; App.originalPlaylist = [];
    App.currentIndex = 0; App.isPlaying = false;
    App.availableFormats = ['mp3']; App.currentFormat = 'mp3';
    App.repeatMode = 'none'; App.shuffled = false; App.currentAlbumId = albumId;

    UI.btnPlay.classList.remove('playing'); UI.btnPlay.setAttribute('aria-label','Reproducir');
    UI.btnRepeat.classList.remove('active','repeat-one'); UI.btnShuffle.classList.remove('active');

    // Mock
    if (albumId === 'queen_greatest_hits') {
      const cover = MOCK_ALBUMS[0].image, artist = 'Queen';
      setHero(cover, 'Selecciona una canción', artist);
      App.playlist = MOCK_TRACKS.map(t=>({...t}));
      App.originalPlaylist = [...App.playlist];
      App.availableFormats = ['mp3'];
      buildQualityMenu();
      renderPlaylist();
      loadTrack(0);
      return;
    }

    try{
      const data = await IA.metadata(albumId);
      const artist = normalizeCreator(data.metadata?.creator || data.metadata?.artist || 'Desconocido');
      const heroCover = pickBestCover(data.files||[], albumId);
      setHero(heroCover, 'Selecciona una canción', artist);

      const files = (data.files||[]).filter(f => /\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i.test(f.name||''));
      const tracksByTitle = {};
      files.forEach(f=>{
        const raw = f.name;
        const title = extractSongTitle(raw);
        const fmt = (raw.match(/\.(\w+)$/i)||[])[1]?.toLowerCase() || 'mp3';
        const url = `https://archive.org/download/${albumId}/${encodeURIComponent(raw).replace(/\+/g,'%20')}`;
        if (!tracksByTitle[title]) {
          tracksByTitle[title] = { title, artist, coverUrl: heroCover, urls:{}, format: App.currentFormat };
        }
        tracksByTitle[title].urls[fmt] = url;
      });
      App.playlist = Object.values(tracksByTitle);
      App.originalPlaylist = [...App.playlist];

      // formatos disponibles
      App.availableFormats = Array.from(new Set(
        files.map(f => (f.name.match(/\.(\w+)$/i)||[])[1]?.toLowerCase()).filter(Boolean)
      ));
      if (!App.availableFormats.includes('mp3')) App.availableFormats.unshift('mp3');

      buildQualityMenu();
      renderPlaylist();
      if (!App.playlist.length) {
        UI.playlist.innerHTML = '<p style="padding:10px">No se encontraron canciones de audio</p>';
        return;
      }
      loadTrack(0);
    } catch (err) {
      console.error(err);
      UI.playlist.innerHTML = `<p style="padding:10px;color:#b3b3b3">Error: ${err.message}. Usando datos de prueba.</p>`;
      const cover = MOCK_ALBUMS[0].image;
      setHero(cover, 'Selecciona una canción', 'Queen');
      App.playlist = MOCK_TRACKS.map(t=>({...t}));
      App.originalPlaylist = [...App.playlist];
      App.availableFormats = ['mp3'];
      buildQualityMenu();
      loadTrack(0);
    }
  }

  // ------- Botones principales (se atan en inicio.js también por las dudas) -------
  UI.btnPlay?.addEventListener('click', togglePlay);
  UI.btnNext?.addEventListener('click', next);
  UI.btnPrev?.addEventListener('click', prev);
  UI.btnRepeat?.addEventListener('click', toggleRepeat);
  UI.btnShuffle?.addEventListener('click', toggleShuffle);

  // ------- Exponer API -------
  window.Player = {
    open,
    togglePlay, next, prev,
    selectQuality,
    closeQualityMenu,
    renderPlaylist, // usado por otros módulos si hace falta refrescar
  };
})();
