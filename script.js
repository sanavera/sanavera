document.addEventListener('DOMContentLoaded', function() {
  // ===== Refs =====
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
    suggestionsList: byId('suggestions-list'),

    // Player + hero
    coverImage: byId('cover-image'),
    songTitle: byId('song-title'),
    songArtist: byId('song-artist'),
    playerHero: byId('player-hero'),
    heroSongTitle: byId('hero-song-title'),
    heroSongArtist: byId('hero-song-artist'),

    // Calidad
    qualityBtn: byId('quality-btn'),
    qualityPopover: byId('quality-popover'),
    formatSelector: byId('format-selector'),

    // Listas
    playlistElement: byId('playlist'),
    favoritesPlaylistElement: byId('favorites-playlist'),

    // Audio
    audioPlayer: byId('audio-player'),
    favoritesAudioPlayer: byId('favorites-audio-player'),

    // Controles
    btnPlay: byId('btn-play'),
    btnPrev: byId('btn-prev'),
    btnNext: byId('btn-next'),
    btnRepeat: byId('btn-repeat'),
    btnShuffle: byId('btn-shuffle'),
    btnDownload: byId('btn-download'),
    seekBar: byId('seek-bar'),
    currentTimeElement: byId('current-time'),
    durationElement: byId('duration'),

    // FABs
    floatingSearchButton: byId('floating-search-button'),
    floatingPlayerButton: byId('floating-player-button'),
    floatingFavoritesButton: byId('floating-favorites-button'),

    // Favoritos + hero
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
  function byId(id){ return document.getElementById(id); }

  // ===== Estado =====
  const HQ_FORMATS = ['wav','flac','aiff','alac','m4a'];
  let mockAlbums = [
    { id:'queen_greatest_hits', title:'Queen - Greatest Hits', artist:'Queen', image:'https://indiehoy.com/wp-content/uploads/2022/05/queen-queen-ii.jpg', relevance:0 }
  ];
  let mockTracks = [
    { title:'Bohemian Rhapsody', artist:'Queen', urls:{ mp3:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }, coverUrl:'https://indiehoy.com/wp-content/uploads/2022/05/queen-queen-ii.jpg', format:'mp3' },
    { title:'Another One Bites the Dust', artist:'Queen', urls:{ mp3:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' }, coverUrl:'https://indiehoy.com/wp-content/uploads/2022/05/queen-queen-ii.jpg', format:'mp3' }
  ];

  let currentPage=1, isLoading=false, currentQuery='', allAlbums=[];
  let playlistConfig=[], originalPlaylist=[];
  let favoritesPlaylist=[], originalFavoritesPlaylist=[];
  let currentTrackIndex=0, currentFavoritesTrackIndex=0;
  let isPlaying=false, isFavoritesPlaying=false, lastScrollPosition=0, currentAlbumId=null;
  let repeatMode='none', isShuffled=false, availableFormats=['mp3'], currentFormat='mp3';

  // ===== Helpers =====
  function toggleBodyScroll(lock){ document.body.classList.toggle('modal-open', !!lock); }
  function truncate(text, n){ return text.length>n ? text.slice(0,n-2)+'..' : text; }
  function formatTime(s){ if(isNaN(s)||s<0) return '0:00'; const m=Math.floor(s/60), ss=Math.floor(s%60); return `${m}:${ss<10?'0':''}${ss}`; }
  function normalizeCreator(c){ return Array.isArray(c) ? c.join(', ') : c || 'Desconocido'; }

  // ===== Time events =====
  setupTime(el.audioPlayer, el.seekBar, el.currentTimeElement, el.durationElement);
  setupTime(el.favoritesAudioPlayer, el.favoritesSeekBar, el.favoritesCurrentTime, el.favoritesDuration);
  function setupTime(player, seek, cur, dur){
    player.addEventListener('loadedmetadata', ()=>{ dur.textContent=formatTime(player.duration); seek.value=0; });
    player.addEventListener('timeupdate', ()=>{
      if (!isNaN(player.duration) && player.duration>0){
        cur.textContent=formatTime(player.currentTime);
        seek.value=(player.currentTime/player.duration)*100;
      }
    });
    player.addEventListener('ended', ()=>{ if (repeatMode==='one'){ player.currentTime=0; player.play().catch(()=>{}); } else nextTrack(); });
    seek.addEventListener('input', ()=>{
      if (!isNaN(player.duration) && player.duration>0){
        const t=(player.duration*seek.value)/100; player.currentTime=t; cur.textContent=formatTime(t);
      }
    });
  }

  // ===== Hero =====
  function setHero(scope, coverUrl, title, artist){
    const isFav = scope==='favorites';
    const hero = isFav ? el.favoritesHero : el.playerHero;
    const hTitle = isFav ? el.favoritesHeroSongTitle : el.heroSongTitle;
    const hArtist = isFav ? el.favoritesHeroSongArtist : el.heroSongArtist;
    const legacyImg = isFav ? el.favoritesCoverImage : el.coverImage;
    const safe = (coverUrl && coverUrl.trim()) ? coverUrl : 'https://via.placeholder.com/640x640?text=Sin+portada';
    hero && hero.style.setProperty('--cover-url', `url("${safe}")`);
    hTitle && (hTitle.textContent = title || 'Sin título');
    hArtist && (hArtist.textContent = artist || '');
    legacyImg && (legacyImg.src = safe);
  }

  // ===== Calidad (popover) =====
  if (el.qualityBtn){
    el.qualityBtn.addEventListener('click', (e)=>{ e.stopPropagation(); rebuildQualityPopover(); togglePopover(!el.qualityPopover.classList.contains('open')); });
    document.addEventListener('click', (e)=>{ if (!e.target.closest('.quality-popover') && !e.target.closest('#quality-btn')) togglePopover(false); });
    window.addEventListener('resize', ()=>{ if (el.qualityPopover.classList.contains('open')) positionPopover(); });
    document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') togglePopover(false); });
  }
  // compat: selector viejo
  if (el.formatSelector){ el.formatSelector.addEventListener('change', ()=> setFormat(el.formatSelector.value)); }

  function rebuildQualityPopover(){
    const pop = el.qualityPopover; if (!pop) return;
    pop.innerHTML='';
    const header = document.createElement('div');
    header.className='q-item'; header.style.fontWeight='700'; header.style.cursor='default';
    header.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Elegir calidad`;
    pop.appendChild(header);

    (availableFormats?.length ? availableFormats : ['mp3']).forEach(fmt=>{
      const item=document.createElement('div'); item.className='q-item';
      const isHQ = HQ_FORMATS.includes(fmt.toLowerCase());
      item.innerHTML = `
        <i class="fa-solid ${fmt==='mp3'?'fa-bolt':'fa-gem'}"></i>
        <span>${fmt.toUpperCase()}</span>
        ${isHQ ? '<span class="q-badge">HQ</span>' : ''}
        ${fmt===currentFormat ? '<i class="fa-solid fa-check" style="margin-left:auto"></i>' : ''}
      `;
      item.addEventListener('click', (e)=>{ e.stopPropagation(); setFormat(fmt); togglePopover(false); });
      pop.appendChild(item);
    });
    // Medir y centrar sin abrir visualmente
    positionPopover();
  }

  function positionPopover(){
    const pop = el.qualityPopover, btn=el.qualityBtn; if (!pop || !btn) return;
    const prevDisplay = pop.style.display;
    pop.style.display='block';
    const btnRect = btn.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    const vw = window.innerWidth, margin=12;
    let center = btnRect.left + (btnRect.width/2);
    const half = popRect.width/2;
    if (center - half < margin) center = margin + half;
    if (center + half > vw - margin) center = vw - margin - half;
    const top = btnRect.bottom + window.scrollY + 8;
    pop.style.top = `${top}px`;
    pop.style.left = `${center - half + window.scrollX}px`;
    pop.style.display = prevDisplay || '';
  }

  function togglePopover(open){
    if (!el.qualityPopover) return;
    el.qualityPopover.classList.toggle('open', !!open);
    const chev = el.qualityBtn?.querySelector('.chevron');
    if (chev) chev.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
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
    renderPlaylist();
    rebuildQualityPopover();
  }

  // ===== Bienvenida / arranque =====
  if (!sessionStorage.getItem('welcomeShown')){
    el.welcomeModal.style.display='flex';
    hide(el.searchModal, el.playerModal, el.favoritesModal);
    hide(el.floatingSearchButton, el.floatingPlayerButton, el.floatingFavoritesButton);
    toggleBodyScroll(true);
    setTimeout(()=>{
      el.welcomeModal.style.animation='fadeOut .5s forwards';
      setTimeout(()=>{
        el.welcomeModal.style.display='none';
        showSearchModal();
        currentQuery='juan_chota_dura';
        el.searchInput.value='';
        searchAlbums(currentQuery, 1, true);
        sessionStorage.setItem('welcomeShown','true');
      },500);
    },10000);
  }else{
    showSearchModal();
    currentQuery='juan_chota_dura';
    el.searchInput.value='';
    searchAlbums(currentQuery, 1, true);
  }

  // ===== Navegación =====
  function showSearchModal(){
    show(el.searchModal); hide(el.playerModal, el.favoritesModal, el.welcomeModal);
    el.floatingSearchButton.style.display='none';
    el.floatingPlayerButton.style.display = (isPlaying || isFavoritesPlaying) ? 'block' : 'none';
    el.floatingFavoritesButton.style.display='block';
    el.albumList.scrollTop = lastScrollPosition; toggleBodyScroll(true);
  }
  function showPlayerModal(){
    hide(el.searchModal, el.favoritesModal, el.welcomeModal); show(el.playerModal);
    el.floatingSearchButton.style.display='block'; el.floatingPlayerButton.style.display='none'; el.floatingFavoritesButton.style.display='block';
    toggleBodyScroll(true);
    // cerrar popover por si quedó abierto
    togglePopover(false);
  }
  function showFavoritesModal(){
    hide(el.searchModal, el.playerModal, el.welcomeModal); show(el.favoritesModal);
    el.floatingSearchButton.style.display='block';
    el.floatingPlayerButton.style.display = (isPlaying || isFavoritesPlaying) ? 'block' : 'none';
    el.floatingFavoritesButton.style.display='none';
    loadFavorites(); toggleBodyScroll(true);
  }
  function hide(...nodes){ nodes.forEach(n=> n && (n.style.display='none')); }
  function show(...nodes){ nodes.forEach(n=> n && (n.style.display='flex')); }

  el.floatingSearchButton.addEventListener('click', showSearchModal);
  el.floatingPlayerButton.addEventListener('click', showPlayerModal);
  el.floatingFavoritesButton.addEventListener('click', showFavoritesModal);

  // ===== Búsqueda mínima (sin autocorrect ahora) =====
  el.searchButton.addEventListener('click', submitSearch);
  el.searchInput.addEventListener('keypress', (e)=>{ if (e.key==='Enter') submitSearch(); });
  function submitSearch(){
    const q=el.searchInput.value.trim();
    if (!q){ el.errorMessage.textContent='Por favor, ingresa un término de búsqueda.'; el.errorMessage.style.display='block'; return; }
    el.suggestionsList.classList.remove('show');
    currentQuery=q; currentPage=1; searchAlbums(q,1,true);
  }

  function searchAlbums(query, page, clear){
    if (isLoading) return;
    isLoading=true; el.loading.style.display='block'; el.errorMessage.style.display='none';
    if (clear){ el.albumList.innerHTML=''; allAlbums=[]; el.resultsCount.textContent='Resultados: 0'; }

    const url=`https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:audio+AND+NOT+access-restricted-item:true&fl=identifier,title,creator&rows=5000&page=${page}&output=json`;

    fetch(url).then(r=> r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data=>{
        isLoading=false; el.loading.style.display='none';
        const docs=data.response?.docs||[];
        if (!docs.length && page===1){
          el.errorMessage.textContent='No se encontraron resultados. Probá con "Amar Azul" o "Queen Greatest Hits".';
          el.errorMessage.style.display='block';
          if (clear) displayAlbums(mockAlbums);
          return;
        }
        const albums = docs.map(d=>({
          id:d.identifier, title:d.title||'Sin título', artist:normalizeCreator(d.creator),
          image:`https://archive.org/services/img/${d.identifier}`, relevance:0
        }));
        allAlbums=allAlbums.concat(albums);
        el.resultsCount.textContent=`Resultados: ${allAlbums.length}`;
        displayAlbums(allAlbums);
      })
      .catch(err=>{
        isLoading=false; el.loading.style.display='none';
        if (clear){ el.errorMessage.textContent='Error. Mostrando datos de prueba.'; el.errorMessage.style.display='block'; displayAlbums(mockAlbums); }
      });
  }

  function displayAlbums(albums){
    el.albumList.innerHTML='';
    albums.forEach(a=>{
      const div=document.createElement('div');
      div.className='album-item';
      div.innerHTML=`
        <img src="${a.image}" alt="${a.title}" loading="lazy">
        <div class="album-item-info">
          <h3>${truncate(a.title, 35)}</h3>
          <p>${truncate(a.artist, 23)}</p>
        </div>`;
      div.addEventListener('click', ()=> openPlayer(a.id));
      el.albumList.appendChild(div);
    });
  }

  // ===== Player =====
  function openPlayer(albumId){
    lastScrollPosition = el.albumList.scrollTop;
    showPlayerModal();

    // Reset UI/estado
    el.playlistElement.innerHTML='<p>Cargando canciones...</p>';
    el.songTitle.textContent='Selecciona una canción'; el.songArtist.textContent='';
    el.coverImage.src=''; el.audioPlayer.src='';
    el.seekBar.value=0; el.currentTimeElement.textContent='0:00'; el.durationElement.textContent='0:00';
    playlistConfig=[]; originalPlaylist=[]; currentTrackIndex=0; isPlaying=false;
    availableFormats=['mp3']; currentFormat='mp3';
    el.btnPlay.classList.remove('playing'); el.btnPlay.setAttribute('aria-label','Reproducir');
    el.btnRepeat.classList.remove('active','repeat-one'); el.btnShuffle.classList.remove('active');
    repeatMode='none'; isShuffled=false; currentAlbumId=albumId;
    togglePopover(false); // <- IMPORTANT: no abrir el popover al iniciar

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

    fetch(`https://archive.org/metadata/${albumId}`)
      .then(r=> r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data=>{
        const coverUrl=`https://archive.org/services/img/${albumId}`;
        const artist=normalizeCreator(data.metadata?.creator || data.metadata?.artist || 'Desconocido');
        setHero('player', coverUrl, 'Selecciona una canción', artist);
        el.songArtist.textContent=artist;

        const files=(data.files||[]).filter(f=> f.name && /\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i.test(f.name));
        playlistConfig = files.reduce((arr,f)=>{
          const title = f.name.replace(/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i,'').replace(/_/g,' ');
          const fmt = f.name.match(/\.(\w+)$/i)[1].toLowerCase();
          const url = `https://archive.org/download/${albumId}/${encodeURIComponent(f.name).replace(/\+/g,'%20')}`;
          let t = arr.find(x=> x.title===title);
          if (!t){ t={ title, artist, coverUrl, urls:{}, format:currentFormat }; arr.push(t); }
          t.urls[fmt]=url; return arr;
        },[]);
        availableFormats=[...new Set(files.map(f=> f.name.match(/\.(\w+)$/i)[1].toLowerCase()))];

        if (!playlistConfig.length){ el.playlistElement.innerHTML='<p>No se encontraron canciones de audio</p>'; currentAlbumId=null; return; }
        originalPlaylist=[...playlistConfig];
        el.coverImage.src=coverUrl;

        rebuildQualityPopover();
        initPlayer();
      })
      .catch(err=>{
        el.playlistElement.innerHTML=`<p>Error al cargar: ${err.message}. Usando datos de prueba.</p>`;
        playlistConfig = mockTracks.map(t=>({...t}));
        originalPlaylist=[...playlistConfig];
        setHero('player', mockAlbums[0].image, 'Selecciona una canción', 'Queen');
        el.songArtist.textContent='Queen';
        currentAlbumId='queen_greatest_hits'; availableFormats=['mp3']; rebuildQualityPopover(); initPlayer();
      });
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
    const showHQ = HQ_FORMATS.includes((currentFormat||'').toLowerCase());

    playlistConfig.forEach((t,i)=>{
      const isFav = favorites.some(f=> f.urls && f.urls.mp3 === t.urls.mp3);
      const isActive = i===currentTrackIndex;
      const eq = (isActive && isPlaying) ? `<span class="eq" aria-hidden="true"><span></span><span></span><span></span></span>` : '';
      const hq = showHQ ? `<span class="hq-inline">HQ</span>` : '';

      const div=document.createElement('div');
      div.className=`playlist-item${isActive?' active':''}`;
      div.innerHTML=`
        <img src="${t.coverUrl}" alt="${t.title}" loading="lazy">
        <div class="playlist-item-info">
          <h3>${eq}${hq}${t.title}</h3>
          <p>${t.artist}</p>
        </div>
        <div class="playlist-item-actions">
          <button class="btn-favorite${isFav ? ' active' : ''}" aria-label="${isFav?'Quitar de favoritos':'Agregar a favoritos'}">
            <i class="${isFav?'fas fa-heart':'far fa-heart'}"></i>
          </button>
        </div>`;
      div.querySelector('.btn-favorite').addEventListener('click', ()=>{
        if (isFav) removeFromFavorites(t.urls.mp3); else addToFavorites(t);
      });
      div.addEventListener('click', (e)=>{
        if (!e.target.closest('.btn-favorite')){
          currentTrackIndex=i; loadTrack(currentTrackIndex);
          el.audioPlayer.play().then(()=>{
            isPlaying=true; el.btnPlay.classList.add('playing'); el.btnPlay.setAttribute('aria-label','Pausar');
            if (isFavoritesPlaying){ el.favoritesAudioPlayer.pause(); isFavoritesPlaying=false; el.favoritesBtnPlay.classList.remove('playing'); }
            el.floatingPlayerButton.style.display='none';
            renderPlaylist(); // para prender el ecualizador
          }).catch(()=>{});
        }
      });
      el.playlistElement.appendChild(div);
    });
  }

  function loadTrack(i){
    const t=playlistConfig[i]; if (!t) return;
    t.format=currentFormat;
    el.songTitle.textContent=t.title; el.songArtist.textContent=t.artist;
    setHero('player', t.coverUrl, t.title, t.artist);
    const url=t.urls[currentFormat]||t.urls.mp3;
    el.audioPlayer.src=url; el.btnDownload.setAttribute('href',url); el.btnDownload.setAttribute('download',`${t.title}.${currentFormat}`);
    el.seekBar.value=0; el.currentTimeElement.textContent='0:00'; el.durationElement.textContent='0:00';
    renderPlaylist();
  }

  // ===== Favoritos =====
  function addToFavorites(t){
    const fav=JSON.parse(localStorage.getItem('favorites')||'[]');
    if (!fav.some(f=> f.urls && f.urls.mp3 === t.urls.mp3)){ fav.unshift({...t, format:currentFormat}); localStorage.setItem('favorites', JSON.stringify(fav)); renderPlaylist(); if (el.favoritesModal.style.display==='flex') loadFavorites(); }
  }
  function removeFromFavorites(mp3){
    let fav=JSON.parse(localStorage.getItem('favorites')||'[]'); fav=fav.filter(f=> !(f.urls && f.urls.mp3===mp3));
    localStorage.setItem('favorites', JSON.stringify(fav)); favoritesPlaylist=fav; renderPlaylist(); if (el.favoritesModal.style.display==='flex') loadFavorites();
  }
  function loadFavorites(){
    favoritesPlaylist = JSON.parse(localStorage.getItem('favorites')||'[]').filter(f=> f && f.title && f.artist && f.urls && f.urls.mp3);
    originalFavoritesPlaylist=[...favoritesPlaylist];
    renderFavoritesPlaylist();
    if (favoritesPlaylist.length && !el.favoritesAudioPlayer.src) loadFavoritesTrack(currentFavoritesTrackIndex);
  }
  function renderFavoritesPlaylist(){
    el.favoritesPlaylistElement.innerHTML='';
    favoritesPlaylist.forEach((t,i)=>{
      const active = i===currentFavoritesTrackIndex;
      const div=document.createElement('div');
      div.className=`playlist-item${active?' active':''}`;
      div.innerHTML=`
        <img src="${t.coverUrl}" alt="${t.title}" loading="lazy">
        <div class="playlist-item-info">
          <h3>${t.title}</h3>
          <p>${t.artist}</p>
        </div>
        <div class="playlist-item-actions">
          <button class="btn-remove-favorite" aria-label="Quitar de favoritos"><i class="fas fa-times"></i></button>
        </div>`;
      div.querySelector('.btn-remove-favorite').addEventListener('click', ()=> removeFromFavorites(t.urls.mp3));
      div.addEventListener('click', (e)=>{
        if (!e.target.closest('.btn-remove-favorite')){
          currentFavoritesTrackIndex=i; loadFavoritesTrack(i);
          el.favoritesAudioPlayer.play().then(()=>{
            isFavoritesPlaying=true; el.favoritesBtnPlay.classList.add('playing'); el.favoritesBtnPlay.setAttribute('aria-label','Pausar');
            if (isPlaying){ el.audioPlayer.pause(); isPlaying=false; el.btnPlay.classList.remove('playing'); }
          }).catch(()=>{});
        }
      });
      el.favoritesPlaylistElement.appendChild(div);
    });
  }
  function loadFavoritesTrack(i){
    const t=favoritesPlaylist[i]; if(!t) return;
    el.favoritesSongTitle.textContent=t.title; el.favoritesSongArtist.textContent=t.artist;
    setHero('favorites', t.coverUrl, t.title, t.artist);
    const fmt=t.format||'mp3'; const url=t.urls[fmt]||t.urls.mp3;
    el.favoritesAudioPlayer.src=url; el.favoritesBtnDownload.setAttribute('href',url); el.favoritesBtnDownload.setAttribute('download',`${t.title}.${fmt}`);
    el.favoritesSeekBar.value=0; el.favoritesCurrentTime.textContent='0:00'; el.favoritesDuration.textContent='0:00';
    renderFavoritesPlaylist();
  }

  // ===== Controles =====
  el.btnPlay.addEventListener('click', ()=>{
    if (el.playerModal.style.display==='flex'){
      if (isPlaying){ el.audioPlayer.pause(); isPlaying=false; el.btnPlay.classList.remove('playing'); el.btnPlay.setAttribute('aria-label','Reproducir'); }
      else{
        el.audioPlayer.play().then(()=>{ isPlaying=true; el.btnPlay.classList.add('playing'); el.btnPlay.setAttribute('aria-label','Pausar'); if (isFavoritesPlaying){ el.favoritesAudioPlayer.pause(); isFavoritesPlaying=false; el.favoritesBtnPlay.classList.remove('playing'); } renderPlaylist(); }).catch(()=>{});
      }
    }else{
      if (isFavoritesPlaying){ el.favoritesAudioPlayer.pause(); isFavoritesPlaying=false; el.favoritesBtnPlay.classList.remove('playing'); }
      else{
        el.favoritesAudioPlayer.play().then(()=>{ isFavoritesPlaying=true; el.favoritesBtnPlay.classList.add('playing'); }).catch(()=>{});
      }
    }
  });
  el.btnNext.addEventListener('click', nextTrack);
  el.btnPrev.addEventListener('click', prevTrack);
  el.btnRepeat.addEventListener('click', ()=>{
    if (repeatMode==='none'){ repeatMode='all'; el.btnRepeat.classList.add('active'); }
    else if (repeatMode==='all'){ repeatMode='one'; el.btnRepeat.classList.add('repeat-one'); }
    else { repeatMode='none'; el.btnRepeat.classList.remove('active','repeat-one'); }
  });
  el.btnShuffle.addEventListener('click', ()=>{
    isShuffled=!isShuffled; el.btnShuffle.classList.toggle('active', isShuffled);
    if (isShuffled){ const cur=playlistConfig[currentTrackIndex]; playlistConfig=shuffle([...playlistConfig]); currentTrackIndex=playlistConfig.findIndex(t=> t.urls.mp3===cur.urls.mp3); }
    else { playlistConfig=[...originalPlaylist]; currentTrackIndex=Math.max(0, playlistConfig.findIndex(t=> (t.urls[currentFormat]||t.urls.mp3)===el.audioPlayer.src)); }
    renderPlaylist();
  });

  function nextTrack(){
    if (currentTrackIndex+1 < playlistConfig.length){ currentTrackIndex=(currentTrackIndex+1)%playlistConfig.length; loadTrack(currentTrackIndex); if (isPlaying) el.audioPlayer.play().catch(()=>{}); }
    else if (repeatMode==='all'){ currentTrackIndex=0; loadTrack(currentTrackIndex); if (isPlaying) el.audioPlayer.play().catch(()=>{}); }
  }
  function prevTrack(){
    currentTrackIndex=(currentTrackIndex-1+playlistConfig.length)%playlistConfig.length; loadTrack(currentTrackIndex); if (isPlaying) el.audioPlayer.play().catch(()=>{});
  }
  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a; }
});
