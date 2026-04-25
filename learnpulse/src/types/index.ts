export interface User {
  id: string;
  username: string;
  createdAt: string;
}

export interface Course {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Checkpoint {
  id: string;
  courseId: string;
  userId: string;
  title: string;
  position: number;
  completed: boolean;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  courseId: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
}

export interface Achievement {
  id: string;
  userId: string;
  achievementKey: string;
  unlockedAt: string;
  metadata: Record<string, unknown>;
}

export interface WellnessLog {
  id: string;
  userId: string;
  loggedAt: string;
  mood: number | null;
  energy: number | null;
  notes: string | null;
}
