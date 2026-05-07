// audio-engine.js — Web Audio API engine
let audioCtx, masterGain, masterCompressor, reverbBuffer, masterLow, masterMid, masterHigh, duckingCount = 0;

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterCompressor = audioCtx.createDynamicsCompressor();
    masterCompressor.threshold.value = -3; masterCompressor.knee.value = 5;
    masterCompressor.ratio.value = 15; masterCompressor.attack.value = 0.005;
    masterCompressor.release.value = 0.25;
    masterCompressor.connect(audioCtx.destination);

    masterLow = audioCtx.createBiquadFilter(); masterLow.type = 'lowshelf'; masterLow.frequency.value = 250;
    masterMid = audioCtx.createBiquadFilter(); masterMid.type = 'peaking'; masterMid.frequency.value = 1000; masterMid.Q.value = 1;
    masterHigh = audioCtx.createBiquadFilter(); masterHigh.type = 'highshelf'; masterHigh.frequency.value = 4000;

    masterGain = audioCtx.createGain();
    masterGain.gain.value = state.masterVolume;
    masterGain.connect(masterLow); masterLow.connect(masterMid); masterMid.connect(masterHigh); masterHigh.connect(masterCompressor);

    reverbBuffer = audioCtx.createBuffer(2, audioCtx.sampleRate * 2, audioCtx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = reverbBuffer.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1)*Math.exp(-i/(audioCtx.sampleRate*0.4)); }
}

function duckBGM(isDucking) {
    if (!audioCtx) return;
    duckingCount = isDucking ? duckingCount + 1 : Math.max(0, duckingCount - 1);
    const tv = duckingCount > 0 ? 0.15 : 1.0;
    state.activeAudios.forEach((entry, id) => {
        const s = state.sounds.find(x => x.id === id);
        if (s && (s.category === 'music' || s.category === 'ambient'))
            entry.gainNode.gain.setTargetAtTime((s.config?.volume||1)*tv, audioCtx.currentTime, 0.5);
    });
}

function playSound(sound) {
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (!sound.config) sound.config = createDefaultConfig(sound.category);
    const cfg = sound.config, audio = new Audio(sound.url);
    audio.crossOrigin = "anonymous"; audio.loop = sound.loop; audio.playbackRate = cfg.speed || 1;
    if (cfg.ducking) duckBGM(true);

    const source = audioCtx.createMediaElementSource(audio);
    const gainNode = audioCtx.createGain(); gainNode.gain.value = 0;
    const panner = audioCtx.createStereoPanner(); panner.pan.value = cfg.pan || 0;
    let cur = source;

    if (cfg.filter === 'lowpass' || cfg.filter === 'highpass') {
        const f = audioCtx.createBiquadFilter(); f.type = cfg.filter;
        f.frequency.value = cfg.filter === 'lowpass' ? 800 : 2000;
        cur.connect(f); cur = f;
    }
    if (cfg.delay) {
        const d = audioCtx.createDelay(1); d.delayTime.value = 0.3;
        const fb = audioCtx.createGain(); fb.gain.value = 0.3;
        cur.connect(d); d.connect(fb); fb.connect(d); d.connect(panner);
    }
    if (cfg.reverb && reverbBuffer) {
        const cv = audioCtx.createConvolver(); cv.buffer = reverbBuffer;
        const wg = audioCtx.createGain(); wg.gain.value = 0.5;
        cur.connect(cv); cv.connect(wg); wg.connect(panner);
    }
    cur.connect(panner); panner.connect(gainNode); gainNode.connect(masterGain);

    const v = cfg.volume || 1;
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    if (cfg.fadeIn > 0) gainNode.gain.linearRampToValueAtTime(v, audioCtx.currentTime + cfg.fadeIn);
    else gainNode.gain.setValueAtTime(v, audioCtx.currentTime);

    audio.onended = () => { if (!audio.loop) stopSound(sound.id); };
    audio.ontimeupdate = () => {
        const p = (audio.currentTime / audio.duration) * 100;
        const bar = document.getElementById('progress-' + sound.id);
        if (bar) bar.style.width = p + '%';
        const te = document.getElementById('time-' + sound.id);
        if (te) { const fmt = t => { if(isNaN(t)) return '00:00'; return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0'); }; te.textContent = fmt(audio.currentTime)+' / '+fmt(audio.duration); }
    };
    audio.play().catch(e => console.error("Erro ao reproduzir:", e));
    state.activeAudios.set(sound.id, { audio, gainNode, source, panner });
    renderSoundboard(); updateActiveTracks(); saveState();
}

function stopSound(id) {
    const entry = state.activeAudios.get(id);
    if (!entry) return;
    const sound = state.sounds.find(s => s.id === id);
    const fo = sound?.config?.fadeOut ?? 0.5;
    if (audioCtx && fo > 0) {
        entry.gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
        entry.gainNode.gain.setValueAtTime(entry.gainNode.gain.value, audioCtx.currentTime);
        entry.gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + fo);
        setTimeout(() => { entry.audio.pause(); entry.audio.currentTime = 0; }, fo * 1000);
    } else { entry.audio.pause(); entry.audio.currentTime = 0; }
    state.activeAudios.delete(id);
    if (sound?.config?.ducking) duckBGM(false);
    renderSoundboard(); updateActiveTracks();
}

function stopAll() {
    const fo = state.global.fadeTime;
    state.activeAudios.forEach((entry) => {
        if (audioCtx && fo > 0) {
            entry.gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
            entry.gainNode.gain.setValueAtTime(entry.gainNode.gain.value, audioCtx.currentTime);
            entry.gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + fo);
            setTimeout(() => { entry.audio.pause(); entry.audio.currentTime = 0; }, fo * 1000);
        } else { entry.audio.pause(); entry.audio.currentTime = 0; }
    });
    state.activeAudios.clear(); duckingCount = 0;
    renderSoundboard(); updateActiveTracks();
}

function toggleSound(sound) { state.activeAudios.has(sound.id) ? stopSound(sound.id) : playSound(sound); }
