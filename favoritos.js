// =====================================
// Sanavera MP3 - favoritos.js
// Lógica de favoritos + reproductor de favoritos
// =====================================
(function(){
  const { SV } = window;
  const state = SV.state;

  const Favoritos = {};

  // Storage
  Favoritos.getAll = function getAll(){
    try{
      return JSON.parse(localStorage.getItem('favorites')||'[]')
        .filter(f=>f && f.title && f.artist && f.urls && f.urls.mp3);
    }catch(_){ return []; }
  };
  function setAll(list){ localStorage.setItem('favorites', JSON.stringify(list||[])); }

  Favoritos.add = function add(track){
    const favs = Favoritos.getAll();
    if(!favs.some(f=>f.urls && f.urls.mp3===track.urls.mp3)){
      favs.unshift(track);
      setAll(favs);
    }
  };
  Favoritos.remove = function remove(mp3Url){
    let favs = Favoritos.getAll();
    favs = favs.filter(f=>!(f.urls && f.urls.mp3===mp3Url));
    setAll(favs);
    state.favList = favs;
    if (SV.el.favoritesModal.style.display==='flex') Favoritos.loadAndRender();
  };

  Favoritos.loadAndRender = function loadAndRender(){
    state.favList = Favoritos.getAll();
    state.favOriginal = [...state.favList];
    if (state.favList.length === 0){
      SV.el.favoritesPlaylist.innerHTML = '<p style="padding:10px">No hay canciones en favoritos.</p>';
      SV.setHero('favorites','', 'Selecciona una canción', '');
      SV.el.favAudio.src = '';
      SV.el.favSeek.value = 0; SV.el.favCurTime.textContent='0:00'; SV.el.favDurTime.textContent='0:00';
      state.isFavPlaying=false; SV.el.favBtnPlay.classList.remove('playing'); SV.el.favBtnPlay.setAttribute('aria-label','Reproducir');
      return;
    }
    Favoritos.render();
    if (!SV.el.favAudio.src) Favoritos.loadTrack(state.favIdx);
  };

  Favoritos.render = function render(){
    const wrap = SV.el.favoritesPlaylist;
    wrap.innerHTML = '';
    state.favList.forEach((t,i)=>{
      const active = (i===state.favIdx);
      const isHQ = SV.qualityIsHQ(t.format||'');
      const row = document.createElement('div');
      row.className = `playlist-item${active?' active':''}`;
      row.innerHTML = `
        <img src="${t.coverUrl}" alt="${SV.escapeHtml(t.title)}" loading="lazy">
        <div class="playlist-item-info">
          <h3>
            ${active?`<span class="eq"><span></span><span></span><span></span></span>`:''}
            ${SV.escapeHtml(t.title)}
            ${isHQ?` <span class="hq-indicator">HQ</span>`:''}
          </h3>
          <p>${SV.escapeHtml(t.artist)}</p>
        </div>
        <div class="playlist-item-actions">
          <button class="btn-remove-favorite" aria-label="Quitar de favoritos"><i class="fas fa-times"></i></button>
        </div>
      `;
      row.querySelector('.btn-remove-favorite').addEventListener('click', (e)=>{
        e.stopPropagation();
        Favoritos.remove(t.urls.mp3);
        Favoritos.render();
      });
      row.addEventListener('click', ()=>{
        Favoritos.loadTrack(i);
        SV.el.favAudio.play().then(()=>{
          state.isFavPlaying = true;
          SV.el.favBtnPlay.classList.add('playing');
          SV.el.favBtnPlay.setAttribute('aria-label','Pausar');
          if (state.isPlaying){
            SV.el.audio.pause(); state.isPlaying=false; SV.el.btnPlay.classList.remove('playing'); SV.el.btnPlay.setAttribute('aria-label','Reproducir');
          }
          SV.el.fabPlayer.style.display='none';
        }).catch(console.error);
      });
      wrap.appendChild(row);
    });
  };

  Favoritos.loadTrack = function loadTrack(i){
    state.favIdx = i;
    const t = state.favList[state.favIdx];
    if (!t) return;
    const fmt = t.format || 'mp3';
    const url = t.urls[fmt] || t.urls.mp3;

    SV.el.favoritesSongTitle.textContent = t.title;
    SV.el.favoritesSongArtist.textContent = t.artist;
    SV.setHero('favorites', t.coverUrl, t.title, t.artist);

    SV.el.favAudio.src = url;
    SV.el.favBtnDownload.setAttribute('href', url);
    SV.el.favBtnDownload.setAttribute('download', `${t.title}.${fmt}`);

    SV.el.favSeek.value=0; SV.el.favCurTime.textContent='0:00'; SV.el.favDurTime.textContent='0:00';

    Favoritos.render();
  };

  // Controles favoritos
  function bindControls(){
    SV.el.favBtnPlay.addEventListener('click', ()=>{
      if (SV.el.favoritesModal.style.display!=='flex') return;
      if (state.isFavPlaying){
        SV.el.favAudio.pause(); state.isFavPlaying=false; SV.el.favBtnPlay.classList.remove('playing'); SV.el.favBtnPlay.setAttribute('aria-label','Reproducir');
      } else {
        SV.el.favAudio.play().then(()=>{
          state.isFavPlaying = true; SV.el.favBtnPlay.classList.add('playing'); SV.el.favBtnPlay.setAttribute('aria-label','Pausar');
          if (state.isPlaying){ SV.el.audio.pause(); state.isPlaying=false; SV.el.btnPlay.classList.remove('playing'); SV.el.btnPlay.setAttribute('aria-label','Reproducir'); }
          SV.el.fabPlayer.style.display='none';
        }).catch(console.error);
      }
      Favoritos.render();
    });

    SV.el.favBtnNext.addEventListener('click', ()=>{
      if (SV.el.favoritesModal.style.display!=='flex') return;
      if (state.favIdx + 1 < state.favList.length){
        state.favIdx = (state.favIdx + 1) % state.favList.length;
        Favoritos.loadTrack(state.favIdx);
        if (state.isFavPlaying) SV.el.favAudio.play().catch(console.error);
      } else if (state.repeatMode === 'all'){
        state.favIdx = 0;
        Favoritos.loadTrack(state.favIdx);
        if (state.isFavPlaying) SV.el.favAudio.play().catch(console.error);
      }
    });

    SV.el.favBtnPrev.addEventListener('click', ()=>{
      if (SV.el.favoritesModal.style.display!=='flex') return;
      state.favIdx = (state.favIdx - 1 + state.favList.length) % state.favList.length;
      Favoritos.loadTrack(state.favIdx);
      if (state.isFavPlaying) SV.el.favAudio.play().catch(console.error);
    });

    SV.el.favBtnRepeat.addEventListener('click', ()=>{
      if (state.repeatMode === 'none'){
        state.repeatMode = 'all';
        SV.el.favBtnRepeat.classList.add('active');
      } else if (state.repeatMode === 'all'){
        state.repeatMode = 'one';
        SV.el.favBtnRepeat.classList.add('repeat-one');
      } else {
        state.repeatMode = 'none';
        SV.el.favBtnRepeat.classList.remove('active','repeat-one');
      }
    });

    SV.el.favBtnShuffle.addEventListener('click', ()=>{
      if (SV.el.favoritesModal.style.display!=='flex') return;
      state.isShuffled = !state.isShuffled;
      SV.el.favBtnShuffle.classList.toggle('active', state.isShuffled);
      if (state.isShuffled){
        const cur = state.favList[state.favIdx];
        state.favList = SV.shuffle([...state.favList]);
        state.favIdx = state.favList.findIndex(t=>t.urls.mp3 === cur.urls.mp3);
      } else {
        state.favList = [...state.favOriginal];
        const curUrl = SV.el.favAudio.src;
        state.favIdx = Math.max(0, state.favList.findIndex(t => (t.urls[t.format||'mp3']) === curUrl));
      }
      Favoritos.render();
    });
  }

  // Expose
  window.Favoritos = Favoritos;
  window.addEventListener('DOMContentLoaded', bindControls);
})();
