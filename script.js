// Configuration & Initial State
const DEFAULT_SOUNDS = [
    { id: 1, name: 'Sino de Teatro', url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a1656a.mp3', category: 'sfx', loop: false },
    { id: 2, name: 'Aplausos', url: 'https://cdn.pixabay.com/audio/2021/08/04/audio_32341901c0.mp3', category: 'sfx', loop: false },
    { id: 3, name: 'Chuva Suave', url: 'https://cdn.pixabay.com/audio/2022/01/18/audio_8340d99f82.mp3', category: 'ambient', loop: true },
    { id: 4, name: 'Mistério Ambient', url: 'https://cdn.pixabay.com/audio/2023/10/26/audio_99622d1490.mp3', category: 'music', loop: true },
    { id: 5, name: 'Vento Forte', url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_2910795c61.mp3', category: 'ambient', loop: true },
    { id: 6, name: 'Riso Maléfico', url: 'https://cdn.pixabay.com/audio/2022/10/30/audio_55a2957774.mp3', category: 'sfx', loop: false },
];

const state = {
    masterVolume: 0.7,
    sounds: [...DEFAULT_SOUNDS],
    activeAudios: new Map(), // soundId -> HTMLAudioElement
    filter: 'all'
};

// DOM Elements
const soundboard = document.getElementById('soundboard');
const masterVolInput = document.getElementById('master-volume');
const panicBtn = document.getElementById('panic-button');
const fileInput = document.getElementById('file-input');
const addCustomBtn = document.getElementById('add-custom');
const activeTracksList = document.getElementById('active-tracks-list');
const catButtons = document.querySelectorAll('.cat-btn');
const mainTimer = document.getElementById('main-timer');

// Initialize
function init() {
    renderSoundboard();
    setupEventListeners();
    startTimer();
}

// Rendering
function renderSoundboard() {
    soundboard.innerHTML = '';
    const filtered = state.filter === 'all' 
        ? state.sounds 
        : state.sounds.filter(s => s.category === state.filter);

    filtered.forEach(sound => {
        const card = document.createElement('div');
        card.className = `sound-card ${state.activeAudios.has(sound.id) ? 'playing' : ''}`;
        card.innerHTML = `
            <div class="sound-info">
                <span class="sound-name">${sound.name}</span>
                <span class="sound-meta">${sound.category.toUpperCase()}</span>
            </div>
            <div class="sound-controls">
                <button class="loop-toggle ${sound.loop ? 'active' : ''}" data-id="${sound.id}">
                    LOOP
                </button>
                <input type="range" class="vol-slider" min="0" max="1" step="0.1" value="1" data-id="${sound.id}">
            </div>
        `;

        card.onclick = (e) => {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
                toggleSound(sound);
            }
        };

        const loopBtn = card.querySelector('.loop-toggle');
        loopBtn.onclick = (e) => {
            e.stopPropagation();
            sound.loop = !sound.loop;
            loopBtn.classList.toggle('active', sound.loop);
            const active = state.activeAudios.get(sound.id);
            if (active) active.loop = sound.loop;
        };

        const volSlider = card.querySelector('.vol-slider');
        volSlider.onclick = (e) => e.stopPropagation();
        volSlider.oninput = (e) => {
            const active = state.activeAudios.get(sound.id);
            if (active) active.volume = e.target.value * state.masterVolume;
        };

        soundboard.appendChild(card);
    });
}

function updateActiveTracks() {
    const musicTracks = Array.from(state.activeAudios.entries())
        .filter(([id, audio]) => {
            const sound = state.sounds.find(s => s.id === id);
            return sound && (sound.category === 'music' || sound.category === 'ambient' || sound.loop);
        });

    if (musicTracks.length === 0) {
        activeTracksList.innerHTML = '<div class="empty-state">Nenhuma trilha longa em execução.</div>';
        return;
    }

    activeTracksList.innerHTML = '';
    musicTracks.forEach(([id, audio]) => {
        const sound = state.sounds.find(s => s.id === id);
        const trackRow = document.createElement('div');
        trackRow.className = 'bgm-track';
        trackRow.innerHTML = `
            <div class="track-name">${sound.name}</div>
            <div class="track-progress">
                <div class="progress-bar" id="progress-${id}"></div>
            </div>
            <button class="panic-btn" style="padding: 4px 10px; font-size: 0.7rem;">PARAR</button>
        `;
        
        trackRow.querySelector('button').onclick = () => stopSound(sound.id);
        activeTracksList.appendChild(trackRow);
    });
}

// Audio Logic
function toggleSound(sound) {
    if (state.activeAudios.has(sound.id)) {
        stopSound(sound.id);
    } else {
        playSound(sound);
    }
}

function playSound(sound) {
    const audio = new Audio(sound.url);
    audio.loop = sound.loop;
    audio.volume = state.masterVolume;
    
    audio.onended = () => {
        if (!audio.loop) {
            stopSound(sound.id);
        }
    };

    audio.ontimeupdate = () => {
        const progress = (audio.currentTime / audio.duration) * 100;
        const bar = document.getElementById(`progress-${sound.id}`);
        if (bar) bar.style.width = `${progress}%`;
    };

    audio.play().catch(err => console.error("Erro ao reproduzir:", err));
    state.activeAudios.set(sound.id, audio);
    
    renderSoundboard();
    updateActiveTracks();
}

function stopSound(id) {
    const audio = state.activeAudios.get(id);
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        state.activeAudios.delete(id);
    }
    renderSoundboard();
    updateActiveTracks();
}

function stopAll() {
    state.activeAudios.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
    });
    state.activeAudios.clear();
    renderSoundboard();
    updateActiveTracks();
}

// Event Listeners
function setupEventListeners() {
    masterVolInput.oninput = (e) => {
        state.masterVolume = e.target.value;
        state.activeAudios.forEach((audio, id) => {
            const sound = state.sounds.find(s => s.id === id);
            // Poderia ter um volume individual multiplicado pelo master
            audio.volume = state.masterVolume;
        });
    };

    panicBtn.onclick = stopAll;
    
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') stopAll();
    });

    addCustomBtn.onclick = () => fileInput.click();

    fileInput.onchange = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const url = URL.createObjectURL(file);
            const newSound = {
                id: Date.now() + Math.random(),
                name: file.name.split('.')[0],
                url: url,
                category: 'sfx',
                loop: false
            };
            state.sounds.push(newSound);
        });
        renderSoundboard();
    };

    catButtons.forEach(btn => {
        btn.onclick = () => {
            catButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.filter = btn.dataset.category;
            renderSoundboard();
        };
    });
}

function startTimer() {
    let seconds = 0;
    setInterval(() => {
        seconds++;
        const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
        const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const secs = String(seconds % 60).padStart(2, '0');
        mainTimer.textContent = `${hrs}:${mins}:${secs}`;
    }, 1000);
}

// Start the app
init();
