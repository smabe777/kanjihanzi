import { useCallback, useEffect, useRef, useState } from 'react';
import { gradeCard } from '../srs.js';
import { nextCard, introduceChar, cardId, dueCounts, newRemainingToday } from '../queue.js';
import { meaningOf, readingOf } from '../decks.js';
import DrawQuiz from './DrawQuiz.jsx';
import GradeBar from './GradeBar.jsx';

export default function Session({ deck, deckState, newPerDay, updateDeck, onExit }) {
  const [current, setCurrent] = useState(null); // { card, entry, phase, drawResult }
  const [waitMs, setWaitMs] = useState(null);
  const [done, setDone] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const lastGradedRef = useRef(null);

  const pick = useCallback(() => {
    const now = Date.now();
    const res = nextCard(deckState, deck.list, newPerDay, now);
    if (res.introduce) {
      updateDeck((d) => introduceChar(d, res.introduce, Date.now()));
      return; // effect re-runs once the deck state includes the new cards
    }
    if (res.done) {
      setDone(true);
      setWaitMs(null);
      return;
    }
    if (res.card) {
      const id = cardId(res.card.char, res.card.type);
      // Don't re-show the card we just graded before its step delay elapses.
      if (res.card.due > now && id === lastGradedRef.current) {
        setWaitMs(res.card.due - now);
        return;
      }
      setWaitMs(null);
      setCurrent({
        card: res.card,
        entry: deck.byChar.get(res.card.char),
        phase: res.card.type === 'recog' ? (res.card.reps === 0 ? 'back' : 'front') : 'drawing',
        drawResult: null,
      });
      return;
    }
    setWaitMs(res.waitMs);
  }, [deckState, deck, newPerDay, updateDeck]);

  useEffect(() => {
    if (!current && !done) pick();
  }, [current, done, pick]);

  // Countdown while waiting on a learning step.
  useEffect(() => {
    if (waitMs === null) return;
    const t = setInterval(() => {
      setWaitMs((w) => {
        if (w !== null && w <= 1000) {
          lastGradedRef.current = null;
          clearInterval(t);
          setCurrent(null); // triggers a re-pick
          return null;
        }
        return w === null ? null : w - 1000;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [waitMs === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const grade = useCallback(
    (g) => {
      if (!current) return;
      const graded = gradeCard(current.card, g, Date.now());
      lastGradedRef.current = cardId(graded.char, graded.type);
      updateDeck((d) => ({ ...d, cards: { ...d.cards, [cardId(graded.char, graded.type)]: graded } }));
      setDoneCount((n) => n + 1);
      setCurrent(null);
    },
    [current, updateDeck]
  );

  // Space reveals the answer on recognition fronts.
  useEffect(() => {
    if (!current || current.phase !== 'front') return;
    const handler = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setCurrent((c) => ({ ...c, phase: 'back' }));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [current?.phase === 'front']); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = dueCounts(deckState);
  const newLeft = Math.min(
    newRemainingToday(deckState, newPerDay),
    deck.list.filter((e) => !deckState.cards[cardId(e.char, 'recog')]).length
  );

  return (
    <div className="session">
      <header className="session-header">
        <button className="ghost" onClick={onExit}>← Back</button>
        <div className="session-counts">
          <span className="count count-new" title="New characters left today">{newLeft}</span>
          <span className="count count-learn" title="Learning cards">{counts.learn}</span>
          <span className="count count-review" title="Reviews due">{counts.review}</span>
        </div>
        <span className="session-done">{doneCount} done</span>
      </header>

      {done && (
        <div className="session-message">
          <div className="big-emoji">🎉</div>
          <h2>All caught up!</h2>
          <p>No more cards due today in {deck.name}. Come back tomorrow.</p>
          <button onClick={onExit}>Back to decks</button>
        </div>
      )}

      {!done && waitMs !== null && (
        <div className="session-message">
          <h2>Next card in {Math.ceil(waitMs / 1000)}s</h2>
          <p>A learning card is almost due. You can wait or stop here.</p>
          <button onClick={onExit}>Finish session</button>
        </div>
      )}

      {!done && waitMs === null && current && (
        <CardView key={cardId(current.card.char, current.card.type) + current.card.reps}
          deck={deck} current={current} setCurrent={setCurrent} grade={grade} />
      )}
    </div>
  );
}

function CardView({ deck, current, setCurrent, grade }) {
  const { card, entry, phase, drawResult } = current;
  const isNew = card.reps === 0;

  if (card.type === 'recog') {
    return (
      <div className="card-area">
        <div className="card-prompt">
          {isNew ? <span className="badge badge-new">New character</span> : 'What does this mean? How is it read?'}
        </div>
        <div className="big-char">{entry.char}</div>
        {phase === 'front' ? (
          <button className="reveal" onClick={() => setCurrent((c) => ({ ...c, phase: 'back' }))}>
            Show answer <kbd>space</kbd>
          </button>
        ) : (
          <>
            <div className="answer">
              <div className="answer-meaning">{meaningOf(deck.id, entry)}</div>
              <div className="answer-reading">{readingOf(deck.id, entry)}</div>
              <div className="answer-meta">#{entry.rank} by frequency · {entry.strokes} strokes</div>
            </div>
            <GradeBar card={card} onGrade={grade} suggested={isNew ? 3 : null} />
          </>
        )}
      </div>
    );
  }

  // draw card
  const suggested =
    drawResult == null ? null
      : drawResult.gaveUp ? 0
      : drawResult.mistakes === 0 && !drawResult.hint ? 3
      : drawResult.mistakes <= 2 ? 2
      : 0;

  return (
    <div className="card-area">
      <div className="card-prompt">
        {isNew ? <span className="badge badge-new">New — trace the strokes</span> : 'Draw this character'}
      </div>
      <div className="answer">
        <div className="answer-meaning">{meaningOf(deck.id, entry)}</div>
        <div className="answer-reading">{readingOf(deck.id, entry)}</div>
      </div>
      <DrawQuiz
        deckId={deck.id}
        char={entry.char}
        isNew={isNew}
        onFinish={(result) => setCurrent((c) => ({ ...c, drawResult: result, phase: 'grade' }))}
      />
      {phase === 'grade' && (
        <>
          <div className="draw-result">
            {drawResult.gaveUp
              ? 'Shown — try to remember it next time.'
              : drawResult.mistakes === 0
                ? 'Perfect, no mistakes!'
                : `${drawResult.mistakes} stroke mistake${drawResult.mistakes > 1 ? 's' : ''}${drawResult.hint ? ' (hint used)' : ''}`}
          </div>
          <GradeBar card={card} onGrade={grade} suggested={suggested} />
        </>
      )}
    </div>
  );
}
