import { useRef, useState } from 'react';
import { exportState, importStateFile } from '../storage.js';
import { DECKS } from '../decks.js';

export default function Settings({
  state,
  mutateState,
  replaceState,
  auth,
  syncStatus,
  syncError,
  onLogin,
  onLogout,
  onExit,
}) {
  const fileRef = useRef(null);

  const setNewPerDay = (n) => {
    mutateState((s) => ({ ...s, settings: { ...s.settings, newPerDay: n } }));
  };

  const resetDeck = (deckId) => {
    if (!window.confirm(`Reset ALL progress for ${DECKS[deckId].name}? This cannot be undone.`)) return;
    mutateState((s) => ({
      ...s,
      decks: { ...s.decks, [deckId]: { cards: {}, newDate: '', newToday: 0 } },
    }));
  };

  const onImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importStateFile(file)
      .then((imported) => {
        replaceState(imported);
        alert('Progress imported.');
      })
      .catch((err) => alert(`Import failed: ${err.message}`));
    e.target.value = '';
  };

  return (
    <div className="settings">
      <header className="session-header">
        <button className="ghost" onClick={onExit}>← Back</button>
        <h2>Settings</h2>
        <span />
      </header>

      <AccountSection
        auth={auth}
        syncStatus={syncStatus}
        syncError={syncError}
        onLogin={onLogin}
        onLogout={onLogout}
      />

      <section>
        <h3>New characters per day</h3>
        <p className="hint-text">Each new character adds two cards: recognition and drawing.</p>
        <div className="npd-row">
          {[5, 10, 15, 20, 30].map((n) => (
            <button
              key={n}
              className={state.settings.newPerDay === n ? 'primary' : 'ghost'}
              onClick={() => setNewPerDay(n)}
            >
              {n}
            </button>
          ))}
          <input
            type="number"
            min="0"
            max="100"
            value={state.settings.newPerDay}
            onChange={(e) => setNewPerDay(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
          />
        </div>
      </section>

      <section>
        <h3>Backup</h3>
        <p className="hint-text">
          {auth
            ? 'Your progress syncs to your account automatically. Export is still handy as an extra backup.'
            : 'Progress lives in this browser. Export regularly to keep a backup, or log in above to sync.'}
        </p>
        <div className="npd-row">
          <button onClick={() => exportState(state)}>Export progress</button>
          <button className="ghost" onClick={() => fileRef.current.click()}>Import progress</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={onImport} />
        </div>
      </section>

      <section>
        <h3>Danger zone</h3>
        <div className="npd-row">
          <button className="danger" onClick={() => resetDeck('ja')}>Reset Kanji progress</button>
          <button className="danger" onClick={() => resetDeck('zh')}>Reset Hanzi progress</button>
        </div>
      </section>
    </div>
  );
}

function AccountSection({ auth, syncStatus, syncError, onLogin, onLogout }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (mode) => {
    setBusy(true);
    setError(null);
    try {
      await onLogin(mode, email, password);
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (auth) {
    return (
      <section>
        <h3>Account & sync</h3>
        <p className="hint-text">
          Logged in as <strong>{auth.email}</strong> —{' '}
          {syncStatus === 'syncing' && 'syncing…'}
          {syncStatus === 'synced' && 'progress synced ✓'}
          {syncStatus === 'idle' && 'connected'}
          {syncStatus === 'error' && <span className="error-text">sync error: {syncError}</span>}
        </p>
        <div className="npd-row">
          <button className="ghost" onClick={onLogout}>Log out</button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h3>Account & sync</h3>
      <p className="hint-text">
        Create a free account to sync your progress across devices. Without it, progress stays in this browser only.
      </p>
      <div className="npd-row auth-form">
        <input
          type="email"
          placeholder="email"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="password (min 8 chars)"
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="primary" disabled={busy || !email || !password} onClick={() => submit('login')}>
          Log in
        </button>
        <button className="ghost" disabled={busy || !email || !password} onClick={() => submit('register')}>
          Create account
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}
