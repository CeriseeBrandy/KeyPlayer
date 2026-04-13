const { ipcRenderer, webUtils, shell } = require('electron');
const jsmediatags = require('jsmediatags');
const fs = require('fs');
const nodePath = require('path');

// --- ÉLÉMENTS ---
const mainVideo = document.getElementById('mainVideo');
const placeholderScene = document.getElementById('kp-placeholder-scene');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const stopBtn = document.getElementById('stopBtn');
const repeatBtn = document.getElementById('repeatBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const subtitleBtn = document.getElementById('subtitleBtn');
const progressSlider = document.getElementById('seekSlider');
const progressFill = document.getElementById('progress-fill');
const timeDisplay = document.querySelector('.kp-time-display');
const volumeSlider = document.querySelector('.kp-volume-slider');
const volumeBtn = document.getElementById('volumeBtn');

// --- ÉLÉMENTS AUDIO ---
const trackTitle = document.getElementById('track-title');
const trackArtist = document.getElementById('track-artist');
const coverImg = document.getElementById('kp-placeholder-image');
const coverCenter = document.getElementById('audio-cover-center');
const soraBubble = document.getElementById('sora-welcome-bubble');

// --- ÉLÉMENTS FULLSCREEN ---
const controlsBar = document.querySelector('.kp-controls');
const headerArea = document.querySelector('.kp-header-area');
const container = document.querySelector('.keyplayer-container');
const videoZone = document.querySelector('.kp-video-zone');

// --- VARIABLES ---
let playlist = [];
let currentIndex = 0;
let lastVolume = 1;
let isMuted = false;
let isDragging = false;
let hideControlsTimer = null;
let isFullscreen = false;

// --- Discord RPC ---
let currentMediaTitle = '';
let currentMediaArtist = '';
let discordUpdateTimer = null;

// --- REPEAT / SHUFFLE ---
let repeatMode = 0;
let shuffleMode = false;
let shuffledPlaylist = [];

// --- SOUS-TITRES ---
let subtitlesVisible = true;
let subtitleObjectURL = null;

// --- FONCTIONS FENÊTRE ---
window.close = () => ipcRenderer.send('close-app');
window.minimize = () => ipcRenderer.send('minimize-app');
window.toggleFullscreen = () => ipcRenderer.send('toggle-fullscreen');

// --- GITHUB ---
window.openGithub = () => {
    shell.openExternal('https://github.com/CeriseeBrandy');
};

// ==========================================
// 1. SYSTÈME DE TRADUCTION (i18n)
// ==========================================

const TRANSLATIONS = {
    fr: {
        'menu.media': 'Média',
        'menu.openFile': 'Ouvrir un fichier...',
        'menu.openFiles': 'Ouvrir plusieurs fichiers...',
        'menu.openFolder': 'Ouvrir un dossier...',
        'menu.loadSubs': 'Charger des sous-titres...',
        'menu.quit': 'Quitter',
        'menu.audio': 'Audio',
        'menu.audioOutput': 'Sortie audio',
        'menu.audioLoading': 'Chargement des périphériques...',
        'menu.audioNone': 'Aucun périphérique trouvé',
        'menu.audioError': 'Erreur de chargement',
        'menu.settings': 'Paramètres',
        'menu.language': 'Langue / Language',
        'menu.help': 'Aide',
        'controls.speed': 'Vitesse',
        'controls.repeatOff': 'Répétition : désactivée',
        'controls.repeatOne': 'Répétition : une piste',
        'controls.repeatAll': 'Répétition : toute la playlist',
        'controls.shuffleOn': 'Aléatoire : activé',
        'controls.shuffleOff': 'Aléatoire : désactivé',
        'controls.subsOn': 'Sous-titres : activés',
        'controls.subsOff': 'Sous-titres : désactivés',
        'controls.subsNone': 'Aucun sous-titre chargé',
        'media.loading': 'Chargement...',
        'media.unknownArtist': 'Artiste inconnu',
        'media.localFile': 'Fichier local',
        'discord.idle': '📂 En attente de média',
        'discord.idleState': 'Dans le menu',
        'discord.playing': 'Lecture en cours',
    },
    en: {
        'menu.media': 'Media',
        'menu.openFile': 'Open file...',
        'menu.openFiles': 'Open multiple files...',
        'menu.openFolder': 'Open folder...',
        'menu.loadSubs': 'Load subtitles...',
        'menu.quit': 'Quit',
        'menu.audio': 'Audio',
        'menu.audioOutput': 'Audio output',
        'menu.audioLoading': 'Loading devices...',
        'menu.audioNone': 'No device found',
        'menu.audioError': 'Loading error',
        'menu.settings': 'Settings',
        'menu.language': 'Langue / Language',
        'menu.help': 'Help',
        'controls.speed': 'Speed',
        'controls.repeatOff': 'Repeat: off',
        'controls.repeatOne': 'Repeat: one track',
        'controls.repeatAll': 'Repeat: whole playlist',
        'controls.shuffleOn': 'Shuffle: on',
        'controls.shuffleOff': 'Shuffle: off',
        'controls.subsOn': 'Subtitles: on',
        'controls.subsOff': 'Subtitles: off',
        'controls.subsNone': 'No subtitles loaded',
        'media.loading': 'Loading...',
        'media.unknownArtist': 'Unknown artist',
        'media.localFile': 'Local file',
        'discord.idle': '📂 Waiting for media',
        'discord.idleState': 'In menu',
        'discord.playing': 'Now playing',
    },
    es: {
        'menu.media': 'Medios',
        'menu.openFile': 'Abrir archivo...',
        'menu.openFiles': 'Abrir varios archivos...',
        'menu.openFolder': 'Abrir carpeta...',
        'menu.loadSubs': 'Cargar subtítulos...',
        'menu.quit': 'Salir',
        'menu.audio': 'Audio',
        'menu.audioOutput': 'Salida de audio',
        'menu.audioLoading': 'Cargando dispositivos...',
        'menu.audioNone': 'No se encontraron dispositivos',
        'menu.audioError': 'Error al cargar',
        'menu.settings': 'Configuración',
        'menu.language': 'Langue / Language',
        'menu.help': 'Ayuda',
        'controls.speed': 'Velocidad',
        'controls.repeatOff': 'Repetir: desactivado',
        'controls.repeatOne': 'Repetir: una pista',
        'controls.repeatAll': 'Repetir: toda la lista',
        'controls.shuffleOn': 'Aleatorio: activado',
        'controls.shuffleOff': 'Aleatorio: desactivado',
        'controls.subsOn': 'Subtítulos: activados',
        'controls.subsOff': 'Subtítulos: desactivados',
        'controls.subsNone': 'No hay subtítulos cargados',
        'media.loading': 'Cargando...',
        'media.unknownArtist': 'Artista desconocido',
        'media.localFile': 'Archivo local',
        'discord.idle': '📂 Esperando medios',
        'discord.idleState': 'En el menú',
        'discord.playing': 'Reproduciendo',
    },
    ja: {
        'menu.media': 'メディア',
        'menu.openFile': 'ファイルを開く...',
        'menu.openFiles': '複数ファイルを開く...',
        'menu.openFolder': 'フォルダを開く...',
        'menu.loadSubs': '字幕を読み込む...',
        'menu.quit': '終了',
        'menu.audio': 'オーディオ',
        'menu.audioOutput': 'オーディオ出力',
        'menu.audioLoading': 'デバイスを読み込み中...',
        'menu.audioNone': 'デバイスなし',
        'menu.audioError': '読み込みエラー',
        'menu.settings': '設定',
        'menu.language': 'Langue / Language',
        'menu.help': 'ヘルプ',
        'controls.speed': '速度',
        'controls.repeatOff': 'リピート: オフ',
        'controls.repeatOne': 'リピート: 1曲',
        'controls.repeatAll': 'リピート: 全曲',
        'controls.shuffleOn': 'シャッフル: オン',
        'controls.shuffleOff': 'シャッフル: オフ',
        'controls.subsOn': '字幕: オン',
        'controls.subsOff': '字幕: オフ',
        'controls.subsNone': '字幕なし',
        'media.loading': '読み込み中...',
        'media.unknownArtist': '不明なアーティスト',
        'media.localFile': 'ローカルファイル',
        'discord.idle': '📂 メディア待機中',
        'discord.idleState': 'メニュー中',
        'discord.playing': '再生中',
    },
    pt: {
        'menu.media': 'Mídia',
        'menu.openFile': 'Abrir arquivo...',
        'menu.openFiles': 'Abrir vários arquivos...',
        'menu.openFolder': 'Abrir pasta...',
        'menu.loadSubs': 'Carregar legendas...',
        'menu.quit': 'Sair',
        'menu.audio': 'Áudio',
        'menu.audioOutput': 'Saída de áudio',
        'menu.audioLoading': 'Carregando dispositivos...',
        'menu.audioNone': 'Nenhum dispositivo encontrado',
        'menu.audioError': 'Erro ao carregar',
        'menu.settings': 'Configurações',
        'menu.language': 'Langue / Language',
        'menu.help': 'Ajuda',
        'controls.speed': 'Velocidade',
        'controls.repeatOff': 'Repetir: desligado',
        'controls.repeatOne': 'Repetir: uma faixa',
        'controls.repeatAll': 'Repetir: lista inteira',
        'controls.shuffleOn': 'Aleatório: ativado',
        'controls.shuffleOff': 'Aleatório: desativado',
        'controls.subsOn': 'Legendas: ativadas',
        'controls.subsOff': 'Legendas: desativadas',
        'controls.subsNone': 'Nenhuma legenda carregada',
        'media.loading': 'Carregando...',
        'media.unknownArtist': 'Artista desconhecido',
        'media.localFile': 'Arquivo local',
        'discord.idle': '📂 Aguardando mídia',
        'discord.idleState': 'No menu',
        'discord.playing': 'Reproduzindo',
    },
    ru: {
        'menu.media': 'Медиа',
        'menu.openFile': 'Открыть файл...',
        'menu.openFiles': 'Открыть несколько файлов...',
        'menu.openFolder': 'Открыть папку...',
        'menu.loadSubs': 'Загрузить субтитры...',
        'menu.quit': 'Выйти',
        'menu.audio': 'Аудио',
        'menu.audioOutput': 'Аудиовыход',
        'menu.audioLoading': 'Загрузка устройств...',
        'menu.audioNone': 'Устройства не найдены',
        'menu.audioError': 'Ошибка загрузки',
        'menu.settings': 'Настройки',
        'menu.language': 'Langue / Language',
        'menu.help': 'Помощь',
        'controls.speed': 'Скорость',
        'controls.repeatOff': 'Повтор: выкл',
        'controls.repeatOne': 'Повтор: одна пауза',
        'controls.repeatAll': 'Повтор: весь список',
        'controls.shuffleOn': 'Перемешать: вкл',
        'controls.shuffleOff': 'Перемешать: выкл',
        'controls.subsOn': 'Субтитры: вкл',
        'controls.subsOff': 'Субтитры: выкл',
        'controls.subsNone': 'Субтитры не загружены',
        'media.loading': 'Загрузка...',
        'media.unknownArtist': 'Неизвестный исполнитель',
        'media.localFile': 'Локальный файл',
        'discord.idle': '📂 Ожидание медиа',
        'discord.idleState': 'В меню',
        'discord.playing': 'Воспроизведение',
    },
};


let currentLang = localStorage.getItem('kp-lang') || 'fr';

function t(key) {
    return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key])
        || TRANSLATIONS['fr'][key]
        || key;
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
    updateRepeatBtn();
    updateSubtitleBtn();
    shuffleBtn.title = shuffleMode ? t('controls.shuffleOn') : t('controls.shuffleOff');
    const audioLoading = document.querySelector('.kp-audio-loading');
    if (audioLoading) audioLoading.textContent = t('menu.audioLoading');
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('kp-lang', lang);
    applyTranslations();
    document.querySelectorAll('.kp-lang-item').forEach(el => {
        el.classList.toggle('kp-lang-active', el.dataset.lang === lang);
    });
}

document.querySelectorAll('.kp-lang-item').forEach(el => {
    el.addEventListener('click', () => setLanguage(el.dataset.lang));
});

applyTranslations();
document.querySelectorAll('.kp-lang-item').forEach(el => {
    el.classList.toggle('kp-lang-active', el.dataset.lang === currentLang);
});

// ==========================================
// 2. RACCOURCIS CLAVIER
// ==========================================

window.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'Space':
            e.preventDefault();
            togglePlay();
            break;
        case 'ArrowRight':
            mainVideo.currentTime += 5;
            break;
        case 'ArrowLeft':
            mainVideo.currentTime -= 5;
            break;
        case 'KeyF':
            ipcRenderer.send('toggle-fullscreen');
            break;
        case 'KeyM':
            toggleMute();
            break;
        case 'Escape':
            if (isFullscreen) ipcRenderer.send('toggle-fullscreen');
            break;
        case 'KeyR':
            cycleRepeat();
            break;
        case 'KeyS':
            toggleShuffle();
            break;
    }
});

// ==========================================
// 3. DISCORD RICH PRESENCE
// ==========================================

function updateDiscordRPC() {
    if (mainVideo.paused || !mainVideo.duration) return;
    const now = Math.floor(Date.now() / 1000);
    const startTimestamp = now - Math.floor(mainVideo.currentTime);
    const endTimestamp = now + Math.floor(mainVideo.duration - mainVideo.currentTime);
    ipcRenderer.send('discord-set-activity', {
        title: currentMediaTitle || t('discord.playing'),
        artist: currentMediaArtist || 'KeyPlayer',
        startTimestamp,
        endTimestamp,
    });
}

function startDiscordUpdates() {
    stopDiscordUpdates();
    updateDiscordRPC();
    discordUpdateTimer = setInterval(updateDiscordRPC, 15000);
}

function stopDiscordUpdates() {
    if (discordUpdateTimer) {
        clearInterval(discordUpdateTimer);
        discordUpdateTimer = null;
    }
}

function setIdleDiscordRPC() {
    ipcRenderer.send('discord-idle');
}

// ==========================================
// 4. REPEAT & SHUFFLE
// ==========================================

function cycleRepeat() {
    repeatMode = (repeatMode + 1) % 3;
    updateRepeatBtn();
}

function updateRepeatBtn() {
    repeatBtn.classList.remove('kp-opacity', 'kp-btn-active');
    switch(repeatMode) {
        case 0:
            repeatBtn.title = t('controls.repeatOff');
            repeatBtn.innerText = '↻';
            repeatBtn.classList.add('kp-opacity');
            break;
        case 1:
            repeatBtn.title = t('controls.repeatOne');
            repeatBtn.innerText = '🔂';
            repeatBtn.classList.add('kp-btn-active');
            break;
        case 2:
            repeatBtn.title = t('controls.repeatAll');
            repeatBtn.innerText = '🔁';
            repeatBtn.classList.add('kp-btn-active');
            break;
    }
}

function toggleShuffle() {
    shuffleMode = !shuffleMode;
    if (shuffleMode) {
        shuffledPlaylist = [...playlist].sort(() => Math.random() - 0.5);
    } else {
        shuffledPlaylist = [];
    }
    shuffleBtn.classList.toggle('kp-btn-active', shuffleMode);
    shuffleBtn.classList.toggle('kp-opacity', !shuffleMode);
    shuffleBtn.title = shuffleMode ? t('controls.shuffleOn') : t('controls.shuffleOff');
}

function getEffectivePlaylist() {
    return shuffleMode ? shuffledPlaylist : playlist;
}

function playNext(auto = false) {
    const list = getEffectivePlaylist();
    if (list.length === 0) return;
    if (repeatMode === 1 && auto) {
        mainVideo.currentTime = 0;
        mainVideo.play();
        return;
    }
    if (currentIndex < list.length - 1) {
        loadMediaFromList(currentIndex + 1);
    } else if (repeatMode === 2) {
        loadMediaFromList(0);
    }
}

function playPrev() {
    const list = getEffectivePlaylist();
    if (list.length === 0) return;
    if (currentIndex > 0) {
        loadMediaFromList(currentIndex - 1);
    } else if (repeatMode === 2) {
        loadMediaFromList(list.length - 1);
    }
}

repeatBtn.addEventListener('click', cycleRepeat);
shuffleBtn.addEventListener('click', toggleShuffle);
prevBtn.addEventListener('click', playPrev);
nextBtn.addEventListener('click', () => playNext());
stopBtn.addEventListener('click', () => {
    mainVideo.pause();
    mainVideo.currentTime = 0;
});

// ==========================================
// 5. SOUS-TITRES
// ==========================================

function loadSubtitleFile(filePath) {
    if (subtitleObjectURL) {
        URL.revokeObjectURL(subtitleObjectURL);
        subtitleObjectURL = null;
    }
    while (mainVideo.firstChild) {
        mainVideo.removeChild(mainVideo.firstChild);
    }

    const ext = nodePath.extname(filePath).toLowerCase();

    if (ext === '.srt') {
        try {
            const vttContent = srtToVtt(fs.readFileSync(filePath, 'utf-8'));
            const blob = new Blob([vttContent], { type: 'text/vtt' });
            subtitleObjectURL = URL.createObjectURL(blob);
            addTrackElement(subtitleObjectURL);
        } catch(e) { console.error('Erreur SRT:', e); }
    } else if (ext === '.vtt') {
        const blob = new Blob([fs.readFileSync(filePath)], { type: 'text/vtt' });
        subtitleObjectURL = URL.createObjectURL(blob);
        addTrackElement(subtitleObjectURL);
    } else if (ext === '.ass' || ext === '.ssa') {
        try {
            const vttContent = assToVtt(fs.readFileSync(filePath, 'utf-8'));
            const blob = new Blob([vttContent], { type: 'text/vtt' });
            subtitleObjectURL = URL.createObjectURL(blob);
            addTrackElement(subtitleObjectURL);
        } catch(e) { console.error('Erreur ASS:', e); }
    }

    subtitlesVisible = true;
    updateSubtitleBtn();
}

function addTrackElement(src) {
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.src = src;
    track.default = true;
    mainVideo.appendChild(track);
    if (mainVideo.textTracks.length > 0) {
        mainVideo.textTracks[0].mode = 'showing';
    }
}

function srtToVtt(srt) {
    return 'WEBVTT\n\n' + srt
        .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
        .replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, '$1:$2:$3.$4')
        .trim();
}

function assToVtt(ass) {
    let vtt = 'WEBVTT\n\n';
    let index = 1;
    for (const line of ass.split('\n')) {
        if (line.startsWith('Dialogue:')) {
            const parts = line.split(',');
            if (parts.length >= 10) {
                const start = assTimeToVtt(parts[1].trim());
                const end = assTimeToVtt(parts[2].trim());
                const text = parts.slice(9).join(',').replace(/\{[^}]+\}/g, '').trim();
                if (start && end && text) {
                    vtt += `${index}\n${start} --> ${end}\n${text}\n\n`;
                    index++;
                }
            }
        }
    }
    return vtt;
}

function assTimeToVtt(t) {
    const m = t.match(/(\d+):(\d{2}):(\d{2})\.(\d{2})/);
    if (!m) return null;
    const ms = (parseInt(m[4]) * 10).toString().padStart(3, '0');
    return `0${m[1]}:${m[2]}:${m[3]}.${ms}`;
}

function toggleSubtitles() {
    subtitlesVisible = !subtitlesVisible;
    if (mainVideo.textTracks.length > 0) {
        mainVideo.textTracks[0].mode = subtitlesVisible ? 'showing' : 'hidden';
    }
    updateSubtitleBtn();
}

function updateSubtitleBtn() {
    const hasSubs = mainVideo.textTracks.length > 0;
    subtitleBtn.classList.toggle('kp-opacity', !hasSubs || !subtitlesVisible);
    subtitleBtn.classList.toggle('kp-btn-active', hasSubs && subtitlesVisible);
    subtitleBtn.title = hasSubs
        ? (subtitlesVisible ? t('controls.subsOn') : t('controls.subsOff'))
        : t('controls.subsNone');
}

subtitleBtn.addEventListener('click', toggleSubtitles);

const subtitleInput = document.getElementById('subtitleInput');
subtitleInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        loadSubtitleFile(webUtils.getPathForFile(e.target.files[0]));
        e.target.value = '';
    }
});

function autoLoadSubtitles(mediaPath) {
    if (subtitleObjectURL) {
        URL.revokeObjectURL(subtitleObjectURL);
        subtitleObjectURL = null;
    }
    while (mainVideo.firstChild) mainVideo.removeChild(mainVideo.firstChild);
    updateSubtitleBtn();

    const base = mediaPath.replace(/\.[^.]+$/, '');
    for (const ext of ['.srt', '.vtt', '.ass', '.ssa']) {
        const subPath = base + ext;
        if (fs.existsSync(subPath)) {
            loadSubtitleFile(subPath);
            break;
        }
    }
}

// ==========================================
// 6. LOGIQUE DE CHARGEMENT & PLAYLIST
// ==========================================

function loadMediaFromList(index) {
    const list = getEffectivePlaylist();
    currentIndex = index;
    loadMediaPath(list[index]);
}

function loadMedia(index) {
    currentIndex = index;
    loadMediaPath(playlist[index]);
}

function loadMediaPath(path) {
    if (!path) return;
    const videoURL = `file:///${path.replace(/\\/g, '/')}`;
    const isAudio = path.match(/\.(mp3|wav|flac|ogg|m4a)$/i);

    mainVideo.src = videoURL;
    stopDiscordUpdates();

    if (isAudio) {
        if (isFullscreen) ipcRenderer.send('toggle-fullscreen');
        placeholderScene.style.display = 'flex';
        if (soraBubble) soraBubble.style.display = 'none';
        if (coverCenter) coverCenter.style.display = 'flex';

        coverImg.src = "assets/box.png";
        trackTitle.innerText = t('media.loading');
        trackArtist.innerText = "";
        currentMediaTitle = path.split('\\').pop();
        currentMediaArtist = '';

        jsmediatags.read(path, {
            onSuccess: function(tag) {
                const { title, artist, picture } = tag.tags;
                const resolvedTitle = title || path.split('\\').pop();
                const resolvedArtist = artist || t('media.unknownArtist');
                trackTitle.innerText = resolvedTitle;
                trackArtist.innerText = resolvedArtist;
                currentMediaTitle = resolvedTitle;
                currentMediaArtist = resolvedArtist;
                if (picture) {
                    let base64String = "";
                    for (let i = 0; i < picture.data.length; i++) {
                        base64String += String.fromCharCode(picture.data[i]);
                    }
                    coverImg.src = "data:" + picture.format + ";base64," + window.btoa(base64String);
                } else {
                    coverImg.src = "assets/box.png";
                }
            },
            onError: function() {
                const fallbackTitle = path.split('\\').pop();
                trackTitle.innerText = fallbackTitle;
                trackArtist.innerText = t('media.localFile');
                coverImg.src = "assets/box.png";
                currentMediaTitle = fallbackTitle;
                currentMediaArtist = t('media.localFile');
            }
        });
    } else {
        placeholderScene.style.display = 'none';
        if (soraBubble) soraBubble.style.display = 'block';
        if (coverCenter) coverCenter.style.display = 'none';
        currentMediaTitle = path.split('\\').pop();
        currentMediaArtist = '';
    }

    mainVideo.play().catch(() => {});
    autoLoadSubtitles(path);
    startDiscordUpdates();
}

// --- EVENTS VIDÉO ---
mainVideo.addEventListener('ended', () => playNext(true));

mainVideo.addEventListener('play', () => {
    playBtn.innerText = '⏸';
    startDiscordUpdates();
});

mainVideo.addEventListener('pause', () => {
    playBtn.innerText = '▶';
    stopDiscordUpdates();
    setIdleDiscordRPC();
});

playBtn.addEventListener('click', togglePlay);

// --- OUVERTURE FICHIERS ---
const fileInput = document.getElementById('fileInput');
const multiFileInput = document.getElementById('multiFileInput');
const folderInput = document.getElementById('folderInput');

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            playlist = [webUtils.getPathForFile(e.target.files[0])];
            if (shuffleMode) toggleShuffle();
            loadMedia(0);
            e.target.value = '';
        }
    });
}

if (multiFileInput || folderInput) {
    const handleMultiple = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            playlist = files.map(f => webUtils.getPathForFile(f)).filter(p => p !== null);
            if (shuffleMode) toggleShuffle();
            loadMedia(0);
        }
    };
    multiFileInput?.addEventListener('change', handleMultiple);
    folderInput?.addEventListener('change', handleMultiple);
}

document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
        playlist = files.map(f => webUtils.getPathForFile(f)).filter(p => p !== null);
        if (shuffleMode) toggleShuffle();
        loadMedia(0);
    }
});

function togglePlay() {
    if (mainVideo.paused) mainVideo.play();
    else mainVideo.pause();
}

function toggleMute() {
    if (!isMuted) {
        lastVolume = mainVideo.volume;
        mainVideo.volume = 0;
        volumeSlider.value = 0;
        volumeBtn.innerText = '🔇';
        isMuted = true;
    } else {
        mainVideo.volume = lastVolume > 0 ? lastVolume : 0.5;
        volumeSlider.value = mainVideo.volume * 100;
        volumeBtn.innerText = '🔊';
        isMuted = false;
    }
    updateVolumeBackground();
}

// ==========================================
// 7. BARRE DE PROGRESSION
// ==========================================

function updateProgressBar(percent) {
    if (!progressFill) return;
    progressFill.style.width = percent + "%";
}

function updateTimeDisplay() {
    if (!timeDisplay) return;
    const cur = mainVideo.currentTime || 0;
    const dur = mainVideo.duration || 0;
    timeDisplay.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;
}

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function updateUI() {
    if (mainVideo.duration) {
        const progress = (mainVideo.currentTime / mainVideo.duration) * 100;
        if (!isDragging) {
            progressSlider.value = progress;
            updateProgressBar(progress);
            updateTimeDisplay();
        }
    }
    requestAnimationFrame(updateUI);
}

progressSlider.addEventListener('mousedown', () => { isDragging = true; });
window.addEventListener('mouseup', () => { isDragging = false; });

progressSlider.addEventListener('input', () => {
    if (mainVideo.duration) {
        const progress = progressSlider.value;
        mainVideo.currentTime = (progress / 100) * mainVideo.duration;
        updateProgressBar(progress);
        updateTimeDisplay();
        updateDiscordRPC();
    }
});

requestAnimationFrame(updateUI);

// ==========================================
// 8. VOLUME ET DIVERS
// ==========================================

function updateVolumeBackground() {
    const val = volumeSlider.value;
    volumeSlider.style.background = `linear-gradient(to right, #ffd700 0%, #ffd700 ${val}%, #1a1a1a ${val}%, #1a1a1a 100%)`;
}

volumeSlider.addEventListener('input', () => {
    mainVideo.volume = volumeSlider.value / 100;
    isMuted = mainVideo.volume === 0;
    volumeBtn.innerText = isMuted ? '🔇' : '🔊';
    updateVolumeBackground();
});

volumeBtn.addEventListener('click', toggleMute);

volumeSlider.value = 100;
mainVideo.volume = 1;
updateVolumeBackground();

// ==========================================
// 9. VITESSE DE LECTURE
// ==========================================

const speedButtons = document.querySelectorAll('.kp-speed-btn');

speedButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed);
        mainVideo.playbackRate = speed;
        speedButtons.forEach(b => b.classList.remove('kp-speed-active'));
        btn.classList.add('kp-speed-active');
        updateDiscordRPC();
    });
});

// ==========================================
// 10. SORTIE AUDIO
// ==========================================

let currentAudioDeviceId = 'default';

async function loadAudioOutputs() {
    const list = document.getElementById('kp-audio-outputs-list');
    if (!list) return;
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(() => {});
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices.filter(d => d.kind === 'audiooutput');
        list.innerHTML = '';
        if (outputs.length === 0) {
            list.innerHTML = `<div class="kp-dropdown-item kp-audio-loading">${t('menu.audioNone')}</div>`;
            return;
        }
        outputs.forEach((device, i) => {
            const label = device.label || `${t('menu.audioOutput')} ${i + 1}`;
            const item = document.createElement('div');
            item.className = 'kp-dropdown-item kp-audio-device-item';
            item.dataset.deviceId = device.deviceId;
            item.innerHTML = `<span class="kp-audio-check">✓</span> ${label}`;
            if (device.deviceId === currentAudioDeviceId) item.classList.add('kp-audio-active');
            item.addEventListener('click', async () => {
                await setAudioOutput(device.deviceId);
                document.querySelectorAll('.kp-audio-device-item').forEach(el => el.classList.remove('kp-audio-active'));
                item.classList.add('kp-audio-active');
            });
            list.appendChild(item);
        });
    } catch (err) {
        list.innerHTML = `<div class="kp-dropdown-item kp-audio-loading">${t('menu.audioError')}</div>`;
    }
}

async function setAudioOutput(deviceId) {
    if (typeof mainVideo.setSinkId === 'function') {
        try {
            await mainVideo.setSinkId(deviceId);
            currentAudioDeviceId = deviceId;
        } catch (err) {
            console.error('Erreur setSinkId :', err);
        }
    }
}

const audioMenuContainer = document.querySelector('.kp-menu-item-container:nth-child(2)');
if (audioMenuContainer) {
    audioMenuContainer.addEventListener('mouseenter', () => loadAudioOutputs());
}

// ==========================================
// 11. MODE PLEIN ÉCRAN STYLE VLC
// ==========================================

function showControls() {
    controlsBar.classList.remove('kp-hidden');
    headerArea.classList.remove('kp-hidden');
    document.body.style.cursor = 'default';
}

function hideControls() {
    if (isFullscreen && !mainVideo.paused) {
        controlsBar.classList.add('kp-hidden');
        headerArea.classList.add('kp-hidden');
        document.body.style.cursor = 'none';
    }
}

function resetHideTimer() {
    clearTimeout(hideControlsTimer);
    showControls();
    hideControlsTimer = setTimeout(hideControls, 3000);
}

document.addEventListener('mousemove', () => {
    if (isFullscreen) resetHideTimer();
});

function applyFullscreenStyles() {
    document.body.classList.add('kp-fullscreen-active');
    container.style.borderRadius = '0';
    container.style.border = 'none';
    videoZone.style.position = 'fixed';
    videoZone.style.top = '0';
    videoZone.style.left = '0';
    videoZone.style.width = '100vw';
    videoZone.style.height = '100vh';
    videoZone.style.zIndex = '1';
    mainVideo.style.width = '100vw';
    mainVideo.style.height = '100vh';
    controlsBar.style.position = 'fixed';
    controlsBar.style.bottom = '0';
    controlsBar.style.left = '0';
    controlsBar.style.right = '0';
    controlsBar.style.zIndex = '10000';
    controlsBar.style.background = '#1a1a1a';
    controlsBar.style.borderTop = '1px solid #333';
    controlsBar.style.backdropFilter = 'none';
    headerArea.style.position = 'fixed';
    headerArea.style.top = '0';
    headerArea.style.left = '0';
    headerArea.style.right = '0';
    headerArea.style.zIndex = '10000';
    headerArea.style.background = 'rgba(18, 18, 18, 0.95)';
    headerArea.style.borderBottom = 'none';
    headerArea.style.backdropFilter = 'none';
    document.querySelectorAll('.kp-dropdown-menu').forEach(menu => {
        menu.style.background = '#2b2b2b';
        menu.style.opacity = '1';
    });
}

function removeFullscreenStyles() {
    document.body.classList.remove('kp-fullscreen-active');
    container.style.borderRadius = '';
    container.style.border = '';
    videoZone.style.position = '';
    videoZone.style.top = '';
    videoZone.style.left = '';
    videoZone.style.width = '';
    videoZone.style.height = '';
    videoZone.style.zIndex = '';
    mainVideo.style.width = '';
    mainVideo.style.height = '';
    controlsBar.style.position = '';
    controlsBar.style.bottom = '';
    controlsBar.style.left = '';
    controlsBar.style.right = '';
    controlsBar.style.zIndex = '';
    controlsBar.style.background = '';
    controlsBar.style.borderTop = '';
    controlsBar.style.backdropFilter = '';
    headerArea.style.position = '';
    headerArea.style.top = '';
    headerArea.style.left = '';
    headerArea.style.right = '';
    headerArea.style.zIndex = '';
    headerArea.style.background = '';
    headerArea.style.borderBottom = '';
    headerArea.style.backdropFilter = '';
    document.querySelectorAll('.kp-dropdown-menu').forEach(menu => {
        menu.style.background = '';
        menu.style.opacity = '';
    });
    showControls();
}

ipcRenderer.on('fullscreen-changed', (event, fullscreen) => {
    isFullscreen = fullscreen;
    if (fullscreen) {
        applyFullscreenStyles();
        resetHideTimer();
    } else {
        removeFullscreenStyles();
        clearTimeout(hideControlsTimer);
    }
});

videoZone.addEventListener('dblclick', () => {
    ipcRenderer.send('toggle-fullscreen');
});

// ==========================================
// 12. IPC DEPUIS MAIN
// ==========================================

ipcRenderer.on('open-file-dialog', () => {
    fileInput?.click();
});

ipcRenderer.on('open-multi-file-dialog', () => {
    multiFileInput?.click();
});

ipcRenderer.on('open-folder-dialog', () => {
    folderInput?.click();
});

ipcRenderer.on('open-subtitle-dialog', () => {
    subtitleInput?.click();
});

ipcRenderer.on('quit-app', () => {
    window.close();
});
// ==========================================
// MÉMORISATION DE LA POSITION (AUTO-RESUME)
// ==========================================

// 1. Sauvegarde la position toutes les 5 secondes
mainVideo.addEventListener('timeupdate', () => {
    if (mainVideo.src && !mainVideo.paused) {
        if (Math.floor(mainVideo.currentTime) % 5 === 0) {
            localStorage.setItem('kp_last_file', mainVideo.src);
            localStorage.setItem('kp_last_time', mainVideo.currentTime);
        }
    }
});

// ==========================================
// MÉMORISATION DE LA POSITION (SANS AUTO-LOAD)
// ==========================================

// 1. On sauvegarde juste la position quand on lit un fichier
mainVideo.addEventListener('timeupdate', () => {
    if (mainVideo.src && !mainVideo.paused && mainVideo.currentTime > 0) {
        // On crée une clé unique pour chaque fichier pour ne pas mélanger les films
        localStorage.setItem('time_' + mainVideo.src, mainVideo.currentTime);
    }
});

// 2. Quand on charge un fichier (peu importe quand), on vérifie s'il y a une position sauvegardée
mainVideo.addEventListener('loadedmetadata', () => {
    const savedTime = localStorage.getItem('time_' + mainVideo.src);
    if (savedTime) {
        mainVideo.currentTime = parseFloat(savedTime);
        console.log("Position retrouvée pour ce fichier : " + savedTime + "s");
    }
});
// ==========================================
// RÉCEPTION DU FICHIER VIA DOUBLE-CLIC WINDOWS
// ==========================================
if (typeof ipcRenderer === 'undefined') {
    
}

ipcRenderer.on('open-file', (event, filePath) => {
    const videoElement = document.getElementById('mainVideo'); // Vérifie bien que l'id est 'mainVideo'
    if (videoElement) {
        videoElement.src = filePath;
        videoElement.play().catch(e => console.log("Lecture auto bloquée, cliquez sur Play"));
        
        // Optionnel : masquer la bulle de Sora si elle est affichée
        const soraBubble = document.getElementById('sora-welcome-bubble');
        if (soraBubble) soraBubble.style.display = 'none';
    }
});