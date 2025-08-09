// =====================================
// Sanavera MP3 - buscador.js
// Búsqueda y rendering de álbumes
// =====================================
(function(){
  const { SV } = window;
  const state = SV.state;

  const MOCK_ALBUMS = [
    { id:'queen_greatest_hits', title:'Queen - Greatest Hits', artist:'Queen', image:'https://indiehoy.com/wp-content/uploads/2022/05/queen-queen-ii.jpg', relevance:0 }
  ];

  const Buscador = {};

  function truncate(t, n){ return (t||'').length>n ? (t.slice(0,n-1)+'…') : (t||''); }

  function relevance(doc, q){
    const t=(doc.title||'').toLowerCase();
    const c=SV.normalizeCreator(doc.creator).toLowerCase();
    const qq=q.toLowerCase();
    let r=0;
    if (t===qq) r+=300;
    else if (t.includes(qq)) r+=150;
    if (c.includes(qq)) r+=50;
    return r;
  }

  Buscador.search = function searchAlbums(query,page,clearPrev){
    if (state.isLoading) return;
    state.isLoading = true;

    SV.el.loading.style.display = 'block';
    SV.el.errorMessage.style.display = 'none';
    if (clearPrev){
      SV.el.albumList.innerHTML = '';
      state.allAlbums = [];
      SV.el.resultsCount.textContent = 'Resultados: 0';
    }

    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:audio+AND+NOT+access-restricted-item:true&fl=identifier,title,creator&rows=5000&page=${page}&output=json`;

    fetch(url,{headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'}})
      .then(r=>{ if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data=>{
        state.isLoading = false;
        SV.el.loading.style.display = 'none';
        const docs = data.response?.docs || [];
        if (docs.length === 0 && page === 1){
          SV.el.errorMessage.textContent='No se encontraron resultados. Probá con "Amar Azul" o "Queen Greatest Hits".';
          SV.el.errorMessage.style.display='block';
          Buscador.display(MOCK_ALBUMS);
          return;
        }
        const albums = docs.map(d=>({
          id: d.identifier,
          title: d.title || 'Sin título',
          artist: SV.normalizeCreator(d.creator),
          image: `https://archive.org/services/img/${d.identifier}`,
          relevance: relevance(d, query)
        }));
        state.allAlbums = state.allAlbums.concat(albums);
        const unique = Array.from(new Map(state.allAlbums.map(a=>[`${a.title}|${a.artist}`, a])).values());
        SV.el.resultsCount.textContent = `Resultados: ${unique.length}`;
        Buscador.display(unique);
      })
      .catch(err=>{
        state.isLoading=false;
        SV.el.loading.style.display='none';
        console.error(err);
        if (state.allAlbums.length===0){
          SV.el.errorMessage.textContent=`Error: ${err.message}. Mostrando datos de prueba.`;
          SV.el.errorMessage.style.display='block';
          Buscador.display(MOCK_ALBUMS);
        }else{
          SV.el.errorMessage.textContent=`Error: ${err.message}.`;
          SV.el.errorMessage.style.display='block';
        }
      });
  };

  Buscador.display = function displayAlbums(albums){
    const list = SV.el.albumList;
    if (!albums || !albums.length){
      SV.el.resultsCount.textContent='Resultados: 0';
      list.innerHTML = '<p style="padding:12px">No se encontraron álbumes.</p>';
      return;
    }
    albums.sort((a,b)=>b.relevance-a.relevance);
    list.innerHTML = '';
    const frag = document.createDocumentFragment();
    albums.forEach(a=>{
      const item = document.createElement('div');
      item.className = 'album-item';
      item.innerHTML = `
        <img src="${a.image}" alt="${SV.escapeHtml(a.title)}" loading="lazy">
        <div class="album-item-info">
          <h3>${SV.escapeHtml(truncate(a.title, 60))}</h3>
          <p>${SV.escapeHtml(truncate(a.artist, 40))}</p>
        </div>
      `;
      item.addEventListener('click', ()=> Player.open(a.id));
      frag.appendChild(item);
    });
    list.appendChild(frag);
  };

  // Expose
  window.Buscador = Buscador;
})();
