// =========================================================
// Sanavera MP3 - inicio.js (bootstrap / rescate)
// =========================================================
(() => {
  const $ = (id) => document.getElementById(id);

  // Nodos base
  const ui = {
    welcome: $('welcome-modal'),
    search:  $('search-modal'),
    player:  $('player-modal'),
    favs:    $('favorites-modal'),
    fabSearch:  $('floating-search-button'),
    fabPlayer:  $('floating-player-button'),
    fabFavs:    $('floating-favorites-button'),
    // por si quedó abierto el selector de calidad
    qBackdrop: $('quality-backdrop'),
    qMenu:     $('quality-menu'),
    qBtn:      $('quality-btn'),
  };

  // Util
  const show = (el, on=true) => { if (el) el.style.display = on ? 'flex' : 'none'; };
  const bodyScroll = (lock) => document.body.classList.toggle('modal-open', !!lock);

  // Cierra cualquier overlay de calidad que haya quedado colgado
  function cerrarSelectorCalidad() {
    if (ui.qBackdrop) ui.qBackdrop.classList.remove('show');
    if (ui.qMenu)     ui.qMenu.classList.remove('show');
    if (ui.qBtn)      ui.qBtn.classList.remove('active');
  }

  // Navegación básica (sin depender de otros módulos)
  function irABusqueda() {
    cerrarSelectorCalidad();
    show(ui.search, true);
    show(ui.player, false);
    show(ui.favs,   false);
    show(ui.welcome,false);
    if (ui.fabSearch) ui.fabSearch.style.display = 'none';
    if (ui.fabPlayer) ui.fabPlayer.style.display = 'none';
    if (ui.fabFavs)   ui.fabFavs.style.display   = 'block';
    bodyScroll(true);
  }
  function irAPlayer() {
    cerrarSelectorCalidad();
    show(ui.search, false);
    show(ui.player, true);
    show(ui.favs,   false);
    show(ui.welcome,false);
    if (ui.fabSearch) ui.fabSearch.style.display = 'block';
    if (ui.fabPlayer) ui.fabPlayer.style.display = 'none';
    if (ui.fabFavs)   ui.fabFavs.style.display   = 'block';
    bodyScroll(true);
  }
  function irAFavoritos() {
    cerrarSelectorCalidad();
    show(ui.search, false);
    show(ui.player, false);
    show(ui.favs,   true);
    show(ui.welcome,false);
    if (ui.fabSearch) ui.fabSearch.style.display = 'block';
    if (ui.fabPlayer) ui.fabPlayer.style.display = 'block';
    if (ui.fabFavs)   ui.fabFavs.style.display   = 'none';
    bodyScroll(true);
  }

  // Exponer para que otros módulos llamen si quieren
  window.__UI__ = { irABusqueda, irAPlayer, irAFavoritos, cerrarSelectorCalidad };

  // Cablear FABs (aunque los otros módulos también lo hagan)
  ui.fabSearch && ui.fabSearch.addEventListener('click', irABusqueda);
  ui.fabPlayer && ui.fabPlayer.addEventListener('click', irAPlayer);
  ui.fabFavs   && ui.fabFavs.addEventListener('click', irAFavoritos);

  // Estado inicial seguro
  (function arrancar() {
    try {
      // Si ya se mostró bienvenida antes en esta sesión, vamos directo a búsqueda
      const shown = sessionStorage.getItem('welcomeShown') === 'true';
      if (!shown && ui.welcome) {
        // Mostrar bienvenida y programar salida a búsqueda
        show(ui.welcome, true);
        show(ui.search,  false);
        show(ui.player,  false);
        show(ui.favs,    false);
        if (ui.fabSearch) ui.fabSearch.style.display = 'none';
        if (ui.fabPlayer) ui.fabPlayer.style.display = 'none';
        if (ui.fabFavs)   ui.fabFavs.style.display   = 'none';
        bodyScroll(true);

        // Failsafe: a los 11s vamos a búsqueda sí o sí
        setTimeout(() => {
          try { sessionStorage.setItem('welcomeShown', 'true'); } catch {}
          show(ui.welcome, false);
          irABusqueda();
          // Disparar búsqueda inicial si existe el buscador
          const input = document.getElementById('search-input');
          const btn   = document.getElementById('search-button');
          if (input && btn) {
            input.value = '';
            // Si el módulo de buscador está, llamá su función pública
            if (window.Buscador && typeof window.Buscador.buscarInicio === 'function') {
              window.Buscador.buscarInicio('juan_chota_dura');
            } else {
              // fallback: click al botón para no dejar la pantalla vacía
              btn.click();
            }
          }
        }, 11000);
      } else {
        // Ir directo a búsqueda
        irABusqueda();
        // lanzar búsqueda inicial si el módulo está
        const input = document.getElementById('search-input');
        const btn   = document.getElementById('search-button');
        if (input && btn) {
          input.value = '';
          if (window.Buscador && typeof window.Buscador.buscarInicio === 'function') {
            window.Buscador.buscarInicio('juan_chota_dura');
          }
        }
      }

      // Por las dudas: si no hay ningún modal visible, habilitar scroll
      const algoVisible = [ui.search, ui.player, ui.favs, ui.welcome].some(n => n && getComputedStyle(n).display !== 'none');
      if (!algoVisible) {
        bodyScroll(false);
        irABusqueda();
      }

      // Asegurar que el backdrop de calidad no tape todo
      cerrarSelectorCalidad();
    } catch(e) {
      console.error('inicio.js bootstrap error:', e);
      // Fallback mínimo a búsqueda
      irABusqueda();
    }
  })();
})();
