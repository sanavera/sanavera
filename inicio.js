// inicio.js (hotfix pantalla negra)
(function(w){
  const S = w.Sanavera || (w.Sanavera = {});
  const el = (S.el = S.el || {});
  const st = (S.state = S.state || {});

  function mapElements(){
    Object.assign(el, {
      // Modales
      welcomeModal: S.byId && S.byId('welcome-modal'),
      searchModal: S.byId && S.byId('search-modal'),
      playerModal: S.byId && S.byId('player-modal'),
      favoritesModal: S.byId && S.byId('favorites-modal'),
      // Búsqueda
      searchInput: S.byId && S.byId('search-input'),
      searchButton: S.byId && S.byId('search-button'),
      albumList: S.byId && S.byId('album-list'),
      resultsCount: S.byId && S.byId('results-count'),
      loading: S.byId && S.byId('loading'),
      errorMessage: S.byId && S.byId('error-message'),
      // Hero + legacy
      playerHero: S.byId && S.byId('player-hero'),
      heroSongTitle: S.byId && S.byId('hero-song-title'),
      heroSongArtist: S.byId && S.byId('hero-song-artist'),
      coverImage: S.byId && S.byId('cover-image'),
      songTitle: S.byId && S.byId('song-title'),
      songArtist: S.byId && S.byId('song-artist'),
      // Listas
      playlist: S.byId && S.byId('playlist'),
      favoritesPlaylist: S.byId && S.byId('favorites-playlist'),
      // Audio
      audio: S.byId && S.byId('audio-player'),
      favAudio: S.byId && S.byId('favorites-audio-player'),
      // Controles player
      btnPlay: S.byId && S.byId('btn-play'),
      btnPrev: S.byId && S.byId('btn-prev'),
      btnNext: S.byId && S.byId('btn-next'),
      btnRepeat: S.byId && S.byId('btn-repeat'),
      btnShuffle: S.byId && S.byId('btn-shuffle'),
      btnDownload: S.byId && S.byId('btn-download'),
      seek: S.byId && S.byId('seek-bar'),
      curTime: S.byId && S.byId('current-time'),
      durTime: S.byId && S.byId('duration'),
      // Controles favoritos
      favBtnPlay: S.byId && S.byId('favorites-btn-play'),
      favBtnPrev: S.byId && S.byId('favorites-btn-prev'),
      favBtnNext: S.byId && S.byId('favorites-btn-next'),
      favBtnRepeat: S.byId && S.byId('favorites-btn-repeat'),
      favBtnShuffle: S.byId && S.byId('favorites-btn-shuffle'),
      favBtnDownload: S.byId && S.byId('favorites-btn-download'),
      favSeek: S.byId && S.byId('favorites-seek-bar'),
      favCurTime: S.byId && S.byId('favorites-current-time'),
      favDurTime: S.byId && S.byId('favorites-duration'),
      // Hero favoritos
      favoritesHero: S.byId && S.byId('favorites-hero'),
      favoritesHeroSongTitle: S.byId && S.byId('favorites-hero-song-title'),
      favoritesHeroSongArtist: S.byId && S.byId('favorites-hero-song-artist'),
      favoritesCoverImage: S.byId && S.byId('favorites-cover-image'),
      favoritesSongTitle: S.byId && S.byId('favorites-song-title'),
      favoritesSongArtist: S.byId && S.byId('favorites-song-artist'),
      // FABs
      fabSearch: S.byId && S.byId('floating-search-button'),
      fabPlayer: S.byId && S.byId('floating-player-button'),
      fabFav: S.byId && S.byId('floating-favorites-button'),
      // Calidad (por si no están, no bloqueamos)
      qualityBtn: S.byId && S.byId('quality-btn'),
      qualityMenu: S.byId && S.byId('quality-menu'),
      qualityBackdrop: S.byId && S.byId('quality-backdrop'),
      qualityList: S.byId && S.byId('quality-options')
    });
  }

  function safeShowSearch(){
    // Oculta todo y muestra buscador sí o sí
    if(el.welcomeModal) el.welcomeModal.style.display='none';
    if(el.playerModal) el.playerModal.style.display='none';
    if(el.favoritesModal) el.favoritesModal.style.display='none';
    if(el.searchModal) el.searchModal.style.display='flex';

    if(el.fabSearch) el.fabSearch.style.display='none';
    if(el.fabPlayer) el.fabPlayer.style.display=(st.isPlaying||st.isFavPlaying)?'block':'none';
    if(el.fabFav) el.fabFav.style.display='block';

    if(S.toggleBodyScroll) S.toggleBodyScroll(true);
  }

  function wireFABs(){
    if(el.fabSearch) el.fabSearch.onclick = ()=> safeShowSearch();
    if(el.fabPlayer) el.fabPlayer.onclick = ()=> {
      if(el.searchModal) el.searchModal.style.display='none';
      if(el.favoritesModal) el.favoritesModal.style.display='none';
      if(el.playerModal) el.playerModal.style.display='flex';
      if(el.fabSearch) el.fabSearch.style.display='block';
      if(el.fabPlayer) el.fabPlayer.style.display='none';
      if(el.fabFav) el.fabFav.style.display='block';
    };
    if(el.fabFav) el.fabFav.onclick = ()=> {
      if(el.searchModal) el.searchModal.style.display='none';
      if(el.playerModal) el.playerModal.style.display='none';
      if(el.favoritesModal) el.favoritesModal.style.display='flex';
      if(el.fabSearch) el.fabSearch.style.display='block';
      if(el.fabPlayer) el.fabPlayer.style.display=(st.isPlaying||st.isFavPlaying)?'block':'none';
      if(el.fabFav) el.fabFav.style.display='none';
      if(typeof S.loadFavorites==='function') S.loadFavorites();
    };
  }

  function cleanButtons(){
    try{
      document.querySelectorAll('.btn,.btn-small,.btn-play,.btn-favorite,.btn-remove-favorite')
        .forEach(b=>{
          const icons=[...b.querySelectorAll('i')];
          if(icons.length){ b.innerHTML=''; icons.forEach(i=>b.appendChild(i)); }
        });
    }catch(_){}
  }

  function startWelcomeOrSearch(){
    // Evitamos que una falta de un elemento rompa todo
    try{
      const firstTime = !sessionStorage.getItem('welcomeShown');
      if(firstTime && el.welcomeModal){
        el.welcomeModal.style.display='flex';
        if(el.searchModal) el.searchModal.style.display='none';
        if(el.playerModal) el.playerModal.style.display='none';
        if(el.favoritesModal) el.favoritesModal.style.display='none';
        if(el.fabSearch) el.fabSearch.style.display='none';
        if(el.fabPlayer) el.fabPlayer.style.display='none';
        if(el.fabFav) el.fabFav.style.display='none';
        if(S.toggleBodyScroll) S.toggleBodyScroll(true);

        // A los 10s pasamos al buscador
        setTimeout(()=>{
          if(el.welcomeModal){
            el.welcomeModal.style.animation='fadeOut .4s forwards';
            setTimeout(()=>{
              if(el.welcomeModal) el.welcomeModal.style.display='none';
              bootSearch();
              sessionStorage.setItem('welcomeShown','true');
            },400);
          }else{
            bootSearch();
          }
        },10000);
      }else{
        bootSearch();
      }
    }catch(e){
      console.error('Error en inicio:', e);
      // Pase lo que pase, mostramos buscador
      bootSearch();
    }
  }

  function bootSearch(){
    safeShowSearch();
    // Query inicial
    st.currentQuery = 'juan_chota_dura';
    if(el.searchInput) el.searchInput.value = '';
    // Dispara la búsqueda si existe la función (cargada por buscador.js)
    if(typeof S.searchAlbums==='function'){
      S.searchAlbums(st.currentQuery, 1, true);
    }else{
      // Si por orden de carga aún no está, reintenta al próximo tick
      setTimeout(()=>{
        if(typeof S.searchAlbums==='function'){
          S.searchAlbums(st.currentQuery, 1, true);
        }else{
          // Fallback: mostrar MOCKS para no dejar la pantalla vacía
          if(typeof S.displayAlbums==='function'){
            S.displayAlbums(st.MOCK_ALBUMS || []);
          }
        }
      }, 0);
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    mapElements();
    cleanButtons();
    wireFABs();

    // Cableado de tiempo por si estaba faltando
    if(S.wireTime){
      if(el.audio && el.seek && el.curTime && el.durTime){
        S.wireTime(el.audio, el.seek, el.curTime, el.durTime, 'player');
      }
      if(el.favAudio && el.favSeek && el.favCurTime && el.favDurTime){
        S.wireTime(el.favAudio, el.favSeek, el.favCurTime, el.favDurTime, 'favorites');
      }
    }

    // Arranque
    startWelcomeOrSearch();
  });

})(window);
