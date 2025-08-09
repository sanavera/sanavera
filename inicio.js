// inicio.js
(function(w){
  const S = w.Sanavera; const el = (S.el = S.el || {});
  document.addEventListener('DOMContentLoaded', ()=>{
    // Cache de elementos (IDs iguales a tu HTML)
    Object.assign(el, {
      welcomeModal: S.byId('welcome-modal'),
      searchModal: S.byId('search-modal'),
      playerModal: S.byId('player-modal'),
      favoritesModal: S.byId('favorites-modal'),
      // búsqueda
      searchInput: S.byId('search-input'),
      searchButton: S.byId('search-button'),
      albumList: S.byId('album-list'),
      resultsCount: S.byId('results-count'),
      loading: S.byId('loading'),
      errorMessage: S.byId('error-message'),
      // hero + legacy
      playerHero: S.byId('player-hero'),
      heroSongTitle: S.byId('hero-song-title'),
      heroSongArtist: S.byId('hero-song-artist'),
      coverImage: S.byId('cover-image'),
      songTitle: S.byId('song-title'),
      songArtist: S.byId('song-artist'),
      // listas
      playlist: S.byId('playlist'),
      favoritesPlaylist: S.byId('favorites-playlist'),
      // audio
      audio: S.byId('audio-player'),
      favAudio: S.byId('favorites-audio-player'),
      // controles player
      btnPlay: S.byId('btn-play'),
      btnPrev: S.byId('btn-prev'),
      btnNext: S.byId('btn-next'),
      btnRepeat: S.byId('btn-repeat'),
      btnShuffle: S.byId('btn-shuffle'),
      btnDownload: S.byId('btn-download'),
      seek: S.byId('seek-bar'),
      curTime: S.byId('current-time'),
      durTime: S.byId('duration'),
      // controles favoritos
      favBtnPlay: S.byId('favorites-btn-play'),
      favBtnPrev: S.byId('favorites-btn-prev'),
      favBtnNext: S.byId('favorites-btn-next'),
      favBtnRepeat: S.byId('favorites-btn-repeat'),
      favBtnShuffle: S.byId('favorites-btn-shuffle'),
      favBtnDownload: S.byId('favorites-btn-download'),
      favSeek: S.byId('favorites-seek-bar'),
      favCurTime: S.byId('favorites-current-time'),
      favDurTime: S.byId('favorites-duration'),
      // hero favoritos
      favoritesHero: S.byId('favorites-hero'),
      favoritesHeroSongTitle: S.byId('favorites-hero-song-title'),
      favoritesHeroSongArtist: S.byId('favorites-hero-song-artist'),
      favoritesCoverImage: S.byId('favorites-cover-image'),
      favoritesSongTitle: S.byId('favorites-song-title'),
      favoritesSongArtist: S.byId('favorites-song-artist'),
      // FABs
      fabSearch: S.byId('floating-search-button'),
      fabPlayer: S.byId('floating-player-button'),
      fabFav: S.byId('floating-favorites-button'),
      // calidad
      qualityBtn: S.byId('quality-btn'),
      qualityMenu: S.byId('quality-menu'),
      qualityBackdrop: S.byId('quality-backdrop'),
      qualityList: S.byId('quality-options')
    });

    // Chequeo de elementos
    const miss = Object.entries(el).filter(([,v])=>!v).map(([k])=>k);
    if(miss.length){
      console.error('Faltan elementos:', miss);
      document.body.insertAdjacentHTML('beforeend', `<p style="color:#f55;padding:8px">Error de plantilla: faltan elementos (${miss.join(', ')})</p>`);
      return;
    }

    // Limpia botones con <i>
    document.querySelectorAll('.btn,.btn-small,.btn-play,.btn-favorite,.btn-remove-favorite')
      .forEach(b=>{
        const icons=[...b.querySelectorAll('i')];
        if(icons.length){ b.innerHTML=''; icons.forEach(i=>b.appendChild(i)); }
      });

    // Wire de tiempo
    S.wireTime(el.audio, el.seek, el.curTime, el.durTime, 'player');
    S.wireTime(el.favAudio, el.favSeek, el.favCurTime, el.favDurTime, 'favorites');

    // FABs
    el.fabSearch.addEventListener('click', S.showSearch = showSearch);
    el.fabPlayer.addEventListener('click', S.showPlayer = showPlayer);
    el.fabFav.addEventListener('click', S.showFavorites = showFavorites);

    // Bienvenida + arranque
    if(!sessionStorage.getItem('welcomeShown')){
      el.welcomeModal.style.display='flex';
      el.searchModal.style.display='none';
      el.playerModal.style.display='none';
      el.favoritesModal.style.display='none';
      el.fabSearch.style.display='none';
      el.fabPlayer.style.display='none';
      el.fabFav.style.display='none';
      S.toggleBodyScroll(true);

      // barra visual puede animarse via CSS; a los 10s seguimos
      setTimeout(()=>{
        el.welcomeModal.style.animation='fadeOut .4s forwards';
        setTimeout(()=>{
          el.welcomeModal.style.display='none';
          showSearch();
          const st=S.state;
          st.currentQuery='juan_chota_dura';
          el.searchInput.value='';
          S.searchAlbums(st.currentQuery,1,true);
          sessionStorage.setItem('welcomeShown','true');
        },400);
      },10000);
    }else{
      showSearch();
      const st=S.state;
      st.currentQuery='juan_chota_dura';
      el.searchInput.value='';
      S.searchAlbums(st.currentQuery,1,true);
    }

    function showSearch(){
      el.searchModal.style.display='flex';
      el.playerModal.style.display='none';
      el.favoritesModal.style.display='none';
      el.welcomeModal.style.display='none';
      el.fabSearch.style.display='none';
      el.fabPlayer.style.display=(S.state.isPlaying||S.state.isFavPlaying)?'block':'none';
      el.fabFav.style.display='block';
      S.toggleBodyScroll(true);
    }
    function showPlayer(){
      el.searchModal.style.display='none';
      el.playerModal.style.display='flex';
      el.favoritesModal.style.display='none';
      el.fabSearch.style.display='block';
      el.fabPlayer.style.display='none';
      el.fabFav.style.display='block';
      // cerrar menú calidad si quedó abierto
      if(el.qualityMenu) el.qualityMenu.classList.remove('show');
      if(el.qualityBackdrop) el.qualityBackdrop.classList.remove('show');
      if(el.qualityBtn) el.qualityBtn.classList.remove('active');
    }
    function showFavorites(){
      el.searchModal.style.display='none';
      el.playerModal.style.display='none';
      el.favoritesModal.style.display='flex';
      el.fabSearch.style.display='block';
      el.fabPlayer.style.display=(S.state.isPlaying||S.state.isFavPlaying)?'block':'none';
      el.fabFav.style.display='none';
      S.loadFavorites();
      if(el.qualityMenu) el.qualityMenu.classList.remove('show');
      if(el.qualityBackdrop) el.qualityBackdrop.classList.remove('show');
      if(el.qualityBtn) el.qualityBtn.classList.remove('active');
    }
  });
})(window);
