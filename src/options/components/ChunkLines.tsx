import { useMasteredWords } from "../hooks/useMasteredWords.ts";

interface ChunkLinesProps {
  chunked: string;
  newWords?: { word: string; definition: string }[];
}

export function ChunkLines({ chunked, newWords = [] }: ChunkLinesProps) {
  const { masteredWords } = useMasteredWords();

  const defMap = new Map<string, string>();
  const vocabSet = new Set<string>();
  for (const w of newWords) {
    const lower = w.word.toLowerCase();
    vocabSet.add(lower);
    defMap.set(lower, w.definition);
  }

  const lines = chunked.split("\n");

  return (
    <div className="chunk-lines">
      {lines.map((line, i) => {
        const trimmed = line.replace(/^ +/, "");
        const indent = line.length - trimmed.length;
        const isIndented = indent > 0;

        const parts = highlightVocab(trimmed, vocabSet, defMap, masteredWords);

        return (
          <div key={i} className={isIndented ? "indent" : ""}>
            {parts}
          </div>
        );
      })}
    </div>
  );
}

function highlightVocab(
  text: string,
  vocabSet: Set<string>,
  defMap: Map<string, string>,
  masteredWords: Set<string>
): React.ReactNode[] {
  if (vocabSet.size === 0) return [text];

  const pattern = Array.from(vocabSet)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const regex = new RegExp(`\\b(${pattern})\\b`, "gi");

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const wordLower = match[0].toLowerCase();
    const isMastered = masteredWords.has(wordLower);
    const def = defMap.get(wordLower) || "";
    parts.push(
      <span
        key={match.index}
        className={isMastered ? "vocab vocab-mastered" : "vocab"}
        data-word={wordLower}
        data-def={def}
      >
        {match[0]}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
