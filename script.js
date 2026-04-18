// --------------------------------------------------------------
// ОБЩИЕ ФУНКЦИИ
// --------------------------------------------------------------
function singleDoseConcentration(t, dose, ka, ke, vd) {
    if(t <= 0) return 0;
    if(Math.abs(ka - ke) < 1e-6) return (dose * ka / vd) * t * Math.exp(-ka * t);
    const factor = (dose * ka) / (vd * (ka - ke));
    return factor * (Math.exp(-ke * t) - Math.exp(-ka * t));
}

function getPeak(dose, ka, ke, vd) {
    let maxC = 0, maxT = 0;
    for(let t = 0; t <= 48; t += 0.1) {
        let c = singleDoseConcentration(t, dose, ka, ke, vd);
        if(c > maxC) { maxC = c; maxT = t; }
    }
    return { peak: maxC, time: maxT };
}

function observeFormulas() {
    const cards = document.querySelectorAll('.formula-card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.2, rootMargin: '0px 0px -50px 0px' });
    cards.forEach(card => observer.observe(card));
}

// Калькулятор на главной
function updateMainCalculator() {
    let dose = parseFloat(document.getElementById('calcDose').value);
    let ka = parseFloat(document.getElementById('calcKa').value);
    let ke = parseFloat(document.getElementById('calcKe').value);
    let vd = parseFloat(document.getElementById('calcVd').value);
    let t = parseFloat(document.getElementById('calcTime').value);
    let conc = singleDoseConcentration(t, dose, ka, ke, vd);
    document.getElementById('calcResult').innerText = conc.toFixed(2);
    let peak = getPeak(dose, ka, ke, vd);
    document.getElementById('calcPeak').value = peak.peak.toFixed(2) + ' мг/л';
    document.getElementById('calcPeakTime').value = peak.time.toFixed(1) + ' ч';
    let halfLife = (0.693 / ke).toFixed(1);
    document.getElementById('calcHalfLife').value = halfLife + ' ч';
}

document.getElementById('calcRecalcBtn').onclick = updateMainCalculator;
document.getElementById('calcDose').oninput = updateMainCalculator;
document.getElementById('calcKa').oninput = updateMainCalculator;
document.getElementById('calcKe').oninput = updateMainCalculator;
document.getElementById('calcVd').oninput = updateMainCalculator;
document.getElementById('calcTime').oninput = updateMainCalculator;
updateMainCalculator();

// --------------------------------------------------------------
// РЕЖИМ ОДНОКРАТНОЙ/МНОГОКРАТНОЙ
// --------------------------------------------------------------
let currentMode = 'single';
let params = { dose:500, ka:1.5, ke:0.25, vd:35 };
let extraDoses = [];
let currentTime = 0;
let simulationInterval = null;
let multiInterval = 8;
const MAX_TIME = 48;

function multipleDoseConcentration(t, dose, ka, ke, vd, interval, maxDoses = 12) {
    let total = 0;
    for(let i = 0; i < maxDoses; i++) {
        let dt = t - i * interval;
        if(dt > 0) total += singleDoseConcentration(dt, dose, ka, ke, vd);
    }
    return total;
}

function concentrationAtTime(t) {
    if(currentMode === 'multi') return multipleDoseConcentration(t, params.dose, params.ka, params.ke, params.vd, multiInterval, 12);
    let total = singleDoseConcentration(t, params.dose, params.ka, params.ke, params.vd);
    for(let d of extraDoses) if(t > d.time) total += singleDoseConcentration(t - d.time, d.dose, params.ka, params.ke, params.vd);
    return total;
}

function updateQuickCalc() {
    let t = parseFloat(document.getElementById('quickTime').value);
    document.getElementById('quickTimeValue').innerText = t.toFixed(1);
    let conc = concentrationAtTime(t);
    document.getElementById('quickConcDisplay').innerHTML = conc.toFixed(2) + ' мг/л';
}

function updateSingleUI() {
    document.getElementById('doseValue').innerText = params.dose;
    document.getElementById('kaValue').innerText = params.ka.toFixed(2);
    document.getElementById('keValue').innerText = params.ke.toFixed(2);
    document.getElementById('vdValue').innerText = params.vd;
    let conc = concentrationAtTime(currentTime);
    let concElem = document.getElementById('concDisplay');
    concElem.innerText = conc.toFixed(2);
    concElem.classList.add('pulse-animation');
    setTimeout(() => concElem.classList.remove('pulse-animation'), 1000);
    document.getElementById('timeDisplay').innerText = currentTime.toFixed(1);
    let peak = 0, peakTime = 0;
    for(let t=0; t<=currentTime; t+=0.2) { let c = concentrationAtTime(t); if(c>peak) { peak=c; peakTime=t; } }
    document.getElementById('peakDisplay').innerText = peak.toFixed(2);
    document.getElementById('peakTimeDisplay').innerText = peakTime.toFixed(1);
    let status = '';
    if(conc > 12) status = '⚠️ ТОКСИЧНО';
    else if(conc >= 2 && conc <= 8) status = '✅ В терапевтическом окне';
    else if(conc < 2) status = '⚠️ Ниже терапевтического уровня';
    else status = '❕ Выше нормы';
    document.getElementById('statusDisplay').innerHTML = status;
    drawCanvas('pharmaCanvas', concentrationAtTime, currentTime);
    updateQuickCalc();
}

function drawCanvas(canvasId, concFunc, currentTimeMark) {
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,w,h);
    ctx.strokeStyle = '#e0e0e0'; ctx.fillStyle = '#e0e0e0'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(60,20); ctx.lineTo(60, h-40); ctx.lineTo(w-20, h-40); ctx.stroke();
    ctx.fillStyle = '#888'; ctx.fillText('Концентрация (мг/л)', 20,30); ctx.fillText('Время (часы)', w/2-30, h-15);
    for(let i=0;i<=4;i++){ let y = h-40 - i*(h-80)/4; ctx.beginPath(); ctx.moveTo(55,y); ctx.lineTo(w-25,y); ctx.stroke(); ctx.fillStyle='#aaa'; ctx.fillText((i*4).toString(),30,y+3); }
    for(let i=0;i<=4;i++){ let x = 60 + i*(w-80)/4; ctx.beginPath(); ctx.moveTo(x, h-40); ctx.lineTo(x,20); ctx.stroke(); ctx.fillStyle='#aaa'; ctx.fillText((i*12).toString(), x-5, h-25); }
    const mapX = (t) => 60 + (t / MAX_TIME) * (w - 80);
    const mapY = (c) => (h-40) - (c / 20) * (h-80);
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#2e7d32'; let yLow = mapY(2), yHigh = mapY(8); ctx.fillRect(60, yHigh, w-80, yLow - yHigh);
    ctx.fillStyle = '#d32f2f'; let yToxic = mapY(12); ctx.fillRect(60,20, w-80, yToxic-20);
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.2;
    let first = true;
    for(let i=0;i<=300;i++){ let t = (i/300)*MAX_TIME; let c = concFunc(t); let x = mapX(t), y = mapY(Math.min(c,20)); if(first){ ctx.moveTo(x,y); first=false; } else ctx.lineTo(x,y); }
    ctx.stroke();
    let cx = mapX(currentTimeMark), cy = mapY(Math.min(concFunc(currentTimeMark),20));
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 2*Math.PI); ctx.fillStyle = '#fff'; ctx.fill(); ctx.fillStyle='#121212'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 2*Math.PI); ctx.fill();
    ctx.fillStyle='#fff'; ctx.fillText(`t = ${currentTimeMark.toFixed(1)} ч`, cx+5, cy-5);
}

function startTimer() { if(simulationInterval) clearInterval(simulationInterval); simulationInterval = setInterval(() => { if(currentTime < MAX_TIME){ currentTime += 0.1; if(currentTime > MAX_TIME) currentTime = MAX_TIME; updateSingleUI(); } }, 150); }
function resetSimulation() { if(simulationInterval) clearInterval(simulationInterval); params = { dose:500, ka:1.5, ke:0.25, vd:35 }; extraDoses = []; currentTime = 0; document.getElementById('dose').value = 500; document.getElementById('ka').value = 1.5; document.getElementById('ke').value = 0.25; document.getElementById('vd').value = 35; updateSingleUI(); startTimer(); localStorage.setItem('pkParams', JSON.stringify(params)); }
function addExtraDose() { extraDoses.push({time: currentTime + 2, dose: params.dose}); updateSingleUI(); }
function exportCSV() { let data = [['Time (h)','Concentration (mg/L)']]; for(let t=0; t<=MAX_TIME; t+=0.5) data.push([t.toFixed(1), concentrationAtTime(t).toFixed(3)]); let csv = data.map(row=>row.join(',')).join('\n'); let blob = new Blob([csv], {type:'text/csv'}); let a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pharmacokinetics.csv'; a.click(); }

function saveParams() { localStorage.setItem('pkParams', JSON.stringify(params)); }
function loadParams() { let saved = localStorage.getItem('pkParams'); if(saved) { let p = JSON.parse(saved); params.dose = p.dose; params.ka = p.ka; params.ke = p.ke; params.vd = p.vd; document.getElementById('dose').value = params.dose; document.getElementById('ka').value = params.ka; document.getElementById('ke').value = params.ke; document.getElementById('vd').value = params.vd; updateSingleUI(); } }
['dose','ka','ke','vd'].forEach(id => { document.getElementById(id).addEventListener('input', (e) => { params[id] = parseFloat(e.target.value); updateSingleUI(); saveParams(); }); });
document.getElementById('quickTime').addEventListener('input', () => { updateQuickCalc(); updateSingleUI(); });

// --------------------------------------------------------------
// СРАВНЕНИЕ
// --------------------------------------------------------------
let compareParams = { A: { dose:400, ka:1.2, ke:0.2, vd:35 }, B: { dose:600, ka:2.0, ke:0.35, vd:35 } };
function concA(t){ return singleDoseConcentration(t, compareParams.A.dose, compareParams.A.ka, compareParams.A.ke, compareParams.A.vd); }
function concB(t){ return singleDoseConcentration(t, compareParams.B.dose, compareParams.B.ka, compareParams.B.ke, compareParams.B.vd); }
function updateCompareUI() {
    document.getElementById('doseAValue').innerText = compareParams.A.dose;
    document.getElementById('kaAValue').innerText = compareParams.A.ka.toFixed(2);
    document.getElementById('keAValue').innerText = compareParams.A.ke.toFixed(2);
    document.getElementById('vdAValue').innerText = compareParams.A.vd;
    document.getElementById('dBValue').innerText = compareParams.B.dose;
    document.getElementById('kaBValue').innerText = compareParams.B.ka.toFixed(2);
    document.getElementById('keBValue').innerText = compareParams.B.ke.toFixed(2);
    document.getElementById('vdBValue').innerText = compareParams.B.vd;
    drawCompareCanvas();
}
function drawCompareCanvas() {
    const canvas = document.getElementById('compareCanvas');
    if(!canvas) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,w,h);
    ctx.strokeStyle = '#e0e0e0'; ctx.fillStyle = '#e0e0e0'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(60,20); ctx.lineTo(60, h-40); ctx.lineTo(w-20, h-40); ctx.stroke();
    ctx.fillStyle = '#888'; ctx.fillText('Концентрация (мг/л)', 20,30); ctx.fillText('Время (часы)', w/2-30, h-15);
    for(let i=0;i<=4;i++){ let y = h-40 - i*(h-80)/4; ctx.beginPath(); ctx.moveTo(55,y); ctx.lineTo(w-25,y); ctx.stroke(); ctx.fillStyle='#aaa'; ctx.fillText((i*4).toString(),30,y+3); }
    for(let i=0;i<=4;i++){ let x = 60 + i*(w-80)/4; ctx.beginPath(); ctx.moveTo(x, h-40); ctx.lineTo(x,20); ctx.stroke(); ctx.fillStyle='#aaa'; ctx.fillText((i*12).toString(), x-5, h-25); }
    const mapX = (t) => 60 + (t / MAX_TIME) * (w - 80);
    const mapY = (c) => (h-40) - (c / 20) * (h-80);
    ctx.beginPath(); ctx.strokeStyle = '#6bcf7f'; ctx.lineWidth = 2.2;
    let first = true;
    for(let i=0;i<=300;i++){ let t = (i/300)*MAX_TIME; let c = concA(t); let x = mapX(t), y = mapY(Math.min(c,20)); if(first){ ctx.moveTo(x,y); first=false; } else ctx.lineTo(x,y); }
    ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 2.2;
    first = true;
    for(let i=0;i<=300;i++){ let t = (i/300)*MAX_TIME; let c = concB(t); let x = mapX(t), y = mapY(Math.min(c,20)); if(first){ ctx.moveTo(x,y); first=false; } else ctx.lineTo(x,y); }
    ctx.stroke();
    ctx.fillStyle = '#6bcf7f'; ctx.fillRect(w-100, 30, 12, 12); ctx.fillStyle = '#ff6b6b'; ctx.fillRect(w-100, 50, 12, 12);
    ctx.fillStyle = '#e0e0e0'; ctx.font = '10px Inter'; ctx.fillText('Схема A', w-85, 40); ctx.fillText('Схема B', w-85, 60);
}
function exportCompareCSV() { let data = [['Time (h)','Concentration A','Concentration B']]; for(let t=0; t<=MAX_TIME; t+=0.5) data.push([t.toFixed(1), concA(t).toFixed(3), concB(t).toFixed(3)]); let csv = data.map(row=>row.join(',')).join('\n'); let blob = new Blob([csv], {type:'text/csv'}); let a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'compare.csv'; a.click(); }
const compareSliders = ['doseA','kaA','keA','vdA','doseB','kaB','keB','vdB'];
compareSliders.forEach(id => { let el = document.getElementById(id); if(el) el.addEventListener('input', (e) => { let val = parseFloat(e.target.value); if(id === 'doseA') compareParams.A.dose = val; if(id === 'kaA') compareParams.A.ka = val; if(id === 'keA') compareParams.A.ke = val; if(id === 'vdA') compareParams.A.vd = val; if(id === 'doseB') compareParams.B.dose = val; if(id === 'kaB') compareParams.B.ka = val; if(id === 'keB') compareParams.B.ke = val; if(id === 'vdB') compareParams.B.vd = val; updateCompareUI(); }); });

// --------------------------------------------------------------
// ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ
// --------------------------------------------------------------
function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.mode-btn[data-mode="${mode}"]`).classList.add('active');
    document.getElementById('singleMode').style.display = (mode === 'compare') ? 'none' : 'flex';
    document.getElementById('compareMode').style.display = (mode === 'compare') ? 'block' : 'none';
    if(mode === 'compare') { if(simulationInterval) clearInterval(simulationInterval); updateCompareUI(); }
    else { resetSimulation(); }
}

document.querySelectorAll('.mode-btn').forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
document.getElementById('resetBtn').onclick = resetSimulation;
document.getElementById('addDoseBtn').onclick = addExtraDose;
document.getElementById('exportBtn').onclick = exportCSV;
document.getElementById('exportCompareBtn').onclick = exportCompareCSV;

// Переключение между главной и симулятором
document.getElementById('startSimulatorBtn').onclick = () => {
    document.getElementById('mainPage').style.display = 'none';
    document.getElementById('simulatorPage').style.display = 'block';
    loadParams();
    resetSimulation();
    setTimeout(observeFormulas, 300);
};
document.getElementById('learnMoreBtn').onclick = () => alert('Фармакокинетика — раздел фармакологии, изучающий движение лекарства в организме. Модель описывает всасывание (ka), выведение (ke) и объём распределения (Vd). Терапевтическое окно: 2–8 мг/л, токсичность >12 мг/л.');

setMode('single');