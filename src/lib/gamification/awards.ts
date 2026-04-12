import { prisma } from "@/lib/prisma";

export type AwardReason =
  | "POMODORO_CYCLE_COMPLETED"
  | "25M_FOCUS_SESSION"
  | "QUIZ_CORRECT"
  | "TODO_COMPLETED"
  | "TAB_AWAY_VIOLATION"
  | "STREAK_MAINTAINED";

// Default Fallback Logic if admin hasn't set ActionReward row
const DEFAULT_COINS: Record<AwardReason, number> = {
  POMODORO_CYCLE_COMPLETED: 2,
  "25M_FOCUS_SESSION": 25,
  QUIZ_CORRECT: 1,
  TODO_COMPLETED: 1,
  TAB_AWAY_VIOLATION: -1,
  STREAK_MAINTAINED: 1,
};

export async function getCoinDelta(reason: AwardReason): Promise<number> {
  try {
    const config = await prisma.actionReward.findUnique({
      where: { actionKey: reason },
    });
    
    if (config && !config.isActive) return 0;
    if (config && config.isActive) return config.coins;
  } catch (error) {
    console.error("Coin Engine error:", error);
  }
  
  return DEFAULT_COINS[reason] ?? 0;
}
