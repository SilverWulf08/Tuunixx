/**
 * ============================================
 * TUUNIXX - Modern Music Player
 * ============================================
 */

// ============================================
// DOM ELEMENTS
// ============================================
const DOM = {
    // Audio
    audio: document.getElementById('audio'),
    
    // Visualizer
    visualizer: document.getElementById('visualizer'),
    
    // Upload
    folderInput: document.getElementById('folderInput'),
    uploadBtn: document.getElementById('uploadBtn'),
    
    // Playlist
    playlist: document.getElementById('playlist'),
    
    // Track Info
    albumArt: document.getElementById('albumArt'),
    trackTitle: document.getElementById('trackTitle'),
    trackArtist: document.getElementById('trackArtist'),
    
    // Progress
    progressSlider: document.getElementById('progressSlider'),
    progressBar: document.getElementById('progressBar'),
    currentTime: document.getElementById('currentTime'),
    duration: document.getElementById('duration'),
    
    // Controls
    playBtn: document.getElementById('playBtn'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    shuffleBtn: document.getElementById('shuffleBtn'),
    loopBtn: document.getElementById('loopBtn'),
    muteBtn: document.getElementById('muteBtn'),
    volumeSlider: document.getElementById('volumeSlider'),
    
    // Effects
    gainSlider: document.getElementById('gainSlider'),
    bassSlider: document.getElementById('bassSlider'),
    midSlider: document.getElementById('midSlider'),
    trebleSlider: document.getElementById('trebleSlider'),
    gainValue: document.getElementById('gainValue'),
    bassValue: document.getElementById('bassValue'),
    midValue: document.getElementById('midValue'),
    trebleValue: document.getElementById('trebleValue'),
    resetEffects: document.getElementById('resetEffects'),
    
    // Mobile
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    mobileDropdown: document.getElementById('mobileDropdown'),
    mobileUploadBtn: document.getElementById('mobileUploadBtn'),
    mobileFolderInput: document.getElementById('mobileFolderInput'),
    mobilePlaylist: document.getElementById('mobilePlaylist'),
    mobileBass: document.getElementById('mobileBass'),
    mobileMid: document.getElementById('mobileMid'),
    mobileTreble: document.getElementById('mobileTreble'),
    mobileGain: document.getElementById('mobileGain'),
    mobileBassValue: document.getElementById('mobileBassValue'),
    mobileMidValue: document.getElementById('mobileMidValue'),
    mobileTrebleValue: document.getElementById('mobileTrebleValue'),
    mobileGainValue: document.getElementById('mobileGainValue')
};

// ============================================
// APPLICATION STATE
// ============================================
const State = {
    tracks: [],
    currentIndex: 0,
    isPlaying: false,
    isShuffle: false,
    loopMode: 'none', // 'none', 'all', 'one'
    volume: 0.8,
    isMuted: false,
    shuffleOrder: []
};

// ============================================
// AUDIO ENGINE
// ============================================
const AudioEngine = {
    context: null,
    source: null,
    analyser: null,
    gainNode: null,
    bassFilter: null,
    midFilter: null,
    trebleFilter: null,
    
    init() {
        if (this.context) return;
        
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create analyser
        this.analyser = this.context.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.8;
        
        // Create gain node
        this.gainNode = this.context.createGain();
        this.gainNode.gain.value = 1;
        
        // Create filters
        this.bassFilter = this.context.createBiquadFilter();
        this.bassFilter.type = 'lowshelf';
        this.bassFilter.frequency.value = 200;
        this.bassFilter.gain.value = 0;
        
        this.midFilter = this.context.createBiquadFilter();
        this.midFilter.type = 'peaking';
        this.midFilter.frequency.value = 1000;
        this.midFilter.Q.value = 1;
        this.midFilter.gain.value = 0;
        
        this.trebleFilter = this.context.createBiquadFilter();
        this.trebleFilter.type = 'highshelf';
        this.trebleFilter.frequency.value = 3000;
        this.trebleFilter.gain.value = 0;
        
        // Connect source from audio element
        this.source = this.context.createMediaElementSource(DOM.audio);
        
        // Chain: source -> bass -> mid -> treble -> gain -> analyser -> destination
        this.source.connect(this.bassFilter);
        this.bassFilter.connect(this.midFilter);
        this.midFilter.connect(this.trebleFilter);
        this.trebleFilter.connect(this.gainNode);
        this.gainNode.connect(this.analyser);
        this.analyser.connect(this.context.destination);
    },
    
    resume() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    },
    
    setGain(value) {
        if (this.gainNode) {
            this.gainNode.gain.value = value / 100;
        }
    },
    
    setBass(value) {
        if (this.bassFilter) {
            this.bassFilter.gain.value = value;
        }
    },
    
    setMid(value) {
        if (this.midFilter) {
            this.midFilter.gain.value = value;
        }
    },
    
    setTreble(value) {
        if (this.trebleFilter) {
            this.trebleFilter.gain.value = value;
        }
    },
    
    getFrequencyData() {
        if (!this.analyser) return new Uint8Array(0);
        const data = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(data);
        return data;
    }
};

// ============================================
// TRACK MANAGER
// ============================================
const TrackManager = {
    loadFolder(files) {
        // Filter audio files and sort by name
        const audioFiles = Array.from(files)
            .filter(file => file.type.startsWith('audio/') || 
                          file.name.match(/\.(mp3|wav|ogg|m4a|flac|aac)$/i))
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        
        if (audioFiles.length === 0) {
            alert('No audio files found in the selected folder');
            return;
        }
        
        State.tracks = audioFiles.map((file, index) => ({
            id: index,
            file: file,
            name: this.cleanFileName(file.name),
            artist: 'Unknown Artist',
            album: 'Unknown Album',
            albumArt: null,
            url: URL.createObjectURL(file),
            duration: null
        }));
        
        // Extract metadata for all tracks
        State.tracks.forEach((track, index) => {
            this.extractMetadata(track.file, index);
        });
        
        State.currentIndex = 0;
        this.generateShuffleOrder();
        this.renderPlaylist();
        this.loadTrack(0);
    },
    
    extractMetadata(file, index) {
        if (typeof jsmediatags === 'undefined') return;
        
        try {
            jsmediatags.read(file, {
                onSuccess: (tag) => {
                    try {
                        const tags = tag.tags;
                        
                        // Update track info
                        if (tags && tags.title) {
                            State.tracks[index].name = tags.title;
                        }
                        if (tags && tags.artist) {
                            State.tracks[index].artist = tags.artist;
                        }
                        if (tags && tags.album) {
                            State.tracks[index].album = tags.album;
                        }
                        
                        // Extract album art (only if it exists)
                        if (tags && tags.picture && tags.picture.data) {
                            const { data, format } = tags.picture;
                            let base64String = '';
                            for (let i = 0; i < data.length; i++) {
                                base64String += String.fromCharCode(data[i]);
                            }
                            const imageUrl = `data:${format};base64,${btoa(base64String)}`;
                            State.tracks[index].albumArt = imageUrl;
                        }
                        
                        // Update UI if this is the current track
                        if (index === State.currentIndex) {
                            this.updateTrackDisplay(State.tracks[index]);
                        }
                        
                        this.renderPlaylist();
                    } catch (e) {
                        console.log('Error processing metadata for:', file.name);
                    }
                },
                onError: (error) => {
                    // File doesn't have metadata or can't be read - that's okay
                    console.log('No metadata for:', file.name);
                }
            });
        } catch (e) {
            console.log('Could not read file:', file.name);
        }
    },
    
    updateTrackDisplay(track) {
        DOM.trackTitle.textContent = track.name;
        DOM.trackArtist.textContent = track.artist !== 'Unknown Artist' 
            ? track.artist 
            : `Track ${State.currentIndex + 1} of ${State.tracks.length}`;
        
        // Update album art
        if (track.albumArt) {
            DOM.albumArt.innerHTML = `<img src="${track.albumArt}" alt="Album Art">`;
            DOM.albumArt.classList.add('has-image');
        } else {
            DOM.albumArt.innerHTML = '<i class="fas fa-music"></i>';
            DOM.albumArt.classList.remove('has-image');
        }
    },
    
    cleanFileName(name) {
        return name
            .replace(/\.(mp3|wav|ogg|m4a|flac|aac)$/i, '')
            .replace(/^\d+[\s._-]+/, '')  // Remove leading track numbers
            .replace(/_/g, ' ')
            .trim();
    },
    
    generateShuffleOrder() {
        State.shuffleOrder = [...Array(State.tracks.length).keys()];
        for (let i = State.shuffleOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [State.shuffleOrder[i], State.shuffleOrder[j]] = 
            [State.shuffleOrder[j], State.shuffleOrder[i]];
        }
    },
    
    renderPlaylist() {
        const playlistHTML = State.tracks.length === 0 
            ? `<div class="playlist-empty">
                    <i class="fas fa-music"></i>
                    <p>No tracks loaded</p>
                </div>`
            : State.tracks.map((track, index) => `
                <div class="playlist-item ${index === State.currentIndex ? 'active' : ''}" 
                     data-index="${index}">
                    <span class="track-number">
                        ${index === State.currentIndex && State.isPlaying 
                            ? '<i class="fas fa-volume-high"></i>' 
                            : index + 1}
                    </span>
                    <span class="track-name">${track.name}</span>
                    <span class="track-duration">${track.duration || '--:--'}</span>
                </div>
            `).join('');
        
        // Update both desktop and mobile playlists
        DOM.playlist.innerHTML = playlistHTML;
        if (DOM.mobilePlaylist) {
            DOM.mobilePlaylist.innerHTML = playlistHTML;
        }
        
        // Add click handlers for desktop playlist
        DOM.playlist.querySelectorAll('.playlist-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.loadTrack(index);
                PlaybackControls.play();
            });
        });
        
        // Add click handlers for mobile playlist
        if (DOM.mobilePlaylist) {
            DOM.mobilePlaylist.querySelectorAll('.playlist-item').forEach(item => {
                item.addEventListener('click', () => {
                    const index = parseInt(item.dataset.index);
                    this.loadTrack(index);
                    PlaybackControls.play();
                    // Close mobile menu after selecting track
                    MobileMenu.close();
                });
            });
        }
    },
    
    loadTrack(index) {
        if (index < 0 || index >= State.tracks.length) return;
        
        State.currentIndex = index;
        const track = State.tracks[index];
        
        DOM.audio.src = track.url;
        this.updateTrackDisplay(track);
        
        this.renderPlaylist();
        
        // Update album art animation
        if (State.isPlaying) {
            DOM.albumArt.classList.add('playing');
        }
    },
    
    updateTrackDuration(index, duration) {
        if (State.tracks[index]) {
            State.tracks[index].duration = Utils.formatTime(duration);
            this.renderPlaylist();
        }
    },
    
    nextTrack() {
        if (State.loopMode === 'one') {
            DOM.audio.currentTime = 0;
            PlaybackControls.play();
            return;
        }
        
        let nextIndex;
        if (State.isShuffle) {
            const currentShufflePos = State.shuffleOrder.indexOf(State.currentIndex);
            const nextShufflePos = (currentShufflePos + 1) % State.shuffleOrder.length;
            nextIndex = State.shuffleOrder[nextShufflePos];
        } else {
            nextIndex = State.currentIndex + 1;
        }
        
        if (nextIndex >= State.tracks.length) {
            if (State.loopMode === 'all') {
                nextIndex = 0;
            } else {
                // Stop at end
                PlaybackControls.pause();
                return;
            }
        }
        
        this.loadTrack(nextIndex);
        PlaybackControls.play();
    },
    
    prevTrack() {
        // If more than 3 seconds in, restart track
        if (DOM.audio.currentTime > 3) {
            DOM.audio.currentTime = 0;
            return;
        }
        
        let prevIndex;
        if (State.isShuffle) {
            const currentShufflePos = State.shuffleOrder.indexOf(State.currentIndex);
            const prevShufflePos = (currentShufflePos - 1 + State.shuffleOrder.length) % State.shuffleOrder.length;
            prevIndex = State.shuffleOrder[prevShufflePos];
        } else {
            prevIndex = State.currentIndex - 1;
            if (prevIndex < 0) {
                prevIndex = State.loopMode === 'all' ? State.tracks.length - 1 : 0;
            }
        }
        
        this.loadTrack(prevIndex);
        PlaybackControls.play();
    }
};

// ============================================
// PLAYBACK CONTROLS
// ============================================
const PlaybackControls = {
    init() {
        DOM.playBtn.addEventListener('click', () => this.toggle());
        DOM.prevBtn.addEventListener('click', () => TrackManager.prevTrack());
        DOM.nextBtn.addEventListener('click', () => TrackManager.nextTrack());
        DOM.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        DOM.loopBtn.addEventListener('click', () => this.toggleLoop());
        
        // Audio events
        DOM.audio.addEventListener('ended', () => TrackManager.nextTrack());
        DOM.audio.addEventListener('play', () => this.onPlay());
        DOM.audio.addEventListener('pause', () => this.onPause());
        DOM.audio.addEventListener('loadedmetadata', () => {
            DOM.duration.textContent = Utils.formatTime(DOM.audio.duration);
            TrackManager.updateTrackDuration(State.currentIndex, DOM.audio.duration);
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.toggle();
                    break;
                case 'ArrowLeft':
                    DOM.audio.currentTime = Math.max(0, DOM.audio.currentTime - 5);
                    break;
                case 'ArrowRight':
                    DOM.audio.currentTime = Math.min(DOM.audio.duration, DOM.audio.currentTime + 5);
                    break;
                case 'ArrowUp':
                    VolumeControls.setVolume(Math.min(1, State.volume + 0.1));
                    break;
                case 'ArrowDown':
                    VolumeControls.setVolume(Math.max(0, State.volume - 0.1));
                    break;
            }
        });
    },
    
    toggle() {
        if (State.tracks.length === 0) return;
        
        AudioEngine.init();
        AudioEngine.resume();
        
        if (State.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    },
    
    play() {
        if (State.tracks.length === 0) return;
        DOM.audio.play();
    },
    
    pause() {
        DOM.audio.pause();
    },
    
    onPlay() {
        State.isPlaying = true;
        DOM.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        DOM.albumArt.classList.add('playing');
        TrackManager.renderPlaylist();
        Visualizer.start();
    },
    
    onPause() {
        State.isPlaying = false;
        DOM.playBtn.innerHTML = '<i class="fas fa-play"></i>';
        DOM.albumArt.classList.remove('playing');
        TrackManager.renderPlaylist();
    },
    
    toggleShuffle() {
        State.isShuffle = !State.isShuffle;
        DOM.shuffleBtn.classList.toggle('active', State.isShuffle);
        if (State.isShuffle) {
            TrackManager.generateShuffleOrder();
        }
    },
    
    toggleLoop() {
        const modes = ['none', 'all', 'one'];
        const currentIdx = modes.indexOf(State.loopMode);
        State.loopMode = modes[(currentIdx + 1) % modes.length];
        
        DOM.loopBtn.classList.remove('active');
        DOM.loopBtn.innerHTML = '<i class="fas fa-repeat"></i>';
        
        if (State.loopMode === 'all') {
            DOM.loopBtn.classList.add('active');
        } else if (State.loopMode === 'one') {
            DOM.loopBtn.classList.add('active');
            DOM.loopBtn.innerHTML = '<i class="fas fa-repeat"></i><span class="loop-indicator">1</span>';
        }
    }
};

// ============================================
// PROGRESS CONTROLS
// ============================================
const ProgressControls = {
    init() {
        let isSeeking = false;
        
        DOM.progressSlider.addEventListener('input', (e) => {
            isSeeking = true;
            const percent = e.target.value;
            DOM.progressBar.style.width = percent + '%';
            DOM.currentTime.textContent = Utils.formatTime((percent / 100) * DOM.audio.duration);
        });
        
        DOM.progressSlider.addEventListener('change', (e) => {
            const percent = e.target.value;
            DOM.audio.currentTime = (percent / 100) * DOM.audio.duration;
            isSeeking = false;
        });
        
        DOM.audio.addEventListener('timeupdate', () => {
            if (isSeeking) return;
            const percent = (DOM.audio.currentTime / DOM.audio.duration) * 100 || 0;
            DOM.progressSlider.value = percent;
            DOM.progressBar.style.width = percent + '%';
            DOM.currentTime.textContent = Utils.formatTime(DOM.audio.currentTime);
        });
    }
};

// ============================================
// VOLUME CONTROLS
// ============================================
const VolumeControls = {
    init() {
        DOM.volumeSlider.value = State.volume * 100;
        DOM.audio.volume = State.volume;
        
        DOM.volumeSlider.addEventListener('input', (e) => {
            this.setVolume(e.target.value / 100);
        });
        
        DOM.muteBtn.addEventListener('click', () => this.toggleMute());
    },
    
    setVolume(value) {
        State.volume = value;
        State.isMuted = false;
        DOM.audio.volume = value;
        DOM.volumeSlider.value = value * 100;
        this.updateIcon();
    },
    
    toggleMute() {
        State.isMuted = !State.isMuted;
        DOM.audio.volume = State.isMuted ? 0 : State.volume;
        this.updateIcon();
    },
    
    updateIcon() {
        let icon;
        if (State.isMuted || State.volume === 0) {
            icon = 'fa-volume-xmark';
        } else if (State.volume < 0.5) {
            icon = 'fa-volume-low';
        } else {
            icon = 'fa-volume-high';
        }
        DOM.muteBtn.innerHTML = `<i class="fas ${icon}"></i>`;
    }
};

// ============================================
// EFFECTS CONTROLS
// ============================================
const EffectsControls = {
    init() {
        DOM.gainSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            AudioEngine.setGain(value);
            DOM.gainValue.textContent = value + '%';
            // Sync to mobile (convert percentage to decimal)
            if (DOM.mobileGain) {
                DOM.mobileGain.value = value / 100;
                DOM.mobileGainValue.textContent = value + '%';
            }
        });
        
        DOM.bassSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            AudioEngine.setBass(value);
            DOM.bassValue.textContent = value + ' dB';
            if (DOM.mobileBass) {
                DOM.mobileBass.value = value;
                DOM.mobileBassValue.textContent = `${value > 0 ? '+' : ''}${value} dB`;
            }
        });
        
        DOM.midSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            AudioEngine.setMid(value);
            DOM.midValue.textContent = value + ' dB';
            if (DOM.mobileMid) {
                DOM.mobileMid.value = value;
                DOM.mobileMidValue.textContent = `${value > 0 ? '+' : ''}${value} dB`;
            }
        });
        
        DOM.trebleSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            AudioEngine.setTreble(value);
            DOM.trebleValue.textContent = value + ' dB';
            if (DOM.mobileTreble) {
                DOM.mobileTreble.value = value;
                DOM.mobileTrebleValue.textContent = `${value > 0 ? '+' : ''}${value} dB`;
            }
        });
        
        DOM.resetEffects.addEventListener('click', () => this.reset());
    },
    
    reset() {
        DOM.gainSlider.value = 100;
        DOM.bassSlider.value = 0;
        DOM.midSlider.value = 0;
        DOM.trebleSlider.value = 0;
        
        DOM.gainValue.textContent = '100%';
        DOM.bassValue.textContent = '0 dB';
        DOM.midValue.textContent = '0 dB';
        DOM.trebleValue.textContent = '0 dB';
        
        // Also reset mobile sliders
        if (DOM.mobileGain) {
            DOM.mobileGain.value = 1;
            DOM.mobileGainValue.textContent = '100%';
        }
        if (DOM.mobileBass) {
            DOM.mobileBass.value = 0;
            DOM.mobileBassValue.textContent = '0 dB';
        }
        if (DOM.mobileMid) {
            DOM.mobileMid.value = 0;
            DOM.mobileMidValue.textContent = '0 dB';
        }
        if (DOM.mobileTreble) {
            DOM.mobileTreble.value = 0;
            DOM.mobileTrebleValue.textContent = '0 dB';
        }
        
        AudioEngine.setGain(100);
        AudioEngine.setBass(0);
        AudioEngine.setMid(0);
        AudioEngine.setTreble(0);
    }
};

// ============================================
// VISUALIZER
// ============================================
const Visualizer = {
    canvas: DOM.visualizer,
    ctx: null,
    animationId: null,
    particles: [],
    sidebarWidth: 320,
    time: 0,
    smoothedIntensity: 0,
    smoothedBass: 0,
    smoothedMid: 0,
    smoothedTreble: 0,
    
    init() {
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Initialize particles
        for (let i = 0; i < 45; i++) {
            this.particles.push(this.createParticle());
        }
        
        // Start ambient animation
        this.animate();
    },
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },
    
    getContentCenter() {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            return { x: this.canvas.width / 2, y: this.canvas.height * 0.6 };
        } else {
            const contentWidth = this.canvas.width - this.sidebarWidth;
            return { x: this.sidebarWidth + (contentWidth / 2), y: this.canvas.height / 2 };
        }
    },
    
    getAlbumArtBounds() {
        const albumArt = DOM.albumArt;
        if (!albumArt) return null;
        const rect = albumArt.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            width: rect.width,
            height: rect.height
        };
    },
    
    createParticle() {
        const isMobile = window.innerWidth <= 768;
        const minX = isMobile ? 0 : this.sidebarWidth;
        const availableWidth = this.canvas.width - minX;
        
        return {
            x: minX + Math.random() * availableWidth,
            y: Math.random() * this.canvas.height,
            prevX: 0,
            prevY: 0,
            size: Math.random() * 2 + 0.5,
            speedX: (Math.random() - 0.5) * 0.8,
            speedY: (Math.random() - 0.5) * 0.8,
            opacity: Math.random() * 0.4 + 0.1,
            hue: Math.random() * 60 + 230
        };
    },
    
    start() {},
    
    // Smooth value transitions for less jittery animations
    lerp(current, target, factor) {
        return current + (target - current) * factor;
    },
    
    animate() {
        this.time += 0.016;
        
        // Faster fade to prevent endless trails
        this.ctx.fillStyle = 'rgba(10, 10, 15, 0.15)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const frequencyData = AudioEngine.getFrequencyData();
        const hasAudio = frequencyData.length > 0 && State.isPlaying;
        
        let targetIntensity = 0;
        let targetBass = 0;
        let targetMid = 0;
        let targetTreble = 0;
        
        if (hasAudio && frequencyData.length > 0) {
            const avgFreq = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length;
            targetIntensity = avgFreq / 255;
            
            const third = Math.floor(frequencyData.length / 3);
            targetBass = frequencyData.slice(0, third).reduce((a, b) => a + b, 0) / third / 255;
            targetMid = frequencyData.slice(third, third * 2).reduce((a, b) => a + b, 0) / third / 255;
            targetTreble = frequencyData.slice(third * 2).reduce((a, b) => a + b, 0) / third / 255;
        }
        
        // Smooth the values
        this.smoothedIntensity = this.lerp(this.smoothedIntensity, targetIntensity, 0.15);
        this.smoothedBass = this.lerp(this.smoothedBass, targetBass, 0.12);
        this.smoothedMid = this.lerp(this.smoothedMid, targetMid, 0.14);
        this.smoothedTreble = this.lerp(this.smoothedTreble, targetTreble, 0.16);
        
        if (hasAudio) {
            this.drawBars(frequencyData);
            this.drawAlbumArtWaves(frequencyData);
        }
        
        this.updateParticles();
        
        this.animationId = requestAnimationFrame(() => this.animate());
    },
    
    drawBars(data) {
        const isMobile = window.innerWidth <= 768;
        const startX = isMobile ? 0 : this.sidebarWidth;
        const width = isMobile ? this.canvas.width : (this.canvas.width - this.sidebarWidth);
        const height = this.canvas.height;
        const intensity = this.smoothedIntensity;
        
        // Smooth the frequency data
        const smoothedData = this.smoothFrequencyData(data, 2);
        
        // Bar configuration - fixed width, variable count based on screen
        const barWidth = 6;
        const barGap = 3;
        const barCount = Math.floor(width / (barWidth + barGap));
        const maxBarHeight = 180;
        
        // Center the bars horizontally
        const totalBarsWidth = barCount * barWidth + (barCount - 1) * barGap;
        const offsetX = (width - totalBarsWidth) / 2;
        
        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor((i / barCount) * smoothedData.length);
            const value = smoothedData[dataIndex] || 0;
            const normalizedValue = value / 255;
            
            // Calculate bar height with some minimum
            const barHeight = Math.max(4, normalizedValue * maxBarHeight * (0.5 + intensity * 0.8));
            
            const x = startX + offsetX + i * (barWidth + barGap);
            const y = height - barHeight;
            
            // Create gradient for each bar
            const gradient = this.ctx.createLinearGradient(x, y + barHeight, x, y);
            const hue = 250 + (i / barCount) * 40;
            gradient.addColorStop(0, `hsla(${hue}, 70%, 50%, 0.9)`);
            gradient.addColorStop(0.5, `hsla(${hue + 20}, 80%, 60%, 0.7)`);
            gradient.addColorStop(1, `hsla(${hue + 40}, 90%, 70%, 0.5)`);
            
            // Draw bar with rounded top
            this.ctx.beginPath();
            const radius = Math.min(barWidth / 2, 4);
            this.ctx.roundRect(x, y, barWidth, barHeight, [radius, radius, 0, 0]);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            // Add glow effect for taller bars
            if (normalizedValue > 0.5) {
                this.ctx.shadowColor = `hsla(${hue}, 80%, 60%, ${normalizedValue * 0.5})`;
                this.ctx.shadowBlur = 10;
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }
        }
    },
    
    smoothFrequencyData(data, windowSize) {
        const smoothed = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            let sum = 0;
            let count = 0;
            for (let j = -windowSize; j <= windowSize; j++) {
                const idx = i + j;
                if (idx >= 0 && idx < data.length) {
                    sum += data[idx];
                    count++;
                }
            }
            smoothed[i] = sum / count;
        }
        return smoothed;
    },
    
    // Helper to get point on a rounded rectangle path using angle-based approach
    getRoundedRectPoint(centerX, centerY, halfWidth, halfHeight, borderRadius, t, offset) {
        // Convert t (0-1) to angle (0 to 2*PI), starting from top center going clockwise
        const angle = t * Math.PI * 2 - Math.PI / 2;
        
        // Calculate direction from center
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        
        // Find intersection with rounded rectangle
        // Use superellipse approximation for smooth rounded rect
        const n = 4; // Controls roundness (higher = more rectangular)
        const effectiveWidth = halfWidth - borderRadius * 0.3;
        const effectiveHeight = halfHeight - borderRadius * 0.3;
        
        // Calculate point on superellipse
        const abscos = Math.abs(cosA);
        const abssin = Math.abs(sinA);
        
        let x, y;
        if (abscos < 0.0001) {
            x = centerX;
            y = centerY + Math.sign(sinA) * halfHeight;
        } else if (abssin < 0.0001) {
            x = centerX + Math.sign(cosA) * halfWidth;
            y = centerY;
        } else {
            // Superellipse formula for smooth rounded rectangle
            const r = Math.pow(
                Math.pow(abscos / halfWidth, n) + Math.pow(abssin / halfHeight, n),
                -1 / n
            );
            x = centerX + cosA * r;
            y = centerY + sinA * r;
        }
        
        // Apply offset outward from center
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            x += (dx / dist) * offset;
            y += (dy / dist) * offset;
        }
        
        return { x, y };
    },
    
    drawAlbumArtWaves(data) {
        const bounds = this.getAlbumArtBounds();
        if (!bounds) return;
        
        const { x, y, width, height } = bounds;
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const borderRadius = 20; // Match the CSS border-radius
        const smoothedData = this.smoothFrequencyData(data, 3);
        
        const bass = this.smoothedBass;
        const mid = this.smoothedMid;
        const treble = this.smoothedTreble;
        
        // Draw flowing rounded-rect rings
        const rings = [
            { offset: 10, intensity: bass, hue: 250, alpha: 0.6, lineWidth: 2.5 },
            { offset: 25, intensity: mid, hue: 270, alpha: 0.4, lineWidth: 2 },
            { offset: 42, intensity: treble, hue: 290, alpha: 0.25, lineWidth: 1.5 }
        ];
        
        rings.forEach((ring, ringIndex) => {
            this.ctx.beginPath();
            
            const points = 100; // More points for smoother animation
            const pathPoints = [];
            
            for (let i = 0; i < points; i++) {
                const t = i / points;
                const dataIndex = Math.floor(t * smoothedData.length);
                const value = smoothedData[dataIndex] || 0;
                const normalizedValue = value / 255;
                
                // Get base point on rounded rect
                const basePoint = this.getRoundedRectPoint(x, y, halfWidth, halfHeight, borderRadius, t, ring.offset);
                
                // Add flowing deformation
                const wave1 = Math.sin(t * Math.PI * 6 + this.time * 2.5) * 6 * ring.intensity;
                const wave2 = Math.sin(t * Math.PI * 10 - this.time * 1.8) * 3 * ring.intensity;
                const pulse = Math.sin(this.time * 3 + ringIndex * 0.7) * 4 * ring.intensity;
                const freqDeform = normalizedValue * 18 * (0.4 + ring.intensity * 0.6);
                
                const totalDeform = wave1 + wave2 + pulse + freqDeform;
                
                // Apply deformation outward from center
                const dx = basePoint.x - x;
                const dy = basePoint.y - y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0) {
                    pathPoints.push({
                        x: basePoint.x + (dx / dist) * totalDeform,
                        y: basePoint.y + (dy / dist) * totalDeform
                    });
                } else {
                    pathPoints.push(basePoint);
                }
            }
            
            // Draw smooth closed curve
            if (pathPoints.length > 2) {
                this.ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
                
                for (let i = 1; i < pathPoints.length; i++) {
                    const prev = pathPoints[i - 1];
                    const curr = pathPoints[i];
                    const next = pathPoints[(i + 1) % pathPoints.length];
                    
                    const xc = (curr.x + next.x) / 2;
                    const yc = (curr.y + next.y) / 2;
                    this.ctx.quadraticCurveTo(curr.x, curr.y, xc, yc);
                }
                
                // Close smoothly to start
                const last = pathPoints[pathPoints.length - 1];
                const first = pathPoints[0];
                const xc = (last.x + first.x) / 2;
                const yc = (last.y + first.y) / 2;
                this.ctx.quadraticCurveTo(last.x, last.y, first.x, first.y);
            }
            
            this.ctx.closePath();
            this.ctx.strokeStyle = `hsla(${ring.hue}, 75%, 60%, ${ring.alpha * (0.6 + ring.intensity * 0.6)})`;
            this.ctx.lineWidth = ring.lineWidth * (1 + ring.intensity * 0.3);
            this.ctx.stroke();
        });
        
        // Soft glow around album art (rounded rect shaped)
        const glowIntensity = (bass + mid) / 2;
        if (glowIntensity > 0.1) {
            const glowSize = 50;
            const gradient = this.ctx.createRadialGradient(x, y, Math.max(halfWidth, halfHeight), x, y, Math.max(halfWidth, halfHeight) + glowSize);
            gradient.addColorStop(0, 'rgba(139, 92, 246, 0)');
            gradient.addColorStop(0.5, `rgba(139, 92, 246, ${glowIntensity * 0.1})`);
            gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
            
            this.ctx.beginPath();
            this.ctx.roundRect(x - halfWidth - glowSize, y - halfHeight - glowSize, width + glowSize * 2, height + glowSize * 2, borderRadius + glowSize);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }
    },
    
    updateParticles() {
        const intensity = this.smoothedIntensity;
        const boost = 1 + intensity * 2.5;
        const isMobile = window.innerWidth <= 768;
        const minX = isMobile ? 0 : this.sidebarWidth;
        
        this.particles.forEach(p => {
            p.prevX = p.x;
            p.prevY = p.y;
            
            // Smooth organic movement
            const waveX = Math.sin(this.time * 1.5 + p.hue * 0.1) * 0.3;
            const waveY = Math.cos(this.time * 1.5 + p.hue * 0.1) * 0.3;
            
            p.x += (p.speedX + waveX) * boost;
            p.y += (p.speedY + waveY) * boost;
            
            // Wrap around
            if (p.x < minX) { p.x = this.canvas.width; p.prevX = p.x; }
            if (p.x > this.canvas.width) { p.x = minX; p.prevX = p.x; }
            if (p.y < 0) { p.y = this.canvas.height; p.prevY = p.y; }
            if (p.y > this.canvas.height) { p.y = 0; p.prevY = p.y; }
            
            // Draw trail
            const trailOpacity = p.opacity * (0.4 + intensity * 0.5);
            this.ctx.beginPath();
            this.ctx.moveTo(p.prevX, p.prevY);
            this.ctx.lineTo(p.x, p.y);
            this.ctx.strokeStyle = `hsla(${p.hue + intensity * 20}, 65%, 60%, ${trailOpacity})`;
            this.ctx.lineWidth = p.size * (0.8 + intensity * 0.4);
            this.ctx.lineCap = 'round';
            this.ctx.stroke();
            
            // Particle head with subtle glow
            const size = p.size * (1 + intensity * 0.8);
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${p.hue + intensity * 20}, 75%, 70%, ${p.opacity * (0.7 + intensity * 0.3)})`;
            this.ctx.fill();
            
            if (intensity > 0.2) {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, size * 2, 0, Math.PI * 2);
                this.ctx.fillStyle = `hsla(${p.hue}, 65%, 60%, ${intensity * 0.12})`;
                this.ctx.fill();
            }
        });
    }
};

// ============================================
// UTILITIES
// ============================================
const Utils = {
    formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
};

// ============================================
// UPLOAD HANDLER
// ============================================
DOM.uploadBtn.addEventListener('click', () => {
    DOM.folderInput.click();
});

DOM.folderInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        AudioEngine.init();
        TrackManager.loadFolder(e.target.files);
    }
});

// Drag and drop support
document.addEventListener('dragover', (e) => {
    e.preventDefault();
    document.body.classList.add('drag-over');
});

document.addEventListener('dragleave', () => {
    document.body.classList.remove('drag-over');
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
    document.body.classList.remove('drag-over');
    
    const items = e.dataTransfer.items;
    if (items) {
        const files = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i].webkitGetAsEntry();
            if (item) {
                if (item.isFile) {
                    item.file(f => files.push(f));
                } else if (item.isDirectory) {
                    readDirectory(item, files);
                }
            }
        }
        
        // Wait a bit for files to be collected
        setTimeout(() => {
            if (files.length > 0) {
                AudioEngine.init();
                TrackManager.loadFolder(files);
            }
        }, 500);
    }
});

function readDirectory(directory, files) {
    const reader = directory.createReader();
    reader.readEntries((entries) => {
        entries.forEach(entry => {
            if (entry.isFile) {
                entry.file(f => files.push(f));
            } else if (entry.isDirectory) {
                readDirectory(entry, files);
            }
        });
    });
}

// ============================================
// MOBILE MENU
// ============================================
const MobileMenu = {
    isOpen: false,
    
    init() {
        // Mobile menu toggle
        if (DOM.mobileMenuBtn) {
            DOM.mobileMenuBtn.addEventListener('click', () => this.toggle());
        }
        
        // Mobile upload button
        if (DOM.mobileUploadBtn && DOM.mobileFolderInput) {
            DOM.mobileUploadBtn.addEventListener('click', () => {
                DOM.mobileFolderInput.click();
            });
            
            DOM.mobileFolderInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    AudioEngine.init();
                    TrackManager.loadFolder(e.target.files);
                    this.close();
                }
            });
        }
        
        // Mobile effects sliders - sync with desktop
        this.initMobileEffects();
    },
    
    initMobileEffects() {
        if (!DOM.mobileBass) return;
        
        // Bass slider
        DOM.mobileBass.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            AudioEngine.setBass(value);
            DOM.mobileBassValue.textContent = `${value > 0 ? '+' : ''}${value} dB`;
            // Sync with desktop slider
            if (DOM.bassSlider) {
                DOM.bassSlider.value = value;
                DOM.bassValue.textContent = `${value > 0 ? '+' : ''}${value} dB`;
            }
        });
        
        // Mid slider
        DOM.mobileMid.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            AudioEngine.setMid(value);
            DOM.mobileMidValue.textContent = `${value > 0 ? '+' : ''}${value} dB`;
            if (DOM.midSlider) {
                DOM.midSlider.value = value;
                DOM.midValue.textContent = `${value > 0 ? '+' : ''}${value} dB`;
            }
        });
        
        // Treble slider
        DOM.mobileTreble.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            AudioEngine.setTreble(value);
            DOM.mobileTrebleValue.textContent = `${value > 0 ? '+' : ''}${value} dB`;
            if (DOM.trebleSlider) {
                DOM.trebleSlider.value = value;
                DOM.trebleValue.textContent = `${value > 0 ? '+' : ''}${value} dB`;
            }
        });
        
        // Gain slider (converts 0-2 decimal to percentage)
        DOM.mobileGain.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            const percentage = Math.round(value * 100);
            AudioEngine.setGain(percentage);
            DOM.mobileGainValue.textContent = `${percentage}%`;
            if (DOM.gainSlider) {
                DOM.gainSlider.value = percentage;
                DOM.gainValue.textContent = `${percentage}%`;
            }
        });
    },
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },
    
    open() {
        this.isOpen = true;
        DOM.mobileDropdown.classList.add('open');
        DOM.mobileMenuBtn.classList.add('active');
        DOM.mobileMenuBtn.innerHTML = '<i class="fas fa-times"></i>';
    },
    
    close() {
        this.isOpen = false;
        DOM.mobileDropdown.classList.remove('open');
        DOM.mobileMenuBtn.classList.remove('active');
        DOM.mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
    },
    
    // Sync mobile controls with desktop values
    syncValues() {
        if (!DOM.mobileBass) return;
        
        if (DOM.bassSlider) {
            DOM.mobileBass.value = DOM.bassSlider.value;
            DOM.mobileBassValue.textContent = DOM.bassValue.textContent;
        }
        if (DOM.midSlider) {
            DOM.mobileMid.value = DOM.midSlider.value;
            DOM.mobileMidValue.textContent = DOM.midValue.textContent;
        }
        if (DOM.trebleSlider) {
            DOM.mobileTreble.value = DOM.trebleSlider.value;
            DOM.mobileTrebleValue.textContent = DOM.trebleValue.textContent;
        }
        if (DOM.gainSlider) {
            DOM.mobileGain.value = DOM.gainSlider.value;
            DOM.mobileGainValue.textContent = DOM.gainValue.textContent;
        }
    }
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    PlaybackControls.init();
    ProgressControls.init();
    VolumeControls.init();
    EffectsControls.init();
    Visualizer.init();
    MobileMenu.init();
    
    console.log('🎵 Tuunixx initialized');
});
