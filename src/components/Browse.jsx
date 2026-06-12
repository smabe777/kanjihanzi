import { useState } from 'react';
import { cardId } from '../queue.js';
import { meaningOf, readingOf } from '../decks.js';

const PAGE = 200;

export default function Browse({ deck, deckState, onExit }) {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const pages = Math.ceil(deck.list.length / PAGE);
  const slice = deck.list.slice(page * PAGE, (page + 1) * PAGE);

  const stateOf = (char) => {
    const recog = deckState.cards[cardId(char, 'recog')];
    const draw = deckState.cards[cardId(char, 'draw')];
    if (!recog) return 'unseen';
    if (recog.state === 'review' && draw?.state === 'review') return 'known';
    return 'learning';
  };

  return (
    <div className="browse">
      <header className="session-header">
        <button className="ghost" onClick={onExit}>← Back</button>
        <h2>{deck.name} · #{page * PAGE + 1}–{Math.min((page + 1) * PAGE, deck.list.length)}</h2>
        <div className="pager">
          <button className="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button>
          <button className="ghost" disabled={page === pages - 1} onClick={() => setPage(page + 1)}>›</button>
        </div>
      </header>

      <div className="legend">
        <span><i className="dot dot-unseen" /> not started</span>
        <span><i className="dot dot-learning" /> learning</span>
        <span><i className="dot dot-known" /> known</span>
      </div>

      <div className="char-grid">
        {slice.map((entry) => (
          <button
            key={entry.char}
            className={`char-cell cell-${stateOf(entry.char)}`}
            title={`#${entry.rank} ${meaningOf(deck.id, entry)}`}
            onClick={() => setSelected(entry)}
          >
            {entry.char}
          </button>
        ))}
      </div>

      {selected && (
        <div className="char-detail" onClick={() => setSelected(null)}>
          <div className="char-detail-box" onClick={(e) => e.stopPropagation()}>
            <div className="big-char">{selected.char}</div>
            <div className="answer-meaning">{meaningOf(deck.id, selected)}</div>
            <div className="answer-reading">{readingOf(deck.id, selected)}</div>
            <div className="answer-meta">#{selected.rank} by frequency · {selected.strokes} strokes</div>
            <button className="ghost" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
