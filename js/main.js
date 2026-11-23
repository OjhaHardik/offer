/* Aykora Studio presentation: GSAP (ScrollTrigger, SplitText, DrawSVG, MorphSVG) + Lenis smooth scroll.
   Without motion (reduced motion or missing libraries) every page is a complete static document. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; // a presentation always starts at the top

  // Colour swatches copy their hex.
  $$('.sw').forEach(b => b.addEventListener('click', async () => {
    const label = $('.sw-copy', b);
    try { await navigator.clipboard.writeText(b.dataset.hex); label.textContent = 'Copied'; }
    catch { label.textContent = b.dataset.hex; }
    clearTimeout(b._t); b._t = setTimeout(() => (label.textContent = 'Copy hex'), 1600);
  }));

  // Beige/ink banner comparison: the range input drives the split, with or without motion.
  $$('.cmp').forEach(c => {
    const r = $('.cmp-range', c);
    c._set = v => { r.value = v; c.style.setProperty('--x', v + '%'); };
    r.addEventListener('input', () => c._set(r.value));
  });

  $$('canvas.glow').forEach(glow);

  const { gsap, ScrollTrigger, SplitText, DrawSVGPlugin, MorphSVGPlugin, Lenis } = window;
  if (!gsap || !ScrollTrigger || !SplitText || !DrawSVGPlugin || !MorphSVGPlugin) { root.classList.remove('motion'); return; }
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MorphSVGPlugin);

  const navOK = $('.nav-progress');
  const wayfinding = () => {
    if (!navOK) return;
    gsap.to('.nav-progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
    $$('.nav nav a').forEach(a => {
      const sec = $(a.getAttribute('href'));
      if (sec) ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: s => a.classList.toggle('on', s.isActive) });
    });
  };
  if (!root.classList.contains('motion')) { wayfinding(); return; }

  const BEIGE = '#E8DCC8', GOLD = '#C6A75E';
  scrollTo(0, 0);
  let lenis = null;
  if (Lenis) {
    lenis = new Lenis({ lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
  }
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* SCENES: a timed sequence that holds the scroll while it plays, so no step can be scrolled past.
     Skip, Esc, or a presenter's clicker (arrow / Page keys) moves through it. */
  let current = null, jumpTo = null;
  function scene(sec, tl, hold) {
    const bar = $('.scene-bar i', sec);
    let state = 'idle';
    const done = () => {
      if (state === 'done') return;
      state = 'done'; sec.classList.add('is-done');
      if (current === api) current = null;
      lenis?.start();
    };
    const api = {
      finish() { tl.progress(1); bar && gsap.set(bar, { scaleX: 1 }); done(); },
      step(dir) {
        const times = Object.values(tl.labels).sort((a, b) => a - b), now = tl.time() + 0.05;
        let i = -1; times.forEach((t, k) => { if (t <= now) i = k; });
        const to = times[i + dir];
        if (to === undefined) return dir > 0 ? api.finish() : tl.play(0);
        tl.play(to);
      },
    };
    tl.eventCallback('onComplete', done);
    if (bar) tl.eventCallback('onUpdate', () => gsap.set(bar, { scaleX: tl.progress() }));
    ScrollTrigger.create({
      trigger: sec, start: 'top top', end: () => '+=' + Math.round(innerHeight * hold), pin: true,
      onEnter: self => {
        if (state !== 'idle') return;
        if (jumpTo && jumpTo !== sec) return api.finish(); // passing through on a nav jump: show the end state
        jumpTo = null; state = 'playing'; current = api;
        if (lenis) { lenis.scrollTo(self.start, { immediate: true, force: true }); lenis.stop(); }
        tl.play(0);
      },
      onEnterBack: () => { if (state !== 'done') api.finish(); },
    });
    $('.scene-skip', sec)?.addEventListener('click', () => api.finish());
    return api;
  }
  addEventListener('keydown', e => {
    if (!current || e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'PageDown' || k === ' ') { e.preventDefault(); current.step(1); }
    else if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); current.step(-1); }
    else if (k === 'Escape') current.finish();
  });
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = $(a.getAttribute('href'));
    if (!t || !lenis) return;
    e.preventDefault(); jumpTo = t;
    lenis.scrollTo(t, { offset: -(parseFloat(getComputedStyle(t).scrollMarginTop) || 0), duration: 1.6, onComplete: () => (jumpTo = null) });
  }));

  /* LOADER: a gold ground line is laid while the count runs, then the page opens along it. */
  const loader = () => new Promise(res => {
    const L = $('.loader');
    if (!L) return res();
    lenis?.stop();
    const num = $('.ld-num', L), o = { v: 0 };
    const open = () => gsap.timeline({ onComplete: () => { L.remove(); lenis?.start(); } })
      .to(num, { opacity: 0, y: -24, duration: 0.4, ease: 'power2.in' })
      .add(res, 0.3)
      .to('.ld-top', { yPercent: -100, duration: 1.15, ease: 'power4.inOut' }, 0.2)
      .to('.ld-bot', { yPercent: 100, duration: 1.15, ease: 'power4.inOut' }, 0.2)
      .to('.ld-line', { opacity: 0, duration: 0.5 }, 0.3);
    gsap.timeline()
      .to(o, { v: 100, duration: 1.4, ease: 'power2.inOut', onUpdate: () => (num.textContent = Math.round(o.v)) })
      .to('.ld-line', { scaleX: 1, duration: 1.4, ease: 'power2.inOut' }, 0)
      .add(() => document.fonts.ready.then(open));
  });

  /* HERO: the mark is built in the order a building is: ground, foundations, shells. Then the name. */
  function heroIntro() {
    const h = $('.hero');
    if (!h) return;
    const q = s => $(s, h);
    const split = SplitText.create('.hero-title', { type: 'lines', mask: 'lines' });
    gsap.set(['.hero-copy', '.hero-art'], { visibility: 'visible' });
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from(q('.s-ground'), { drawSVG: '50% 50%', duration: 1.1, ease: 'power2.inOut' })
      .from([q('.s-col1'), q('.s-col2')], { drawSVG: 0, duration: 0.9, stagger: 0.12, ease: 'power2.inOut' }, '-=0.35')
      .from([q('.s-shellA'), q('.s-shellS'), q('.s-bowl')], { drawSVG: 0, duration: 1.4, stagger: 0.14, ease: 'power2.inOut' }, '-=0.45')
      .from($$('.lk-name .wl', h), { y: 80, duration: 1, stagger: 0.045 }, '-=0.9')
      .from($$('.lk-sub .wl', h), { opacity: 0, duration: 0.8, stagger: 0.012 }, '-=0.6')
      .from(split.lines, { yPercent: 105, duration: 1.1, stagger: 0.1 }, 0.35)
      .from([q('.eyebrow'), q('.hero-sub'), q('.btn')], { opacity: 0, y: 18, duration: 0.9, stagger: 0.1 }, 0.7);
  }
  function heroScroll() {
    if (!$('.hero')) return;
    gsap.to('.hero-art', { yPercent: -10, opacity: 0.3, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* NAME: AY and KORA arrive apart, each explained, then lock together into one word. */
  function name() {
    const sec = $('.name');
    if (!sec) return;
    gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: '+=140%', pin: true, scrub: 0.8, invalidateOnRefresh: true } })
      .fromTo('.w-ay', { x: () => -innerWidth * 0.08 }, { x: 0, duration: 1, ease: 'power2.inOut' }, 0.35)
      .fromTo('.w-kora', { x: () => innerWidth * 0.08 }, { x: 0, duration: 1, ease: 'power2.inOut' }, 0.35)
      .to('.w-plus i', { scale: 0, opacity: 0, duration: 0.4 }, 0.35)
      .to('.name-notes', { opacity: 0, y: -24, duration: 0.4 }, 0.3)
      .from('.name-quote', { opacity: 0, y: 40, duration: 0.6 }, 1.05)
      .to({}, { duration: 0.4 });
    gsap.from('.name-words .w', { yPercent: 40, opacity: 0, duration: 1.2, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: sec, start: 'top 70%', once: true } });
  }

  /* ORIGIN: the tallest Opera House shell is traced, then the second; both lines morph into the
     mark's two arches, and the ground and foundations are drawn under them. */
  function origin() {
    const sec = $('.origin');
    if (!sec) return;
    const svg = $('.o-svg', sec), tA = $('.o-a', sec), tS = $('.o-s', sec), parts = $$('.o-part', sec);
    const fit = () => { // portrait screens frame the two shells instead of the whole building
      const tall = innerWidth / innerHeight < 1.15;
      svg.setAttribute('viewBox', tall ? '760 120 1380 1240' : '0 0 2600 1462');
      svg.setAttribute('preserveAspectRatio', tall ? 'xMidYMid meet' : 'xMidYMid slice');
    };
    fit(); addEventListener('resize', fit);
    const head = SplitText.create('.o-h', { type: 'lines', mask: 'lines' });
    gsap.set([tA, tS, ...parts], { drawSVG: 0 });
    gsap.set('.o-after', { opacity: 0, y: 18 });
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } })
      .fromTo('.o-photo', { scale: 1.1, transformOrigin: '62% 42%' }, { scale: 1, duration: 3.2, ease: 'power2.out' }, 0)
      .from(head.lines, { yPercent: 105, duration: 1.1, stagger: 0.08, ease: 'power3.out' }, 0.2)
      .addLabel('trace', 0.9)
      .to('.o-dim', { opacity: 0.34, duration: 1.4 }, 'trace') // dim the photo a little so the gold line reads
      .to(tA, { drawSVG: '100%', duration: 2.2 }, 'trace')
      .addLabel('second', 3.1)
      .to(tS, { drawSVG: '100%', duration: 1.6 }, 'second')
      .addLabel('morph', 4.9)
      .set([tA, tS], { strokeDasharray: 'none' }, 'morph') // the morphed paths are longer than the traced dash length
      .to('.o-dim', { opacity: 0.9, duration: 1.6 }, 'morph')
      .to(svg, { '--glow': '0px', duration: 1.4 }, 'morph')
      .to(tA, { morphSVG: tA.dataset.to, stroke: BEIGE, strokeWidth: 19.06, duration: 1.7 }, 'morph')
      .to(tS, { morphSVG: tS.dataset.to, stroke: BEIGE, strokeWidth: 19.06, duration: 1.7 }, 'morph+=0.12')
      .addLabel('build', 6.7)
      .fromTo(parts[0], { drawSVG: '50% 50%' }, { drawSVG: '0% 100%', duration: 1 }, 'build')
      .fromTo(parts.slice(1), { drawSVG: 0 }, { drawSVG: '100%', duration: 1.1, stagger: 0.12 }, 'build+=0.5')
      .to('.o-after', { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 'build+=0.7')
      .to({}, { duration: 0.6 });
    scene(sec, tl, 0.5);
  }

  /* ANATOMY: one part of the mark per step, each held for a few seconds with a visible timer. */
  function anatomy() {
    const sec = $('.ana');
    if (!sec) return;
    const svg = $('.ana-svg', sec);
    const names = ['ground', 'col1', 'col2', 'bowl', 'shellA', 'shellS', 'gmid'];
    const part = Object.fromEntries(names.map(n => [n, $('.s-' + n, svg)]));
    const steps = $$('.ana-step', sec), lis = $$('.ana-rail li', sec), bars = $$('.ana-rail i', sec), lbls = $$('.lbl', svg);
    const earth = $('.earth', svg), site = $('.siteline', svg);
    const states = [
      { on: ['ground'], site: 1 },
      { on: ['col1', 'col2'], earth: 1, site: 1 },
      { on: ['shellA', 'shellS'] },
      { on: ['shellA', 'col1'], keep: ['ground'] },
      { on: ['shellS', 'gmid', 'bowl', 'col2'] },
      { on: [], all: true },
    ];
    const hold = [3.4, 3.8, 3.8, 4.4, 4.6, 3.6]; // seconds each part stays on screen
    const vars = (st, i) => {
      const out = names.map(n => {
        const hi = st.on.includes(n);
        const op = n === 'gmid' ? +hi : st.all || hi || st.keep?.includes(n) ? 1 : 0.13;
        return [part[n], { stroke: hi ? GOLD : BEIGE, opacity: op }];
      });
      out.push([lbls, { opacity: k => +(k === i) }], [earth, { opacity: st.earth ? 0.5 : 0 }], [site, { opacity: st.site ? 0.55 : 0 }]);
      return out;
    };
    vars(states[0], 0).forEach(([t, v]) => gsap.set(t, v));
    gsap.set(steps.slice(1), { opacity: 0, y: 24 });

    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
    tl.from(names.slice(0, 6).map(n => part[n]), { drawSVG: 0, duration: 1.2, stagger: 0.08 }, 0);
    let at = 0.9;
    states.forEach((st, i) => {
      tl.addLabel('s' + i, at);
      if (i) {
        tl.to(steps[i - 1], { opacity: 0, y: -24, duration: 0.35 }, at).to(steps[i], { opacity: 1, y: 0, duration: 0.45 }, at + 0.25);
        vars(st, i).forEach(([t, v]) => tl.to(t, { ...v, duration: 0.6 }, at));
      }
      tl.fromTo(bars[i], { scaleX: 0 }, { scaleX: 1, duration: hold[i], ease: 'none' }, at);
      at += hold[i];
    });
    const times = states.map((_, i) => tl.labels['s' + i]);
    tl.eventCallback('onUpdate', () => {
      const t = tl.time() + 0.01;
      lis.forEach((li, k) => li.classList.toggle('on', t >= times[k] && (k === times.length - 1 || t < times[k + 1])));
    });
    scene(sec, tl, 0.4);
    $$('.ana-rail button', sec).forEach((b, k) => b.addEventListener('click', () => tl.play(times[k])));
  }

  /* SYSTEM: tiles open upwards; Jost walks through its weights as you scroll. */
  function system() {
    if (!$('.bento')) return;
    gsap.set('.b', { clipPath: 'inset(100% 0% 0% 0%)', y: 40 });
    ScrollTrigger.batch('.b', { start: 'top 90%', once: true, onEnter: els => gsap.to(els, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 1.2, stagger: 0.07, ease: 'power3.out' }) });
    gsap.fromTo('.spec-jost .spec-sample', { fontWeight: 300 }, { fontWeight: 600, ease: 'none', scrollTrigger: { trigger: '.spec-jost', start: 'top 85%', end: 'bottom 30%', scrub: true } });
  }

  /* LANDSCAPE: two logo rows drift in opposite directions (CSS); copies make the loop seamless. */
  function landscape() {
    $$('.mq-track').forEach(t => [...t.children].forEach(li => {
      const c = li.cloneNode(true);
      c.setAttribute('aria-hidden', 'true'); $('img', c).alt = '';
      t.append(c);
    }));
  }

  /* IN USE: each mockup opens like a window and drifts slightly inside its frame. */
  function world() {
    $$('.shot .frame').forEach(f => {
      gsap.fromTo(f, { clipPath: 'inset(12% 6% 12% 6%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.out', scrollTrigger: { trigger: f, start: 'top 94%', end: 'top 42%', scrub: 0.6 } });
      $$('img', f).forEach(img => gsap.fromTo(img, { scale: 1.16, yPercent: -3 }, { scale: 1.04, yPercent: 3, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } }));
    });
    const cmp = $('.cmp');
    if (cmp) { // one slow sweep shows that the banner can be compared
      const o = { v: 50 }, upd = () => cmp._set(Math.round(o.v));
      gsap.timeline({ scrollTrigger: { trigger: cmp, start: 'top 62%', once: true } })
        .to(o, { v: 16, duration: 1.2, ease: 'power2.inOut', onUpdate: upd })
        .to(o, { v: 50, duration: 1.3, ease: 'power2.inOut', onUpdate: upd });
    }
  }

  /* NEXT IN THE KIT: frames rise open; the posts fill the grid; the drawing draws itself. */
  function next() {
    $$('.nx .frame').forEach(f => gsap.fromTo(f, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'power4.inOut', scrollTrigger: { trigger: f, start: 'top 85%', once: true } }));
    if ($('.feed')) gsap.from('.post', { opacity: 0, scale: 0.9, duration: 0.8, stagger: { each: 0.07, grid: [3, 3] }, ease: 'power3.out', scrollTrigger: { trigger: '.feed', start: 'top 75%', once: true } });
    const dwg = $('.dwg');
    if (dwg) {
      const lines = $$('path, rect, circle', dwg).filter(el => el.closest('g[fill="none"]'));
      gsap.timeline({ scrollTrigger: { trigger: dwg, start: 'top 72%', once: true } })
        .from(lines, { drawSVG: 0, duration: 1.4, stagger: 0.025, ease: 'power2.inOut' })
        .from($$('text, image, path[fill]', dwg), { opacity: 0, duration: 0.6, stagger: 0.01 }, '-=0.8');
    }
  }

  /* THE KIT: each group's picture wipes in, then its items follow. */
  function kit() {
    $$('.kg').forEach(g => {
      const st = { trigger: g, start: 'top 78%', once: true };
      gsap.fromTo($('.kg-art', g), { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power4.inOut', scrollTrigger: st });
      gsap.from([$('h3', g), $('.kg-why', g)], { opacity: 0, y: 24, duration: 1, stagger: 0.1, ease: 'power3.out', scrollTrigger: st });
      gsap.from($$('.kg-items li', g), { opacity: 0, y: 30, duration: 1, stagger: 0.09, delay: 0.15, ease: 'power3.out', scrollTrigger: st });
    });
  }

  function process() {
    if (!$('.steps-line i')) return;
    gsap.fromTo('.steps-line i', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 88%', end: 'bottom 55%', scrub: 0.6 } });
  }

  function closing() {
    if (!$('.close-mark')) return;
    gsap.from('.close-mark .s', { drawSVG: 0, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '.close', start: 'top 75%', end: 'center 60%', scrub: 0.6 } });
  }

  /* PRICING PAGE: the price counts up once; rows rise in as each group arrives. */
  function pricing() {
    const fmt = new Intl.NumberFormat('en-IN');
    $$('[data-count]').forEach(el => {
      const o = { v: 0 }, end = +el.dataset.count;
      gsap.to(o, { v: end, duration: 2.2, delay: 0.6, ease: 'power3.out', onUpdate: () => (el.textContent = fmt.format(Math.round(o.v / 50) * 50)) });
    });
    $$('.pg, .kc').forEach(g => gsap.from($$('.pg-row, .kr', g), { opacity: 0, y: 22, duration: 0.9, stagger: 0.07, ease: 'power3.out', scrollTrigger: { trigger: g, start: 'top 82%', once: true } }));
    if ($('.p-hero')) gsap.from(['.p-hero .eyebrow', '.p-sub', '.p-price > *, .m-stats > *'], { opacity: 0, y: 22, duration: 1, stagger: 0.1, delay: 0.3, ease: 'power3.out' });
  }

  /* PLAN PAGE: pillar shares and campaign bars grow from the left as they arrive. */
  function plan() {
    $$('.pillars, .gantt').forEach(box => gsap.from($$('.bar', box), { scaleX: 0, duration: 1.2, stagger: 0.08, ease: 'power3.inOut', scrollTrigger: { trigger: box, start: 'top 80%', once: true } }));
  }

  /* Headings rise line by line; supporting copy fades up. */
  function reveals() {
    $$('[data-split]').forEach(el => SplitText.create(el, {
      type: 'lines', mask: 'lines', autoSplit: true,
      onSplit: s => gsap.from(s.lines, { yPercent: 105, duration: 1.1, stagger: 0.09, ease: 'power4.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }),
    }));
    gsap.set('[data-reveal]', { opacity: 0, y: 28 });
    ScrollTrigger.batch('[data-reveal]', { start: 'top 90%', once: true, onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1, stagger: 0.1, ease: 'power3.out' }) });
  }

  // Pinned sections are created in page order so each pin is measured after the ones above it.
  const intro = loader();
  document.fonts.ready.then(() => {
    heroScroll(); name(); origin(); anatomy(); system(); landscape(); world(); next(); kit(); process(); closing(); pricing(); plan(); reveals(); wayfinding();
    ScrollTrigger.refresh();
    intro.then(heroIntro);
  });

  /* Mesh gradient: slow noise between ink and navy with a gold glow that leans toward the pointer. */
  function glow(cv) {
    const gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return;
    const FRAG = `precision highp float;uniform vec2 r;uniform float t;uniform vec2 m;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+17.;a*=.5;}return v;}
      void main(){vec2 uv=gl_FragCoord.xy/r;float k=r.x/r.y;vec2 p=vec2(uv.x*k,uv.y);
        float q=fbm(p*1.3+vec2(t*.018,-t*.012));float w=fbm(p*1.9+q*1.8+vec2(-t*.01,t*.016));
        vec3 ink=vec3(.055,.078,.141),navy=vec3(.14,.185,.3),gold=vec3(.776,.655,.369);
        vec3 c=mix(ink,navy,smoothstep(.3,.85,w));
        vec2 g=vec2(k*(.7+.12*(m.x-.5)),.56+.12*(m.y-.5));
        c+=gold*.17*smoothstep(.8,0.,length(p-g))*smoothstep(.35,.8,w);
        c=mix(c,ink,smoothstep(.55,1.15,length(uv-.5)*1.3));
        c+=(h(gl_FragCoord.xy+fract(t))-.5)/128.;
        gl_FragColor=vec4(c,1.);}`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(pr, 'r'), uT = gl.getUniformLocation(pr, 't'), uM = gl.getUniformLocation(pr, 'm');
    const seed = +cv.dataset.seed || 0, still = !root.classList.contains('motion');
    let w = 1, hgt = 1, visible = false, raf = 0, mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5;
    const size = () => { // half resolution: a soft gradient loses nothing and the GPU does a quarter of the work
      const s = Math.min(devicePixelRatio || 1, 1.5) * 0.5;
      w = cv.width = Math.max(1, Math.round(cv.clientWidth * s)); hgt = cv.height = Math.max(1, Math.round(cv.clientHeight * s));
      gl.viewport(0, 0, w, hgt);
    };
    const frame = now => {
      mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
      gl.uniform2f(uR, w, hgt); gl.uniform1f(uT, seed + now / 1000); gl.uniform2f(uM, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (visible && !still) raf = requestAnimationFrame(frame);
    };
    new ResizeObserver(() => { size(); frame(performance.now()); }).observe(cv);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; cancelAnimationFrame(raf); if (visible) raf = requestAnimationFrame(frame); }).observe(cv);
    cv.parentNode.addEventListener('pointermove', e => { const b = cv.getBoundingClientRect(); tx = (e.clientX - b.left) / b.width; ty = 1 - (e.clientY - b.top) / b.height; });
    cv.classList.add('on');
  }
})();
