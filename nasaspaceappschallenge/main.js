// Mars: Last Colony promo site: fades, parallax, counters and stage dots
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

  // fade in as things scroll into view
  const io = new IntersectionObserver(es => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  $$('.fade, .pipe').forEach(el => io.observe(el));

  // numbers count up
  const cio = new IntersectionObserver(es => {
    for (const e of es) if (e.isIntersecting) {
      cio.unobserve(e.target); const el = e.target, to = +el.dataset.count;
      if (reduce) { el.textContent = to; continue; }
      const t0 = performance.now(), dur = 1300;
      const step = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => cio.observe(el));

  // progress bar, top bar, side dots and parallax
  const bar = $('#progress'), nav = $('#nav'), dots = $('#dots'), par = $$('[data-speed]');
  const stages = ['s1', 's2', 's3'].map(id => document.getElementById(id)), dl = $$('#dots a');
  let busy = false;
  function frame() {
    const y = scrollY, H = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${H > 0 ? y / H : 0})`;
    nav.classList.toggle('show', y > innerHeight * 0.7);
    const a = stages[0].getBoundingClientRect().top, b = stages[2].getBoundingClientRect().bottom;
    dots.classList.toggle('show', a < innerHeight * 0.5 && b > innerHeight * 0.5);
    let cur = -1; stages.forEach((s, i) => { const r = s.getBoundingClientRect(); if (r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.5) cur = i; });
    dl.forEach((d, i) => d.classList.toggle('on', i === cur));
    if (!reduce) for (const el of par) {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) continue;
      el.style.transform = `translate3d(0,${(r.top * -(+el.dataset.speed)).toFixed(1)}px,0)`;
    }
    busy = false;
  }
  addEventListener('scroll', () => { if (!busy) { busy = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener('resize', frame); frame();

  // stars twinkling in the hero sky
  const cv = $('#stars');
  if (cv && !reduce) {
    const cx = cv.getContext('2d'); let W, H, S = [], on = true;
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); W = cv.width = cv.offsetWidth * d; H = cv.height = cv.offsetHeight * d;
      S = Array.from({ length: 80 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.4, r: (Math.random() + 0.3) * d, p: Math.random() * 6.28, s: 0.6 + Math.random() * 1.4 })); };
    size(); addEventListener('resize', size);
    new IntersectionObserver(e => on = e[0].isIntersecting).observe(cv);
    const draw = t => { if (on) { cx.clearRect(0, 0, W, H); cx.fillStyle = '#fff4e8';
      for (const s of S) { cx.globalAlpha = Math.max(0, 0.2 + 0.35 * Math.sin(t / 1000 * s.s + s.p)); cx.beginPath(); cx.arc(s.x, s.y, s.r, 0, 6.283); cx.fill(); } }
      requestAnimationFrame(draw); };
    requestAnimationFrame(draw);
  }
})();
