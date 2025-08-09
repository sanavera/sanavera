// --- utilidades.js ---
window.$$ = (sel, root=document) => root.querySelector(sel);
window.$all = (sel, root=document) => [...root.querySelectorAll(sel)];
window.byId = id => document.getElementById(id);

export const fmtTime = s => {
  if (Number.isNaN(s) || s < 0) return '0:00';
  const m = Math.floor(s/60), ss = Math.floor(s%60);
  return `${m}:${ss<10?'0':''}${ss}`;
};
export const escapeHtml = s => (s||'').replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
export const normalizeCreator = c => Array.isArray(c) ? c.join(', ') : (c || 'Desconocido');
export const unique = arr => [...new Set(arr)];
export const HQ_FORMATS = ['wav','flac','aiff','alac'];
export const qualityIsHQ = f => HQ_FORMATS.includes((f||'').toLowerCase());

export const setHero = (scope, coverUrl, title, artist) => {
  const hero = byId(scope==='favorites' ? 'favorites-hero' : 'player-hero');
  const hTitle = byId(scope==='favorites' ? 'favorites-hero-song-title' : 'hero-song-title');
  const hArtist= byId(scope==='favorites' ? 'favorites-hero-song-artist': 'hero-song-artist');
  const safe = coverUrl && coverUrl.trim() ? coverUrl : 'https://via.placeholder.com/1200x1200?text=Sin+portada';
  hero.style.backgroundImage = `url("${safe}")`;
  hTitle.textContent = title || 'Selecciona una canción';
  hArtist.textContent = artist || '';
};

export const extractSongTitle = (fileName) => {
  try{
    let n = fileName.replace(/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i,'');
    n = n.replace(/^.*\//,'').replace(/_/g,' ').replace(/\s+/g,' ').trim();
    n = n.replace(/^[\[(]?\s*\d{1,2}\s*[\])\-.]\s*/,'');
    if(n.includes(' - ')){ const p=n.split(' - ').map(s=>s.trim()).filter(Boolean); if(p.length>1) n=p[p.length-1]; }
    n = n.replace(/\s*[\[(]?\b(19|20)\d{2}\b[\])]?$/,'').trim();
    return n || fileName;
  }catch{ return fileName.replace(/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i,'').replace(/_/g,' '); }
};

// storage favoritos
export const getFavorites = () => {
  try{ return JSON.parse(localStorage.getItem('favorites')||'[]').filter(f=>f && f.title && f.artist && f.urls && f.urls.mp3); }
  catch{ return []; }
};
export const setFavorites = (list) => localStorage.setItem('favorites', JSON.stringify(list||[]));
export const addToFavorites = (track) => {
  const favs = getFavorites();
  if (!favs.some(f=>f.urls && f.urls.mp3===track.urls.mp3)) { favs.unshift(track); setFavorites(favs); }
};
export const removeFromFavorites = (mp3Url) => {
  const favs = getFavorites().filter(f=>!(f.urls && f.urls.mp3===mp3Url));
  setFavorites(favs);
};
