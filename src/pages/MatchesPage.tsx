import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, Clock3, Radio, RefreshCw, Search, ShieldCheck, Trophy } from 'lucide-react';

type Match = { id:number|string; home:string; away:string; competition:string; kickoff:string|null; status:string; minute?:string|number|null; homeScore:number|null; awayScore:number|null; venue?:string|null; homeCrest?:string|null; awayCrest?:string|null };

const liveStatuses = ['LIVE','IN_PLAY','INPLAY','IN_PROGRESS','INPROGRESS','PAUSED','HALFTIME','1H','2H','ET','PENALTIES'];
const finishedStatuses = ['FINISHED','FT','FULL_TIME','AWARDED','CANCELLED','POSTPONED'];

export default function MatchesPage() {
  const nav = useNavigate();
  const [rows,setRows] = useState<Match[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [filter,setFilter] = useState('all');
  const [query,setQuery] = useState('');
  const [updated,setUpdated] = useState('');
  const [provider,setProvider] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/matches');
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Football provider is unavailable.');
      setRows(Array.isArray(body.matches) ? body.matches : []);
      setUpdated(body.updatedAt || new Date().toISOString());
      setProvider(body.provider || 'Verified football feed');
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load football data.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); const timer = window.setInterval(load,60000); return () => window.clearInterval(timer); }, []);

  const getStatus = (m:Match): 'live'|'upcoming'|'finished' => {
    const s = String(m.status || '').toUpperCase();
    return liveStatuses.includes(s) ? 'live' : finishedStatuses.includes(s) ? 'finished' : 'upcoming';
  };
  const filtered = useMemo(() => rows.filter(m => {
    const status = getStatus(m);
    return (filter === 'all' || status === filter) &&
      `${m.home} ${m.away} ${m.competition}`.toLowerCase().includes(query.toLowerCase());
  }).sort((a,b) => {
    const rank: Record<'live'|'upcoming'|'finished',number> = {live:0,upcoming:1,finished:2};
    return rank[getStatus(a)]-rank[getStatus(b)] || new Date(a.kickoff || 0).getTime()-new Date(b.kickoff || 0).getTime();
  }),[rows,filter,query]);

  const formatDate = (value:string|null) => value ? new Date(value).toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Kick-off time unavailable';
  const liveCount = rows.filter(m=>getStatus(m)==='live').length;
  const upcomingCount = rows.filter(m=>getStatus(m)==='upcoming').length;
  const finishedCount = rows.filter(m=>getStatus(m)==='finished').length;

  return <main className="matches-page matches-page-v36">
    <header className="matches-direct-heading">
      <div><span className="matches-kicker"><Radio size={13}/> SURESTREAM LIVE</span><h1>Matches</h1><p>Live games, fixtures and results — all in one place.</p></div>
      <button className="matches-refresh-v36" onClick={()=>void load()} disabled={loading}><RefreshCw size={15} className={loading?'matches-spin':''}/>{loading?'Refreshing':'Refresh'}</button>
    </header>
    <section className="matches-controls-v36">
      <label className="matches-search-v36"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search clubs or competitions"/><kbd>/</kbd></label>
      <div className="matches-filters-v36">{[['all','All matches'],['live','Live'],['upcoming','Upcoming'],['finished','Results']].map(([v,l])=><button key={v} className={filter===v?'active':''} onClick={()=>setFilter(v)}>{v==='live'&&<i/>}{l}</button>)}</div>
    </section>
    <div className="matches-results-heading"><div><span className="matches-kicker">FIXTURES & RESULTS</span><h2>{filter==='all'?'All matches':filter==='live'?'Live matches':filter==='upcoming'?'Upcoming fixtures':'Recent results'}</h2></div><span>{filtered.length} {filtered.length===1?'match':'matches'}</span></div>
    {loading&&rows.length===0?<div className="matches-skeleton-list">{[1,2,3].map(n=><div className="matches-skeleton" key={n}><i/><i/><i/></div>)}</div>
      : error && rows.length===0 ? <div className="matches-state-v36"><ShieldCheck size={28}/><h2>Match data is temporarily unavailable</h2><p>{error}</p><button onClick={()=>void load()}>Try again <RefreshCw size={14}/></button></div>
      : filtered.length===0 ? <div className="matches-state-v36"><CalendarDays size={28}/><h2>No matches found</h2><p>{query?'Try another team or competition name.':'There are no fixtures in this filter for the provider’s current date range.'}</p><button onClick={()=>{setFilter('all');setQuery('');}}>Clear filters</button></div>
      : <div className="matches-grid-v36">{filtered.map(m=>{const status=getStatus(m);const hasScore=m.homeScore!==null&&m.awayScore!==null;return <article className={`match-card-v36 ${status}`} key={m.id}>
        <div className="match-card-top"><span className="match-competition"><Trophy size={12}/>{m.competition}</span><span className={`match-state ${status}`}>{status==='live'?<><i/>{m.minute?`${m.minute}'`:'LIVE NOW'}</>:status==='finished'?'FULL TIME':'UPCOMING'}</span></div>
        <button className="match-card-main" onClick={()=>nav(`/match/${m.id}`)} aria-label={`${m.home} versus ${m.away} match centre`}>
          <span className="match-club-v36">{m.homeCrest?<img src={m.homeCrest} alt="" loading="lazy" onError={e=>{e.currentTarget.style.visibility='hidden';}}/>:<b>{m.home.slice(0,3).toUpperCase()}</b>}<strong>{m.home}</strong></span>
          <span className="match-score-v36">{hasScore?<><strong>{m.homeScore}</strong><i>:</i><strong>{m.awayScore}</strong></>:<small>VS</small>}</span>
          <span className="match-club-v36 away">{m.awayCrest?<img src={m.awayCrest} alt="" loading="lazy" onError={e=>{e.currentTarget.style.visibility='hidden';}}/>:<b>{m.away.slice(0,3).toUpperCase()}</b>}<strong>{m.away}</strong></span>
        </button>
        <div className="match-card-bottom"><span><Clock3 size={13}/>{status==='live'?'In progress':formatDate(m.kickoff)}</span><span>{m.venue||'Venue TBC'}</span><button onClick={()=>nav(`/match/${m.id}`)}>Match centre <ArrowUpRight size={13}/></button></div>
      </article>})}</div>}
    <div className="matches-data-foot"><ShieldCheck size={14}/><span>Scores and fixture details are displayed as received. If a provider field is unavailable, it is shown as unavailable rather than estimated.</span></div>
  </main>;
}
