export type AchievementKey =
  | "first_steps"
  | "quiz_starter"
  | "practice_habit"
  | "focus_marathon"
  | "perfect_round"
  | "chapter_champion"
  | "accuracy_ace"
  | "consistency_star"
  | "quick_thinker"
  | "speed_runner"
  | "zen_master"
  | "story_weaver"
  | "night_owl"
  | "jack_of_all_trades"
  | "the_completionist"
  | "century_scholar"
  | "double_century"
  | "thousand_strong"
  | "legend_score"
  | "endurance_mode"
  | "polymath"
  | "grand_polymath"
  | "comeback_kid";

export const ACHIEVEMENT_DEFINITIONS: Record<
  AchievementKey,
  { title: string; description: string; icon: string }
> = {
  first_steps: {
    title: "First Steps",
    description: "Complete your first study session.",
    icon: "🌱",
  },
  quiz_starter: {
    title: "Quiz Starter",
    description: "Complete 5 study sessions.",
    icon: "🎯",
  },
  practice_habit: {
    title: "Practice Habit",
    description: "Complete 25 study sessions.",
    icon: "📆",
  },
  focus_marathon: {
    title: "Focus Marathon",
    description: "Complete 50 study sessions.",
    icon: "🏃",
  },
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
  accuracy_ace: {
    title: "Accuracy Ace",
    description: "Finish a session with 90%+ accuracy.",
    icon: "🎖️",
  },
  consistency_star: {
    title: "Consistency Star",
    description: "Maintain 80%+ average accuracy across completed sessions.",
    icon: "⭐",
  },
  quick_thinker: {
    title: "Quick Thinker",
    description: "Complete a session in 5 minutes or less with 80%+ accuracy.",
    icon: "⚡",
  },
  speed_runner: {
    title: "Speed Runner",
    description: "Complete 5 sessions in speed mode.",
    icon: "💨",
  },
  zen_master: {
    title: "Zen Master",
    description: "Complete 10 sessions in zen mode.",
    icon: "🧘",
  },
  story_weaver: {
    title: "Story Weaver",
    description: "Complete 10 sessions in story mode.",
    icon: "📚",
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
  double_century: {
    title: "Double Century",
    description: "Answer 200 questions correctly across all sessions.",
    icon: "🏆",
  },
  thousand_strong: {
    title: "Thousand Strong",
    description: "Score 1,000 or more points in a single session.",
    icon: "⚡",
  },
  legend_score: {
    title: "Legend Score",
    description: "Score 2,000 or more points in a single session.",
    icon: "👑",
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
  grand_polymath: {
    title: "Grand Polymath",
    description: "Upload and play 20 or more courses.",
    icon: "🛰️",
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
