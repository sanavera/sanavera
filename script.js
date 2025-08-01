document.addEventListener('DOMContentLoaded', function() {
    // Selección de elementos
    var searchModal = document.getElementById('search-modal');
    var searchInput = document.getElementById('search-input');
    var searchButton = document.getElementById('search-button');
    var albumList = document.getElementById('album-list');
    var resultsCount = document.getElementById('results-count');
    var loading = document.getElementById('loading');
    var errorMessage = document.getElementById('error-message');
    var playerModal = document.getElementById('player-modal');
    var closeModal = document.getElementById('close-modal');
    var coverImage = document.getElementById('cover-image');
    var songTitle = document.getElementById('song-title');
    var songArtist = document.getElementById('song-artist');
    var playlistElement = document.getElementById('playlist');
    var audioPlayer = document.getElementById('audio-player');
    var btnPlay = document.getElementById('btn-play');
    var btnPrev = document.getElementById('btn-prev');
    var btnNext = document.getElementById('btn-next');
    var btnRepeat = document.getElementById('btn-repeat');
    var btnShuffle = document.getElementById('btn-shuffle');
    var btnDownload = document.getElementById('btn-download');
    var progressBar = document.getElementById('progress-bar');
    var progress = document.getElementById('progress');
    var currentTimeElement = document.getElementById('current-time');
    var durationElement = document.getElementById('duration');
    var floatingButton = document.getElementById('floating-button');
    var currentAlbumCover = null;

    // Verifica elementos
    if (!searchModal || !searchInput || !searchButton || !albumList || !resultsCount || !loading || !errorMessage || !playerModal || !closeModal || !btnRepeat || !btnShuffle || !btnDownload || !floatingButton) {
        document.body.innerHTML += '<p style="color: red;">Error: No se encontraron los elementos de la página.</p>';
        return;
    }

    // Limpiar basura en botones
    document.querySelectorAll('.btn, .btn-small, .btn-play').forEach(btn => {
        if (btn.innerText.trim() !== '') {
            btn.innerText = '';
            btn.appendChild(btn.querySelector('i')); // Asegurar que solo el ícono permanezca
        }
    });

    // Limpiar basura en progress-container
    function cleanProgressContainer() {
        const progressContainer = document.querySelector('.progress-container');
        progressContainer.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') {
                node.remove();
            }
        });
    }
    cleanProgressContainer();

    // Mostrar modal del buscador al cargar
    searchModal.style.display = 'flex';

    // Álbum simulado
    var mockAlbums = [
        { id: 'queen_greatest_hits', title: 'Queen - Greatest Hits', artist: 'Queen', image: 'https://indiehoy.com/wp-content/uploads/2022/05/queen-queen-ii.jpg' }
    ];
    var mockTracks = [
        { title: 'Bohemian Rhapsody', artist: 'Queen', mp3Url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', coverUrl: 'https://indiehoy.com/wp-content/uploads/2022/05/queen-queen-ii.jpg' },
        { title: 'Another One Bites the Dust', artist: 'Queen', mp3Url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', coverUrl: 'https://indiehoy.com/wp-content/uploads/2022/05/queen-queen-ii.jpg' }
    ];

    // Estado
    var currentPage = 1;
    var isLoading = false;
    var currentQuery = '';
    var allAlbums = [];
    var playlistConfig = [];
    var originalPlaylist = [];
    var currentTrackIndex = 0;
    var isPlaying = false;
    var lastScrollPosition = 0;
    var currentAlbumId = null;
    var repeatMode = 'off';
    var isShuffled = false;

    // Cola para limitar solicitudes simultáneas
    const imageLoadQueue = [];
    let activeImageLoads = 0;
    const maxConcurrentLoads = 4;

    function loadImage(img) {
        if (activeImageLoads >= maxConcurrentLoads) {
            imageLoadQueue.push(img);
            return;
        }
        activeImageLoads++;
        img.src = img.getAttribute('data-src');
        img.onload = () => {
            activeImageLoads--;
            processImageQueue();
        };
        img.onerror = () => {
            img.src = 'https://via.placeholder.com/100';
            activeImageLoads--;
            processImageQueue();
        };
    }

    function processImageQueue() {
        if (imageLoadQueue.length > 0 && activeImageLoads < maxConcurrentLoads) {
            const nextImg = imageLoadQueue.shift();
            loadImage(nextImg);
        }
    }

    // Configurar IntersectionObserver
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                loadImage(img);
                observer.unobserve(img);
            }
        });
    }, {
        root: albumList,
        rootMargin: '100px',
        threshold: 0.1
    });

    function observeImages() {
        document.querySelectorAll('.lazy-image').forEach(img => {
            observer.observe(img);
        });
    }

    // Funciones para el botón flotante
    function showFloatingButton() {
        if (currentAlbumId && currentAlbumCover) {
            floatingButton.style.backgroundImage = `url('${currentAlbumCover}')`;
            floatingButton.style.display = 'block';
        }
    }

    function hideFloatingButton() {
        floatingButton.style.display = 'none';
    }

    floatingButton.addEventListener('click', () => {
        if (currentAlbumId && currentAlbumCover) {
            openPlayer(currentAlbumId, currentAlbumCover);
            hideFloatingButton();
        }
    });

    // Manejo del historial para el botón Atrás
    window.addEventListener('popstate', function(event) {
        if (event.state && event.state.modal === 'player') {
            closePlayerModal();
        } else {
            searchModal.style.display = 'flex';
            playerModal.style.display = 'none';
            albumList.scrollTop = lastScrollPosition;
            showFloatingButton();
        }
    });

    function closePlayerModal() {
        playerModal.style.display = 'none';
        searchModal.style.display = 'flex';
        albumList.scrollTop = lastScrollPosition;
        audioPlayer.pause();
        isPlaying = false;
        btnPlay.classList.remove('playing');
        btnPlay.setAttribute('aria-label', 'Reproducir');
        showFloatingButton();
    }

    // Búsqueda automática de "juan_chota_dura" al cargar
    currentQuery = 'juan_chota_dura';
    searchInput.value = '';
    searchAlbums(currentQuery, currentPage, true);
    history.replaceState({ modal: 'search' }, '', '');

    // Eventos de búsqueda
    searchButton.addEventListener('click', function() {
        var query = searchInput.value.trim();
        if (query) {
            currentPage = 1;
            allAlbums = [];
            currentQuery = query;
            searchAlbums(query, currentPage, true);
            history.replaceState({ modal: 'search' }, '', '');
        } else {
            errorMessage.textContent = 'Por favor, ingresá un término de búsqueda.';
            errorMessage.style.display = 'block';
            displayAlbums(mockAlbums);
        }
    });

    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            var query = searchInput.value.trim();
            if (query) {
                currentPage = 1;
                allAlbums = [];
                currentQuery = query;
                searchAlbums(query, currentPage, true);
                history.replaceState({ modal: 'search' }, '', '');
            } else {
                errorMessage.textContent = 'Por favor, ingresá un término de búsqueda.';
                errorMessage.style.display = 'block';
                displayAlbums(mockAlbums);
            }
        }
    });

    // Scroll infinito
    albumList.addEventListener('scroll', function() {
        lastScrollPosition = albumList.scrollTop;
        if (isLoading || !currentQuery) return;
        if (albumList.scrollTop + albumList.clientHeight >= albumList.scrollHeight - 100) {
            currentPage++;
            searchAlbums(currentQuery, currentPage, false);
        }
    });

    function searchAlbums(query, page, clearPrevious) {
        if (isLoading) return;
        isLoading = true;
        loading.style.display = 'block';
        errorMessage.style.display = 'none';
        if (clearPrevious) {
            albumList.innerHTML = '';
            allAlbums = [];
            resultsCount.textContent = 'Resultados: 0';
        }

        var queryEncoded = encodeURIComponent(query);
        var url = 'https://archive.org/advancedsearch.php?q=' + queryEncoded + '+AND+mediatype:audio+AND+NOT+access-restricted-item:true&fl=identifier,title,creator&rows=5000&page=' + page + '&output=json';

        fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        })
            .then(function(response) {
                if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                return response.json();
            })
            .then(function(data) {
                loading.style.display = 'none';
                isLoading = false;
                var docs = data.response ? data.response.docs || [] : [];
                if (docs.length === 0 && page === 1) {
                    errorMessage.textContent = 'No se encontraron resultados. Probá con "Amar Azul" o "Queen Greatest Hits".';
                    errorMessage.style.display = 'block';
                    displayAlbums(mockAlbums);
                    return;
                }
                if (docs.length === 0 && page > 1) return;

                var queryLower = query.toLowerCase();
                var albums = docs.map(function(doc) {
                    return {
                        id: doc.identifier,
                        title: doc.title || 'Sin título',
                        artist: normalizeCreator(doc.creator),
                        image: 'https://archive.org/services/img/' + doc.identifier,
                        relevance: calculateRelevance(doc, queryLower)
                    };
                });

                albums.sort(function(a, b) { return b.relevance - a.relevance; });
                allAlbums = allAlbums.concat(albums);

                var uniqueAlbums = new Map();
                allAlbums.forEach(function(album) {
                    var key = album.title + '|' + album.artist;
                    if (!uniqueAlbums.has(key)) {
                        uniqueAlbums.set(key, album);
                    }
                });

                var finalAlbums = Array.from(uniqueAlbums.values());
                resultsCount.textContent = 'Resultados: ' + finalAlbums.length;
                displayAlbums(finalAlbums);
            })
            .catch(function(error) {
                loading.style.display = 'none';
                isLoading = false;
                errorMessage.textContent = 'Error: ' + error.message + '. Mostrando datos de prueba.';
                errorMessage.style.display = 'block';
                displayAlbums(mockAlbums);
            });
    }

    function normalizeCreator(creator) {
        if (!creator) return 'Desconocido';
        if (Array.isArray(creator)) return creator.join(', ');
        return creator;
    }

    function calculateRelevance(doc, queryLower) {
        var title = (doc.title || '').toLowerCase();
        var creator = normalizeCreator(doc.creator).toLowerCase();
        var relevance = 0;

        if (title === queryLower) {
            relevance += 200;
        } else if (title.includes(queryLower)) {
            relevance += 100;
        }
        if (creator.includes(queryLower)) {
            relevance += 50;
        }

        return relevance;
    }

    function displayAlbums(albums) {
        if (!albums || albums.length === 0) {
            resultsCount.textContent = 'Resultados: 0';
            albumList.innerHTML = '<p>No se encontraron álbumes.</p>';
            return;
        }
        resultsCount.textContent = 'Resultados: ' + albums.length;
        albumList.innerHTML = '';
        albums.forEach(function(album) {
            var albumItem = document.createElement('div');
            albumItem.className = 'album-item';
            albumItem.innerHTML = `
                <img data-src="${album.image}" alt="${album.title}" class="lazy-image" />
                <div class="album-item-info">
                    <h3>${album.title}</h3>
                    <p>${album.artist}</p>
                </div>
            `;
            albumItem.addEventListener('click', function() {
                if (currentAlbumId !== album.id) {
                    audioPlayer.pause();
                    isPlaying = false;
                    btnPlay.classList.remove('playing');
                    btnPlay.setAttribute('aria-label', 'Reproducir');
                }
                openPlayer(album.id, album.image);
            });
            albumList.appendChild(albumItem);
        });
        observeImages();
    }

    function openPlayer(albumId, albumImage) {
        lastScrollPosition = albumList.scrollTop;
        searchModal.style.display = 'none';
        playerModal.style.display = 'flex';
        playlistElement.innerHTML = '<p>Cargando canciones...</p>';
        songTitle.textContent = 'Selecciona una canción';
        songArtist.textContent = '';
        coverImage.src = '';
        audioPlayer.src = '';
        playlistConfig = [];
        originalPlaylist = [];
        currentTrackIndex = 0;
        isPlaying = false;
        btnPlay.classList.remove('playing');
        btnPlay.setAttribute('aria-label', 'Reproducir');
        repeatMode = 'off';
        isShuffled = false;
        btnRepeat.classList.remove('active', 'repeat-one');
        btnShuffle.classList.remove('active');
        btnRepeat.setAttribute('aria-label', 'Repetir');
        btnShuffle.setAttribute('aria-label', 'Mezclar');
        currentAlbumId = albumId;
        currentAlbumCover = albumImage || 'https://archive.org/services/img/' + albumId;
        hideFloatingButton();
        history.pushState({ modal: 'player' }, '', '#player');

        if (albumId === 'queen_greatest_hits') {
            coverImage.src = 'https://via.placeholder.com/150';
            songArtist.textContent = 'Queen';
            playlistConfig = mockTracks;
            originalPlaylist = [...mockTracks];
            currentAlbumCover = mockTracks[0].coverUrl;
            initPlayer();
        } else {
            fetch('https://archive.org/metadata/' + albumId, { headers: { 'User-Agent': 'Mozilla/5.0' } })
                .then(function(response) {
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    return response.json();
                })
                .then(function(data) {
                    var coverUrl = 'https://archive.org/services/img/' + albumId;
                    var artist = normalizeCreator(data.metadata ? (data.metadata.creator || data.metadata.artist || 'Desconocido') : 'Desconocido');
                    songArtist.textContent = artist;
                    playlistConfig = data.files
                        .filter(function(file) { return file.name && /\.mp3$/i.test(file.name); })
                        .map(function(file) {
                            return {
                                title: extractSongTitle(file.name),
                                artist: artist,
                                mp3Url: 'https://archive.org/download/' + albumId + '/' + encodeURIComponent(file.name).replace(/\+/g, '%20'),
                                coverUrl: coverUrl
                            };
                        });

                    if (playlistConfig.length === 0) {
                        playlistElement.innerHTML = '<p>No se encontraron canciones MP3</p>';
                        currentAlbumId = null;
                        currentAlbumCover = null;
                        return;
                    }

                    originalPlaylist = [...playlistConfig];
                    coverImage.src = coverUrl;
                    coverImage.addEventListener('error', function() {
                        this.src = 'https://via.placeholder.com/150';
                    });
                    initPlayer();
                })
                .catch(function(error) {
                    playlistElement.innerHTML = '<p>Error: ' + error.message + '. Usando datos de prueba.</p>';
                    playlistConfig = mockTracks;
                    originalPlaylist = [...mockTracks];
                    coverImage.src = 'https://via.placeholder.com/150';
                    songArtist.textContent = 'Queen';
                    currentAlbumId = 'queen_greatest_hits';
                    currentAlbumCover = mockTracks[0].coverUrl;
                    initPlayer();
                });
        }
    }

    function extractSongTitle(fileName) {
        try {
            var name = fileName.replace(/\.mp3$/i, '').replace(/\.wav$/i, '');
            var lastSlash = name.lastIndexOf('/');
            if (lastSlash !== -1) {
                name = name.substring(lastSlash + 1);
                var dotIndex = name.indexOf('.');
                if (dotIndex !== -1 && dotIndex < 3) {
                    name = name.substring(dotIndex + 1).trim();
                }
            }
            return name.replace(/_/g, ' ');
        } catch (e) {
            return fileName.replace(/\.mp3$/i, '').replace(/\.wav$/i, '').replace(/_/g, ' ');
        }
    }

    function initPlayer() {
        renderPlaylist();
        loadTrack(currentTrackIndex);
        audioPlayer.volume = 1.0;
        btnPlay.classList.remove('playing');
        btnPlay.setAttribute('aria-label', 'Reproducir');
    }

    function renderPlaylist() {
        playlistElement.innerHTML = '';
        playlistConfig.forEach(function(track, index) {
            var item = document.createElement('div');
            item.className = 'playlist-item' + (index === currentTrackIndex ? ' active' : '');
            item.innerHTML = '<img src="' + track.coverUrl + '" alt="' + track.title + '" /><div class="playlist-item-info"><h3>' + track.title + '</h3><p>' + track.artist + '</p></div>';
            item.addEventListener('click', function() {
                currentTrackIndex = index;
                loadTrack(currentTrackIndex);
                audioPlayer.play().then(function() {
                    isPlaying = true;
                    btnPlay.classList.add('playing');
                    btnPlay.setAttribute('aria-label', 'Pausar');
                }).catch(function(error) {});
            });
            item.querySelector('img').addEventListener('error', function() {
                this.src = 'https://via.placeholder.com/40';
            });
            playlistElement.appendChild(item);
        });
        var activeItem = playlistElement.querySelector('.playlist-item.active');
        if (activeItem) {
            playlistElement.scrollTop = activeItem.offsetTop - 50;
        }
    }

    function loadTrack(index) {
        var track = playlistConfig[index];
        if (!track) return;
        songTitle.textContent = track.title;
        songArtist.textContent = track.artist;
        coverImage.src = track.coverUrl;
        audioPlayer.src = track.mp3Url;
        btnDownload.setAttribute('href', track.mp3Url);
        btnDownload.setAttribute('download', track.title + '.mp3');
        renderPlaylist();
        if (isPlaying) {
            audioPlayer.play().then(function() {
                isPlaying = true;
                btnPlay.classList.add('playing');
                btnPlay.setAttribute('aria-label', 'Pausar');
            }).catch(function(error) {});
        }
    }

    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        var minutes = Math.floor(seconds / 60);
        var secs = Math.floor(seconds % 60);
        return minutes + ':' + (secs < 10 ? '0' : '') + secs;
    }

    function updateProgress() {
        if (isNaN(audioPlayer.duration)) return;
        var currentTime = audioPlayer.currentTime || 0;
        var duration = audioPlayer.duration || 0;
        var progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
        progress.style.width = progressPercent + '%';
        currentTimeElement.textContent = formatTime(currentTime);
        durationElement.textContent = formatTime(duration);
    }

    function setProgress(e) {
        if (isNaN(audioPlayer.duration)) return;
        var width = progressBar.clientWidth;
        var clickX = e.offsetX;
        var duration = audioPlayer.duration;
        audioPlayer.currentTime = (clickX / width) * duration;
    }

    function togglePlay() {
        if (isPlaying) {
            audioPlayer.pause();
            isPlaying = false;
            btnPlay.classList.remove('playing');
            btnPlay.setAttribute('aria-label', 'Reproducir');
        } else {
            audioPlayer.play().then(function() {
                isPlaying = true;
                btnPlay.classList.add('playing');
                btnPlay.setAttribute('aria-label', 'Pausar');
            }).catch(function(error) {});
        }
    }

    function nextTrack() {
        if (repeatMode === 'one') {
            loadTrack(currentTrackIndex);
        } else {
            currentTrackIndex = (currentTrackIndex + 1) % playlistConfig.length;
            loadTrack(currentTrackIndex);
        }
        audioPlayer.play().then(function() {
            isPlaying = true;
            btnPlay.classList.add('playing');
            btnPlay.setAttribute('aria-label', 'Pausar');
        }).catch(function(error) {});
    }

    function prevTrack() {
        if (repeatMode === 'one') {
            loadTrack(currentTrackIndex);
        } else {
            currentTrackIndex = (currentTrackIndex - 1 + playlistConfig.length) % playlistConfig.length;
            loadTrack(currentTrackIndex);
        }
        audioPlayer.play().then(function() {
            isPlaying = true;
            btnPlay.classList.add('playing');
            btnPlay.setAttribute('aria-label', 'Pausar');
        }).catch(function(error) {});
    }

    function toggleRepeat() {
        if (repeatMode === 'off') {
            repeatMode = 'all';
            btnRepeat.classList.add('active');
            btnRepeat.classList.remove('repeat-one');
            btnRepeat.setAttribute('aria-label', 'Repetir todo');
        } else if (repeatMode === 'all') {
            repeatMode = 'one';
            btnRepeat.classList.add('active', 'repeat-one');
            btnRepeat.setAttribute('aria-label', 'Repetir uno');
        } else {
            repeatMode = 'off';
            btnRepeat.classList.remove('active', 'repeat-one');
            btnRepeat.setAttribute('aria-label', 'Repetir');
        }
        audioPlayer.loop = repeatMode === 'one';
    }

    function toggleShuffle() {
        isShuffled = !isShuffled;
        btnShuffle.setAttribute('aria-label', isShuffled ? 'Desactivar mezclar' : 'Mezclar');
        if (isShuffled) {
            btnShuffle.classList.add('active');
            var currentTrack = playlistConfig[currentTrackIndex];
            playlistConfig = shuffleArray([...playlistConfig]);
            currentTrackIndex = playlistConfig.findIndex(track => track.mp3Url === currentTrack.mp3Url);
        } else {
            btnShuffle.classList.remove('active');
            var currentTrack = playlistConfig[currentTrackIndex];
            playlistConfig = [...originalPlaylist];
            currentTrackIndex = playlistConfig.findIndex(track => track.mp3Url === currentTrack.mp3Url);
        }
        renderPlaylist();
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function downloadTrack() {
        var url = btnDownload.getAttribute('href');
        var filename = btnDownload.getAttribute('download');
        if (!url) return;
        // No es necesario crear un enlace dinámico, el atributo download maneja la descarga
    }

    audioPlayer.addEventListener('play', function() {
        isPlaying = true;
        btnPlay.classList.add('playing');
        btnPlay.setAttribute('aria-label', 'Pausar');
    });

    audioPlayer.addEventListener('pause', function() {
        isPlaying = false;
        btnPlay.classList.remove('playing');
        btnPlay.setAttribute('aria-label', 'Reproducir');
    });

    audioPlayer.addEventListener('ended', function() {
        isPlaying = false;
        btnPlay.classList.remove('playing');
        btnPlay.setAttribute('aria-label', 'Reproducir');
        if (repeatMode === 'one') {
            loadTrack(currentTrackIndex);
            audioPlayer.play().then(() => {
                isPlaying = true;
                btnPlay.classList.add('playing');
                btnPlay.setAttribute('aria-label', 'Pausar');
            });
        } else if (repeatMode === 'all') {
            nextTrack();
        } else {
            if (currentTrackIndex < playlistConfig.length - 1) {
                nextTrack();
            }
        }
    });

    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('loadedmetadata', function() {
        updateProgress();
    });
    audioPlayer.addEventListener('error', function(e) {
        currentAlbumId = null;
        currentAlbumCover = null;
    });
    progressBar.addEventListener('click', setProgress);
    btnPlay.addEventListener('click', togglePlay);
    btnNext.addEventListener('click', nextTrack);
    btnPrev.addEventListener('click', prevTrack);
    btnRepeat.addEventListener('click', toggleRepeat);
    btnShuffle.addEventListener('click', toggleShuffle);
    btnDownload.addEventListener('click', downloadTrack);

    closeModal.addEventListener('click', function() {
        closePlayerModal();
        history.back();
    });
});
