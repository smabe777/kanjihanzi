import { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import { strokeDataUrl } from '../decks.js';

// Stroke-by-stroke drawing quiz. For a card's first exposure (isNew) the
// outline is shown so the user traces it; afterwards they draw from memory.
export default function DrawQuiz({ deckId, char, isNew, onFinish }) {
  const containerRef = useRef(null);
  const writerRef = useRef(null);
  const statsRef = useRef({ mistakes: 0, hint: false, gaveUp: false });
  const [status, setStatus] = useState('drawing'); // 'drawing' | 'done'
  const [hintUsed, setHintUsed] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    el.innerHTML = '';
    statsRef.current = { mistakes: 0, hint: false, gaveUp: false };
    setStatus('drawing');
    setHintUsed(false);

    const size = Math.min(320, window.innerWidth - 64);
    const writer = HanziWriter.create(el, char, {
      width: size,
      height: size,
      padding: 12,
      showCharacter: false,
      showOutline: !!isNew,
      showHintAfterMisses: 2,
      strokeColor: '#e8e6e3',
      outlineColor: '#3a3f4b',
      drawingColor: '#e8e6e3',
      drawingWidth: 14,
      highlightColor: '#7aa2f7',
      charDataLoader: (c) => fetch(strokeDataUrl(deckId, c)).then((r) => {
        if (!r.ok) throw new Error(`No stroke data for ${c}`);
        return r.json();
      }),
    });
    writerRef.current = writer;

    writer.quiz({
      onMistake: () => {
        statsRef.current.mistakes += 1;
      },
      onComplete: () => {
        const { mistakes, hint } = statsRef.current;
        setStatus('done');
        onFinish({ mistakes, hint, gaveUp: false });
      },
    });

    return () => {
      try {
        writer.cancelQuiz();
      } catch {
        /* writer may already be torn down */
      }
      el.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char, deckId, isNew]);

  const showHint = () => {
    statsRef.current.hint = true;
    setHintUsed(true);
    writerRef.current?.showOutline();
  };

  const giveUp = () => {
    statsRef.current.gaveUp = true;
    const writer = writerRef.current;
    writer.cancelQuiz();
    writer.showOutline();
    writer.animateCharacter();
    setStatus('done');
    onFinish({ mistakes: statsRef.current.mistakes, hint: hintUsed, gaveUp: true });
  };

  return (
    <div className="draw-quiz">
      <div className="writer-box" ref={containerRef} />
      {status === 'drawing' && (
        <div className="quiz-actions">
          <button className="ghost" onClick={showHint} disabled={hintUsed || isNew}>
            Hint (outline)
          </button>
          <button className="ghost" onClick={giveUp}>
            Show me
          </button>
        </div>
      )}
    </div>
  );
}
