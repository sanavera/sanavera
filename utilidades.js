// utilidades.js  — CORE COMPARTIDO
(() => {
  // helper
  const byId = (id) => document.getElementById(id);

  // mapa único de elementos que usan los demás módulos
  const el = {
    // modales
    welcomeModal: byId('welcome-modal'),
    searchModal: byId('search-modal'),
    playerModal: byId('player-modal'),
    favoritesModal: byId('favorites-modal'),

    // buscador
    searchInput: byId('search-input'),
    searchButton: byId('search-button'),
    albumList: byId('album-list'),
    resultsCount: byId('results-count'),
    loading: byId('loading'),
    errorMessage: byId('error-message'),

    // hero player
    playerHero: byId('player-hero'),
    heroSongTitle: byId('hero-song-title'),
    heroSongArtist: byId('hero-song-artist'),
    coverImage: byId('cover-image'),          // legado (puede estar oculto)
    songTitle: byId('song-title'),
    songArtist: byId('song-artist'),

    // listas
    playlist: byId('playlist'),
    favoritesPlaylist: byId('favorites-playlist'),

    // audio
    audio: byId('audio-player'),
    favAudio: byId('favorites-audio-player'),

    // controles player
    btnPlay: byId('btn-play'),
    btnPrev: byId('btn-prev'),
    btnNext: byId('btn-next'),
    btnRepeat: byId('btn-repeat'),
    btnShuffle: byId('btn-shuffle'),
    btnDownload: byId('btn-download'),
    seek: byId('seek-bar'),
    curTime: byId('current-time'),
    durTime: byId('duration'),

    // controles favoritos
    favBtnPlay: byId('favorites-btn-play'),
    favBtnPrev: byId('favorites-btn-prev'),
    favBtnNext: byId('favorites-btn-next'),
    favBtnRepeat: byId('favorites-btn-repeat'),
    favBtnShuffle: byId('favorites-btn-shuffle'),
    favBtnDownload: byId('favorites-btn-download'),
    favSeek: byId('favorites-seek-bar'),
    favCurTime: byId('favorites-current-time'),
    favDurTime: byId('favorites-duration'),

    // hero favoritos
    favoritesHero: byId('favorites-hero'),
    favoritesHeroSongTitle: byId('favorites-hero-song-title'),
    favoritesHeroSongArtist: byId('favorites-hero-song-artist'),
    favoritesCoverImage: byId('favorites-cover-image'),
    favoritesSongTitle: byId('favorites-song-title'),
    favoritesSongArtist: byId('favorites-song-artist'),

    // FABs
    fabSearch: byId('floating-search-button'),
    fabPlayer: byId('floating-player-button'),
    fabFav: byId('floating-favorites-button'),

    // calidad
    qualityBtn: byId('quality-btn'),
    qualityMenu: byId('quality-menu'),
    qualityBackdrop: byId('quality-backdrop'),
    qualityList: byId('quality-options'),
  };

  // utilidades básicas que comparten módulos
  const toggleBodyScroll = (lock) =>
    document.body.classList.toggle('modal-open', !!lock);

  const fmtTime = (s) => {
    if (isNaN(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return `${m}:${ss < 10 ? '0' : ''}${ss}`;
  };

  // expongo en window ANTES de que carguen los demás .js
  window.S = { el, byId, toggleBodyScroll, fmtTime };

  // señal de listo por si algún módulo decide esperar
  document.addEventListener('DOMContentLoaded', () => {
    window.S.ready = true;
  });
})();
