// =====================================
// Sanavera MP3 - reproductor.js
// Lógica del reproductor (álbum abierto)
// =====================================
(function () {
  // ---------- Helpers básicos (usan utilidades si existen) ----------
  const $id = (id) => document.getElementById(id);
  const escapeHtml = (s) =>
    (s || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const fmtTime = (s) => {
    if (isNaN(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60), ss = Math.floor(s % 60);
    return `${m}:${ss < 10 ? "0" : ""}${ss}`;
  };
  const normalizeCreator = (c) => (Array.isArray(c) ? c.join(", ") : (c || "Desconocido"));
  const unique = (arr) => [...new Set(arr)];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // Título prolijo desde nombre de archivo
  function extractSongTitle(fileName) {
    try {
      let name = fileName.replace(/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i, "");
      name = name.replace(/^.*\//, "").replace(/_/g, " ").replace(/\s+/g, " ").trim();
      name = name.replace(/^[\[(]?\s*\d{1,2}\s*[\])\-.]\s*/, "");
      if (name.includes(" - ")) {
        const parts = name.split(" - ").map((s) => s.trim()).filter(Boolean);
        if (parts.length > 1) name = parts[parts.length - 1];
      }
      name = name.replace(/\s*[\[(]?\b(19|20)\d{2}\b[\])]?$/, "").trim();
      return name || fileName;
    } catch {
      return fileName.replace(/\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i, "").replace(/_/g, " ");
    }
  }

  // ---------- DOM cache ----------
  const el = {
    // Modal
    playerModal: $id("player-modal"),
    // Hero
    playerHero: $id("player-hero"),
    heroTitle: $id("hero-song-title"),
    heroArtist: $id("hero-song-artist"),
    // (compatibilidad/oculto por CSS)
    legacyCover: $id("cover-image"),
    legacyTitle: $id("song-title"),
    legacyArtist: $id("song-artist"),
    // Lista
    playlist: $id("playlist"),
    // Audio
    audio: $id("audio-player"),
    // Controles
    btnPlay: $id("btn-play"),
    btnPrev: $id("btn-prev"),
    btnNext: $id("btn-next"),
    btnRepeat: $id("btn-repeat"),
    btnShuffle: $id("btn-shuffle"),
    btnDownload: $id("btn-download"),
    seek: $id("seek-bar"),
    curTime: $id("current-time"),
    durTime: $id("duration"),
    // FABs (para mostrar/ocultar)
    fabSearch: $id("floating-search-button"),
    fabPlayer: $id("floating-player-button"),
    fabFav: $id("floating-favorites-button"),
    // Menú de calidad
    qualityBtn: $id("quality-btn"),
    qualityMenu: $id("quality-menu"),
    qualityBackdrop: $id("quality-backdrop"),
    qualityList: $id("quality-options"),
  };

  // Validación mínima
  const faltan = Object.entries(el).filter(([, v]) => !v).map(([k]) => k);
  if (faltan.length) {
    console.error("reproductor.js: faltan elementos:", faltan);
    // No rompemos, solo salimos silenciosos para que otras secciones sigan
    return;
  }

  // ---------- Estado ----------
  const HQ_FORMATS = ["wav", "flac", "aiff", "alac"];
  const qualityIsHQ = (fmt) => HQ_FORMATS.includes((fmt || "").toLowerCase());

  let playlist = [];
  let originalPlaylist = [];
  let idx = 0;
  let isPlaying = false;

  let repeatMode = "none";
  let isShuffled = false;

  let availableFormats = ["mp3"];
  let currentFormat = "mp3";
  let currentAlbumId = null;

  // ---------- Hero ----------
  function setHero(coverUrl, title, artist) {
    const safe = coverUrl && coverUrl.trim() ? coverUrl : "https://via.placeholder.com/800x800?text=Sin+portada";
    el.playerHero.style.setProperty("--cover-url", `url("${safe}")`);
    el.heroTitle.textContent = title || "Selecciona una canción";
    el.heroArtist.textContent = artist || "";
    if (el.legacyCover) el.legacyCover.src = safe; // compat
    if (el.legacyTitle) el.legacyTitle.textContent = title || "Selecciona una canción";
    if (el.legacyArtist) el.legacyArtist.textContent = artist || "";
  }

  // ---------- Tiempo / barra ----------
  function wireTime() {
    el.audio.addEventListener("loadedmetadata", () => {
      el.durTime.textContent = fmtTime(el.audio.duration);
      el.seek.value = 0;
    });
    el.audio.addEventListener("timeupdate", () => {
      if (!isNaN(el.audio.duration) && el.audio.duration > 0) {
        el.curTime.textContent = fmtTime(el.audio.currentTime);
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
        el.curTime.textContent = fmtTime(t);
      }
    });
  }
  wireTime();

  // ---------- Menú de calidad ----------
  function buildQualityMenu() {
    if (!el.qualityList) return;
    el.qualityList.innerHTML = "";
    const fmts = [...availableFormats];
    if (!fmts.includes("mp3")) fmts.unshift("mp3");
    const frag = document.createDocumentFragment();
    fmts.forEach((f) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quality-option";
      btn.setAttribute("data-format", f);
      btn.innerHTML = `
        <span>${f.toUpperCase()}</span>
        <div class="center">
          ${qualityIsHQ(f) ? `<span class="badge-hq">HQ</span>` : ""}
          <i class="fa-solid fa-check check" style="${f === currentFormat ? "opacity:1" : "opacity:.2"}"></i>
        </div>
      `;
      btn.addEventListener("click", () => selectQuality(f));
      frag.appendChild(btn);
    });
    el.qualityList.appendChild(frag);
  }

  function openQualityMenu() {
    if (!availableFormats || !availableFormats.length) return;
    buildQualityMenu();
    el.qualityBtn.classList.add("active");
    el.qualityBackdrop.classList.add("show");

    // Posición bajo el botón
    const rect = el.qualityBtn.getBoundingClientRect();
    const top = Math.min(window.innerHeight - 220, rect.bottom + 10);
    el.qualityMenu.style.top = `${top + window.scrollY}px`;
    el.qualityMenu.classList.add("show");
  }
  function closeQualityMenu() {
    el.qualityBtn.classList.remove("active");
    el.qualityBackdrop.classList.remove("show");
    el.qualityMenu.classList.remove("show");
  }
  function selectQuality(fmt) {
    currentFormat = fmt;

    const t = playlist[idx];
    if (t) {
      const url = t.urls[currentFormat] || t.urls.mp3;
      el.audio.src = url;
      el.btnDownload.setAttribute("href", url);
      el.btnDownload.setAttribute("download", `${t.title}.${currentFormat}`);
      if (isPlaying) el.audio.play().catch(console.error);
    }
    renderPlaylist();
    buildQualityMenu();
    closeQualityMenu();
  }
  // Abrir/cerrar por UI
  el.qualityBtn && el.qualityBtn.addEventListener("click", () => {
    if (el.qualityMenu.classList.contains("show")) closeQualityMenu();
    else openQualityMenu();
  });
  el.qualityBackdrop && el.qualityBackdrop.addEventListener("click", closeQualityMenu);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && el.qualityMenu.classList.contains("show")) closeQualityMenu();
  });

  // ---------- Render de lista ----------
  function renderPlaylist() {
    el.playlist.innerHTML = "";
    const favs = getFavorites();
    const showHQ = qualityIsHQ(currentFormat);

    playlist.forEach((t, i) => {
      const active = i === idx;
      const isFav = favs.some((f) => f.urls && f.urls.mp3 === t.urls.mp3);

      const row = document.createElement("div");
      row.className = `playlist-item${active ? " active" : ""}`;
      row.innerHTML = `
        <img src="${t.coverUrl}" alt="${escapeHtml(t.title)}" loading="lazy">
        <div class="playlist-item-info">
          <h3>
            ${active ? `<span class="eq"><span></span><span></span><span></span></span>` : ""}
            ${showHQ ? ` <span class="hq-indicator">HQ</span>` : ""}
            ${escapeHtml(t.title)}
          </h3>
          <p>${escapeHtml(t.artist)}</p>
        </div>
        <div class="playlist-item-actions">
          <button class="btn-favorite${isFav ? " active" : ""}" aria-label="${isFav ? "Quitar de favoritos" : "Agregar a favoritos"}">
            <i class="${isFav ? "fas fa-heart" : "far fa-heart"}"></i>
          </button>
        </div>
      `;

      // Favoritos
      row.querySelector(".btn-favorite").addEventListener("click", (e) => {
        e.stopPropagation();
        const now = getFavorites();
        if (now.some((f) => f.urls && f.urls.mp3 === t.urls.mp3)) {
          setFavorites(now.filter((f) => !(f.urls && f.urls.mp3 === t.urls.mp3)));
        } else {
          now.unshift({ ...t, format: currentFormat });
          setFavorites(now);
        }
        renderPlaylist();
        // Si la vista de favoritos está abierta, que se refresque (favoritos.js lo gestiona escuchando storage o con API)
        window.FavoritosAPI && window.FavoritosAPI.refresh && window.FavoritosAPI.refresh();
      });

      // Selección de pista
      row.addEventListener("click", () => {
        loadTrack(i);
        el.audio.play().then(() => {
          isPlaying = true;
          el.btnPlay.classList.add("playing");
          el.btnPlay.setAttribute("aria-label", "Pausar");
          // Ocultamos fab player si estaba
          el.fabPlayer && (el.fabPlayer.style.display = "none");
          renderPlaylist(); // para mostrar la animación solo en la activa
        }).catch(console.error);
      });

      el.playlist.appendChild(row);
    });
  }

  // ---------- Carga de pista ----------
  function loadTrack(i) {
    idx = i;
    const t = playlist[idx];
    if (!t) return;

    // Hero + textos
    setHero(t.coverUrl, t.title, t.artist);

    // Audio
    const url = t.urls[currentFormat] || t.urls.mp3;
    el.audio.src = url;
    el.btnDownload.setAttribute("href", url);
    el.btnDownload.setAttribute("download", `${t.title}.${currentFormat}`);

    // Reset tiempos
    el.seek.value = 0;
    el.curTime.textContent = "0:00";
    el.durTime.textContent = "0:00";

    renderPlaylist();
  }

  // ---------- Controles ----------
  function togglePlay() {
    if (el.playerModal.style.display !== "flex") return;
    if (isPlaying) {
      el.audio.pause();
      isPlaying = false;
      el.btnPlay.classList.remove("playing");
      el.btnPlay.setAttribute("aria-label", "Reproducir");
    } else {
      el.audio.play().then(() => {
        isPlaying = true;
        el.btnPlay.classList.add("playing");
        el.btnPlay.setAttribute("aria-label", "Pausar");
        el.fabPlayer && (el.fabPlayer.style.display = "none");
      }).catch(console.error);
    }
    renderPlaylist();
  }
  function nextTrack() {
    if (idx + 1 < playlist.length) {
      idx = (idx + 1) % playlist.length;
      loadTrack(idx);
      if (isPlaying) el.audio.play().catch(console.error);
    } else if (repeatMode === "all") {
      idx = 0;
      loadTrack(idx);
      if (isPlaying) el.audio.play().catch(console.error);
    }
  }
  function prevTrack() {
    idx = (idx - 1 + playlist.length) % playlist.length;
    loadTrack(idx);
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
      const cur = playlist[idx];
      playlist = shuffle([...playlist]);
      idx = playlist.findIndex((t) => t.urls.mp3 === cur.urls.mp3);
    } else {
      playlist = [...originalPlaylist];
      const curUrl = el.audio.src;
      idx = Math.max(0, playlist.findIndex((t) => (t.urls[currentFormat] || t.urls.mp3) === curUrl));
    }
    renderPlaylist();
  }

  el.btnPlay.addEventListener("click", togglePlay);
  el.btnNext.addEventListener("click", nextTrack);
  el.btnPrev.addEventListener("click", prevTrack);
  el.btnRepeat.addEventListener("click", toggleRepeat);
  el.btnShuffle.addEventListener("click", toggleShuffle);

  // ---------- Apertura de álbum (API pública) ----------
  async function openPlayer(albumId) {
    // Mostrar modal (inicio.js debería encargarse, pero por las dudas)
    const showPlayer = () => {
      $id("search-modal") && ($id("search-modal").style.display = "none");
      el.playerModal.style.display = "flex";
      $id("favorites-modal") && ($id("favorites-modal").style.display = "none");
      el.fabSearch && (el.fabSearch.style.display = "block");
      el.fabPlayer && (el.fabPlayer.style.display = "none");
      el.fabFav && (el.fabFav.style.display = "block");
      closeQualityMenu();
    };
    showPlayer();

    // Reset UI
    el.playlist.innerHTML = `<p style="padding:10px;color:#b3b3b3">Cargando canciones…</p>`;
    setHero("", "Selecciona una canción", "");
    el.audio.src = "";
    el.seek.value = 0; el.curTime.textContent = "0:00"; el.durTime.textContent = "0:00";

    // Reset estado
    playlist = []; originalPlaylist = []; idx = 0; isPlaying = false;
    availableFormats = ["mp3"]; currentFormat = "mp3";
    repeatMode = "none"; isShuffled = false; currentAlbumId = albumId;
    el.btnPlay.classList.remove("playing"); el.btnPlay.setAttribute("aria-label", "Reproducir");
    el.btnRepeat.classList.remove("active", "repeat-one"); el.btnShuffle.classList.remove("active");

    // Mock de prueba
    if (albumId === "queen_greatest_hits") {
      const cover = "https://indiehoy.com/wp-content/uploads/2022/05/queen-queen-ii.jpg";
      const artist = "Queen";
      setHero(cover, "Selecciona una canción", artist);
      playlist = [
        { title: "Bohemian Rhapsody", artist, coverUrl: cover, urls: { mp3: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" }, format: "mp3" },
        { title: "Another One Bites the Dust", artist, coverUrl: cover, urls: { mp3: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" }, format: "mp3" },
      ];
      originalPlaylist = [...playlist];
      availableFormats = ["mp3"];
      buildQualityMenu();
      renderPlaylist();
      loadTrack(0);
      return;
    }

    // Carga real
    try {
      const resp = await fetch(`https://archive.org/metadata/${albumId}`, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      const coverUrl = `https://archive.org/services/img/${albumId}`; // (mejorable a futuro con imagen grande)
      const artist = normalizeCreator(data.metadata?.creator || data.metadata?.artist || "Desconocido");
      setHero(coverUrl, "Selecciona una canción", artist);

      const files = (data.files || []).filter((f) => /\.(mp3|wav|flac|ogg|aiff|m4a|alac)$/i.test(f.name || ""));
      const tracks = {};
      files.forEach((f) => {
        const raw = f.name;
        const title = extractSongTitle(raw);
        const fmt = ((raw.match(/\.(\w+)$/i) || [])[1] || "mp3").toLowerCase();
        const url = `https://archive.org/download/${albumId}/${encodeURIComponent(raw).replace(/\+/g, "%20")}`;
        if (!tracks[title]) tracks[title] = { title, artist, coverUrl, urls: {}, format: currentFormat };
        tracks[title].urls[fmt] = url;
      });
      playlist = Object.values(tracks);
      originalPlaylist = [...playlist];

      availableFormats = unique(files.map((f) => ((f.name.match(/\.(\w+)$/i) || [])[1] || "").toLowerCase()).filter(Boolean));
      if (!availableFormats.includes("mp3")) availableFormats.unshift("mp3");

      buildQualityMenu();
      renderPlaylist();
      if (playlist.length === 0) {
        el.playlist.innerHTML = `<p style="padding:10px">No se encontraron canciones de audio</p>`;
        return;
      }
      loadTrack(0);
    } catch (err) {
      console.error(err);
      el.playlist.innerHTML = `<p style="padding:10px;color:#b3b3b3">Error: ${err.message}. Usando datos de prueba.</p>`;
      const cover = "https://indiehoy.com/wp-content/uploads/2022/05/queen-queen-ii.jpg";
      setHero(cover, "Selecciona una canción", "Queen");
      playlist = [
        { title: "Bohemian Rhapsody", artist: "Queen", coverUrl: cover, urls: { mp3: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" }, format: "mp3" },
        { title: "Another One Bites the Dust", artist: "Queen", coverUrl: cover, urls: { mp3: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" }, format: "mp3" },
      ];
      originalPlaylist = [...playlist];
      availableFormats = ["mp3"];
      buildQualityMenu();
      loadTrack(0);
    }
  }

  // ---------- Favoritos (mínimo para pintar iconos) ----------
  function getFavorites() {
    try {
      return JSON.parse(localStorage.getItem("favorites") || "[]")
        .filter((f) => f && f.title && f.artist && f.urls && f.urls.mp3);
    } catch {
      return [];
    }
  }
  function setFavorites(list) {
    localStorage.setItem("favorites", JSON.stringify(list || []));
  }

  // ---------- Exponer API global ----------
  window.PlayerAPI = {
    open: openPlayer,
    isPlaying: () => isPlaying,
  };

  // También exponemos una función global usada por buscador / HTML
  window.openPlayer = openPlayer;
})();
