// favoritos.js
(function(w){
  const S = w.Sanavera; const el = S.el; const st = S.state;

  // Storage helpers
  S.getFavorites = function(){
    try{
      return JSON.parse(localStorage.getItem('favorites')||'[]')
        .filter(f=>f && f.title && f.artist && f.urls && f.urls.mp3);
    }catch(_){ return []; }
  };
  S.setFavorites = list => localStorage.setItem('favorites', JSON.stringify(list||[]));
  S.addToFavorites = track => {
    const favs = S.getFavorites();
    if(!favs.some(f=>f.urls && f.urls.mp3===track.urls.mp3)){
      favs.unshift(track); S.setFavorites(favs);
    }
  };
  S.removeFromFavorites = mp3Url => {
    let favs = S.getFavorites();
    favs = favs.filter(f=>!(f.urls && f.urls.mp3===mp3Url));
    S.setFavorites(favs);
    st.favList = favs;
    if(el.favoritesModal.style.display==='flex') S.loadFavorites();
  };

  // Render
  S.loadFavorites = function(){
    st.favList = S.getFavorites();
    st.favOriginal=[...st.favList];
    if(st.favList.length===0){
      el.favoritesPlaylist.innerHTML='<p style="padding:10px">No hay canciones en favoritos.</p>';
      S.setHero('favorites','', 'Selecciona una canción', '');
      el.favAudio.src='';
      el.favSeek.value=0; el.favCurTime.textContent='0:00'; el.favDurTime.textContent='0:00';
      st.isFavPlaying=false; el.favBtnPlay.classList.remove('playing'); el.favBtnPlay.setAttribute('aria-label','Reproducir');
      return;
    }
    S.renderFavorites();
    if(!el.favAudio.src) S.loadFavoritesTrack(st.favIdx);
  };

  S.renderFavorites = function(){
    el.favoritesPlaylist.innerHTML='';
    st.favList.forEach((t,i)=>{
      const active = (i===st.favIdx);
      const isHQ = S.qualityIsHQ(t.format||'');
      const row = document.createElement('div');
      row.className = `playlist-item${active?' active':''}`;
      row.innerHTML = `
        <img src="${t.coverUrl}" alt="${t.title}" loading="lazy">
        <div class="playlist-item-info">
          <h3>
            ${active?`<span class="eq"><span></span><span></span><span></span></span>`:''}
            ${isHQ?`<span class="hq-indicator">HQ</span> `:''}
            ${S.escapeHtml(t.title)}
          </h3>
          <p>${S.escapeHtml(t.artist)}</p>
        </div>
        <div class="playlist-item-actions">
          <button class="btn-remove-favorite" aria-label="Quitar de favoritos"><i class="fas fa-times"></i></button>
        </div>
      `;
      row.querySelector('.btn-remove-favorite').addEventListener('click', (e)=>{
        e.stopPropagation();
        S.removeFromFavorites(t.urls.mp3);
        S.renderFavorites();
      });
      row.addEventListener('click', ()=>{
        S.loadFavoritesTrack(i);
        el.favAudio.play().then(()=>{
          st.isFavPlaying=true;
          el.favBtnPlay.classList.add('playing');
          el.favBtnPlay.setAttribute('aria-label','Pausar');
          if(st.isPlaying){ el.audio.pause(); st.isPlaying=false; el.btnPlay.classList.remove('playing'); el.btnPlay.setAttribute('aria-label','Reproducir'); }
          el.fabPlayer.style.display='none';
        }).catch(console.error);
      });
      el.favoritesPlaylist.appendChild(row);
    });
  };

  S.loadFavoritesTrack = function(i){
    st.favIdx=i;
    const t=st.favList[st.favIdx];
    if(!t) return;
    const fmt = t.format || 'mp3';
    const url = t.urls[fmt] || t.urls.mp3;

    el.favoritesSongTitle.textContent = t.title;
    el.favoritesSongArtist.textContent = t.artist;
    S.setHero('favorites', t.coverUrl, t.title, t.artist);

    el.favAudio.src = url;
    el.favBtnDownload.setAttribute('href', url);
    el.favBtnDownload.setAttribute('download', `${t.title}.${fmt}`);

    el.favSeek.value=0; el.favCurTime.textContent='0:00'; el.favDurTime.textContent='0:00';

    S.renderFavorites();
  };

  // Controles favoritos
  document.addEventListener('DOMContentLoaded', ()=>{
    el.favBtnPlay.addEventListener('click', ()=>S.togglePlay('favorites'));
    el.favBtnNext.addEventListener('click', ()=>S.nextTrack('favorites'));
    el.favBtnPrev.addEventListener('click', ()=>S.prevTrack('favorites'));
    el.favBtnRepeat.addEventListener('click', ()=>S.toggleRepeat('favorites'));
    el.favBtnShuffle.addEventListener('click', ()=>S.toggleShuffle('favorites'));
  });

})(window);
