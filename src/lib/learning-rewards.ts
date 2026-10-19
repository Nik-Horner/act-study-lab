/** Existing completed sessions earn the same credit as new sessions. */
export function learningRewards(completedSessions: number) {
  const sessions = Math.max(0, Math.floor(completedSessions));
  return {
    xp: sessions * 100,
    level: Math.floor(sessions / 5) + 1,
    sessionsToNextLevel: 5 - (sessions % 5),
  };
}
