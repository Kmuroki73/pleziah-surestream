import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowUpRight, ArrowLeft, Crown, Maximize, MoreHorizontal, Play, LockKeyhole,
  Send, ShieldCheck, Sparkles, Users, Volume2, X, Zap, Radio,
  CalendarDays, Settings, Headphones, Mic2,
} from 'lucide-react';

const matchImage = '/assets/matchday-banner.jpg';
const heroImage = '/assets/stadium-hero.jpg';

const chatMessages = [
  { name: 'SURESTREAM', message: 'Community chat will be available when the authenticated fan-zone service is connected.', tone: 'lime' },
];

function StatPill({ icon: Icon, value, label }: { icon: typeof Users; value: string; label: string }) {
  return <div className="stat-pill"><Icon size={15} /><strong>{value}</strong><span>{label}</span></div>;
}

export function WatchPage() {
  const navigate = useNavigate();
  const { id: matchId } = useParams();
  const [match, setMatch] = useState<any>(null);
  const [matchLoading, setMatchLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('Overview');
  const [streamAvailability, setStreamAvailability] = useState<{status:'checking'|'found'|'none'|'unconfigured'|'error';sourceCount?:number;note?:string;matchTitle?:string}>({status:'checking'});
  useEffect(() => {
    let alive = true;
    fetch('/api/matches').then(r => r.json()).then(body => { if (alive && Array.isArray(body.matches)) setMatch(body.matches.find((m: any) => String(m.id) === String(matchId)) ?? null); }).catch(() => { if (alive) setMatch(null); }).finally(() => { if (alive) setMatchLoading(false); });
    return () => { alive = false; };
  }, [matchId]);

  useEffect(() => {
    let alive = true;
    if (!matchId) { setStreamAvailability({status:'none',note:'Open a specific fixture to check stream-source metadata.'}); return () => { alive = false; }; }
    if (!match) return () => { alive = false; };
    const loadAvailability = async () => {
      try {
        let sourceId = '';
        let sourceTitle = `${match.home ?? 'Home'} vs ${match.away ?? 'Away'}`;
        let fallbackNote = '';
        if (match.streamSourceProvider === 'SportSRC') {
          sourceId = String(match.id ?? matchId);
        } else {
          const date = match.kickoff ? new Date(match.kickoff).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
          const response = await fetch(`/api/sportsrc-matches?date=${encodeURIComponent(date)}`);
          const body = await response.json();
          if (!alive) return;
          if (response.status === 503 || body.code === 'MISSING_SPORTSRC_API_KEY') { setStreamAvailability({status:'unconfigured',note:body.error || 'Stream discovery is not configured.'}); return; }
          if (!response.ok) throw new Error(body.error || 'Stream discovery failed');
          const normalize = (value: unknown) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const candidates = Array.isArray(body.matches) ? body.matches : [];
          const found = candidates.find((row:any) => {
            const h=normalize(row.home), a=normalize(row.away), mh=normalize(match.home), ma=normalize(match.away);
            return h && a && (((h.includes(mh) || mh.includes(h)) && (a.includes(ma) || ma.includes(a))) || ((h.includes(ma) || ma.includes(h)) && (a.includes(mh) || mh.includes(a))));
          });
          if (!found) { setStreamAvailability({status:'none',note:body.note || 'No matching stream listing returned for this fixture.'}); return; }
          sourceId = String(found.id); sourceTitle = String(found.title ?? sourceTitle); fallbackNote = body.note || '';
        }
        const detailResponse = await fetch(`/api/sportsrc-detail?id=${encodeURIComponent(sourceId)}`);
        const detail = await detailResponse.json();
        if (!alive) return;
        if (detail.code === 'MISSING_SPORTSRC_API_KEY' || detailResponse.status === 503) { setStreamAvailability({status:'unconfigured',note:detail.error || 'Stream discovery is not configured.'}); return; }
        if (!detailResponse.ok) { setStreamAvailability({status:'none',note:detail.error || 'Source details unavailable.'}); return; }
        setStreamAvailability({status:'found',sourceCount:Number(detail.sourceCount)||0,note:detail.note || fallbackNote,matchTitle:detail.match?.title || sourceTitle});
      } catch (e) {
        if (alive) setStreamAvailability({status:'error',note:e instanceof Error?e.message:'Stream discovery unavailable.'});
      }
    };
    void loadAvailability();
    return () => { alive = false; };
  }, [match, matchId]);


  const sendMessage = () => {
    if (!message.trim()) return;
    setSent((current) => [...current, message.trim()]);
    setMessage('');
  };

  const tabs = ['Overview', 'Lineups', 'Stats', 'Events'];

  return (
    <div className="watch-page">
      <div className="watch-back-bar">
        <button className="icon-button" onClick={() => navigate('/')}><ArrowLeft size={18} /></button>
        <strong>The Stands · {match ? `${match.home} vs ${match.away}` : 'Match viewing'}</strong>
      </div>
      <div className="watch-layout">
        <section className="player-column">
          <div className="video-frame access-player">
            <div className="access-message">
              <Radio size={34}/>
              <span className="eyebrow">{match && ['LIVE','IN_PLAY','PAUSED','HALFTIME','INPROGRESS'].includes(String(match.status).toUpperCase()) ? 'LIVE MATCH · STREAM CHECK' : 'MATCH STREAM CHECK'}</span>
              <h2>{streamAvailability.status === 'checking' ? 'Checking available streams…' : streamAvailability.status === 'found' ? 'Stream source detected' : streamAvailability.status === 'unconfigured' ? 'Stream provider not configured' : 'Ready to check this match'}</h2>
              <p>{streamAvailability.status === 'found' ? `${streamAvailability.matchTitle || (match ? `${match.home} vs ${match.away}` : 'This match')} has ${streamAvailability.sourceCount ?? 0} source(s) listed. The current API response supplies source metadata, not a playable video URL, so we cannot start a player yet.` : streamAvailability.note || 'Stream Now checks for match source metadata immediately. A playable, rights-cleared stream URL must be supplied by an authorized provider.'}</p>
              {streamAvailability.status === 'found' && <span className="authorized-pill">SOURCE FOUND · PLAYBACK URL NOT SUPPLIED</span>}
              {streamAvailability.status !== 'checking' && <button className="lime-button" onClick={() => window.location.reload()}><Radio size={15}/> Check again</button>}
            </div>
          </div>
          <div className="stream-source-status">
            <div className="stream-source-icon"><Radio size={19}/></div>
            <div className="stream-source-copy"><strong>{streamAvailability.status==='checking'?'Checking stream listings…':streamAvailability.status==='found'?'Stream listing detected':streamAvailability.status==='unconfigured'?'Stream provider not configured':streamAvailability.status==='error'?'Stream lookup unavailable':'No stream listing found'}</strong><p>{streamAvailability.status==='found'?`${streamAvailability.matchTitle || 'Fixture'} · ${streamAvailability.sourceCount ?? 0} source(s) reported. ${streamAvailability.note || ''}`:streamAvailability.note || 'This panel reports provider metadata only; it does not mean a licensed broadcast is available.'}</p></div>
            <span className={`stream-source-badge ${streamAvailability.status==='found'?'detected':''}`}>{streamAvailability.status==='found'?'DETECTED':'METADATA ONLY'}</span>
          </div>
          <div className="watch-match-bar">
            <div className="team-block">
              <span className="team-crest">{match?.homeShort || match?.home?.slice(0,3).toUpperCase() || 'HOM'}</span>
              <div><strong>{match?.home ?? (matchLoading ? 'Loading match…' : 'Match details unavailable')}</strong><span>Home team</span></div>
            </div>
            <div className="watch-score"><strong>{match?.homeScore == null || match?.awayScore == null ? '— : —' : `${match.homeScore} : ${match.awayScore}`}</strong><span>{match?.status === 'LIVE' || match?.status === 'IN_PLAY' ? 'Live score from configured data provider' : match?.status ? `${match.status} · provider data` : 'Waiting for verified match data'}</span></div>
            <div className="team-block right">
              <div><strong>{match?.away ?? 'Away team'}</strong><span>Away team</span></div>
              <span className="team-crest white">{match?.awayShort || match?.away?.slice(0,3).toUpperCase() || 'AWY'}</span>
            </div>
          </div>
          <div className="watch-tabs">
            {tabs.map((t) => (
              <button key={t} className={activeTab === t ? 'active' : ''} onClick={() => setActiveTab(t)}>{t}</button>
            ))}
          </div>
          <div className="match-summary">
            <div>
              <span className="eyebrow">THE STANDS · MATCHDAY</span>
              <h3>Match information</h3>
              <p>{match ? `Match data supplied by the configured football provider. ${streamAvailability.status === 'found' ? 'SportSRC has returned source metadata; this API response does not contain a playable URL.' : 'No playable authorized video source has been supplied yet.'}` : 'We could not load a matching fixture from the configured provider. We do not fabricate scores or streams.'}</p>
            </div>
            {/* Reservation/payment actions intentionally live on the match-details route, not the watch screen. */}
          </div>
          <button className="pr-buffer-link" onClick={() => navigate('/penalty-rush')}>
            <Zap size={15} /> Play Penalty Rush while you watch
          </button>
        </section>

        {chatOpen && (
          <aside className="chat-panel">
            <div className="chat-head">
              <div>
                <span className="eyebrow">THE CROWD</span>
                <h3>Matchday chat</h3>
              </div>
              <button className="icon-button subtle" onClick={() => setChatOpen(false)}><X size={16} /></button>
            </div>
            <div className="chat-feed">
              {chatMessages.map((chat) => (
                <div className="chat-message" key={chat.name}>
                  <div className={`avatar ${chat.tone}`}>{chat.name.slice(0, 1)}</div>
                  <div><strong>{chat.name}</strong><p>{chat.message}</p></div>
                </div>
              ))}
              {sent.map((item, index) => (
                <div className="chat-message" key={`${item}-${index}`}>
                  <div className="avatar lime">G</div>
                  <div><strong>You</strong><p>{item}</p></div>
                </div>
              ))}
            </div>
            <div className="chat-input">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Say something..."
              />
              <button onClick={sendMessage} aria-label="Send message"><Send size={16} /></button>
            </div>
            <div className="chat-footer"><ShieldCheck size={13} /> Chat preview · not a live feed</div>
          </aside>
        )}
        {!chatOpen && (
          <button className="reopen-chat" onClick={() => setChatOpen(true)}>
            <Users size={15} /> Open crowd chat
          </button>
        )}
      </div>
    </div>
  );
}

export function StudioPage() {
  const navigate = useNavigate();
  const [onAir, setOnAir] = useState(false);
  const [whistle, setWhistle] = useState(true);
  const [title, setTitle] = useState('Live from the pitch · Matchday 28');
  const [category, setCategory] = useState('Football');

  return (
    <div className="studio-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">CREATOR COMMAND CENTER</span>
          <h1>Streamer Studio</h1>
          <p>Configure your broadcast provider before going on air. This studio preview does not publish a live stream or count real viewers.</p>
        </div>
        <span className="draft-badge"><Radio size={15}/> Stream provider not connected</span>
      </div>
      <div className="studio-grid">
        <div className="studio-preview">
          <div className="preview-top">
            <span className={onAir ? 'live-badge' : 'draft-badge'}>
              {onAir ? 'LOCAL PREVIEW ONLY' : 'PREVIEW ONLY'}
            </span>
            <span>Preview window</span>
          </div>
          <div className="preview-screen">
            <img src={matchImage} alt="Stream preview" />
            <div className="preview-overlay">
              <div className="brand-mark small"><Crown size={16} /></div>
              <span>{onAir ? 'Local preview mode' : 'Broadcast preview only'}</span>
            </div>
            <div className="preview-lower">
              <span><Users size={13} /> Viewer count unavailable</span>
              <span>1080p · 60fps</span>
            </div>
          </div>
          <div className="readiness">
            <div>
              <span className="status-check"><ShieldCheck size={14} /></span>
              <span><strong>Camera and mic</strong><small>Not connected to a broadcast service</small></span>
            </div>
            <div>
              <span className="status-check"><ShieldCheck size={14} /></span>
              <span><strong>Stream connection</strong><small>Provider credentials required</small></span>
            </div>
            <div>
              <span className="status-check"><ShieldCheck size={14} /></span>
              <span><strong>Content check</strong><small>Pre-broadcast review required</small></span>
            </div>
          </div>
          <button className="pr-buffer-link" onClick={() => navigate('/penalty-rush')}>
            <Zap size={15} /> Open Penalty Rush
          </button>
        </div>
        <div className="studio-settings">
          <div className="settings-card">
            <div className="card-title">
              <div><span className="eyebrow">BROADCAST DETAILS</span><h3>Shape the moment</h3></div>
              <Settings size={18} />
            </div>
            <label>Stream title
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label>Category
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option>Football</option>
                <option>Commentary</option>
                <option>Watch party</option>
              </select>
            </label>
            <label>Description
              <textarea defaultValue="Live match commentary, tactical breakdowns, and the crowd's best reactions." />
            </label>
            <button className="dark-button"><CalendarDays size={15} /> Schedule stream</button>
          </div>
          <div className="settings-card compact">
            <div className="card-title">
              <div><span className="eyebrow">EXPERIENCE</span><h3>Room settings</h3></div>
              <Sparkles size={18} />
            </div>
            <div className="toggle-row">
              <div>
                <Headphones size={15} />
                <span>Creator commentary<small>Let the crowd hear your mic</small></span>
              </div>
              <button className="toggle on"><span /></button>
            </div>
            <div className="toggle-row">
              <div>
                <Mic2 size={15} />
                <span>Whistle entrance<small>Make an entrance when you go live</small></span>
              </div>
              <button className={`toggle ${whistle ? 'on' : ''}`} onClick={() => setWhistle(!whistle)}><span /></button>
            </div>
            <div className="toggle-row">
              <div>
                <Users size={15} />
                <span>Live chat<small>Let viewers join the moment</small></span>
              </div>
              <button className="toggle on"><span /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="placeholder-page">
      <span className="eyebrow">{title}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <span className="placeholder-status">This page is part of the SURESTREAM roadmap. Public browsing works without login.</span>
    </div>
  );
}
