import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, ChevronRight, Clock3, Crown, Eye, LockKeyhole, Play,
  Radio, Sparkles, Star, Trophy, Users, Video, Zap, Target, Share2,
  ShieldCheck, CalendarDays, Headphones, CircleHelp, MessageSquare,
} from 'lucide-react';

const heroImage = '/assets/beyond-limits-hero.jpg';
const matchImage = '/assets/matchday-banner.jpg';
const playerImage = '/assets/yamal-goalkeeper.png';

type Fixture = { id: number | string; home: string; away: string; homeNick: string; awayNick: string; competition: string; kickoff: string; status: 'live'|'upcoming'|'finished'; score: string; minute: string; stadium: string; homeCrest?: string|null; awayCrest?: string|null };


const competitions = [
  { name: 'Premier League', country: 'England', icon: Crown, active: true },
  { name: 'La Liga', country: 'Spain', icon: Trophy, active: true },
  { name: 'Champions League', country: 'Europe', icon: Star, active: false },
];

const pricingTiers = [
  { name: 'Free Stand', price: 'KES 0', features: ['Browse verified match data', 'View fixtures and results', 'Follow teams when available', 'Penalty Rush: coming soon'], cta: 'Current plan', current: true },
  { name: 'Standard Seat', price: 'KES 50', features: ['Reserve a match seat', 'Verified access only when authorized video is available', 'Penalty Rush: coming soon'], cta: 'Reserve seat', current: false },
  { name: 'VIP Section', price: 'KES 50', features: ['VIP capacity is limited', 'Priority fan features when available', 'Verified access when authorized stream is available'], cta: 'Choose VIP', current: false },
  { name: 'VVIP Section', price: 'KES 100', features: ['Limited premium tier', 'Premium fan features when available', 'Verified access when authorized stream is available'], cta: 'Choose VVIP', current: false },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [fixtureFilter, setFixtureFilter] = useState<'all' | 'live' | 'upcoming'>('all');
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [fixturesError, setFixturesError] = useState('');
  const [dataProvider, setDataProvider] = useState('');
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/matches');
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Football data is temporarily unavailable.');
        const rows: Fixture[] = (body.matches || []).map((m: any) => {
          const status: Fixture['status'] = ['IN_PLAY','INPLAY','INPROGRESS','IN_PROGRESS','PAUSED','LIVE','HALFTIME','1H','2H','ET','PENALTIES'].includes(String(m.status || '').toUpperCase()) ? 'live' : ['FINISHED','FT','AWARDED','CANCELLED','POSTPONED'].includes(String(m.status || '').toUpperCase()) ? 'finished' : 'upcoming';
          const time = new Date(m.kickoff);
          return { id: m.id, home: m.home, away: m.away, homeNick: m.homeShort || '', awayNick: m.awayShort || '', competition: m.competition, kickoff: time.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }), status, score: m.homeScore == null || m.awayScore == null ? '—' : `${m.homeScore} — ${m.awayScore}`, minute: m.minute ? `${m.minute}\'` : status === 'live' ? 'LIVE' : '', stadium: m.venue || 'Venue not supplied', homeCrest: m.homeCrest, awayCrest: m.awayCrest };
        });
        if (active) { setFixtures(rows); setFixturesError(''); setDataProvider(body.provider || 'configured football data provider'); }
      } catch (e) { if (active) setFixturesError(e instanceof Error ? e.message : 'Football data is temporarily unavailable.'); }
      finally { if (active) setFixturesLoading(false); }
    };
    load(); const timer = window.setInterval(load, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const featuredMatch = fixtures.find((f) => f.status === 'live') ?? fixtures.find((f) => f.status === 'upcoming') ?? fixtures[0];

  const filteredFixtures = fixtures.filter((f) => {
    if (fixtureFilter === 'all') return true;
    if (fixtureFilter === 'live') return f.status === 'live';
    return f.status === 'upcoming';
  });

  return (
    <>
      {/* CINEMATIC HERO — supplied Beyond Limits artwork */}
      <section className="hero-card hero-artwork" aria-label="SureStream Football Beyond Limits">
        <img src={heroImage} alt="Football Beyond Limits: Harry Kane, Lamine Yamal, Kylian Mbappé and Erling Haaland" />
        <div className="hero-artwork-shade" />
        <button className="hero-artwork-cta" onClick={() => {
          const live = fixtures.find(f => f.status === 'live');
          navigate(live ? `/watch/${live.id}` : '/matches');
        }}><Play size={15} fill="currentColor" /> {fixtures.some(f => f.status === 'live') ? 'WATCH LIVE NOW' : 'EXPLORE MATCHES'} <ArrowUpRight size={14}/></button>
      </section>

      {/* LIVE NOW / FEATURED MATCHES — real provider data only; no fabricated view counts */}
      <section className="live-match-rail" aria-label="Live and featured matches">
        <div className="live-rail-heading">
          <div><span className="live-rail-dot" /><h2>{fixtures.some(f => f.status === 'live') ? 'Live Now' : 'Featured Matches'}</h2><span>{fixtures.some(f => f.status === 'live') ? 'Follow the action as it happens' : 'Upcoming fixtures from the verified feed'}</span></div>
          <button onClick={() => navigate('/matches')}>View all <ArrowUpRight size={14}/></button>
        </div>
        <div className="live-rail-cards">
          {(fixtures.some(f => f.status === 'live') ? fixtures.filter(f => f.status === 'live') : fixtures.filter(f => f.status === 'upcoming')).slice(0,8).map(f => (
            <button className={`live-rail-card ${f.status !== 'live' ? 'upcoming' : ''}`} key={f.id} onClick={() => navigate(f.status === 'upcoming' ? `/match/${f.id}` : `/watch/${f.id}`)}>
              <div className="live-rail-card-top"><span>{f.competition}</span>{f.status === 'live' ? <><b><i/> LIVE</b><strong>{f.minute || 'LIVE'}</strong></> : <b>UP NEXT</b>}</div>
              <div className="live-rail-teams">
                <span className="live-rail-crest">{f.homeCrest ? <img src={f.homeCrest} alt="" loading="lazy" onError={e => {e.currentTarget.style.display='none';}}/> : f.home.slice(0,3).toUpperCase()}</span>
                <span className="live-rail-score">{f.status === 'upcoming' ? 'VS' : f.score}</span>
                <span className="live-rail-crest">{f.awayCrest ? <img src={f.awayCrest} alt="" loading="lazy" onError={e => {e.currentTarget.style.display='none';}}/> : f.away.slice(0,3).toUpperCase()}</span>
              </div>
              <div className="live-rail-teamnames"><span>{f.home}</span><span>{f.away}</span></div>
              <div className="live-rail-card-bottom"><span>{f.status === 'live' ? <><Eye size={13}/> Live score</> : <><Clock3 size={13}/> {f.kickoff}</>}</span><span>{f.status === 'live' ? 'Watch match' : 'Match details'} <ArrowUpRight size={12}/></span></div>
            </button>
          ))}
          {!fixturesLoading && fixtures.length === 0 && <p className="live-rail-empty">Verified match cards will appear when the football data feed is available.</p>}
        </div>
      </section>

      {/* MATCH STORIES — fixture-backed, never invented live scores */}
      <section className="stories-section" aria-label="Match stories">
        <div className="section-heading"><div><span className="eyebrow">THE MATCHDAY FEED</span><h2>Stories from the pitch</h2></div><button className="text-button" onClick={() => navigate('/matches')}>All matches <ChevronRight size={15}/></button></div>
        <div className="stories-rail">
          {fixtures.slice().sort((a,b) => Number(b.status === 'live')-Number(a.status === 'live')).slice(0,10).map((fx) => <button className={`story-card ${fx.status === 'live' ? 'is-live' : ''}`} key={fx.id} onClick={() => navigate(fx.status === 'upcoming' ? `/match/${fx.id}` : `/watch/${fx.id}`)} aria-label={`Open ${fx.home} versus ${fx.away}`}>
            <span className="story-ring"><span className="story-inner"><span className="story-team-mark">{fx.home.slice(0,2).toUpperCase()}</span><span className="story-vs">VS</span><span className="story-team-mark">{fx.away.slice(0,2).toUpperCase()}</span></span></span>
            <strong>{fx.home} <small>vs</small> {fx.away}</strong><span className="story-meta">{fx.status === 'live' ? <><i className="live-pulse"/> LIVE · {fx.minute || 'LIVE'} · {fx.score}</> : fx.status === 'finished' ? `FULL TIME · ${fx.score}` : fx.kickoff}</span><span className="story-watch">{fx.status === 'live' ? 'WATCH LIVE' : fx.status === 'upcoming' ? 'RESERVE SEAT' : 'MATCH DETAILS'} <ArrowUpRight size={12}/></span>
          </button>)}
          {!fixturesLoading && fixtures.length === 0 && <div className="story-empty">Match stories will appear when the football-data provider returns fixtures. No demo live scores are shown.</div>}
        </div>
      </section>

      {/* DATA STATUS BANNER */}
      <div className="data-banner">
        <span className="data-banner-icon"><CircleHelp size={14} /></span>
        <span>{fixturesLoading ? 'Connecting to the football data feed…' : fixturesError ? `${fixturesError} Check SPORTSRC_API_KEY in Vercel and redeploy.` : `Verified feed: ${dataProvider || 'football data provider'} · refreshed automatically · ${fixtures.length} matches returned. Scores appear only when supplied by the provider.`}</span>
      </div>

      {/* FIXTURES */}
      <div className="section-heading">
        <div>
          <span className="eyebrow">FIXTURES &amp; RESULTS</span>
          <h2>Matches</h2>
        </div>
        <div className="filter-pills">
          {(['all', 'live', 'upcoming'] as const).map((f) => (
            <button key={f} onClick={() => setFixtureFilter(f)} className={fixtureFilter === f ? 'active' : ''}>
              {f === 'all' ? 'All' : f === 'live' ? 'Live now' : 'Upcoming'}
            </button>
          ))}
        </div>
      </div>
      <div className="fixture-grid">
        {filteredFixtures.map((fx) => (
          <article key={fx.id} className="fixture-card" onClick={() => navigate(`/match/${fx.id}`)}>
            <div className="fixture-competition">
              <span>{fx.competition}</span>
              {fx.status === 'live' ? (
                <span className="fixture-live"><span className="live-pulse" /> LIVE · {fx.minute}</span>
              ) : fx.status === 'finished' ? <span className="fixture-time">FULL TIME</span> : (
                <span className="fixture-time"><Clock3 size={12} /> {fx.kickoff}</span>
              )}
            </div>
            <div className="fixture-teams">
              <div className="fixture-team">
                <span className="fixture-crest">{fx.homeCrest ? <img src={fx.homeCrest} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : fx.home.slice(0, 3).toUpperCase()}</span>
                <div>
                  <strong>{fx.home}</strong>
                  <span>{fx.homeNick}</span>
                </div>
              </div>
              {fx.status === 'upcoming' ? <div className="fixture-vs">vs</div> : <div className="fixture-score">{fx.score}</div>}
              <div className="fixture-team away">
                <span className="fixture-crest away">{fx.awayCrest ? <img src={fx.awayCrest} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : fx.away.slice(0, 3).toUpperCase()}</span>
                <div>
                  <strong>{fx.away}</strong>
                  <span>{fx.awayNick}</span>
                </div>
              </div>
            </div>
            <div className="fixture-stadium"><span>{fx.stadium}</span><button className="stream-now-button" onClick={(e) => { e.stopPropagation(); navigate(fx.status === 'upcoming' ? `/match/${fx.id}` : `/watch/${fx.id}`); }}>{fx.status === 'live' ? 'Watch live' : fx.status === 'upcoming' ? 'Reserve seat' : 'Match details'} <ArrowUpRight size={13}/></button></div>
          </article>
        ))}
        {!fixturesLoading && filteredFixtures.length === 0 && <div className="empty-state">{fixturesError ? 'Live match data is not available right now. Please try again shortly.' : 'No matches in this filter for the provider’s available competitions and date range.'}</div>}
      </div>

      {/* PENALTY RUSH BANNER */}
      <section className="pr-banner" onClick={() => navigate('/penalty-rush')}>
        <div className="pr-banner-bg" />
        <div className="pr-banner-content">
          <div className="pr-banner-left">
            <span className="eyebrow lime-text">SURESTREAM GAME TIME</span>
            <h2>Penalty Rush</h2>
            <p>Our original SURESTREAM goalkeeper challenge is in development. Join the list and be first to play.</p>
            <div className="pr-banner-features">
              <span><Target size={13} /> Five-shot challenge</span>
              <span><Zap size={13} /> Premium arcade</span>
              <span><Share2 size={13} /> Friend challenges</span>
              <span><Trophy size={13} /> Coming soon</span>
            </div>
          </div>
          <button className="lime-button pr-banner-btn">
            <Zap size={18} fill="currentColor" /> Coming soon
          </button>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <div className="section-heading">
        <div>
          <span className="eyebrow">HOW IT WORKS</span>
          <h2>Three steps to the shootout</h2>
        </div>
      </div>
      <div className="steps-grid">
        <div className="step-card">
          <div className="step-number">1</div>
          <strong>Pick your team</strong>
          <p>Choose from Arsenal, Liverpool, Man City, Chelsea, Barcelona, and Real Madrid.</p>
        </div>
        <div className="step-card">
          <div className="step-number">2</div>
          <strong>Take your penalties</strong>
          <p>Aim at the goal, charge your power, and beat the keeper. He gets faster every level.</p>
        </div>
        <div className="step-card">
          <div className="step-number">3</div>
          <strong>Challenge a friend</strong>
          <p>Get a shareable code. Send it anywhere. They play the same setup — highest score wins.</p>
        </div>
      </div>

      {/* COMPETITIONS */}
      <div className="section-heading">
        <div>
          <span className="eyebrow">COMPETITIONS</span>
          <h2>Browse by competition</h2>
        </div>
      </div>
      <div className="competition-grid">
        {competitions.map((c, i) => (
          <button key={i} className={`competition-card ${c.active ? '' : 'disabled'}`} disabled={!c.active} onClick={() => c.active && navigate('/matches')}>
            <div className="competition-icon"><c.icon size={22} /></div>
            <strong>{c.name}</strong>
            <span>{c.country}</span>
            {!c.active && <em>Coming soon</em>}
          </button>
        ))}
      </div>

      {/* THE STANDS PREVIEW */}
      <div className="section-heading">
        <div>
          <span className="eyebrow">THE STANDS</span>
          <h2>Your seat in the game</h2>
        </div>
        <button className="text-button" onClick={() => navigate('/watch')}>Enter The Stands <ChevronRight size={15} /></button>
      </div>
      <div className="stands-preview" onClick={() => navigate('/watch')}>
        <img src={matchImage} alt="Live match in The Stands" />
        <div className="stands-overlay" />
        <div className="stands-content">
          <div className="live-badge"><span className="live-pulse" /> DEMO LIVE</div>
          <h3>Arsenal vs Liverpool</h3>
          <p>Join thousands of fans for live match commentary, crowd reactions, and real-time chat in The Stands.</p>
          <div className="stands-actions">
            <button className="lime-button"><Play size={15} fill="currentColor" /> Watch now</button>
            <button className="ghost-button"><Users size={15} /> Join the crowd</button>
          </div>
        </div>
      </div>

      {/* STREAMER STUDIO PREVIEW */}
      <div className="section-heading">
        <div>
          <span className="eyebrow">FOR CREATORS</span>
          <h2>Streamer Studio</h2>
        </div>
        <button className="text-button" onClick={() => navigate('/streamer-studio')}>Open studio <ChevronRight size={15} /></button>
      </div>
      <div className="studio-preview-card" onClick={() => navigate('/streamer-studio')}>
        <div className="studio-preview-left">
          <img src={playerImage} alt="Streamer Studio preview" />
          <div className="studio-preview-badge"><Video size={14} /> Free for creators</div>
        </div>
        <div className="studio-preview-right">
          <strong>Broadcast your match-day experience</strong>
          <p>Go live with match commentary, manage your stream settings, and engage with your audience — all in one studio.</p>
          <ul>
            <li><Headphones size={13} /> Creator commentary controls</li>
            <li><Users size={13} /> Live chat integration</li>
            <li><CalendarDays size={13} /> Schedule and manage streams</li>
          </ul>
          <button className="ghost-button">Open Streamer Studio <ArrowUpRight size={14} /></button>
        </div>
      </div>

      {/* PRICING */}
      <div className="section-heading">
        <div>
          <span className="eyebrow">PRICING</span>
          <h2>Choose your seat</h2>
        </div>
      </div>
      <div className="pricing-grid">
        {pricingTiers.map((t) => (
          <div key={t.name} className={`pricing-card ${t.name.includes('VIP') ? 'featured' : ''}`}>
            {t.name.includes('VIP') && <div className="pricing-featured"><Crown size={13} /> MOST POPULAR</div>}
            <strong>{t.name}</strong>
            <div className="pricing-price">{t.price}</div>
            <ul>
              {t.features.map((f, i) => (
                <li key={i}><ShieldCheck size={13} /> {f}</li>
              ))}
            </ul>
            <button className={t.current ? 'dark-button' : t.name.includes('VIP') ? 'lime-button' : 'ghost-button'} disabled={t.current} onClick={() => navigate('/seats/featured-match')}>
              {t.cta}
            </button>
          </div>
        ))}
      </div>
      <div className="pricing-note">
        <span><MessageSquare size={13} /> Free browsing and Penalty Rush. A 15-minute preview is planned but only activates when an authorized playable feed is connected. Paid access remains locked until payment is verified.</span>
      </div>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="brand-mark"><Crown size={21} strokeWidth={2.6} /></div>
            <div>
              <div className="brand-name">REAL<span>YAMAL</span></div>
              <div className="brand-tagline">Your seat in the game</div>
            </div>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <span className="eyebrow">EXPLORE</span>
              <button onClick={() => navigate('/matches')}>Matches</button>
              <button onClick={() => navigate('/penalty-rush')}>Penalty Rush</button>
              <button onClick={() => navigate('/watch')}>The Stands</button>
              <button onClick={() => navigate('/streamer-studio')}>Streamer Studio</button>
            </div>
            <div className="footer-col">
              <span className="eyebrow">ACCOUNT</span>
              <button onClick={() => navigate('/dashboard')}>Dashboard</button>
              <button onClick={() => navigate('/pricing')}>Pricing</button>
              <button onClick={() => navigate('/profile')}>Profile</button>
              <button onClick={() => navigate('/settings')}>Settings</button>
            </div>
            <div className="footer-col">
              <span className="eyebrow">LEGAL</span>
              <button onClick={() => navigate('/privacy')}>Privacy</button>
              <button onClick={() => navigate('/terms')}>Terms</button>
              <button onClick={() => navigate('/contact')}>Contact</button>
              <button onClick={() => navigate('/partners')}>Partners</button>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 SURESTREAM. All rights reserved.</span>
          <span className="footer-partners">
            <span className="live-pulse" /> Demo mode · No live data provider connected
          </span>
        </div>
      </footer>
    </>
  );
}
