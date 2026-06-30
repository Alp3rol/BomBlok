import { COLOR_MAP } from './config.js';
import { gridBoard } from './state.js';

// --- CANVAS-BASED NEON PARTICLE SYSTEM ---
const canvas = document.getElementById('effects-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
let isLoopRunning = false;

class Particle {
    constructor(x, y, colorName) {
        this.x = x;
        this.y = y;
        const isWood = document.body.classList.contains('theme-wood');
        const isCandy = document.body.classList.contains('theme-candy');
        const isNeon = document.body.classList.contains('theme-neon');
        const isRetro = document.body.classList.contains('theme-retro');
        const isCosmos = document.body.classList.contains('theme-cosmos');
        
        let baseColor = COLOR_MAP[colorName] || '#ff007f';

        if (isWood) {
            this.type = 'wood-splinter';
            const woodColors = ['#8d6e63', '#6d4c41', '#5d4037', '#795548', '#a1887f'];
            this.color = woodColors[Math.floor(Math.random() * woodColors.length)];
            this.radius = 4.0 + Math.random() * 6.0;
            this.gravity = 0.15 + Math.random() * 0.15;
        } else if (isCandy) {
            this.type = Math.random() < 0.5 ? 'confetti' : 'circle';
            this.color = baseColor;
            this.radius = 4.0 + Math.random() * 5.0;
            this.gravity = 0.08 + Math.random() * 0.1;
        } else if (isNeon) {
            this.type = 'glitch';
            const neonColors = [baseColor, '#00ffff', '#ff00ff', '#ffffff'];
            this.color = neonColors[Math.floor(Math.random() * neonColors.length)];
            this.radius = 1.0 + Math.random() * 3.0;
            this.gravity = 0.02 + Math.random() * 0.05;
        } else if (isRetro) {
            this.type = 'pixel';
            this.color = baseColor;
            this.radius = 4.0 + Math.random() * 4.0;
            this.gravity = 0.1 + Math.random() * 0.1;
        } else if (isCosmos) {
            this.type = 'stardust';
            const cosmosColors = [baseColor, '#8a2be2', '#00ffff', '#ffffff'];
            this.color = cosmosColors[Math.floor(Math.random() * cosmosColors.length)];
            this.radius = 1.0 + Math.random() * 2.0;
            this.gravity = 0; // Float around
        } else {
            this.color = baseColor;
            this.type = Math.random() < 0.35 ? 'sparkle' : (Math.random() < 0.45 ? 'diamond' : 'circle');
            this.radius = 2.0 + Math.random() * 3.0;
            this.gravity = 0.05 + Math.random() * 0.05;
        }
        
        const angle = Math.random() * Math.PI * 2;
        const speed = 2.0 + Math.random() * 5.0;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.alpha = 1.0;
        this.decay = 0.015 + Math.random() * 0.015;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.3;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity; // Apply gravity
        this.vx *= 0.94; // Friction
        this.vy *= 0.94;
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
            c.shadowBlur = 3;
            c.shadowColor = 'rgba(0,0,0,0.5)';
            c.fillRect(-this.radius, -this.radius * 0.25, this.radius * 2, this.radius * 0.5);
            c.strokeStyle = 'rgba(0,0,0,0.4)';
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(-this.radius * 0.8, 0);
            c.lineTo(this.radius * 0.8, 0);
            c.stroke();
        } else if (this.type === 'confetti') {
            c.shadowBlur = 5;
            c.shadowColor = this.color;
            c.fillRect(-this.radius, -this.radius*0.5, this.radius*2, this.radius);
        } else if (this.type === 'pixel') {
            c.shadowBlur = 0;
            c.rotate(-this.rotation); // Undo rotation to keep squares axis-aligned
            c.fillRect(-this.radius, -this.radius, this.radius*2, this.radius*2);
        } else if (this.type === 'glitch') {
            c.shadowBlur = 10;
            c.shadowColor = this.color;
            c.globalCompositeOperation = 'screen';
            c.fillRect(-this.radius*2, -this.radius*0.2, this.radius*4, this.radius*0.4);
        } else if (this.type === 'stardust') {
            c.shadowBlur = 15;
            c.shadowColor = this.color;
            c.beginPath();
            c.arc(0, 0, this.radius, 0, Math.PI * 2);
            c.fill();
        } else {
            c.shadowBlur = 10;
            c.shadowColor = this.color;
            if (this.type === 'sparkle') {
                // Draw a beautiful 4-point magic sparkle star
                c.beginPath();
                for (let i = 0; i < 4; i++) {
                    c.lineTo(this.radius * 2.2, 0);
                    c.lineTo(this.radius * 0.4, this.radius * 0.4);
                    c.rotate(Math.PI / 2);
                }
                c.closePath();
                c.fill();
            } else if (this.type === 'diamond') {
            // Draw a shiny diamond
            c.beginPath();
            c.moveTo(0, -this.radius * 1.4);
            c.lineTo(this.radius * 1.4, 0);
            c.lineTo(0, this.radius * 1.4);
            c.lineTo(-this.radius * 1.4, 0);
            c.closePath();
            c.fill();
        } else {
            // Draw a neon sphere
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

export function spawnParticles(gridR, gridC, colorName) {
    const cellEl = gridBoard.querySelector(`.grid-cell[data-row="${gridR}"][data-col="${gridC}"]`);
    if (!cellEl) return;

    const cellRect = cellEl.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    const startX = cellRect.left - canvasRect.left + cellRect.width / 2;
    const startY = cellRect.top - canvasRect.top + cellRect.height / 2;

    // Spawn 15 particles per cell
    for (let i = 0; i < 15; i++) {
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

    for (let i = 0; i < 25; i++) {
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
