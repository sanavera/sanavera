// reproductor.js
(function(w){
  const S = w.Sanavera; const el = S.el; const st = S.state;

  // Calidad (menú)
  function buildQualityMenu(){
    if(!el.qualityList) return;
    el.qualityList.innerHTML = '';
    const fmts = [...st.availableFormats];
    if(!fmts.includes('mp3')) fmts.unshift('mp3');
    const frag = document.createDocumentFragment();
    fmts.forEach(f=>{
      const li = document.createElement('button');
      li.className = 'quality-option';
      li.type = 'button';
      li.setAttribute('data-format', f);
      li.innerHTML = `
        <span>${f.toUpperCase()}</span>
        <div class="center">
          ${S.qualityIsHQ(f)?'<span class="badge-hq">HQ</span>':''}
          <i class="fa-solid fa-check check" style="${f===st.currentFormat?'opacity:1':'opacity:.2'}"></i>
        </div>
      `;
      li.addEventListener('click', ()=> selectQuality(f));
      frag.appendChild(li);
    });
    el.qualityList.appendChild(frag);
  }
  function openQualityMenu(){
    if(!el.qualityMenu) return;
    el.qualityBtn.classList.add('active');
    el.qualityBackdrop.classList.add('show');
    const rect = el.qualityBtn.getBoundingClientRect();
    const top = Math.min(window.innerHeight-180, rect.bottom + 10);
    el.qualityMenu.style.top = `${top + window.scrollY}px`;
    el.qualityMenu.classList.add('show');
  }
  function closeQualityMenu(){
    el.qualityBtn.classList.remove('active');
    el.qualityBackdrop.classList.remove('show');
    el.qualityMenu.classList.remove('show');
  }
  function selectQuality(fmt){
    st.currentFormat = fmt;
    if(el.playerModal.style.display==='flex'){
      const t = st.playlist[st.idx];
      if(t){
        const url = t.urls[st.currentFormat] || t.urls.mp3;
        el.audio.src = url;
        el.btnDownload.setAttribute('href', url);
        el.btnDownload.setAttribute('download', `${t.title}.${st.currentFormat}`);
        if(st.isPlaying) el.audio.play().catch(console.error);
      }
      renderPlaylist();
    }
    if(el.favoritesModal.style.display==='flex'){
      const t = st.favList[st.favIdx];
      if(t){
        const fmtX = t.format || st.currentFormat;
        const url = t.urls[fmtX] || t.urls.mp3;
        el.favAudio.src = url;
        el.favBtnDownload.setAttribute('href', url);
        el.favBtnDownload.setAttribute('download', `${t.title}.${fmtX}`);
        if(st.isFavPlaying) el.favAudio.play().catch(console.error);
      }
      S.renderFavorites();
    }
    buildQualityMenu();
    closeQualityMenu();
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    if(el.qualityBtn){
      el.qualityBtn.addEventListener('click', ()=>{
        if(!st.availableFormats || st.availableFormats.length===0) return;
        buildQualityMenu();
        if(el.qualityMenu.classList.contains('show')) closeQualityMenu(); else openQualityMenu();
      });
    }
    if(el.qualityBackdrop) el.qualityBackdrop.addEventListener('click', closeQualityMenu);

    // Controles player
    el.btnPlay.addEventListener('click', ()=>S.togglePlay('player'));
    el.btnNext.addEventListener('click', ()=>S.nextTrack('player'));
    el.btnPrev.addEventListener('click', ()=>S.prevTrack('player'));
    el.btnRepeat.addEventListener('click', ()=>S.toggleRepeat('player'));
    el.btnShuffle.addEventListener('click', ()=>S.toggleShuffle('player'));
  });

  // Apertura de álbum
  S.openPlayer = function(albumId){
    S.showPlayer();
    el.playlist.innerHTML='<p style="padding:10px;color:#b3b3b3">Cargando canciones…</p>';
    S.setHero('player','', 'Selecciona una canción', '');
    el.songTitle.textContent='Selecciona una canción';
    el.songArtist.textContent='';
    el.audio.src='';
    el.seek.value=0; el.curTime.textContent='0:00'; el.durTime.textContent='0:00';
    closeQualityMenu();

    // Estado
    st.playlist=[]; st.originalPlaylist=[]; st.idx=0; st.isPlaying=false;
    st.availableFormats=['mp3']; st.currentFormat='mp3';
    st.repeatMode='none'; st.isShuffled=false; st.currentAlbumId=albumId;
    el.btnPlay.classList.remove('playing'); el.btnPlay.setAttribute('aria-label','Reproducir');
    el.btnRepeat.classList.remove('active','repeat-one'); el.btnShuffle.classList.remove('active');

    if(albumId==='queen_greatest_hits'){
      const cover = st.MOCK_ALBUMS[0].image, artist='Queen';
      S.setHero('player', cover, 'Selecciona una canción', artist);
      st.playlist = st.MOCK_TRACKS.map(t=>({...t}));
      st.originalPlaylist=[...st.playlist];
      st.availableFormats=['mp3'];
      buildQualityMenu();
      renderPlaylist();
      loadTrack(0);
      return;
    }

    fetch(`https://archive.org/metadata/${albumId}`, {headers:{'User-Agent':'Mozilla/5.0'}})
      .then(r=>{ if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data=>{
        const coverUrl = `https://archive.org/services/img/${albumId}`;
        const artist = S.normalizeCreator(data.metadata?.creator || data.metadata?.artist || 'Desconocido');
        S.setHero('player', coverUrl, 'Selecciona una canción', artist);

        const files = (data.files||[]).filter(f=>/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i.test(f.name||''));
        const tracks = {};
        files.forEach(f=>{
          const raw = f.name;
          const title = S.extractSongTitle(raw);
          const fmt = (raw.match(/\.(\w+)$/i)||[])[1]?.toLowerCase() || 'mp3';
          const url = `https://archive.org/download/${albumId}/${encodeURIComponent(raw).replace(/\+/g,'%20')}`;
          if(!tracks[title]) tracks[title]={ title, artist, coverUrl, urls:{}, format: st.currentFormat };
          tracks[title].urls[fmt]=url;
        });
        st.playlist = Object.values(tracks);
        st.originalPlaylist=[...st.playlist];

        st.availableFormats = S.unique(files.map(f=>(f.name.match(/\.(\w+)$/i)||[])[1]?.toLowerCase()).filter(Boolean));
        if(!st.availableFormats.includes('mp3')) st.availableFormats.unshift('mp3');

        buildQualityMenu();
        renderPlaylist();
        if(st.playlist.length===0){
          el.playlist.innerHTML='<p style="padding:10px">No se encontraron canciones de audio</p>';
          return;
        }
        loadTrack(0);
      })
      .catch(err=>{
        console.error(err);
        el.playlist.innerHTML=`<p style="padding:10px;color:#b3b3b3">Error: ${err.message}. Usando datos de prueba.</p>`;
        const cover = st.MOCK_ALBUMS[0].image;
        S.setHero('player', cover, 'Selecciona una canción', 'Queen');
        st.playlist = st.MOCK_TRACKS.map(t=>({...t}));
        st.originalPlaylist=[...st.playlist];
        st.availableFormats=['mp3'];
        buildQualityMenu();
        loadTrack(0);
      });
  };

  function loadTrack(i){
    st.idx = i;
    const t = st.playlist[st.idx];
    if(!t) return;

    el.songTitle.textContent = t.title;
    el.songArtist.textContent = t.artist;
    S.setHero('player', t.coverUrl, t.title, t.artist);

    const url = t.urls[st.currentFormat] || t.urls.mp3;
    el.audio.src = url;
    el.btnDownload.setAttribute('href', url);
    el.btnDownload.setAttribute('download', `${t.title}.${st.currentFormat}`);

    el.seek.value=0; el.curTime.textContent='0:00'; el.durTime.textContent='0:00';
    renderPlaylist();
  }

  function renderPlaylist(){
    el.playlist.innerHTML='';
    const favs = S.getFavorites();
    const showHQ = S.qualityIsHQ(st.currentFormat);

    st.playlist.forEach((t, i)=>{
      const active = (i===st.idx);
      const isFav = favs.some(f=>f.urls && f.urls.mp3===t.urls.mp3);

      const row = document.createElement('div');
      row.className = `playlist-item${active?' active':''}`;
      row.innerHTML = `
        <img src="${t.coverUrl}" alt="${t.title}" loading="lazy">
        <div class="playlist-item-info">
          <h3>
            ${active?`<span class="eq"><span></span><span></span><span></span></span>`:''}
            ${showHQ?`<span class="hq-indicator">HQ</span> `:''}
            ${S.escapeHtml(t.title)}
          </h3>
          <p>${S.escapeHtml(t.artist)}</p>
        </div>
        <div class="playlist-item-actions">
          <button class="btn-favorite${isFav?' active':''}" aria-label="${isFav?'Quitar de favoritos':'Agregar a favoritos'}">
            <i class="${isFav?'fas fa-heart':'far fa-heart'}"></i>
          </button>
        </div>
      `;
      row.querySelector('.btn-favorite').addEventListener('click', (e)=>{
        e.stopPropagation();
        const nowFavs = S.getFavorites();
        if(nowFavs.some(f=>f.urls && f.urls.mp3===t.urls.mp3)){
          S.removeFromFavorites(t.urls.mp3);
        }else{
          S.addToFavorites({...t, format: st.currentFormat});
        }
        renderPlaylist();
        if(el.favoritesModal.style.display==='flex') S.loadFavorites();
      });
      row.addEventListener('click', ()=>{
        loadTrack(i);
        el.audio.play().then(()=>{
          st.isPlaying=true;
          el.btnPlay.classList.add('playing');
          el.btnPlay.setAttribute('aria-label','Pausar');
          if(st.isFavPlaying){ el.favAudio.pause(); st.isFavPlaying=false; el.favBtnPlay.classList.remove('playing'); el.favBtnPlay.setAttribute('aria-label','Reproducir'); }
          el.fabPlayer.style.display='none';
        }).catch(console.error);
      });

      el.playlist.appendChild(row);
    });
  }

  // Controles públicos que usan otros módulos
  S.togglePlay = function(scope){
    if(scope==='player' && el.playerModal.style.display==='flex'){
      if(st.isPlaying){
        el.audio.pause(); st.isPlaying=false; el.btnPlay.classList.remove('playing'); el.btnPlay.setAttribute('aria-label','Reproducir');
      }else{
        el.audio.play().then(()=>{
          st.isPlaying=true; el.btnPlay.classList.add('playing'); el.btnPlay.setAttribute('aria-label','Pausar');
          if(st.isFavPlaying){ el.favAudio.pause(); st.isFavPlaying=false; el.favBtnPlay.classList.remove('playing'); el.favBtnPlay.setAttribute('aria-label','Reproducir'); }
          el.fabPlayer.style.display='none';
        }).catch(console.error);
      }
      renderPlaylist();
    }else if(scope==='favorites' && el.favoritesModal.style.display==='flex'){
      if(st.isFavPlaying){
        el.favAudio.pause(); st.isFavPlaying=false; el.favBtnPlay.classList.remove('playing'); el.favBtnPlay.setAttribute('aria-label','Reproducir');
      }else{
        el.favAudio.play().then(()=>{
          st.isFavPlaying=true; el.favBtnPlay.classList.add('playing'); el.favBtnPlay.setAttribute('aria-label','Pausar');
          if(st.isPlaying){ el.audio.pause(); st.isPlaying=false; el.btnPlay.classList.remove('playing'); el.btnPlay.setAttribute('aria-label','Reproducir'); }
          el.fabPlayer.style.display='none';
        }).catch(console.error);
      }
      S.renderFavorites();
    }
  };

  S.nextTrack = function(scope){
    if(scope==='player' && el.playerModal.style.display==='flex'){
      if(st.idx+1<st.playlist.length){ st.idx=(st.idx+1)%st.playlist.length; loadTrack(st.idx); if(st.isPlaying) el.audio.play().catch(console.error); }
      else if(st.repeatMode==='all'){ st.idx=0; loadTrack(st.idx); if(st.isPlaying) el.audio.play().catch(console.error); }
    }else if(scope==='favorites' && el.favoritesModal.style.display==='flex'){
      if(st.favIdx+1<st.favList.length){ st.favIdx=(st.favIdx+1)%st.favList.length; S.loadFavoritesTrack(st.favIdx); if(st.isFavPlaying) el.favAudio.play().catch(console.error); }
      else if(st.repeatMode==='all'){ st.favIdx=0; S.loadFavoritesTrack(st.favIdx); if(st.isFavPlaying) el.favAudio.play().catch(console.error); }
    }
  };
  S.prevTrack = function(scope){
    if(scope==='player' && el.playerModal.style.display==='flex'){
      st.idx=(st.idx-1+st.playlist.length)%st.playlist.length; loadTrack(st.idx); if(st.isPlaying) el.audio.play().catch(console.error);
    }else if(scope==='favorites' && el.favoritesModal.style.display==='flex'){
      st.favIdx=(st.favIdx-1+st.favList.length)%st.favList.length; S.loadFavoritesTrack(st.favIdx); if(st.isFavPlaying) el.favAudio.play().catch(console.error);
    }
  };
  S.toggleRepeat = function(scope){
    if(st.repeatMode==='none'){
      st.repeatMode='all';
      if(scope==='player') el.btnRepeat.classList.add('active'); else el.favBtnRepeat.classList.add('active');
    }else if(st.repeatMode==='all'){
      st.repeatMode='one';
      if(scope==='player') el.btnRepeat.classList.add('repeat-one'); else el.favBtnRepeat.classList.add('repeat-one');
    }else{
      st.repeatMode='none';
      if(scope==='player') el.btnRepeat.classList.remove('active','repeat-one'); else el.favBtnRepeat.classList.remove('active','repeat-one');
    }
  };
  S.toggleShuffle = function(scope){
    if(scope==='player' && el.playerModal.style.display==='flex'){
      st.isShuffled=!st.isShuffled; el.btnShuffle.classList.toggle('active',st.isShuffled);
      if(st.isShuffled){
        const cur = st.playlist[st.idx];
        st.playlist = S.shuffle([...st.playlist]);
        st.idx = st.playlist.findIndex(t=>t.urls.mp3===cur.urls.mp3);
      }else{
        st.playlist=[...st.originalPlaylist];
        const curUrl = el.audio.src;
        st.idx = Math.max(0, st.playlist.findIndex(t=>(t.urls[st.currentFormat]||t.urls.mp3)===curUrl));
      }
      renderPlaylist();
    }else if(scope==='favorites' && el.favoritesModal.style.display==='flex'){
      st.isShuffled=!st.isShuffled; el.favBtnShuffle.classList.toggle('active',st.isShuffled);
      if(st.isShuffled){
        const cur = st.favList[st.favIdx];
        st.favList = S.shuffle([...st.favList]);
        st.favIdx = st.favList.findIndex(t=>t.urls.mp3===cur.urls.mp3);
      }else{
        st.favList=[...st.favOriginal];
        const curUrl = el.favAudio.src;
        st.favIdx = Math.max(0, st.favList.findIndex(t=>(t.urls[t.format||'mp3'])===curUrl));
      }
      S.renderFavorites();
    }
  };

})(window);
