document.addEventListener('DOMContentLoaded', function() {
  console.log('DOMContentLoaded ejecutado');

  // ==== refs ====
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
    suggestionsWrap: document.getElementById('suggestions'),
    suggestionsList: document.getElementById('suggestions-list'),
    // Player (legacy + hero)
    coverImage: document.getElementById('cover-image'),
    songTitle: document.getElementById('song-title'),
    songArtist: document.getElementById('song-artist'),
    playerHero: document.getElementById('player-hero'),
    heroSongTitle: document.getElementById('hero-song-title'),
    heroSongArtist: document.getElementById('hero-song-artist'),
    // Quality
    qualityBtn: document.getElementById('quality-btn'),
    qualityPopover: document.getElementById('quality-popover'),
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

  const missing = Object.entries(el).filter(([_, v]) => !v);
  if (missing.length){ console.error('Faltan elementos:', missing.map(([k])=>k)); return; }

  // limpiar texto de botones (deja <i>)
  document.querySelectorAll('.btn, .btn-small, .btn-favorite, .btn-remove-favorite, .btn-play')
    .forEach(btn => {
      const icons = btn.querySelectorAll('i');
      if (icons.length) { btn.innerHTML = ''; icons.forEach(i => btn.appendChild(i)); }
    });

  // ==== Estado ====
  const HQ_FORMATS = ['wav','flac','aiff','alac','m4a'];
  let mockAlbums = [
    { id:'queen_greatest_hits', title:'Queen - Greatest Hits', artist:'Queen', image:'https://indiehoy.com/wp-content/uploads/2022/05/queen-queen-ii.jpg', relevance:0 }
  ];
  let mockTracks = [
    { title:'Bohemian Rhapsody', artist:'Queen', urls:{ mp3:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }, coverUrl:'https://indiehoy.com/wp-content/uploads/2022/05/queen-queen-ii.jpg', format:'mp3' },
    { title:'Another One Bites the Dust', artist:'Queen', urls:{ mp3:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' }, coverUrl:'https://indiehoy.com/wp-content/uploads/2022/05/queen-queen-ii.jpg', format:'mp3' }
  ];
  let currentPage=1, isLoading=false, currentQuery='', allAlbums=[];
  let playlistConfig=[], originalPlaylist=[], favoritesPlaylist=[], originalFavoritesPlaylist=[];
  let currentTrackIndex=0, currentFavoritesTrackIndex=0;
  let isPlaying=false, isFavoritesPlaying=false, lastScrollPosition=0, currentAlbumId=null;
  let repeatMode='none', isShuffled=false, availableFormats=['mp3'], currentFormat='mp3';
  const paginationEnabled = false;

  // Sugerencias / autocorrect
  const SUG_MAX = 3;
  const AUTO_CORRECT_DISTANCE = 2;
  let bestSuggestion = null;

  // ==== Favoritos storage ====
  try{
    const stored = localStorage.getItem('favorites');
    favoritesPlaylist = stored ? JSON.parse(stored) : [];
    favoritesPlaylist = favoritesPlaylist.filter(f => f && f.title && f.artist && f.urls && f.urls.mp3);
  }catch(e){ localStorage.setItem('favorites','[]'); favoritesPlaylist=[]; }

  // ==== util ====
  function toggleBodyScroll(lock){ document.body.classList.toggle('modal-open', !!lock); }
  const clamp = (v,a,b)=> Math.min(Math.max(v,a), b);
  function truncate(text, n){ return text.length>n ? text.slice(0,n-2)+'..' : text; }
  function formatTime(s){ if(isNaN(s)||s<0) return '0:00'; const m=Math.floor(s/60), ss=Math.floor(s%60); return `${m}:${ss<10?'0':''}${ss}`; }
  function levenshtein(a,b){ const m=[]; for(let i=0;i<=b.length;i++){m[i]=[i]} for(let j=0;j<=a.length;j++){m[0][j]=j}
    for(let i=1;i<=b.length;i++){ for(let j=1;j<=a.length;j++){ m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(b.charAt(i-1)==a.charAt(j-1)?0:1)) } }
    return m[b.length][a.length];
  }
  function escapeHtml(s){ return s.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])) }

  // ==== hero ====
  function setHero(scope, coverUrl, title, artist){
    const isFav = scope==='favorites';
    const hero = isFav ? el.favoritesHero : el.playerHero;
    const hTitle = isFav ? el.favoritesHeroSongTitle : el.heroSongTitle;
    const hArtist = isFav ? el.favoritesHeroSongArtist : el.heroSongArtist;
    const legacyImg = isFav ? el.favoritesCoverImage : el.coverImage;
    const safeCover = (coverUrl && coverUrl.trim()) ? coverUrl : 'https://via.placeholder.com/640x640?text=Sin+portada';
    hero && hero.style.setProperty('--cover-url', `url("${safeCover}")`);
    hTitle && (hTitle.textContent = title || 'Sin título');
    hArtist && (hArtist.textContent = artist || '');
    legacyImg && (legacyImg.src = safeCover);
  }

  // ==== time events ====
  function setupPlayerTimeEvents(player, seekBar, currentTimeEl, durationEl){
    player.addEventListener('loadedmetadata', () => { durationEl.textContent = formatTime(player.duration); seekBar.value = 0; });
    player.addEventListener('timeupdate', () => {
      if (!isNaN(player.duration) && player.duration>0){
        currentTimeEl.textContent = formatTime(player.currentTime);
        seekBar.value = (player.currentTime / player.duration) * 100;
      }
    });
    player.addEventListener('ended', () => {
      if (repeatMode==='one'){ player.currentTime=0; player.play().catch(()=>{}); }
      else { nextTrack(); }
    });
    seekBar.addEventListener('input', () => {
      if (!isNaN(player.duration) && player.duration>0){
        const t = (player.duration * seekBar.value)/100;
        player.currentTime = t; currentTimeEl.textContent = formatTime(t);
      }
    });
  }
  setupPlayerTimeEvents(el.audioPlayer, el.seekBar, el.currentTimeElement, el.durationElement);
  setupPlayerTimeEvents(el.favoritesAudioPlayer, el.favoritesSeekBar, el.favoritesCurrentTime, el.favoritesDuration);

  // ==== Calidad popover ====
  function rebuildQualityPopover(){
    if (!el.qualityPopover) return;
    const pop = el.qualityPopover;
    pop.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'q-item';
    header.style.fontWeight='700';
    header.style.cursor='default';
    header.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Elegir calidad`;
    header.addEventListener('click', e => e.stopPropagation());
    pop.appendChild(header);

    (availableFormats?.length ? availableFormats : ['mp3']).forEach(fmt => {
      const item = document.createElement('div');
      item.className = 'q-item';
      const isHQ = HQ_FORMATS.includes(fmt.toLowerCase());
      item.innerHTML = `
        <i class="fa-solid ${fmt==='mp3' ? 'fa-bolt' : 'fa-gem'}"></i>
        <span>${fmt.toUpperCase()}</span>
        ${isHQ ? '<span class="q-badge">HQ</span>' : ''}
        ${fmt===currentFormat ? '<i class="fa-solid fa-check" style="margin-left:auto"></i>' : ''}
      `;
      item.addEventListener('click', (e) => { e.stopPropagation(); setFormat(fmt); togglePopover(false); });
      pop.appendChild(item);
    });

    positionPopover();
  }
  function positionPopover(){
    if (!el.qualityBtn || !el.qualityPopover) return;
    // mostrar para medir
    el.qualityPopover.style.visibility='hidden';
    el.qualityPopover.classList.add('open');
    const btnRect = el.qualityBtn.getBoundingClientRect();
    const popRect = el.qualityPopover.getBoundingClientRect();
    const vw = window.innerWidth, margin = 12;
    let center = btnRect.left + (btnRect.width/2);
    const half = popRect.width/2;
    if (center - half < margin) center = margin + half;
    if (center + half > vw - margin) center = vw - margin - half;
    const top = btnRect.bottom + window.scrollY + 8;
    el.qualityPopover.style.top = `${top}px`;
    el.qualityPopover.style.left = `${center - half + window.scrollX}px`;
    el.qualityPopover.style.visibility='visible';
  }
  function togglePopover(open){
    if (!el.qualityPopover) return;
    el.qualityPopover.classList.toggle('open', !!open);
    el.qualityPopover.setAttribute('aria-hidden', open ? 'false':'true');
    document.querySelector('.quality-btn .chevron')?.style && (document.querySelector('.quality-btn .chevron').style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)');
  }
  function setFormat(fmt){
    currentFormat = fmt;
    if (!playlistConfig.length) return;
    playlistConfig.forEach(t => t.format = fmt);
    const cur = playlistConfig[currentTrackIndex];
    if (cur){
      const url = cur.urls[fmt] || cur.urls.mp3;
      el.audioPlayer.src = url;
      el.btnDownload.setAttribute('href', url);
      el.btnDownload.setAttribute('download', `${cur.title}.${fmt}`);
      if (isPlaying) el.audioPlayer.play().catch(()=>{});
    }
    rebuildQualityPopover();
    renderPlaylist();
  }
  // eventos del botón
  if (el.qualityBtn){
    el.qualityBtn.addEventListener('click', (e)=>{ e.stopPropagation(); rebuildQualityPopover(); togglePopover(!el.qualityPopover.classList.contains('open')); });
    window.addEventListener('resize', ()=>{ if (el.qualityPopover.classList.contains('open')) positionPopover(); });
    document.addEventListener('click', (e)=>{ if (!e.target.closest('.quality-popover') && !e.target.closest('#quality-btn')) togglePopover(false); });
    document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') togglePopover(false); });
  }

  // (selector viejo, por compat)
  if (el.formatSelector){
    el.formatSelector.addEventListener('change', ()=> setFormat(el.formatSelector.value));
  }

  // ==== bienvenida ====
  if (!sessionStorage.getItem('welcomeShown')){
    el.welcomeModal.style.display='flex';
    el.searchModal.style.display='none'; el.playerModal.style.display='none'; el.favoritesModal.style.display='none';
    el.floatingSearchButton.style.display='none'; el.floatingPlayerButton.style.display='none'; el.floatingFavoritesButton.style.display='none';
    toggleBodyScroll(true);
    setTimeout(()=>{
      el.welcomeModal.style.animation='fadeOut 0.5s forwards';
      setTimeout(()=>{
        el.welcomeModal.style.display='none';
        showSearchModal();
        currentQuery='juan_chota_dura';
        el.searchInput.value='';
        searchAlbums(currentQuery, currentPage, true);
        sessionStorage.setItem('welcomeShown','true');
      },500);
    },10000);
  }else{
    showSearchModal();
    currentQuery='juan_chota_dura';
    el.searchInput.value='';
    searchAlbums(currentQuery, currentPage, true);
  }

  // ==== navegación ====
  function showSearchModal(){
    el.searchModal.style.display='flex'; el.playerModal.style.display='none'; el.favoritesModal.style.display='none'; el.welcomeModal.style.display='none';
    el.floatingSearchButton.style.display='none';
    el.floatingPlayerButton.style.display = (isPlaying || isFavoritesPlaying) ? 'block' : 'none';
    el.floatingFavoritesButton.style.display='block';
    el.albumList.scrollTop = lastScrollPosition;
    toggleBodyScroll(true);
  }
  function showPlayerModal(){
    el.searchModal.style.display='none'; el.playerModal.style.display='flex'; el.favoritesModal.style.display='none'; el.welcomeModal.style.display='none';
    el.floatingSearchButton.style.display='block'; el.floatingPlayerButton.style.display='none'; el.floatingFavoritesButton.style.display='block';
    toggleBodyScroll(true);
    document.querySelectorAll('#reproductor-container-sanavera .playlist').forEach(x=>x.scrollLeft=0);
  }
  function showFavoritesModal(){
    el.searchModal.style.display='none'; el.playerModal.style.display='none'; el.favoritesModal.style.display='flex'; el.welcomeModal.style.display='none';
    el.floatingSearchButton.style.display='block';
    el.floatingPlayerButton.style.display = (isPlaying || isFavoritesPlaying) ? 'block' : 'none';
    el.floatingFavoritesButton.style.display='none';
    loadFavorites();
    toggleBodyScroll(true);
    document.querySelectorAll('#reproductor-container-sanavera .playlist').forEach(x=>x.scrollLeft=0);
  }
  el.floatingSearchButton.addEventListener('click', showSearchModal);
  el.floatingPlayerButton.addEventListener('click', showPlayerModal);
  el.floatingFavoritesButton.addEventListener('click', showFavoritesModal);

  // ==== búsqueda + sugerencias ====
  el.searchButton.addEventListener('click', onSearchSubmit);
  el.searchInput.addEventListener('keypress', (ev)=>{ if (ev.key==='Enter') onSearchSubmit(); });
  el.searchInput.addEventListener('input', onInputFetchSuggestions);

  function onSearchSubmit(){
    hideSuggestions();
    const raw = el.searchInput.value.trim();
    if (!raw){
      el.errorMessage.textContent='Por favor, ingresa un término de búsqueda.'; el.errorMessage.style.display='block'; return;
    }
    const sug = bestSuggestion;
    if (sug && levenshtein(raw.toLowerCase(), sug.toLowerCase()) <= AUTO_CORRECT_DISTANCE){
      el.searchInput.value = sug;
    }
    currentQuery = el.searchInput.value.trim();
    currentPage = 1;
    searchAlbums(currentQuery, currentPage, true);
  }

  function onInputFetchSuggestions(){
    const q = el.searchInput.value.trim();
    bestSuggestion = null;
    if (!q){ hideSuggestions(); return; }
    fetchSuggestionsAny(q).then(list=>{
      const cleaned = (list||[]).map(s=>s.toString()).filter(s=>s.length>=2).filter((s,i,a)=>a.indexOf(s)===i);
      bestSuggestion = cleaned[0] || null;
      if (cleaned.length) showSuggestions(cleaned); else hideSuggestions();
    }).catch(()=> hideSuggestions());
  }

  function fetchSuggestionsAny(q){
    const g = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}`;
    return fetch(g).then(r=> r.ok ? r.json() : Promise.reject())
      .then(data => (Array.isArray(data)&&Array.isArray(data[1])) ? data[1] : [])
      .catch(()=>{
        const ddg = `https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}&type=list`;
        return fetch(ddg).then(r=> r.ok ? r.json() : []).then(arr=>{
          if (!Array.isArray(arr)) return [];
          return arr.map(x => (x && (x.phrase||x)) + '').filter(Boolean);
        }).catch(()=>[]);
      });
  }

  function showSuggestions(items){
    el.suggestionsList.innerHTML='';
    items.slice(0,SUG_MAX).forEach(txt=>{
      const li = document.createElement('li');
      li.tabIndex=0;
      li.innerHTML = `<span class="sug-primary">${escapeHtml(txt)}</span>`;
      li.addEventListener('click', ()=>{
        el.searchInput.value = txt;
        hideSuggestions();
        el.searchInput.blur();
        currentQuery = txt; currentPage = 1;
        searchAlbums(currentQuery, currentPage, true);
      });
      li.addEventListener('keydown', e=>{ if (e.key==='Enter') li.click(); if (e.key==='Escape') hideSuggestions(); });
      el.suggestionsList.appendChild(li);
    });
    positionSuggestions();
    el.suggestionsList.classList.add('show');
  }
  function hideSuggestions(){ el.suggestionsList.classList.remove('show'); el.suggestionsList.innerHTML=''; }
  function positionSuggestions(){ /* queda debajo del input dentro del flujo, ya está bien en mobile */ }

  // ==== search ====
  function searchAlbums(query, page, clearPrevious){
    if (isLoading) return;
    isLoading=true; el.loading.style.display='block'; el.errorMessage.style.display='none';
    if (clearPrevious){ el.albumList.innerHTML=''; allAlbums=[]; el.resultsCount.textContent='Resultados: 0'; }

    const queryEncoded = encodeURIComponent(query);
    const url = `https://archive.org/advancedsearch.php?q=${queryEncoded}+AND+mediatype:audio+AND+NOT+access-restricted-item:true&fl=identifier,title,creator&rows=5000&page=${page}&output=json`;

    fetch(url, { headers:{ 'User-Agent':'Mozilla/5.0', 'Accept':'application/json' } })
      .then(r=>{ if(!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`); return r.json(); })
      .then(data=>{
        isLoading=false; el.loading.style.display='none';
        const docs = data.response?.docs || [];
        if (docs.length===0 && page===1){
          el.errorMessage.textContent='No se encontraron resultados. Probá con "Amar Azul" o "Queen Greatest Hits".';
          el.errorMessage.style.display='block';
          if (clearPrevious) displayAlbums(mockAlbums);
          return;
        }
        const albums = docs.map(doc=>({
          id: doc.identifier,
          title: doc.title || 'Sin título',
          artist: normalizeCreator(doc.creator),
          image: `https://archive.org/services/img/${doc.identifier}`,
          relevance: calculateRelevance(doc, query.toLowerCase())
        }));
        allAlbums = allAlbums.concat(albums);
        const unique = Array.from(new Map(allAlbums.map(a=>[`${a.title}|${a.artist}`, a])).values());
        el.resultsCount.textContent = `Resultados: ${unique.length}`;
        displayAlbums(unique);
      })
      .catch(err=>{
        isLoading=false; el.loading.style.display='none';
        console.error(err);
        if (clearPrevious && allAlbums.length===0){
          el.errorMessage.textContent = `Error: ${err.message}. Mostrando datos de prueba.`;
          el.errorMessage.style.display='block';
          displayAlbums(mockAlbums);
        }else{
          el.errorMessage.textContent = `Error: ${err.message}.`;
          el.errorMessage.style.display='block';
        }
      });
  }
  function normalizeCreator(c){ return Array.isArray(c) ? c.join(', ') : c || 'Desconocido'; }
  function calculateRelevance(doc, q){
    const title=(doc.title||'').toLowerCase(); const creator=normalizeCreator(doc.creator).toLowerCase(); let r=0;
    if (title===q) r+=300; else if (isNearMatch(title,q)) r+=250; else if (title.includes(q)) r+=150;
    if (creator.includes(q)) r+=50; return r;
  }
  function isNearMatch(a,b){
    a=a.toLowerCase().replace(/[^a-z0-9]/g,''); b=b.toLowerCase().replace(/[^a-z0-9]/g,'');
    if (a.includes(b)||b.includes(a)) return true;
    const maxL=Math.max(a.length,b.length); let diff=0;
    for (let i=0;i<Math.min(a.length,b.length);i++){ if (a[i]!==b[i]) diff++; if (diff>maxL*0.2) return false; }
    return true;
  }
  function displayAlbums(albums){
    if (!albums || !albums.length){ el.resultsCount.textContent='Resultados: 0'; el.albumList.innerHTML='<p>No se encontraron álbumes.</p>'; return; }
    albums.sort((a,b)=> b.relevance - a.relevance);
    el.resultsCount.textContent = `Resultados: ${albums.length}`;
    el.albumList.innerHTML='';
    albums.forEach(a=>{
      const item = document.createElement('div');
      item.className='album-item';
      item.innerHTML = `
        <img src="${a.image}" alt="${a.title}" loading="lazy">
        <div class="album-item-info">
          <h3>${truncate(a.title, 35)}</h3>
          <p>${truncate(a.artist, 23)}</p>
        </div>`;
      item.addEventListener('click', ()=> openPlayer(a.id));
      el.albumList.appendChild(item);
    });
  }

  // ==== Player ====
  function openPlayer(albumId){
    lastScrollPosition = el.albumList.scrollTop;
    showPlayerModal();

    // reset UI
    el.playlistElement.innerHTML='<p>Cargando canciones...</p>';
    el.songTitle.textContent='Selecciona una canción';
    el.songArtist.textContent='';
    el.coverImage.src=''; el.audioPlayer.src='';
    el.seekBar.value=0; el.currentTimeElement.textContent='0:00'; el.durationElement.textContent='0:00';
    playlistConfig=[]; originalPlaylist=[]; currentTrackIndex=0; isPlaying=false;
    availableFormats=['mp3']; currentFormat='mp3';
    el.btnPlay.classList.remove('playing'); el.btnPlay.setAttribute('aria-label','Reproducir');
    el.btnRepeat.classList.remove('active','repeat-one'); el.btnShuffle.classList.remove('active');
    repeatMode='none'; isShuffled=false; currentAlbumId=albumId;

    if (albumId==='queen_greatest_hits'){
      const cover=mockAlbums[0].image, artist='Queen';
      setHero('player', cover, 'Selecciona una canción', artist);
      el.songArtist.textContent=artist;
      playlistConfig = mockTracks.map(t=>({...t}));
      originalPlaylist=[...playlistConfig];
      availableFormats=['mp3'];
      rebuildQualityPopover();
      initPlayer(); return;
    }

    fetch(`https://archive.org/metadata/${albumId}`, { headers:{'User-Agent':'Mozilla/5.0'} })
      .then(r=>{ if(!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`); return r.json(); })
      .then(data=>{
        const coverUrl = `https://archive.org/services/img/${albumId}`;
        const artist = normalizeCreator(data.metadata?.creator || data.metadata?.artist || 'Desconocido');
        setHero('player', coverUrl, 'Selecciona una canción', artist);
        el.songArtist.textContent = artist;

        const files = (data.files||[]).filter(f=> f.name && /\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i.test(f.name));
        playlistConfig = files.reduce((arr,file)=>{
          const title = extractSongTitle(file.name);
          const fmt = file.name.match(/\.(\w+)$/i)[1].toLowerCase();
          const url = `https://archive.org/download/${albumId}/${encodeURIComponent(file.name).replace(/\+/g,'%20')}`;
          let t = arr.find(x=> x.title===title);
          if (!t){ t={ title, artist, coverUrl, urls:{}, format:currentFormat }; arr.push(t); }
          t.urls[fmt]=url;
          return arr;
        },[]);
        availableFormats = [...new Set(files.map(f=> f.name.match(/\.(\w+)$/i)[1].toLowerCase()))];

        if (!playlistConfig.length){ el.playlistElement.innerHTML='<p>No se encontraron canciones de audio</p>'; currentAlbumId=null; return; }
        originalPlaylist=[...playlistConfig];
        el.coverImage.src=coverUrl;

        rebuildQualityPopover();
        initPlayer();
      })
      .catch(err=>{
        console.error(err);
        el.playlistElement.innerHTML = `<p>Error al cargar canciones: ${err.message}. Usando datos de prueba.</p>`;
        playlistConfig = mockTracks.map(t=>({...t}));
        originalPlaylist=[...playlistConfig];
        setHero('player', mockAlbums[0].image, 'Selecciona una canción', 'Queen');
        el.songArtist.textContent='Queen';
        currentAlbumId='queen_greatest_hits';
        availableFormats=['mp3'];
        rebuildQualityPopover();
        initPlayer();
      });
  }

  function extractSongTitle(fileName){
    try{
      let n=fileName.replace(/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i,''); const i=n.lastIndexOf('/'); if(i!==-1) n=n.substring(i+1); return n.replace(/_/g,' ');
    }catch(e){ return fileName.replace(/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i,'').replace(/_/g,' '); }
  }

  function initPlayer(){
    renderPlaylist();
    loadTrack(currentTrackIndex);
    el.audioPlayer.volume=1.0;
    el.btnPlay.classList.remove('playing'); el.btnPlay.setAttribute('aria-label','Reproducir');
  }

  function renderPlaylist(){
    el.playlistElement.innerHTML='';
    const favorites = JSON.parse(localStorage.getItem('favorites')||'[]');

    playlistConfig.forEach((track,index)=>{
      const isFav = favorites.some(f=> f.urls && f.urls.mp3 === track.urls.mp3);
      const item = document.createElement('div');
      item.className = `playlist-item${index===currentTrackIndex ? ' active' : ''}`;
      item.innerHTML = `
        <img src="${track.coverUrl}" alt="${track.title}" loading="lazy" />
        <div class="playlist-item-info">
          <h3>${track.title}</h3>
          <p>${track.artist}</p>
        </div>
        <div class="playlist-item-actions">
          <button class="btn-favorite${isFav ? ' active' : ''}" data-index="${index}" aria-label="${isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
            <i class="${isFav ? 'fas fa-heart' : 'far fa-heart'}"></i>
          </button>
        </div>`;
      item.querySelector('.btn-favorite').addEventListener('click', ()=>{
        const t = playlistConfig[index];
        if (favorites.some(f=> f.urls && f.urls.mp3 === t.urls.mp3)) removeFromFavorites(t.urls.mp3);
        else addToFavorites(t);
      });
      item.addEventListener('click', e=>{
        if (!e.target.closest('.btn-favorite')){
          currentTrackIndex = index;
          loadTrack(currentTrackIndex);
          el.audioPlayer.play().then(()=>{
            isPlaying=true; el.btnPlay.classList.add('playing'); el.btnPlay.setAttribute('aria-label','Pausar');
            if (isFavoritesPlaying){ el.favoritesAudioPlayer.pause(); isFavoritesPlaying=false; el.favoritesBtnPlay.classList.remove('playing'); el.favoritesBtnPlay.setAttribute('aria-label','Reproducir'); }
            el.floatingPlayerButton.style.display='none';
          }).catch(()=>{});
        }
      });
      el.playlistElement.appendChild(item);
    });
  }

  function loadTrack(index){
    const track = playlistConfig[index]; if (!track) return;
    track.format = currentFormat;
    el.songTitle.textContent = track.title; el.songArtist.textContent = track.artist;
    setHero('player', track.coverUrl, track.title, track.artist);
    const url = track.urls[currentFormat] || track.urls.mp3;
    el.audioPlayer.src=url; el.btnDownload.setAttribute('href',url); el.btnDownload.setAttribute('download',`${track.title}.${currentFormat}`);
    el.seekBar.value=0; el.currentTimeElement.textContent='0:00'; el.durationElement.textContent='0:00';
    rebuildQualityPopover();
    renderPlaylist();
  }

  // ==== Favoritos ====
  function addToFavorites(track){
    const favorites = JSON.parse(localStorage.getItem('favorites')||'[]');
    if (!favorites.some(f=> f.urls && f.urls.mp3 === track.urls.mp3)){
      favorites.unshift({ ...track, format: currentFormat });
      localStorage.setItem('favorites', JSON.stringify(favorites));
      if (el.favoritesModal.style.display==='flex') loadFavorites();
      renderPlaylist();
    }
  }
  function removeFromFavorites(mp3Url){
    let favorites = JSON.parse(localStorage.getItem('favorites')||'[]');
    favorites = favorites.filter(f=> !(f.urls && f.urls.mp3===mp3Url));
    localStorage.setItem('favorites', JSON.stringify(favorites));
    favoritesPlaylist = favorites;
    if (el.favoritesModal.style.display==='flex') loadFavorites();
    renderPlaylist();
  }
  function loadFavorites(){
    try{
      favoritesPlaylist = JSON.parse(localStorage.getItem('favorites')||'[]').filter(f=> f && f.title && f.artist && f.urls && f.urls.mp3);
      originalFavoritesPlaylist=[...favoritesPlaylist];
      if (!favoritesPlaylist.length){
        el.favoritesPlaylistElement.innerHTML='<p>No hay canciones en favoritos.</p>';
        el.favoritesSongTitle.textContent='Selecciona una canción'; el.favoritesSongArtist.textContent='';
        setHero('favorites','', 'Selecciona una canción','');
        el.favoritesAudioPlayer.src=''; el.favoritesSeekBar.value=0; el.favoritesCurrentTime.textContent='0:00'; el.favoritesDuration.textContent='0:00';
        isFavoritesPlaying=false; el.favoritesBtnPlay.classList.remove('playing'); el.favoritesBtnPlay.setAttribute('aria-label','Reproducir');
        el.favoritesBtnRepeat.classList.remove('active','repeat-one'); el.favoritesBtnShuffle.classList.remove('active');
        repeatMode='none'; isShuffled=false; return;
      }
      renderFavoritesPlaylist();
      if (!el.favoritesAudioPlayer.src) loadFavoritesTrack(currentFavoritesTrackIndex);
    }catch(e){
      el.favoritesPlaylistElement.innerHTML='<p>Error al cargar favoritos.</p>';
    }
  }
  function renderFavoritesPlaylist(){
    el.favoritesPlaylistElement.innerHTML='';
    favoritesPlaylist.forEach((t,i)=>{
      const item = document.createElement('div');
      item.className = `playlist-item${i===currentFavoritesTrackIndex ? ' active' : ''}`;
      item.innerHTML = `
        <img src="${t.coverUrl}" alt="${t.title}" loading="lazy" />
        <div class="playlist-item-info">
          <h3>${t.title}</h3>
          <p>${t.artist}</p>
        </div>
        <div class="playlist-item-actions">
          <button class="btn-remove-favorite" data-index="${i}" aria-label="Quitar de favoritos">
            <i class="fas fa-times"></i>
          </button>
        </div>`;
      item.querySelector('.btn-remove-favorite').addEventListener('click', ()=> removeFromFavorites(t.urls.mp3));
      item.addEventListener('click', e=>{
        if (!e.target.closest('.btn-remove-favorite')){
          currentFavoritesTrackIndex=i; loadFavoritesTrack(currentFavoritesTrackIndex);
          el.favoritesAudioPlayer.play().then(()=>{
            isFavoritesPlaying=true; el.favoritesBtnPlay.classList.add('playing'); el.favoritesBtnPlay.setAttribute('aria-label','Pausar');
            if (isPlaying){ el.audioPlayer.pause(); isPlaying=false; el.btnPlay.classList.remove('playing'); el.btnPlay.setAttribute('aria-label','Reproducir'); }
            el.floatingPlayerButton.style.display='none';
          }).catch(()=>{});
        }
      });
      el.favoritesPlaylistElement.appendChild(item);
    });
  }
  function loadFavoritesTrack(index){
    const t=favoritesPlaylist[index]; if(!t) return;
    el.favoritesSongTitle.textContent=t.title; el.favoritesSongArtist.textContent=t.artist;
    setHero('favorites', t.coverUrl, t.title, t.artist);
    const fmt=t.format||'mp3'; const url=t.urls[fmt]||t.urls.mp3;
    el.favoritesAudioPlayer.src=url; el.favoritesBtnDownload.setAttribute('href',url); el.favoritesBtnDownload.setAttribute('download',`${t.title}.${fmt}`);
    el.favoritesSeekBar.value=0; el.favoritesCurrentTime.textContent='0:00'; el.favoritesDuration.textContent='0:00';
    renderFavoritesPlaylist();
  }

  // ==== controles ====
  function togglePlay(){
    if (el.playerModal.style.display==='flex'){
      if (isPlaying){ el.audioPlayer.pause(); isPlaying=false; el.btnPlay.classList.remove('playing'); el.btnPlay.setAttribute('aria-label','Reproducir'); }
      else{
        el.audioPlayer.play().then(()=>{
          isPlaying=true; el.btnPlay.classList.add('playing'); el.btnPlay.setAttribute('aria-label','Pausar');
          if (isFavoritesPlaying){ el.favoritesAudioPlayer.pause(); isFavoritesPlaying=false; el.favoritesBtnPlay.classList.remove('playing'); el.favoritesBtnPlay.setAttribute('aria-label','Reproducir'); }
          el.floatingPlayerButton.style.display='none';
        }).catch(()=>{});
      }
    }else if (el.favoritesModal.style.display==='flex'){
      if (isFavoritesPlaying){ el.favoritesAudioPlayer.pause(); isFavoritesPlaying=false; el.favoritesBtnPlay.classList.remove('playing'); el.favoritesBtnPlay.setAttribute('aria-label','Reproducir'); }
      else{
        el.favoritesAudioPlayer.play().then(()=>{
          isFavoritesPlaying=true; el.favoritesBtnPlay.classList.add('playing'); el.favoritesBtnPlay.setAttribute('aria-label','Pausar');
          if (isPlaying){ el.audioPlayer.pause(); isPlaying=false; el.btnPlay.classList.remove('playing'); el.btnPlay.setAttribute('aria-label','Reproducir'); }
          el.floatingPlayerButton.style.display='none';
        }).catch(()=>{});
      }
    }
  }
  function nextTrack(){
    if (el.playerModal.style.display==='flex'){
      if (currentTrackIndex + 1 < playlistConfig.length){ currentTrackIndex=(currentTrackIndex+1)%playlistConfig.length; loadTrack(currentTrackIndex); if (isPlaying) el.audioPlayer.play().catch(()=>{}); }
      else if (repeatMode==='all'){ currentTrackIndex=0; loadTrack(currentTrackIndex); if (isPlaying) el.audioPlayer.play().catch(()=>{}); }
    }else if (el.favoritesModal.style.display==='flex'){
      if (currentFavoritesTrackIndex + 1 < favoritesPlaylist.length){ currentFavoritesTrackIndex=(currentFavoritesTrackIndex+1)%favoritesPlaylist.length; loadFavoritesTrack(currentFavoritesTrackIndex); if (isFavoritesPlaying) el.favoritesAudioPlayer.play().catch(()=>{}); }
      else if (repeatMode==='all'){ currentFavoritesTrackIndex=0; loadFavoritesTrack(currentFavoritesTrackIndex); if (isFavoritesPlaying) el.favoritesAudioPlayer.play().catch(()=>{}); }
    }
  }
  function prevTrack(){
    if (el.playerModal.style.display==='flex'){
      currentTrackIndex = (currentTrackIndex - 1 + playlistConfig.length) % playlistConfig.length;
      loadTrack(currentTrackIndex); if (isPlaying) el.audioPlayer.play().catch(()=>{});
    }else if (el.favoritesModal.style.display==='flex'){
      currentFavoritesTrackIndex = (currentFavoritesTrackIndex - 1 + favoritesPlaylist.length) % favoritesPlaylist.length;
      loadFavoritesTrack(currentFavoritesTrackIndex); if (isFavoritesPlaying) el.favoritesAudioPlayer.play().catch(()=>{});
    }
  }
  function toggleRepeat(){
    if (el.playerModal.style.display==='flex'){
      if (repeatMode==='none'){ repeatMode='all'; el.btnRepeat.classList.add('active'); el.btnRepeat.setAttribute('aria-label','Repetir todo'); }
      else if (repeatMode==='all'){ repeatMode='one'; el.btnRepeat.classList.add('repeat-one'); el.btnRepeat.setAttribute('aria-label','Repetir una canción'); }
      else { repeatMode='none'; el.btnRepeat.classList.remove('active','repeat-one'); el.btnRepeat.setAttribute('aria-label','Repetir'); }
    }else{
      if (repeatMode==='none'){ repeatMode='all'; el.favoritesBtnRepeat.classList.add('active'); }
      else if (repeatMode==='all'){ repeatMode='one'; el.favoritesBtnRepeat.classList.add('repeat-one'); }
      else { repeatMode='none'; el.favoritesBtnRepeat.classList.remove('active','repeat-one'); }
    }
  }
  function toggleShuffle(){
    if (el.playerModal.style.display==='flex'){
      isShuffled=!isShuffled; el.btnShuffle.classList.toggle('active', isShuffled); el.btnShuffle.setAttribute('aria-label', isShuffled?'Desactivar mezclar':'Mezclar');
      if (isShuffled){ const cur=playlistConfig[currentTrackIndex]; playlistConfig=shuffleArray([...playlistConfig]); currentTrackIndex=playlistConfig.findIndex(t=> t.urls.mp3===cur.urls.mp3); }
      else { playlistConfig=[...originalPlaylist]; currentTrackIndex = Math.max(0, playlistConfig.findIndex(t=> (t.urls[currentFormat]||t.urls.mp3)===el.audioPlayer.src)); }
      renderPlaylist();
    }else{
      isShuffled=!isShuffled; el.favoritesBtnShuffle.classList.toggle('active', isShuffled);
      if (isShuffled){ const cur=favoritesPlaylist[currentFavoritesTrackIndex]; favoritesPlaylist=shuffleArray([...favoritesPlaylist]); currentFavoritesTrackIndex=favoritesPlaylist.findIndex(t=> t.urls.mp3===cur.urls.mp3); }
      else { favoritesPlaylist=[...originalFavoritesPlaylist]; currentFavoritesTrackIndex = Math.max(0, favoritesPlaylist.findIndex(t=> (t.urls[t.format||'mp3'])===el.favoritesAudioPlayer.src)); }
      renderFavoritesPlaylist();
    }
  }
  const shuffleArray = arr => { for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; };

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
});
