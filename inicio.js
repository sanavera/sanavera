// --- inicio.js ---
import { setHero } from './utilidades.js';

document.addEventListener('DOMContentLoaded', () => {
  // mini bootstrap anim
  const bar = byId('boot-bar');
  let p = 0;
  const id = setInterval(()=>{ p = Math.min(100, p + 7); bar.style.width = p + '%'; }, 200);

  // arranque
  setTimeout(() => {
    clearInterval(id);
    byId('welcome-modal').style.display = 'none';
    byId('search-modal').style.display = 'flex';
    // arranque con búsqueda por defecto
    import('./buscador.js').then(m => m.bootstrapSearch('queen greatest hits'));
  }, 10000);

  // FABs
  byId('floating-search-button').onclick = () => {
    byId('search-modal').style.display = 'flex';
    byId('player-modal').style.display = 'none';
    byId('favorites-modal').style.display = 'none';
  };
  byId('floating-player-button').onclick = () => {
    byId('search-modal').style.display = 'none';
    byId('player-modal').style.display = 'flex';
    byId('favorites-modal').style.display = 'none';
  };
  byId('floating-favorites-button').onclick = () => {
    byId('search-modal').style.display = 'none';
    byId('player-modal').style.display = 'none';
    byId('favorites-modal').style.display = 'flex';
    import('./favoritos.js').then(m=>m.loadFavoritesUI());
  };

  // estados iniciales de hero
  setHero('player','', 'Selecciona una canción', '');
  setHero('favorites','', 'Selecciona una canción', '');
});
