import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Archive, BellRing, CalendarDays, Check, ChevronLeft, ChevronRight, Circle,
  Clock3, Download, Focus, Moon, Plus, RotateCcw, Search, Star, Sun,
  Trash2, Upload, X, BriefcaseBusiness, House, NotebookPen, CalendarPlus
} from 'lucide-react';
import './styles.css';

const KEY = 'today-rodrigo-v3';
const LEGACY_KEYS = ['rodrigo-today-v2', 'rodrigo-os-v1'];
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const localISO = (d = new Date()) => {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
};
const today = () => localISO();
const parseDate = (value) => new Date(`${value}T12:00:00`);
const fmtDate = (value, opts = { month: 'short', day: 'numeric' }) => new Intl.DateTimeFormat(undefined, opts).format(parseDate(value));
const longToday = () => new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
const addDays = (value, n) => { const d = parseDate(value); d.setDate(d.getDate() + n); return localISO(d); };
const daysOld = (value) => Math.max(0, Math.floor((parseDate(today()) - parseDate(value || today())) / 86400000));

const emptyData = {
  tasks: [], meetings: [], followups: [], reminders: [], planner: [], archive: [], settings: { theme: 'system' }
};

function normalize(raw = {}) {
  const tasks = (raw.tasks || []).map(x => ({ ...x, id: x.id || uid(), date: x.date || today(), important: !!x.important, category: x.category || 'work' }));
  const meetings = (raw.meetings || []).map(x => ({ ...x, id: x.id || uid(), date: x.date || today(), important: !!x.important, category: x.category || 'meeting' }));
  const followups = (raw.followups || []).map(x => ({ ...x, id: x.id || uid(), since: x.since || today(), important: !!x.important }));
  const reminders = (raw.reminders || raw.personal || []).map(x => ({ ...x, id: x.id || uid(), date: x.date || today(), important: !!x.important, category: x.category || 'personal' }));
  const planner = (raw.planner || []).map(x => ({ ...x, id: x.id || uid(), date: x.date || today(), category: x.category || 'personal', important: !!x.important }));
  const archive = [...(raw.archive || [])];

  // Preserve old journal content without keeping the journal UI.
  if (raw.journals && !raw.__journalsMigrated) {
    Object.entries(raw.journals).forEach(([date, entry]) => {
      const text = Object.entries(entry || {}).filter(([, v]) => String(v || '').trim()).map(([k, v]) => `${k}: ${v}`).join('\n');
      if (text) archive.push({ archiveId: uid(), source: 'notes', reason: 'migrated', archivedAt: new Date().toISOString(), item: { id: uid(), title: `Journal notes · ${date}`, notes: text, date } });
    });
  }

  const migrateDone = (source, list) => list.filter(x => x.done).map(item => ({ archiveId: uid(), source, reason: 'completed', archivedAt: item.completedAt || new Date().toISOString(), item }));
  archive.push(...migrateDone('tasks', tasks), ...migrateDone('followups', followups), ...migrateDone('reminders', reminders));

  return {
    ...emptyData, ...raw,
    tasks: tasks.filter(x => !x.done), meetings, followups: followups.filter(x => !x.done), reminders: reminders.filter(x => !x.done), planner, archive,
    settings: { ...emptyData.settings, ...(raw.settings || {}) }, __journalsMigrated: true
  };
}

function loadData() {
  try {
    const current = localStorage.getItem(KEY);
    if (current) return normalize(JSON.parse(current));
    for (const key of LEGACY_KEYS) {
      const value = localStorage.getItem(key);
      if (value) return normalize(JSON.parse(value));
    }
  } catch {}
  return structuredClone(emptyData);
}

function useLocalData() {
  const [data, setData] = useState(loadData);
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(data)), [data]);
  return [data, setData];
}

function Modal({ title, icon, onClose, children, wide = false }) {
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className={`modal ${wide ? 'wide' : ''}`}>
      <div className="modal-head"><div className="modal-title">{icon}{title}</div><button className="icon-button" onClick={onClose}><X size={17}/></button></div>
      {children}
    </div>
  </div>;
}

function Section({ title, meta, action, children }) {
  return <section className="section"><div className="section-head"><div><h2>{title}</h2>{meta && <span>{meta}</span>}</div>{action}</div>{children}</section>;
}

function Empty({ children }) { return <div className="empty">{children}</div>; }

function Row({ title, meta, important, onImportant, onDone, onDelete, icon }) {
  return <div className={`row ${important ? 'important-row' : ''}`}>
    <button className="check-button" onClick={onDone} aria-label="Complete"><Circle size={17}/></button>
    <div className="row-copy"><div className="row-title">{title}</div>{meta && <div className="row-meta">{meta}</div>}</div>
    {icon && <div className="row-kind">{icon}</div>}
    <button className={`important-button ${important ? 'active' : ''}`} onClick={onImportant}><Star size={15} fill={important ? 'currentColor' : 'none'}/></button>
    <button className="icon-button delete-button" onClick={onDelete}><X size={15}/></button>
  </div>;
}

function Calendar({ cursor, selected, setCursor, setSelected, events }) {
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const first = new Date(year, month, 1), start = new Date(year, month, 1 - first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const byDate = useMemo(() => {
    const map = {};
    events.forEach(e => { (map[e.date] ||= []).push(e); });
    return map;
  }, [events]);
  return <div className="calendar-card">
    <div className="calendar-head">
      <button className="icon-button" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft size={18}/></button>
      <strong>{new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(cursor)}</strong>
      <div className="calendar-head-actions"><button className="text-button" onClick={() => { const n = new Date(); setCursor(new Date(n.getFullYear(), n.getMonth(), 1)); setSelected(today()); }}>Today</button><button className="icon-button" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight size={18}/></button></div>
    </div>
    <div className="weekdays">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x => <span key={x}>{x}</span>)}</div>
    <div className="calendar-grid">
      {days.map(d => {
        const date = localISO(d), items = byDate[date] || [], outside = d.getMonth() !== month;
        return <button key={date} className={`day ${outside ? 'outside' : ''} ${date === selected ? 'selected' : ''} ${date === today() ? 'today' : ''}`} onClick={() => setSelected(date)}>
          <span className="day-number">{d.getDate()}</span>
          <span className="day-dots">{items.slice(0,3).map((x,i) => <i key={i} className={`dot ${x.category || x.kind || 'work'}`}/>)}{items.length > 3 && <small>+{items.length - 3}</small>}</span>
        </button>;
      })}
    </div>
  </div>;
}

function App() {
  const [data, setData] = useLocalData();
  const [capture, setCapture] = useState('');
  const [selectedDate, setSelectedDate] = useState(today());
  const [calendarCursor, setCalendarCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [entryOpen, setEntryOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [archiveQuery, setArchiveQuery] = useState('');
  const [remaining, setRemaining] = useState(1500);
  const [running, setRunning] = useState(false);
  const [form, setForm] = useState({ type: 'task', title: '', date: today(), time: '', category: 'work', notes: '', important: false });
  const fileInput = useRef(null);

  useEffect(() => {
    const apply = () => {
      const t = data.settings.theme;
      const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    const media = matchMedia('(prefers-color-scheme: dark)'); media.addEventListener?.('change', apply); return () => media.removeEventListener?.('change', apply);
  }, [data.settings.theme]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setRemaining(v => { if (v <= 1) { setRunning(false); return 0; } return v - 1; }), 1000);
    return () => clearInterval(timer);
  }, [running]);

  const update = (key, fn) => setData(d => ({ ...d, [key]: fn(d[key] || []) }));
  const archiveItem = (source, id, reason) => setData(d => {
    const list = d[source] || [], item = list.find(x => x.id === id); if (!item) return d;
    return { ...d, [source]: list.filter(x => x.id !== id), archive: [{ archiveId: uid(), source, reason, archivedAt: new Date().toISOString(), item }, ...(d.archive || [])] };
  });
  const toggleImportant = (source, id) => update(source, list => list.map(x => x.id === id ? { ...x, important: !x.important } : x));

  const allCalendarItems = useMemo(() => [
    ...data.tasks.map(x => ({ ...x, source: 'tasks', kind: 'task', label: x.title })),
    ...data.meetings.map(x => ({ ...x, source: 'meetings', kind: 'meeting', label: x.title })),
    ...data.reminders.map(x => ({ ...x, source: 'reminders', kind: 'reminder', label: x.title })),
    ...data.planner.map(x => ({ ...x, source: 'planner', kind: x.type || 'note', label: x.title })),
  ], [data]);

  const todayItems = useMemo(() => allCalendarItems.filter(x => x.date <= today()).sort((a,b) => (b.important-a.important) || `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`)), [allCalendarItems]);
  const selectedItems = useMemo(() => allCalendarItems.filter(x => x.date === selectedDate).sort((a,b) => (a.time || '99:99').localeCompare(b.time || '99:99')), [allCalendarItems, selectedDate]);
  const upcoming = useMemo(() => allCalendarItems.filter(x => x.date > today()).sort((a,b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`)).slice(0,8), [allCalendarItems]);
  const waiting = useMemo(() => [...data.followups].sort((a,b) => daysOld(b.since)-daysOld(a.since)), [data.followups]);
  const must = useMemo(() => [...allCalendarItems.filter(x => x.important), ...data.followups.filter(x => x.important).map(x => ({ ...x, source:'followups', label:`${x.person} — ${x.topic}`, kind:'waiting' }))].slice(0,8), [allCalendarItems, data.followups]);

  function openAdd(date = selectedDate, type = 'task') {
    setForm({ type, title: '', date, time: '', category: type === 'meeting' ? 'meeting' : 'work', notes: '', important: false }); setEntryOpen(true);
  }
  function saveEntry() {
    const title = form.title.trim(); if (!title) return;
    if (form.type === 'task') update('tasks', xs => [...xs, { id: uid(), title, date: form.date, time: form.time, category: form.category, notes: form.notes, important: form.important }]);
    else if (form.type === 'meeting') update('meetings', xs => [...xs, { id: uid(), title, date: form.date, time: form.time, category: 'meeting', objective: form.notes, important: form.important }]);
    else if (form.type === 'reminder') update('reminders', xs => [...xs, { id: uid(), title, date: form.date, time: form.time, category: form.category, notes: form.notes, important: form.important }]);
    else update('planner', xs => [...xs, { id: uid(), title, date: form.date, time: form.time, category: form.category, notes: form.notes, type: 'note', important: form.important }]);
    setEntryOpen(false);
  }

  function quickCapture() {
    let text = capture.trim(); if (!text) return;
    let important = /^!|\b(important|urgent|must remember)\b/i.test(text); text = text.replace(/^!\s*|\b(important|urgent|must remember)\b:?\s*/ig,'').trim();
    let date = today();
    if (/\btomorrow\b/i.test(text)) { date = addDays(today(),1); text = text.replace(/\btomorrow\b/ig,'').trim(); }
    const isoMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/); if (isoMatch) { date = isoMatch[1]; text = text.replace(isoMatch[0],'').trim(); }
    const wait = text.match(/^waiting(?: for)?\s+(.+)/i);
    if (wait) { const [person,...rest] = wait[1].split(/\s*[—:|-]\s*/); update('followups', xs => [...xs,{ id:uid(), person, topic:rest.join(' — ') || 'Follow up', since:today(), important }]); }
    else if (/^(note|remember)\b/i.test(text)) update('planner', xs => [...xs,{ id:uid(), title:text.replace(/^(note|remember)\b:?\s*/i,''), date, category:'personal', type:'note', important }]);
    else update('tasks', xs => [...xs,{ id:uid(), title:text, date, category:'work', important }]);
    setCapture('');
  }

  const searchable = useMemo(() => [
    ...allCalendarItems.map(x => ({ type:x.kind, title:x.label, meta:x.date })),
    ...data.followups.map(x => ({ type:'waiting', title:`${x.person} — ${x.topic}`, meta:x.since })),
    ...(data.archive || []).map(x => ({ type:`archive · ${x.source}`, title:x.item?.title || `${x.item?.person || ''} ${x.item?.topic || ''}`.trim(), meta:x.archivedAt?.slice(0,10) }))
  ], [allCalendarItems, data.followups, data.archive]);
  const results = searchable.filter(x => !query.trim() || `${x.type} ${x.title} ${x.meta}`.toLowerCase().includes(query.toLowerCase())).slice(0,30);
  const archiveResults = (data.archive || []).filter(x => !archiveQuery || JSON.stringify(x).toLowerCase().includes(archiveQuery.toLowerCase()));

  function restore(entry) {
    setData(d => ({ ...d, [entry.source]: [...(d[entry.source] || []), { ...entry.item, done:false }], archive: d.archive.filter(x => x.archiveId !== entry.archiveId) }));
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'}), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href=url; a.download=`today-backup-${today()}.json`; a.click(); URL.revokeObjectURL(url);
  }
  function importData(e) {
    const file=e.target.files?.[0]; if(!file)return; const reader=new FileReader(); reader.onload=()=>{ try{ setData(normalize(JSON.parse(reader.result))); }catch{ alert('Invalid backup file'); } }; reader.readAsText(file); e.target.value='';
  }
  const setTheme = theme => setData(d => ({...d, settings:{...d.settings, theme}}));
  const focusTask = todayItems.find(x => x.kind === 'task') || todayItems[0];
  const mm=String(Math.floor(remaining/60)).padStart(2,'0'), ss=String(remaining%60).padStart(2,'0');
  const kindIcon = kind => kind === 'meeting' ? <CalendarDays size={14}/> : kind === 'note' ? <NotebookPen size={14}/> : kind === 'reminder' ? <BellRing size={14}/> : <BriefcaseBusiness size={14}/>;

  return <>
    <main className="app-shell">
      <header className="topbar">
        <div><span className="product-name">Today</span><h1>What matters now?</h1><p>{longToday()}</p></div>
        <div className="top-actions">
          <button className="quiet-button" onClick={() => setSearchOpen(true)}><Search size={16}/><span>Search</span></button>
          <button className="quiet-button" onClick={() => setArchiveOpen(true)}><Archive size={16}/><span>Archive</span></button>
          <button className="quiet-button" onClick={() => setFocusOpen(true)}><Focus size={16}/><span>Focus</span></button>
          <button className="icon-button" onClick={() => setTheme(data.settings.theme === 'dark' ? 'light' : 'dark')}>{data.settings.theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}</button>
        </div>
      </header>

      <div className="capture-wrap"><Plus size={19}/><input value={capture} onChange={e=>setCapture(e.target.value)} onKeyDown={e=>e.key==='Enter'&&quickCapture()} placeholder="Add a task, note, or ‘waiting for Tom’…"/><button className="primary-button" onClick={quickCapture}>Add</button></div>
      <div className="capture-hint"><Star size={12}/> Start with <kbd>!</kbd> to mark something as must remember. Use “tomorrow” or YYYY-MM-DD for a future date.</div>

      {must.length > 0 && <section className="must-remember"><div className="must-remember-head"><div className="must-icon"><Star size={18} fill="currentColor"/></div><div><span>Must remember</span><strong>Your non-negotiables</strong></div></div><div className="must-list">{must.map(x=><button className="must-item" key={`${x.source}-${x.id}`} onClick={()=>toggleImportant(x.source,x.id)}>{kindIcon(x.kind)}<span>{x.label}</span><small>{x.date ? fmtDate(x.date) : 'Waiting'}</small></button>)}</div></section>}

      <div className="content-grid">
        <div className="main-column">
          <Section title="Today" meta={`${todayItems.length} open`} action={<button className="text-button" onClick={()=>openAdd(today())}><Plus size={15}/> add</button>}>
            {todayItems.length ? todayItems.map(x=><Row key={`${x.source}-${x.id}`} title={x.label} meta={`${x.date < today() ? `Overdue · ${fmtDate(x.date)}` : x.time || 'Today'}${x.notes || x.objective ? ` · ${x.notes || x.objective}` : ''}`} important={x.important} icon={kindIcon(x.kind)} onImportant={()=>toggleImportant(x.source,x.id)} onDone={()=>archiveItem(x.source,x.id,'completed')} onDelete={()=>archiveItem(x.source,x.id,'removed')}/>) : <Empty>Nothing is due today.</Empty>}
          </Section>
          <Section title="Waiting for" meta={`${waiting.length} open`} action={<button className="text-button" onClick={()=>{const person=prompt('Who are you waiting for?'); if(person) update('followups',xs=>[...xs,{id:uid(),person,topic:'Follow up',since:today(),important:false}]);}}><Plus size={15}/> add</button>}>
            {waiting.length ? waiting.map(x=><Row key={x.id} title={`${x.person} — ${x.topic}`} meta={`Waiting ${daysOld(x.since)} day${daysOld(x.since)===1?'':'s'}`} important={x.important} onImportant={()=>toggleImportant('followups',x.id)} onDone={()=>archiveItem('followups',x.id,'completed')} onDelete={()=>archiveItem('followups',x.id,'removed')}/>) : <Empty>No outstanding follow-ups.</Empty>}
          </Section>
          <Section title="Upcoming" meta="next commitments">
            {upcoming.length ? upcoming.map(x=><Row key={`${x.source}-${x.id}`} title={x.label} meta={`${fmtDate(x.date,{weekday:'short',month:'short',day:'numeric'})}${x.time?` · ${x.time}`:''}`} important={x.important} icon={kindIcon(x.kind)} onImportant={()=>toggleImportant(x.source,x.id)} onDone={()=>archiveItem(x.source,x.id,'completed')} onDelete={()=>archiveItem(x.source,x.id,'removed')}/>) : <Empty>No future items yet.</Empty>}
          </Section>
        </div>

        <aside className="side-column">
          <Section title="Planner" meta="work + personal" action={<button className="text-button" onClick={()=>openAdd(selectedDate,'note')}><CalendarPlus size={15}/> add</button>}>
            <Calendar cursor={calendarCursor} selected={selectedDate} setCursor={setCalendarCursor} setSelected={setSelectedDate} events={allCalendarItems}/>
            <div className="selected-day-head"><div><strong>{selectedDate === today() ? 'Today' : fmtDate(selectedDate,{weekday:'long',month:'long',day:'numeric'})}</strong><span>{selectedItems.length} item{selectedItems.length===1?'':'s'}</span></div><button className="primary-button compact" onClick={()=>openAdd(selectedDate)}><Plus size={14}/> Add</button></div>
            <div className="selected-day-list">{selectedItems.length ? selectedItems.map(x=><div className="day-item" key={`${x.source}-${x.id}`}><div className={`category-icon ${x.category || x.kind}`}>{kindIcon(x.kind)}</div><div><strong>{x.label}</strong><span>{x.time || (x.kind === 'note' ? 'Note' : x.kind)}{x.notes || x.objective ? ` · ${x.notes || x.objective}` : ''}</span></div><button className={`important-button ${x.important?'active':''}`} onClick={()=>toggleImportant(x.source,x.id)}><Star size={14} fill={x.important?'currentColor':'none'}/></button></div>) : <Empty>Select Add to plan this day.</Empty>}</div>
          </Section>
        </aside>
      </div>

      <footer><span>Saved privately in this browser</span><div><button className="text-button" onClick={exportData}><Download size={14}/> Export</button><button className="text-button" onClick={()=>fileInput.current?.click()}><Upload size={14}/> Import</button><input ref={fileInput} hidden type="file" accept="application/json" onChange={importData}/></div></footer>
    </main>

    {entryOpen && <Modal title="Add to planner" icon={<CalendarPlus size={17}/>} onClose={()=>setEntryOpen(false)}>
      <div className="form-stack">
        <label>Type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value,category:e.target.value==='meeting'?'meeting':form.category})}><option value="task">Task</option><option value="note">Future note</option><option value="reminder">Reminder</option><option value="meeting">Meeting</option></select></label>
        <label>Title<input autoFocus value={form.title} onChange={e=>setForm({...form,title:e.target.value})} onKeyDown={e=>e.key==='Enter'&&saveEntry()} placeholder="What do you need to remember?"/></label>
        <div className="form-row"><label>Date<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><label>Time (optional)<input type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/></label></div>
        {form.type !== 'meeting' && <label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="work">Work</option><option value="personal">Personal</option></select></label>}
        <label>Details<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Context, preparation, address, or anything useful later…"/></label>
        <label className="important-check"><input type="checkbox" checked={form.important} onChange={e=>setForm({...form,important:e.target.checked})}/><Star size={15}/> Must remember</label>
        <div className="modal-actions"><button className="secondary-button" onClick={()=>setEntryOpen(false)}>Cancel</button><button className="primary-button" onClick={saveEntry}>Add to planner</button></div>
      </div>
    </Modal>}

    {searchOpen && <Modal title="Search everything" icon={<Search size={17}/>} onClose={()=>setSearchOpen(false)} wide><div className="search-box"><Search size={17}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search tasks, notes, dates, archive…"/></div><div className="result-list">{results.map((x,i)=><div className="search-result" key={i}><small>{x.type}</small><span>{x.title}</span><time>{x.meta}</time></div>)}</div></Modal>}

    {archiveOpen && <Modal title="Archive" icon={<Archive size={17}/>} onClose={()=>setArchiveOpen(false)} wide><div className="search-box"><Search size={17}/><input value={archiveQuery} onChange={e=>setArchiveQuery(e.target.value)} placeholder="Search completed, removed, and old notes…"/></div><div className="archive-list">{archiveResults.length ? archiveResults.map(entry=><div className="archive-row" key={entry.archiveId}><div className={`archive-status ${entry.reason}`}>{entry.reason==='completed'?<Check size={15}/>:<Archive size={15}/>}</div><div className="archive-copy"><strong>{entry.item?.title || `${entry.item?.person || ''} ${entry.item?.topic || ''}`.trim()}</strong><span>{entry.source} · {entry.reason} · {entry.archivedAt?.slice(0,10)}</span>{entry.item?.notes && <p>{entry.item.notes}</p>}</div><button className="archive-action" onClick={()=>restore(entry)}><RotateCcw size={13}/> Restore</button><button className="icon-button" onClick={()=>setData(d=>({...d,archive:d.archive.filter(x=>x.archiveId!==entry.archiveId)}))}><Trash2 size={14}/></button></div>) : <Empty>Archive is empty.</Empty>}</div></Modal>}

    {focusOpen && <div className="focus-overlay"><button className="focus-close" onClick={()=>setFocusOpen(false)}><X size={18}/></button><div className="focus-content"><span>Focus</span><h2>{focusTask?.label || 'Choose one meaningful task'}</h2><div className="timer">{mm}:{ss}</div><div className="focus-controls"><button onClick={()=>{setRemaining(1500);setRunning(false)}}>Reset</button><button className="focus-primary" onClick={()=>setRunning(!running)}>{running?'Pause':'Start'}</button>{focusTask&&<button onClick={()=>{archiveItem(focusTask.source,focusTask.id,'completed');setFocusOpen(false)}}><Check size={15}/> Done</button>}</div></div></div>}
  </>;
}

createRoot(document.getElementById('root')).render(<App/>);
