import { useEffect } from 'react';
import { GRADES, previewInterval } from '../srs.js';

// The four Anki-style grade buttons with interval previews.
// `suggested` (a grade value) gets highlighted; keys 1-4 also grade.
export default function GradeBar({ card, onGrade, suggested = null }) {
  useEffect(() => {
    const handler = (e) => {
      const g = GRADES.find((g) => g.key === e.key);
      if (g) onGrade(g.value);
      if (e.key === ' ' && suggested !== null) {
        e.preventDefault();
        onGrade(suggested);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onGrade, suggested]);

  return (
    <div className="grade-bar">
      {GRADES.map((g) => (
        <button
          key={g.value}
          className={`grade grade-${g.label.toLowerCase()} ${suggested === g.value ? 'suggested' : ''}`}
          onClick={() => onGrade(g.value)}
        >
          <span className="grade-label">{g.label}</span>
          <span className="grade-interval">{previewInterval(card, g.value)}</span>
        </button>
      ))}
    </div>
  );
}
