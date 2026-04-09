(() => {
  const FIREWORKS_MS = 5200;
  const MESSAGE_MS = 2200;
  const SLIDE_MS = 3200;
  const VIDEO_MS = 6500;
  /** iOS Safari : comportement différent (autoplay, buffer, limite bande passante). */
  const isIOS =
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  // Pour iPhone + connexions faibles: on préfère des MP4 optimisées si elles existent
  // (ex: 03.mp4), sinon on retombe sur le .MOV original.
  const media = [
    { sources: ["assets/photos/01.jpeg"] },
    { sources: ["assets/photos/02.jpeg"] },
    { sources: ["assets/photos/03.mp4"] },
    { sources: ["assets/photos/04.jpeg"] },
    { sources: ["assets/photos/05.jpeg"] },
    { sources: ["assets/photos/06.mp4"] },
    { sources: ["assets/photos/07.mp4"] },
  ];

  /** Dernière image affichée : sert de fond pendant le buffer vidéo (fluide sur mobile). */
  let lastImageBackdrop = media[0].sources[0];

  const canvas = document.getElementById("fx");
  const ctx = canvas.getContext("2d", { alpha: true });

  const panelIntro = document.getElementById("panel-intro");
  const panelMessage = document.getElementById("panel-message");
  const panelGallery = document.getElementById("panel-gallery");

  const slideImg = document.getElementById("slide-img");
  const slideVideo = document.getElementById("slide-video");
  const dotsEl = document.getElementById("dots");
  const prevBtn = document.getElementById("prev");
  const nextBtn = document.getElementById("next");
  const audio = document.getElementById("audio");
  const audioGate = document.getElementById("audio-gate");
  const videoGate = document.getElementById("video-gate");

  let w = 0;
  let h = 0;
  let dpr = 1;

  const rand = (a, b) => a + Math.random() * (b - a);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.floor(window.innerWidth);
    h = Math.floor(window.innerHeight);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();

  // ---------- Fireworks ----------
  const particles = [];
  const sparks = [];
  let runningFx = true;

  function addExplosion(x, y) {
    const hue = rand(0, 360);
    const count = Math.floor(rand(55, 95));
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(2.2, 6.8);
      particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(40, 72),
        age: 0,
        hue,
        size: rand(1.2, 2.6),
        drag: rand(0.94, 0.985),
        grav: rand(0.05, 0.12),
      });
    }

    const glow = Math.floor(rand(10, 22));
    for (let i = 0; i < glow; i++) {
      const a = rand(0, Math.PI * 2);
      sparks.push({
        x,
        y,
        vx: Math.cos(a) * rand(0.5, 2.2),
        vy: Math.sin(a) * rand(0.5, 2.2),
        life: rand(18, 26),
        age: 0,
        hue,
        size: rand(10, 18),
      });
    }
  }

  let nextBoomAt = 0;
  function maybeBoom(t) {
    if (t < nextBoomAt) return;
    nextBoomAt = t + rand(90, 180);
    addExplosion(rand(0.12, 0.88) * w, rand(0.12, 0.62) * h);
  }

  function stepFx(t) {
    if (!runningFx && particles.length === 0 && sparks.length === 0) {
      ctx.clearRect(0, 0, w, h);
      return;
    }

    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, 0, w, h);

    if (runningFx) maybeBoom(t);

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.age += 1;
      s.x += s.vx;
      s.y += s.vy;
      const p = s.age / s.life;
      const a = Math.max(0, 1 - p);
      ctx.beginPath();
      ctx.fillStyle = `hsla(${s.hue}, 95%, 65%, ${a * 0.10})`;
      ctx.arc(s.x, s.y, s.size * (1 - p * 0.35), 0, Math.PI * 2);
      ctx.fill();
      if (s.age >= s.life) sparks.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += 1;
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.grav;
      p.x += p.vx;
      p.y += p.vy;

      const lifeP = p.age / p.life;
      const a = Math.max(0, 1 - lifeP);

      ctx.beginPath();
      ctx.fillStyle = `hsla(${p.hue}, 95%, 62%, ${a})`;
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      if (p.age >= p.life) particles.splice(i, 1);
    }

    requestAnimationFrame(stepFx);
  }

  requestAnimationFrame(stepFx);

  // ---------- Panels ----------
  function show(el) {
    el.classList.remove("is-hidden");
  }
  function hide(el) {
    el.classList.add("is-hidden");
  }

  // ---------- Slideshow ----------
  let idx = 0;
  let slideTimer = null;
  let isVideoPlaying = false;
  let videoUnlockHandler = null;
  let activeSlideToken = 0;

  const PRELOAD_LINK_IDS = ["preload-video-a", "preload-video-b"];

  function extOf(path) {
    const q = path.split("?")[0];
    const parts = q.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  }

  function isVideo(path) {
    const ext = extOf(path);
    return ext === "mp4" || ext === "mov";
  }

  function sourceMime(path) {
    const ext = extOf(path);
    if (ext === "mp4") return "video/mp4";
    if (ext === "mov") return "video/quicktime";
    return "";
  }

  function clampIndex(i) {
    const n = media.length;
    return ((i % n) + n) % n;
  }

  function resetVideoEl() {
    try {
      slideVideo.pause();
    } catch {
      // ignore
    }
    slideVideo.classList.remove("is-visible");
    slideVideo.classList.add("is-hidden");
    slideVideo.removeAttribute("src");
    slideVideo.innerHTML = "";
    try {
      slideVideo.load();
    } catch {
      // ignore
    }
  }

  function setupVideoAttrs() {
    slideVideo.loop = true;
    slideVideo.muted = true;
    slideVideo.defaultMuted = true;
    slideVideo.volume = 0;
    slideVideo.setAttribute("muted", "");
    slideVideo.playsInline = true;
    slideVideo.setAttribute("playsinline", "");
    slideVideo.setAttribute("webkit-playsinline", "");
    slideVideo.autoplay = true;
    slideVideo.setAttribute("autoplay", "");
    slideVideo.preload = "auto";
    slideVideo.setAttribute("preload", "auto");
  }

  /**
   * Safari iOS gère souvent mieux une seule URL sur .src que des <source type="...">.
   * Sur desktop, les <source> restent utiles si plusieurs formats.
   */
  function applyVideoSources(sources) {
    slideVideo.innerHTML = "";
    slideVideo.removeAttribute("src");
    if (sources.length === 1 || isIOS) {
      slideVideo.src = sources[0];
      return;
    }
    for (const s of sources) {
      const el = document.createElement("source");
      el.src = s;
      const type = sourceMime(s);
      if (type) el.type = type;
      slideVideo.appendChild(el);
    }
  }

  /**
   * Précharge les 2 prochaines vidéos du carrousel (même ordre que les slides).
   * Utilise <link rel="preload" as="video"> : léger sur iOS, pas de 2e décodeur vidéo.
   */
  function updateVideoPreloads(currentIdx) {
    const hrefs = [];
    for (let step = 1; step <= media.length && hrefs.length < 2; step++) {
      const j = clampIndex(currentIdx + step);
      const s = media[j].sources[0];
      if (isVideo(s)) {
        try {
          hrefs.push(new URL(s, window.location.href).href);
        } catch {
          hrefs.push(s);
        }
      }
    }
    for (let i = 0; i < PRELOAD_LINK_IDS.length; i++) {
      const id = PRELOAD_LINK_IDS[i];
      const existing = document.getElementById(id);
      const href = hrefs[i];
      if (!href) {
        if (existing) existing.remove();
        continue;
      }
      let link = existing;
      if (!link) {
        link = document.createElement("link");
        link.id = id;
        link.rel = "preload";
        link.as = "video";
        document.head.appendChild(link);
      }
      link.href = href;
    }
  }

  function warmupNextImageIfAny(currentIdx) {
    const j = clampIndex(currentIdx + 1);
    const s = media[j].sources[0];
    if (!isVideo(s)) {
      const img = new Image();
      img.decoding = "async";
      img.src = s;
    }
  }

  function buildDots() {
    dotsEl.innerHTML = "";
    for (let i = 0; i < media.length; i++) {
      const d = document.createElement("div");
      d.className = "dot" + (i === idx ? " is-active" : "");
      dotsEl.appendChild(d);
    }
  }

  function setDotActive() {
    const kids = dotsEl.children;
    for (let i = 0; i < kids.length; i++) {
      kids[i].classList.toggle("is-active", i === idx);
    }
  }

  function renderSlide() {
    activeSlideToken += 1;
    const token = activeSlideToken;

    isVideoPlaying = false;
    slideImg.classList.remove("is-visible");
    slideVideo.classList.remove("is-visible");
    if (videoGate) videoGate.classList.add("is-hidden");

    const sources = media[idx].sources;
    const firstSrc = sources[0];
    if (isVideo(firstSrc)) {
      // Fond = dernière photo affichée (pas d’écran vide pendant le buffer)
      slideImg.classList.remove("is-hidden");
      slideImg.src = lastImageBackdrop;
      requestAnimationFrame(() => slideImg.classList.add("is-visible"));

      slideVideo.classList.remove("is-hidden");
      slideVideo.classList.remove("is-visible");

      // Reset complet + URL (iOS) ou <source> (desktop multi-format)
      resetVideoEl();
      setupVideoAttrs();
      applyVideoSources(sources);
      slideVideo.classList.remove("is-hidden");
      slideVideo.currentTime = 0;
      slideVideo.load();

      let readyFired = false;
      let playingScheduled = false;
      let stallTimer = null;

      const attemptPlay = async () => {
        try {
          slideVideo.muted = true;
          slideVideo.setAttribute("muted", "");
          await slideVideo.play();
          if (token !== activeSlideToken) return false;
          isVideoPlaying = true;
          if (videoGate) videoGate.classList.add("is-hidden");
          if (videoUnlockHandler) {
            window.removeEventListener("pointerdown", videoUnlockHandler);
            window.removeEventListener("touchstart", videoUnlockHandler);
            videoUnlockHandler = null;
          }
          return true;
        } catch {
          return false;
        }
      };

      const cleanup = () => {
        if (stallTimer) window.clearTimeout(stallTimer);
        slideVideo.removeEventListener("error", onError);
        slideVideo.removeEventListener("canplaythrough", onReady);
        slideVideo.removeEventListener("canplay", onReadyFallback);
        slideVideo.removeEventListener("loadeddata", onReadyFallback);
        slideVideo.removeEventListener("playing", onPlaying);
      };

      const failAndContinue = (reason) => {
        cleanup();
        if (token !== activeSlideToken) return;

        resetVideoEl();
        slideImg.classList.remove("is-hidden");
        slideImg.src = createFallbackDataUrl(reason);
        requestAnimationFrame(() => slideImg.classList.add("is-visible"));

        window.setTimeout(() => {
          if (token === activeSlideToken) {
            next();
            scheduleNext();
          }
        }, 1200);
      };

      const onError = () => {
        failAndContinue("Vidéo non lisible. Convertis en MP4 (H.264, yuv420p).");
      };

      const onPlaying = () => {
        if (token !== activeSlideToken) return;
        isVideoPlaying = true;
        if (videoGate) videoGate.classList.add("is-hidden");
        slideImg.classList.remove("is-visible");
        slideImg.classList.add("is-hidden");
        slideVideo.classList.add("is-visible");
        // Une seule fois par slide : en boucle, `playing` peut se répéter.
        if (!playingScheduled) {
          playingScheduled = true;
          scheduleNext();
        }
      };

      const onReady = async () => {
        if (readyFired) return;
        readyFired = true;
        const ok = await attemptPlay();
        if (!ok) {
          if (videoGate) {
            videoGate.textContent = "Touchez l’écran pour lancer la vidéo";
            videoGate.classList.remove("is-hidden");
          }
          if (!videoUnlockHandler) {
            videoUnlockHandler = () => {
              attemptPlay().then((worked) => {
                if (!worked) {
                  failAndContinue("Lecture impossible sur cet iPhone.");
                }
              });
            };
            window.addEventListener("pointerdown", videoUnlockHandler, { once: true });
            window.addEventListener("touchstart", videoUnlockHandler, { once: true });
          }

          // Sur mobile lent, ne pas abandonner avant d’avoir laissé le temps au buffer.
          stallTimer = window.setTimeout(() => {
            if (token === activeSlideToken && !isVideoPlaying) {
              failAndContinue("Vidéo trop lente à charger. Passe au suivant…");
            }
          }, isIOS ? 45000 : 25000);
        }
      };

      const onReadyFallback = async () => {
        if (readyFired) return;
        await onReady();
      };

      slideVideo.addEventListener("error", onError);
      slideVideo.addEventListener("playing", onPlaying);
      slideVideo.addEventListener("canplaythrough", onReady, { once: true });
      slideVideo.addEventListener("canplay", onReadyFallback, { once: true });
      slideVideo.addEventListener("loadeddata", onReadyFallback, { once: true });

      // Kick rapide : parfois iOS accepte play() avant canplaythrough.
      window.setTimeout(() => {
        if (token !== activeSlideToken || readyFired) return;
        attemptPlay().then((worked) => {
          if (!worked && videoGate) {
            videoGate.textContent = "Touchez l’écran pour lancer la vidéo";
            videoGate.classList.remove("is-hidden");
          }
        });
      }, isIOS ? 80 : 200);
    } else {
      const src = sources[0];
      resetVideoEl();
      slideImg.classList.remove("is-hidden");

      const img = new Image();
      img.onload = () => {
        if (token !== activeSlideToken) return;
        slideImg.src = src;
        lastImageBackdrop = src;
        requestAnimationFrame(() => slideImg.classList.add("is-visible"));
      };
      img.onerror = () => {
        if (token !== activeSlideToken) return;
        const fallback = createFallbackDataUrl(`Photo ${idx + 1}`);
        slideImg.src = fallback;
        requestAnimationFrame(() => slideImg.classList.add("is-visible"));
      };
      img.src = src;
    }

    setDotActive();

    updateVideoPreloads(idx);
    warmupNextImageIfAny(idx);
  }

  function createFallbackDataUrl(label) {
    const c = document.createElement("canvas");
    c.width = 1400;
    c.height = 900;
    const g = c.getContext("2d");
    const grd = g.createLinearGradient(0, 0, c.width, c.height);
    grd.addColorStop(0, "#2b0b59");
    grd.addColorStop(1, "#0b5b63");
    g.fillStyle = grd;
    g.fillRect(0, 0, c.width, c.height);

    g.textAlign = "center";
    g.fillStyle = "rgba(255,255,255,0.9)";
    g.font = "700 60px Inter, Arial, sans-serif";
    g.fillText(label, c.width / 2, c.height / 2 - 10);
    g.fillStyle = "rgba(255,255,255,0.75)";
    g.font = "600 34px Inter, Arial, sans-serif";
    g.fillText("Si tu vois ça, une vidéo .MOV est probablement incompatible.", c.width / 2, c.height / 2 + 60);
    g.fillText("Solution: convertis en MP4 (H.264).", c.width / 2, c.height / 2 + 110);
    return c.toDataURL("image/png");
  }

  function next() {
    idx = (idx + 1) % media.length;
    renderSlide();
  }

  function prev() {
    idx = (idx - 1 + media.length) % media.length;
    renderSlide();
  }

  function scheduleNext() {
    if (slideTimer) window.clearTimeout(slideTimer);
    const src = media[idx].sources[0];
    const delay = isVideo(src) ? VIDEO_MS : SLIDE_MS;
    slideTimer = window.setTimeout(() => {
      next();
      scheduleNext();
    }, delay);
  }

  function startAuto() {
    scheduleNext();
  }

  prevBtn.addEventListener("click", () => {
    prev();
    startAuto();
  });
  nextBtn.addEventListener("click", () => {
    next();
    startAuto();
  });

  // ---------- Music ----------
  let musicEnabled = false;
  let audioUnlockHandler = null;

  async function tryAutoPlay() {
    if (!audio || musicEnabled) return;
    try {
      await audio.play();
      musicEnabled = true;
      if (audioGate) audioGate.classList.add("is-hidden");
      if (audioUnlockHandler) {
        window.removeEventListener("pointerdown", audioUnlockHandler);
        window.removeEventListener("touchstart", audioUnlockHandler);
        audioUnlockHandler = null;
      }
    } catch {
      if (audioGate) audioGate.classList.remove("is-hidden");
      if (!audioUnlockHandler) {
        audioUnlockHandler = () => {
          tryAutoPlay();
        };
        window.addEventListener("pointerdown", audioUnlockHandler, { once: true });
        window.addEventListener("touchstart", audioUnlockHandler, { once: true });
      }
    }
  }

  // ---------- Timeline ----------
  function startSequence() {
    // Start fireworks immediately; switch panels over time.
    show(panelIntro);

    // Dès l’intro : prépare les prochaines vidéos (réduit la latence à l’arrivée sur chaque clip).
    updateVideoPreloads(0);

    window.setTimeout(() => {
      runningFx = false;
      hide(panelIntro);
      show(panelMessage);
    }, FIREWORKS_MS);

    window.setTimeout(() => {
      hide(panelMessage);
      show(panelGallery);
      buildDots();
      renderSlide();
      startAuto();
      tryAutoPlay();
    }, FIREWORKS_MS + MESSAGE_MS);
  }

  startSequence();
})();

