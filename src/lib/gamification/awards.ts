export type AwardReason =
  | "POMODORO_CYCLE_COMPLETED"
  | "QUIZ_CORRECT"
  | "TODO_COMPLETED"
  | "TAB_AWAY_VIOLATION";

export function getCoinDelta(reason: AwardReason): number {
  switch (reason) {
    case "POMODORO_CYCLE_COMPLETED":
      return 2;
    case "QUIZ_CORRECT":
      return 1;
    case "TODO_COMPLETED":
      return 1;
    case "TAB_AWAY_VIOLATION":
      return -1;
    default:
      return 0;
  }
}
