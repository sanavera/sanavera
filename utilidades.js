// =====================================
// Sanavera MP3 - utilidades.js
// Helpers y namespaces globales
// =====================================
(function () {
  // Namespace global para compartir estado y elementos
  window.SV = window.SV || {};
  SV.el = {};            // cache de nodos (se setea en inicio.js)
  SV.state = {           // estado compartido simple
    HQ_FORMATS: ['wav', 'flac', 'aiff', 'alac'],
    currentFormat: 'mp3',
    availableFormats: ['mp3'],
    repeatMode: 'none',
    isShuffled: false,
    // Player principal
    playlist: [],
    originalPlaylist: [],
    idx: 0,
    isPlaying: false,
    currentAlbumId: null,
    // Favoritos
    favList: [],
    favOriginal: [],
    favIdx: 0,
    isFavPlaying: false,
    // Búsqueda
    isLoading: false,
    allAlbums: [],
    currentQuery: '',
    currentPage: 1
  };

  // ---------- Helpers básicos ----------
  SV.byId = function byId(id){ return document.getElementById(id); };

  SV.toggleBodyScroll = function toggleBodyScroll(lock){
    document.body.classList.toggle('modal-open', !!lock);
  };

  SV.fmtTime = function fmtTime(s){
    if (isNaN(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return `${m}:${ss < 10 ? '0' : ''}${ss}`;
  };

  SV.normalizeCreator = function normalizeCreator(c){
    return Array.isArray(c) ? c.join(', ') : (c || 'Desconocido');
  };

  SV.escapeHtml = function escapeHtml(s){
    return (s || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  };

  SV.unique = function unique(arr){ return [...new Set(arr)]; };

  SV.shuffle = function shuffle(a){
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  SV.qualityIsHQ = function qualityIsHQ(fmt){
    return SV.state.HQ_FORMATS.includes((fmt || '').toLowerCase());
  };

  // Limpieza agresiva de título
  SV.extractSongTitle = function extractSongTitle(fileName){
    try{
      let name = fileName.replace(/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i,'');
      name = name.replace(/^.*\//,'');
      name = name.replace(/_/g,' ').replace(/\s+/g,' ').trim();
      name = name.replace(/^[\[(]?\s*\d{1,2}\s*[\])\-.]\s*/,'');
      if (name.includes(' - ')){
        const parts = name.split(' - ').map(s=>s.trim()).filter(Boolean);
        if (parts.length > 1) name = parts[parts.length - 1];
      }
      name = name.replace(/\s*[\[(]?\b(19|20)\d{2}\b[\])]?$/,'').trim();
      return name || fileName;
    }catch(_){
      return fileName.replace(/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i,'').replace(/_/g,' ');
    }
  };

  // Cambia la “hero” (portada grande + títulos)
  SV.setHero = function setHero(scope, coverUrl, title, artist){
    const el = SV.el;
    const isFav = scope === 'favorites';
    const hero       = isFav ? el.favoritesHero : el.playerHero;
    const hTitle     = isFav ? el.favoritesHeroSongTitle : el.heroSongTitle;
    const hArtist    = isFav ? el.favoritesHeroSongArtist  : el.heroSongArtist;
    const legacyImg  = isFav ? el.favoritesCoverImage      : el.coverImage;

    const safe = (coverUrl && coverUrl.trim()) ? coverUrl : 'https://via.placeholder.com/800x800?text=Sin+portada';
    if (hero)   hero.style.setProperty('--cover-url', `url("${safe}")`);
    if (hTitle) hTitle.textContent  = title  || 'Selecciona una canción';
    if (hArtist)hArtist.textContent = artist || '';
    if (legacyImg) legacyImg.src = safe; // fallback/compat
  };
})();
