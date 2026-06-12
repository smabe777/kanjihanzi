import { useEffect, useRef, useState, useCallback } from 'react';
import { loadState, saveState, normalizeState, loadAuth, saveAuth } from './storage.js';
import { apiRegister, apiLogin, apiGetProgress, apiPutProgress } from './api.js';
import { rollDay } from './queue.js';
import { DECKS } from './decks.js';
import Home from './components/Home.jsx';
import Session from './components/Session.jsx';
import Browse from './components/Browse.jsx';
import Settings from './components/Settings.jsx';

export default function App() {
  const [state, setState] = useState(() => {
    const s = loadState();
    return { ...s, decks: { ja: rollDay(s.decks.ja), zh: rollDay(s.decks.zh) } };
  });
  const [view, setView] = useState({ screen: 'home', deck: null });
  const [auth, setAuth] = useState(loadAuth);
  const [syncStatus, setSyncStatus] = useState(auth ? 'idle' : 'off'); // off | idle | syncing | synced | error
  const [syncError, setSyncError] = useState(null);
  const lastPushedRef = useRef(0);
  const pushTimerRef = useRef(null);

  // Adopt a remote progress snapshot without re-triggering a push.
  const adoptRemote = useCallback((progress, updatedAt) => {
    lastPushedRef.current = updatedAt;
    const s = normalizeState({ ...progress, updatedAt });
    setState({ ...s, decks: { ja: rollDay(s.decks.ja), zh: rollDay(s.decks.zh) } });
  }, []);

  // Any user-driven change goes through this so updatedAt is bumped.
  const mutateState = useCallback((updater) => {
    setState((s) => ({ ...updater(s), updatedAt: Date.now() }));
  }, []);

  const updateDeck = useCallback(
    (deckId) => (updater) => {
      mutateState((s) => ({
        ...s,
        decks: { ...s.decks, [deckId]: updater(rollDay(s.decks[deckId])) },
      }));
    },
    [mutateState]
  );

  // On startup with a saved login, pull remote progress if it's newer.
  useEffect(() => {
    if (!auth) return;
    let cancelled = false;
    setSyncStatus('syncing');
    apiGetProgress(auth.token)
      .then(({ progress, updatedAt }) => {
        if (cancelled) return;
        if (progress && updatedAt > (loadState().updatedAt || 0)) {
          adoptRemote(progress, updatedAt);
        }
        setSyncStatus('synced');
        setSyncError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 401) {
          setAuth(null);
          saveAuth(null);
          setSyncStatus('off');
        } else {
          setSyncStatus('error');
          setSyncError(err.message);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  // Persist locally and push to the server (debounced) on every change.
  useEffect(() => {
    saveState(state);
    if (!auth || !state.updatedAt || state.updatedAt <= lastPushedRef.current) return;
    clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      const { updatedAt, ...progress } = state;
      setSyncStatus('syncing');
      apiPutProgress(auth.token, progress, updatedAt)
        .then(() => {
          lastPushedRef.current = updatedAt;
          setSyncStatus('synced');
          setSyncError(null);
        })
        .catch((err) => {
          if (err.status === 409) {
            // Another device pushed newer progress; adopt it.
            return apiGetProgress(auth.token).then(({ progress: p, updatedAt: u }) => {
              if (p) adoptRemote(p, u);
              setSyncStatus('synced');
            });
          }
          setSyncStatus('error');
          setSyncError(err.message);
        });
    }, 1500);
    return () => clearTimeout(pushTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, auth?.token]);

  const login = useCallback(
    async (mode, email, password) => {
      const res = mode === 'register' ? await apiRegister(email, password) : await apiLogin(email, password);
      const newAuth = { token: res.token, email: res.email };
      setAuth(newAuth);
      saveAuth(newAuth);
      lastPushedRef.current = 0;
      if (res.progress && res.updatedAt > (state.updatedAt || 0)) {
        adoptRemote(res.progress, res.updatedAt);
      } else {
        // Local is newer (or account is empty): make sure it gets pushed.
        setState((s) => ({ ...s, updatedAt: s.updatedAt || Date.now() }));
      }
      setSyncStatus('synced');
      setSyncError(null);
    },
    [state.updatedAt, adoptRemote]
  );

  const logout = useCallback(() => {
    setAuth(null);
    saveAuth(null);
    setSyncStatus('off');
    setSyncError(null);
  }, []);

  if (view.screen === 'study') {
    return (
      <Session
        deck={DECKS[view.deck]}
        deckState={state.decks[view.deck]}
        newPerDay={state.settings.newPerDay}
        updateDeck={updateDeck(view.deck)}
        onExit={() => setView({ screen: 'home' })}
      />
    );
  }
  if (view.screen === 'browse') {
    return (
      <Browse
        deck={DECKS[view.deck]}
        deckState={state.decks[view.deck]}
        onExit={() => setView({ screen: 'home' })}
      />
    );
  }
  if (view.screen === 'settings') {
    return (
      <Settings
        state={state}
        mutateState={mutateState}
        replaceState={(s) => mutateState(() => normalizeState(s))}
        auth={auth}
        syncStatus={syncStatus}
        syncError={syncError}
        onLogin={login}
        onLogout={logout}
        onExit={() => setView({ screen: 'home' })}
      />
    );
  }
  return (
    <Home
      state={state}
      auth={auth}
      syncStatus={syncStatus}
      onStudy={(deck) => setView({ screen: 'study', deck })}
      onBrowse={(deck) => setView({ screen: 'browse', deck })}
      onSettings={() => setView({ screen: 'settings' })}
    />
  );
}
