interface VocabPillProps {
  word: string;
  definition: string;
  mastered?: boolean;
  onToggleMastered?: () => void;
}

export function VocabPill({ word, definition, mastered, onToggleMastered }: VocabPillProps) {
  return (
    <div className="sent-vocab-pill">
      <span className="sent-vocab-word">{word}</span>
      <span className="sent-vocab-def">{definition}</span>
      {onToggleMastered && (
        <button className="sent-vocab-check" onClick={(e) => { e.stopPropagation(); onToggleMastered(); }} type="button">
          {mastered ? "✓ 已掌握" : "标记掌握"}
        </button>
      )}
    </div>
  );
}
