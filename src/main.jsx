import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Archive,
  BellRing,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Download,
  Focus,
  Moon,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Sun,
  Upload,
  X,
} from 'lucide-react';
import './styles.css';

const KEY = 'today-rodrigo-v3';
const LEGACY_KEYS = ['rodrigo-today-v2', 'rodrigo-os-v1'];
const iso = (date = new Date()) => date.toISOString().slice(0, 10);
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const todayLabel = () => new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
const shortDate = (value) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`));
const daysOld = (value) => Math.max(0, Math.floor((new Date(`${iso()}T12:00:00`) - new Date(`${value}T12:00:00`)) / 86400000));

const defaultData = {
  tasks: [],
  meetings: [],
  followups: [],
  reminders: [],
  journals: {},
  settings: { theme: 'system' },
};

function normalize(raw = {}) {
  return {
    ...defaultData,
    ...raw,
    tasks: (raw.tasks || []).map((item) => ({ ...item, important: Boolean(item.important) })),
    meetings: (raw.meetings || []).map((item) => ({ ...item, important: Boolean(item.important) })),
    followups: (raw.followups || []).map((item) => ({ ...item, important: Boolean(item.important) })),
    reminders: (raw.reminders || raw.personal || []).map((item) => ({ ...item, important: Boolean(item.important) })),
    journals: raw.journals || (raw.notes ? { [iso()]: { wins: '', challenges: '', ideas: raw.notes, tomorrow: '' } } : {}),
    settings: { ...defaultData.settings, ...(raw.settings || {}) },
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
  return structuredClone(defaultData);
}

function useLocalData() {
  const [data, setData] = useState(loadData);
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(data)), [data]);
  return [data, setData];
}

function Section({ title, meta, action, children, id }) {
  return (
    <section className="section" id={id}>
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {meta ? <span>{meta}</span> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

function CheckButton({ checked, onClick, label }) {
  return (
    <button type="button" className={`check-button ${checked ? 'checked' : ''}`} onClick={onClick} aria-label={label}>
      {checked ? <Check size={13} strokeWidth={3} /> : <Circle size={17} strokeWidth={1.6} />}
    </button>
  );
}

function Row({ children, done, onToggle, onDelete, meta, right, important, onImportant }) {
  return (
    <div className={`row ${done ? 'done' : ''} ${important ? 'important-row' : ''}`}>
      {onToggle ? <CheckButton checked={done} onClick={onToggle} label={done ? 'Mark incomplete' : 'Mark complete'} /> : <span className="row-dot" />}
      <div className="row-copy">
        <div className="row-title">{children}</div>
        {meta ? <div className="row-meta">{meta}</div> : null}
      </div>
      {onImportant ? (
        <button type="button" className={`important-button ${important ? 'active' : ''}`} onClick={onImportant} aria-label={important ? 'Remove from must remember' : 'Mark as must remember'} title={important ? 'Must remember' : 'Mark important'}>
          <Star size={15} fill={important ? 'currentColor' : 'none'} />
        </button>
      ) : null}
      {right}
      {onDelete ? (
        <button type="button" className="icon-button delete-button" onClick={onDelete} aria-label="Delete">
          <X size={15} />
        </button>
      ) : null}
    </div>
  );
}

function App() {
  const [data, setData] = useLocalData();
  const [capture, setCapture] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState(null);
  const [remaining, setRemaining] = useState(1500);
  const [running, setRunning] = useState(false);
  const [query, setQuery] = useState('');
  const fileInput = useRef(null);
  const captureRef = useRef(null);

  const theme = data.settings.theme;
  useEffect(() => {
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    const media = matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener?.('change', apply);
    return () => media.removeEventListener?.('change', apply);
  }, [theme]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setRemaining((value) => {
      if (value <= 1) {
        setRunning(false);
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [running]);

  const todayTasks = useMemo(() => data.tasks.filter((task) => !task.done && (task.date || iso()) <= iso()), [data.tasks]);
  const upcoming = useMemo(() => [...data.meetings].filter((meeting) => meeting.date >= iso()).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0, 7), [data.meetings]);
  const openFollowups = useMemo(() => data.followups.filter((item) => !item.done).sort((a, b) => daysOld(b.since) - daysOld(a.since)), [data.followups]);
  const openReminders = useMemo(() => data.reminders.filter((item) => !item.done), [data.reminders]);
  const mustRemember = useMemo(() => [
    ...data.tasks.filter((item) => item.important && !item.done).map((item) => ({ ...item, collection: 'tasks', label: item.title, kind: 'Task' })),
    ...data.followups.filter((item) => item.important && !item.done).map((item) => ({ ...item, collection: 'followups', label: `${item.person} — ${item.topic}`, kind: 'Waiting' })),
    ...data.reminders.filter((item) => item.important && !item.done).map((item) => ({ ...item, collection: 'reminders', label: item.title, kind: 'Reminder' })),
    ...data.meetings.filter((item) => item.important && item.date >= iso()).map((item) => ({ ...item, collection: 'meetings', label: item.title, kind: 'Meeting' })),
  ].slice(0, 6), [data]);
  const journal = data.journals[iso()] || { wins: '', challenges: '', ideas: '', tomorrow: '' };
  const focusTask = data.tasks.find((task) => task.id === focusTaskId) || todayTasks[0];

  const updateCollection = (name, fn) => setData((current) => ({ ...current, [name]: fn(current[name]) }));
  const remove = (name, id) => updateCollection(name, (items) => items.filter((item) => item.id !== id));
  const toggle = (name, id) => updateCollection(name, (items) => items.map((item) => item.id === id ? { ...item, done: !item.done } : item));
  const toggleImportant = (name, id) => updateCollection(name, (items) => items.map((item) => item.id === id ? { ...item, important: !item.important } : item));

  function addTask(title, date = iso(), important = false) {
    updateCollection('tasks', (items) => [...items, { id: uid(), title, date, done: false, important }]);
  }
  function addWaiting(value, important = false) {
    const [person, ...topic] = value.split(/\s*[—:|-]\s*/);
    updateCollection('followups', (items) => [...items, { id: uid(), person: person || 'Someone', topic: topic.join(' — ') || 'Follow up', since: iso(), done: false, important }]);
  }
  function addReminder(title, important = false) {
    updateCollection('reminders', (items) => [...items, { id: uid(), title, date: iso(), done: false, important }]);
  }

  function parseCapture(raw) {
    const value = raw.trim();
    if (!value) return;
    const important = /^!|^important\b|^urgent\b/i.test(value);
    const cleanValue = value.replace(/^!\s*|^(important|urgent)[:\s-]*/i, '').trim();
    const lower = cleanValue.toLowerCase();
    if (lower === 'focus') {
      startFocus();
      return;
    }
    if (lower.startsWith('waiting ') || lower.startsWith('waiting for ')) {
      addWaiting(cleanValue.replace(/^waiting(?: for)?\s+/i, ''), important);
      return;
    }
    if (/^(remember|remind me|don['’]?t forget)/i.test(cleanValue)) {
      addReminder(cleanValue.replace(/^(remember|remind me|don['’]?t forget)\s*/i, ''), important);
      return;
    }
    const tomorrow = /\btomorrow\b/i.test(cleanValue);
    const meetingLike = /\b(meeting|interview|call|sync|review|appointment)\b/i.test(cleanValue);
    const time = cleanValue.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    if (meetingLike && (tomorrow || time)) {
      const date = new Date();
      if (tomorrow) date.setDate(date.getDate() + 1);
      let hour = time ? Number(time[1]) : 9;
      const minute = time?.[2] ? Number(time[2]) : 0;
      if (time?.[3]?.toLowerCase() === 'pm' && hour < 12) hour += 12;
      const title = cleanValue.replace(/\btomorrow\b/ig, '').replace(time?.[0] || '', '').trim() || 'Meeting';
      updateCollection('meetings', (items) => [...items, { id: uid(), title, date: iso(date), time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, objective: '', important }]);
      return;
    }
    addTask(cleanValue, iso(), important);
  }

  function submitCapture() {
    parseCapture(capture);
    setCapture('');
    captureRef.current?.focus();
  }

  function updateJournal(field, value) {
    setData((current) => ({
      ...current,
      journals: { ...current.journals, [iso()]: { ...journal, [field]: value } },
    }));
  }

  function startFocus(id = null) {
    const selected = id || todayTasks[0]?.id || null;
    setFocusTaskId(selected);
    setRemaining(1500);
    setRunning(false);
    setFocusOpen(true);
    setPaletteOpen(false);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `today-backup-${iso()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        setData(normalize(parsed));
      } catch {
        alert('That backup file could not be read.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return [
      ...data.tasks.map((x) => ({ type: 'Task', title: x.title, meta: x.done ? 'Completed' : x.date || iso() })),
      ...data.meetings.map((x) => ({ type: 'Meeting', title: x.title, meta: `${x.date} · ${x.time}` })),
      ...data.followups.map((x) => ({ type: 'Waiting', title: `${x.person} — ${x.topic}`, meta: x.since })),
      ...data.reminders.map((x) => ({ type: 'Reminder', title: x.title, meta: x.date || iso() })),
      ...Object.entries(data.journals).flatMap(([date, value]) => Object.entries(value).filter(([, text]) => text).map(([field, text]) => ({ type: `Journal · ${field}`, title: text, meta: date }))),
    ].filter((item) => `${item.type} ${item.title} ${item.meta}`.toLowerCase().includes(q)).slice(0, 20);
  }, [data, query]);

  useEffect(() => {
    const onKey = (event) => {
      const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      } else if (!typing && event.key === '/') {
        event.preventDefault();
        setSearchOpen(true);
      } else if (!typing && event.key.toLowerCase() === 't') {
        event.preventDefault();
        captureRef.current?.focus();
      } else if (!typing && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        startFocus();
      } else if (event.key === 'Escape') {
        setPaletteOpen(false);
        setSearchOpen(false);
        setMeetingOpen(false);
        setFocusOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [todayTasks]);

  function cycleTheme() {
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setData((current) => ({ ...current, settings: { ...current.settings, theme: next } }));
  }

  return (
    <>
      <main className="app-shell">
        <header className="topbar">
          <div>
            <div className="product-name">Today</div>
            <h1>What matters today?</h1>
            <p>{todayLabel()}</p>
          </div>
          <div className="top-actions">
            <button className="quiet-button" onClick={() => setSearchOpen(true)}><Search size={16} /> <span>Search</span></button>
            <button className="icon-button" onClick={cycleTheme} aria-label={`Theme: ${theme}`}>
              {theme === 'dark' ? <Moon size={17} /> : theme === 'light' ? <Sun size={17} /> : <Sparkles size={17} />}
            </button>
            <button className="avatar" onClick={() => setPaletteOpen(true)} aria-label="Open command palette">R</button>
          </div>
        </header>

        <div className="capture-wrap">
          <Plus size={19} />
          <input ref={captureRef} value={capture} onChange={(e) => setCapture(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitCapture()} placeholder="Add anything… use ! for must remember" />
          <button onClick={submitCapture}>Add</button>
        </div>
        <div className="capture-hint"><Star size={12} /> Start with <kbd>!</kbd> or click a star to pin something above everything else.</div>

        {mustRemember.length ? (
          <section className="must-remember">
            <div className="must-remember-head">
              <div className="must-icon"><BellRing size={18} /></div>
              <div>
                <span>Must remember</span>
                <strong>{mustRemember.length === 1 ? 'One thing needs your attention' : `${mustRemember.length} things need your attention`}</strong>
              </div>
            </div>
            <div className="must-list">
              {mustRemember.map((item) => (
                <button key={`${item.collection}-${item.id}`} className="must-item" onClick={() => toggleImportant(item.collection, item.id)}>
                  <span className="must-kind">{item.kind}</span>
                  <span>{item.label}</span>
                  <Star size={14} fill="currentColor" />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <div className="content-grid">
          <div className="main-column">
            <Section title="Today" meta={`${todayTasks.length} open`}>
              <>
                {todayTasks.length ? todayTasks.map((task) => (
                  <Row key={task.id} done={task.done} important={task.important} onImportant={() => toggleImportant('tasks', task.id)} onToggle={() => toggle('tasks', task.id)} onDelete={() => remove('tasks', task.id)} right={<button className="row-action" onClick={() => startFocus(task.id)} aria-label="Focus on task"><ChevronRight size={16} /></button>}>
                    {task.title}
                  </Row>
                )) : <Empty>Your day is clear. Add one meaningful priority.</Empty>}
              </>
            </Section>

            <Section title="Next" meta="upcoming" action={<button className="text-button" onClick={() => setMeetingOpen(true)}><Plus size={15} /> meeting</button>}>
              {upcoming.length ? upcoming.map((meeting) => (
                <Row key={meeting.id} important={meeting.important} onImportant={() => toggleImportant('meetings', meeting.id)} onDelete={() => remove('meetings', meeting.id)} meta={meeting.objective} right={<div className="event-time"><strong>{meeting.date === iso() ? meeting.time : shortDate(meeting.date)}</strong><span>{meeting.date === iso() ? 'today' : meeting.time}</span></div>}>
                  {meeting.title}
                </Row>
              )) : <Empty>No upcoming meetings.</Empty>}
            </Section>

            <Section title="Waiting" meta={`${openFollowups.length} open`}>
              <>
                {openFollowups.length ? openFollowups.map((item) => (
                  <Row key={item.id} done={item.done} important={item.important} onImportant={() => toggleImportant('followups', item.id)} onToggle={() => toggle('followups', item.id)} onDelete={() => remove('followups', item.id)} meta={`${daysOld(item.since)} day${daysOld(item.since) === 1 ? '' : 's'} waiting`} right={daysOld(item.since) >= 4 ? <span className="stale-pill">stale</span> : null}>
                    {item.person} — {item.topic}
                  </Row>
                )) : <Empty>Nothing is waiting on someone else.</Empty>}
              </>
            </Section>

            <Section title="Do not forget" meta={`${openReminders.length} open`}>
              <>
                {openReminders.length ? openReminders.map((item) => (
                  <Row key={item.id} done={item.done} important={item.important} onImportant={() => toggleImportant('reminders', item.id)} onToggle={() => toggle('reminders', item.id)} onDelete={() => remove('reminders', item.id)}>
                    {item.title}
                  </Row>
                )) : <Empty>Nothing important is being held in your head.</Empty>}
              </>
            </Section>
          </div>

          <aside className="side-column">
            <Section title="Daily journal" meta="autosaved">
              {[
                ['wins', 'Wins', 'What moved forward?'],
                ['challenges', 'Challenges', 'What felt difficult?'],
                ['ideas', 'Ideas', 'Capture anything worth keeping.'],
                ['tomorrow', 'Tomorrow', 'What should lead tomorrow?'],
              ].map(([field, label, placeholder]) => (
                <label className="journal-field" key={field}>
                  <span>{label}</span>
                  <textarea value={journal[field] || ''} onChange={(e) => updateJournal(field, e.target.value)} placeholder={placeholder} />
                </label>
              ))}
            </Section>

            <Section title="Focus" meta="25 minutes">
              <p className="section-copy">Choose one task. Everything else disappears until the timer ends or you mark it done.</p>
              <button className="primary-button" onClick={() => startFocus()}><Focus size={16} /> Start focus</button>
            </Section>

            <Section title="Private backup" meta="local only">
              <p className="section-copy">Your information stays in this browser. Export a backup before changing devices or clearing browser data.</p>
              <div className="backup-actions">
                <button className="secondary-button" onClick={exportData}><Download size={15} /> Export</button>
                <button className="secondary-button" onClick={() => fileInput.current?.click()}><Upload size={15} /> Import</button>
                <input ref={fileInput} type="file" accept="application/json" hidden onChange={importData} />
              </div>
            </Section>
          </aside>
        </div>

        <footer>
          <span>Stored locally in this browser</span>
          <span>⌘K commands · / search · T new task · F focus</span>
        </footer>
      </main>

      <>
        {paletteOpen && (
          <Modal onClose={() => setPaletteOpen(false)}>
            <div className="modal-title"><Sparkles size={17} /> Command palette</div>
            <button className="command" onClick={() => { setPaletteOpen(false); captureRef.current?.focus(); }}><Plus size={17} /><span><strong>Add something</strong><small>Task, meeting, reminder or follow-up</small></span><kbd>T</kbd></button>
            <button className="command" onClick={() => { setPaletteOpen(false); setSearchOpen(true); }}><Search size={17} /><span><strong>Search everything</strong><small>Tasks, meetings, journal and follow-ups</small></span><kbd>/</kbd></button>
            <button className="command" onClick={() => startFocus()}><Focus size={17} /><span><strong>Start focus</strong><small>Begin a 25-minute session</small></span><kbd>F</kbd></button>
            <button className="command" onClick={() => { setPaletteOpen(false); setMeetingOpen(true); }}><CalendarDays size={17} /><span><strong>Add meeting</strong><small>Schedule the next commitment</small></span></button>
            <button className="command" onClick={exportData}><Archive size={17} /><span><strong>Export backup</strong><small>Download all local data</small></span></button>
          </Modal>
        )}

        {searchOpen && (
          <Modal onClose={() => setSearchOpen(false)} wide>
            <div className="search-box"><Search size={18} /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search everything…" /></div>
            <div className="search-results">
              {query && !searchResults.length ? <Empty>No results for “{query}”.</Empty> : null}
              {searchResults.map((item, index) => (
                <div className="search-result" key={`${item.type}-${index}`}>
                  <span>{item.type}</span>
                  <strong>{item.title}</strong>
                  <small>{item.meta}</small>
                </div>
              ))}
            </div>
          </Modal>
        )}

        {meetingOpen && <MeetingModal onClose={() => setMeetingOpen(false)} onSave={(meeting) => { updateCollection('meetings', (items) => [...items, meeting]); setMeetingOpen(false); }} />}

        {focusOpen && (
          <div className="focus-overlay">
            <button className="focus-close" onClick={() => setFocusOpen(false)}><X size={18} /></button>
            <div className="focus-inner">
              <span>Current focus</span>
              <h2>{focusTask?.title || 'Nothing urgent. Choose one meaningful task.'}</h2>
              <div className="timer">{String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}</div>
              <div className="focus-controls">
                <button onClick={() => { setRemaining(1500); setRunning(false); }}><RotateCcw size={16} /> Reset</button>
                <button className="focus-primary" onClick={() => setRunning((value) => !value)}>{running ? 'Pause' : remaining === 1500 ? 'Start' : 'Resume'}</button>
                <button onClick={() => { if (focusTask) toggle('tasks', focusTask.id); setFocusOpen(false); }}><Check size={16} /> Done</button>
              </div>
            </div>
          </div>
        )}
      </>
    </>
  );
}

function Modal({ children, onClose, wide = false }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`}>
        {children}
      </div>
    </div>
  );
}

function MeetingModal({ onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(iso());
  const [time, setTime] = useState('09:00');
  const [objective, setObjective] = useState('');
  return (
    <Modal onClose={onClose}>
      <div className="modal-title"><CalendarDays size={17} /> Add meeting</div>
      <div className="form-grid">
        <label><span>Title</span><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <div className="form-row">
          <label><span>Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label><span>Time</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
        </div>
        <label><span>Objective</span><input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="What outcome do you need?" /></label>
      </div>
      <div className="modal-actions">
        <button className="secondary-button" onClick={onClose}>Cancel</button>
        <button className="primary-button" disabled={!title.trim()} onClick={() => onSave({ id: uid(), title: title.trim(), date, time, objective: objective.trim(), important: false })}>Save meeting</button>
      </div>
    </Modal>
  );
}

createRoot(document.getElementById('root')).render(<App />);
