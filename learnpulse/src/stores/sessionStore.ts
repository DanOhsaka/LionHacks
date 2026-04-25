import { create } from "zustand";

export type GameMode = "speed" | "zen" | "story";

export interface GameCheckpoint {
  id: string;
  chapter_index: number;
  chapter_title: string;
  position: number;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

interface SessionState {
  sessionId: string | null;
  courseId: string | null;
  mode: GameMode | null;
  mood: number | null;
  checkpoints: GameCheckpoint[];
  currentIndex: number;
  score: number;
  combo: number;
  correctStreak: number;
  wrongStreak: number;
  maxWrongStreak: number;
  correctCount: number;
  wrongCount: number;
  startedAt: number | null;
  narrativeBeat: number;
  setSessionMeta: (meta: {
    sessionId: string;
    courseId: string;
    mode: GameMode;
    mood: number | null;
    checkpoints: GameCheckpoint[];
  }) => void;
  resetGame: () => void;
  nextQuestion: () => void;
  recordCorrect: (points: number) => void;
  recordWrong: () => void;
  advanceNarrative: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  courseId: null,
  mode: null,
  mood: null,
  checkpoints: [],
  currentIndex: 0,
  score: 0,
  combo: 0,
  correctStreak: 0,
  wrongStreak: 0,
  maxWrongStreak: 0,
  correctCount: 0,
  wrongCount: 0,
  startedAt: null,
  narrativeBeat: 0,
  setSessionMeta: (meta) =>
    set({
      sessionId: meta.sessionId,
      courseId: meta.courseId,
      mode: meta.mode,
      mood: meta.mood,
      checkpoints: meta.checkpoints,
      currentIndex: 0,
      score: 0,
      combo: 0,
      correctStreak: 0,
      wrongStreak: 0,
      maxWrongStreak: 0,
      correctCount: 0,
      wrongCount: 0,
      startedAt: Date.now(),
      narrativeBeat: 0,
    }),
  resetGame: () =>
    set({
      sessionId: null,
      courseId: null,
      mode: null,
      mood: null,
      checkpoints: [],
      currentIndex: 0,
      score: 0,
      combo: 0,
      correctStreak: 0,
      wrongStreak: 0,
      maxWrongStreak: 0,
      correctCount: 0,
      wrongCount: 0,
      startedAt: null,
      narrativeBeat: 0,
    }),
  nextQuestion: () =>
    set((s) => ({
      currentIndex: Math.min(s.currentIndex + 1, s.checkpoints.length),
    })),
  recordCorrect: (points) =>
    set((s) => {
      const combo = s.combo + 1;
      const correctStreak = s.correctStreak + 1;
      return {
        score: s.score + points,
        combo,
        correctStreak,
        wrongStreak: 0,
        correctCount: s.correctCount + 1,
      };
    }),
  recordWrong: () =>
    set((s) => {
      const wrongStreak = s.wrongStreak + 1;
      return {
        combo: 0,
        correctStreak: 0,
        wrongStreak,
        maxWrongStreak: Math.max(s.maxWrongStreak, wrongStreak),
        wrongCount: s.wrongCount + 1,
      };
    }),
  advanceNarrative: () => set((s) => ({ narrativeBeat: s.narrativeBeat + 1 })),
}));
