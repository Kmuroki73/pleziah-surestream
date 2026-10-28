import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Check, RotateCcw, Volume2, VolumeX, Trophy, Target, Zap, Users, Share2, ChevronRight } from 'lucide-react';
import {
  type GameState, type GameMode, type ShotZone, type GameConfig,
  TEAMS, GAME_VERSION, createGameConfig, createGameState, takeShot, advanceState,
  generateChallengeCode, decodeChallengeCode,
} from '@/game/engine';
import { createInitialRenderState, updateRenderState, resetRenderState, renderGame } from '@/game/render';
import { playSound, startCrowdAmbient, stopCrowdAmbient, playOutcomeSound, setMuted, isMuted } from '@/game/sound';
import { getBestScores, saveBestScore, getMuted, setMutedState, incrementGamesPlayed } from '@/game/storage';

type Screen = 'menu' | 'tutorial' | 'playing' | 'finished';

export default function PenaltyRush() {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();

  const [screen, setScreen] = useState<Screen>('menu');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedTeam, setSelectedTeam] = useState(TEAMS[0].id);
  const [mode, setMode] = useState<GameMode>('classic');
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [aimZone, setAimZone] = useState<ShotZone | null>(null);
  const [power, setPower] = useState(0);
  const [powerCharging, setPowerCharging] = useState(false);
  const [muted, setMutedState] = useState(getMuted());
  const [bestScores, setBestScores] = useState(getBestScores());
  const [challengeCode, setChallengeCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const renderStateRef = useRef(createInitialRenderState());
  const aimZoneRef = useRef<ShotZone | null>(null);
  const powerRef = useRef(0);
  const powerChargingRef = useRef(false);
  const powerIntervalRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (muted) {
      setMuted(true);
    } else {
      setMuted(false);
      startCrowdAmbient();
    }
    return () => stopCrowdAmbient();
  }, [muted]);

  useEffect(() => {
    if (code) {
      const config = decodeChallengeCode(code);
      if (config) {
        setSelectedTeam(config.teamId);
        setMode(config.mode);
        setDifficulty(config.difficulty);
        startGame(config);
      } else {
        setScreen('menu');
      }
    }
  }, []);

  const startGame = useCallback((config?: GameConfig) => {
    const gameConfig = config ?? createGameConfig(mode, selectedTeam, difficulty);
    const gs = createGameState(gameConfig);
    stateRef.current = gs;
    setGameState(gs);
    renderStateRef.current = resetRenderState(renderStateRef.current);
    setAimZone(null);
    aimZoneRef.current = null;
    setPower(0);
    powerRef.current = 0;
    setScreen('playing');
    setShowTutorial(!localStorage.getItem('surestream_tutorial_seen'));
    if (!muted) {
      playSound('whistle');
      startCrowdAmbient();
    }
  }, [mode, selectedTeam, difficulty, muted]);

  const handleShoot = useCallback(() => {
    const zone = aimZoneRef.current;
    if (!zone || !stateRef.current || stateRef.current.status !== 'aiming') return;

    const p = powerRef.current;
    if (p < 0.2) return;

    const { newState } = takeShot(stateRef.current, zone, p);
    stateRef.current = newState;
    setGameState(newState);

    if (!muted) playSound('kick');

    setAimZone(null);
    aimZoneRef.current = null;
    setPower(0);
    powerRef.current = 0;
    setPowerCharging(false);
    powerChargingRef.current = false;

    setTimeout(() => {
      if (stateRef.current) {
        const advanced = advanceState(stateRef.current);
        stateRef.current = advanced;
        setGameState(advanced);
        if (advanced.currentResult && !muted) {
          playOutcomeSound(advanced.currentResult.outcome);
        }
        setTimeout(() => {
          if (stateRef.current) {
            const next = advanceState(stateRef.current);
            stateRef.current = next;
            setGameState(next);
            if (next.status === 'finished') {
              const scores = saveBestScore(next.mode, next.score);
              setBestScores(scores);
              incrementGamesPlayed();
              const cfg = createGameConfig(next.mode, next.teamId, next.difficulty);
              setChallengeCode(generateChallengeCode({ ...cfg, seed: next.seed }));
              setScreen('finished');
              stopCrowdAmbient();
            }
          }
        }, 1200);
      }
    }, 700);
  }, [muted]);

  const startPowerCharge = useCallback(() => {
    if (stateRef.current?.status !== 'aiming') return;
    if (powerChargingRef.current) return;
    if (!aimZoneRef.current) return;
    setPowerCharging(true);
    powerChargingRef.current = true;
    let dir = 1;
    if (powerIntervalRef.current) clearInterval(powerIntervalRef.current);
    powerIntervalRef.current = window.setInterval(() => {
      powerRef.current += dir * 0.06;
      if (powerRef.current >= 1) { powerRef.current = 1; dir = -1; }
      if (powerRef.current <= 0.2) { powerRef.current = 0.2; dir = 1; }
      setPower(powerRef.current);
    }, 30);
  }, []);

  const releasePower = useCallback(() => {
    if (!powerChargingRef.current) return;
    if (powerIntervalRef.current) {
      clearInterval(powerIntervalRef.current);
      powerIntervalRef.current = null;
    }
    setPowerCharging(false);
    powerChargingRef.current = false;
    handleShoot();
  }, [handleShoot]);

  const selectZone = useCallback((zone: ShotZone) => {
    if (stateRef.current?.status !== 'aiming') return;
    setAimZone(zone);
    aimZoneRef.current = zone;
  }, []);

  useEffect(() => {
    if (screen !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05) || 0.016;
      lastTimeRef.current = time;

      const gs = stateRef.current;
      if (gs && gs.currentResult) {
        renderStateRef.current = updateRenderState(renderStateRef.current, gs, gs.currentResult, dt);
      }

      const rect = canvas.getBoundingClientRect();
      renderGame(ctx, rect.width, rect.height, gs ?? stateRef.current ?? createGameState(createGameConfig('classic', 'arsenal')), renderStateRef.current, aimZoneRef.current, powerRef.current, reducedMotionRef.current);
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [screen, power]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (screen !== 'playing') return;
      const gs = stateRef.current;
      if (!gs || gs.status !== 'aiming') return;

      const zoneMap: Record<string, ShotZone> = {
        '7': 'top-left', '8': 'top-center', '9': 'top-right',
        '4': 'bottom-left', '5': 'bottom-center', '6': 'bottom-right',
        'q': 'top-left', 'w': 'top-center', 'e': 'top-right',
        'a': 'bottom-left', 's': 'bottom-center', 'd': 'bottom-right',
        'ArrowUp': 'top-center', 'ArrowDown': 'bottom-center',
        'ArrowLeft': 'bottom-left', 'ArrowRight': 'bottom-right',
      };
      const key = e.key;
      if (zoneMap[key]) {
        e.preventDefault();
        selectZone(zoneMap[key]);
      } else if (key === ' ' || key === 'Enter') {
        e.preventDefault();
        if (powerChargingRef.current) {
          releasePower();
        } else if (aimZoneRef.current) {
          startPowerCharge();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [screen, selectZone, startPowerCharge, releasePower]);

  const toggleMute = () => {
    const newMuted = !muted;
    setMutedState(newMuted);
    setMuted(newMuted);
    setMutedState(newMuted);
  };

  const copyChallengeCode = () => {
    const fullCode = challengeCode;
    navigator.clipboard.writeText(fullCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = fullCode;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
      document.body.removeChild(ta);
    });
  };

  const shareUrl = `${window.location.origin}/penalty-rush/challenge/${challengeCode}`;

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SURESTREAM Penalty Rush',
          text: `I scored ${gameState?.score} in Penalty Rush! Can you beat me?`,
          url: shareUrl,
        });
      } catch { /* user cancelled */ }
    } else {
      copyChallengeCode();
    }
  };

  const dismissTutorial = () => {
    setShowTutorial(false);
    try { localStorage.setItem('surestream_tutorial_seen', 'true'); } catch { /* ignore */ }
  };

  const team = TEAMS.find((t) => t.id === selectedTeam) ?? TEAMS[0];
  const bestForMode = mode === 'classic' ? bestScores.classic : bestScores.arcade;

  if (screen === 'menu' && !code) {
    return (
      <div className="pr-page">
        <div className="pr-topbar">
          <button className="pr-back" onClick={() => navigate('/')}><ArrowLeft size={18} /> Back</button>
          <div className="pr-logo"><Trophy size={18} /> PENALTY RUSH</div>
          <button className="pr-back" onClick={toggleMute}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        </div>

        <div className="pr-menu">
          <div className="pr-menu-hero">
            <span className="eyebrow lime-text">SURESTREAM · GAME TIME</span>
            <h1>Penalty Rush</h1>
            <p>Take your shots. Beat the keeper. Challenge your friends.</p>
          </div>

          <div className="pr-section">
            <div className="pr-section-label"><Users size={14} /> Pick your team</div>
            <div className="pr-team-grid">
              {TEAMS.map((t) => (
                <button
                  key={t.id}
                  className={`pr-team-card ${selectedTeam === t.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTeam(t.id)}
                >
                  <span className="pr-team-crest" style={{ background: t.primary, color: t.secondary }}>{t.shortName}</span>
                  <div>
                    <strong>{t.name}</strong>
                    <span>{t.nickname}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="pr-section">
            <div className="pr-section-label"><Target size={14} /> Choose your mode</div>
            <div className="pr-mode-grid">
              <button className={`pr-mode-card ${mode === 'classic' ? 'selected' : ''}`} onClick={() => setMode('classic')}>
                <Trophy size={20} />
                <strong>Classic Shootout</strong>
                <span>5 shots. Score as many as you can.</span>
              </button>
              <button className={`pr-mode-card ${mode === 'arcade' ? 'selected' : ''}`} onClick={() => setMode('arcade')}>
                <Zap size={20} />
                <strong>Streak Arcade</strong>
                <span>Endless shots. How long can you last?</span>
              </button>
            </div>
          </div>

          <div className="pr-section">
            <div className="pr-section-label"><Zap size={14} /> Difficulty</div>
            <div className="pr-difficulty-row">
              {(['easy', 'normal', 'hard'] as const).map((d) => (
                <button key={d} className={`pr-diff-btn ${difficulty === d ? 'selected' : ''}`} onClick={() => setDifficulty(d)}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {bestForMode > 0 && (
            <div className="pr-best-score">
              <Trophy size={16} /> Your best ({mode}): <strong>{bestForMode}</strong>
            </div>
          )}

          <button className="lime-button pr-play-btn" onClick={() => startGame()}>
            <Zap size={18} fill="currentColor" /> Play Now
          </button>
          <p className="pr-hint">No login required. Your best score saves on this device.</p>
        </div>
      </div>
    );
  }

  if (screen === 'finished') {
    const gs = gameState!;
    const finalScore = gs.score;
    return (
      <div className="pr-page">
        <div className="pr-topbar">
          <button className="pr-back" onClick={() => navigate('/')}><ArrowLeft size={18} /> Back</button>
          <div className="pr-logo"><Trophy size={18} /> PENALTY RUSH</div>
          <button className="pr-back" onClick={toggleMute}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        </div>

        <div className="pr-result">
          <div className="pr-result-banner">
            {finalScore >= 4 ? 'SUPERB!' : finalScore >= 3 ? 'WELL DONE!' : finalScore >= 1 ? 'GOOD EFFORT' : 'TOUGH LUCK'}
          </div>
          <div className="pr-result-team">
            <span className="pr-team-crest" style={{ background: team.primary, color: team.secondary }}>{team.shortName}</span>
            {team.name} · {mode === 'classic' ? 'Classic' : 'Arcade'}
          </div>
          <div className="pr-result-score">
            <div className="pr-score-block">
              <strong>{finalScore}</strong>
              <span>Goals</span>
            </div>
            <div className="pr-score-block">
              <strong>{gs.bestStreak}</strong>
              <span>Best streak</span>
            </div>
            <div className="pr-score-block">
              <strong>{gs.saves}</strong>
              <span>Saves</span>
            </div>
          </div>

          {(mode === 'classic' && bestForMode > 0 && finalScore >= bestForMode) && (
            <div className="pr-new-best"><Trophy size={16} /> New personal best!</div>
          )}

          <div className="pr-challenge-section">
            <div className="pr-section-label"><Share2 size={14} /> Challenge a friend</div>
            <div className="pr-challenge-code">
              <code>{challengeCode}</code>
              <button onClick={copyChallengeCode} className="pr-copy-btn">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="pr-share-buttons">
              <button onClick={nativeShare} className="pr-share-btn primary"><Share2 size={15} /> Share</button>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="pr-share-btn">Facebook</a>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I scored ${finalScore} in SURESTREAM Penalty Rush! Can you beat me?`)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="pr-share-btn">X</a>
              <a href={`https://wa.me/?text=${encodeURIComponent(`I scored ${finalScore} in SURESTREAM Penalty Rush! Challenge me: ${shareUrl}`)}`} target="_blank" rel="noopener noreferrer" className="pr-share-btn">WhatsApp</a>
            </div>
          </div>

          <div className="pr-result-actions">
            <button className="lime-button" onClick={() => startGame()}>
              <RotateCcw size={16} /> Play again
            </button>
            <button className="ghost-button" onClick={() => setScreen('menu')}>
              <ChevronRight size={16} /> Main menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pr-page pr-playing-page">
      <div className="pr-topbar">
        <button className="pr-back" onClick={() => { stopCrowdAmbient(); navigate('/'); }}><ArrowLeft size={18} /> Exit</button>
        <div className="pr-hud">
          {gameState && (
            <>
              <div className="pr-hud-item"><Trophy size={13} /> <strong>{gameState.score}</strong></div>
              <div className="pr-hud-item"><Zap size={13} /> <strong>{gameState.streak}</strong> streak</div>
              {mode === 'classic' && (
                <div className="pr-hud-item"><Target size={13} /> {gameState.shotsTaken}/{gameState.maxShots} shots</div>
              )}
              {mode === 'arcade' && (
                <div className="pr-hud-item"><Target size={13} /> Lv {gameState.level}</div>
              )}
              <div className="pr-hud-team" style={{ background: team.primary, color: team.secondary }}>{team.shortName}</div>
            </>
          )}
        </div>
        <button className="pr-back" onClick={toggleMute}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
      </div>

      <div className="pr-canvas-wrap">
        <canvas ref={canvasRef} className="pr-canvas" />

        {gameState?.status === 'aiming' && (
          <div className="pr-controls-overlay">
            <div className="pr-zone-grid">
              {([
                ['top-left', 'top-center', 'top-right'],
                ['bottom-left', 'bottom-center', 'bottom-right'],
              ] as const).map((row, ri) => (
                <div key={ri} className="pr-zone-row">
                  {row.map((zone) => (
                    <button
                      key={zone}
                      className={`pr-zone-btn ${aimZone === zone ? 'selected' : ''}`}
                      onClick={() => selectZone(zone)}
                      aria-label={`Aim ${zone.replace('-', ' ')}`}
                    >
                      {aimZone === zone && <span className="pr-zone-dot" />}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {aimZone && (
              <button
                className={`pr-power-btn ${powerCharging ? 'charging' : ''}`}
                onMouseDown={startPowerCharge}
                onMouseUp={releasePower}
                onMouseLeave={() => powerChargingRef.current && releasePower()}
                onTouchStart={(e) => { e.preventDefault(); startPowerCharge(); }}
                onTouchEnd={(e) => { e.preventDefault(); releasePower(); }}
              >
                {powerCharging ? 'Release to shoot!' : 'Hold to charge power'}
              </button>
            )}

            <div className="pr-control-hint">
              Tap a zone to aim, then hold the button to charge power. Keyboard: QWE/ASD or arrows + Space.
            </div>
          </div>
        )}

        {showTutorial && gameState?.status === 'aiming' && (
          <div className="pr-tutorial">
            <div className="pr-tutorial-content">
              <h3>How to play</h3>
              <ol>
                <li>Tap a zone in the goal to aim.</li>
                <li>Hold the power button to charge — release at the right moment.</li>
                <li>More power means a harder shot, but less accuracy.</li>
                <li>The keeper gets faster every level. Beat the streak!</li>
              </ol>
              <button className="lime-button" onClick={dismissTutorial}>Got it</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
