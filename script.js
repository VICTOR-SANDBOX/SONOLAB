// script.js — SONOLAB Main Controller
const DEFAULT_SOUNDS = [
    { id: 1, name: 'Sino de Teatro', url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a1656a.mp3', category: 'sfx', loop: false },
    { id: 2, name: 'Aplausos', url: 'https://cdn.pixabay.com/audio/2021/08/04/audio_32341901c0.mp3', category: 'sfx', loop: false },
    { id: 3, name: 'Chuva Suave', url: 'https://cdn.pixabay.com/audio/2022/01/18/audio_8340d99f82.mp3', category: 'ambient', loop: true },
    { id: 4, name: 'Mistério Ambient', url: 'https://cdn.pixabay.com/audio/2023/10/26/audio_99622d1490.mp3', category: 'music', loop: true },
    { id: 5, name: 'Vento Forte', url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_2910795c61.mp3', category: 'ambient', loop: true },
    { id: 6, name: 'Riso Maléfico', url: 'https://cdn.pixabay.com/audio/2022/10/30/audio_55a2957774.mp3', category: 'sfx', loop: false },
];
function createDefaultConfig(cat) {
    return { volume:1, pan:0, speed:1, filter:'none', reverb:false, delay:false, ducking:cat==='sfx', fadeIn:cat==='sfx'?0:1, fadeOut:cat==='sfx'?0.2:2 };
}
const state = {
    masterVolume: 0.7,
    sounds: DEFAULT_SOUNDS.map(s => ({...s, config: createDefaultConfig(s.category)})),
    activeAudios: new Map(),
    filter: 'all',
    global: { fadeTime: 2, eqLow: 0, eqMid: 0, eqHigh: 0 },
    scriptLines: [
        { id: 1, text: 'Ato 1, Cena 1<br>(Luzes se acendem lentamente)' },
        { id: 2, text: 'Apresentador: "Senhoras e Senhores, o show vai começar!" <span class="inline-cue" contenteditable="false" data-sound-id="2">🎵 Aplausos</span>' }
    ]
};

// === Persistência ===
function saveState() {
    const data = { sounds: state.sounds, scriptLines: state.scriptLines, global: state.global, masterVolume: state.masterVolume, filter: state.filter };
    try { localStorage.setItem('sonolab_state', JSON.stringify(data)); } catch(e) {}
}
function loadState() {
    try {
        const raw = localStorage.getItem('sonolab_state');
        if (!raw) return;
        const d = JSON.parse(raw);
        if (d.sounds) state.sounds = d.sounds.map(s => ({...s, config: s.config || createDefaultConfig(s.category)}));
        if (d.scriptLines) state.scriptLines = d.scriptLines;
        if (d.global) state.global = d.global;
        if (d.masterVolume != null) state.masterVolume = d.masterVolume;
        if (d.filter) state.filter = d.filter;
    } catch(e) {}
}
function exportProject() {
    const data = { sounds: state.sounds, scriptLines: state.scriptLines, global: state.global, masterVolume: state.masterVolume };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'sonolab_projeto_' + new Date().toISOString().slice(0,10) + '.json'; a.click();
    showToast('Projeto exportado com sucesso!');
}
function importProject(file) {
    const r = new FileReader();
    r.onload = (e) => {
        try {
            const d = JSON.parse(e.target.result);
            if (d.sounds) state.sounds = d.sounds.map(s => ({...s, config: s.config || createDefaultConfig(s.category)}));
            if (d.scriptLines) state.scriptLines = d.scriptLines;
            if (d.global) state.global = d.global;
            if (d.masterVolume != null) { state.masterVolume = d.masterVolume; masterVolInput.value = d.masterVolume; }
            saveState(); renderCategories(); renderSoundboard(); renderScript();
            showToast('Projeto importado com sucesso!');
        } catch(err) { showToast('Erro: arquivo inválido.'); }
    };
    r.readAsText(file);
}
function showToast(msg) {
    const t = document.getElementById('toast'); t.textContent = msg; t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}

// === DOM ===
const soundboard = document.getElementById('soundboard');
const masterVolInput = document.getElementById('master-volume');
const panicBtn = document.getElementById('panic-button');
const fileInput = document.getElementById('file-input');
const addCustomBtn = document.getElementById('add-custom');
const activeTracksList = document.getElementById('active-tracks-list');
const mainTimer = document.getElementById('main-timer');
const addScriptBtn = document.getElementById('add-script-line');
const scriptList = document.getElementById('script-list');
const settingsModal = document.getElementById('settings-modal');
const closeModal = document.getElementById('close-modal');
const modalBody = document.getElementById('modal-body');
const modalTitle = document.getElementById('modal-title');
const globalSettingsBtn = document.getElementById('global-settings-btn');
const globalSettingsModal = document.getElementById('global-settings-modal');
const closeGlobalModal = document.getElementById('close-global-modal');
const globalModalBody = document.getElementById('global-modal-body');
let contextSoundId = null;

// === Init ===
function init() {
    loadState();
    masterVolInput.value = state.masterVolume;
    renderCategories(); renderSoundboard(); renderScript();
    setupEventListeners(); startTimer();
    makeDraggable('settings-modal'); makeDraggable('global-settings-modal');
}

function makeDraggable(id) {
    const m = document.getElementById(id); if(!m) return;
    const h = m.querySelector('.modal-header');
    let drag=false, ox=0, oy=0;
    h.onmousedown = (e) => { if(e.target.tagName==='BUTTON') return; drag=true; const r=m.getBoundingClientRect(); ox=e.clientX-r.left; oy=e.clientY-r.top; };
    document.addEventListener('mousemove', (e) => { if(!drag) return; m.style.left=(e.clientX-ox)+'px'; m.style.top=(e.clientY-oy)+'px'; m.style.transform='none'; });
    document.addEventListener('mouseup', () => { drag=false; });
}

// === Categorias ===
function renderCategories() {
    const nav = document.querySelector('.categories'); if(!nav) return;
    const sys = ['ambient','sfx','music'];
    const custom = [...new Set(state.sounds.map(s=>s.category))].filter(c=>!sys.includes(c));
    const all = [...sys, ...custom];
    const names = { ambient:'Ambiente', sfx:'Efeitos (SFX)', music:'Músicas' };
    nav.innerHTML = `<button class="cat-btn ${state.filter==='all'?'active':''}" data-category="all">Todos</button>`;
    all.forEach(c => { nav.innerHTML += `<button class="cat-btn ${state.filter===c?'active':''}" data-category="${c}">${names[c]||c.toUpperCase()}</button>`; });
    nav.querySelectorAll('.cat-btn').forEach(btn => {
        btn.onclick = () => { nav.querySelectorAll('.cat-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); state.filter=btn.dataset.category; renderSoundboard(); saveState(); };
        btn.oncontextmenu = (e) => {
            const cat = btn.dataset.category;
            if (['all','ambient','sfx','music'].includes(cat)) return;
            e.preventDefault();
            const sm = document.getElementById('sidebar-ctx-menu');
            document.getElementById('sidebar-ctx-name').textContent = cat.toUpperCase();
            sm.style.left = e.clientX+'px'; sm.style.top = e.clientY+'px'; sm.classList.remove('hidden');
            document.getElementById('sidebar-ctx-delete').onclick = () => {
                state.sounds.forEach(s => { if(s.category===cat) s.category='sfx'; });
                if(state.filter===cat) state.filter='all';
                sm.classList.add('hidden'); renderCategories(); renderSoundboard(); saveState();
                showToast('Categoria "'+cat+'" removida. Sons movidos para SFX.');
            };
        };
    });
}

// === Soundboard ===
function renderSoundboard() {
    soundboard.innerHTML = '';
    const list = state.filter==='all' ? state.sounds : state.sounds.filter(s=>s.category===state.filter);
    list.forEach((sound, idx) => {
        const card = document.createElement('div');
        card.className = `sound-card ${state.activeAudios.has(sound.id)?'playing':''}`;
        card.draggable = true;
        card.ondragstart = (e) => { e.dataTransfer.setData('text/plain', sound.id); card.style.opacity='0.5'; };
        card.ondragend = () => { card.style.opacity='1'; };
        card.oncontextmenu = (e) => { e.preventDefault(); showCardContextMenu(e, sound); };
        const hk = idx < 9 ? `<span class="hotkey-badge">${idx+1}</span>` : '';
        card.innerHTML = `${hk}<div class="sound-info"><span class="sound-name">${sound.name}</span><span class="sound-meta">${sound.category.toUpperCase()}</span></div><div class="sound-controls"><button class="loop-toggle ${sound.loop?'active':''}" data-id="${sound.id}">LOOP</button><input type="range" class="vol-slider" min="0" max="2" step="0.1" value="${sound.config.volume}" data-id="${sound.id}"><button class="config-btn" title="Configurações">⚙️</button></div>`;
        card.onclick = (e) => { if(e.target.tagName!=='INPUT'&&e.target.tagName!=='BUTTON') toggleSound(sound); };
        card.querySelector('.loop-toggle').onclick = (e) => { e.stopPropagation(); sound.loop=!sound.loop; card.querySelector('.loop-toggle').classList.toggle('active',sound.loop); const a=state.activeAudios.get(sound.id); if(a) a.audio.loop=sound.loop; saveState(); };
        const vs = card.querySelector('.vol-slider');
        vs.onclick = (e) => e.stopPropagation();
        vs.oninput = (e) => { sound.config.volume=parseFloat(e.target.value); const a=state.activeAudios.get(sound.id); if(a&&audioCtx) a.gainNode.gain.setTargetAtTime(sound.config.volume,audioCtx.currentTime,0.05); saveState(); };
        card.querySelector('.config-btn').onclick = (e) => { e.stopPropagation(); openConfigModal(sound); };
        soundboard.appendChild(card);
    });
}

// === Active Tracks ===
function updateActiveTracks() {
    const tracks = Array.from(state.activeAudios.entries());
    if (!tracks.length) { activeTracksList.innerHTML = '<div class="empty-state">Nenhuma trilha em execução.</div>'; return; }
    activeTracksList.innerHTML = '';
    tracks.forEach(([id, entry]) => {
        const s = state.sounds.find(x=>x.id===id);
        const row = document.createElement('div'); row.className='bgm-track';
        row.innerHTML = `<div class="track-name" style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div><div class="track-time" id="time-${id}" style="font-size:0.75rem;color:var(--text-secondary);width:85px;text-align:right">00:00/00:00</div><div class="track-progress" style="flex:2"><div class="progress-bar" id="progress-${id}"></div></div><button class="panic-btn" style="padding:4px 10px;font-size:0.7rem">PARAR</button>`;
        row.querySelector('button').onclick = () => stopSound(id);
        activeTracksList.appendChild(row);
    });
}

// === Context Menu (Cards) ===
function showCardContextMenu(e, sound) {
    contextSoundId = sound.id;
    const ctx = document.getElementById('context-menu');
    const ctxCats = document.getElementById('ctx-categories');
    const cats = [...new Set(['ambient','sfx','music', ...state.sounds.map(s=>s.category)])];
    ctxCats.innerHTML = '';
    cats.forEach(c => {
        const it = document.createElement('div'); it.className='ctx-item'; it.textContent=c.toUpperCase();
        if(sound.category===c) it.style.color='var(--accent)';
        it.onclick = () => { sound.category=c; ctx.classList.add('hidden'); renderCategories(); renderSoundboard(); saveState(); };
        ctxCats.appendChild(it);
    });
    ctx.style.left=e.clientX+'px'; ctx.style.top=e.clientY+'px'; ctx.classList.remove('hidden');
}
document.addEventListener('click', () => { document.getElementById('context-menu')?.classList.add('hidden'); document.getElementById('sidebar-ctx-menu')?.classList.add('hidden'); });
document.getElementById('ctx-new-cat')?.addEventListener('click', () => {
    const n = prompt("Nome da nova categoria:"); if(!n||!n.trim()) return;
    const s = state.sounds.find(x=>x.id===contextSoundId);
    if(s) { s.category=n.trim().toLowerCase(); renderCategories(); renderSoundboard(); saveState(); }
    document.getElementById('context-menu').classList.add('hidden');
});
document.getElementById('ctx-delete-sound')?.addEventListener('click', () => {
    const s = state.sounds.find(x=>x.id===contextSoundId);
    if(s && confirm('Remover "'+s.name+'" do painel?')) {
        stopSound(s.id); state.sounds = state.sounds.filter(x=>x.id!==s.id);
        renderCategories(); renderSoundboard(); saveState(); showToast('"'+s.name+'" removido.');
    }
    document.getElementById('context-menu').classList.add('hidden');
});

// === Config Modal ===
function openConfigModal(sound) {
    modalTitle.textContent = 'Configurar: '+sound.name;
    const c = sound.config;
    modalBody.innerHTML = `<div class="settings-grid"><div class="settings-group"><label>Balanço L/R: <span id="vp">${c.pan>0?'+'+c.pan:c.pan}</span></label><input type="range" id="cp" min="-1" max="1" step="0.1" value="${c.pan}"></div><div class="settings-group"><label>Velocidade/Pitch: <span id="vs">${c.speed}x</span></label><input type="range" id="cs" min="0.5" max="2" step="0.1" value="${c.speed}"></div><div class="settings-group"><label>Filtro</label><select id="cf"><option value="none" ${c.filter==='none'?'selected':''}>Nenhum</option><option value="lowpass" ${c.filter==='lowpass'?'selected':''}>Abafado (Low-Pass)</option><option value="highpass" ${c.filter==='highpass'?'selected':''}>Rádio (High-Pass)</option></select></div><div class="settings-group"><label>Fade In: <span id="vi">${c.fadeIn}s</span></label><input type="range" id="ci" min="0" max="10" step="0.5" value="${c.fadeIn}"></div><div class="settings-group"><label>Fade Out: <span id="vo">${c.fadeOut}s</span></label><input type="range" id="co" min="0" max="10" step="0.5" value="${c.fadeOut}"></div><div class="settings-group"><label class="checkbox-label"><input type="checkbox" id="cr" ${c.reverb?'checked':''}> Reverb</label><label class="checkbox-label" style="margin-top:0.5rem"><input type="checkbox" id="cd" ${c.delay?'checked':''}> Delay (Eco)</label><label class="checkbox-label" style="margin-top:0.5rem"><input type="checkbox" id="ck" ${c.ducking?'checked':''}> Auto-Ducking</label></div></div>`;
    settingsModal.style.left='30%'; settingsModal.style.top='20%'; settingsModal.classList.remove('hidden');
    const bind = (id,key,fl,cb,vid,suf) => { const el=document.getElementById(id); if(!el) return; el.oninput=(e)=>{ const v=cb?e.target.checked:(fl?parseFloat(e.target.value):e.target.value); sound.config[key]=v; if(vid) document.getElementById(vid).textContent=(key==='pan'&&v>0?'+':'')+v+(suf||''); const a=state.activeAudios.get(sound.id); if(a&&audioCtx){ if(key==='speed') a.audio.playbackRate=v; if(key==='pan'&&a.panner) a.panner.pan.setTargetAtTime(v,audioCtx.currentTime,0.05); } saveState(); }; if(!fl) el.onchange=el.oninput; };
    bind('cp','pan',true,false,'vp',''); bind('cs','speed',true,false,'vs','x'); bind('ci','fadeIn',true,false,'vi','s'); bind('co','fadeOut',true,false,'vo','s');
    bind('cf','filter'); bind('cr','reverb',false,true); bind('cd','delay',false,true); bind('ck','ducking',false,true);
}
closeModal?.addEventListener('click', () => settingsModal.classList.add('hidden'));

// === Script/Roteiro ===
function renderScript() {
    if(!scriptList) return; scriptList.innerHTML = '';
    if(!state.scriptLines.length) { scriptList.innerHTML='<div class="empty-state">Nenhuma fala adicionada. Clique em "+ Adicionar Fala".</div>'; return; }
    state.scriptLines.forEach(line => {
        const card = document.createElement('div'); card.className='script-line-card';
        card.innerHTML = `<div class="script-text" contenteditable="true" placeholder="Digite a fala ou arraste sons para cá...">${line.text}</div><div class="script-controls" style="justify-content:flex-end"><button class="delete-line-btn">Excluir Fala</button></div>`;
        const ed = card.querySelector('.script-text');
        ed.oninput = () => { line.text=ed.innerHTML; saveState(); };
        // Make existing cues draggable
        ed.querySelectorAll('.inline-cue').forEach(cue => { cue.draggable=true; cue.ondragstart=(ev)=>{ window.draggedCue=cue; ev.dataTransfer.setData('text/plain',cue.dataset.soundId); ev.stopPropagation(); }; cue.ondragend=()=>{window.draggedCue=null;}; });
        ed.ondragover = (e) => { e.preventDefault(); ed.style.backgroundColor='rgba(255,255,255,0.05)'; };
        ed.ondragleave = () => { ed.style.backgroundColor='transparent'; };
        ed.ondrop = (e) => {
            e.preventDefault(); ed.style.backgroundColor='transparent';
            const sid = e.dataTransfer.getData('text/plain'); if(!sid) return;
            const snd = state.sounds.find(s=>s.id==sid); if(!snd) return;
            if(window.draggedCue) { window.draggedCue.remove(); window.draggedCue=null; }
            let range; if(document.caretRangeFromPoint) range=document.caretRangeFromPoint(e.clientX,e.clientY);
            else if(e.rangeParent) { range=document.createRange(); range.setStart(e.rangeParent,e.rangeOffset); }
            if(range) {
                const cue=document.createElement('span'); cue.className='inline-cue'; cue.contentEditable=false; cue.draggable=true; cue.dataset.soundId=snd.id; cue.innerHTML='🎵 '+snd.name;
                cue.ondragstart=(ev)=>{window.draggedCue=cue;ev.dataTransfer.setData('text/plain',snd.id);ev.stopPropagation();}; cue.ondragend=()=>{window.draggedCue=null;};
                range.insertNode(cue); const sp=document.createTextNode('\u00A0'); range.setStartAfter(cue); range.insertNode(sp);
                const sel=window.getSelection(); sel.removeAllRanges(); const nr=document.createRange(); nr.setStartAfter(sp); nr.collapse(true); sel.addRange(nr);
                line.text=ed.innerHTML; saveState();
            }
        };
        ed.onclick = (e) => { const cue=e.target.closest('.inline-cue'); if(cue){ const s=state.sounds.find(x=>x.id==cue.dataset.soundId); if(s) playSound(s); } };
        card.querySelector('.delete-line-btn').onclick = () => { state.scriptLines=state.scriptLines.filter(l=>l.id!==line.id); renderScript(); saveState(); };
        scriptList.appendChild(card);
    });
}

// === Event Listeners ===
function setupEventListeners() {
    masterVolInput.oninput = (e) => { state.masterVolume=parseFloat(e.target.value); if(masterGain) masterGain.gain.setTargetAtTime(state.masterVolume,audioCtx.currentTime,0.05); saveState(); };
    panicBtn.onclick = stopAll;
    window.addEventListener('keydown', (e) => {
        if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.isContentEditable) return;
        if(e.key==='Escape') return stopAll();
        const n = parseInt(e.key);
        if(n>=1&&n<=9) { const list=state.filter==='all'?state.sounds:state.sounds.filter(s=>s.category===state.filter); if(list[n-1]) toggleSound(list[n-1]); }
    });
    addCustomBtn.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
        Array.from(e.target.files).forEach(f => { state.sounds.push({ id:Date.now()+Math.random(), name:f.name.split('.')[0], url:URL.createObjectURL(f), category:'sfx', loop:false, config:createDefaultConfig('sfx') }); });
        renderCategories(); renderSoundboard(); renderScript(); saveState();
    };
    addScriptBtn?.addEventListener('click', () => { state.scriptLines.push({id:Date.now(),text:''}); renderScript(); saveState(); setTimeout(()=>{ const t=document.querySelectorAll('.script-text'); if(t.length) t[t.length-1].focus(); },50); });

    // Global Modal
    globalSettingsBtn?.addEventListener('click', () => {
        initAudio();
        const g = state.global;
        globalModalBody.innerHTML = `<div class="settings-grid"><div class="settings-group"><label>Fade "Parar Tudo": <span id="vgf">${g.fadeTime}s</span></label><input type="range" id="cgf" min="0" max="10" step="0.5" value="${g.fadeTime}"></div><div class="settings-group"><label>Grave (EQ): <span id="vgl">${g.eqLow>0?'+'+g.eqLow:g.eqLow}dB</span></label><input type="range" id="cgl" min="-12" max="12" step="1" value="${g.eqLow}"></div><div class="settings-group"><label>Médio (EQ): <span id="vgm">${g.eqMid>0?'+'+g.eqMid:g.eqMid}dB</span></label><input type="range" id="cgm" min="-12" max="12" step="1" value="${g.eqMid}"></div><div class="settings-group"><label>Agudo (EQ): <span id="vgh">${g.eqHigh>0?'+'+g.eqHigh:g.eqHigh}dB</span></label><input type="range" id="cgh" min="-12" max="12" step="1" value="${g.eqHigh}"></div></div>`;
        globalSettingsModal.style.left='30%'; globalSettingsModal.style.top='20%'; globalSettingsModal.classList.remove('hidden');
        const gb = (id,key,vid,suf,isEq) => { const el=document.getElementById(id); if(!el) return; el.oninput=(e)=>{ const v=parseFloat(e.target.value); state.global[key]=v; document.getElementById(vid).textContent=(v>0&&isEq?'+':'')+v+suf; if(isEq&&audioCtx){ if(key==='eqLow') masterLow.gain.setTargetAtTime(v,audioCtx.currentTime,0.1); if(key==='eqMid') masterMid.gain.setTargetAtTime(v,audioCtx.currentTime,0.1); if(key==='eqHigh') masterHigh.gain.setTargetAtTime(v,audioCtx.currentTime,0.1); } saveState(); }; };
        gb('cgf','fadeTime','vgf','s',false); gb('cgl','eqLow','vgl','dB',true); gb('cgm','eqMid','vgm','dB',true); gb('cgh','eqHigh','vgh','dB',true);
    });
    closeGlobalModal?.addEventListener('click', () => globalSettingsModal.classList.add('hidden'));

    // Export/Import
    document.getElementById('btn-export')?.addEventListener('click', exportProject);
    document.getElementById('btn-import')?.addEventListener('click', () => document.getElementById('import-input').click());
    document.getElementById('import-input')?.addEventListener('change', (e) => { if(e.target.files[0]) importProject(e.target.files[0]); });
}

function startTimer() {
    let s=0; setInterval(()=>{ s++; const h=String(Math.floor(s/3600)).padStart(2,'0'), m=String(Math.floor((s%3600)/60)).padStart(2,'0'), sc=String(s%60).padStart(2,'0'); mainTimer.textContent=h+':'+m+':'+sc; },1000);
}

init();
