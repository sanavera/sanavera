// utilidades.js  — helpers y estado global compartido

// ---- Selección corta
export const byId = (id) => document.getElementById(id);
export const qs = (s, r = document) => r.querySelector(s);
export const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

// ---- Formatos / tiempo
export const fmtTime = (s) => {
  if (isNaN(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss < 10 ? '0' : ''}${ss}`;
};

export const isHQ = (fmt) => ['wav','flac','aiff','alac'].includes(String(fmt||'').toLowerCase());

// ---- Estado global (sobrevive entre modales)
export const state = {
  // búsqueda
  currentQuery: '',
  isSearching: false,

  // reproductor
  playlist: [],
  originalPlaylist: [],
  idx: 0,
  isPlaying: false,
  repeatMode: 'none',
  isShuffled: false,
  availableFormats: ['mp3'],
  currentFormat: 'mp3',
  currentAlbumId: null,

  // favoritos
  favList: [],
  favOriginal: [],
  favIdx: 0,
  isFavPlaying: false,

  // refs a audios (se cargan desde reproductor/favoritos)
  audio: null,
  favAudio: null
};

// ---- Pub/Sub súper simple (para avisos entre módulos)
const topics = {};
export const bus = {
  on(ev, fn){ (topics[ev] ||= []).push(fn); return () => bus.off(ev, fn); },
  off(ev, fn){ topics[ev] = (topics[ev]||[]).filter(f => f!==fn); },
  emit(ev, data){ (topics[ev]||[]).forEach(f => { try{ f(data); }catch(_){} }); }
};

// ---- Scroll lock para modales
export const lockScroll = (lock) => {
  document.body.classList.toggle('modal-open', !!lock);
};

// ---- Cerrar panel al tocar fuera
export function onOutsideClick(panelEl, backdropEl, closeFn){
  const handler = (e) => {
    const target = e.target;
    if (!panelEl.contains(target)) { closeFn(); }
  };
  const open = () => {
    backdropEl?.classList.add('show');
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, {passive:true});
  };
  const close = () => {
    backdropEl?.classList.remove('show');
    document.removeEventListener('mousedown', handler);
    document.removeEventListener('touchstart', handler);
  };
  return { open, close };
}

// ---- Debounce
export const debounce = (fn, delay=250) => {
  let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), delay); };
};

// ---- Logo (imagen o texto fallback)
export function setBrand({imgId='brand-logo', src, alt='Sanavera Mp3', textId='brand-text'} = {}){
  const img = byId(imgId);
  const txt = byId(textId);
  if (img && src) {
    img.src = src;
    img.alt = alt;
    img.style.display = 'block';
    if (txt) txt.style.display = 'none';
  } else if (txt) {
    txt.textContent = alt;
    txt.style.display = 'block';
    if (img) img.style.display = 'none';
  }
}

// ---- Bienvenida: barra + salida exacta a los N ms
export function runWelcomeProgress({barId='welcome-progress', durationMs=10000, onDone=()=>{}} = {}){
  const bar = byId(barId);
  if (!bar) { setTimeout(onDone, durationMs); return; }

  let start = performance.now();
  let rafId = 0;

  const tick = (now) => {
    const elapsed = Math.min(1, (now - start) / durationMs);
    bar.style.transform = `scaleX(${elapsed})`;
    if (elapsed < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafId);
      onDone();
    }
  };
  // estilos mínimos de seguridad (por si falta CSS)
  bar.style.transformOrigin = 'left center';
  bar.style.transform = 'scaleX(0)';
  rafId = requestAnimationFrame(tick);
}

// ---- LocalStorage favoritos
export function getFavorites(){
  try{
    return JSON.parse(localStorage.getItem('favorites')||'[]')
      .filter(f=>f && f.title && f.artist && f.urls && f.urls.mp3);
  }catch(_){ return []; }
}
export function setFavorites(list){ localStorage.setItem('favorites', JSON.stringify(list||[])); }
export function addFav(track){
  const favs = getFavorites();
  if (!favs.some(f=>f.urls && f.urls.mp3===track.urls.mp3)){
    favs.unshift(track); setFavorites(favs);
  }
  bus.emit('fav:changed');
}
export function removeFav(mp3Url){
  let favs = getFavorites().filter(f=>!(f.urls && f.urls.mp3===mp3Url));
  setFavorites(favs);
  bus.emit('fav:changed');
}

// ---- Utilidad común para formatear título de archivo → nombre de canción
export function extractSongTitle(fileName){
  try{
    let name = fileName.replace(/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i,'');
    name = name.replace(/^.*\//,'');
    name = name.replace(/_/g,' ').replace(/\s+/g,' ').trim();
    name = name.replace(/^[\[(]?\s*\d{1,2}\s*[\])\-.]\s*/,'');
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

export function normalizeCreator(c){ return Array.isArray(c)? c.join(', ') : (c||'Desconocido'); }

// ---- Pequeña ayuda para setear portada/títulos del hero
export function setHero({scope='player', coverUrl, title, artist}){
  const isFav = scope==='favorites';
  const hero = byId(isFav? 'favorites-hero' : 'player-hero');
  const hTitle = byId(isFav? 'favorites-hero-song-title' : 'hero-song-title');
  const hArtist= byId(isFav? 'favorites-hero-song-artist': 'hero-song-artist');
  const safe = coverUrl && coverUrl.trim()? coverUrl : 'https://via.placeholder.com/800x800?text=Sin+portada';
  if(hero) hero.style.setProperty('--cover-url', `url("${safe}")`);
  if(hTitle) hTitle.textContent = title || 'Selecciona una canción';
  if(hArtist) hArtist.textContent = artist || '';
}

// ---- Exponer por si alguna plantilla vieja lo necesita
window.utils = {
  byId, qs, qsa, fmtTime, isHQ,
  state, bus, lockScroll, onOutsideClick, debounce,
  setBrand, runWelcomeProgress,
  getFavorites, setFavorites, addFav, removeFav,
  extractSongTitle, normalizeCreator, setHero
};
