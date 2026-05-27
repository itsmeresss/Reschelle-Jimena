// THEME
const root = document.documentElement;
const btn = document.getElementById('themeBtn');
let dark = false;
function toggleTheme() {
  dark = !dark;
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  btn.textContent = dark ? '🌙 Dark' : '☀ Light';
}

// MOBILE MENU
function toggleMenu() {
  const m = document.getElementById('mobileMenu');
  m.classList.toggle('open');
}
function closeMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
}

// SCROLL REVEAL
const revealEls = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('visible'), i * 60);
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
revealEls.forEach(el => observer.observe(el));

// Active nav on scroll
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');
window.addEventListener('scroll', () => {
  let cur = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 100) cur = s.id; });
  navLinks.forEach(a => {
    a.style.color = a.getAttribute('href') === '#' + cur ? 'var(--accent)' : '';
  });
});

// ─── DETECT TOUCH DEVICE ─────────────────────────────────────────────────────
function isTouchDevice() {
  return (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
}

// ─── VINE & FLOWER HOVER / TAP EFFECT ────────────────────────────────────────
// Desktop: hover in / hover out (fast, ~1s)
// Mobile/Tablet: tap to sprout in over 4s, tap again to sprout out

function isDarkMode() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

class VineCanvas {
  constructor(el, touchMode) {
    this.el = el;
    this.touchMode = touchMode; // true on touch devices
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
      position:absolute;inset:0;width:100%;height:100%;
      pointer-events:none;border-radius:inherit;
      z-index:0;opacity:0;transition:opacity 0.3s;
    `;
    const pos = getComputedStyle(el).position;
    if (pos === 'static') el.style.position = 'relative';

    Array.from(el.children).forEach(child => {
      if (child !== this.canvas) {
        child.style.position = 'relative';
        child.style.zIndex = '1';
      }
    });

    el.insertBefore(this.canvas, el.firstChild);
    this.ctx = this.canvas.getContext('2d');
    this.vines = [];
    this.frame = null;
    this.active = false;   // currently shown / growing
    this.progress = 0;
    this.dir = 0;
    // Touch state
    this.tapOpen = false;  // whether touch has sprouted it open
  }

  resize() {
    const r = this.el.getBoundingClientRect();
    this.canvas.width = r.width;
    this.canvas.height = r.height;
    this.W = r.width;
    this.H = r.height;
  }

  seedVines() {
    this.vines = [];
    const count = Math.floor(2 + Math.random() * 2);
    const corners = [
      { x: 0,      y: this.H },
      { x: this.W, y: this.H },
      { x: 0,      y: 0 },
      { x: this.W, y: 0 },
    ];
    const picked = corners.sort(() => Math.random() - 0.5).slice(0, count);
    picked.forEach(origin => {
      this.vines.push(this.createVine(origin.x, origin.y));
    });
  }

  createVine(ox, oy) {
    const dx = (this.W / 2 - ox) / this.W;
    const dy = (this.H / 2 - oy) / this.H;
    const baseAngle = Math.atan2(dy, dx);
    const maxLen = Math.min(this.W, this.H) * (0.45 + Math.random() * 0.3);
    const segments = Math.floor(10 + Math.random() * 8);
    const segLen = maxLen / segments;

    const pts = [{ x: ox, y: oy }];
    let angle = baseAngle + (Math.random() - 0.5) * 0.6;
    let x = ox, y = oy;
    for (let i = 0; i < segments; i++) {
      angle += (Math.random() - 0.5) * 0.5;
      x += Math.cos(angle) * segLen;
      y += Math.sin(angle) * segLen;
      pts.push({ x, y });
    }

    const flowers = [];
    for (let i = 2; i < pts.length; i += Math.floor(2 + Math.random() * 3)) {
      flowers.push({
        idx: i,
        r: 3 + Math.random() * 3,
        petalCount: Math.floor(4 + Math.random() * 3),
        hue: [0, 320, 200, 140, 45][Math.floor(Math.random() * 5)],
        angle: Math.random() * Math.PI * 2,
      });
    }

    const leaves = [];
    for (let i = 1; i < pts.length - 1; i += Math.floor(2 + Math.random() * 2)) {
      leaves.push({ idx: i, side: Math.random() > 0.5 ? 1 : -1, size: 5 + Math.random() * 5 });
    }

    const sprouts = [];
    for (let i = 2; i < pts.length - 1; i += Math.floor(3 + Math.random() * 3)) {
      const sproutLen = 8 + Math.random() * 14;
      const side = Math.random() > 0.5 ? 1 : -1;
      const droop = Math.PI / 2 + side * (Math.random() * 0.5);
      sprouts.push({
        idx: i,
        len: sproutLen,
        droop,
        budR: 1.5 + Math.random() * 2,
        hue: [100, 140, 80, 200][Math.floor(Math.random() * 4)],
      });
    }

    return {
      pts, flowers, leaves, sprouts,
      color: `hsl(${110 + Math.random() * 40}, 55%, 38%)`,
    };
  }

  draw(progress) {
    const { ctx, W, H, vines } = this;
    ctx.clearRect(0, 0, W, H);
    if (!vines.length) return;

    const dark = isDarkMode();

    if (dark) {
      ctx.shadowColor = 'rgba(100, 230, 130, 0.7)';
      ctx.shadowBlur = 6;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    vines.forEach(vine => {
      const { pts, flowers, leaves, sprouts, color } = vine;
      const total = pts.length - 1;
      const drawn = progress * total;
      const fullSegs = Math.floor(drawn);
      const frac = drawn - fullSegs;

      // Stem
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i <= fullSegs && i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      if (fullSegs < total) {
        const a = pts[fullSegs], b = pts[fullSegs + 1];
        ctx.lineTo(a.x + (b.x - a.x) * frac, a.y + (b.y - a.y) * frac);
      }
      ctx.strokeStyle = dark
        ? `hsl(${110 + Math.random() * 0}, 70%, 55%)`
        : color;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Hanging sprouts
      sprouts.forEach(sp => {
        if (sp.idx > drawn) return;
        const spProgress = Math.min(1, (drawn - sp.idx) / 1.0);
        const p = pts[sp.idx];
        const tipX = p.x + Math.cos(sp.droop) * sp.len * spProgress;
        const tipY = p.y + Math.sin(sp.droop) * sp.len * spProgress;

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        const midX = p.x + Math.cos(sp.droop) * sp.len * 0.5 * spProgress;
        const midY = p.y + Math.sin(sp.droop + 0.3) * sp.len * 0.5 * spProgress;
        ctx.quadraticCurveTo(midX, midY, tipX, tipY);
        ctx.strokeStyle = dark ? 'hsl(130, 65%, 50%)' : `hsl(120, 50%, 38%)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        if (spProgress > 0.7) {
          const budP = (spProgress - 0.7) / 0.3;
          ctx.beginPath();
          ctx.arc(tipX, tipY, sp.budR * budP, 0, Math.PI * 2);
          ctx.fillStyle = dark
            ? `hsla(${sp.hue}, 80%, 70%, 0.9)`
            : `hsla(${sp.hue}, 70%, 60%, 0.85)`;
          ctx.fill();
        }
      });

      // Leaves
      leaves.forEach(leaf => {
        if (leaf.idx > drawn) return;
        const leafP = Math.min(1, (drawn - leaf.idx) / 1.5);
        const p = pts[leaf.idx];
        const prev = pts[Math.max(0, leaf.idx - 1)];
        const stemAngle = Math.atan2(p.y - prev.y, p.x - prev.x);
        const la = stemAngle + (Math.PI / 2.5) * leaf.side;
        const ls = leaf.size * leafP;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(la);
        ctx.beginPath();
        ctx.ellipse(ls * 0.6, 0, ls, ls * 0.38, 0, 0, Math.PI * 2);
        ctx.fillStyle = dark
          ? `hsla(120, 60%, 45%, 0.65)`
          : `hsla(120, 50%, 35%, 0.6)`;
        ctx.fill();
        ctx.restore();
      });

      // Flowers
      flowers.forEach(fl => {
        if (fl.idx > drawn) return;
        const flP = Math.min(1, (drawn - fl.idx) / 1.2);
        if (flP <= 0) return;
        const p = pts[fl.idx];
        const r = fl.r * flP;

        if (dark) {
          ctx.shadowColor = `hsla(${fl.hue}, 90%, 70%, 0.9)`;
          ctx.shadowBlur = 10;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(fl.angle + progress * 0.5);

        for (let k = 0; k < fl.petalCount; k++) {
          const pa = (k / fl.petalCount) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(
            Math.cos(pa) * r * 1.1,
            Math.sin(pa) * r * 1.1,
            r * 0.75, r * 0.45,
            pa, 0, Math.PI * 2
          );
          ctx.fillStyle = dark
            ? `hsla(${fl.hue}, 85%, 72%, 0.9)`
            : `hsla(${fl.hue}, 75%, 70%, 0.85)`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = dark
          ? `hsla(55, 100%, 80%, 1)`
          : `hsla(50, 95%, 70%, 0.95)`;
        ctx.fill();
        ctx.restore();

        if (dark) {
          ctx.shadowColor = 'rgba(100, 230, 130, 0.7)';
          ctx.shadowBlur = 6;
        }
      });
    });
  }

  // ── Speed: touchMode uses 4s (step ≈ 0.004/frame @60fps), desktop ~1s (0.028) ──
  get stepSize() {
    return this.touchMode ? 0.0055 : 0.028;
  }

  show() {
    if (this.active) return;
    this.active = true;
    this.resize();
    this.seedVines();
    this.canvas.style.opacity = '1';
    this.dir = 1;
    this.animate();
  }

  hide() {
    this.active = false;
    this.dir = -1;
    // On touch, sprout out is also slow (4s) for a satisfying retract
    this.animate();
  }

  animate() {
    cancelAnimationFrame(this.frame);
    const step = () => {
      this.progress = Math.max(0, Math.min(1, this.progress + this.dir * this.stepSize));
      this.draw(this.progress);
      if ((this.dir === 1 && this.progress < 1) || (this.dir === -1 && this.progress > 0)) {
        this.frame = requestAnimationFrame(step);
      } else if (this.dir === -1 && this.progress <= 0) {
        this.canvas.style.opacity = '0';
        this.ctx.clearRect(0, 0, this.W, this.H);
        this.vines = [];
      }
    };
    this.frame = requestAnimationFrame(step);
  }
}

function attachVines() {
  const touch = isTouchDevice();
  const targets = document.querySelectorAll(
    '.skill-chip, .contact-card, .stat-card, .timeline-item, .hero-badge, .btn-primary, .btn-outline'
  );

  targets.forEach(el => {
    const vc = new VineCanvas(el, touch);

    if (touch) {
      // ── TOUCH: tap to sprout in, auto sprout out after 3s ──
      el.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        if (vc.tapOpen) return; // already showing, ignore extra taps
        vc.tapOpen = true;
        vc.show();
        clearTimeout(vc.autoHideTimer);
        vc.autoHideTimer = setTimeout(() => {
          vc.tapOpen = false;
          vc.hide();
        }, 3000);
      }, { passive: true });

    } else {
      // ── DESKTOP: hover ──
      el.addEventListener('mouseenter', () => vc.show());
      el.addEventListener('mouseleave', () => vc.hide());
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(attachVines, 200));
} else {
  setTimeout(attachVines, 200);
}
