// ===============================
// Sanavera MP3 — favoritos.js
// ===============================
(function () {
  // ---- Namespace compartido ----
  const N = (window.SANAVERA = window.SANAVERA || {});

  // ---- Fallbacks por si faltan helpers de utilidades.js (no rompen si ya existen) ----
  N.byId = N.byId || ((id) => document.getElementById(id));
  N.fmtTime = N.fmtTime || ((s) => {
    if (isNaN(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60), ss = Math.floor(s % 60);
    return `${m}:${ss < 10 ? "0" : ""}${ss}`;
  });
  N.escapeHtml =
    N.escapeHtml ||
    ((str) =>
      (str || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])));
  N.setHero =
    N.setHero ||
    ((scope, coverUrl, title, artist) => {
      const isFav = scope === "favorites";
      const hero = N.byId(isFav ? "favorites-hero" : "player-hero");
      const hTitle = N.byId(isFav ? "favorites-hero-song-title" : "hero-song-title");
      const hArtist = N.byId(isFav ? "favorites-hero-song-artist" : "hero-song-artist");
      const legacyImg = N.byId(isFav ? "favorites-cover-image" : "cover-image");
      const safe = coverUrl && coverUrl.trim() ? coverUrl : "https://via.placeholder.com/800x800?text=Sin+portada";
      if (hero) hero.style.setProperty("--cover-url", `url("${safe}")`);
      if (hTitle) hTitle.textContent = title || "Selecciona una canción";
      if (hArtist) hArtist.textContent = artist || "";
      if (legacyImg) legacyImg.src = safe;
    });
  N.qualityIsHQ =
    N.qualityIsHQ ||
    ((fmt) => ["wav", "flac", "aiff", "alac"].includes((fmt || "").toLowerCase()));

  // Storage helpers (compartidos con reproductor)
  function getFavorites() {
    try {
      return JSON.parse(localStorage.getItem("favorites") || "[]").filter(
        (f) => f && f.title && f.artist && f.urls && f.urls.mp3
      );
    } catch {
      return [];
    }
  }
  function setFavorites(list) {
    localStorage.setItem("favorites", JSON.stringify(list || []));
  }

  // ---- Cache de elementos (favoritos) ----
  const el = {
    modal: N.byId("favorites-modal"),

    hero: N.byId("favorites-hero"),
    heroTitle: N.byId("favorites-hero-song-title"),
    heroArtist: N.byId("favorites-hero-song-artist"),

    legacyCover: N.byId("favorites-cover-image"),
    legacySongTitle: N.byId("favorites-song-title"),
    legacySongArtist: N.byId("favorites-song-artist"),

    list: N.byId("favorites-playlist"),

    audio: N.byId("favorites-audio-player"),
    btnPlay: N.byId("favorites-btn-play"),
    btnPrev: N.byId("favorites-btn-prev"),
    btnNext: N.byId("favorites-btn-next"),
    btnRepeat: N.byId("favorites-btn-repeat"),
    btnShuffle: N.byId("favorites-btn-shuffle"),
    btnDownload: N.byId("favorites-btn-download"),

    seek: N.byId("favorites-seek-bar"),
    cur: N.byId("favorites-current-time"),
    dur: N.byId("favorites-duration"),
  };

  // Validación mínima
  const miss = Object.entries(el)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (miss.length) {
    console.error("Favoritos: faltan elementos", miss);
    // No arrojamos UI-blocker para no tapar la app si esto aparece antes que el HTML
  }

  // ---- Estado de favoritos ----
  let favList = [];
  let favOriginal = [];
  let favIdx = 0;
  let isPlaying = false;
  let repeatMode = "none";
  let isShuffled = false;

  // ---- Wire de tiempo / progreso ----
  function wireTime() {
    if (!el.audio) return;
    el.audio.addEventListener("loadedmetadata", () => {
      el.dur.textContent = N.fmtTime(el.audio.duration);
      el.seek.value = 0;
    });
    el.audio.addEventListener("timeupdate", () => {
      if (!isNaN(el.audio.duration) && el.audio.duration > 0) {
        el.cur.textContent = N.fmtTime(el.audio.currentTime);
        el.seek.value = (el.audio.currentTime / el.audio.duration) * 100;
      }
    });
    el.audio.addEventListener("ended", () => {
      if (repeatMode === "one") {
        el.audio.currentTime = 0;
        el.audio.play().catch(console.error);
      } else {
        nextTrack();
      }
    });
    el.seek.addEventListener("input", () => {
      if (!isNaN(el.audio.duration) && el.audio.duration > 0) {
        const t = (el.audio.duration * el.seek.value) / 100;
        el.audio.currentTime = t;
        el.cur.textContent = N.fmtTime(t);
      }
    });
  }

  // ---- Carga / render ----
  function loadFavorites() {
    favList = getFavorites();
    favOriginal = [...favList];

    if (favList.length === 0) {
      if (el.list) el.list.innerHTML = '<p style="padding:10px">No hay canciones en favoritos.</p>';
      N.setHero("favorites", "", "Selecciona una canción", "");
      if (el.audio) {
        el.audio.src = "";
        el.seek.value = 0;
        el.cur.textContent = "0:00";
        el.dur.textContent = "0:00";
      }
      isPlaying = false;
      if (el.btnPlay) {
        el.btnPlay.classList.remove("playing");
        el.btnPlay.setAttribute("aria-label", "Reproducir");
      }
      if (el.btnRepeat) el.btnRepeat.classList.remove("active", "repeat-one");
      if (el.btnShuffle) el.btnShuffle.classList.remove("active");
      repeatMode = "none";
      isShuffled = false;
      return;
    }

    renderFavorites();
    if (el.audio && !el.audio.src) loadTrack(0);
  }

  function renderFavorites() {
    if (!el.list) return;
    el.list.innerHTML = "";
    const frag = document.createDocumentFragment();

    favList.forEach((t, i) => {
      const active = i === favIdx;
      const isHQ = N.qualityIsHQ(t.format || "");

      const row = document.createElement("div");
      row.className = `playlist-item${active ? " active" : ""}`;
      row.innerHTML = `
        <img src="${t.coverUrl}" alt="${N.escapeHtml(t.title)}" loading="lazy" />
        <div class="playlist-item-info">
          <h3>
            ${
              active && isPlaying
                ? `<span class="eq"><span></span><span></span><span></span></span>`
                : ``
            }
            ${isHQ ? `<span class="hq-indicator">HQ</span> ` : ``}
            ${N.escapeHtml(t.title)}
          </h3>
          <p>${N.escapeHtml(t.artist)}</p>
        </div>
        <div class="playlist-item-actions">
          <button class="btn-remove-favorite" aria-label="Quitar de favoritos"><i class="fas fa-times"></i></button>
        </div>
      `;

      // Quitar de favoritos
      row.querySelector(".btn-remove-favorite").addEventListener("click", (e) => {
        e.stopPropagation();
        removeFromFavorites(t.urls.mp3);
      });

      // Reproducir pista
      row.addEventListener("click", () => {
        loadTrack(i);
        el.audio
          .play()
          .then(() => {
            isPlaying = true;
            el.btnPlay.classList.add("playing");
            el.btnPlay.setAttribute("aria-label", "Pausar");
            renderFavorites(); // para mostrar la animación en el activo
          })
          .catch(console.error);
      });

      frag.appendChild(row);
    });

    el.list.appendChild(frag);
  }

  function loadTrack(i) {
    favIdx = i;
    const t = favList[favIdx];
    if (!t) return;

    const fmt = t.format || "mp3";
    const url = t.urls[fmt] || t.urls.mp3;

    // Hero + textos
    if (el.legacySongTitle) el.legacySongTitle.textContent = t.title;
    if (el.legacySongArtist) el.legacySongArtist.textContent = t.artist;
    N.setHero("favorites", t.coverUrl, t.title, t.artist);

    // Audio + descarga
    if (el.audio) el.audio.src = url;
    if (el.btnDownload) {
      el.btnDownload.setAttribute("href", url);
      el.btnDownload.setAttribute("download", `${t.title}.${fmt}`);
    }

    // Reset tiempo
    el.seek.value = 0;
    el.cur.textContent = "0:00";
    el.dur.textContent = "0:00";

    renderFavorites();
  }

  // ---- Acciones de storage ----
  function removeFromFavorites(mp3Url) {
    let favs = getFavorites();
    favs = favs.filter((f) => !(f.urls && f.urls.mp3 === mp3Url));
    setFavorites(favs);
    // Reposicionamos el índice si quedó fuera de rango
    if (favIdx >= favs.length) favIdx = Math.max(0, favs.length - 1);
    loadFavorites();
  }

  // ---- Controles ----
  function togglePlay() {
    if (!el.audio) return;
    if (isPlaying) {
      el.audio.pause();
      isPlaying = false;
      el.btnPlay.classList.remove("playing");
      el.btnPlay.setAttribute("aria-label", "Reproducir");
    } else {
      el.audio
        .play()
        .then(() => {
          isPlaying = true;
          el.btnPlay.classList.add("playing");
          el.btnPlay.setAttribute("aria-label", "Pausar");
        })
        .catch(console.error);
    }
    renderFavorites();
  }

  function nextTrack() {
    if (favIdx + 1 < favList.length) {
      favIdx = (favIdx + 1) % favList.length;
      loadTrack(favIdx);
      if (isPlaying) el.audio.play().catch(console.error);
    } else if (repeatMode === "all") {
      favIdx = 0;
      loadTrack(favIdx);
      if (isPlaying) el.audio.play().catch(console.error);
    }
  }

  function prevTrack() {
    favIdx = (favIdx - 1 + favList.length) % favList.length;
    loadTrack(favIdx);
    if (isPlaying) el.audio.play().catch(console.error);
  }

  function toggleRepeat() {
    if (repeatMode === "none") {
      repeatMode = "all";
      el.btnRepeat.classList.add("active");
      el.btnRepeat.setAttribute("aria-label", "Repetir todo");
    } else if (repeatMode === "all") {
      repeatMode = "one";
      el.btnRepeat.classList.add("repeat-one");
      el.btnRepeat.setAttribute("aria-label", "Repetir una canción");
    } else {
      repeatMode = "none";
      el.btnRepeat.classList.remove("active", "repeat-one");
      el.btnRepeat.setAttribute("aria-label", "Repetir");
    }
  }

  function toggleShuffle() {
    isShuffled = !isShuffled;
    el.btnShuffle.classList.toggle("active", isShuffled);
    if (isShuffled) {
      const cur = favList[favIdx];
      favList = shuffle([...favList]);
      favIdx = favList.findIndex((t) => t.urls.mp3 === cur.urls.mp3);
    } else {
      favList = [...favOriginal];
      const curUrl = el.audio ? el.audio.src : "";
      favIdx = Math.max(
        0,
        favList.findIndex((t) => (t.urls[t.format || "mp3"]) === curUrl)
      );
    }
    renderFavorites();
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---- Eventos UI ----
  function wireControls() {
    if (!el.modal) return;
    if (el.btnPlay) el.btnPlay.addEventListener("click", togglePlay);
    if (el.btnNext) el.btnNext.addEventListener("click", nextTrack);
    if (el.btnPrev) el.btnPrev.addEventListener("click", prevTrack);
    if (el.btnRepeat) el.btnRepeat.addEventListener("click", toggleRepeat);
    if (el.btnShuffle) el.btnShuffle.addEventListener("click", toggleShuffle);
  }

  // ---- Integración con navegación ----
  // Si otro archivo avisa que se mostró Favoritos, recargar lista
  document.addEventListener("sanavera:showFavorites", loadFavorites);

  // Carga inicial (por si el modal ya está visible)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    wireTime();
    wireControls();
    // Render inicial (no rompe si el modal no está visible)
    loadFavorites();
  }
})();
