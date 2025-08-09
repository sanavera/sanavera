// utilidades.js

// Formatea segundos a mm:ss
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Carga imagen de portada con fallback
function loadCoverImage(imgElement, url, fallback) {
    imgElement.src = url;
    imgElement.onerror = () => {
        imgElement.src = fallback;
    };
}

// Obtiene parámetros de URL
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Guarda en localStorage
function saveToStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// Lee de localStorage
function loadFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

// Quita texto innecesario de títulos (artista/álbum)
function cleanSongTitle(title) {
    if (!title) return '';
    return title
        .replace(/\s*\([^)]*\)/g, '') // elimina paréntesis
        .replace(/\s*-\s*.*$/, '')    // elimina después de guiones
        .trim();
}

// Agrega clase animación a canción activa
function highlightPlayingSong(element) {
    document.querySelectorAll('.song-item').forEach(item => {
        item.classList.remove('playing');
        const anim = item.querySelector('.song-animation');
        if (anim) anim.remove();
    });

    if (element) {
        element.classList.add('playing');
        const anim = document.createElement('div');
        anim.className = 'song-animation';
        anim.innerHTML = `
            <span></span><span></span><span></span>
        `;
        element.prepend(anim);
    }
}

// Elimina duplicados de un array por propiedad
function removeDuplicates(array, key) {
    return array.filter((obj, index, self) =>
        index === self.findIndex(o => o[key] === obj[key])
    );
}

// Detecta si el formato es HQ
function isHighQuality(format) {
    const hqFormats = ['flac', 'wav', 'ape', 'alac'];
    return hqFormats.includes(format.toLowerCase());
}
