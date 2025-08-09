// --- reproductor.js ---
import { fmtTime, escapeHtml, normalizeCreator, unique, HQ_FORMATS, qualityIsHQ, setHero, extractSongTitle, addToFavorites, removeFromFavorites, getFavorites } from './utilidades.js';

let playlist=[], originalPlaylist=[], idx=0, isPlaying=false;
let availableFormats=['mp3'], currentFormat='mp3', repeatMode='none', isShuffled=false;
let currentAlbumId=null;

const el = {
  modal: byId('player-modal'),
  hero: byId('player-hero'),
  list: byId('playlist'),
  btnPlay: byId('btn-play'),
  btnPrev: byId('btn-prev'),
  btnNext: byId('btn-next'),
  btnRepeat: byId('btn-repeat'),
  btnShuffle: byId('btn-shuffle'),
  btnDownload: byId('btn-download'),
  seek: byId('seek-bar'),
  cur: byId('current-time'),
  dur: byId('duration'),
  audio: byId('audio-player'),
  qBtn: byId('quality-btn'),
  qMenu: byId('quality-menu'),
  qBack: byId('quality-backdrop'),
  qList: byId('quality-options')
};

// tiempo
(function wireTime(){
  el.audio.addEventListener('loadedmetadata', ()=>{ el.dur.textContent = fmtTime(el.audio.duration); el.seek.value=0; });
  el.audio.addEventListener('timeupdate', ()=>{
    if(!isNaN(el.audio.duration) && el.audio.duration>0){
      el.cur.textContent = fmtTime(el.audio.currentTime);
      el.seek.value = el.audio.currentTime / el.audio.duration * 100;
    }
  });
  el.audio.addEventListener('ended', ()=>{ if(repeatMode==='one'){ el.audio.currentTime=0; el.audio.play(); } else nextTrack(); });
  el.seek.addEventListener('input', ()=>{
    if(!isNaN(el.audio.duration) && el.audio.duration>0){
      const t = (el.audio.duration * el.seek.value)/100;
      el.audio.currentTime = t; el.cur.textContent = fmtTime(t);
    }
  });
})();

// calidad
function buildQuality(){
  el.qList.innerHTML='';
  const fmts=[...availableFormats]; if(!fmts.includes('mp3')) fmts.unshift('mp3');
  fmts.forEach(f=>{
    const b=document.createElement('button');
    b.className='quality-option';
    b.innerHTML=`<span>${f.toUpperCase()}</span>
      <div class="center">${qualityIsHQ(f)?'<span class="badge-hq">HQ</span>':''}<i class="fa fa-check check" style="${f===currentFormat?'opacity:1':'opacity:.2'}"></i></div>`;
    b.onclick=()=>selectQuality(f);
    el.qList.appendChild(b);
  });
}
function openQ(){ buildQuality(); el.qBack.classList.add('show'); el.qMenu.classList.add('show'); }
function closeQ(){ el.qBack.classList.remove('show'); el.qMenu.classList.remove('show'); }
function selectQuality(f){
  currentFormat=f;
  const t = playlist[idx];
  if(t){
    const url = t.urls[currentFormat] || t.urls.mp3;
    el.audio.src = url;
    el.btnDownload.href = url;
    el.btnDownload.download = `${t.title}.${currentFormat}`;
    if(isPlaying) el.audio.play().catch(()=>{});
    renderList();
  }
  closeQ();
}
el.qBtn.onclick = ()=> el.qMenu.classList.contains('show') ? closeQ() : openQ();
el.qBack.onclick = closeQ;

// API
export function openPlayer(albumId){
  // mostrar modal
  byId('search-modal').style.display='none';
  byId('favorites-modal').style.display='none';
  el.modal.style.display='flex';

  // reset
  playlist=[]; originalPlaylist=[]; idx=0; isPlaying=false;
  availableFormats=['mp3']; currentFormat='mp3'; repeatMode='none'; isShuffled=false; currentAlbumId=albumId;
  el.btnPlay.classList.remove('playing'); el.btnRepeat.classList.remove('active','repeat-one'); el.btnShuffle.classList.remove('active');
  el.cur.textContent='0:00'; el.dur.textContent='0:00'; el.seek.value=0;
  setHero('player','', 'Selecciona una canción', '');

  fetch(`https://archive.org/metadata/${albumId}`)
    .then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
    .then(data=>{
      const coverBig = data.misc?.image || `https://archive.org/services/img/${albumId}`;
      const artist = normalizeCreator(data.metadata?.creator || data.metadata?.artist || 'Desconocido');
      setHero('player', coverBig, 'Selecciona una canción', artist);

      const files = (data.files||[]).filter(f=>/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i.test(f.name||''));
      const tmp = {};
      files.forEach(f=>{
        const raw=f.name;
        const title=extractSongTitle(raw);
        const fmt=(raw.match(/\.(\w+)$/i)||[])[1]?.toLowerCase()||'mp3';
        const url=`https://archive.org/download/${albumId}/${encodeURIComponent(raw).replace(/\+/g,'%20')}`;
        if(!tmp[title]) tmp[title]={title, artist, coverUrl:coverBig, urls:{}};
        tmp[title].urls[fmt]=url;
      });
      playlist = Object.values(tmp);
      originalPlaylist=[...playlist];
      availableFormats = unique(files.map(f=>(f.name.match(/\.(\w+)$/i)||[])[1]?.toLowerCase()).filter(Boolean));
      if(!availableFormats.includes('mp3')) availableFormats.unshift('mp3');
      renderList();
      if(playlist.length){ loadTrack(0); }
    })
    .catch(err=>{
      console.error(err);
      byId('playlist').innerHTML='<div class="msg">No se pudieron cargar las canciones.</div>';
    });
}

function loadTrack(i){
  idx=i; const t=playlist[idx]; if(!t) return;
  setHero('player', t.coverUrl, t.title, t.artist);
  const url = t.urls[currentFormat] || t.urls.mp3;
  el.audio.src = url;
  el.btnDownload.href = url; el.btnDownload.download = `${t.title}.${currentFormat}`;
  el.seek.value=0; el.cur.textContent='0:00'; el.durTime='0:00';
  renderList();
}

function renderList(){
  const favs = getFavorites();
  el.list.innerHTML='';
  playlist.forEach((t,i)=>{
    const active = i===idx;
    const isFav = favs.some(f=>f.urls && f.urls.mp3===t.urls.mp3);
    const showHQ = qualityIsHQ(currentFormat);

    const row=document.createElement('div');
    row.className='playlist-item'+(active?' active':'');
    row.innerHTML=`
      <img src="${t.coverUrl}" alt="${t.title}" loading="lazy">
      <div class="playlist-item-info">
        <h3>${active?`<span class="eq"><span></span><span></span><span></span></span>`:''}
            ${escapeHtml(t.title)} ${showHQ?`<span class="hq-indicator">HQ</span>`:''}
        </h3>
        <p>${escapeHtml(t.artist)}</p>
      </div>
      <div class="playlist-item-actions">
        <button class="btn-favorite ${isFav?'active':''}" aria-label="${isFav?'Quitar de favoritos':'Agregar a favoritos'}">
          <i class="${isFav?'fas fa-heart':'far fa-heart'}"></i>
        </button>
      </div>`;
    row.querySelector('.btn-favorite').onclick = (e)=>{
      e.stopPropagation();
      if(isFav) removeFromFavorites(t.urls.mp3); else addToFavorites({...t, format: currentFormat});
      renderList();
    };
    row.onclick = ()=>{
      loadTrack(i);
      el.audio.play().then(()=>{ isPlaying=true; el.btnPlay.classList.add('playing'); }).catch(()=>{});
    };
    el.list.appendChild(row);
  });
}

// controles
el.btnPlay.onclick = ()=>{
  if(isPlaying){ el.audio.pause(); isPlaying=false; el.btnPlay.classList.remove('playing'); }
  else{ el.audio.play().then(()=>{ isPlaying=true; el.btnPlay.classList.add('playing'); }).catch(()=>{}); }
  renderList();
};
el.btnNext.onclick = ()=> nextTrack();
el.btnPrev.onclick = ()=> prevTrack();
el.btnRepeat.onclick = ()=>{
  if(repeatMode==='none'){ repeatMode='all'; el.btnRepeat.classList.add('active'); }
  else if(repeatMode==='all'){ repeatMode='one'; el.btnRepeat.classList.add('repeat-one'); }
  else{ repeatMode='none'; el.btnRepeat.classList.remove('active','repeat-one'); }
};
el.btnShuffle.onclick = ()=>{
  isShuffled=!isShuffled; el.btnShuffle.classList.toggle('active',isShuffled);
  if(isShuffled){
    const cur=playlist[idx]; playlist=shuffle([...playlist]); idx=playlist.findIndex(t=>t.urls.mp3===cur.urls.mp3);
  }else{
    playlist=[...originalPlaylist]; const curUrl = el.audio.src; idx=Math.max(0, playlist.findIndex(t=>(t.urls[currentFormat]||t.urls.mp3)===curUrl));
  }
  renderList();
};
function nextTrack(){
  if(idx+1<playlist.length){ idx=(idx+1)%playlist.length; loadTrack(idx); if(isPlaying) el.audio.play(); }
  else if(repeatMode==='all'){ idx=0; loadTrack(idx); if(isPlaying) el.audio.play(); }
}
function prevTrack(){
  idx=(idx-1+playlist.length)%playlist.length; loadTrack(idx); if(isPlaying) el.audio.play();
}
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

export { openPlayer };
