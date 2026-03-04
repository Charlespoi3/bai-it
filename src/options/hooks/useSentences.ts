import { useState, useEffect, useCallback, useRef } from "react";
import type { LearningRecord, PatternKey, PendingSentenceRecord, BackgroundMessage } from "../../shared/types.ts";
import { learningRecordDAO, pendingSentenceDAO } from "../../shared/db.ts";
import { EXAMPLE_SENTENCES } from "../exampleData.ts";

// ========== 混合数据类型 ==========

export type SentenceItem =
  | { type: "analyzed"; record: LearningRecord }
  | { type: "pending"; pending: PendingSentenceRecord; analyzing: boolean; error?: string };

const PAGE_SIZE = 10;

export function useSentences(db: IDBDatabase | null, isExample?: boolean) {
  const [items, setItems] = useState<SentenceItem[]>([]);
  const [filter, setFilter] = useState<PatternKey | "all">("all");
  const [loading, setLoading] = useState(true);
  const [examplePatterns, setExamplePatterns] = useState<PatternKey[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const analyzingIdsRef = useRef(new Set<string>());

  // Load data
  const loadData = useCallback(async () => {
    if (isExample) {
      setItems(EXAMPLE_SENTENCES.records.map(r => ({ type: "analyzed" as const, record: r })));
      setExamplePatterns(EXAMPLE_SENTENCES.availablePatterns);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    if (!db) return;

    // Check pending_sentences first
    const { records: pendingRecords, total: pendingTotal } = await pendingSentenceDAO.getPage(db, page, PAGE_SIZE);

    if (pendingTotal > 0) {
      setTotalPages(Math.ceil(pendingTotal / PAGE_SIZE));

      // Build items: for analyzed ones, load their LearningRecord
      const sentenceItems: SentenceItem[] = [];
      for (const pending of pendingRecords) {
        if (pending.analyzed) {
          const lr = await learningRecordDAO.getBySentence(db, pending.text);
          if (lr) {
            sentenceItems.push({ type: "analyzed", record: lr });
          } else {
            sentenceItems.push({ type: "pending", pending, analyzing: false });
          }
        } else {
          const isAnalyzing = analyzingIdsRef.current.has(pending.id);
          sentenceItems.push({ type: "pending", pending, analyzing: isAnalyzing });
        }
      }
      setItems(sentenceItems);

      // Auto-trigger analysis for unanalyzed items
      const unanalyzedIds = pendingRecords
        .filter(r => !r.analyzed && !analyzingIdsRef.current.has(r.id))
        .map(r => r.id);

      if (unanalyzedIds.length > 0) {
        for (const id of unanalyzedIds) {
          analyzingIdsRef.current.add(id);
        }
        // Update items to show analyzing state
        setItems(prev => prev.map(item =>
          item.type === "pending" && unanalyzedIds.includes(item.pending.id)
            ? { ...item, analyzing: true }
            : item
        ));
        chrome.runtime.sendMessage({ type: "analyzeSentences", sentenceIds: unanalyzedIds }).catch(() => {});
      }
    } else {
      // No pending sentences — show learning_records directly
      const allLR = await learningRecordDAO.getAll(db);
      if (allLR.length > 0) {
        const sorted = [...allLR].sort((a, b) => b.created_at - a.created_at);
        setItems(sorted.map(r => ({ type: "analyzed" as const, record: r })));
        setTotalPages(1);
      } else if (isExample) {
        setItems(EXAMPLE_SENTENCES.records.map(r => ({ type: "analyzed" as const, record: r })));
        setExamplePatterns(EXAMPLE_SENTENCES.availablePatterns);
        setTotalPages(1);
      } else {
        setItems([]);
        setTotalPages(1);
      }
    }

    setLoading(false);
  }, [db, isExample, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for analysis results from Background
  useEffect(() => {
    if (isExample || !db) return;

    const listener = (message: BackgroundMessage) => {
      if (message.type === "sentenceAnalyzed") {
        const { pendingId, learningRecord } = message;
        analyzingIdsRef.current.delete(pendingId);
        setItems(prev => prev.map(item => {
          if (item.type === "pending" && item.pending.id === pendingId) {
            return { type: "analyzed", record: learningRecord };
          }
          return item;
        }));
      } else if (message.type === "sentenceAnalysisFailed") {
        const { pendingId, error } = message;
        analyzingIdsRef.current.delete(pendingId);
        setItems(prev => prev.map(item => {
          if (item.type === "pending" && item.pending.id === pendingId) {
            return { ...item, analyzing: false, error };
          }
          return item;
        }));
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [db, isExample]);

  // Filtering
  const filtered = filter === "all"
    ? items
    : items.filter(item => {
        if (item.type === "analyzed") return item.record.pattern_key === filter;
        return false; // pending items don't have pattern_key yet
      });

  // Collect available pattern keys
  const availablePatterns = isExample
    ? examplePatterns
    : (Array.from(
        new Set(
          items
            .filter((i): i is SentenceItem & { type: "analyzed" } => i.type === "analyzed")
            .map(i => i.record.pattern_key)
            .filter(Boolean)
        )
      ) as PatternKey[]);

  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    items: filtered,
    filter,
    setFilter,
    availablePatterns,
    loading,
    page,
    setPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
  };
}
