// buscador.js
(function(w){
  const S = w.Sanavera; const el = S.el; const st = S.state;

  // Eventos de búsqueda
  document.addEventListener('DOMContentLoaded', ()=>{
    el.searchButton.addEventListener('click', onSearch);
    el.searchInput.addEventListener('keypress', e=>{
      if(e.key==='Enter') onSearch();
    });
  });

  function onSearch(){
    const q = el.searchInput.value.trim();
    if(!q){
      el.errorMessage.textContent='Por favor, ingresa un término de búsqueda.';
      el.errorMessage.style.display='block';
      return;
    }
    st.currentQuery=q; st.currentPage=1; S.searchAlbums(q,1,true);
  }

  function relevance(doc, q){
    const t=(doc.title||'').toLowerCase(), c=S.normalizeCreator(doc.creator).toLowerCase(), qq=q.toLowerCase();
    let r=0; if(t===qq) r+=300; else if(t.includes(qq)) r+=150; if(c.includes(qq)) r+=50; return r;
  }

  S.searchAlbums = function(query,page,clearPrev){
    if(st.isLoading) return;
    st.isLoading=true;
    el.loading.style.display='block';
    el.errorMessage.style.display='none';
    if(clearPrev){ el.albumList.innerHTML=''; st.allAlbums=[]; el.resultsCount.textContent='Resultados: 0'; }

    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:audio+AND+NOT+access-restricted-item:true&fl=identifier,title,creator&rows=5000&page=${page}&output=json`;

    fetch(url,{headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'}})
      .then(r=>{ if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data=>{
        st.isLoading=false; el.loading.style.display='none';
        const docs = data.response?.docs||[];
        if(docs.length===0 && page===1){
          el.errorMessage.textContent='No se encontraron resultados. Probá con "Amar Azul" o "Queen Greatest Hits".';
          el.errorMessage.style.display='block';
          S.displayAlbums(st.MOCK_ALBUMS);
          return;
        }
        const albums = docs.map(d=>({
          id:d.identifier,
          title:d.title||'Sin título',
          artist:S.normalizeCreator(d.creator),
          image:`https://archive.org/services/img/${d.identifier}`,
          relevance:relevance(d, query)
        }));
        st.allAlbums = st.allAlbums.concat(albums);
        const unique = Array.from(new Map(st.allAlbums.map(a=>[`${a.title}|${a.artist}`, a])).values());
        el.resultsCount.textContent=`Resultados: ${unique.length}`;
        S.displayAlbums(unique);
      })
      .catch(err=>{
        st.isLoading=false; el.loading.style.display='none';
        console.error(err);
        if(st.allAlbums.length===0){
          el.errorMessage.textContent=`Error: ${err.message}. Mostrando datos de prueba.`;
          el.errorMessage.style.display='block';
          S.displayAlbums(st.MOCK_ALBUMS);
        }else{
          el.errorMessage.textContent=`Error: ${err.message}.`;
          el.errorMessage.style.display='block';
        }
      });
  };

  S.displayAlbums = function(albums){
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
          <h3>${S.truncate(a.title, 60)}</h3>
          <p>${S.truncate(a.artist, 40)}</p>
        </div>
      `;
      item.addEventListener('click', ()=> S.openPlayer(a.id));
      frag.appendChild(item);
    });
    el.albumList.appendChild(frag);
  };

})(window);
