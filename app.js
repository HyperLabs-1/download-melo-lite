/**
 * MELO LITE PRO — JAVASCRIPT APPLICATION CORE
 * Pro-tier Web Audio synth engine, real-time visualizer, interactive 3D phone demo,
 * dynamic theme switcher, animated FAQ accordion, and AI support bot.
 * (c) 2026 Hyperlabs
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================================
     1. THEME SWITCHER
     ========================================================================== */
  const htmlRoot = document.documentElement;
  const themeDots = document.querySelectorAll('.theme-dot');

  themeDots.forEach(dot => {
    dot.addEventListener('click', () => {
      const selectedColor = dot.getAttribute('data-color');
      
      themeDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      
      htmlRoot.setAttribute('data-theme', selectedColor);
      localStorage.setItem('melo_theme', selectedColor);
    });
  });

  // Restore saved theme
  const savedTheme = localStorage.getItem('melo_theme');
  if (savedTheme) {
    htmlRoot.setAttribute('data-theme', savedTheme);
    themeDots.forEach(dot => {
      if (dot.getAttribute('data-color') === savedTheme) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  /* ==========================================================================
     2. MOBILE DRAWER NAVIGATION
     ========================================================================== */
  const burgerToggle = document.getElementById('burgerToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const closeMobileDrawer = document.getElementById('closeMobileDrawer');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');

  function toggleMobileMenu(open) {
    if (open) {
      mobileDrawer.classList.add('open');
      burgerToggle.classList.add('open');
      document.body.style.overflow = 'hidden';
    } else {
      mobileDrawer.classList.remove('open');
      burgerToggle.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  if (burgerToggle) {
    burgerToggle.addEventListener('click', () => {
      const isOpen = mobileDrawer.classList.contains('open');
      toggleMobileMenu(!isOpen);
    });
  }

  if (closeMobileDrawer) {
    closeMobileDrawer.addEventListener('click', () => toggleMobileMenu(false));
  }

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => toggleMobileMenu(false));
  });

  /* ==========================================================================
     3. HEADER SCROLL GLASS BLUR EFFECT
     ========================================================================== */
  const navContainer = document.querySelector('.nav-container');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navContainer.classList.add('nav-scrolled');
    } else {
      navContainer.classList.remove('nav-scrolled');
    }
  }, { passive: true });

  /* ==========================================================================
     4. DEMO PLAYLIST & AUDIO SYNTH ENGINE
     ========================================================================== */
  const playlist = [
    {
      title: 'Hyperion Dreamscape',
      artist: 'Melo Sounds • FLAC 24-bit',
      duration: 210,
      cover: 'assets/images/melo-now-playing.jpeg',
      chords: [261.63, 329.63, 392.00, 523.25], // C major 7
      subBass: 65.41
    },
    {
      title: 'Solar Flare Odyssey',
      artist: 'Aetheria • Lossless Studio',
      duration: 185,
      cover: 'assets/images/melo-home.jpeg',
      chords: [220.00, 261.63, 329.63, 440.00], // A minor 7
      subBass: 55.00
    },
    {
      title: 'Neon Velocity',
      artist: 'Cyberpulse • 320kbps MP3',
      duration: 240,
      cover: 'assets/images/melo-lyrics.jpeg',
      chords: [349.23, 440.00, 523.25, 659.25], // F major 7
      subBass: 87.31
    }
  ];

  let currentTrackIndex = 0;
  let isPlaying = false;
  let playbackSeconds = 74;
  let playbackTimer = null;

  // Web Audio Context & Nodes
  let audioCtx = null;
  let masterGain = null;
  let bassFilter = null;
  let analyser = null;
  let synthNodes = [];

  function initAudioEngine() {
    if (audioCtx) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();

      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.3, audioCtx.currentTime);

      bassFilter = audioCtx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.setValueAtTime(120, audioCtx.currentTime);
      bassFilter.gain.setValueAtTime(6.0, audioCtx.currentTime); // default bass boost

      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;

      // Connect: Synth -> BassFilter -> MasterGain -> Analyser -> Destination
      bassFilter.connect(masterGain);
      masterGain.connect(analyser);
      analyser.connect(audioCtx.destination);
    } catch (e) {
      console.warn('Web Audio not supported or blocked:', e);
    }
  }

  function startSynthPlayback() {
    initAudioEngine();
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    stopSynthPlayback();

    const track = playlist[currentTrackIndex];
    const now = audioCtx.currentTime;

    // Create a lush ambient pad chord
    track.chords.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      // Gentle LFO pitch vibrato for organic sound
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.setValueAtTime(0.5 + i * 0.2, now);
      lfoGain.gain.setValueAtTime(1.5, now);
      lfo.connect(osc.frequency);
      lfo.start();

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 1.2);

      osc.connect(gain);
      gain.connect(bassFilter);
      osc.start();

      synthNodes.push(osc, gain, lfo, lfoGain);
    });

    // Sub-bass oscillator
    const subOsc = audioCtx.createOscillator();
    const subGain = audioCtx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(track.subBass, now);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.exponentialRampToValueAtTime(0.2, now + 0.8);

    subOsc.connect(subGain);
    subGain.connect(bassFilter);
    subOsc.start();

    synthNodes.push(subOsc, subGain);
  }

  function stopSynthPlayback() {
    synthNodes.forEach(node => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (err) {}
    });
    synthNodes = [];
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function updateTrackUI() {
    const track = playlist[currentTrackIndex];

    // Phone Center elements
    const centerTitle = document.getElementById('centerTrackTitle');
    const centerArtist = document.getElementById('centerTrackArtist');
    const phoneDuration = document.getElementById('phoneDuration');
    const phoneCurrentTime = document.getElementById('phoneCurrentTime');
    const phoneScrubProgress = document.getElementById('phoneScrubProgress');

    if (centerTitle) centerTitle.textContent = track.title;
    if (centerArtist) centerArtist.textContent = track.artist;
    if (phoneDuration) phoneDuration.textContent = formatTime(track.duration);
    if (phoneCurrentTime) phoneCurrentTime.textContent = formatTime(playbackSeconds);

    const progressPercent = (playbackSeconds / track.duration) * 100;
    if (phoneScrubProgress) phoneScrubProgress.style.width = `${progressPercent}%`;

    // Dock elements
    const dockTrackTitle = document.getElementById('dockTrackTitle');
    const dockTrackArtist = document.getElementById('dockTrackArtist');
    const dockArtImg = document.getElementById('dockArtImg');

    if (dockTrackTitle) dockTrackTitle.textContent = track.title;
    if (dockTrackArtist) dockTrackArtist.textContent = track.artist;
    if (dockArtImg) dockArtImg.src = track.cover;
  }

  function togglePlay() {
    isPlaying = !isPlaying;

    const vinyl = document.getElementById('phoneVinyl');
    const phonePlayIcon = document.getElementById('phonePlayIcon');
    const dockPlayIcon = document.getElementById('dockPlayIcon');

    if (isPlaying) {
      startSynthPlayback();
      if (vinyl) vinyl.classList.remove('paused');

      const pauseSvg = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
      if (phonePlayIcon) phonePlayIcon.innerHTML = pauseSvg;
      if (dockPlayIcon) dockPlayIcon.innerHTML = pauseSvg;

      // Timer
      clearInterval(playbackTimer);
      playbackTimer = setInterval(() => {
        playbackSeconds++;
        const currentTrack = playlist[currentTrackIndex];
        if (playbackSeconds >= currentTrack.duration) {
          nextTrack();
        } else {
          updateTrackUI();
        }
      }, 1000);

    } else {
      stopSynthPlayback();
      if (vinyl) vinyl.classList.add('paused');

      const playSvg = '<polygon points="5 3 19 12 5 21 5 3"/>';
      if (phonePlayIcon) phonePlayIcon.innerHTML = playSvg;
      if (dockPlayIcon) dockPlayIcon.innerHTML = playSvg;

      clearInterval(playbackTimer);
    }
  }

  function nextTrack() {
    currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
    playbackSeconds = 0;
    updateTrackUI();
    if (isPlaying) startSynthPlayback();
  }

  function prevTrack() {
    currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    playbackSeconds = 0;
    updateTrackUI();
    if (isPlaying) startSynthPlayback();
  }

  // Bind Listeners for Phone Center Player
  const phonePlayBtn = document.getElementById('phonePlayBtn');
  const phoneNextBtn = document.getElementById('phoneNextBtn');
  const phonePrevBtn = document.getElementById('phonePrevBtn');
  const playHeroDemoBtn = document.getElementById('playHeroDemoBtn');

  if (phonePlayBtn) phonePlayBtn.addEventListener('click', togglePlay);
  if (phoneNextBtn) phoneNextBtn.addEventListener('click', nextTrack);
  if (phonePrevBtn) phonePrevBtn.addEventListener('click', prevTrack);
  if (playHeroDemoBtn) playHeroDemoBtn.addEventListener('click', () => {
    if (!isPlaying) togglePlay();
    document.getElementById('experience').scrollIntoView({ behavior: 'smooth' });
  });

  // Bind Listeners for Floating Dock Player
  const dockPlayBtn = document.getElementById('dockPlayBtn');
  const dockNextBtn = document.getElementById('dockNextBtn');
  const dockPrevBtn = document.getElementById('dockPrevBtn');

  if (dockPlayBtn) dockPlayBtn.addEventListener('click', togglePlay);
  if (dockNextBtn) dockNextBtn.addEventListener('click', nextTrack);
  if (dockPrevBtn) dockPrevBtn.addEventListener('click', prevTrack);

  // Initial UI Render
  updateTrackUI();

  /* ==========================================================================
     5. DOCKED REAL-TIME CANVAS SPECTRUM VISUALIZER
     ========================================================================== */
  const canvas = document.getElementById('dockCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const bufferLength = 24;
    const dataArray = new Uint8Array(bufferLength);

    function renderVisualizer() {
      requestAnimationFrame(renderVisualizer);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        // Idle ambient gentle wave
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = Math.sin(Date.now() * 0.003 + i * 0.3) * 12 + 18;
        }
      }

      const barWidth = (width / bufferLength) * 0.7;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const val = dataArray[i];
        const barHeight = Math.max(3, (val / 255) * height * 0.95);

        // Get dynamic accent color from theme
        const computedStyle = getComputedStyle(document.documentElement);
        const primaryColor = computedStyle.getPropertyValue('--accent-primary').trim() || '#ff9d3b';
        const secondaryColor = computedStyle.getPropertyValue('--accent-secondary').trim() || '#8b5cf6';

        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(1, secondaryColor);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, height - barHeight, barWidth, barHeight, 2);
        ctx.fill();

        x += barWidth + 3.5;
      }
    }

    renderVisualizer();
  }

  /* ==========================================================================
     6. INTERACTIVE 10-BAND EQUALIZER & BASS BOOST
     ========================================================================== */
  const eqSliders = document.querySelectorAll('.eq-slider');
  eqSliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      const band = e.target.getAttribute('data-band');
      
      // If we have an active Web Audio context, we can adjust bass filter
      if (bassFilter && band === '0') {
        bassFilter.gain.setTargetAtTime(val, audioCtx.currentTime, 0.05);
      }
    });
  });

  const bassBoostToggle = document.getElementById('bassBoostToggle');
  if (bassBoostToggle) {
    bassBoostToggle.addEventListener('click', () => {
      bassBoostToggle.classList.toggle('active');
      const isBoosted = bassBoostToggle.classList.contains('active');

      if (bassFilter && audioCtx) {
        bassFilter.gain.setTargetAtTime(isBoosted ? 9.0 : 0.0, audioCtx.currentTime, 0.1);
      }
    });
  }

  /* ==========================================================================
     7. ECHOMUSIC-STYLE FAQ ACCORDION
     ========================================================================== */
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close other items
      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('active');
          const ans = otherItem.querySelector('.faq-answer');
          if (ans) ans.style.maxHeight = null;
        }
      });

      // Toggle current
      if (!isActive) {
        item.classList.add('active');
        const ans = item.querySelector('.faq-answer');
        if (ans) ans.style.maxHeight = ans.scrollHeight + 40 + 'px';
      } else {
        item.classList.remove('active');
        const ans = item.querySelector('.faq-answer');
        if (ans) ans.style.maxHeight = null;
      }
    });
  });

  /* ==========================================================================
     8. ECHOMUSIC-STYLE SUPPORT FAB & INTERACTIVE BOT
     ========================================================================== */
  const supportFab = document.getElementById('supportFab');
  const supportBubble = document.getElementById('supportBubble');
  const supportTrigger = document.getElementById('supportTrigger');
  const supportModal = document.getElementById('supportModal');
  const closeSupportModal = document.getElementById('closeSupportModal');
  const quickQButtons = document.querySelectorAll('.quick-q-btn');
  const supportBody = document.querySelector('.support-body');

  function openSupport() {
    supportModal.classList.add('open');
    supportBubble.style.display = 'none';
  }

  function closeSupport() {
    supportModal.classList.remove('open');
  }

  if (supportTrigger) supportTrigger.addEventListener('click', openSupport);
  if (supportBubble) supportBubble.addEventListener('click', openSupport);
  if (closeSupportModal) closeSupportModal.addEventListener('click', closeSupport);

  quickQButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const questionText = btn.textContent;
      const answerText = btn.getAttribute('data-answer');

      // Append user message
      const userMsg = document.createElement('div');
      userMsg.style.cssText = 'padding: 8px 12px; border-radius: 12px; background: var(--accent-gradient); color: #080511; font-size: 12.5px; font-weight: 600; align-self: flex-end; max-width: 80%;';
      userMsg.textContent = questionText;
      supportBody.appendChild(userMsg);

      // Scroll to bottom
      supportBody.scrollTop = supportBody.scrollHeight;

      // Simulate bot typing
      setTimeout(() => {
        const botReply = document.createElement('div');
        botReply.className = 'bot-msg';
        botReply.textContent = answerText;
        supportBody.appendChild(botReply);
        supportBody.scrollTop = supportBody.scrollHeight;
      }, 400);
    });
  });

  /* ==========================================================================
     9. DOWNLOAD MODAL & PROGRESS SIMULATION
     ========================================================================== */
  const OFFICIAL_APK_URL = 'https://github.com/HyperLabs-1/download-melo-lite/releases/download/v1.1.0/melolite.apk';
  const heroDownloadBtn = document.getElementById('heroDownloadBtn');
  const directApkCard = document.getElementById('directApkCard');
  const downloadModal = document.getElementById('downloadModal');
  const closeDownloadModal = document.getElementById('closeDownloadModal');
  const downloadProgressFill = document.getElementById('downloadProgressFill');
  const downloadPercentText = document.getElementById('downloadPercentText');
  const downloadStatusText = document.getElementById('downloadStatusText');

  function triggerDownloadProcess(e) {
    if (e && e.preventDefault) e.preventDefault();

    downloadModal.classList.add('open');
    downloadProgressFill.style.width = '0%';
    downloadPercentText.textContent = '0%';
    downloadStatusText.textContent = 'Connecting to GitHub Release servers...';

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 18) + 12;
      if (progress > 100) progress = 100;

      downloadProgressFill.style.width = `${progress}%`;
      downloadPercentText.textContent = `${progress}%`;

      if (progress < 40) {
        downloadStatusText.textContent = 'Downloading melolite.apk (53 MB)...';
      } else if (progress < 85) {
        downloadStatusText.textContent = 'Verifying SHA-256 Hyperlabs signatures...';
      } else {
        downloadStatusText.textContent = 'Transfer complete! Opening package...';
      }

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          downloadStatusText.textContent = 'Saving melolite.apk (53 MB) to Downloads...';

          // Trigger the official APK download from GitHub Releases
          const downloadAnchor = document.createElement('a');
          downloadAnchor.href = OFFICIAL_APK_URL;
          downloadAnchor.download = 'melolite.apk';
          downloadAnchor.target = '_blank';
          downloadAnchor.rel = 'noopener noreferrer';
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          document.body.removeChild(downloadAnchor);

          setTimeout(() => {
            downloadModal.classList.remove('open');
          }, 1800);
        }, 500);
      }
    }, 110);
  }

  if (heroDownloadBtn) {
    heroDownloadBtn.addEventListener('click', triggerDownloadProcess);
  }

  if (directApkCard) {
    directApkCard.addEventListener('click', triggerDownloadProcess);
  }

  if (closeDownloadModal) {
    closeDownloadModal.addEventListener('click', () => {
      downloadModal.classList.remove('open');
    });
  }

  /* ==========================================================================
     10. DYNAMIC HOVER GLOW FOR BENTO GLASS CARDS
     ========================================================================== */
  const bentoCards = document.querySelectorAll('.bento-card');
  bentoCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });

  /* ==========================================================================
     11. INTERACTIVE FULLSCREEN LIGHTBOX MODAL
     ========================================================================== */
  const screenshotData = [
    {
      src: 'assets/images/melo-home.jpeg',
      badge: 'SCREENSHOT 01 / 06',
      title: 'Home & Curated Discovery',
      desc: 'Discover personalized daily mixes, trending charts, mood radios, and your favorite artists in an ad-free, clutter-free Material You glassmorphic interface.'
    },
    {
      src: 'assets/images/melo-now-playing.jpeg',
      badge: 'SCREENSHOT 02 / 06',
      title: 'Studio Now Playing Player',
      desc: 'High-res audio playback engine supporting 24-bit 192kHz FLAC, gapless transitions, dynamic album palette backdrop, and hardware-accelerated sound processing.'
    },
    {
      src: 'assets/images/melo-lyrics.jpeg',
      badge: 'SCREENSHOT 03 / 06',
      title: 'Real-Time Synced Karaoke Lyrics',
      desc: 'Sing along with word-by-word synchronized scrolling lyrics powered by LRCLIB with instant offline caching, romanized lyrics, and translation support.'
    },
    {
      src: 'assets/images/melo-library.jpeg',
      badge: 'SCREENSHOT 04 / 06',
      title: 'Audiophile Library & Offline Vault',
      desc: 'Manage your local music library, downloaded lossless FLAC and 320kbps MP3 files, favorite albums, and custom playlists with instant tag search.'
    },
    {
      src: 'assets/images/melo-listen-together.jpeg',
      badge: 'SCREENSHOT 05 / 06',
      title: 'Listen Together Party Rooms',
      desc: 'Sync and stream music in real-time with friends anywhere across the globe with millisecond synchronization, shared queues, and live emoji reactions.'
    },
    {
      src: 'assets/images/melo-search.jpeg',
      badge: 'SCREENSHOT 06 / 06',
      title: 'Global Search & 1-Click Import',
      desc: 'Instantly find any track, album, or artist, or paste any Spotify, YouTube Music, or Apple Music link to automatically migrate your entire saved library.'
    }
  ];

  let currentLightboxIndex = 0;
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxBadge = document.getElementById('lightboxBadge');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxDesc = document.getElementById('lightboxDesc');
  const closeLightboxBtn = document.getElementById('closeLightboxBtn');
  const lightboxPrevBtn = document.getElementById('lightboxPrevBtn');
  const lightboxNextBtn = document.getElementById('lightboxNextBtn');
  const lightboxDownloadBtn = document.getElementById('lightboxDownloadBtn');

  function openLightbox(index) {
    currentLightboxIndex = parseInt(index, 10) || 0;
    updateLightboxUI();
    if (lightboxModal) {
      lightboxModal.classList.add('open');
      lightboxModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeLightbox() {
    if (lightboxModal) {
      lightboxModal.classList.remove('open');
      lightboxModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  function updateLightboxUI() {
    const data = screenshotData[currentLightboxIndex];
    if (!data) return;
    if (lightboxImg) {
      lightboxImg.src = data.src;
      lightboxImg.alt = data.title;
    }
    if (lightboxBadge) lightboxBadge.innerHTML = `<span>${data.badge}</span>`;
    if (lightboxTitle) lightboxTitle.textContent = data.title;
    if (lightboxDesc) lightboxDesc.textContent = data.desc;
  }

  function nextLightbox() {
    currentLightboxIndex = (currentLightboxIndex + 1) % screenshotData.length;
    updateLightboxUI();
  }

  function prevLightbox() {
    currentLightboxIndex = (currentLightboxIndex - 1 + screenshotData.length) % screenshotData.length;
    updateLightboxUI();
  }

  // Attach click listeners to all elements with data-lightbox-index
  document.querySelectorAll('[data-lightbox-index]').forEach(elem => {
    elem.addEventListener('click', (e) => {
      // Don't trigger if user clicked play button inside center phone
      if (e.target.closest('#phonePlayBtn')) return;
      const idx = elem.getAttribute('data-lightbox-index');
      openLightbox(idx);
    });
  });

  if (closeLightboxBtn) closeLightboxBtn.addEventListener('click', closeLightbox);
  if (lightboxNextBtn) lightboxNextBtn.addEventListener('click', nextLightbox);
  if (lightboxPrevBtn) lightboxPrevBtn.addEventListener('click', prevLightbox);

  if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) closeLightbox();
    });
  }

  if (lightboxDownloadBtn) {
    lightboxDownloadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeLightbox();
      triggerDownloadProcess();
    });
  }

  // Keyboard navigation for Lightbox
  document.addEventListener('keydown', (e) => {
    if (!lightboxModal || !lightboxModal.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowRight') nextLightbox();
    else if (e.key === 'ArrowLeft') prevLightbox();
  });

});
