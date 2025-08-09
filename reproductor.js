// =====================================
// Sanavera MP3 - reproductor.js
// Player principal + calidad + rendering
// =====================================
(function(){
  const { SV } = window;
  const state = SV.state;

  // Exponer API del reproductor
  const Player = {};

  // Mocks para fallback
  const MOCK_ALBUMS = [
    { id:'queen_greatest_hits', title:'Queen - Greatest Hits', artist:'Queen', image:'https://indiehoy.com/wp-content/uploads/2022/05/queen-queen-ii.jpg', relevance:0 }
  ];
  const MOCK_TRACKS = [
    { title:'Bohemian Rhapsody', artist:'Queen', urls:{ mp3:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }, coverUrl:MOCK_ALBUMS[0].image, format:'mp3' },
    { title:'Another One Bites the Dust', artist:'Queen', urls:{ mp3:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' }, coverUrl:MOCK_ALBUMS[0].image, format:'mp3' }
  ];

  // ---------- Time wiring ----------
  function wireTime(player, seek, cur, dur, scope){
    player.addEventListener('loadedmetadata', ()=>{
      dur.textContent = SV.fmtTime(player.duration);
      seek.value = 0;
    });
    player.addEventListener('timeupdate', ()=>{
      if(!isNaN(player.duration) && player.duration>0){
        cur.textContent = SV.fmtTime(player.currentTime);
        seek.value = (player.currentTime/player.duration)*100;
      }
    });
    player.addEventListener('ended', ()=>{
      if(state.repeatMode==='one'){
        player.currentTime = 0; player.play().catch(console.error);
      }else{
        Player.next(scope);
      }
    });
    seek.addEventListener('input', ()=>{
      if(!isNaN(player.duration) && player.duration>0){
        const t = (player.duration*seek.value)/100;
        player.currentTime = t; cur.textContent = SV.fmtTime(t);
      }
    });
  }

  // ---------- Calidad (menú flotante) ----------
  function buildQualityMenu(){
    const { qualityList } = SV.el;
    if(!qualityList) return;
    qualityList.innerHTML = '';
    const fmts = [...state.availableFormats];
    if(!fmts.includes('mp3')) fmts.unshift('mp3');
    const frag = document.createDocumentFragment();
    fmts.forEach(f=>{
      const btn = document.createElement('button');
      btn.className = 'quality-option';
      btn.type = 'button';
      btn.setAttribute('data-format', f);
      btn.innerHTML = `
        <span>${f.toUpperCase()}</span>
        <div class="center">
          ${SV.qualityIsHQ(f)?'<span class="badge-hq">HQ</span>':''}
          <i class="fa-solid fa-check check" style="${f===state.currentFormat?'opacity:1':'opacity:.2'}"></i>
        </div>
      `;
      btn.addEventListener('click', ()=> selectQuality(f));
      frag.appendChild(btn);
    });
    qualityList.appendChild(frag);
  }
  function openQualityMenu(){
    const { qualityBtn, qualityMenu, qualityBackdrop } = SV.el;
    if(!qualityMenu) return;
    qualityBtn.classList.add('active');
    qualityBackdrop.classList.add('show');
    const rect = qualityBtn.getBoundingClientRect();
    const top = Math.min(window.innerHeight-180, rect.bottom + 10);
    qualityMenu.style.top = `${top + window.scrollY}px`;
    qualityMenu.classList.add('show');
  }
  function closeQualityMenu(){
    const { qualityBtn, qualityMenu, qualityBackdrop } = SV.el;
    qualityBtn.classList.remove('active');
    qualityBackdrop.classList.remove('show');
    qualityMenu.classList.remove('show');
  }
  function selectQuality(fmt){
    state.currentFormat = fmt;

    // Player principal
    if (SV.el.playerModal.style.display === 'flex') {
      const t = state.playlist[state.idx];
      if (t){
        const url = t.urls[state.currentFormat] || t.urls.mp3;
        SV.el.audio.src = url;
        SV.el.btnDownload.setAttribute('href', url);
        SV.el.btnDownload.setAttribute('download', `${t.title}.${state.currentFormat}`);
        if (state.isPlaying) SV.el.audio.play().catch(console.error);
      }
      renderPlaylist();
    }
    // Favoritos: sólo re-render, la pista usa su propio formato guardado
    Favoritos.render(); // desde favoritos.js (ya en global)
    buildQualityMenu();
    closeQualityMenu();
  }

  // ---------- Render de lista ----------
  function renderPlaylist(){
    const { playlistEl } = SV.el;
    const favs = Favoritos.getAll();
    playlistEl.innerHTML = '';

    state.playlist.forEach((t,i)=>{
      const active = (i===state.idx);
      const isFav = favs.some(f=>f.urls && f.urls.mp3===t.urls.mp3);
      const showHQ = SV.qualityIsHQ(state.currentFormat);

      const row = document.createElement('div');
      row.className = `playlist-item${active?' active':''}`;
      row.innerHTML = `
        <img src="${t.coverUrl}" alt="${SV.escapeHtml(t.title)}" loading="lazy">
        <div class="playlist-item-info">
          <h3>
            ${active?`<span class="eq"><span></span><span></span><span></span></span>`:''}
            ${SV.escapeHtml(t.title)}
            ${showHQ?` <span class="hq-indicator">HQ</span>`:''}
          </h3>
          <p>${SV.escapeHtml(t.artist)}</p>
        </div>
        <div class="playlist-item-actions">
          <button class="btn-favorite${isFav?' active':''}" aria-label="${isFav?'Quitar de favoritos':'Agregar a favoritos'}">
            <i class="${isFav?'fas fa-heart':'far fa-heart'}"></i>
          </button>
        </div>
      `;

      row.querySelector('.btn-favorite').addEventListener('click', (e)=>{
        e.stopPropagation();
        const now = Favoritos.getAll();
        if (now.some(f=>f.urls && f.urls.mp3===t.urls.mp3)){
          Favoritos.remove(t.urls.mp3);
        } else {
          Favoritos.add({...t, format: state.currentFormat});
        }
        renderPlaylist();
        if (SV.el.favoritesModal.style.display==='flex') Favoritos.loadAndRender();
      });

      row.addEventListener('click', ()=>{
        Player.loadTrack(i);
        SV.el.audio.play().then(()=>{
          state.isPlaying = true;
          SV.el.btnPlay.classList.add('playing');
          SV.el.btnPlay.setAttribute('aria-label','Pausar');
          if (state.isFavPlaying){
            SV.el.favAudio.pause();
            state.isFavPlaying = false;
            SV.el.favBtnPlay.classList.remove('playing');
            SV.el.favBtnPlay.setAttribute('aria-label','Reproducir');
          }
          SV.el.fabPlayer.style.display = 'none';
        }).catch(console.error);
      });

      playlistEl.appendChild(row);
    });
  }

  // ---------- API pública ----------
  Player.init = function init(){
    // time wiring
    wireTime(SV.el.audio, SV.el.seek, SV.el.curTime, SV.el.durTime, 'player');
    wireTime(SV.el.favAudio, SV.el.favSeek, SV.el.favCurTime, SV.el.favDurTime, 'favorites');

    // botones de calidad
    SV.el.qualityBtn.addEventListener('click', ()=>{
      if (!state.availableFormats || state.availableFormats.length === 0) return;
      buildQualityMenu();
      if (SV.el.qualityMenu.classList.contains('show')) closeQualityMenu();
      else openQualityMenu();
    });
    SV.el.qualityBackdrop.addEventListener('click', closeQualityMenu);

    // Controles player
    SV.el.btnPlay.addEventListener('click', ()=>Player.togglePlay('player'));
    SV.el.btnNext.addEventListener('click', ()=>Player.next('player'));
    SV.el.btnPrev.addEventListener('click', ()=>Player.prev('player'));
    SV.el.btnRepeat.addEventListener('click', ()=>Player.toggleRepeat('player'));
    SV.el.btnShuffle.addEventListener('click', ()=>Player.toggleShuffle('player'));
  };

  Player.open = function openPlayer(albumId){
    Inicio.showPlayer(); // desde inicio.js

    // Reset UI
    SV.el.playlistEl.innerHTML='<p style="padding:10px;color:#b3b3b3">Cargando canciones…</p>';
    SV.setHero('player','', 'Selecciona una canción', '');
    SV.el.songTitle.textContent = 'Selecciona una canción';
    SV.el.songArtist.textContent = '';
    SV.el.audio.src = '';
    SV.el.seek.value=0; SV.el.curTime.textContent='0:00'; SV.el.durTime.textContent='0:00';

    // Reset estado
    state.playlist = [];
    state.originalPlaylist = [];
    state.idx = 0;
    state.isPlaying = false;
    state.availableFormats = ['mp3'];
    state.currentFormat = 'mp3';
    state.repeatMode = 'none';
    state.isShuffled = false;
    state.currentAlbumId = albumId;

    SV.el.btnPlay.classList.remove('playing');
    SV.el.btnPlay.setAttribute('aria-label','Reproducir');
    SV.el.btnRepeat.classList.remove('active','repeat-one');
    SV.el.btnShuffle.classList.remove('active');

    // Modo mock
    if (albumId === 'queen_greatest_hits'){
      const cover = MOCK_ALBUMS[0].image, artist='Queen';
      SV.setHero('player', cover, 'Selecciona una canción', artist);
      state.playlist = MOCK_TRACKS.map(t=>({...t}));
      state.originalPlaylist = [...state.playlist];
      state.availableFormats = ['mp3'];
      // Prepara menú (no se abre solo)
      SV.el.qualityList && (SV.el.qualityList.innerHTML = '');
      renderPlaylist();
      Player.loadTrack(0);
      return;
    }

    // Carga real
    fetch(`https://archive.org/metadata/${albumId}`, {headers:{'User-Agent':'Mozilla/5.0'}})
      .then(r=>{ if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data=>{
        const coverUrl = `https://archive.org/services/img/${albumId}`;
        const artist = SV.normalizeCreator(data.metadata?.creator || data.metadata?.artist || 'Desconocido');
        SV.setHero('player', coverUrl, 'Selecciona una canción', artist);

        const files = (data.files||[]).filter(f=>/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i.test(f.name||''));
        const tracks = {};
        files.forEach(f=>{
          const raw = f.name;
          const title = SV.extractSongTitle(raw);
          const fmt = (raw.match(/\.(\w+)$/i)||[])[1]?.toLowerCase() || 'mp3';
          const url = `https://archive.org/download/${albumId}/${encodeURIComponent(raw).replace(/\+/g,'%20')}`;
          if(!tracks[title]) tracks[title] = { title, artist, coverUrl, urls:{}, format: state.currentFormat };
          tracks[title].urls[fmt] = url;
        });
        state.playlist = Object.values(tracks);
        state.originalPlaylist = [...state.playlist];

        state.availableFormats = SV.unique(files.map(f=>(f.name.match(/\.(\w+)$/i)||[])[1]?.toLowerCase()).filter(Boolean));
        if(!state.availableFormats.includes('mp3')) state.availableFormats.unshift('mp3');

        renderPlaylist();
        if (state.playlist.length === 0){
          SV.el.playlistEl.innerHTML='<p style="padding:10px">No se encontraron canciones de audio</p>';
          return;
        }
        Player.loadTrack(0);
      })
      .catch(err=>{
        console.error(err);
        SV.el.playlistEl.innerHTML=`<p style="padding:10px;color:#b3b3b3">Error: ${err.message}. Usando datos de prueba.</p>`;
        const cover = MOCK_ALBUMS[0].image;
        SV.setHero('player', cover, 'Selecciona una canción', 'Queen');
        state.playlist = MOCK_TRACKS.map(t=>({...t}));
        state.originalPlaylist = [...state.playlist];
        state.availableFormats = ['mp3'];
        Player.loadTrack(0);
      });
  };

  Player.loadTrack = function loadTrack(i){
    state.idx = i;
    const t = state.playlist[state.idx];
    if (!t) return;

    SV.el.songTitle.textContent = t.title;
    SV.el.songArtist.textContent = t.artist;
    SV.setHero('player', t.coverUrl, t.title, t.artist);

    const url = t.urls[state.currentFormat] || t.urls.mp3;
    SV.el.audio.src = url;
    SV.el.btnDownload.setAttribute('href', url);
    SV.el.btnDownload.setAttribute('download', `${t.title}.${state.currentFormat}`);

    SV.el.seek.value=0; SV.el.curTime.textContent='0:00'; SV.el.durTime.textContent='0:00';

    // Resync menú de calidad (sin abrir)
    // (las opciones ya se calculan en open)
    // Sólo re-renderizamos la lista:
    renderPlaylist();
  };

  Player.togglePlay = function togglePlay(scope){
    if(scope==='player' && SV.el.playerModal.style.display==='flex'){
      if(state.isPlaying){
        SV.el.audio.pause(); state.isPlaying=false; SV.el.btnPlay.classList.remove('playing'); SV.el.btnPlay.setAttribute('aria-label','Reproducir');
      }else{
        SV.el.audio.play().then(()=>{
          state.isPlaying = true; SV.el.btnPlay.classList.add('playing'); SV.el.btnPlay.setAttribute('aria-label','Pausar');
          if(state.isFavPlaying){
            SV.el.favAudio.pause(); state.isFavPlaying=false; SV.el.favBtnPlay.classList.remove('playing'); SV.el.favBtnPlay.setAttribute('aria-label','Reproducir');
          }
          SV.el.fabPlayer.style.display='none';
        }).catch(console.error);
      }
      // para actualizar eq en la fila activa
      renderPlaylist();
    }
  };

  Player.next = function next(scope){
    if(scope==='player' && SV.el.playerModal.style.display==='flex'){
      if(state.idx + 1 < state.playlist.length){
        state.idx = (state.idx + 1) % state.playlist.length;
        Player.loadTrack(state.idx);
        if(state.isPlaying) SV.el.audio.play().catch(console.error);
      }else if(state.repeatMode==='all'){
        state.idx = 0;
        Player.loadTrack(state.idx);
        if(state.isPlaying) SV.el.audio.play().catch(console.error);
      }
    }
  };

  Player.prev = function prev(scope){
    if(scope==='player' && SV.el.playerModal.style.display==='flex'){
      state.idx = (state.idx - 1 + state.playlist.length) % state.playlist.length;
      Player.loadTrack(state.idx);
      if(state.isPlaying) SV.el.audio.play().catch(console.error);
    }
  };

  Player.toggleRepeat = function toggleRepeat(scope){
    if (state.repeatMode === 'none'){
      state.repeatMode = 'all';
      SV.el.btnRepeat.classList.add('active');
    } else if (state.repeatMode === 'all'){
      state.repeatMode = 'one';
      SV.el.btnRepeat.classList.add('repeat-one');
    } else {
      state.repeatMode = 'none';
      SV.el.btnRepeat.classList.remove('active', 'repeat-one');
    }
  };

  Player.toggleShuffle = function toggleShuffle(scope){
    if(scope==='player' && SV.el.playerModal.style.display==='flex'){
      state.isShuffled = !state.isShuffled;
      SV.el.btnShuffle.classList.toggle('active', state.isShuffled);
      if(state.isShuffled){
        const cur = state.playlist[state.idx];
        state.playlist = SV.shuffle([...state.playlist]);
        state.idx = state.playlist.findIndex(t=>t.urls.mp3 === cur.urls.mp3);
      }else{
        state.playlist = [...state.originalPlaylist];
        const curUrl = SV.el.audio.src;
        state.idx = Math.max(0, state.playlist.findIndex(t => (t.urls[state.currentFormat] || t.urls.mp3) === curUrl));
      }
      renderPlaylist();
    }
  };

  // Expose
  window.Player = Player;
})();
