export type AchievementKey =
  | "perfect_round"
  | "chapter_champion"
  | "night_owl"
  | "jack_of_all_trades"
  | "the_completionist"
  | "century_scholar"
  | "thousand_strong"
  | "endurance_mode"
  | "polymath"
  | "comeback_kid";

export const ACHIEVEMENT_DEFINITIONS: Record<
  AchievementKey,
  { title: string; description: string; icon: string }
> = {
  perfect_round: {
    title: "Perfect Round",
    description: "Finish a session with 100% accuracy on at least 5 questions.",
    icon: "✨",
  },
  chapter_champion: {
    title: "Chapter Champion",
    description: "Complete every checkpoint in a single chapter without a miss.",
    icon: "📖",
  },
  night_owl: {
    title: "Night Owl",
    description: "Complete a session between 11pm and 5am.",
    icon: "🦉",
  },
  jack_of_all_trades: {
    title: "Jack of All Trades",
    description: "Study materials across 5 different subjects.",
    icon: "🎭",
  },
  the_completionist: {
    title: "The Completionist",
    description: "Reach 100% completion on any course.",
    icon: "🏁",
  },
  century_scholar: {
    title: "Century Scholar",
    description: "Answer 100 questions correctly across all sessions.",
    icon: "💯",
  },
  thousand_strong: {
    title: "Thousand Strong",
    description: "Score 1,000 or more points in a single session.",
    icon: "⚡",
  },
  endurance_mode: {
    title: "Endurance Mode",
    description: "Study for 3+ hours in one session.",
    icon: "⏱️",
  },
  polymath: {
    title: "Polymath",
    description: "Upload and play 10 or more courses.",
    icon: "🧠",
  },
  comeback_kid: {
    title: "Comeback Kid",
    description: "Finish strong after 5 wrong answers in a row in one session.",
    icon: "🔥",
  },
};

export const ACHIEVEMENT_KEYS = Object.keys(
  ACHIEVEMENT_DEFINITIONS,
) as AchievementKey[];
