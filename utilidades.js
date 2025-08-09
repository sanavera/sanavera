// ========================================================
// Sanavera MP3 - utilidades.js
// Helpers compartidos + estado global
// ========================================================

(function () {
  // ---------- Helpers DOM ----------
  const $ = (id) => document.getElementById(id);
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- UI ----------
  function toggleBodyScroll(lock) {
    document.body.classList.toggle('modal-open', !!lock);
  }
  function show(el, on = true, asFlex = true) {
    if (!el) return;
    el.style.display = on ? (asFlex ? 'flex' : 'block') : 'none';
  }

  // ---------- Texto / tiempo ----------
  function truncate(text, max) {
    text = String(text || '');
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  }
  function formatTime(sec) {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r < 10 ? '0' : ''}${r}`;
  }
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  // ---------- Limpieza de metadatos ----------
  function normalizeCreator(c) {
    return Array.isArray(c) ? c.join(', ') : (c || 'Desconocido');
  }
  function extractSongTitle(fileName) {
    try {
      let name = fileName.replace(/\.(mp3|wav|flac|ogg|aiff|m4a|alac|mp4|m4b)$/i, '');
      name = name.replace(/^.*\//, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
      // prefijos tipo 01 -, (01), 1.
      name = name.replace(/^[\[(]?\s*\d{1,2}\s*[\])\-.]\s*/,'');
      // si hay " - ", quedate con la última parte (suele ser la pista)
      if (name.includes(' - ')) {
        const parts = name.split(' - ').map(s => s.trim()).filter(Boolean);
        if (parts.length > 1) name = parts[parts.length - 1];
      }
      // Quita año al final
      name = name.replace(/\s*[\[(]?(19|20)\d{2}[\])]?$/,'').trim();
      return name || fileName;
    } catch {
      return fileName;
    }
  }

  // ---------- Red / API ----------
  const IA = {
    // Busca álbumes
    buscarAlbums(query, page = 1) {
      const url =
        `https://archive.org/advancedsearch.php?q=${
          encodeURIComponent(query)
        }+AND+mediatype:audio+AND+NOT+access-restricted-item:true&fl=identifier,title,creator&rows=5000&page=${page}&output=json`;
      return fetch(url, { headers: { 'Accept': 'application/json' } })
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then(data => (data.response && data.response.docs) ? data.response.docs : []);
    },

    // Metadata de un ítem (álbum)
    metadata(id) {
      return fetch(`https://archive.org/metadata/${id}`, { headers: { 'Accept': 'application/json' } })
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
    }
  };

  // ---------- Estado global compartido entre módulos ----------
  const App = {
    // refs a nodos (se setean en inicio.js)
    ui: {},

    // estado reproductor
    playlist: [],
    originalPlaylist: [],
    currentIndex: 0,
    isPlaying: false,
    availableFormats: ['mp3'],
    currentFormat: 'mp3',
    repeatMode: 'none',
    shuffled: false,
    currentAlbumId: null,

    // estado favoritos
    favList: [],
    favOriginal: [],
    favIndex: 0,
    isFavPlaying: false,

    // util persistencia
    getFavorites() {
      try {
        return JSON.parse(localStorage.getItem('favorites') || '[]')
          .filter(f => f && f.title && f.artist && f.urls && f.urls.mp3);
      } catch { return []; }
    },
    setFavorites(list) {
      localStorage.setItem('favorites', JSON.stringify(list || []));
    },
  };

  // ---------- Exponer ----------
  window.$U = {
    $, qs, qsa,
    show, toggleBodyScroll,
    truncate, formatTime, escapeHtml,
    normalizeCreator, extractSongTitle,
    IA,
    App
  };
})();
