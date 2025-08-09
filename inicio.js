// inicio.js — arranque y orquestación

import { byId, setBrand, runWelcomeProgress, state, bus } from './utilidades.js';
import { initBuscador, buscarAlbums } from './buscador.js';
import { initReproductor } from './reproductor.js';
import { initFavoritos } from './favoritos.js';

document.addEventListener('DOMContentLoaded', () => {
  // --- Logo del proyecto ---
  setBrand({
    imgId: 'brand-logo',
    src: './logo.png', // Ruta a tu logo PNG
    alt: 'Sanavera Mp3',
    textId: 'brand-text'
  });

  // --- Bienvenida ---
  const bienvenida = byId('welcome-modal');
  const buscador = byId('search-modal');

  const mostrarBuscador = () => {
    bienvenida.style.display = 'none';
    buscador.style.display = 'block';

    // Iniciar módulos en orden
    initBuscador();
    initReproductor();
    initFavoritos();

    // Hacer búsqueda inicial para que haya resultados
    state.currentQuery = 'Queen'; // palabra clave inicial
    buscarAlbums(state.currentQuery);
  };

  // Barra de progreso sincronizada con cierre
  runWelcomeProgress({
    barId: 'welcome-progress',
    durationMs: 10000,
    onDone: mostrarBuscador
  });

  // Botón “Saltar” bienvenida (si lo tenés)
  const skipBtn = byId('skip-welcome');
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      mostrarBuscador();
    });
  }

  // Por si otro módulo necesita saber que todo arrancó
  bus.emit('app:inicio');
});
