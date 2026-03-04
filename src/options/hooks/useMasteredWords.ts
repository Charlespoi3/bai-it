import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { vocabDAO } from "../../shared/db.ts";

interface MasteredWordsContextValue {
  masteredWords: Set<string>;
  toggleMastered: (word: string) => void;
}

const defaultValue: MasteredWordsContextValue = {
  masteredWords: new Set(),
  toggleMastered: () => {},
};

export const MasteredWordsContext = createContext<MasteredWordsContextValue>(defaultValue);

export function useMasteredWordsProvider(db: IDBDatabase | null) {
  const [masteredWords, setMasteredWords] = useState<Set<string>>(new Set());
  const setRef = useRef(masteredWords);
  setRef.current = masteredWords;

  // Load from chrome.storage.local on mount
  useEffect(() => {
    chrome.storage.local.get({ knownWords: [] }, (result) => {
      const words = result.knownWords as string[];
      if (words.length > 0) {
        setMasteredWords(new Set(words.map((w) => w.toLowerCase())));
      }
    });
  }, []);

  const toggleMastered = useCallback(
    (word: string) => {
      const lower = word.toLowerCase();
      const current = setRef.current;
      const next = new Set(current);
      const wasMastered = current.has(lower);

      if (wasMastered) {
        next.delete(lower);
      } else {
        next.add(lower);
      }

      setMasteredWords(next);
      chrome.storage.local.set({ knownWords: [...next] });

      // Sync to IndexedDB if available
      if (db) {
        vocabDAO.getByWord(db, lower).then((record) => {
          if (record) {
            if (wasMastered) {
              vocabDAO.update(db, record.id, { status: "new", mastered_at: undefined });
            } else {
              vocabDAO.markMastered(db, record.id);
            }
          }
        });
      }
    },
    [db]
  );

  return { masteredWords, toggleMastered };
}

export function useMasteredWords(): MasteredWordsContextValue {
  return useContext(MasteredWordsContext);
}
