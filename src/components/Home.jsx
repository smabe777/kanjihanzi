import { dueCounts, newRemainingToday, cardId } from '../queue.js';
import { DECKS } from '../decks.js';

export default function Home({ state, auth, syncStatus, onStudy, onBrowse, onSettings }) {
  return (
    <div className="home">
      <h1 className="app-title">漢字 · 汉字 Trainer</h1>
      <p className="app-subtitle">Learn to read and write the 2000 most used characters</p>

      <div className="deck-grid">
        {Object.values(DECKS).map((deck) => {
          const ds = state.decks[deck.id];
          const counts = dueCounts(ds);
          const started = Object.keys(ds.cards).length / 2;
          const newLeft = Math.min(
            newRemainingToday(ds, state.settings.newPerDay),
            deck.list.filter((e) => !ds.cards[cardId(e.char, 'recog')]).length
          );
          const total = counts.learn + counts.review + newLeft;
          return (
            <div key={deck.id} className="deck-card" style={{ '--accent': deck.accent }}>
              <div className="deck-glyph">{deck.id === 'ja' ? '日' : '中'}</div>
              <h2>{deck.name}</h2>
              <p className="deck-sub">{deck.subtitle}</p>
              <div className="deck-stats">
                <span className="count count-new" title="New today">{newLeft} new</span>
                <span className="count count-learn" title="Learning">{counts.learn} learning</span>
                <span className="count count-review" title="Due reviews">{counts.review} due</span>
              </div>
              <div className="deck-progress">
                <div className="deck-progress-bar" style={{ width: `${(counts.known / deck.list.length) * 100}%` }} />
              </div>
              <p className="deck-progress-label">{counts.known} / {deck.list.length} known · {Math.round(started)} started</p>
              <div className="deck-actions">
                <button className="primary" onClick={() => onStudy(deck.id)} disabled={total === 0}>
                  {total === 0 ? 'Done for today ✓' : `Study (${total})`}
                </button>
                <button className="ghost" onClick={() => onBrowse(deck.id)}>Characters</button>
              </div>
            </div>
          );
        })}
      </div>

      <button className="ghost settings-link" onClick={onSettings}>⚙ Settings</button>
      <p className="sync-line">
        {auth
          ? `☁ ${auth.email} · ${syncStatus === 'error' ? 'sync error — see Settings' : syncStatus === 'syncing' ? 'syncing…' : 'synced'}`
          : 'Not logged in — progress stays in this browser (sync in Settings)'}
      </p>
    </div>
  );
}
