// DOM element references (move all to top)
const trackPanel = document.getElementById('track-panel');
const trackPanelToggle = document.getElementById('track-panel-toggle');
const trackPanelChevron = document.getElementById('track-panel-chevron');
const trackDropdown = document.getElementById('track-dropdown');
const playbackModeToggle = document.getElementById('playback-mode-toggle');
const playbackModeIcon = document.getElementById('playback-mode-icon');
const fileInput = document.getElementById('file-input');
const audioPlayer = document.getElementById('audio-player');
const playBtn = document.getElementById('audio-play-btn');
const playIcon = document.getElementById('audio-play-icon');
const progressSlider = document.getElementById('audio-progress-slider');
const currentTimeSpan = document.getElementById('audio-current');
const durationSpan = document.getElementById('audio-duration');
const lpRecord = document.getElementById('lp-record');
const lpPlayIcon = document.getElementById('lp-play-icon');
const musicNotes = document.getElementById('music-notes');
const fileNameSpan = document.getElementById('file-name');
const lpRotator = document.getElementById('lp-rotator');
const exportBtn = document.getElementById('export-btn');

// Searchbar elements
const searchbar = document.getElementById('searchbar');
const searchbarDropdown = document.getElementById('searchbar-dropdown');


function updateSearchbarState() {
  if (!searchbar) return;
  searchbar.disabled = !(importedFiles && importedFiles.length > 0);
  if (searchbar.disabled) {
    searchbar.value = '';
    hideSearchbarDropdown();
  }
}


// --- Searchbar Dropdown Logic ---
let filteredTracks = [];
let searchbarSelectedIndex = -1;

function renderSearchbarDropdown(filter = '') {
  if (!searchbarDropdown) return;
  searchbarDropdown.innerHTML = '';
  if (!importedFiles.length) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'searchbar-dropdown-empty';
    emptyMsg.textContent = 'No folder uploaded yet.';
    searchbarDropdown.appendChild(emptyMsg);
    return;
  }
  filter = filter.trim().toLowerCase();
  filteredTracks = importedFiles.filter(track =>
    track.name.toLowerCase().includes(filter)
  );
  if (!filteredTracks.length) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'searchbar-dropdown-empty';
    emptyMsg.textContent = 'No matching songs.';
    searchbarDropdown.appendChild(emptyMsg);
    return;
  }
  filteredTracks.forEach((track, idx) => {
    const item = document.createElement('div');
    let selectedClass = '';
    // Highlight if this is the current track or keyboard selection
    if (track.index === currentTrackIndex) selectedClass += ' selected';
    if (idx === searchbarSelectedIndex) selectedClass += ' keyboard-selected';
    item.className = 'searchbar-item' + selectedClass;
    item.dataset.idx = track.index;
    // Album art placeholder
    const art = document.createElement('img');
    art.className = 'track-album-art';
    art.src = track.albumArt || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38"><rect width="38" height="38" rx="7" fill="%23232b36"/><text x="50%" y="55%" text-anchor="middle" fill="%238fd6ff" font-size="16" font-family="Quicksand" dy=".3em">\u266a</text></svg>';
    item.appendChild(art);
    // Info
    const info = document.createElement('div');
    info.className = 'track-info';
    const title = document.createElement('div');
    title.className = 'track-title';
    title.textContent = track.name;
    info.appendChild(title);
    const author = document.createElement('div');
    author.className = 'track-author';
    author.textContent = track.author || '';
    info.appendChild(author);
    item.appendChild(info);
    item.onclick = () => {
      selectTrack(track.index);
      hideSearchbarDropdown();
    };
    searchbarDropdown.appendChild(item);
  });
}

function showSearchbarDropdown() {
  if (!searchbarDropdown) return;
  searchbarDropdown.classList.add('open');
}
function hideSearchbarDropdown() {
  if (!searchbarDropdown) return;
  searchbarDropdown.classList.remove('open');
  searchbarSelectedIndex = -1;
}

if (searchbar) {
  searchbar.addEventListener('focus', () => {
    if (searchbar.disabled) return;
    renderSearchbarDropdown(searchbar.value);
    showSearchbarDropdown();
  });
  searchbar.addEventListener('input', (e) => {
    renderSearchbarDropdown(e.target.value);
    showSearchbarDropdown();
    searchbarSelectedIndex = -1;
  });
  searchbar.addEventListener('keydown', (e) => {
    if (!searchbarDropdown.classList.contains('open')) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredTracks.length) {
        searchbarSelectedIndex = (searchbarSelectedIndex + 1) % filteredTracks.length;
        renderSearchbarDropdown(searchbar.value);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredTracks.length) {
        searchbarSelectedIndex = (searchbarSelectedIndex - 1 + filteredTracks.length) % filteredTracks.length;
        renderSearchbarDropdown(searchbar.value);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTracks.length && searchbarSelectedIndex >= 0) {
        selectTrack(filteredTracks[searchbarSelectedIndex].index);
        hideSearchbarDropdown();
        searchbar.blur();
      }
    } else if (e.key === 'Escape') {
      hideSearchbarDropdown();
      searchbar.blur();
    }
  });
  searchbar.addEventListener('blur', () => {
    setTimeout(hideSearchbarDropdown, 120);
  });
}

// Show message if no folder uploaded
// Playback mode logic
// ...existing code...
// 0: play all, 1: loop all, 2: loop one
let playbackMode = 0;
const playbackModes = [
  { icon: '\u25B6\u25B6', title: 'Play all (default)' },
  { icon: '\u21BA', title: 'Loop all' },
  { icon: '\u21BA\u25B6', title: 'Loop one' }
];

function updatePlaybackModeUI() {
  if (!playbackModeIcon) return;
  playbackModeIcon.innerHTML = playbackModes[playbackMode].icon;
  playbackModeToggle.title = playbackModes[playbackMode].title;
}

if (playbackModeToggle) {
  playbackModeToggle.addEventListener('click', () => {
    playbackMode = (playbackMode + 1) % playbackModes.length;
    updatePlaybackModeUI();
  });
  updatePlaybackModeUI();
}

// Handle end of track for playback modes
if (audioPlayer) {
  audioPlayer.addEventListener('ended', () => {
    if (importedFiles.length === 0) return;
    if (playbackMode === 0) { // Play all
      if (currentTrackIndex < importedFiles.length - 1) {
        selectTrack(currentTrackIndex + 1);
      }
    } else if (playbackMode === 1) { // Loop all
      if (currentTrackIndex < importedFiles.length - 1) {
        selectTrack(currentTrackIndex + 1);
      } else {
        selectTrack(0);
      }
    } else if (playbackMode === 2) { // Loop one
      audioPlayer.currentTime = 0;
      try {
        audioPlayer.play();
      } catch (err) {}
    }
  });
}


function renderTrackDropdown() {
  if (!trackDropdown) return;
  trackDropdown.innerHTML = '';
  if (!importedFiles.length) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'track-panel-empty';
    emptyMsg.textContent = 'No folder uploaded yet.';
    trackDropdown.appendChild(emptyMsg);
    return;
  }
  importedFiles.forEach((track, idx) => {
    const item = document.createElement('div');
    item.className = 'track-item' + (idx === currentTrackIndex ? ' selected' : '');
    item.dataset.idx = idx;
    // Album art placeholder
    const art = document.createElement('img');
    art.className = 'track-album-art';
    art.src = track.albumArt || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38"><rect width="38" height="38" rx="7" fill="%23232b36"/><text x="50%" y="55%" text-anchor="middle" fill="%238fd6ff" font-size="16" font-family="Quicksand" dy=".3em">♪</text></svg>';
    item.appendChild(art);
    // Info
    const info = document.createElement('div');
    info.className = 'track-info';
    const title = document.createElement('div');
    title.className = 'track-title';
    title.textContent = track.name;
    info.appendChild(title);
    const author = document.createElement('div');
    author.className = 'track-author';
    author.textContent = track.author || '';
    info.appendChild(author);
    item.appendChild(info);
    item.onclick = () => selectTrack(idx);
    trackDropdown.appendChild(item);
  });
}

function selectTrack(idx) {
  if (idx < 0 || idx >= importedFiles.length) return;
  currentTrackIndex = idx;
  loadTrack(idx);
  updateExportBtnState();
}

function loadTrack(idx) {
  const track = importedFiles[idx];
  if (!track) return;
  audioPlayer.src = track.url;
  // TODO: update album art, author, etc. in UI if needed
  audioPlayer.load();
  // Update file-name span with current track name (no .mp3)
  if (fileNameSpan) {
    let name = track.name;
    if (name.toLowerCase().endsWith('.mp3')) name = name.slice(0, -4);
    fileNameSpan.textContent = name;
  }
  try {
    audioPlayer.play();
  } catch (err) {}
  // Optionally update UI for selected track
}





// Store all imported MP3 files and their metadata
let importedFiles = [];
let currentTrackIndex = 0;

if (fileInput) {
  fileInput.addEventListener('change', function (e) {
    // Accept all .mp3 files, even in subfolders
    const files = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.mp3'));
    importedFiles = files.map((file, idx) => ({
      file,
      name: file.webkitRelativePath ? file.webkitRelativePath.split('/').pop() : file.name,
      url: URL.createObjectURL(file),
      index: idx,
      // albumArt, author: to be filled later
    }));
    if (importedFiles.length > 0) {
      currentTrackIndex = 0;
      loadTrack(0);
    } else {
      if (fileNameSpan) fileNameSpan.textContent = 'No folder chosen';
    }
    updateSearchbarState();
  });
}

function updateExportBtnState() {
  if (!exportBtn) return;
  const hasTrack = importedFiles.length > 0 && importedFiles[currentTrackIndex];
  exportBtn.disabled = !hasTrack;
}

if (exportBtn) {
  exportBtn.addEventListener('click', function () {
    if (exportBtn.disabled) return;
    const track = importedFiles[currentTrackIndex];
    if (!track) return;
    // In the future, apply audio modifications here before exporting
    const originalName = track.name;
    const dotIndex = originalName.lastIndexOf('.');
    let newFileName;
    if (dotIndex !== -1) {
      newFileName = originalName.substring(0, dotIndex) + ' [Tuunixx EDIT]' + originalName.substring(dotIndex);
    } else {
      newFileName = originalName + ' [Tuunixx EDIT]';
    }
    const url = track.url;
    const a = document.createElement('a');
    a.href = url;
    a.download = newFileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      // Do not revokeObjectURL here, as it is used for playback too
    }, 100);
  });
}

// Call updateExportBtnState on relevant events
document.addEventListener('DOMContentLoaded', function() {
  updateExportBtnState();
  updateSearchbarState();
});
if (fileInput) {
  fileInput.addEventListener('change', function (e) {
    // ...existing code...
    updateExportBtnState();
    updateSearchbarState();
  });
}
// If you have a selectTrack function, call updateExportBtnState there as well
// ...existing code...

let noteInterval = null;
const noteEmojis = ['\u266B', '\u266A', '\u266C', '\u2669'];

// Web Audio API setup
let audioCtx, analyser, sourceNode, dataArray, waveformArray, animationId, visualizerId;
let eqFilters = [];
let audioSetupDone = false;
let lastFlash = 0, lastBass = 0, bassPeak = 0, flashLevel = 0;
const visualizer = document.getElementById('visualizer');

function setupAudioAnalyzer() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024; // Lowered for perf
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    waveformArray = new Uint8Array(analyser.fftSize);
  }
  if (!audioSetupDone) {
    sourceNode = audioCtx.createMediaElementSource(audioPlayer);
    const eqBands = [
      { freq: 60, type: 'lowshelf' },
      { freq: 170, type: 'peaking' },
      { freq: 310, type: 'peaking' },
      { freq: 600, type: 'peaking' },
      { freq: 1000, type: 'peaking' },
      { freq: 3000, type: 'peaking' },
      { freq: 6000, type: 'peaking' },
      { freq: 12000, type: 'peaking' },
      { freq: 14000, type: 'peaking' },
      { freq: 16000, type: 'highshelf' }
    ];
    eqFilters = eqBands.map(band => {
      const filter = audioCtx.createBiquadFilter();
      filter.type = band.type;
      filter.frequency.value = band.freq;
      filter.Q.value = 1.1;
      filter.gain.value = 0;
      return filter;
    });
    // Connect filters in series
    let prev = sourceNode;
    eqFilters.forEach(filter => {
      prev.connect(filter);
      prev = filter;
    });
    prev.connect(analyser);
    analyser.connect(audioCtx.destination);
    audioSetupDone = true;
  }
}

function animateFlash() {
  if (!analyser) return;
  analyser.getByteFrequencyData(dataArray);
  // Focus on bass (first 8 bins)
  let bass = 0;
  for (let i = 0; i < 8; i++) bass += dataArray[i];
  bass = bass / 8;
  // Smoother, but less persistent flash
  flashLevel = flashLevel * 0.65 + (bass / 255) * 0.6;
  // Clamp and map to 0-1
  let flash = Math.max(0, Math.min(1, flashLevel - 0.10));
  // Make it less sensitive to low bass
  if (flash < 0.13) flash = 0;
  lpRecord.style.setProperty('--flash-intensity', flash);
  // For notes, apply flash class if above threshold, else remove
  const notes = document.querySelectorAll('.music-note');
  if (flash > 0.01) {
    lpRecord.classList.add('flash');
    notes.forEach(note => note.classList.add('flash'));
  } else {
    lpRecord.classList.remove('flash');
    notes.forEach(note => note.classList.remove('flash'));
  }
  animationId = requestAnimationFrame(animateFlash);
}

// Offscreen canvas for performance
const offscreenCanvas = document.createElement('canvas');
let offCtx = offscreenCanvas.getContext('2d');

function drawVisualizer() {
  if (!analyser || !visualizer) return;
  // Only draw if audio is playing
  if (audioPlayer.paused || audioPlayer.ended) {
    visualizerId = requestAnimationFrame(drawVisualizer);
    return;
  }
  analyser.getByteTimeDomainData(waveformArray);
  // Resize offscreen and onscreen canvas if needed
  const targetWidth = window.innerWidth;
  const targetHeight = window.innerHeight - 56;
  if (offscreenCanvas.width !== targetWidth || offscreenCanvas.height !== targetHeight) {
    offscreenCanvas.width = targetWidth;
    offscreenCanvas.height = targetHeight;
    visualizer.width = targetWidth;
    visualizer.height = targetHeight;
    offCtx = offscreenCanvas.getContext('2d');
  }
  const width = offscreenCanvas.width;
  const height = offscreenCanvas.height;
  offCtx.clearRect(0, 0, width, height);
  // Draw waveform
  offCtx.save();
  offCtx.beginPath();
  for (let i = 0; i < waveformArray.length; i += 4) {
    const v = (waveformArray[i] - 128) / 128;
    const x = (i / (waveformArray.length - 1)) * width;
    const y = height / 2 - v * (height / 2 - 4);
    if (i === 0) offCtx.moveTo(x, y);
    else offCtx.lineTo(x, y);
  }
  offCtx.strokeStyle = 'rgba(120,220,255,0.95)';
  offCtx.lineWidth = 1.1;
  // No shadowBlur for perf
  offCtx.stroke();
  offCtx.restore();
  // Blit to visible canvas
  const ctx = visualizer.getContext('2d');
  ctx.clearRect(0, 0, visualizer.width, visualizer.height);
  ctx.drawImage(offscreenCanvas, 0, 0);
  visualizerId = requestAnimationFrame(drawVisualizer);
}

// Also resize the canvas immediately on window resize
window.addEventListener('resize', () => {
  if (visualizer) {
    visualizer.width = window.innerWidth;
    visualizer.height = window.innerHeight;
  }
});

function createMusicNote() {
  // Create a music note element
  const note = document.createElement('span');
  note.className = 'music-note';
  note.innerText = noteEmojis[Math.floor(Math.random() * noteEmojis.length)];
  // Center of the LP: 50% horizontally, 50% vertically in music-notes container
  note.style.left = '50%';
  note.style.bottom = '50%';
  // Randomize direction (0-360deg) and distance
  const angle = Math.random() * 360; // 0 to 360 degrees
  const distance = 180 + Math.random() * 80;
  // Calculate X and Y offsets
  const rad = angle * Math.PI / 180;
  const x = Math.cos(rad) * distance;
  const y = Math.sin(rad) * distance;
  note.style.setProperty('--note-x', `${x}px`);
  note.style.setProperty('--note-y', `${y}px`);
  // Set rotation and spin properties
  const spin = (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 360);
  note.style.setProperty('--note-spin', `${spin}deg`);
  note.style.setProperty('--note-rotate', `${angle - 90}deg`);
  note.style.fontSize = (1.5 + Math.random() * 1.5) + 'rem';
  musicNotes.appendChild(note);
  setTimeout(() => {
    note.remove();
  }, 2400);
}

function startNotes() {
  if (!noteInterval) {
    noteInterval = setInterval(() => {
      createMusicNote();
      if (Math.random() > 0.5) createMusicNote(); // sometimes spawn a second note for more density
    }, 180);
  }
}

function stopNotes() {
  clearInterval(noteInterval);
  noteInterval = null;
}


fileInput.addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (file) {
    fileNameSpan.textContent = file.name.length > 30 ? file.name.slice(0, 27) + '...' : file.name;
  } else {
    fileNameSpan.textContent = 'No file chosen';
  }
  if (file && file.type.startsWith('audio/')) {
    const url = URL.createObjectURL(file);
    audioPlayer.src = url;
    audioPlayer.load();
    try {
      audioPlayer.play();
    } catch (err) {}
    setupAudioAnalyzer();
  } else if (file) {
    alert('Please select a valid audio file.');
  }
});


audioPlayer.addEventListener('play', () => {
  lpRecord.classList.add('playing');
  if (lpRotator) lpRotator.classList.add('playing');
  startNotes();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  animateFlash();
  if (visualizer) {
    visualizer.style.display = 'block';
    drawVisualizer();
  }
});


audioPlayer.addEventListener('pause', () => {
  lpRecord.classList.remove('playing');
  if (lpRotator) lpRotator.classList.remove('playing');
  stopNotes();
  cancelAnimationFrame(animationId);
  cancelAnimationFrame(visualizerId);
  lpRecord.classList.remove('flash');
  if (visualizer) {
    visualizer.style.display = 'none';
    visualizer.getContext('2d').clearRect(0,0,visualizer.width,visualizer.height);
  }
});


audioPlayer.addEventListener('ended', () => {
  lpRecord.classList.remove('playing');
  if (lpRotator) lpRotator.classList.remove('playing');
  stopNotes();
  cancelAnimationFrame(animationId);
  cancelAnimationFrame(visualizerId);
  lpRecord.classList.remove('flash');
  if (visualizer) {
    visualizer.style.display = 'none';
    visualizer.getContext('2d').clearRect(0,0,visualizer.width,visualizer.height);
  }
});

// Play/Pause button logic
if (playBtn && playIcon && audioPlayer) {
  playBtn.addEventListener('click', () => {
    if (audioPlayer.paused) {
      try {
        audioPlayer.play();
      } catch (err) {}
    } else {
      audioPlayer.pause();
    }
  });
  audioPlayer.addEventListener('play', () => {
    playIcon.innerHTML = '&#10073;&#10073;'; // Pause icon
  });
  audioPlayer.addEventListener('pause', () => {
    playIcon.innerHTML = '&#9654;'; // Play icon
  });
}

// Progress slider logic
if (progressSlider && audioPlayer) {
  // Update slider as track plays
  audioPlayer.addEventListener('timeupdate', () => {
    if (!isNaN(audioPlayer.duration)) {
      progressSlider.value = ((audioPlayer.currentTime / audioPlayer.duration) * 100) || 0;
    }
  });
  // Seek when slider is changed
  progressSlider.addEventListener('input', (e) => {
    if (!isNaN(audioPlayer.duration)) {
      const percent = parseFloat(e.target.value) / 100;
      audioPlayer.currentTime = percent * audioPlayer.duration;
    }
  });
}

// Time update logic
if (audioPlayer && currentTimeSpan && durationSpan) {
  audioPlayer.addEventListener('timeupdate', () => {
    const min = Math.floor(audioPlayer.currentTime / 60);
    const sec = Math.floor(audioPlayer.currentTime % 60).toString().padStart(2, '0');
    currentTimeSpan.textContent = `${min}:${sec}`;
  });
  audioPlayer.addEventListener('loadedmetadata', () => {
    const min = Math.floor(audioPlayer.duration / 60);
    const sec = Math.floor(audioPlayer.duration % 60).toString().padStart(2, '0');
    durationSpan.textContent = `${min}:${sec}`;
  });
  audioPlayer.addEventListener('ended', () => {
    playIcon.innerHTML = '&#9654;';
  });
}

// LP disk toggle play/pause
if (lpRecord && audioPlayer && lpPlayIcon) {
  function updateLpIcon() {
    if (audioPlayer.paused) {
      // Even larger play icon, no background/circle
      lpPlayIcon.innerHTML = `<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:auto;">
        <polygon points="22,15 58,35 22,55" fill="#fff" style="filter: drop-shadow(0 0 2px #3bb0ff88); stroke-linejoin:round;"/>
      </svg>`;
      lpPlayIcon.style.fontSize = '4.2rem';
    } else {
      // Pause bars: shorter and thicker, centered
      lpPlayIcon.innerHTML = `<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:auto;">
        <rect x="25" y="20" width="9" height="30" rx="3" fill="#fff"/>
        <rect x="36" y="20" width="9" height="30" rx="3" fill="#fff"/>
      </svg>`;
      lpPlayIcon.style.fontSize = '4.2rem';
    }
    lpRecord.setAttribute('aria-pressed', audioPlayer.paused ? 'false' : 'true');
  }
  lpRecord.addEventListener('click', () => {
    if (audioPlayer.paused) {
      try {
        audioPlayer.play();
      } catch (err) {}
    } else {
      audioPlayer.pause();
    }
    updateLpIcon();
  });
  lpRecord.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (audioPlayer.paused) {
        try {
          audioPlayer.play();
        } catch (err) {}
      } else {
        audioPlayer.pause();
      }
      updateLpIcon();
    }
  });
  audioPlayer.addEventListener('play', updateLpIcon);
  audioPlayer.addEventListener('pause', updateLpIcon);
  updateLpIcon();
}

// Volume slider event listener
const volumeSlider = document.getElementById('volume-slider');
if (volumeSlider && audioPlayer) {
  volumeSlider.addEventListener('input', e => {
    audioPlayer.volume = parseFloat(e.target.value);
  });
}
