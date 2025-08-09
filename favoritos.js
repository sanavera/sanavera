// --- favoritos.js ---
import { fmtTime, setHero, escapeHtml, qualityIsHQ, getFavorites, removeFromFavorites } from './utilidades.js';

let favList=[], favIdx=0, isFavPlaying=false;
const el = {
  modal: byId('favorites-modal'),
  list: byId('favorites-playlist'),
  audio: byId('favorites-audio-player'),
  seek: byId('favorites-seek-bar'),
  cur: byId('favorites-current-time'),
  dur: byId('favorites-duration'),
  btnPlay: byId('favorites-btn-play'),
  btnPrev: byId('favorites-btn-prev'),
  btnNext: byId('favorites-btn-next'),
  btnRepeat: byId('favorites-btn-repeat'),
  btnShuffle: byId('favorites-btn-shuffle'),
  btnDownload: byId('favorites-btn-download')
};
let repeatMode='none', isShuffled=false;

(function wireTime(){
  el.audio.addEventListener('loadedmetadata', ()=>{ el.dur.textContent=fmtTime(el.audio.duration); el.seek.value=0; });
  el.audio.addEventListener('timeupdate', ()=>{
    if(!isNaN(el.audio.duration) && el.audio.duration>0){
      el.cur.textContent = fmtTime(el.audio.currentTime);
      el.seek.value = el.audio.currentTime/el.audio.duration*100;
    }
  });
  el.audio.addEventListener('ended', ()=>{ if(repeatMode==='one'){ el.audio.currentTime=0; el.audio.play(); } else next(); });
  el.seek.addEventListener('input', ()=>{
    if(!isNaN(el.audio.duration) && el.audio.duration>0){
      const t = (el.audio.duration * el.seek.value)/100; el.audio.currentTime=t; el.cur.textContent=fmtTime(t);
    }
  });
})();

export function loadFavoritesUI(){
  favList = getFavorites();
  if(!favList.length){
    el.list.innerHTML='<div class="msg">No hay canciones en favoritos.</div>';
    setHero('favorites','', 'Selecciona una canción', '');
    return;
  }
  renderFavs();
  loadFav(0);
}

function renderFavs(){
  el.list.innerHTML='';
  favList.forEach((t,i)=>{
    const active=i===favIdx;
    const isHQ = qualityIsHQ(t.format||'');
    const row=document.createElement('div');
    row.className='playlist-item'+(active?' active':'');
    row.innerHTML=`
      <img src="${t.coverUrl}" alt="${t.title}">
      <div class="playlist-item-info">
        <h3>${active?`<span class="eq"><span></span><span></span><span></span></span>`:''}
            ${escapeHtml(t.title)} ${isHQ?`<span class="hq-indicator">HQ</span>`:''}
        </h3>
        <p>${escapeHtml(t.artist)}</p>
      </div>
      <div class="playlist-item-actions">
        <button class="btn-remove-favorite" aria-label="Quitar de favoritos"><i class="fas fa-times"></i></button>
      </div>`;
    row.querySelector('.btn-remove-favorite').onclick = (e)=>{ e.stopPropagation(); removeFromFavorites(t.urls.mp3); loadFavoritesUI(); };
    row.onclick=()=>{ loadFav(i); el.audio.play().then(()=>{ isFavPlaying=true; el.btnPlay.classList.add('playing'); }).catch(()=>{}); };
    el.list.appendChild(row);
  });
}

function loadFav(i){
  favIdx=i; const t=favList[favIdx]; if(!t) return;
  const fmt=t.format||'mp3'; const url=t.urls[fmt]||t.urls.mp3;
  setHero('favorites', t.coverUrl, t.title, t.artist);
  el.audio.src=url; el.btnDownload.href=url; el.btnDownload.download=`${t.title}.${fmt}`;
  el.seek.value=0; el.cur.textContent='0:00'; el.dur.textContent='0:00';
  renderFavs();
}

// controles
el.btnPlay.onclick=()=>{ if(isFavPlaying){ el.audio.pause(); isFavPlaying=false; el.btnPlay.classList.remove('playing'); } else { el.audio.play().then(()=>{ isFavPlaying=true; el.btnPlay.classList.add('playing'); }).catch(()=>{});} renderFavs(); };
el.btnPrev.onclick=()=>{ favIdx=(favIdx-1+favList.length)%favList.length; loadFav(favIdx); if(isFavPlaying) el.audio.play(); };
el.btnNext.onclick=()=> next();
function next(){ if(favIdx+1<favList.length){ favIdx=(favIdx+1)%favList.length; loadFav(favIdx); if(isFavPlaying) el.audio.play(); } else if(repeatMode==='all'){ favIdx=0; loadFav(favIdx); if(isFavPlaying) el.audio.play(); } }
el.btnRepeat.onclick=()=>{ if(repeatMode==='none'){ repeatMode='all'; el.btnRepeat.classList.add('active'); } else if(repeatMode==='all'){ repeatMode='one'; el.btnRepeat.classList.add('repeat-one'); } else { repeatMode='none'; el.btnRepeat.classList.remove('active','repeat-one'); } };
el.btnShuffle.onclick=()=>{ isShuffled=!isShuffled; el.btnShuffle.classList.toggle('active',isShuffled); if(isShuffled){ const cur=favList[favIdx]; favList=shuffle([...favList]); favIdx=favList.findIndex(t=>t.urls.mp3===cur.urls.mp3);} else { favList=getFavorites(); } renderFavs(); };
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
