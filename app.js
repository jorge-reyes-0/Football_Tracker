(() => {
  'use strict';

  const STORAGE_KEY = 'gridiron-scoreboard-state-v1';
  const QUARTER_ORDER = ['1', '2', '3', '4', 'OT'];

  const defaultState = () => ({
    home: { name: 'HOME', score: 0, color: '#1d4ed8', timeoutsUsed: [false, false, false] },
    away: { name: 'AWAY', score: 0, color: '#b91c1c', timeoutsUsed: [false, false, false] },
    quarterIndex: 0,
    quarterLengthSec: 720,
    timeRemainingSec: 720,
    running: false,
    possession: 'home',
    down: 1,
    distance: 10,
    soundOn: true,
  });

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return { ...defaultState(), ...parsed };
    } catch {
      return defaultState();
    }
  }

  let state = loadState();
  let tickHandle = null;

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // --- DOM refs ---
  const el = {
    quarterDisplay: document.getElementById('quarterDisplay'),
    gameClock: document.getElementById('gameClock'),
    startPauseBtn: document.getElementById('startPauseBtn'),
    resetClockBtn: document.getElementById('resetClockBtn'),
    prevQuarter: document.getElementById('prevQuarter'),
    nextQuarter: document.getElementById('nextQuarter'),
    possToggle: document.getElementById('possToggle'),
    downLabel: document.getElementById('downLabel'),
    distanceLabel: document.getElementById('distanceLabel'),
    downMinus: document.getElementById('downMinus'),
    downPlus: document.getElementById('downPlus'),
    distMinus: document.getElementById('distMinus'),
    distPlus: document.getElementById('distPlus'),
    firstDownBtn: document.getElementById('firstDownBtn'),
    homeName: document.getElementById('homeName'),
    awayName: document.getElementById('awayName'),
    homeScore: document.getElementById('homeScore'),
    awayScore: document.getElementById('awayScore'),
    homeTimeouts: document.getElementById('homeTimeouts'),
    awayTimeouts: document.getElementById('awayTimeouts'),
    homePossession: document.getElementById('homePossession'),
    awayPossession: document.getElementById('awayPossession'),
    homePanel: document.getElementById('homePanel'),
    awayPanel: document.getElementById('awayPanel'),
    settingsBtn: document.getElementById('settingsBtn'),
    settingsDialog: document.getElementById('settingsDialog'),
    quarterLengthSelect: document.getElementById('quarterLengthSelect'),
    homeColorInput: document.getElementById('homeColorInput'),
    awayColorInput: document.getElementById('awayColorInput'),
    soundToggle: document.getElementById('soundToggle'),
    newGameBtn: document.getElementById('newGameBtn'),
  };

  const DOWN_WORDS = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' };

  function formatTime(totalSeconds) {
    const s = Math.max(0, totalSeconds);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  function render() {
    el.quarterDisplay.textContent =
      QUARTER_ORDER[state.quarterIndex] === 'OT' ? 'OT' : `Q${QUARTER_ORDER[state.quarterIndex]}`;
    el.gameClock.textContent = formatTime(state.timeRemainingSec);
    el.gameClock.classList.toggle('flash', state.timeRemainingSec === 0);

    el.startPauseBtn.textContent = state.running ? 'Pause' : 'Start';
    el.startPauseBtn.classList.toggle('start', !state.running);
    el.startPauseBtn.classList.toggle('pause', state.running);

    el.downLabel.textContent = DOWN_WORDS[state.down] || '1st';
    el.distanceLabel.textContent = state.distance === 0 ? 'Goal' : state.distance;

    if (document.activeElement !== el.homeName) el.homeName.value = state.home.name;
    if (document.activeElement !== el.awayName) el.awayName.value = state.away.name;
    el.homeScore.textContent = state.home.score;
    el.awayScore.textContent = state.away.score;

    el.homePanel.style.setProperty('--team-color', state.home.color);
    el.awayPanel.style.setProperty('--team-color', state.away.color);

    renderTimeouts(el.homeTimeouts, state.home.timeoutsUsed);
    renderTimeouts(el.awayTimeouts, state.away.timeoutsUsed);

    el.homePossession.classList.toggle('active', state.possession === 'home');
    el.awayPossession.classList.toggle('active', state.possession === 'away');
    el.possToggle.classList.toggle('away', state.possession === 'away');

    el.quarterLengthSelect.value = String(state.quarterLengthSec);
    el.homeColorInput.value = state.home.color;
    el.awayColorInput.value = state.away.color;
    el.soundToggle.checked = state.soundOn;
  }

  function renderTimeouts(container, timeoutsUsed) {
    container.innerHTML = '';
    timeoutsUsed.forEach((used, i) => {
      const dot = document.createElement('button');
      dot.className = 'to-dot' + (used ? ' used' : '');
      dot.setAttribute('aria-label', `Timeout ${i + 1}${used ? ' (used)' : ''}`);
      dot.addEventListener('click', () => {
        timeoutsUsed[i] = !timeoutsUsed[i];
        saveState();
        render();
      });
      container.appendChild(dot);
    });
  }

  // --- Clock ---
  function tick() {
    if (state.timeRemainingSec <= 0) {
      stopClock();
      playHorn();
      return;
    }
    state.timeRemainingSec -= 1;
    if (state.timeRemainingSec <= 0) {
      state.timeRemainingSec = 0;
      stopClock();
      playHorn();
    }
    saveState();
    render();
  }

  function startClock() {
    if (state.timeRemainingSec <= 0) return;
    state.running = true;
    tickHandle = setInterval(tick, 1000);
    saveState();
    render();
  }

  function stopClock() {
    state.running = false;
    if (tickHandle) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
    saveState();
    render();
  }

  function toggleClock() {
    if (state.running) stopClock();
    else startClock();
  }

  function resetClock() {
    stopClock();
    state.timeRemainingSec = state.quarterLengthSec;
    saveState();
    render();
  }

  function changeQuarter(delta) {
    stopClock();
    const newIndex = Math.min(QUARTER_ORDER.length - 1, Math.max(0, state.quarterIndex + delta));
    state.quarterIndex = newIndex;
    state.timeRemainingSec = state.quarterLengthSec;
    state.down = 1;
    state.distance = 10;
    saveState();
    render();
  }

  // --- Audio horn ---
  let audioCtx = null;
  function getAudioCtx() {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function playHorn() {
    if (!state.soundOn) return;
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.35, now + 0.05);
      gain.gain.setValueAtTime(0.35, now + 1.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);

      [220, 165].forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 1.3);
      });
    } catch {
      // audio not available; ignore
    }
  }

  function playHypeHonks() {
    if (!state.soundOn) return;
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;
      [0, 0.24].forEach((offset) => {
        const t0 = now + offset;
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.4, t0 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 300;
        osc.connect(gain);
        osc.start(t0);
        osc.stop(t0 + 0.22);
      });
    } catch {
      // audio not available; ignore
    }
  }

  // --- Third down hype call ("It's THIRD DOWN!" + horn) ---
  function playThirdDownHype() {
    if (!state.soundOn) return;
    try {
      if ('speechSynthesis' in window && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance("It's THIRD DOWN!");
        utter.rate = 0.85;
        utter.pitch = 1.15;
        utter.volume = 1;
        utter.onend = playHypeHonks;
        utter.onerror = playHypeHonks;
        window.speechSynthesis.speak(utter);
      } else {
        playHypeHonks();
      }
    } catch {
      playHypeHonks();
    }
  }

  function flashThirdDown() {
    const readout = el.downLabel.closest('.dd-readout');
    if (!readout) return;
    readout.classList.remove('third-down-flash');
    // force reflow so the animation restarts if triggered again quickly
    void readout.offsetWidth;
    readout.classList.add('third-down-flash');
  }

  // --- Scoring ---
  function addPoints(team, points) {
    const t = state[team];
    t.score = Math.max(0, t.score + points);
    saveState();
    render();
  }

  // --- Down & distance ---
  function changeDown(delta) {
    const prevDown = state.down;
    state.down = Math.min(4, Math.max(1, state.down + delta));
    saveState();
    render();
    if (state.down === 3 && prevDown !== 3) {
      flashThirdDown();
      playThirdDownHype();
    }
  }

  function changeDistance(delta) {
    state.distance = Math.min(99, Math.max(0, state.distance + delta));
    saveState();
    render();
  }

  function markFirstDown() {
    state.down = 1;
    state.distance = 10;
    saveState();
    render();
  }

  function setPossession(team) {
    state.possession = team;
    saveState();
    render();
  }

  // --- New game ---
  function newGame() {
    stopClock();
    const preserved = {
      home: { ...defaultState().home, name: state.home.name, color: state.home.color },
      away: { ...defaultState().away, name: state.away.name, color: state.away.color },
      quarterLengthSec: state.quarterLengthSec,
      soundOn: state.soundOn,
    };
    state = { ...defaultState(), ...preserved, timeRemainingSec: state.quarterLengthSec };
    saveState();
    render();
  }

  // --- Event bindings ---
  el.startPauseBtn.addEventListener('click', toggleClock);
  el.resetClockBtn.addEventListener('click', resetClock);
  el.prevQuarter.addEventListener('click', () => changeQuarter(-1));
  el.nextQuarter.addEventListener('click', () => changeQuarter(1));

  document.querySelectorAll('.pt-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      addPoints(btn.dataset.team, Number(btn.dataset.points));
    });
  });

  el.homeName.addEventListener('input', () => {
    state.home.name = el.homeName.value || 'HOME';
    saveState();
  });
  el.awayName.addEventListener('input', () => {
    state.away.name = el.awayName.value || 'AWAY';
    saveState();
  });

  el.downMinus.addEventListener('click', () => changeDown(-1));
  el.downPlus.addEventListener('click', () => changeDown(1));
  el.distMinus.addEventListener('click', () => changeDistance(-1));
  el.distPlus.addEventListener('click', () => changeDistance(1));
  el.firstDownBtn.addEventListener('click', markFirstDown);

  el.homePossession.addEventListener('click', () => setPossession('home'));
  el.awayPossession.addEventListener('click', () => setPossession('away'));
  el.possToggle.addEventListener('click', () => setPossession(state.possession === 'home' ? 'away' : 'home'));

  el.settingsBtn.addEventListener('click', () => el.settingsDialog.showModal());

  el.quarterLengthSelect.addEventListener('change', () => {
    state.quarterLengthSec = Number(el.quarterLengthSelect.value);
    if (!state.running) state.timeRemainingSec = state.quarterLengthSec;
    saveState();
    render();
  });

  el.homeColorInput.addEventListener('input', () => {
    state.home.color = el.homeColorInput.value;
    saveState();
    render();
  });
  el.awayColorInput.addEventListener('input', () => {
    state.away.color = el.awayColorInput.value;
    saveState();
    render();
  });

  el.soundToggle.addEventListener('change', () => {
    state.soundOn = el.soundToggle.checked;
    saveState();
  });

  el.newGameBtn.addEventListener('click', () => {
    if (confirm('Start a new game? This resets scores, clock, and quarter.')) {
      newGame();
      el.settingsDialog.close();
    }
  });

  render();
})();
