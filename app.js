
(function () {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  // Mobile nav toggle
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close menu on link click
    navLinks.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        navLinks.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // GSAP ScrollTrigger animations
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    document.querySelectorAll('[data-shift="true"]').forEach((el) => {
      gsap.to(el, {
        x: 120,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top 80%',
          end: 'bottom 10%',
          scrub: true,
        },
      });
    });

    // Fade-up reveals
    document.querySelectorAll('[data-reveal="fade-up"]').forEach((el) => {
      gsap.fromTo(
        el,
        { y: 18, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
          },
        }
      );
    });

    // Divider line reveals (scaleX)
    document.querySelectorAll('[data-reveal="line"]').forEach((el) => {
      gsap.fromTo(
        el,
        { scaleX: 0, opacity: 0 },
        {
          scaleX: 1,
          opacity: 1,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 92%',
          },
        }
      );
    });


    // Stagger cards inside any container with data-stagger=true
    document.querySelectorAll('[data-stagger="true"]').forEach((wrap) => {
      const items = wrap.querySelectorAll('.card, .officer-card, .advisor-card');
      if (!items.length) return;

      gsap.fromTo(
        items,
        { y: 16, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: 'power2.out',
          stagger: 0.08,
          scrollTrigger: {
            trigger: wrap,
            start: 'top 80%',
          },
        }
      );
    });
  }

  // Small header tint on scroll (kept subtle)
  const onScroll = () => {
    const y = window.scrollY || 0;
    if (!header) return;
    header.style.borderBottomColor = y > 16 ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.06)';
  };
  // scroll handler is unified below for better performance


  // Scroll-reactive UI overlay (subtle HUD motion)
  const uiOverlay = document.querySelector('.ui-overlay');
  const uiShapes = document.querySelector('.ui-shapes');
  const matrixCanvas = document.getElementById('matrixLayer');


  // Matrix-style digits + micro particles (subtle, behind content)
  function initMatrixLayer() {
    if (!matrixCanvas) return null;

    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return null;

    const ctx = matrixCanvas.getContext('2d', { alpha: true });
    if (!ctx) return null;

    const state = {
      w: 0, h: 0, dpr: 1,
      cols: 0,
      drops: [],
      speeds: [],
      fontSize: 18,
      scrollP: 0,
      particles: [],
      lastT: 0
    };

    const glyphs = "01";
    const rand = (a, b) => a + Math.random() * (b - a);

    function resize() {
      state.dpr = Math.max(1, Math.min(1.25, window.devicePixelRatio || 1));
      state.w = window.innerWidth;
      state.h = window.innerHeight;
      matrixCanvas.width = Math.floor(state.w * state.dpr);
      matrixCanvas.height = Math.floor(state.h * state.dpr);
      matrixCanvas.style.width = state.w + "px";
      matrixCanvas.style.height = state.h + "px";
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

      state.fontSize = Math.max(13, Math.min(17, Math.round(state.w / 78)));
      state.cols = Math.ceil(state.w / state.fontSize);

      state.drops = new Array(state.cols).fill(0).map(() => rand(-state.h, 0));
      state.speeds = new Array(state.cols).fill(0).map(() => rand(18, 36));

      // rebuild a few micro particles (bouncing dots/squares)
      const count = Math.max(10, Math.min(16, Math.floor(state.w / 110)));
      state.particles = new Array(count).fill(0).map(() => ({
        x: rand(0, state.w),
        y: rand(0, state.h),
        vx: rand(-18, 18),
        vy: rand(-12, 12),
        r: rand(0.8, 2.0),
        a: rand(0.05, 0.14),
        square: Math.random() < 0.35
      }));
    }

    function setScrollProgress(p) {
      state.scrollP = Math.min(1, Math.max(0, p || 0));
    }

    const targetFrameMs = 1000 / 24;
    let accMs = 0;

    function draw(t) {
      if (paused) { return; }

      const elapsedMs = (t - state.lastT) || 16.6;
      state.lastT = t;
      accMs += elapsedMs;
      if (accMs < targetFrameMs) { requestAnimationFrame(draw); return; }
      const dt = Math.min(0.05, (accMs) / 1000);
      accMs = 0;

      // soft clear for subtle trailing; slightly lower alpha = brighter trails
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(0, 0, state.w, state.h);

      // slight parallax offset based on scroll
      const ox = state.scrollP * 18;
      const oy = state.scrollP * 26;

      // digits
      ctx.font = `600 ${state.fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
      ctx.shadowColor = "rgba(85,194,255,0.35)";
      ctx.shadowBlur = 6;
      for (let i = 0; i < state.cols; i++) {
        const x = i * state.fontSize + ox;
        state.drops[i] += state.speeds[i] * dt;

        // pick glyph
        const ch = glyphs[(Math.random() * glyphs.length) | 0];

        // fade by depth (column)
        // base alpha bumped so it actually reads on the page
        const a = 0.22 + (i % 9 === 0 ? 0.08 : 0.0);
        ctx.fillStyle = `rgba(85,194,255,${a})`;
        ctx.fillText(ch, x, state.drops[i] + oy);

        // occasional brighter head (very subtle)
        if ((i % 17) === 0) {
          ctx.fillStyle = `rgba(85,194,255,0.40)`;
          ctx.fillText(ch, x, state.drops[i] + oy - state.fontSize);
        }

        if (state.drops[i] > state.h + rand(0, 220)) {
          state.drops[i] = rand(-state.h * 0.6, 0);
          state.speeds[i] = rand(16, 34);
        }
      }

      // micro particles (bouncing)
      for (const p of state.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // gentle drift with scroll
        const px = p.x + ox * 0.4;
        const py = p.y + oy * 0.35;

        if (p.x < -10 || p.x > state.w + 10) p.vx *= -1;
        if (p.y < -10 || p.y > state.h + 10) p.vy *= -1;

        ctx.fillStyle = `rgba(85,194,255,${p.a})`;
        if (p.square) {
          ctx.fillRect(px, py, p.r * 2.2, p.r * 2.2);
        } else {
          ctx.beginPath();
          ctx.arc(px, py, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();

    let paused = false;
    document.addEventListener('visibilitychange', () => {
      paused = document.hidden;
      if (!paused) requestAnimationFrame(draw);
    });
    requestAnimationFrame(draw);

    return { setScrollProgress };
  }

  const matrix = initMatrixLayer();

  if (uiOverlay) {
    let ticking = false;

    const updateOverlay = () => {
      const y = window.scrollY || 0;
      onScroll();
      const max = (document.documentElement.scrollHeight - window.innerHeight) || 1;
      const p = Math.min(1, Math.max(0, y / max));

      // small, smooth offsets (px)
      const ox = (p * 28).toFixed(2);
      const oy = (p * 54).toFixed(2);

      uiOverlay.style.setProperty('--ox', `${ox}px`);
      uiOverlay.style.setProperty('--oy', `${oy}px`);
      uiOverlay.style.setProperty('--ui-opacity', (0.09 + p * 0.05).toFixed(3));

      if (matrix) matrix.setScrollProgress(p);

      if (uiShapes) {
        // parallax drift for HUD shapes (kept subtle)
        const sx = (p * 22).toFixed(2);
        const sy = (p * 36).toFixed(2);
        const rot = (p * 1.2).toFixed(2);

        uiShapes.style.setProperty('--sx', `${sx}px`);
        uiShapes.style.setProperty('--sy', `${sy}px`);
        uiShapes.style.setProperty('--srot', `${rot}deg`);
      }

      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateOverlay);
        ticking = true;
      }
    }, { passive: true });

    window.addEventListener('resize', () => {
      updateOverlay();
    });

    // init
    updateOverlay();
  }

})();

const calendarEmbed = ""; // e.g. https://calendar.google.com/calendar/embed?src=...
const calendarIcs = "";   // e.g. https://calendar.google.com/calendar/ical/.../public/basic.ics
const calendarWeb = "";   // e.g. https://calendar.google.com/calendar/u/0?cid=...

(function wireEventsLinks(){
  const iframe = document.querySelector('.embed-wrap iframe');
  if (iframe && calendarEmbed && !iframe.getAttribute('src')) iframe.setAttribute('src', calendarEmbed);

  const sub = document.getElementById('subscribeLink');
  if (sub && calendarIcs) sub.setAttribute('href', calendarIcs);

  const cal = document.getElementById('calendarLink');
  if (cal && calendarWeb) cal.setAttribute('href', calendarWeb);
})();
