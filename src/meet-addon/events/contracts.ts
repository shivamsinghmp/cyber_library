export type MeetAddonEventType =
  | "QUIZ_START"
  | "POLL_START"
  | "FOCUS_ALERT_202020"
  | "TAB_AWAY_ALERT"
  | "POMODORO_STATE"
  | "LEADERBOARD_SYNC";

export type MeetAddonEvent =
  | {
      type: "QUIZ_START";
      roomId: string;
      quizId: string;
      startedBy: string;
      ts: number;
    }
  | {
      type: "POLL_START";
      roomId: string;
      pollId: string;
      ts: number;
    }
  | {
      type: "FOCUS_ALERT_202020";
      roomId: string;
      message: string;
      ts: number;
    }
  | {
      type: "TAB_AWAY_ALERT";
      roomId: string;
      userId: string;
      secondsAway: number;
      ts: number;
    }
  | {
      type: "POMODORO_STATE";
      roomId: string;
      userId: string;
      secondsLeft: number;
      isBreak: boolean;
      ts: number;
    }
  | {
      type: "LEADERBOARD_SYNC";
      roomId: string;
      ts: number;
    };

export function isMeetAddonEvent(v: unknown): v is MeetAddonEvent {
  if (!v || typeof v !== "object") return false;
  const t = (v as { type?: unknown }).type;
  return typeof t === "string";
}
