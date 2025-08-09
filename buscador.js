// --- buscador.js ---
import { normalizeCreator } from './utilidades.js';
import { openPlayer } from './reproductor.js';

let allAlbums = [];

export function bootstrapSearch(seed){
  byId('search-input').value = seed || '';
  doSearch(seed || '');
}

byId('search-button').addEventListener('click', () => {
  doSearch(byId('search-input').value.trim());
});
byId('search-input').addEventListener('keypress', (e)=>{
  if(e.key==='Enter') doSearch(byId('search-input').value.trim());
});

function doSearch(query){
  const list = byId('album-list');
  const msg = byId('error-message');
  const load = byId('loading');
  const count = byId('results-count');

  if(!query){ msg.textContent='Por favor, ingresa un término de búsqueda.'; msg.style.display='block'; return; }

  msg.style.display='none'; list.innerHTML=''; load.style.display='block'; count.textContent='Resultados: 0';
  fetch(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:audio+AND+NOT+access-restricted-item:true&fl=identifier,title,creator&rows=5000&page=1&output=json`)
    .then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
    .then(data=>{
      load.style.display='none';
      const docs = data.response?.docs||[];
      allAlbums = docs.map(d=>({
        id:d.identifier,
        title:d.title||'Sin título',
        artist:normalizeCreator(d.creator),
        image:`https://archive.org/services/img/${d.identifier}`
      }));
      renderAlbums(allAlbums);
      count.textContent = `Resultados: ${allAlbums.length}`;
    })
    .catch(err=>{
      load.style.display='none';
      msg.textContent='Error al buscar: '+err.message;
      msg.style.display='block';
    });
}

function renderAlbums(albums){
  const list = byId('album-list');
  list.innerHTML='';
  const frag = document.createDocumentFragment();
  albums.forEach(a=>{
    const item = document.createElement('div');
    item.className='album-item';
    item.innerHTML = `
      <img src="${a.image}" alt="${a.title}" loading="lazy">
      <div class="album-item-info">
        <h3>${a.title}</h3>
        <p>${a.artist}</p>
      </div>`;
    item.addEventListener('click', ()=> openPlayer(a.id));
    frag.appendChild(item);
  });
  list.appendChild(frag);
}
