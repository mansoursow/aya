(() => {
  const FIREWORKS_MS = 5200;
  const MESSAGE_MS = 2200;
  const SLIDE_MS = 3200;
  const VIDEO_MS = 6500;

  const media = [
    { src: "assets/photos/01.jpeg" },
    { src: "assets/photos/02.jpeg" },
    { src: "assets/photos/03.MOV" },
    { src: "assets/photos/04.jpeg" },
    { src: "assets/photos/05.jpeg" },
    { src: "assets/photos/06.MOV" },
    { src: "assets/photos/07.mp4" },
  ];

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

  function extOf(path) {
    const q = path.split("?")[0];
    const parts = q.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  }

  function isVideo(path) {
    const ext = extOf(path);
    return ext === "mp4" || ext === "mov";
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
    isVideoPlaying = false;
    slideImg.classList.remove("is-visible");
    slideVideo.classList.remove("is-visible");

    const src = media[idx].src;
    if (isVideo(src)) {
      slideImg.classList.add("is-hidden");
      slideVideo.classList.remove("is-hidden");
      slideVideo.src = src;
      slideVideo.currentTime = 0;
      slideVideo.loop = true;
      slideVideo.muted = true;
      slideVideo.playsInline = true;
      slideVideo
        .play()
        .then(() => {
          isVideoPlaying = true;
          requestAnimationFrame(() => slideVideo.classList.add("is-visible"));
        })
        .catch(() => {
          slideVideo.classList.add("is-hidden");
          slideImg.classList.remove("is-hidden");
          const fallback = createFallbackDataUrl(`Vidéo ${idx + 1}`);
          slideImg.src = fallback;
          requestAnimationFrame(() => slideImg.classList.add("is-visible"));
        });
    } else {
      slideVideo.pause();
      slideVideo.removeAttribute("src");
      slideVideo.load();
      slideVideo.classList.add("is-hidden");
      slideImg.classList.remove("is-hidden");

      const img = new Image();
      img.onload = () => {
        slideImg.src = src;
        requestAnimationFrame(() => slideImg.classList.add("is-visible"));
      };
      img.onerror = () => {
        const fallback = createFallbackDataUrl(`Photo ${idx + 1}`);
        slideImg.src = fallback;
        requestAnimationFrame(() => slideImg.classList.add("is-visible"));
      };
      img.src = src;
    }

    setDotActive();
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

    g.fillStyle = "rgba(255,255,255,0.9)";
    g.font = "700 64px Inter, Arial, sans-serif";
    g.textAlign = "center";
    g.fillText("Ajoute tes photos dans", c.width / 2, c.height / 2 - 40);
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.font = "600 44px Inter, Arial, sans-serif";
    g.fillText("assets/photos/", c.width / 2, c.height / 2 + 20);
    g.fillStyle = "rgba(255,255,255,0.75)";
    g.font = "600 34px Inter, Arial, sans-serif";
    g.fillText(label, c.width / 2, c.height / 2 + 90);
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
    const src = media[idx].src;
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

