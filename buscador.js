// =====================================
// Sanavera MP3 – buscador.js
// Nueva grilla de álbumes (2 por fila, estilo Spotify)
// =====================================
(function () {
  const els = {
    // contenedores del modal de búsqueda
    searchModal: document.getElementById('search-modal'),
    input:       document.getElementById('search-input'),
    btn:         document.getElementById('search-button'),
    list:        document.getElementById('album-list'),
    results:     document.getElementById('results-count'),
    loading:     document.getElementById('loading'),
    error:       document.getElementById('error-message')
  };

  // si falta algo, salgo sin romper el resto
  if (!els.list || !els.input || !els.btn) return;

  // estado
  let isLoading = false;
  let currentQuery = '';
  let currentPage  = 1;
  let allAlbums = [];

  // eventos
  els.btn.addEventListener('click', onSearch);
  els.input.addEventListener('keypress', (e)=>{ if(e.key==='Enter') onSearch(); });

  // búsqueda inicial mínima (si el inicio lo pide)
  if (!els.input.value && els.results && /Resultados: 0/.test(els.results.textContent||'')) {
    // no disparamos nada automático acá; inicio.js maneja el arranque
  }

  function onSearch(){
    const q = (els.input.value || '').trim();
    if(!q){
      showError('Por favor, ingresa un término de búsqueda.');
      return;
    }
    currentQuery = q;
    currentPage  = 1;
    searchAlbums(q, currentPage, true);
  }

  function searchAlbums(query, page, clear){
    if(isLoading) return;
    isLoading = true;
    showLoading(true);
    if (clear){
      allAlbums = [];
      els.list.innerHTML = '';
      if (els.results) els.results.textContent = 'Resultados: 0';
      hideError();
    }

    const url = `https://archive.org/advancedsearch.php?q=${
      encodeURIComponent(query)
    }+AND+mediatype:audio+AND+NOT+access-restricted-item:true&fl=identifier,title,creator,year,date&rows=5000&page=${
      page
    }&output=json`;

    fetch(url, { headers:{'Accept':'application/json'} })
      .then(r=>{ if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data=>{
        const docs = data?.response?.docs || [];
        if (docs.length===0 && page===1){
          showError('No se encontraron resultados. Probá con "Amar Azul" o "Queen Greatest Hits".');
          renderAlbums([]);
          isLoading=false; showLoading(false);
          return;
        }
        const batch = docs.map(d => mapDocToAlbum(d, query));
        allAlbums = dedupeByKey(allAlbums.concat(batch), a => `${a.title}|${a.artist}`);
        renderAlbums(allAlbums);
        isLoading=false; showLoading(false);
      })
      .catch(err=>{
        isLoading=false; showLoading(false);
        showError(`Error: ${err.message}`);
      });
  }

  function mapDocToAlbum(doc, query){
    const artist  = normalizeCreator(doc.creator);
    const title   = doc.title || 'Sin título';
    const image   = `https://archive.org/services/img/${doc.identifier}`;
    const year    = pickYear(doc.year, doc.date);
    const rel     = score(title, artist, query || '');
    return { id: doc.identifier, title, artist, image, year, relevance: rel };
  }

  function normalizeCreator(c){
    if (Array.isArray(c)) return c.join(', ');
    return c || 'Desconocido';
  }

  function pickYear(y, date){
    if (typeof y === 'string' && /^\d{4}$/.test(y)) return y;
    if (Array.isArray(y) && y.length && /^\d{4}$/.test(y[0])) return y[0];
    if (typeof date === 'string'){
      const m = date.match(/(19|20)\d{2}/);
      if (m) return m[0];
    }
    return '';
  }

  function score(title, artist, q){
    const t = (title||'').toLowerCase();
    const a = (artist||'').toLowerCase();
    const s = (q||'').toLowerCase();
    let r=0; if(t===s) r+=300; else if(t.includes(s)) r+=160; if(a.includes(s)) r+=50; return r;
  }

  function dedupeByKey(arr, keyFn){
    const m = new Map();
    arr.forEach(x => m.set(keyFn(x), x));
    return Array.from(m.values());
  }

  function renderAlbums(albums){
    // ordenamos por relevancia
    albums.sort((a,b)=> b.relevance - a.relevance);

    els.list.innerHTML = '';
    const frag = document.createDocumentFragment();

    albums.forEach(a=>{
      const card = document.createElement('div');
      card.className = 'album-card';
      card.innerHTML = `
        <div class="album-cover">
          <img src="${a.image}" alt="${escapeHtml(a.title)}" loading="lazy">
        </div>
        <div class="album-meta">
          <h3 class="album-title">${escapeHtml(a.title)}</h3>
          <div class="album-artist">${escapeHtml(a.artist)}</div>
          ${a.year ? `<div class="album-year">${a.year}</div>` : ``}
        </div>
      `;
      card.addEventListener('click', ()=> {
        if (typeof window.openPlayer === 'function') {
          window.openPlayer(a.id);
        } else {
          // fallback por si el módulo del reproductor todavía no está cargado
          console.warn('openPlayer no disponible');
        }
      });
      frag.appendChild(card);
    });

    els.list.appendChild(frag);
    if (els.results) els.results.textContent = `Resultados: ${albums.length}`;
  }

  // helpers UI
  function showLoading(v){ if(els.loading) els.loading.style.display = v ? 'block':'none'; }
  function showError(msg){ if(els.error){ els.error.textContent = msg; els.error.style.display='block'; } }
  function hideError(){ if(els.error) els.error.style.display='none'; }
  function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

  // Exponemos la búsqueda para otros módulos si hace falta
  window.searchAlbums = searchAlbums;

})();
