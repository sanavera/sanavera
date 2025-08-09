// buscador.js — resultados de álbumes y wiring de búsqueda
(function(){
  const el = {
    searchModal: document.getElementById('search-modal'),
    searchInput: document.getElementById('search-input'),
    searchButton: document.getElementById('search-button'),
    albumList: document.getElementById('album-list'),
    resultsCount: document.getElementById('results-count'),
    loading: document.getElementById('loading'),
    errorMessage: document.getElementById('error-message')
  };

  const MOCK_ALBUMS = [
    { id:'queen_greatest_hits', title:'Queen - Greatest Hits', artist:'Queen', image:'https://archive.org/services/img/queen_greatest_hits', relevance:0 }
  ];

  let isLoading = false;
  let allAlbums = [];
  let currentQuery = '';
  let currentPage = 1;

  function normalizeCreator(c){ return Array.isArray(c)? c.join(', ') : (c||'Desconocido'); }
  function relevance(doc, q){
    const t=(doc.title||'').toLowerCase(), c=normalizeCreator(doc.creator).toLowerCase(), qq=q.toLowerCase();
    let r=0; if(t===qq) r+=300; else if(t.includes(qq)) r+=150; if(c.includes(qq)) r+=50; return r;
  }
  function truncate(t, n){ t=t||''; return t.length>n? (t.slice(0,n-1)+'…') : t; }

  function displayAlbums(albums){
    if(!albums || !albums.length){
      el.resultsCount.textContent='Resultados: 0';
      el.albumList.innerHTML='<p style="padding:12px">No se encontraron álbumes.</p>';
      return;
    }
    albums.sort((a,b)=>b.relevance-a.relevance);
    el.albumList.innerHTML='';
    const frag = document.createDocumentFragment();
    albums.forEach(a=>{
      const item = document.createElement('div');
      item.className='album-item';
      item.innerHTML = `
        <img src="${a.image}" alt="${a.title}" loading="lazy">
        <div class="album-item-info">
          <h3>${truncate(a.title, 60)}</h3>
          <p>${truncate(a.artist, 40)}</p>
        </div>
      `;
      item.addEventListener('click', ()=> {
        if (typeof window.openPlayer === 'function') {
          window.openPlayer(a.id);
        } else {
          console.warn('openPlayer no disponible aún');
        }
      });
      frag.appendChild(item);
    });
    el.albumList.appendChild(frag);
  }

  function searchAlbums(query, page=1, clearPrev=true){
    if(isLoading) return;
    isLoading = true;
    el.loading.style.display='block';
    el.errorMessage.style.display='none';
    if(clearPrev){ el.albumList.innerHTML=''; allAlbums=[]; el.resultsCount.textContent='Resultados: 0'; }

    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:audio+AND+NOT+access-restricted-item:true&fl=identifier,title,creator&rows=5000&page=${page}&output=json`;

    fetch(url,{headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'}})
      .then(r=>{ if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data=>{
        isLoading=false; el.loading.style.display='none';
        const docs = data.response?.docs||[];
        if(docs.length===0 && page===1){
          el.errorMessage.textContent='No se encontraron resultados. Probá con "Amar Azul" o "Queen Greatest Hits".';
          el.errorMessage.style.display='block';
          displayAlbums(MOCK_ALBUMS);
          return;
        }
        const albums = docs.map(d=>({
          id:d.identifier,
          title:d.title||'Sin título',
          artist:normalizeCreator(d.creator),
          image:`https://archive.org/services/img/${d.identifier}`,
          relevance:relevance(d, query)
        }));
        allAlbums = allAlbums.concat(albums);
        // Unicos por Título|Artista
        const unique = Array.from(new Map(allAlbums.map(a=>[`${a.title}|${a.artist}`, a])).values());
        el.resultsCount.textContent=`Resultados: ${unique.length}`;
        displayAlbums(unique);
      })
      .catch(err=>{
        isLoading=false; el.loading.style.display='none';
        console.error(err);
        if(allAlbums.length===0){
          el.errorMessage.textContent=`Error: ${err.message}. Mostrando datos de prueba.`;
          el.errorMessage.style.display='block';
          displayAlbums(MOCK_ALBUMS);
        }else{
          el.errorMessage.textContent=`Error: ${err.message}.`;
          el.errorMessage.style.display='block';
        }
      });
  }

  // Listeners
  if (el.searchButton) {
    el.searchButton.addEventListener('click', ()=>{
      const q = el.searchInput.value.trim();
      if(!q){
        el.errorMessage.textContent='Por favor, ingresa un término de búsqueda.';
        el.errorMessage.style.display='block';
        return;
      }
      currentQuery=q; currentPage=1; searchAlbums(q,1,true);
    });
  }
  if (el.searchInput) {
    el.searchInput.addEventListener('keypress', (e)=>{
      if(e.key==='Enter'){
        const q = el.searchInput.value.trim();
        if(!q){
          el.errorMessage.textContent='Por favor, ingresa un término de búsqueda.';
          el.errorMessage.style.display='block';
          return;
        }
        currentQuery=q; currentPage=1; searchAlbums(q,1,true);
      }
    });
  }

  // Exponemos la función para que inicio.js dispare la búsqueda inicial
  window.buscador = {
    buscar: (q)=> {
      currentQuery = q || '';
      searchAlbums(currentQuery || 'Queen Greatest Hits', 1, true);
    }
  };
})();
