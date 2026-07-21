import { COLOR_MAP } from './config.js';
import { gridBoard } from './state.js';
import { getCellElement } from './grid.js';

// --- CANVAS-BASED NEON PARTICLE SYSTEM ---
const canvas = document.getElementById('effects-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
let isLoopRunning = false;

// Upper bound on live particles. A fever-mode cross-clear (multiplier 2.5, ~15 particles/cell
// over a dozen-plus cleared cells) can otherwise push 500+ shadow-blurred particles in a single
// frame, and canvas shadowBlur is ~5x the cost of a plain fill — a real stutter source on
// low-end phones. Capping bounds the worst case without changing how any single particle looks.
const MAX_PARTICLES = 280;

class Particle {
    constructor(x, y, colorName) {
        this.x = x;
        this.y = y;
        this.baseY = y; // to track floor for bounce
        
        const isWood = document.body.classList.contains('theme-wood');
        const isCandy = document.body.classList.contains('theme-candy');
        const isNeon = document.body.classList.contains('theme-neon');
        const isRetro = document.body.classList.contains('theme-retro');
        const isCosmos = document.body.classList.contains('theme-cosmos');
        const isSeasons = document.body.classList.contains('theme-seasons');
        
        let baseColor = COLOR_MAP[colorName] || '#ff007f';

        this.alpha = 1.0;
        this.rotation = Math.random() * Math.PI * 2;
        this.time = 0;

        if (isWood) {
            this.type = 'wood-splinter';
            const woodColors = ['#8d6e63', '#6d4c41', '#5d4037', '#795548', '#a1887f'];
            this.color = woodColors[Math.floor(Math.random() * woodColors.length)];
            this.radius = 4.0 + Math.random() * 6.0;
            this.gravity = 0.2 + Math.random() * 0.1;
            this.decay = 0.02 + Math.random() * 0.01;
            this.rotationSpeed = (Math.random() - 0.5) * 0.8; // Fast spin
        } else if (isCandy) {
            this.type = Math.random() < 0.5 ? 'confetti' : 'jellybean';
            this.color = baseColor;
            this.radius = 5.0 + Math.random() * 5.0;
            this.gravity = 0.15 + Math.random() * 0.1;
            this.decay = 0.015 + Math.random() * 0.01;
            this.rotationSpeed = (Math.random() - 0.5) * 0.3;
            this.bounce = 0.6 + Math.random() * 0.3; // Bounce factor
            this.floor = y + 50 + Math.random() * 100; // Fake floor
        } else if (isNeon) {
            this.type = Math.random() < 0.7 ? 'spark' : 'glitch';
            const neonColors = [baseColor, '#ffffff', '#00ffff'];
            this.color = neonColors[Math.floor(Math.random() * neonColors.length)];
            this.radius = 1.5 + Math.random() * 3.0;
            this.gravity = 0.05 + Math.random() * 0.05;
            this.decay = 0.02 + Math.random() * 0.02;
            this.rotationSpeed = 0;
            this.zigzagX = (Math.random() - 0.5) * 10;
        } else if (isSeasons) {
            this.type = Math.random() < 0.5 ? 'leaf' : 'snow';
            const autumnColors = ['#e52d27', '#b31217', '#ffa751', '#ffe259', '#a8e063'];
            this.color = this.type === 'leaf' ? autumnColors[Math.floor(Math.random() * autumnColors.length)] : '#ffffff';
            this.radius = 3.0 + Math.random() * 5.0;
            this.gravity = 0.02 + Math.random() * 0.04; // Slow fall
            this.decay = 0.01 + Math.random() * 0.01;
            this.rotationSpeed = (Math.random() - 0.5) * 0.1;
            this.sway = Math.random() * Math.PI * 2;
            this.swaySpeed = 0.05 + Math.random() * 0.1;
        } else if (isRetro) {
            this.type = 'pixel';
            this.color = baseColor;
            this.radius = 4.0 + Math.random() * 4.0;
            this.gravity = 0.1 + Math.random() * 0.1;
            this.decay = 0.02;
            this.rotationSpeed = 0;
        } else if (isCosmos) {
            this.type = 'stardust';
            const cosmosColors = [baseColor, '#8a2be2', '#00ffff', '#ffffff'];
            this.color = cosmosColors[Math.floor(Math.random() * cosmosColors.length)];
            this.radius = 1.0 + Math.random() * 2.0;
            this.gravity = 0; 
            this.decay = 0.02;
            this.rotationSpeed = 0;
        } else {
            this.color = baseColor;
            this.type = Math.random() < 0.35 ? 'sparkle' : (Math.random() < 0.45 ? 'diamond' : 'circle');
            this.radius = 2.0 + Math.random() * 3.0;
            this.gravity = 0.05 + Math.random() * 0.05;
            this.decay = 0.015 + Math.random() * 0.015;
            this.rotationSpeed = (Math.random() - 0.5) * 0.3;
        }
        
        const angle = Math.random() * Math.PI * 2;
        const speed = 3.0 + Math.random() * 7.0; // Increased explosion force
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
    }

    update() {
        this.time += 1;
        
        if (this.type === 'spark') {
            // Erratic zigzag motion for neon sparks
            if (this.time % 3 === 0) {
                this.vx += (Math.random() - 0.5) * 4;
                this.vy += (Math.random() - 0.5) * 4;
            }
        }
        
        if (this.type === 'leaf' || this.type === 'snow') {
            this.x += Math.sin(this.time * this.swaySpeed + this.sway) * 1.5;
        }
        
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity; // Apply gravity
        this.vx *= 0.94; // Friction
        this.vy *= 0.94;
        
        // Bounce logic for candy theme
        if ((this.type === 'jellybean' || this.type === 'confetti') && this.y >= this.floor && this.vy > 0) {
            this.vy = -this.vy * this.bounce;
            this.y = this.floor;
            this.vx *= 0.8;
        }

        this.rotation += this.rotationSpeed;
        this.alpha -= this.decay;
    }

    draw(c) {
        c.save();
        c.globalAlpha = Math.max(0, this.alpha);
        c.translate(this.x, this.y);
        c.rotate(this.rotation);
        c.fillStyle = this.color;

        if (this.type === 'wood-splinter') {
            c.fillRect(-this.radius, -this.radius * 0.25, this.radius * 2, this.radius * 0.5);
        } else if (this.type === 'confetti') {
            c.fillRect(-this.radius, -this.radius * 0.5, this.radius * 2, this.radius);
        } else if (this.type === 'jellybean') {
            c.beginPath();
            c.ellipse(0, 0, this.radius * 1.5, this.radius * 0.8, 0, 0, Math.PI * 2);
            c.fill();
            // Highlight
            c.fillStyle = 'rgba(255,255,255,0.7)';
            c.beginPath();
            c.ellipse(-this.radius * 0.5, -this.radius * 0.2, this.radius * 0.4, this.radius * 0.2, 0, 0, Math.PI * 2);
            c.fill();
        } else if (this.type === 'pixel') {
            c.rotate(-this.rotation); 
            c.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else if (this.type === 'glitch' || this.type === 'spark') {
            c.globalCompositeOperation = 'lighter';
            if (this.type === 'spark') {
                c.fillRect(-this.radius * 1.5, -this.radius * 1.5, this.radius * 3, this.radius * 3);
            } else {
                c.fillRect(-this.radius * 3, -this.radius * 0.2, this.radius * 6, this.radius * 0.4);
            }
        } else if (this.type === 'leaf') {
            c.beginPath();
            c.ellipse(0, 0, this.radius * 1.2, this.radius * 0.6, 0, 0, Math.PI * 2);
            c.fill();
        } else if (this.type === 'snow') {
            c.beginPath();
            c.arc(0, 0, this.radius, 0, Math.PI * 2);
            c.fill();
        } else if (this.type === 'stardust') {
            c.globalCompositeOperation = 'lighter';
            c.beginPath();
            c.arc(0, 0, this.radius, 0, Math.PI * 2);
            c.fill();
        } else {
            if (this.type === 'sparkle') {
                c.beginPath();
                for (let i = 0; i < 4; i++) {
                    c.lineTo(this.radius * 2.2, 0);
                    c.lineTo(this.radius * 0.4, this.radius * 0.4);
                    c.rotate(Math.PI / 2);
                }
                c.closePath();
                c.fill();
            } else if (this.type === 'diamond') {
                c.beginPath();
                c.moveTo(0, -this.radius * 1.4);
                c.lineTo(this.radius * 1.4, 0);
                c.lineTo(0, this.radius * 1.4);
                c.lineTo(-this.radius * 1.4, 0);
                c.closePath();
                c.fill();
            } else {
                c.beginPath();
                c.arc(0, 0, this.radius, 0, Math.PI * 2);
                c.fill();
            }
        }

        c.restore();
    }
}

export function resizeCanvas() {
    if (!canvas || !gridBoard) return;
    const rect = gridBoard.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}

export function spawnParticles(gridR, gridC, colorName, multiplier = 1) {
    const cellEl = getCellElement(gridR, gridC);
    if (!cellEl) return;

    const cellRect = cellEl.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    const startX = cellRect.left - canvasRect.left + cellRect.width / 2;
    const startY = cellRect.top - canvasRect.top + cellRect.height / 2;

    const count = Math.floor(15 * multiplier);
    for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
        particles.push(new Particle(startX, startY, colorName));
    }

    if (!isLoopRunning) {
        isLoopRunning = true;
        requestAnimationFrame(particleTick);
    }
}

// İstemci (viewport) koordinatlarına göre partikül patlaması (UI butonları vb. için)
export function spawnParticlesAtScreen(clientX, clientY, colorName) {
    if (!canvas || !ctx) return;
    const canvasRect = canvas.getBoundingClientRect();
    const x = clientX - canvasRect.left;
    const y = clientY - canvasRect.top;
    if (x < 0 || y < 0 || x > canvasRect.width || y > canvasRect.height) return;

    for (let i = 0; i < 25 && particles.length < MAX_PARTICLES; i++) {
        particles.push(new Particle(x, y, colorName));
    }
    if (!isLoopRunning) {
        isLoopRunning = true;
        requestAnimationFrame(particleTick);
    }
}

function particleTick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw(ctx);

        if (p.alpha <= 0) {
            particles.splice(i, 1);
        }
    }

    if (particles.length > 0) {
        requestAnimationFrame(particleTick);
    } else {
        isLoopRunning = false;
    }
}

window.addEventListener('resize', resizeCanvas);
