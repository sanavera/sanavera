// =========================================================
// Sanavera MP3 - reproductor.js (player)
// =========================================================
(() => {
  // ---------- helpers locales ----------
  const $ = (id) => document.getElementById(id);
  const fmtTime = (s) => (isNaN(s) || s < 0) ? '0:00' : `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  const escapeHtml = (s='') => s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const unique = (arr) => [...new Set(arr)];
  const HQ_FORMATS = ['wav','flac','aiff','alac'];
  const isHQ = (f) => HQ_FORMATS.includes((f||'').toLowerCase());

  // Limpia nombre de tema desde filename
  const extractSongTitle = (fileName='') => {
    try{
      let n = fileName.replace(/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i,'');
      n = n.replace(/^.*\//,'').replace(/_/g,' ').replace(/\s+/g,' ').trim();
      n = n.replace(/^[\[(]?\s*\d{1,2}\s*[\])\-.]\s*/,'');
      if(n.includes(' - ')){
        const parts = n.split(' - ').map(s=>s.trim()).filter(Boolean);
        if(parts.length>1) n = parts[parts.length-1];
      }
      n = n.replace(/\s*[\[(]?\b(19|20)\d{2}\b[\])]?$/,'').trim();
      return n || fileName;
    }catch{ return fileName; }
  };

  const normalizeCreator = (c) => Array.isArray(c) ? c.join(', ') : (c || 'Desconocido');

  // ---------- cache de nodos ----------
  const el = {
    // hero
    hero: $('player-hero'),
    heroTitle: $('hero-song-title'),
    heroArtist: $('hero-song-artist'),
    // legacy (oculto por CSS, lo dejamos por compat)
    coverLegacy: $('cover-image'),
    songTitleLegacy: $('song-title'),
    songArtistLegacy: $('song-artist'),

    // lista
    list: $('playlist'),

    // audio + tiempos
    audio: $('audio-player'),
    seek: $('seek-bar'),
    cur: $('current-time'),
    dur: $('duration'),

    // controles
    bPlay: $('btn-play'),
    bPrev: $('btn-prev'),
    bNext: $('btn-next'),
    bRepeat: $('btn-repeat'),
    bShuffle: $('btn-shuffle'),
    bDown: $('btn-download'),

    // calidad (bottom-sheet)
    qBtn: $('quality-btn'),
    qBackdrop: $('quality-backdrop'),
    qMenu: $('quality-menu'),
    qList: $('quality-options'),
  };

  // si faltan elementos, no seguimos (evita pantalla negra)
  const missing = Object.entries(el).filter(([,v]) => !v).map(([k]) => k);
  if (missing.length){
    console.error('Reproductor: faltan nodos', missing);
    return;
  }

  // ---------- estado ----------
  let albumId = null;
  let artist = '';
  let playlist = [];          // [{title, artist, coverUrl, urls:{fmt:url}, format}]
  let original = [];
  let idx = 0;
  let playing = false;
  let repeatMode = 'none';    // none | all | one
  let shuffled = false;
  let availableFormats = ['mp3'];
  let currentFormat = 'mp3';

  // ---------- hero ----------
  function setHero(coverUrl, title, art){
    const safe = (coverUrl && coverUrl.trim()) ? coverUrl : 'https://via.placeholder.com/800x800?text=Sin+portada';
    el.hero.style.setProperty('--cover-url', `url("${safe}")`);
    el.heroTitle.textContent = title || 'Selecciona una canción';
    el.heroArtist.textContent = art || '';
    if (el.coverLegacy) el.coverLegacy.src = safe;
    if (el.songTitleLegacy) el.songTitleLegacy.textContent = title || '';
    if (el.songArtistLegacy) el.songArtistLegacy.textContent = art || '';
  }

  // intenta conseguir portada grande desde metadata.files
  function pickBestCover(files, fallback){
    const imgs = (files||[]).filter(f=>{
      const n = (f.name||'').toLowerCase();
      return /\.(jpg|jpeg|png|webp)$/i.test(n);
    });
    if (!imgs.length) return fallback;
    // prioridad: nombres que parezcan cover/folder + mayor size
    imgs.sort((a,b)=>{
      const as = /cover|folder|front|art/.test((a.name||'').toLowerCase()) ? 1 : 0;
      const bs = /cover|folder|front|art/.test((b.name||'').toLowerCase()) ? 1 : 0;
      if (as!==bs) return bs - as;
      const sa = Number(a.size||0), sb = Number(b.size||0);
      return sb - sa;
    });
    const chosen = imgs[0];
    return `https://archive.org/download/${albumId}/${encodeURIComponent(chosen.name).replace(/\+/g,'%20')}`;
  }

  // ---------- tiempos ----------
  function wireTime(){
    el.audio.addEventListener('loadedmetadata', ()=>{
      el.dur.textContent = fmtTime(el.audio.duration);
      el.seek.value = 0;
    });
    el.audio.addEventListener('timeupdate', ()=>{
      if (!isNaN(el.audio.duration) && el.audio.duration>0){
        el.cur.textContent = fmtTime(el.audio.currentTime);
        el.seek.value = (el.audio.currentTime/el.audio.duration)*100;
      }
    });
    el.audio.addEventListener('ended', ()=>{
      if (repeatMode==='one'){
        el.audio.currentTime = 0;
        el.audio.play().catch(console.error);
      } else {
        next();
      }
    });
    el.seek.addEventListener('input', ()=>{
      if (!isNaN(el.audio.duration) && el.audio.duration>0){
        const t = (el.audio.duration*el.seek.value)/100;
        el.audio.currentTime = t;
        el.cur.textContent = fmtTime(t);
      }
    });
  }
  wireTime();

  // ---------- calidad ----------
  function buildQualityMenu(){
    el.qList.innerHTML = '';
    const fmts = [...availableFormats];
    if (!fmts.includes('mp3')) fmts.unshift('mp3');
    const frag = document.createDocumentFragment();
    fmts.forEach(f=>{
      const btn = document.createElement('button');
      btn.className = 'quality-option';
      btn.type = 'button';
      btn.setAttribute('data-format', f);
      btn.innerHTML = `
        <span>${f.toUpperCase()}</span>
        <div class="center">
          ${isHQ(f)?'<span class="badge-hq">HQ</span>':''}
          <i class="fa-solid fa-check check" style="${f===currentFormat?'opacity:1':'opacity:.15'}"></i>
        </div>`;
      btn.addEventListener('click', ()=> selectQuality(f));
      frag.appendChild(btn);
    });
    el.qList.appendChild(frag);
  }
  function openQuality(){
    if (!availableFormats.length) return;
    buildQualityMenu();
    el.qBtn.classList.add('active');
    el.qBackdrop.classList.add('show');
    const r = el.qBtn.getBoundingClientRect();
    const top = Math.min(window.innerHeight-220, r.bottom + 10);
    el.qMenu.style.top = `${top + window.scrollY}px`;
    el.qMenu.classList.add('show');
  }
  function closeQuality(){
    el.qBtn.classList.remove('active');
    el.qBackdrop.classList.remove('show');
    el.qMenu.classList.remove('show');
  }
  function selectQuality(fmt){
    currentFormat = fmt;
    const t = playlist[idx];
    if (t){
      const url = t.urls[currentFormat] || t.urls.mp3;
      el.audio.src = url;
      el.bDown.setAttribute('href', url);
      el.bDown.setAttribute('download', `${t.title}.${currentFormat}`);
      if (playing) el.audio.play().catch(console.error);
    }
    renderList();
    buildQualityMenu();
    closeQuality();
  }
  el.qBtn.addEventListener('click', () => el.qMenu.classList.contains('show') ? closeQuality() : openQuality());
  el.qBackdrop.addEventListener('click', closeQuality);

  // ---------- controles ----------
  el.bPlay.addEventListener('click', togglePlay);
  el.bNext.addEventListener('click', next);
  el.bPrev.addEventListener('click', prev);
  el.bRepeat.addEventListener('click', ()=>{
    if (repeatMode==='none'){
      repeatMode='all'; el.bRepeat.classList.add('active');
    } else if (repeatMode==='all'){
      repeatMode='one'; el.bRepeat.classList.add('repeat-one');
    } else {
      repeatMode='none'; el.bRepeat.classList.remove('active','repeat-one');
    }
  });
  el.bShuffle.addEventListener('click', ()=>{
    shuffled = !shuffled;
    el.bShuffle.classList.toggle('active', shuffled);
    if (shuffled){
      const cur = playlist[idx];
      playlist = shuffle([...playlist]);
      idx = playlist.findIndex(t=>t.urls.mp3===cur.urls.mp3);
    } else {
      playlist = [...original];
      const curUrl = el.audio.src;
      idx = Math.max(0, playlist.findIndex(t=> (t.urls[currentFormat]||t.urls.mp3)===curUrl));
    }
    renderList();
  });
  const shuffle = (a)=>{ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };

  function togglePlay(){
    if (playing){
      el.audio.pause();
      playing = false;
      el.bPlay.classList.remove('playing');
      el.bPlay.setAttribute('aria-label','Reproducir');
    } else {
      el.audio.play().then(()=>{
        playing = true;
        el.bPlay.classList.add('playing');
        el.bPlay.setAttribute('aria-label','Pausar');
      }).catch(console.error);
    }
    renderList();
  }
  function next(){
    if (idx+1<playlist.length){
      idx = (idx+1)%playlist.length;
      load(idx);
      if (playing) el.audio.play().catch(console.error);
    } else if (repeatMode==='all'){
      idx = 0; load(idx);
      if (playing) el.audio.play().catch(console.error);
    }
  }
  function prev(){
    idx = (idx-1+playlist.length)%playlist.length;
    load(idx);
    if (playing) el.audio.play().catch(console.error);
  }

  // ---------- render ----------
  function renderList(){
    el.list.innerHTML = '';
    const showHQ = isHQ(currentFormat);

    // favoritos del storage para pintar corazones
    let favs = [];
    try { favs = JSON.parse(localStorage.getItem('favorites')||'[]'); } catch {}

    playlist.forEach((t, i)=>{
      const active = (i===idx);
      const isFav = favs.some(f=>f.urls && f.urls.mp3===t.urls.mp3);

      const row = document.createElement('div');
      row.className = `playlist-item${active?' active':''}`;
      row.innerHTML = `
        <img src="${t.coverUrl}" alt="${escapeHtml(t.title)}" loading="lazy">
        <div class="playlist-item-info">
          <h3>
            ${active && playing ? `<span class="eq"><span></span><span></span><span></span></span>` : ''}
            ${showHQ ? `<span class="hq-indicator">HQ</span>` : ''}
            ${escapeHtml(t.title)}
          </h3>
          <p>${escapeHtml(t.artist)}</p>
        </div>
        <div class="playlist-item-actions">
          <button class="btn-favorite${isFav?' active':''}" aria-label="${isFav?'Quitar de favoritos':'Agregar a favoritos'}">
            <i class="${isFav?'fas fa-heart':'far fa-heart'}"></i>
          </button>
        </div>
      `;

      // favorito
      row.querySelector('.btn-favorite').addEventListener('click', (e)=>{
        e.stopPropagation();
        let list = [];
        try { list = JSON.parse(localStorage.getItem('favorites')||'[]'); } catch {}
        if (list.some(f=>f.urls && f.urls.mp3===t.urls.mp3)){
          list = list.filter(f=>!(f.urls && f.urls.mp3===t.urls.mp3));
        } else {
          list.unshift({...t, format: currentFormat});
        }
        localStorage.setItem('favorites', JSON.stringify(list));
        renderList();
      });

      // click en la fila
      row.addEventListener('click', ()=>{
        load(i);
        el.audio.play().then(()=>{
          playing = true;
          el.bPlay.classList.add('playing');
          el.bPlay.setAttribute('aria-label','Pausar');
        }).catch(console.error);
      });

      el.list.appendChild(row);
    });
  }

  function load(i){
    idx = i;
    const t = playlist[idx];
    if (!t) return;

    // hero + legacy
    setHero(t.coverUrl, t.title, t.artist);

    // audio + descarga
    const url = t.urls[currentFormat] || t.urls.mp3;
    el.audio.src = url;
    el.bDown.setAttribute('href', url);
    el.bDown.setAttribute('download', `${t.title}.${currentFormat}`);

    // tiempos
    el.seek.value = 0; el.cur.textContent='0:00'; el.dur.textContent='0:00';

    renderList();
  }

  // ---------- API pública ----------
  async function open(album){
    albumId = album;
    // reset
    el.list.innerHTML = '<p style="padding:10px;color:#b3b3b3">Cargando canciones…</p>';
    setHero('', 'Selecciona una canción', '');
    el.audio.src=''; el.seek.value=0; el.cur.textContent='0:00'; el.dur.textContent='0:00';
    playing = false; idx=0; shuffled=false; repeatMode='none';
    el.bPlay.classList.remove('playing'); el.bRepeat.classList.remove('active','repeat-one'); el.bShuffle.classList.remove('active');
    availableFormats = ['mp3']; currentFormat = 'mp3';
    closeQuality();

    try{
      const res = await fetch(`https://archive.org/metadata/${albumId}`, { headers: { 'User-Agent':'Mozilla/5.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      artist = normalizeCreator(data.metadata?.creator || data.metadata?.artist || 'Desconocido');
      const fallbackCover = `https://archive.org/services/img/${albumId}`;
      const bigCover = pickBestCover(data.files, fallbackCover);
      setHero(bigCover, 'Selecciona una canción', artist);

      const files = (data.files||[]).filter(f => /\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i.test(f.name||''));
      // armar tracks: juntar formatos por título limpio
      const tracksMap = {};
      files.forEach(f=>{
        const raw = f.name;
        const tTitle = extractSongTitle(raw);
        const fmt = (raw.match(/\.(\w+)$/i)||[])[1]?.toLowerCase() || 'mp3';
        const url = `https://archive.org/download/${albumId}/${encodeURIComponent(raw).replace(/\+/g,'%20')}`;
        if (!tracksMap[tTitle]) tracksMap[tTitle] = { title: tTitle, artist, coverUrl: bigCover, urls: {}, format: currentFormat };
        tracksMap[tTitle].urls[fmt] = url;
      });
      playlist = Object.values(tracksMap);
      original = [...playlist];

      availableFormats = unique(files.map(f=>(f.name.match(/\.(\w+)$/i)||[])[1]?.toLowerCase()).filter(Boolean));
      if (!availableFormats.includes('mp3')) availableFormats.unshift('mp3');
      buildQualityMenu();

      if (!playlist.length){
        el.list.innerHTML = '<p style="padding:10px">No se encontraron canciones de audio</p>';
        return;
      }
      load(0);
    }catch(err){
      console.error('openPlayer error:', err);
      el.list.innerHTML = `<p style="padding:10px;color:#b3b3b3">Error: ${err.message}</p>`;
    }
  }

  // export
  window.Reproductor = { open, selectQuality, closeQuality };
  window.openPlayer = open; // compat hacia atrás
})();
