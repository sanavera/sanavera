// inicio.js — bienvenida + arranque + navegación base
(function(){
  const el = {
    welcomeModal: document.getElementById('welcome-modal'),
    searchModal: document.getElementById('search-modal'),
    playerModal: document.getElementById('player-modal'),
    favoritesModal: document.getElementById('favorites-modal'),
    fabSearch: document.getElementById('floating-search-button'),
    fabPlayer: document.getElementById('floating-player-button'),
    fabFav: document.getElementById('floating-favorites-button'),
    welcomeProgress: document.getElementById('welcome-progress')
  };

  function toggleBodyScroll(lock){ document.body.classList.toggle('modal-open', !!lock); }

  function showSearch(){
    el.searchModal.style.display='flex';
    el.playerModal.style.display='none';
    el.favoritesModal.style.display='none';
    el.welcomeModal.style.display='none';
    el.fabSearch.style.display='none';
    // no sabemos si hay reproducción viva, dejamos visibles según corresponda
    el.fabPlayer.style.display='block';
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
  }
  function showFavorites(){
    el.searchModal.style.display='none';
    el.playerModal.style.display='none';
    el.favoritesModal.style.display='flex';
    el.fabSearch.style.display='block';
    el.fabPlayer.style.display='block';
    el.fabFav.style.display='none';
    if (typeof window.loadFavorites === 'function') window.loadFavorites();
  }

  // FABs
  if (el.fabSearch) el.fabSearch.addEventListener('click', showSearch);
  if (el.fabPlayer) el.fabPlayer.addEventListener('click', showPlayer);
  if (el.fabFav) el.fabFav.addEventListener('click', showFavorites);

  // Bienvenida
  function startWelcome(){
    el.welcomeModal.style.display='flex';
    el.searchModal.style.display='none';
    el.playerModal.style.display='none';
    el.favoritesModal.style.display='none';
    el.fabSearch.style.display='none';
    el.fabPlayer.style.display='none';
    el.fabFav.style.display='none';
    toggleBodyScroll(true);

    // Forzamos la animación del progress
    if (el.welcomeProgress) {
      el.welcomeProgress.classList.remove('animate');
      void el.welcomeProgress.offsetWidth; // reflow
      el.welcomeProgress.classList.add('animate');
    }

    setTimeout(()=>{
      el.welcomeModal.style.animation='fadeOut .4s forwards';
      setTimeout(()=>{
        el.welcomeModal.style.display='none';
        showSearch();
        // Disparamos búsqueda inicial
        if (window.buscador && typeof window.buscador.buscar==='function') {
          window.buscador.buscar('Queen Greatest Hits');
        }
      }, 400);
    }, 10000);
  }

  // Primera carga
  if (!sessionStorage.getItem('welcomeShown')) {
    startWelcome();
    sessionStorage.setItem('welcomeShown','true');
  } else {
    showSearch();
    if (window.buscador && typeof window.buscador.buscar==='function') {
      window.buscador.buscar('Queen Greatest Hits');
    }
  }
})();
