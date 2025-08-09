// =====================================
// Sanavera MP3 - script.js (full)
// =====================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('Sanavera MP3 listo');

  // ---------- Cache de elementos ----------
  const el = {
    // Modales principales
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

    // Player hero + info
    playerHero: byId('player-hero'),
    heroSongTitle: byId('hero-song-title'),
    heroSongArtist: byId('hero-song-artist'),
    coverImage: byId('cover-image'),          // legado (oculto por CSS)
    songTitle: byId('song-title'),            // legado (oculto por CSS)
    songArtist: byId('song-artist'),          // legado (oculto por CSS)

    // Listas
    playlist: byId('playlist'),
    favoritesPlaylist: byId('favorites-playlist'),

    // Audio
    audio: byId('audio-player'),
    favAudio: byId('favorites-audio-player'),

    // Controles player
    btnPlay: byId('btn-play'),
    btnPrev: byId('btn-prev'),
    btnNext: byId('btn-next'),
    btnRepeat: byId('btn-repeat'),
    btnShuffle: byId('btn-shuffle'),
    btnDownload: byId('btn-download'),
    seek: byId('seek-bar'),
    curTime: byId('current-time'),
    durTime: byId('duration'),

    // Controles favoritos
    favBtnPlay: byId('favorites-btn-play'),
    favBtnPrev: byId('favorites-btn-prev'),
    favBtnNext: byId('favorites-btn-next'),
    favBtnRepeat: byId('favorites-btn-repeat'),
    favBtnShuffle: byId('favorites-btn-shuffle'),
    favBtnDownload: byId('favorites-btn-download'),
    favSeek: byId('favorites-seek-bar'),
    favCurTime: byId('favorites-current-time'),
    favDurTime: byId('favorites-duration'),

    // Hero favoritos
    favoritesHero: byId('favorites-hero'),
    favoritesHeroSongTitle: byId('favorites-hero-song-title'),
    favoritesHeroSongArtist: byId('favorites-hero-song-artist'),
    favoritesCoverImage: byId('favorites-cover-image'), // legado
    favoritesSongTitle: byId('favorites-song-title'),   // legado
    favoritesSongArtist: byId('favorites-song-artist'), // legado

    // FABs
    fabSearch: byId('floating-search-button'),
    fabPlayer: byId('floating-player-button'),
    fabFav: byId('floating-favorites-button'),

    // Calidad (nuevo flujo)
    qualityBtn: byId('quality-btn'),
    qualityMenu: byId('quality-menu'),
    qualityBackdrop: byId('quality-backdrop'),
    qualityList: byId('quality-options')
  };

  // Validación de elementos esenciales
  const miss = Object.entries(el).filter(([,v]) => v == null).map(([k]) => k);
  if (miss.length) {
    console.error('Faltan elementos:', miss);
    document.body.insertAdjacentHTML('beforeend', `<p style="color:#f55;padding:8px">Error de plantilla: faltan elementos (${miss.join(', ')})</p>`);
    return;
  }

  // Limpia botón(es) con <i> internos (evita texto fantasma)
  document.querySelectorAll('.btn,.btn-small,.btn-play,.btn-favorite,.btn-remove-favorite')
    .forEach(b=>{
      const icons=[...b.querySelectorAll('i')];
      if(icons.length){
        b.innerHTML='';
        icons.forEach(i=>b.appendChild(i));
      }
    });

  // ---------- Estado ----------
  const HQ_FORMATS = ['wav','flac','aiff','alac'];
  const MOCK_ALBUMS = [
    { id:'queen_greatest_hits', title:'Queen - Greatest Hits', artist:'Queen', image:'https://indiehoy.com/wp-content/uploads/2022/05/queen-queen-ii.jpg', relevance:0 }
  ];
  const MOCK_TRACKS = [
    { title:'Bohemian Rhapsody', artist:'Queen', urls:{ mp3:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }, coverUrl:MOCK_ALBUMS[0].image, format:'mp3' },
    { title:'Another One Bites the Dust', artist:'Queen', urls:{ mp3:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' }, coverUrl:MOCK_ALBUMS[0].image, format:'mp3' }
  ];

  let allAlbums = [];
  let isLoading = false;
  let currentQuery = '';
  let currentPage = 1;

  let playlist = [];
  let originalPlaylist = [];
  let idx = 0;
  let isPlaying = false;

  let favList = [];
  let favOriginal = [];
  let favIdx = 0;
  let isFavPlaying = false;

  let repeatMode = 'none';
  let isShuffled = false;

  let availableFormats = ['mp3'];
  let currentFormat = 'mp3';
  let currentAlbumId = null;

  // ---------- Utilidades ----------
  function byId(id){ return document.getElementById(id); }
  function toggleBodyScroll(lock){ document.body.classList.toggle('modal-open', !!lock); }
  function fmtTime(s){ if(isNaN(s)||s<0) return '0:00'; const m=Math.floor(s/60), ss=Math.floor(s%60); return `${m}:${ss<10?'0':''}${ss}`; }

  // Limpieza agresiva del título de archivo → nombre de canción
  function extractSongTitle(fileName){
    try{
      let name = fileName.replace(/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i,'');
      name = name.replace(/^.*\//,'');             // quita path
      name = name.replace(/_/g,' ').replace(/\s+/g,' ').trim();
      name = name.replace(/^[\[(]?\s*\d{1,2}\s*[\])\-.]\s*/,''); // [01], 01-, etc
      if(name.includes(' - ')){
        const parts = name.split(' - ').map(s=>s.trim()).filter(Boolean);
        if(parts.length>1) name = parts[parts.length-1];
      }
      name = name.replace(/\s*[\[(]?\b(19|20)\d{2}\b[\])]?$/,'').trim();
      return name || fileName;
    }catch(_){
      return fileName.replace(/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i,'').replace(/_/g,' ');
    }
  }

  function normalizeCreator(c){ return Array.isArray(c)? c.join(', ') : (c||'Desconocido'); }

  function setHero(scope, coverUrl, title, artist){
    const isFav = scope==='favorites';
    const hero = isFav? el.favoritesHero : el.playerHero;
    const hTitle = isFav? el.favoritesHeroSongTitle : el.heroSongTitle;
    const hArtist= isFav? el.favoritesHeroSongArtist: el.heroSongArtist;
    const legacyImg = isFav? el.favoritesCoverImage : el.coverImage;

    const safe = coverUrl && coverUrl.trim()? coverUrl : 'https://via.placeholder.com/800x800?text=Sin+portada';
    if(hero) hero.style.setProperty('--cover-url', `url("${safe}")`);
    if(hTitle) hTitle.textContent = title || 'Selecciona una canción';
    if(hArtist) hArtist.textContent = artist || '';
    if(legacyImg) legacyImg.src = safe;
  }

  function qualityIsHQ(fmt){ return HQ_FORMATS.includes((fmt||'').toLowerCase()); }

  // ---------- Player time events ----------
  function wireTime(player, seek, cur, dur, scope){
    player.addEventListener('loadedmetadata', ()=>{
      dur.textContent = fmtTime(player.duration);
      seek.value = 0;
    });
    player.addEventListener('timeupdate', ()=>{
      if(!isNaN(player.duration) && player.duration>0){
        cur.textContent = fmtTime(player.currentTime);
        seek.value = (player.currentTime/player.duration)*100;
      }
    });
    player.addEventListener('ended', ()=>{
      if(repeatMode==='one'){
        player.currentTime = 0; player.play().catch(console.error);
      }else{
        nextTrack(scope);
      }
    });
    seek.addEventListener('input', ()=>{
      if(!isNaN(player.duration) && player.duration>0){
        const t = (player.duration*seek.value)/100;
        player.currentTime = t; cur.textContent = fmtTime(t);
      }
    });
  }
  wireTime(el.audio, el.seek, el.curTime, el.durTime, 'player');
  wireTime(el.favAudio, el.favSeek, el.favCurTime, el.favDurTime, 'favorites');

  // ---------- Calidad (menú) ----------
  function buildQualityMenu(){
    if(!el.qualityList) return;
    el.qualityList.innerHTML = '';
    const fmts = [...(availableFormats && availableFormats.length ? availableFormats : ['mp3'])];
    if(!fmts.includes('mp3')) fmts.unshift('mp3');
    const frag = document.createDocumentFragment();
    fmts.forEach(f=>{
      const li = document.createElement('button');
      li.className = 'quality-option';
      li.type = 'button';
      li.setAttribute('data-format', f);
      li.innerHTML = `
        <span>${f.toUpperCase()}</span>
        <div class="center">
          ${qualityIsHQ(f)?'<span class="badge-hq">HQ</span>':''}
          <i class="fa-solid fa-check check" style="${f===currentFormat?'opacity:1':'opacity:.2'}"></i>
        </div>
      `;
      li.addEventListener('click', ()=> selectQuality(f));
      frag.appendChild(li);
    });
    el.qualityList.appendChild(frag);
  }

  function openQualityMenu(){
    if(!el.qualityMenu) return;
    el.qualityBtn.classList.add('active');
    el.qualityBackdrop.classList.add('show');
    // Posición bajo el botón (menú es fixed)
    const r = el.qualityBtn.getBoundingClientRect();
    const top = Math.min(window.innerHeight-220, r.bottom + 8);
    el.qualityMenu.style.top = `${top}px`;
    el.qualityMenu.classList.add('show');
  }
  function closeQualityMenu(){
    el.qualityBtn.classList.remove('active');
    el.qualityBackdrop.classList.remove('show');
    el.qualityMenu.classList.remove('show');
  }

  function selectQuality(fmt){
    currentFormat = fmt;
    if(el.playerModal.style.display==='flex'){
      const t = playlist[idx];
      if(t){
        const url = t.urls[currentFormat] || t.urls.mp3;
        el.audio.src = url;
        el.btnDownload.setAttribute('href', url);
        el.btnDownload.setAttribute('download', `${t.title}.${currentFormat}`);
        if(isPlaying) el.audio.play().catch(console.error);
      }
      renderPlaylist();
    }
    if(el.favoritesModal.style.display==='flex'){
      const t = favList[favIdx];
      if(t){
        const fmtX = t.format || currentFormat;
        const url = t.urls[fmtX] || t.urls.mp3;
        el.favAudio.src = url;
        el.favBtnDownload.setAttribute('href', url);
        el.favBtnDownload.setAttribute('download', `${t.title}.${fmtX}`);
        if(isFavPlaying) el.favAudio.play().catch(console.error);
      }
      renderFavorites();
    }
    buildQualityMenu();
    closeQualityMenu();
  }

  // Abrir/cerrar SIN traba (siempre construye la lista)
  el.qualityBtn.addEventListener('click', ()=>{
    buildQualityMenu();
    if(el.qualityMenu.classList.contains('show')) closeQualityMenu();
    else openQualityMenu();
  });
  el.qualityBackdrop.addEventListener('click', closeQualityMenu);

  // ---------- Bienvenida ----------
  if(!sessionStorage.getItem('welcomeShown')){
    el.welcomeModal.style.display='flex';
    el.searchModal.style.display='none';
    el.playerModal.style.display='none';
    el.favoritesModal.style.display='none';
    el.fabSearch.style.display='none';
    el.fabPlayer.style.display='none';
    el.fabFav.style.display='none';
    toggleBodyScroll(true);
    setTimeout(()=>{
      el.welcomeModal.style.animation='fadeOut .4s forwards';
      setTimeout(()=>{
        el.welcomeModal.style.display='none';
        showSearch();
        currentQuery='juan_chota_dura';
        el.searchInput.value='';
        searchAlbums(currentQuery,1,true);
        sessionStorage.setItem('welcomeShown','true');
      },400);
    },10000);
  }else{
    showSearch();
    currentQuery='juan_chota_dura';
    el.searchInput.value='';
    searchAlbums(currentQuery,1,true);
  }

  // ---------- Navegación ----------
  el.fabSearch.addEventListener('click', showSearch);
  el.fabPlayer.addEventListener('click', showPlayer);
  el.fabFav.addEventListener('click', showFavorites);

  function showSearch(){
    el.searchModal.style.display='flex';
    el.playerModal.style.display='none';
    el.favoritesModal.style.display='none';
    el.welcomeModal.style.display='none';
    el.fabSearch.style.display='none';
    el.fabPlayer.style.display=(isPlaying||isFavPlaying)?'block':'none';
    el.fabFav.style.display='block';
    toggleBodyScroll(true);
  }
  function showPlayer(){
    el.searchModal.style.display='none';
    el.playerModal.style.display='flex';
    el.favoritesModal.style.display='none';
    el.fabSearch.style.display='block';
    el.fabPlayer.style.display='none';
    el.fabFav.style.display='block';
    closeQualityMenu();
  }
  function showFavorites(){
    el.searchModal.style.display='none';
    el.playerModal.style.display='none';
    el.favoritesModal.style.display='flex';
    el.fabSearch.style.display='block';
    el.fabPlayer.style.display=(isPlaying||isFavPlaying)?'block':'none';
    el.fabFav.style.display='none';
    loadFavorites();
    closeQualityMenu();
  }

  // ---------- Búsqueda ----------
  el.searchButton.addEventListener('click', ()=>{
    const q = el.searchInput.value.trim();
    if(!q){
      el.errorMessage.textContent='Por favor, ingresa un término de búsqueda.';
      el.errorMessage.style.display='block';
      return;
    }
    currentQuery=q; currentPage=1; searchAlbums(q,1,true);
  });
  el.searchInput.addEventListener('keypress', e=>{
    if(e.key==='Enter'){
      const q = el.searchInput.value.trim();
      if(!q){
        el.errorMessage.textContent='Por favor, ingresa un término de búsqueda.';
        el.errorMessage.style.display='block';
        return;
      }
      currentQuery=q; currentPage=1; searchAlbums(q,1,true);
    }
  });

  function relevance(doc, q){
    const t=(doc.title||'').toLowerCase(), c=normalizeCreator(doc.creator).toLowerCase(), qq=q.toLowerCase();
    let r=0; if(t===qq) r+=300; else if(t.includes(qq)) r+=150; if(c.includes(qq)) r+=50; return r;
  }

  function searchAlbums(query,page,clearPrev){
    if(isLoading) return;
    isLoading=true;
    el.loading.style.display='block';
    el.errorMessage.style.display='none';
    if(clearPrev){ el.albumList.innerHTML=''; allAlbums=[]; el.resultsCount.textContent='Resultados: 0'; }

    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:audio+AND+NOT+access-restricted-item:true&fl=identifier,title,creator&rows=5000&page=${page}&output=json`;

    fetch(url,{headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'}})
      .then(r=>{ if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data=>{
        isLoading=false; el.loading.style.display='none';
        const docs = data.response?.docs||[];
        if(docs.length===0 && page===1){
          el.errorMessage.textContent='No se encontraron resultados. Probá con "Amar Azul" o "Queen Greatest Hits".';
          el.errorMessage.style.display='block';
          displayAlbums(MOCK_ALBUMS);
          return;
        }
        const albums = docs.map(d=>({
          id:d.identifier,
          title:d.title||'Sin título',
          artist:normalizeCreator(d.creator),
          image:`https://archive.org/services/img/${d.identifier}`,
          relevance:relevance(d, query)
        }));
        allAlbums = allAlbums.concat(albums);
        const unique = Array.from(new Map(allAlbums.map(a=>[`${a.title}|${a.artist}`, a])).values());
        el.resultsCount.textContent=`Resultados: ${unique.length}`;
        displayAlbums(unique);
      })
      .catch(err=>{
        isLoading=false; el.loading.style.display='none';
        console.error(err);
        if(allAlbums.length===0){
          el.errorMessage.textContent=`Error: ${err.message}. Mostrando datos de prueba.`;
          el.errorMessage.style.display='block';
          displayAlbums(MOCK_ALBUMS);
        }else{
          el.errorMessage.textContent=`Error: ${err.message}.`;
          el.errorMessage.style.display='block';
        }
      });
  }

  function displayAlbums(albums){
    if(!albums || !albums.length){
      el.resultsCount.textContent='Resultados: 0';
      el.albumList.innerHTML='<p style="padding:12px">No se encontraron álbumes.</p>';
      return;
    }
    albums.sort((a,b)=>b.relevance-a.relevance);
    el.albumList.innerHTML='';
    const frag = document.createDocumentFragment();
    albums.forEach(a=>{
      const item = document.createElement('div');
      item.className='album-item';
      item.innerHTML = `
        <img src="${a.image}" alt="${a.title}" loading="lazy">
        <div class="album-item-info">
          <h3>${truncate(a.title, 60)}</h3>
          <p>${truncate(a.artist, 40)}</p>
        </div>
      `;
      item.addEventListener('click', ()=> openPlayer(a.id));
      frag.appendChild(item);
    });
    el.albumList.appendChild(frag);
  }
  function truncate(t, n){ return (t||'').length>n? (t.slice(0,n-1)+'…') : (t||''); }

  // ---------- Player ----------
  function openPlayer(albumId){
    showPlayer();
    // Reset UI
    el.playlist.innerHTML='<p style="padding:10px;color:#b3b3b3">Cargando canciones…</p>';
    setHero('player','', 'Selecciona una canción', '');
    el.songTitle.textContent='Selecciona una canción';
    el.songArtist.textContent='';
    el.audio.src='';
    el.seek.value=0; el.curTime.textContent='0:00'; el.durTime.textContent='0:00';
    closeQualityMenu();

    // Reset estado
    playlist=[]; originalPlaylist=[]; idx=0; isPlaying=false;
    availableFormats=['mp3']; currentFormat='mp3';
    repeatMode='none'; isShuffled=false; currentAlbumId=albumId;
    el.btnPlay.classList.remove('playing'); el.btnPlay.setAttribute('aria-label','Reproducir');
    el.btnRepeat.classList.remove('active','repeat-one'); el.btnShuffle.classList.remove('active');

    if(albumId==='queen_greatest_hits'){
      const cover = MOCK_ALBUMS[0].image, artist='Queen';
      setHero('player', cover, 'Selecciona una canción', artist);
      playlist = MOCK_TRACKS.map(t=>({...t}));
      originalPlaylist=[...playlist];
      availableFormats=['mp3'];
      buildQualityMenu();
      renderPlaylist();
      loadTrack(0);
      return;
    }

    fetch(`https://archive.org/metadata/${albumId}`, {headers:{'User-Agent':'Mozilla/5.0'}})
      .then(r=>{ if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data=>{
        const coverUrl = `https://archive.org/services/img/${albumId}`;
        const artist = normalizeCreator(data.metadata?.creator || data.metadata?.artist || 'Desconocido');
        setHero('player', coverUrl, 'Selecciona una canción', artist);

        const files = (data.files||[]).filter(f=>/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i.test(f.name||''));
        const tracks = {};
        files.forEach(f=>{
          const raw = f.name;
          const title = extractSongTitle(raw);
          const fmt = (raw.match(/\.(\w+)$/i)||[])[1]?.toLowerCase() || 'mp3';
          const url = `https://archive.org/download/${albumId}/${encodeURIComponent(raw).replace(/\+/g,'%20')}`;
          if(!tracks[title]) tracks[title]={ title, artist, coverUrl, urls:{}, format: currentFormat };
          tracks[title].urls[fmt]=url;
        });
        playlist = Object.values(tracks);
        originalPlaylist=[...playlist];

        availableFormats = unique(files.map(f=>(f.name.match(/\.(\w+)$/i)||[])[1]?.toLowerCase()).filter(Boolean));
        if(!availableFormats.includes('mp3')) availableFormats.unshift('mp3');

        buildQualityMenu();
        renderPlaylist();
        if(playlist.length===0){
          el.playlist.innerHTML='<p style="padding:10px">No se encontraron canciones de audio</p>';
          return;
        }
        loadTrack(0);
      })
      .catch(err=>{
        console.error(err);
        el.playlist.innerHTML=`<p style="padding:10px;color:#b3b3b3">Error: ${err.message}. Usando datos de prueba.</p>`;
        const cover = MOCK_ALBUMS[0].image;
        setHero('player', cover, 'Selecciona una canción', 'Queen');
        playlist = MOCK_TRACKS.map(t=>({...t}));
        originalPlaylist=[...playlist];
        availableFormats=['mp3'];
        buildQualityMenu();
        loadTrack(0);
      });
  }

  function unique(arr){ return [...new Set(arr)]; }

  function loadTrack(i){
    idx = i;
    const t = playlist[idx];
    if(!t) return;

    // Títulos (hero + legado oculto)
    el.songTitle.textContent = t.title;
    el.songArtist.textContent = t.artist;
    setHero('player', t.coverUrl, t.title, t.artist);

    // Audio
    const url = t.urls[currentFormat] || t.urls.mp3;
    el.audio.src = url;
    el.btnDownload.setAttribute('href', url);
    el.btnDownload.setAttribute('download', `${t.title}.${currentFormat}`);

    // Reset tiempo
    el.seek.value=0; el.curTime.textContent='0:00'; el.durTime.textContent='0:00';

    renderPlaylist();
  }

  function renderPlaylist(){
    el.playlist.innerHTML='';
    const favs = getFavorites();

    playlist.forEach((t, i)=>{
      const active = (i===idx);
      const isFav = favs.some(f=>f.urls && f.urls.mp3===t.urls.mp3);
      const showHQ = qualityIsHQ(currentFormat);

      const row = document.createElement('div');
      row.className = `playlist-item${active?' active':''}`;
      row.innerHTML = `
        <img src="${t.coverUrl}" alt="${t.title}" loading="lazy">
        <div class="playlist-item-info">
          <h3>
            ${(active && isPlaying)?`<span class="eq"><span></span><span></span><span></span></span>`:''}
            ${escapeHtml(t.title)}
            ${showHQ?` <span class="hq-indicator">HQ</span>`:''}
          </h3>
          <p>${escapeHtml(t.artist)}</p>
        </div>
        <div class="playlist-item-actions">
          <button class="btn-favorite${isFav?' active':''}" aria-label="${isFav?'Quitar de favoritos':'Agregar a favoritos'}">
            <i class="${isFav?'fas fa-heart':'far fa-heart'}"></i>
          </button>
        </div>
      `;
      // Click en favorito
      row.querySelector('.btn-favorite').addEventListener('click', (e)=>{
        e.stopPropagation();
        const nowFavs = getFavorites();
        if(nowFavs.some(f=>f.urls && f.urls.mp3===t.urls.mp3)){
          removeFromFavorites(t.urls.mp3);
        }else{
          addToFavorites({...t, format: currentFormat});
        }
        renderPlaylist();
        if(el.favoritesModal.style.display==='flex') loadFavorites();
      });
      // Click en fila
      row.addEventListener('click', ()=>{
        loadTrack(i);
        el.audio.play().then(()=>{
          isPlaying=true;
          el.btnPlay.classList.add('playing');
          el.btnPlay.setAttribute('aria-label','Pausar');
          if(isFavPlaying){ el.favAudio.pause(); isFavPlaying=false; el.favBtnPlay.classList.remove('playing'); el.favBtnPlay.setAttribute('aria-label','Reproducir'); }
          el.fabPlayer.style.display='none';
          renderPlaylist(); // refresca eq en activo
        }).catch(console.error);
      });

      el.playlist.appendChild(row);
    });
  }

  // ---------- Favoritos ----------
  function getFavorites(){
    try{
      return JSON.parse(localStorage.getItem('favorites')||'[]')
        .filter(f=>f && f.title && f.artist && f.urls && f.urls.mp3);
    }catch(_){ return []; }
  }
  function setFavorites(list){
    localStorage.setItem('favorites', JSON.stringify(list||[]));
  }
  function addToFavorites(track){
    const favs = getFavorites();
    if(!favs.some(f=>f.urls && f.urls.mp3===track.urls.mp3)){
      favs.unshift(track);
      setFavorites(favs);
    }
  }
  function removeFromFavorites(mp3Url){
    let favs = getFavorites();
    favs = favs.filter(f=>!(f.urls && f.urls.mp3===mp3Url));
    setFavorites(favs);
    favList = favs;
    if(el.favoritesModal.style.display==='flex') loadFavorites();
  }

  function loadFavorites(){
    favList = getFavorites();
    favOriginal=[...favList];
    if(favList.length===0){
      el.favoritesPlaylist.innerHTML='<p style="padding:10px">No hay canciones en favoritos.</p>';
      setHero('favorites','', 'Selecciona una canción', '');
      el.favAudio.src='';
      el.favSeek.value=0; el.favCurTime.textContent='0:00'; el.favDurTime.textContent='0:00';
      isFavPlaying=false; el.favBtnPlay.classList.remove('playing'); el.favBtnPlay.setAttribute('aria-label','Reproducir');
      return;
    }
    renderFavorites();
    if(!el.favAudio.src) loadFavoritesTrack(favIdx);
  }

  function renderFavorites(){
    el.favoritesPlaylist.innerHTML='';
    favList.forEach((t,i)=>{
      const active = (i===favIdx);
      const isHQ = qualityIsHQ(t.format||'');
      const row = document.createElement('div');
      row.className = `playlist-item${active?' active':''}`;
      row.innerHTML = `
        <img src="${t.coverUrl}" alt="${t.title}" loading="lazy">
        <div class="playlist-item-info">
          <h3>
            ${(active && isFavPlaying)?`<span class="eq"><span></span><span></span><span></span></span>`:''}
            ${escapeHtml(t.title)}
            ${isHQ?` <span class="hq-indicator">HQ</span>`:''}
          </h3>
          <p>${escapeHtml(t.artist)}</p>
        </div>
        <div class="playlist-item-actions">
          <button class="btn-remove-favorite" aria-label="Quitar de favoritos"><i class="fas fa-times"></i></button>
        </div>
      `;
      row.querySelector('.btn-remove-favorite').addEventListener('click', (e)=>{
        e.stopPropagation();
        removeFromFavorites(t.urls.mp3);
        renderFavorites();
      });
      row.addEventListener('click', ()=>{
        loadFavoritesTrack(i);
        el.favAudio.play().then(()=>{
          isFavPlaying=true;
          el.favBtnPlay.classList.add('playing');
          el.favBtnPlay.setAttribute('aria-label','Pausar');
          if(isPlaying){ el.audio.pause(); isPlaying=false; el.btnPlay.classList.remove('playing'); el.btnPlay.setAttribute('aria-label','Reproducir'); }
          el.fabPlayer.style.display='none';
          renderFavorites(); // refresca eq en activo
        }).catch(console.error);
      });
      el.favoritesPlaylist.appendChild(row);
    });
  }

  function loadFavoritesTrack(i){
    favIdx=i;
    const t=favList[favIdx];
    if(!t) return;
    const fmt = t.format || 'mp3';
    const url = t.urls[fmt] || t.urls.mp3;

    el.favoritesSongTitle.textContent = t.title;
    el.favoritesSongArtist.textContent = t.artist;
    setHero('favorites', t.coverUrl, t.title, t.artist);

    el.favAudio.src = url;
    el.favBtnDownload.setAttribute('href', url);
    el.favBtnDownload.setAttribute('download', `${t.title}.${fmt}`);

    el.favSeek.value=0; el.favCurTime.textContent='0:00'; el.favDurTime.textContent='0:00';

    renderFavorites();
  }

  // ---------- Controles ----------
  el.btnPlay.addEventListener('click', ()=>togglePlay('player'));
  el.btnNext.addEventListener('click', ()=>nextTrack('player'));
  el.btnPrev.addEventListener('click', ()=>prevTrack('player'));
  el.btnRepeat.addEventListener('click', ()=>toggleRepeat('player'));
  el.btnShuffle.addEventListener('click', ()=>toggleShuffle('player'));

  el.favBtnPlay.addEventListener('click', ()=>togglePlay('favorites'));
  el.favBtnNext.addEventListener('click', ()=>nextTrack('favorites'));
  el.favBtnPrev.addEventListener('click', ()=>prevTrack('favorites'));
  el.favBtnRepeat.addEventListener('click', ()=>toggleRepeat('favorites'));
  el.favBtnShuffle.addEventListener('click', ()=>toggleShuffle('favorites'));

  function togglePlay(scope){
    if(scope==='player' && el.playerModal.style.display==='flex'){
      if(isPlaying){
        el.audio.pause(); isPlaying=false; el.btnPlay.classList.remove('playing'); el.btnPlay.setAttribute('aria-label','Reproducir');
      }else{
        el.audio.play().then(()=>{
          isPlaying=true; el.btnPlay.classList.add('playing'); el.btnPlay.setAttribute('aria-label','Pausar');
          if(isFavPlaying){ el.favAudio.pause(); isFavPlaying=false; el.favBtnPlay.classList.remove('playing'); el.favBtnPlay.setAttribute('aria-label','Reproducir'); }
          el.fabPlayer.style.display='none';
          renderPlaylist();
        }).catch(console.error);
      }
    }else if(scope==='favorites' && el.favoritesModal.style.display==='flex'){
      if(isFavPlaying){
        el.favAudio.pause(); isFavPlaying=false; el.favBtnPlay.classList.remove('playing'); el.favBtnPlay.setAttribute('aria-label','Reproducir');
      }else{
        el.favAudio.play().then(()=>{
          isFavPlaying=true; el.favBtnPlay.classList.add('playing'); el.favBtnPlay.setAttribute('aria-label','Pausar');
          if(isPlaying){ el.audio.pause(); isPlaying=false; el.btnPlay.classList.remove('playing'); el.btnPlay.setAttribute('aria-label','Reproducir'); }
          el.fabPlayer.style.display='none';
          renderFavorites();
        }).catch(console.error);
      }
    }
  }

  function nextTrack(scope){
    if(scope==='player' && el.playerModal.style.display==='flex'){
      if(idx+1<playlist.length){ idx=(idx+1)%playlist.length; loadTrack(idx); if(isPlaying) el.audio.play().catch(console.error); }
      else if(repeatMode==='all'){ idx=0; loadTrack(idx); if(isPlaying) el.audio.play().catch(console.error); }
    }else if(scope==='favorites' && el.favoritesModal.style.display==='flex'){
      if(favIdx+1<favList.length){ favIdx=(favIdx+1)%favList.length; loadFavoritesTrack(favIdx); if(isFavPlaying) el.favAudio.play().catch(console.error); }
      else if(repeatMode==='all'){ favIdx=0; loadFavoritesTrack(favIdx); if(isFavPlaying) el.favAudio.play().catch(console.error); }
    }
  }
  function prevTrack(scope){
    if(scope==='player' && el.playerModal.style.display==='flex'){
      idx=(idx-1+playlist.length)%playlist.length; loadTrack(idx); if(isPlaying) el.audio.play().catch(console.error);
    }else if(scope==='favorites' && el.favoritesModal.style.display==='flex'){
      favIdx=(favIdx-1+favList.length)%favList.length; loadFavoritesTrack(favIdx); if(isFavPlaying) el.favAudio.play().catch(console.error);
    }
  }
  function toggleRepeat(scope){
    if(repeatMode==='none'){
      repeatMode='all';
      if(scope==='player') el.btnRepeat.classList.add('active'); else el.favBtnRepeat.classList.add('active');
    }else if(repeatMode==='all'){
      repeatMode='one';
      if(scope==='player') el.btnRepeat.classList.add('repeat-one'); else el.favBtnRepeat.classList.add('repeat-one');
    }else{
      repeatMode='none';
      if(scope==='player') el.btnRepeat.classList.remove('active','repeat-one'); else el.favBtnRepeat.classList.remove('active','repeat-one');
    }
  }
  function toggleShuffle(scope){
    if(scope==='player' && el.playerModal.style.display==='flex'){
      isShuffled=!isShuffled; el.btnShuffle.classList.toggle('active',isShuffled);
      if(isShuffled){
        const cur = playlist[idx];
        playlist = shuffle([...playlist]);
        idx = playlist.findIndex(t=>t.urls.mp3===cur.urls.mp3);
      }else{
        playlist=[...originalPlaylist];
        const curUrl = el.audio.src;
        idx = Math.max(0, playlist.findIndex(t=>(t.urls[currentFormat]||t.urls.mp3)===curUrl));
      }
      renderPlaylist();
    }else if(scope==='favorites' && el.favoritesModal.style.display==='flex'){
      isShuffled=!isShuffled; el.favBtnShuffle.classList.toggle('active',isShuffled);
      if(isShuffled){
        const cur = favList[favIdx];
        favList = shuffle([...favList]);
        favIdx = favList.findIndex(t=>t.urls.mp3===cur.urls.mp3);
      }else{
        favList=[...favOriginal];
        const curUrl = el.favAudio.src;
        favIdx = Math.max(0, favList.findIndex(t=>(t.urls[t.format||'mp3'])===curUrl));
      }
      renderFavorites();
    }
  }
  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

  // ---------- Helpers ----------
  function escapeHtml(s){ return (s||'').replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

});
