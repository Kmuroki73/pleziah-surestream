import type { GameState, ShotResult, ShotOutcome } from './engine';
import { TEAMS } from './engine';

interface RenderState {
  ballX: number;
  ballY: number;
  ballZ: number;
  keeperX: number;
  keeperY: number;
  shotProgress: number;
  netRipple: number;
  outcome: ShotOutcome | null;
  ballTrail: { x: number; y: number; z: number }[];
}

export function createInitialRenderState(): RenderState {
  return {
    ballX: 0,
    ballY: 0.45,
    ballZ: 0,
    keeperX: 0,
    keeperY: -0.1,
    shotProgress: 0,
    netRipple: 0,
    outcome: null,
    ballTrail: [],
  };
}

export function resetRenderState(rs: RenderState): RenderState {
  return { ...createInitialRenderState(), keeperX: rs.keeperX, keeperY: rs.keeperY };
}

export function updateRenderState(rs: RenderState, state: GameState, result: ShotResult | null, dt: number): RenderState {
  if (!result || state.status === 'aiming') {
    return { ...rs, shotProgress: 0, ballTrail: [], netRipple: 0, outcome: null, ballX: 0, ballY: 0.45, ballZ: 0 };
  }

  if (state.status === 'shooting') {
    const speed = 1 + result.power * 1.5;
    const newProgress = Math.min(rs.shotProgress + dt * speed, 1);
    const targetX = result.ballX;
    const targetY = result.ballY;
    const startX = 0;
    const startY = 0.45;

    const t = newProgress;
    const ballX = startX + (targetX - startX) * t;
    const ballY = startY + (targetY - startY) * t;
    const arcHeight = 0.25 * Math.sin(Math.PI * t);
    const ballZ = arcHeight;

    const trail = [...rs.ballTrail, { x: ballX, y: ballY, z: ballZ }].slice(-12);

    let keeperX = rs.keeperX;
    let keeperY = rs.keeperY;
    if (t < 0.7) {
      const kTargetX = result.keeperX;
      const kTargetY = result.keeperY;
      keeperX += (kTargetX - keeperX) * dt * 4;
      keeperY += (kTargetY - keeperY) * dt * 4;
    }

    return { ...rs, shotProgress: newProgress, ballX, ballY, ballZ, ballTrail: trail, keeperX, keeperY };
  }

  if (state.status === 'result') {
    const netRipple = Math.max(0, rs.netRipple - dt * 2);
    return { ...rs, netRipple, outcome: result.outcome };
  }

  return rs;
}

function project(x: number, y: number, z: number, w: number, h: number): { px: number; py: number; scale: number } {
  const horizonY = h * 0.28;
  const groundY = h * 0.82;
  const depthFactor = Math.max(0, 1 - z * 0.3);
  const perspectiveY = groundY + (y + 0.5) * (groundY - horizonY) * 0.3;
  const py = horizonY + (perspectiveY - horizonY) * (1 + z * 0.5);
  const px = w / 2 + x * w * 0.4 * (1 + z * 0.3);
  const scale = 0.3 + z * 0.7;
  return { px, py, scale };
}

function projectGoal(x: number, y: number, w: number, h: number): { px: number; py: number } {
  const goalCenterY = h * 0.38;
  const px = w / 2 + x * w * 0.32;
  const py = goalCenterY + y * h * 0.18;
  return { px, py };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function renderGame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: GameState,
  rs: RenderState,
  aimZone: string | null,
  power: number,
  reducedMotion: boolean
) {
  ctx.clearRect(0, 0, w, h);

  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.35);
  skyGrad.addColorStop(0, '#050807');
  skyGrad.addColorStop(0.5, '#0a100d');
  skyGrad.addColorStop(1, '#0d140f');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h * 0.32);

  drawStadiumLights(ctx, w, h);
  drawCrowd(ctx, w, h, reducedMotion);

  const pitchGrad = ctx.createLinearGradient(0, h * 0.3, 0, h);
  pitchGrad.addColorStop(0, '#0f4a16');
  pitchGrad.addColorStop(0.4, '#0e3c14');
  pitchGrad.addColorStop(1, '#0a2a0d');
  ctx.fillStyle = pitchGrad;
  ctx.fillRect(0, h * 0.3, w, h * 0.7);

  drawPitchLines(ctx, w, h);
  drawPenaltySpot(ctx, w, h);

  const team = TEAMS.find((t) => t.id === state.teamId) ?? TEAMS[0];
  drawGoal(ctx, w, h, rs.netRipple, rs.outcome);
  drawKeeper(ctx, w, h, rs.keeperX, rs.keeperY, team.secondary);

  if (state.status === 'aiming' && aimZone) {
    drawAimReticle(ctx, w, h, aimZone);
  }
  if (state.status === 'aiming') {
    drawPowerMeter(ctx, w, h, power);
  }

  drawBall(ctx, w, h, rs.ballX, rs.ballY, rs.ballZ);
  drawBallTrail(ctx, w, h, rs.ballTrail);

  if (state.status === 'result' && rs.outcome) {
    drawOutcomeBanner(ctx, w, h, rs.outcome, reducedMotion);
  }
}

function drawStadiumLights(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const lights = [
    { x: w * 0.15, y: h * 0.04 },
    { x: w * 0.5, y: h * 0.02 },
    { x: w * 0.85, y: h * 0.04 },
  ];
  for (const l of lights) {
    const grad = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, h * 0.25);
    grad.addColorStop(0, 'rgba(220,255,200,0.25)');
    grad.addColorStop(0.5, 'rgba(180,220,160,0.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(l.x - h * 0.25, l.y, h * 0.5, h * 0.35);

    ctx.fillStyle = '#2a3528';
    ctx.fillRect(l.x - 2, 0, 4, h * 0.06);
    ctx.fillStyle = '#dfff7d';
    ctx.fillRect(l.x - 8, h * 0.04, 16, 4);
  }
}

function drawCrowd(ctx: CanvasRenderingContext2D, w: number, h: number, reducedMotion: boolean) {
  const crowdY = h * 0.26;
  ctx.fillStyle = 'rgba(8,12,8,0.7)';
  ctx.fillRect(0, crowdY - h * 0.06, w, h * 0.06);

  ctx.fillStyle = 'rgba(18,26,18,0.8)';
  for (let x = 0; x < w; x += 6) {
    const noise = Math.sin(x * 0.05) * 2 + Math.sin(x * 0.13) * 1.5;
    ctx.fillRect(x, crowdY - 4 + noise, 3, 5);
  }

  const dotColors = ['#c6ff2e', '#2a3a25', '#1a2418', '#3a4a2a'];
  for (let x = 0; x < w; x += 8) {
    const c = dotColors[(x / 8) % dotColors.length | 0];
    ctx.fillStyle = c;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(x, crowdY - 2 + Math.sin(x * 0.1) * 2, 2, 2);
    ctx.globalAlpha = 1;
  }

  if (!reducedMotion) {
    for (let i = 0; i < 5; i++) {
      const x = (Date.now() / 30 + i * 137) % w;
      ctx.fillStyle = 'rgba(198,255,46,0.15)';
      ctx.fillRect(x, crowdY - 3, 3, 3);
    }
  }
}

function drawPitchLines(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1.5;

  const goalLineY = h * 0.38;
  const horizonY = h * 0.3;

  ctx.beginPath();
  ctx.moveTo(0, goalLineY);
  ctx.lineTo(w, goalLineY);
  ctx.stroke();

  const boxLeft1 = w * 0.2, boxRight1 = w * 0.8, boxTopY = h * 0.34;
  ctx.beginPath();
  ctx.moveTo(boxLeft1, goalLineY);
  ctx.lineTo(boxLeft1, boxTopY);
  ctx.lineTo(boxRight1, boxTopY);
  ctx.lineTo(boxRight1, goalLineY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(w * 0.35, goalLineY);
  ctx.lineTo(w * 0.65, goalLineY);
  ctx.lineTo(w * 0.58, h * 0.3);
  ctx.moveTo(w * 0.35, goalLineY);
  ctx.lineTo(w * 0.42, h * 0.3);
  ctx.stroke();
}

function drawPenaltySpot(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const spotY = h * 0.68;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(w / 2, spotY, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawGoal(ctx: CanvasRenderingContext2D, w: number, h: number, ripple: number, outcome: string | null) {
  const goalY = h * 0.38;
  const goalLeft = w * 0.32;
  const goalRight = w * 0.68;
  const goalTop = h * 0.18;

  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(goalLeft, goalY);
  ctx.lineTo(goalLeft, goalTop);
  ctx.lineTo(goalRight, goalTop);
  ctx.lineTo(goalRight, goalY);
  ctx.stroke();

  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(w / 2, goalTop);
  ctx.lineTo(w / 2, goalY);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 8; i++) {
    const x = goalLeft + ((goalRight - goalLeft) * i) / 8;
    ctx.beginPath();
    ctx.moveTo(x, goalTop);
    ctx.lineTo(x, goalY);
    ctx.stroke();
  }
  for (let i = 1; i < 4; i++) {
    const y = goalTop + ((goalY - goalTop) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(goalLeft, y);
    ctx.lineTo(goalRight, y);
    ctx.stroke();
  }

  if (ripple > 0) {
    const intensity = ripple;
    const color = outcome === 'goal' ? '198,255,46' : outcome === 'save' ? '255,180,60' : '255,100,100';
    ctx.strokeStyle = `rgba(${color},${intensity * 0.6})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const x = goalLeft + ((goalRight - goalLeft) * i) / 10;
      const offset = Math.sin(i * 1.5 + ripple * 10) * 6 * intensity;
      if (i === 0) ctx.moveTo(x, goalTop + offset);
      else ctx.lineTo(x, goalTop + offset);
    }
    for (let i = 10; i >= 0; i--) {
      const x = goalLeft + ((goalRight - goalLeft) * i) / 10;
      const offset = Math.sin(i * 1.5 + ripple * 10 + Math.PI) * 6 * intensity;
      ctx.lineTo(x, goalY + offset);
    }
    ctx.stroke();
  }
}

function drawKeeper(ctx: CanvasRenderingContext2D, w: number, h: number, kx: number, ky: number, color: string) {
  const goalY = h * 0.38;
  const px = w / 2 + kx * w * 0.16;
  const py = goalY - 8 + ky * h * 0.05;
  const bodyW = 26;
  const bodyH = 40;

  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.5;

  roundRect(ctx, px - bodyW / 2, py - bodyH, bodyW, bodyH, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#d8c8a0';
  ctx.beginPath();
  ctx.arc(px, py - bodyH - 2, 9, 0, Math.PI * 2);
  ctx.fill();

  const diving = Math.abs(kx) > 0.05;
  if (diving) {
    const dir = Math.sign(kx);
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    roundRect(ctx, px + dir * 18, py - bodyH + 10, 28, 10, 4);
    ctx.fill();
    ctx.stroke();
    roundRect(ctx, px - dir * 28, py - bodyH + 10, 28, 10, 4);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    roundRect(ctx, px - 22, py - bodyH + 10, 16, 22, 4);
    ctx.fill();
    ctx.stroke();
    roundRect(ctx, px + 6, py - bodyH + 10, 16, 22, 4);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(px, py + 2, bodyW / 2 + 4, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawAimReticle(ctx: CanvasRenderingContext2D, w: number, h: number, zone: string) {
  const zoneCoords: Record<string, { x: number; y: number }> = {
    'top-left': { x: -0.28, y: -0.32 },
    'top-center': { x: 0, y: -0.34 },
    'top-right': { x: 0.28, y: -0.32 },
    'bottom-left': { x: -0.3, y: -0.05 },
    'bottom-center': { x: 0, y: -0.03 },
    'bottom-right': { x: 0.3, y: -0.05 },
  };
  const c = zoneCoords[zone];
  if (!c) return;
  const px = w / 2 + c.x * w * 0.32;
  const py = h * 0.38 + c.y * h * 0.18;

  ctx.strokeStyle = '#c6ff2e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px, py, 14, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(198,255,46,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px - 22, py);
  ctx.lineTo(px + 22, py);
  ctx.moveTo(px, py - 22);
  ctx.lineTo(px, py + 22);
  ctx.stroke();
}

function drawPowerMeter(ctx: CanvasRenderingContext2D, w: number, h: number, power: number) {
  const meterW = w * 0.4;
  const meterH = 8;
  const x = (w - meterW) / 2;
  const y = h - 28;

  ctx.fillStyle = 'rgba(15,20,14,0.8)';
  roundRect(ctx, x - 2, y - 2, meterW + 4, meterH + 4, 4);
  ctx.fill();

  const fillW = meterW * Math.max(power, 0);
  const grad = ctx.createLinearGradient(x, y, x + meterW, y);
  grad.addColorStop(0, '#c6ff2e');
  grad.addColorStop(0.5, '#f6a440');
  grad.addColorStop(1, '#ff4444');
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, fillW, meterH, 3);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(x + meterW * 0.92, y - 2, 1, meterH + 4);
}

function drawBall(ctx: CanvasRenderingContext2D, w: number, h: number, bx: number, by: number, bz: number) {
  const proj = project(bx, by, bz, w, h);
  const r = Math.max(4, 11 * proj.scale);

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(proj.px, h * 0.82 + 2, r * 0.7, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  const grad = ctx.createRadialGradient(proj.px - r * 0.3, proj.py - r * 0.3, 0, proj.px, proj.py, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.7, '#e8e8e8');
  grad.addColorStop(1, '#b0b0b0');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(proj.px, proj.py, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(proj.px - r * 0.15, proj.py - r * 0.1, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(proj.px + r * 0.25, proj.py + r * 0.15, r * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(proj.px + r * 0.1, proj.py - r * 0.35, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawBallTrail(ctx: CanvasRenderingContext2D, w: number, h: number, trail: { x: number; y: number; z: number }[]) {
  if (trail.length < 2) return;
  for (let i = 0; i < trail.length - 1; i++) {
    const t = i / trail.length;
    const p1 = project(trail[i].x, trail[i].y, trail[i].z, w, h);
    const p2 = project(trail[i + 1].x, trail[i + 1].y, trail[i + 1].z, w, h);
    ctx.strokeStyle = `rgba(198,255,46,${t * 0.4})`;
    ctx.lineWidth = Math.max(1, 4 * t * p1.scale);
    ctx.beginPath();
    ctx.moveTo(p1.px, p1.py);
    ctx.lineTo(p2.px, p2.py);
    ctx.stroke();
  }
}

function drawOutcomeBanner(ctx: CanvasRenderingContext2D, w: number, h: number, outcome: string, reducedMotion: boolean) {
  const text = outcome === 'goal' ? 'GOAL!' : outcome === 'save' ? 'SAVED!' : outcome === 'miss' ? 'MISS!' : 'OFF THE POST!';
  const color = outcome === 'goal' ? '#c6ff2e' : outcome === 'save' ? '#f6a440' : outcome === 'miss' ? '#ff6060' : '#ffaa44';

  const fontSize = reducedMotion ? 32 : 36 + Math.sin(Date.now() / 100) * 2;
  ctx.font = `800 ${fontSize}px Manrope, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = 'rgba(8,12,8,0.6)';
  ctx.fillText(text, w / 2 + 2, h * 0.52 + 2);

  ctx.fillStyle = color;
  ctx.fillText(text, w / 2, h * 0.52);

  if (outcome === 'goal' && !reducedMotion) {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + Date.now() / 200;
      const dist = 30 + Math.sin(Date.now() / 150 + i) * 10;
      const px = w / 2 + Math.cos(angle) * dist;
      const py = h * 0.52 + Math.sin(angle) * dist;
      ctx.fillStyle = `rgba(198,255,46,${0.4 + Math.sin(Date.now() / 100 + i) * 0.3})`;
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }
  }
}
