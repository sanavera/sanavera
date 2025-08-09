// =====================================
// Sanavera MP3 - inicio.js
// Boot general, cache de elementos y navegación
// =====================================
(function(){
  const { SV } = window;
  const st = SV.state;

  document.addEventListener('DOMContentLoaded', () => {
    // ---------- Cache de elementos ----------
    SV.el = {
      // Modales
      welcomeModal: SV.byId('welcome-modal'),
      searchModal: SV.byId('search-modal'),
      playerModal: SV.byId('player-modal'),
      favoritesModal: SV.byId('favorites-modal'),

      // Header/búsqueda
      searchInput: SV.byId('search-input'),
      searchButton: SV.byId('search-button'),
      albumList: SV.byId('album-list'),
      resultsCount: SV.byId('results-count'),
      loading: SV.byId('loading'),
      errorMessage: SV.byId('error-message'),

      // Player hero + info (player)
      playerHero: SV.byId('player-hero'),
      heroSongTitle: SV.byId('hero-song-title'),
      heroSongArtist: SV.byId('hero-song-artist'),
      coverImage: SV.byId('cover-image'),
      songTitle: SV.byId('song-title'),
      songArtist: SV.byId('song-artist'),

      // Listas
      playlistEl: SV.byId('playlist'),
      favoritesPlaylist: SV.byId('favorites-playlist'),

      // Audios
      audio: SV.byId('audio-player'),
      favAudio: SV.byId('favorites-audio-player'),

      // Controles player
      btnPlay: SV.byId('btn-play'),
      btnPrev: SV.byId('btn-prev'),
      btnNext: SV.byId('btn-next'),
      btnRepeat: SV.byId('btn-repeat'),
      btnShuffle: SV.byId('btn-shuffle'),
      btnDownload: SV.byId('btn-download'),
      seek: SV.byId('seek-bar'),
      curTime: SV.byId('current-time'),
      durTime: SV.byId('duration'),

      // Controles favoritos
      favBtnPlay: SV.byId('favorites-btn-play'),
      favBtnPrev: SV.byId('favorites-btn-prev'),
      favBtnNext: SV.byId('favorites-btn-next'),
      favBtnRepeat: SV.byId('favorites-btn-repeat'),
      favBtnShuffle: SV.byId('favorites-btn-shuffle'),
      favBtnDownload: SV.byId('favorites-btn-download'),
      favSeek: SV.byId('favorites-seek-bar'),
      favCurTime: SV.byId('favorites-current-time'),
      favDurTime: SV.byId('favorites-duration'),

      // Hero favoritos
      favoritesHero: SV.byId('favorites-hero'),
      favoritesHeroSongTitle: SV.byId('favorites-hero-song-title'),
      favoritesHeroSongArtist: SV.byId('favorites-hero-song-artist'),
      favoritesCoverImage: SV.byId('favorites-cover-image'),
      favoritesSongTitle: SV.byId('favorites-song-title'),
      favoritesSongArtist: SV.byId('favorites-song-artist'),

      // FABs
      fabSearch: SV.byId('floating-search-button'),
      fabPlayer: SV.byId('floating-player-button'),
      fabFav: SV.byId('floating-favorites-button'),

      // Calidad (botón y menú)
      qualityBtn: SV.byId('quality-btn'),
      qualityMenu: SV.byId('quality-menu'),
      qualityBackdrop: SV.byId('quality-backdrop'),
      qualityList: SV.byId('quality-options')
    };

    // Validación mínima
    const miss = Object.entries(SV.el).filter(([,v]) => v == null).map(([k]) => k);
    if (miss.length) {
      console.error('Faltan elementos:', miss);
      document.body.insertAdjacentHTML('beforeend',
        `<p style="color:#f55;padding:8px">Error de plantilla: faltan elementos (${miss.join(', ')})</p>`);
      return;
    }

    // Limpia botones con <i>
    document.querySelectorAll('.btn,.btn-small,.btn-play,.btn-favorite,.btn-remove-favorite')
      .forEach(b=>{
        const icons=[...b.querySelectorAll('i')];
        if(icons.length){
          b.innerHTML='';
          icons.forEach(i=>b.appendChild(i));
        }
      });

    // Inicializar módulos
    Player.init();            // player + calidad
    // favoritos: bind de controles se hace en su módulo con DOMContentLoaded

    // ---------- Navegación (FABs y vistas) ----------
    SV.el.fabSearch.addEventListener('click', showSearch);
    SV.el.fabPlayer.addEventListener('click', showPlayer);
    SV.el.fabFav.addEventListener('click', showFavorites);

    function showSearch(){
      SV.el.searchModal.style.display='flex';
      SV.el.playerModal.style.display='none';
      SV.el.favoritesModal.style.display='none';
      SV.el.welcomeModal.style.display='none';
      SV.el.fabSearch.style.display='none';
      SV.el.fabPlayer.style.display=(st.isPlaying||st.isFavPlaying)?'block':'none';
      SV.el.fabFav.style.display='block';
      SV.toggleBodyScroll(true);
      closeQualityMenuIfOpen();
    }
    function showPlayer(){
      SV.el.searchModal.style.display='none';
      SV.el.playerModal.style.display='flex';
      SV.el.favoritesModal.style.display='none';
      SV.el.fabSearch.style.display='block';
      SV.el.fabPlayer.style.display='none';
      SV.el.fabFav.style.display='block';
      closeQualityMenuIfOpen();
    }
    function showFavorites(){
      SV.el.searchModal.style.display='none';
      SV.el.playerModal.style.display='none';
      SV.el.favoritesModal.style.display='flex';
      SV.el.fabSearch.style.display='block';
      SV.el.fabPlayer.style.display=(st.isPlaying||st.isFavPlaying)?'block':'none';
      SV.el.fabFav.style.display='none';
      Favoritos.loadAndRender();
      closeQualityMenuIfOpen();
    }
    function closeQualityMenuIfOpen(){
      const menu = SV.el.qualityMenu;
      if (menu && menu.classList.contains('show')){
        SV.el.qualityBackdrop.classList.remove('show');
        SV.el.qualityBtn.classList.remove('active');
        menu.classList.remove('show');
      }
    }

    // Exponer para otros módulos
    window.Inicio = { showSearch, showPlayer, showFavorites };

    // ---------- Bienvenida / arranque ----------
    if (!sessionStorage.getItem('welcomeShown')){
      SV.el.welcomeModal.style.display='flex';
      SV.el.searchModal.style.display='none';
      SV.el.playerModal.style.display='none';
      SV.el.favoritesModal.style.display='none';
      SV.el.fabSearch.style.display='none';
      SV.el.fabPlayer.style.display='none';
      SV.el.fabFav.style.display='none';
      SV.toggleBodyScroll(true);
      setTimeout(()=>{
        SV.el.welcomeModal.style.animation='fadeOut .4s forwards';
        setTimeout(()=>{
          SV.el.welcomeModal.style.display='none';
          showSearch();
          st.currentQuery = 'juan_chota_dura';
          SV.el.searchInput.value = '';
          Buscador.search(st.currentQuery, 1, true);
          sessionStorage.setItem('welcomeShown','true');
        }, 400);
      }, 10000);
    } else {
      showSearch();
      st.currentQuery = 'juan_chota_dura';
      SV.el.searchInput.value = '';
      Buscador.search(st.currentQuery, 1, true);
    }

    // ---------- Búsqueda ----------
    SV.el.searchButton.addEventListener('click', ()=>{
      const q = SV.el.searchInput.value.trim();
      if (!q){
        SV.el.errorMessage.textContent='Por favor, ingresa un término de búsqueda.';
        SV.el.errorMessage.style.display='block';
        return;
      }
      st.currentQuery = q; st.currentPage = 1;
      Buscador.search(q, 1, true);
    });
    SV.el.searchInput.addEventListener('keypress', (e)=>{
      if (e.key === 'Enter'){
        const q = SV.el.searchInput.value.trim();
        if (!q){
          SV.el.errorMessage.textContent='Por favor, ingresa un término de búsqueda.';
          SV.el.errorMessage.style.display='block';
          return;
        }
        st.currentQuery = q; st.currentPage = 1;
        Buscador.search(q, 1, true);
      }
    });

    console.log('Sanavera MP3 modular listo');
  });
})();
