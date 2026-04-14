// LaaS Landing Page - JavaScript
// All logic converted from React TypeScript

const ACCENT = "#4f6ef7";
const ACCENT_DARK = "#3a56d4";

// ============================================
// NAVIGATION - Scroll Behavior
// ============================================
function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  
  const handleScroll = () => {
    if (window.scrollY > 30) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };
  
  window.addEventListener('scroll', handleScroll);
  handleScroll();
}

// ============================================
// PARTICLES - Canvas Animation
// ============================================
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  let animId;
  
  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  
  resize();
  window.addEventListener('resize', resize);
  
  const dots = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.5 + 0.3,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    opacity: Math.random() * 0.5 + 0.1,
  }));
  
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    dots.forEach(d => {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < 0) d.x = canvas.width;
      if (d.x > canvas.width) d.x = 0;
      if (d.y < 0) d.y = canvas.height;
      if (d.y > canvas.height) d.y = 0;
      
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100,160,255,${d.opacity})`;
      ctx.fill();
    });
    
    dots.forEach((a, i) => {
      dots.slice(i + 1).forEach(b => {
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 130) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(79,110,247,${0.07 * (1 - dist / 130)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });
    });
    
    animId = requestAnimationFrame(draw);
  };
  
  draw();
  
  return () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', resize);
  };
}

// ============================================
// TERMINAL - Typewriter Animation
// ============================================
const termSequence = [
  { type: "cmd", text: "$ laas login --sso ksrce.edu.in" },
  { type: "output", lines: [
    { t: "ok", s: "✓  Authenticated via KSRCE SSO" },
    { t: "ok", s: "✓  Storage provisioned" },
  ]},
  { type: "cmd", text: "$ laas launch --gpu 5090 --type jupyter" },
  { type: "output", lines: [
    { t: "muted", s: "  Selecting node …" },
    { t: "muted", s: "  Pulling image  laas/jupyter:cuda12" },
    { t: "ok", s: "✓  Session live in 8s" },
    { t: "url", s: "  → https://sess.laas.io/xk9f2a" },
  ]},
  { type: "cmd", text: "$ laas status" },
  { type: "output", lines: [
    { t: "muted", s: "  GPU   RTX 5090 32 GB   vCPU 8   RAM 16 GB" },
    { t: "ok", s: "  Status: ● Running" },
    { t: "url", s: "  Cost:  ₹65/hr" },
  ]},
];

const CHAR_DELAY = 38;
const OUTPUT_LINE_DELAY = 280;
const LOOP_PAUSE = 2500;

function initTerminal() {
  const terminalBody = document.getElementById('terminal-body');
  if (!terminalBody) return;
  
  let cancelled = false;
  const col = {
    cmd: "var(--fgColor-default)",
    ok: "#22c55e",
    muted: "var(--fgColor-muted)",
    url: ACCENT,
  };
  
  const waitSleep = (ms) => new Promise(resolve => {
    const id = setTimeout(() => {
      if (!cancelled) resolve();
    }, ms);
  });
  
  async function runSequence() {
    while (!cancelled) {
      terminalBody.innerHTML = '';
      let lines = [];
      let typingText = '';
      
      for (const step of termSequence) {
        if (cancelled) return;
        
        if (step.type === "cmd") {
          // Typewriter effect
          for (let i = 0; i <= step.text.length; i++) {
            if (cancelled) return;
            typingText = step.text.slice(0, i);
            renderTerminal(terminalBody, lines, typingText, col);
            await waitSleep(CHAR_DELAY);
          }
          
          await waitSleep(200);
          lines.push({ t: "cmd", s: step.text });
          typingText = '';
          renderTerminal(terminalBody, lines, typingText, col);
        } else {
          // Output lines
          for (const line of step.lines) {
            if (cancelled) return;
            lines.push(line);
            renderTerminal(terminalBody, lines, typingText, col);
            await waitSleep(OUTPUT_LINE_DELAY);
          }
          lines.push({ t: "", s: "" });
          renderTerminal(terminalBody, lines, typingText, col);
          await waitSleep(150);
        }
      }
      
      await waitSleep(LOOP_PAUSE);
    }
  }
  
  runSequence();
  
  return () => { cancelled = true; };
}

function renderTerminal(container, lines, typingText, col) {
  container.innerHTML = lines.map(l => 
    `<div class="terminal-line ${l.t}">${escapeHtml(l.s) || '&nbsp;'}</div>`
  ).join('');
  
  if (typingText !== '') {
    container.innerHTML += `<div class="terminal-line">${escapeHtml(typingText)}<span class="terminal-cursor">▊</span></div>`;
  } else {
    container.innerHTML += `<div class="terminal-line"><span class="terminal-cursor">▊</span></div>`;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// COUNTER - Animated Number on Scroll
// ============================================
function initCounters() {
  const counters = document.querySelectorAll('.counter');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        if (el.dataset.done) return;
        el.dataset.done = 'true';
        
        const end = parseInt(el.dataset.end);
        if (isNaN(end)) return;
        
        const duration = 1600;
        const step = 16;
        const inc = end / (duration / step);
        let cur = 0;
        
        const timer = setInterval(() => {
          cur += inc;
          if (cur >= end) {
            el.textContent = end.toLocaleString() + (el.dataset.suffix || '');
            clearInterval(timer);
          } else {
            el.textContent = Math.floor(cur).toLocaleString() + (el.dataset.suffix || '');
          }
        }, step);
      }
    });
  }, { threshold: 0.4 });
  
  counters.forEach(c => observer.observe(c));
}

// ============================================
// SCROLL REVEAL
// ============================================
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
  
  document.querySelectorAll('.reveal-on-scroll').forEach(e => observer.observe(e));
  
  // Bento animations
  const bentoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('bento-revealed');
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
  
  document.querySelectorAll('.bento-animate').forEach(el => bentoObserver.observe(el));
}

// ============================================
// CAPABILITIES ACCORDION
// ============================================
const capabilityItems = [
  {
    num: "01",
    title: "On-Demand GPU Infrastructure.",
    subtitle: "Bare-metal performance. Zero hardware setup.",
    bullets: [
      'Instantly provision <span class="accent">fractional GPU slices</span> or an entire dedicated RTX 5090 node.',
      'Containerized architecture guarantees <span class="accent">sub-30 second boot times</span> for your workloads.',
      'Strict <span class="accent">resource isolation</span> ensures peak computational consistency.'
    ]
  },
  {
    num: "02",
    title: "Persistent Stateful Storage.",
    subtitle: "Your workspace, exactly how you left it.",
    bullets: [
      '<span class="accent">Up to 100GB</span> of dedicated, high-speed storage allocated per subscription.',
      '<span class="accent">Hard-isolated volumes</span> guarantee absolute data privacy and security.',
      'Switch flexibly between compute tiers <span class="accent">without moving a single file</span> or reinstalling environments.'
    ]
  },
  {
    num: "03",
    title: "Seamless GUI & CLI Access.",
    subtitle: "A full remote workstation streamed directly to your browser.",
    bullets: [
      'High-fidelity desktop experiences powered by <span class="accent">ultra-low latency</span> rendering.',
      'Pre-loaded with essential toolchains like <span class="accent">MATLAB, PyTorch, Blender, and VS Code.</span>',
      'Absolute <span class="accent">raw terminal access</span> for maximum orchestration control.'
    ]
  },
  {
    num: "04",
    title: "Integrated Mentorship Program.",
    subtitle: "Guided expertise from industry leaders.",
    bullets: [
      'Direct channels for architecture reviews and <span class="accent">model optimization</span> strategies.',
      'Hands-on guidance to accelerate your research from <span class="accent">prototype to production.</span>',
      'Comprehensive documentation paired with <span class="accent">premium engineering support.</span>'
    ]
  }
];

function initAccordion() {
  const container = document.getElementById('accordion-container');
  if (!container) return;
  
  container.innerHTML = capabilityItems.map((item, idx) => `
    <div class="accordion-item" data-index="${idx}">
      <button class="accordion-header">
        <span class="accordion-num">${item.num} <span>/</span></span>
        <span class="accordion-title">${item.title}</span>
        <span class="accordion-icon">−</span>
      </button>
      <div class="accordion-body">
        <div class="accordion-body-inner">
          <div class="accordion-pointer">
            <p class="accordion-subtitle">${item.subtitle}</p>
          </div>
          <ul class="accordion-bullets">
            ${item.bullets.map(b => `<li class="accordion-bullet"><span>+</span><span>${b}</span></li>`).join('')}
          </ul>
        </div>
      </div>
    </div>
  `).join('');
  
  container.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const isOpen = item.classList.contains('open');
      
      // Close all others
      container.querySelectorAll('.accordion-item').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.accordion-icon').textContent = '+';
      });
      
      if (!isOpen) {
        item.classList.add('open');
        item.querySelector('.accordion-icon').textContent = '−';
        updateIsometric(parseInt(item.dataset.index));
      } else {
        updateIsometric(null);
      }
    });
  });
}

// ============================================
// ISOMETRIC SVG
// ============================================
function initIsometric() {
  const container = document.getElementById('isometric-svg');
  if (!container) return;
  
  const blockLabels = ["Purpose-built datacenters", "AI infrastructure", "Managed services", "Co-engineering"];
  const sideLabels = ["AI DEVELOPERS", "ENTERPRISE", "SUPERINTELLIGENCE"];
  
  const CX = 200;
  const BASE_Y = 110;
  const DX = 160;
  const DY = 80;
  const DEPTH = 22;
  const tightGap = 36;
  
  const labelYs = [170, 225, 280];
  const angleRad = Math.atan2(DY, DX);
  const angleDeg = (angleRad * 180) / Math.PI;
  
  function getCy(idx, activeIndex) {
    if (activeIndex === null) return BASE_Y + idx * (tightGap + 20);
    return BASE_Y + idx * tightGap + (idx > activeIndex ? 100 : 0);
  }
  
  function isoCorners(cy) {
    return {
      top: { x: CX, y: cy - DY },
      right: { x: CX + DX, y: cy },
      bottom: { x: CX, y: cy + DY },
      left: { x: CX - DX, y: cy },
    };
  }
  
  function drawPattern(idx, cy) {
    const c = isoCorners(cy);
    let html = '';
    
    if (idx === 0) {
      // Grid pattern
      for (let i = 1; i < 5; i++) {
        const f = i / 5;
        const x1 = c.top.x + (c.left.x - c.top.x) * f;
        const y1 = c.top.y + (c.left.y - c.top.y) * f;
        const x2 = c.right.x + (c.bottom.x - c.right.x) * f;
        const y2 = c.right.y + (c.bottom.y - c.right.y) * f;
        html += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(255,255,255,0.15)" stroke-width="1" />`;
        
        const x3 = c.top.x + (c.right.x - c.top.x) * f;
        const y3 = c.top.y + (c.right.y - c.top.y) * f;
        const x4 = c.left.x + (c.bottom.x - c.left.x) * f;
        const y4 = c.left.y + (c.bottom.y - c.left.y) * f;
        html += `<line x1="${x3}" y1="${y3}" x2="${x4}" y2="${y4}" stroke="rgba(255,255,255,0.15)" stroke-width="1" />`;
      }
      for (let i = 1; i < 5; i++) {
        for (let j = 1; j < 5; j++) {
          const x = c.top.x + (c.right.x - c.top.x) * (j / 5) + (c.left.x - c.top.x) * (i / 5);
          const y = c.top.y + (c.right.y - c.top.y) * (j / 5) + (c.left.y - c.top.y) * (i / 5);
          const isCenter = i === 2 && j === 2;
          html += `<circle cx="${x}" cy="${y}" r="2" fill="${isCenter ? '#fff' : 'rgba(255,255,255,0.6)'}" />`;
        }
      }
    } else if (idx === 1) {
      // Concentric squares
      for (let i = 1; i <= 3; i++) {
        const scale = i * 0.25;
        const points = `${CX},${cy - DY * scale} ${CX + DX * scale},${cy} ${CX},${cy + DY * scale} ${CX - DX * scale},${cy}`;
        html += `<polygon points="${points}" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1" ${i === 2 ? 'stroke-dasharray="4 4"' : ''} />`;
      }
      const scale = 0.15;
      const points = `${CX},${cy - DY * scale} ${CX + DX * scale},${cy} ${CX},${cy + DY * scale} ${CX - DX * scale},${cy}`;
      html += `<polygon points="${points}" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" />`;
    } else if (idx === 2) {
      html += `<ellipse cx="${CX}" cy="${cy}" rx="${DX * 0.4}" ry="${DY * 0.4}" stroke="rgba(255,255,255,0.15)" stroke-width="1" fill="none" stroke-dasharray="3 4" />`;
      html += `<ellipse cx="${CX}" cy="${cy}" rx="${DX * 0.25}" ry="${DY * 0.25}" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" fill="none" />`;
      html += `<ellipse cx="${CX}" cy="${cy}" rx="${DX * 0.1}" ry="${DY * 0.1}" stroke="#fff" stroke-width="2" fill="none" />`;
    } else if (idx === 3) {
      const rx = DX * 0.25;
      const ry = DY * 0.25;
      const offset = DX * 0.15;
      html += `<ellipse cx="${CX - offset}" cy="${cy}" rx="${rx}" ry="${ry}" stroke="#4f8ef7" stroke-width="1.5" fill="rgba(79,142,247,0.05)" />`;
      html += `<ellipse cx="${CX + offset}" cy="${cy}" rx="${rx}" ry="${ry}" stroke="#fff" stroke-width="1.5" fill="rgba(255,255,255,0.05)" stroke-dasharray="4 4" />`;
      html += `<circle cx="${CX}" cy="${cy - ry * 0.6}" r="3" fill="#3bff3b" />`;
      html += `<circle cx="${CX}" cy="${cy + ry * 0.6}" r="3" fill="#ff3b3b" />`;
      html += `<circle cx="${CX}" cy="${cy}" r="1" fill="#fff" />`;
      html += `<circle cx="${CX - 8}" cy="${cy}" r="1" fill="#fff" />`;
      html += `<circle cx="${CX + 8}" cy="${cy}" r="1" fill="#fff" />`;
      html += `<circle cx="${CX}" cy="${cy - 8}" r="1" fill="#fff" />`;
      html += `<circle cx="${CX}" cy="${cy + 8}" r="1" fill="#fff" />`;
    }
    
    return html;
  }
  
  function render(activeIndex) {
    let svg = `
      <svg viewBox="0 0 500 500">
        <defs>
          <linearGradient id="activeBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff3366" />
            <stop offset="50%" stop-color="#4f8ef7" />
            <stop offset="100%" stop-color="#00f3ff" />
          </linearGradient>
        </defs>
    `;
    
    // Connections
    if (activeIndex !== null) {
      const activeCy = getCy(activeIndex, activeIndex);
      const ac = isoCorners(activeCy);
      const p1 = { x: ac.top.x + (ac.right.x - ac.top.x) * 0.65, y: ac.top.y + (ac.right.y - ac.top.y) * 0.65 };
      const p2 = { x: ac.top.x + (ac.right.x - ac.top.x) * 0.75, y: ac.top.y + (ac.right.y - ac.top.y) * 0.75 };
      const p3 = { x: ac.top.x + (ac.right.x - ac.top.x) * 0.85, y: ac.top.y + (ac.right.y - ac.top.y) * 0.85 };
      const origins = [p1, p2, p3];
      
      origins.forEach((origin, i) => {
        svg += `<path d="M ${origin.x} ${origin.y} L ${origin.x} ${labelYs[i]} L ${CX + DX + 6} ${labelYs[i]}" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" stroke-dasharray="2 4" />`;
      });
    }
    
    // Right labels
    sideLabels.forEach((label, i) => {
      const opacity = activeIndex !== null ? '0.7' : '0.15';
      svg += `<text x="${CX + DX + 10}" y="${labelYs[i] + 4}" fill="rgba(255,255,255,${opacity})" font-family="var(--font-mono), monospace" font-size="8" font-weight="600" letter-spacing="0.1em">${label}</text>`;
    });
    
    // Layers
    [3, 2, 1, 0].forEach(idx => {
      const cy = getCy(idx, activeIndex);
      const isActive = activeIndex === idx;
      const c = isoCorners(cy);
      
      const topFill = isActive ? "rgba(10, 10, 15, 0.95)" : "rgba(5, 5, 8, 0.8)";
      const leftFill = "rgba(15, 15, 20, 0.95)";
      const rightFill = "rgba(8, 8, 12, 0.95)";
      const strokeBase = isActive ? "url(#activeBorder)" : "rgba(255,255,255,0.15)";
      const strokeWidth = isActive ? "2" : "1";
      
      // Depth faces
      svg += `<polygon points="${c.left.x},${c.left.y} ${c.bottom.x},${c.bottom.y} ${c.bottom.x},${c.bottom.y + DEPTH} ${c.left.x},${c.left.y + DEPTH}" fill="${leftFill}" stroke="${strokeBase}" stroke-width="${strokeWidth}" />`;
      svg += `<polygon points="${c.bottom.x},${c.bottom.y} ${c.right.x},${c.right.y} ${c.right.x},${c.right.y + DEPTH} ${c.bottom.x},${c.bottom.y + DEPTH}" fill="${rightFill}" stroke="${strokeBase}" stroke-width="${strokeWidth}" />`;
      
      // Top face
      svg += `<polygon points="${c.top.x},${c.top.y} ${c.right.x},${c.right.y} ${c.bottom.x},${c.bottom.y} ${c.left.x},${c.left.y}" fill="${topFill}" stroke="${strokeBase}" stroke-width="${strokeWidth}" />`;
      
      // Inner edges
      if (isActive) {
        svg += `<line x1="${c.left.x}" y1="${c.left.y}" x2="${c.bottom.x}" y2="${c.bottom.y}" stroke="#00f3ff" stroke-width="1" />`;
        svg += `<line x1="${c.bottom.x}" y1="${c.bottom.y}" x2="${c.right.x}" y2="${c.right.y}" stroke="#ff3366" stroke-width="1" />`;
      }
      
      // Patterns
      if (isActive) {
        svg += drawPattern(idx, cy);
      }
      
      // Corner accents
      if (isActive) {
        svg += `<circle cx="${c.top.x}" cy="${c.top.y}" r="2.5" fill="#fff" />`;
        svg += `<circle cx="${c.left.x}" cy="${c.left.y}" r="2.5" fill="#00f3ff" />`;
        svg += `<circle cx="${c.right.x}" cy="${c.right.y}" r="2.5" fill="#ff3366" />`;
        svg += `<circle cx="${c.bottom.x}" cy="${c.bottom.y}" r="2.5" fill="#3bff3b" />`;
      }
      
      // Slanted text
      const textX = (c.left.x + c.bottom.x) / 2;
      const textY = (c.left.y + c.bottom.y) / 2 + DEPTH / 2 + 1.3;
      const textColor = isActive ? "#fff" : "rgba(255,255,255,0.45)";
      svg += `<text x="${textX}" y="${textY}" fill="${textColor}" font-family="var(--font-mono), monospace" font-size="9.2" font-weight="700" letter-spacing="0.05em" dominant-baseline="middle" text-anchor="middle" transform="skewY(${angleDeg})">${blockLabels[idx]}</text>`;
    });
    
    svg += '</svg>';
    container.innerHTML = svg;
  }
  
  render(null);
  
  // Expose for accordion
  window.updateIsometric = (idx) => render(idx);
}

// ============================================
// INTERACTIVE GRID - Mouse Ripples
// ============================================
function initInteractiveGrid() {
  const container = document.getElementById('interactive-grid');
  if (!container) return;
  
  const dotMatrix = container.querySelector('.dot-matrix');
  if (!dotMatrix) return;
  
  let lastRippleTime = 0;
  
  // Auto waves
  const fireAutoWave = () => {
    const wave = document.createElement('div');
    wave.className = 'auto-wave';
    
    const rx = (Math.random() * 0.8 + 0.1) * 800;
    const ry = (Math.random() * 0.8 + 0.1) * 600;
    wave.style.left = `${rx}px`;
    wave.style.top = `${ry}px`;
    
    const palettes = [
      "radial-gradient(ellipse at 40% 50%, rgba(79,130,247,1) 0%, rgba(139,92,246,0.6) 45%, transparent 70%)",
      "radial-gradient(ellipse at 60% 40%, rgba(16,245,164,1) 0%, rgba(79,130,247,0.6) 45%, transparent 70%)",
      "radial-gradient(ellipse at 50% 60%, rgba(139,92,246,1) 0%, rgba(249,115,22,0.6) 45%, transparent 70%)",
    ];
    wave.style.background = palettes[Math.floor(Math.random() * palettes.length)];
    
    dotMatrix.appendChild(wave);
    setTimeout(() => wave.remove(), 12000);
    
    setTimeout(fireAutoWave, 3000 + Math.random() * 1500);
  };
  
  fireAutoWave();
  
  // Mouse ripples
  const handleMouseMove = (e) => {
    const rect = dotMatrix.getBoundingClientRect();
    
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
    
    const now = Date.now();
    if (now - lastRippleTime < 60) return;
    lastRippleTime = now;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ripple = document.createElement('div');
    ripple.className = 'grid-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    dotMatrix.appendChild(ripple);
    setTimeout(() => ripple.remove(), 1500);
  };
  
  window.addEventListener('mousemove', handleMouseMove);
}

// ============================================
// BENTO STEP CARDS
// ============================================
const steps = [
  {
    num: "01",
    title: "Choose Template",
    desc: "Pick a pre-configured framework and pair it with the right GPU tier for your ML workload.",
    color: "#4f8ef7",
    border: "rgba(79,142,247,0.25)",
    items: ["Jupyter", "VS Code", "Stateful GUI", "Custom CLI"],
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>`
  },
  {
    num: "02",
    title: "Configure Resources",
    desc: "Select GPU type, vCPUs, and memory. Scale from a fractional slice to a multi-GPU cluster instantly.",
    color: "#8b5cf6",
    border: "rgba(139,92,246,0.25)",
    items: ["RTX 5090", "H100 (Soon)", "Up to 32GB VRAM", "Persistent Storage"],
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>`
  },
  {
    num: "03",
    title: "Launch Instance",
    desc: "One click and your fully configured environment is live and ready for training in under 30 seconds.",
    color: "#00d4ff",
    border: "rgba(0,212,255,0.22)",
    items: ["One-click launch", "SSO injected", "Storage mounted"],
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>`
  },
  {
    num: "04",
    title: "Development Tools",
    desc: "Multiple access methods to work your way. Full terminal privileges and seamless UI.",
    color: "#10f5a4",
    border: "rgba(16,245,164,0.22)",
    items: ["Full SSH Access", "JupyterLab", "File Transfer", "Live Logs"],
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>`
  },
  {
    num: "05",
    title: "Manage & Monitor",
    desc: "Control your compute lifecycle. Pause instances to save credits, track real-time spend, and monitor session usage.",
    color: "#f97316",
    border: "rgba(249,115,22,0.22)",
    items: ["Pause/Resume", "Real-time Metrics", "Quota Warnings", "Detailed Logs"],
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>`
  }
];

function initBentoGrid() {
  const container = document.getElementById('bento-grid');
  if (!container) return;
  
  const cardClasses = ['bento-card-01', 'bento-card-02', 'bento-card-03', 'bento-card-04', 'bento-card-05'];
  
  container.innerHTML = steps.map((step, idx) => `
    <div class="bento-animate ${cardClasses[idx]}">
      <div class="bento-step-card" style="--card-color: ${step.color}; --card-border: ${step.border}">
        <div class="bento-watermark">${step.num}</div>
        <div class="bento-card-content">
          <div class="bento-icon-box" style="color: ${step.color}">${step.icon}</div>
          <h3 class="bento-card-title">${step.title}</h3>
          <p class="bento-card-desc">${step.desc}</p>
          <div class="bento-pills">
            ${step.items.map(item => `<span class="bento-pill">${item}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// ============================================
// FEATURE COMPARISON GRID
// ============================================
function initFeatureGrid() {
  const container = document.getElementById('feature-grid');
  if (!container) return;
  
  container.innerHTML = `
    <!-- Storage Card - spans 2 cols -->
    <div class="feature-card span-2 bento-animate" style="transition-delay: 0s">
      <div class="feature-card-left">
        <div class="feature-tag blue">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>
          Persistent Storage
        </div>
        <div class="feature-title">Your data outlives every session</div>
        <p class="feature-desc">No more re-uploading gigabytes of datasets before every run. Your persistent ZFS volume mounts automatically every time.</p>
        <div class="vs-row"><span class="check">✓</span><span class="bold">Up to 100 GB Zero-setup ZFS — always mounted</span></div>
        <div class="vs-row"><span class="cross">✕</span><span class="strike">Manual cloud volumes — re-attach each session</span></div>
      </div>
      <div class="feature-stat">
        <div class="feature-stat-value">100</div>
        <div class="feature-stat-unit">GB</div>
        <div class="feature-stat-note">per user, always-on</div>
      </div>
    </div>
    
    <!-- Zero Egress Card -->
    <div class="feature-card standard bento-animate" style="transition-delay: 0.1s">
      <div class="feature-tag cyan">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
        Zero Egress
      </div>
      <div class="feature-title sm">No bandwidth tax on your models</div>
      <p class="feature-desc sm">Move massive checkpoints on our high-speed local network. AWS charges per-GB — we don't.</p>
      <div class="feature-calc">
        <span class="feature-calc-value">$0</span>
        <span class="feature-calc-label">egress fees,<br>ever</span>
      </div>
    </div>
    
    <!-- SSO Card -->
    <div class="feature-card standard bento-animate" style="transition-delay: 0.15s">
      <div class="feature-tag green">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
        Auth
      </div>
      <div class="feature-title sm">Sign in with your university ID</div>
      <p class="feature-desc sm">KSRCE SSO — no new passwords, no separate signup. One credential for everything.</p>
      <div class="feature-sso-box">
        <div class="feature-sso-avatar">KS</div>
        <div class="feature-sso-info">
          <div class="feature-sso-email">student@ksrce.edu.in</div>
          <div class="feature-sso-status">✓ SSO Verified</div>
        </div>
      </div>
    </div>
    
    <!-- Instant GUI Card -->
    <div class="feature-card standard bento-animate" style="transition-delay: 0.22s">
      <div class="feature-tag purple">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
        GUI Desktop
      </div>
      <div class="feature-title sm">Full KDE desktop in your browser</div>
      <p class="feature-desc sm">PyTorch, HuggingFace, CUDA — pre-installed. No setup, no config files, no env hell.</p>
      <div class="vs-row"><span class="check">✓</span><span class="bold">KDE Plasma + CUDA 12.2</span></div>
      <div class="vs-row"><span class="cross">✕</span><span class="strike">CLI-only cloud defaults</span></div>
    </div>
    
    <!-- Demo Video Card -->
    <div class="feature-card video-card bento-animate" style="transition-delay: 0.25s">
      <video autoplay muted loop playsinline>
        <source src="assets/hf_20260322_011532_86f9b93a-2ffc-42fd-8735-12a4c55ab536.mp4" type="video/mp4">
      </video>
    </div>
    
    <!-- Predictable Envs Card - spans 2 -->
    <div class="feature-card span-2-row bento-animate" style="transition-delay: 0.3s">
      <div class="feature-card-left">
        <div class="feature-tag orange">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="9" x2="19" y2="9" /><line x1="5" y1="15" x2="19" y2="15" /></svg>
          Consistency
        </div>
        <div class="feature-title sm">Same env on CPU and RTX 5090— guaranteed</div>
        <p class="feature-desc sm">Code on Epi-CPU, scale to RTX 5090 without touching a single config. Environment drift is a cloud problem, not yours.</p>
      </div>
      <div class="feature-env-list">
        ${[['Epi-CPU', '#888'], ['GPU-S', '#8b5cf6'], ['RTX 5090', '#4f8ef7']].map(([label, color]) => `
          <div class="feature-env-row">
            <div class="feature-env-badge" style="background: ${color}22; border: 1px solid ${color}44">
              <span class="label" style="color: ${color}">${label}</span>
            </div>
            <span class="feature-env-version">pytorch==2.3 cuda==12.2</span>
            <span class="feature-env-check">✓</span>
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Bare-metal Card - spans 3 -->
    <div class="feature-card span-3 bento-animate" style="transition-delay: 0.38s">
      <div class="feature-card-left">
        <div class="feature-tag red">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg>
          Bare-metal
        </div>
        <div class="feature-title sm">Raw hardware. No noisy neighbours.</div>
        <p class="feature-desc sm">AMD Ryzen 9 + NVMe, not throttled virtual vCPUs sharing a hypervisor with 40 other tenants.</p>
      </div>
      <div class="feature-bars">
        ${[
          { label: 'LaaS (bare-metal)', pct: 94, color: '#4f8ef7' },
          { label: 'AWS EC2 (vCPU)', pct: 58, color: '#ef4444' },
          { label: 'GCP Compute', pct: 54, color: '#ef4444' },
        ].map(bar => `
          <div class="feature-bar-item">
            <div class="feature-bar-header">
              <span class="feature-bar-label">${bar.label}</span>
              <span class="feature-bar-value" style="color: ${bar.color}">${bar.pct}%</span>
            </div>
            <div class="feature-bar-track">
              <div class="feature-bar-fill" style="width: ${bar.pct}%; background: ${bar.color}"></div>
            </div>
          </div>
        `).join('')}
        <div class="feature-bar-note">CPU benchmark score (relative)</div>
      </div>
    </div>
  `;
  
  // Mouse spotlight effect
  const grid = container;
  
  grid.addEventListener('mousemove', (e) => {
    const cards = grid.querySelectorAll('.feature-card');
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    });
  });
}

// ============================================
// PRICING TABLE
// ============================================
const pricing = [
  { title: "Spark", price: "₹35", vcpu: 2, memory: "4 GB", vram: "2 GB", hami: "8%", bestFor: "Small PyTorch inference, Jupyter notebooks, educational projects", badge: undefined, highlight: false },
  { title: "Blaze", price: "₹65", vcpu: 4, memory: "8 GB", vram: "4 GB", hami: "17%", bestFor: "Model fine-tuning, GPU-accelerated rendering, professional development", badge: "Popular", highlight: true },
  { title: "Inferno", price: "₹105", vcpu: 8, memory: "16 GB", vram: "8 GB", hami: "33%", bestFor: "Large model training, complex 3D rendering, GPU-intensive simulations", badge: undefined, highlight: false },
  { title: "Supernova", price: "₹155", vcpu: 12, memory: "32 GB", vram: "16 GB", hami: "67%", bestFor: "Large-scale deep learning, exclusive research sessions, production inference", badge: "Exclusive", highlight: false },
];

function initPricing() {
  const tbody = document.getElementById('pricing-tbody');
  if (!tbody) return;
  
  tbody.innerHTML = pricing.map(row => `
    <tr class="${row.highlight ? 'featured' : ''}">
      <td>
        <div class="pricing-tier">
          <img src="assets/nvidia_logo_icon_169902.png" alt="NVIDIA">
          <div>
            <span class="pricing-tier-name">${row.title}</span>
            ${row.badge ? `<span class="pricing-tier-badge">${row.badge}</span>` : ''}
            <div class="pricing-tier-best">${row.bestFor}</div>
          </div>
        </div>
      </td>
      <td class="pricing-mono">${row.vcpu}</td>
      <td class="pricing-mono">${row.memory}</td>
      <td class="pricing-mono vram">${row.vram}</td>
      <td class="pricing-mono">${row.hami}</td>
      <td>
        <span class="pricing-price ${row.highlight ? 'accent' : ''}">${row.price}</span>
        <span class="pricing-price-unit">/hr</span>
      </td>
    </tr>
  `).join('');
}

// ============================================
// ALL PLANS
// ============================================
const allPlans = [
  { title: "Persistent ZFS Storage", desc: "Datasets outlive sessions with high-speed local mounts." },
  { title: "Pre-built ML Images", desc: "CUDA, PyTorch, and TensorFlow environments pre-configured." },
  { title: "Full Terminal Control", desc: "Root-level SSH and browser-based file management." },
  { title: "University SSO Integration", desc: "Instant secure access via KSRCE institutional identity." },
  { title: "Real-time Billing", desc: "Live spend tracking, limit controls, and session pausing." },
  { title: "Priority Support", desc: "Premium email support from our engineering team." },
];

function initAllPlans() {
  const grid = document.getElementById('all-plans-grid');
  if (!grid) return;
  
  grid.innerHTML = allPlans.map(item => `
    <div class="all-plans-item">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      <div>
        <div class="all-plans-item-title">${item.title}</div>
        <div class="all-plans-item-desc">${item.desc}</div>
      </div>
    </div>
  `).join('');
}

// ============================================
// FAQ
// ============================================
const faqs = [
  { q: "How do I launch my first session on LaaS?", a: "Sign up with your university email or Google account, top up your wallet, pick a compute tier that fits your workload, and click Launch. Within seconds a fully configured desktop or notebook environment is live in your browser — no drivers, no local installation required." },
  { q: "How does GPU sharing work — can I really get my own VRAM slice?", a: "Yes. Each session is allocated a guaranteed, isolated slice of GPU memory. Your workload — whether PyTorch, TensorFlow, or any GPU-accelerated application — sees only the VRAM assigned to you and operates completely independently from other users on the same node." },
  { q: "What is a Stateful Desktop session?", a: "A Stateful Desktop is a full-featured remote Linux desktop streamed directly to your browser — no downloads or plugins needed. All your files, installed packages, and project work are automatically saved to your personal storage and restored on every future session, just like picking up where you left off on your own machine." },
  { q: "What is an Ephemeral session and who should use it?", a: "Ephemeral sessions provide a lightweight, browser-based compute environment (Jupyter Notebook, VS Code, or SSH) for temporary workloads. Compute data is cleared when the session ends, but your saved files remain intact. This mode is ideal for quick experiments, inference jobs, or users accessing the platform without university affiliation." },
  { q: "How is my data isolated from other users?", a: "Your personal storage is provisioned with a hard quota and is inaccessible to any other user. Each session runs inside a fully isolated compute environment — GPU memory, CPU, RAM, and storage are all enforced at a system level to guarantee complete separation between concurrent users." },
  { q: "Can I use MATLAB, Blender, or PyTorch without any setup?", a: "It depends on the template you select. If a pre-configured template with these tools is available, you're ready to go instantly. Alternatively, you can launch a fresh instance and fully customize it with any software you need, no restrictions." },
  { q: "How does billing work?", a: "LaaS uses a wallet-based credit system with per-hour billing charge cycles. Active sessions burn credits at the configured compute rate. Paused sessions only incur minimal storage fees. You can set spend limits and view a real-time daily spend chart on your dashboard." },
  { q: "What happens when a session is idle?", a: "Sessions that exceed a configurable idle threshold are automatically terminated to conserve resources. Files saved to your persistent storage are always preserved regardless of session termination status." },
  { q: "What happens when I end or delete a session?", a: "When a session ends, the temporary compute environment is permanently torn down — any in-session system changes are discarded. However, all files in your personal storage are always preserved. Compute charges stop immediately; any applicable storage fees continue based on your subscription." },
  { q: "What happens if my browser disconnects mid-session?", a: "Your session keeps running on the platform until the booked time expires. Simply reopen the LaaS portal and reconnect — your desktop or notebook resumes exactly where you left off. You will also receive advance warnings before any scheduled session expiry." },
  { q: "What is the refund policy?", a: "Credits consumed by active sessions are non-refundable. If you believe a deduction occurred due to a platform-side issue, contact us at project@gktech.ai with your session details and we will review it within 2 business days. Unused wallet balance refund requests from institutions are considered on a case-by-case basis." },
];

function initFAQ() {
  const leftGrid = document.getElementById('faq-grid-left');
  const rightGrid = document.getElementById('faq-grid-right');
  if (!leftGrid || !rightGrid) return;
  
  const leftFaqs = faqs.slice(0, 5);
  const rightFaqs = faqs.slice(5);
  
  function renderFAQ(faq) {
    return `
      <div class="faq-item">
        <button class="faq-question">
          <span>${faq.q}</span>
          <span class="faq-toggle">+</span>
        </button>
        <div class="faq-answer">
          <p>${faq.a}</p>
        </div>
      </div>
    `;
  }
  
  leftGrid.innerHTML = leftFaqs.map(renderFAQ).join('');
  rightGrid.innerHTML = rightFaqs.map(renderFAQ).join('');
  
  // Toggle handlers
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const isOpen = item.classList.contains('open');
      
      // Close all
      document.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-toggle').textContent = '+';
      });
      
      if (!isOpen) {
        item.classList.add('open');
        item.querySelector('.faq-toggle').textContent = '+';
        item.querySelector('.faq-toggle').style.transform = 'rotate(45deg)';
      }
    });
  });
  
  // Fix toggle after render
  document.querySelectorAll('.faq-item.open .faq-toggle').forEach(t => {
    t.style.transform = 'rotate(45deg)';
  });
}

// ============================================
// ZOOM - Match 1280px Design Viewport
// ============================================
function initZoom() {
  const setZoomValue = () => {
    const zoomValue = window.innerWidth / 1280;
    document.documentElement.style.zoom = String(zoomValue);
  };
  
  setZoomValue();
  window.addEventListener('resize', setZoomValue);
  
  return () => {
    window.removeEventListener('resize', setZoomValue);
    document.documentElement.style.zoom = '1';
  };
}

// ============================================
// INITIALIZE ALL
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initParticles();
  initTerminal();
  initCounters();
  initScrollReveal();
  initAccordion();
  initIsometric();
  initInteractiveGrid();
  initBentoGrid();
  initFeatureGrid();
  initPricing();
  initAllPlans();
  initFAQ();
  initZoom();
});
