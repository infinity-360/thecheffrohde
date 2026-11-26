const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// loader: sai quando o vídeo pode tocar (ou depois de 2.5s)
const heroVideo = $('.hero-video');
const ready = () => document.body.classList.add('ready');
heroVideo.addEventListener('canplay', ready, { once: true });
setTimeout(ready, 2500);
$('#y').textContent = new Date().getFullYear();

// manifesto: quebra em palavras para "acender" uma a uma
const burn = $('[data-burn]');
burn.innerHTML = burn.textContent.trim().split(/\s+/).map(w => `<span>${w}</span>`).join(' ');
const words = $$('span', burn);

// reveal ao entrar na tela
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .2 });
$$('.reveal, .sear').forEach(el => io.observe(el));

// contador de seguidores
const counter = $('[data-count]');
new IntersectionObserver(([e], o) => {
  if (!e.isIntersecting) return; o.disconnect();
  const end = +counter.dataset.count, t0 = performance.now();
  const tick = t => {
    const k = clamp((t - t0) / 1800);
    counter.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))).toLocaleString('pt-BR');
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}).observe(counter);

// vídeo do CTA só toca quando visível
const ctaVideo = $('.cta-video');
new IntersectionObserver(([e]) => e.isIntersecting ? ctaVideo.play().catch(() => {}) : ctaVideo.pause()).observe(ctaVideo);

// cards: inclinação 3D + brilho seguindo o mouse
$$('.card').forEach(c => {
  c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.style.setProperty('--mx', x * 100 + '%'); c.style.setProperty('--my', y * 100 + '%');
    if (!reduce) { c.style.setProperty('--ry', (x - .5) * 10 + 'deg'); c.style.setProperty('--rx', (.5 - y) * 10 + 'deg'); }
  });
  c.addEventListener('pointerleave', () => { c.style.setProperty('--rx', 0); c.style.setProperty('--ry', 0); });
});

// formulário -> mensagem pronta no WhatsApp
$('#quote').addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const data = f.get('data') ? new Date(f.get('data') + 'T12:00').toLocaleDateString('pt-BR') : 'a definir';
  const msg = `Olá, Chef Rohde! Meu nome é ${f.get('nome')}. Quero um orçamento:\n• Evento: ${f.get('tipo')}\n• Data: ${data}\n• Convidados: ${f.get('convidados') || 'a definir'}`;
  window.open('https://wa.me/5567996000845?text=' + encodeURIComponent(msg), '_blank', 'noopener');
});

// ---------- rolagem: tudo num só loop ----------
const hero = $('.hero'), nav = $('#nav'), track = $('.track');
const gallery = $('.gallery'), gTrack = $('.g-track'), figs = $$('figure', gTrack), gTitle = $('.g-title');
const process = $('.process'), steps = $$('.steps li');
let marqueeX = 0, lastY = scrollY, vel = 0;

function sizeGallery() {
  // altura da seção = distância horizontal a percorrer + uma tela
  gallery.style.setProperty('--gh', gTrack.scrollWidth - innerWidth + innerHeight + 'px');
}
addEventListener('resize', sizeGallery);
addEventListener('load', sizeGallery);
sizeGallery();

const progress = el => { const r = el.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight)); };

function frame() {
  const y = scrollY;
  vel += ((y - lastY) - vel) * .1; lastY = y;

  hero.style.setProperty('--p', progress(hero).toFixed(4));
  nav.classList.toggle('solid', y > hero.offsetHeight * .55);

  // marquee anda sozinho e acelera com a velocidade da rolagem
  marqueeX -= 1 + Math.abs(vel) * .6;
  const half = track.scrollWidth / 2;
  if (-marqueeX > half) marqueeX += half;
  track.style.transform = `translateX(${marqueeX}px)`;

  // manifesto: palavras esquentam conforme a seção sobe
  const r = burn.getBoundingClientRect();
  const lit = clamp((innerHeight * .8 - r.top) / (r.height + innerHeight * .3)) * words.length;
  words.forEach((w, i) => { w.classList.toggle('lit', i < lit - 2); w.classList.toggle('hot', i >= lit - 2 && i < lit); });

  // galeria horizontal
  const gp = progress(gallery);
  gTrack.style.transform = `translateX(${-gp * (gTrack.scrollWidth - innerWidth)}px)`;
  gTitle.style.opacity = clamp(1 - gp * 4);
  figs.forEach(f => {
    const fr = f.getBoundingClientRect(), d = (fr.left + fr.width / 2 - innerWidth / 2) / innerWidth;
    f.style.setProperty('--r', (d * 6).toFixed(2) + 'deg');
    f.style.setProperty('--gs', clamp(Math.abs(d) * 1.4).toFixed(2));
  });

  // pavio do processo
  const pr = process.getBoundingClientRect();
  const fp = clamp((innerHeight * .75 - pr.top) / (pr.height * .8));
  process.style.setProperty('--f', fp.toFixed(3));
  steps.forEach((s, i) => s.classList.toggle('on', fp >= i / steps.length + .05));

  embersHeat = clamp(1 - progress(hero) * .5) * (y < hero.offsetHeight ? 1 : .45);
  requestAnimationFrame(frame);
}

// ---------- brasas subindo (canvas) ----------
const cv = $('#embers'), cx = cv.getContext('2d');
let embersHeat = 1, parts = [];
function resize() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; }
addEventListener('resize', resize); resize();
const spawn = () => ({
  x: Math.random() * cv.width, y: cv.height + 10, r: (Math.random() * 2 + .6) * devicePixelRatio,
  vy: (Math.random() * 1.2 + .5) * devicePixelRatio, vx: 0, ph: Math.random() * 6.28, life: 1, hue: 20 + Math.random() * 25
});
function embers() {
  cx.clearRect(0, 0, cv.width, cv.height);
  if (parts.length < 90 * embersHeat && Math.random() < .5) parts.push(spawn());
  cx.globalCompositeOperation = 'lighter';
  parts = parts.filter(p => {
    p.ph += .03; p.x += Math.sin(p.ph) * .6 * devicePixelRatio - vel * .02; p.y -= p.vy + Math.abs(vel) * .05; p.life -= .0025;
    const a = clamp(p.life) * (.5 + .5 * Math.sin(p.ph * 3));
    cx.fillStyle = `hsla(${p.hue},100%,60%,${a})`;
    cx.shadowBlur = 12; cx.shadowColor = `hsla(${p.hue},100%,50%,${a})`;
    cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.28); cx.fill();
    return p.life > 0 && p.y > -20;
  });
  requestAnimationFrame(embers);
}

requestAnimationFrame(frame);
if (!reduce) requestAnimationFrame(embers);
