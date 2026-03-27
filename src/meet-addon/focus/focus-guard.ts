import { publishMeetEvent } from "@/meet-addon/events/bus";

type FocusGuardOptions = {
  roomId: string;
  userId: string;
  onReminder?: (message: string) => void;
};

export function startFocusGuard({ roomId, userId, onReminder }: FocusGuardOptions): () => void {
  let hiddenAt: number | null = null;
  const reminderText = "20-20-20: Look 20 feet away for 20 seconds";

  const reminderTimer = window.setInterval(() => {
    onReminder?.(reminderText);
    void publishMeetEvent({
      type: "FOCUS_ALERT_202020",
      roomId,
      message: reminderText,
      ts: Date.now(),
    });
  }, 20 * 60 * 1000);

  const onVisibilityChange = () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      return;
    }
    if (!hiddenAt) return;
    const secondsAway = Math.floor((Date.now() - hiddenAt) / 1000);
    hiddenAt = null;
    if (secondsAway >= 40) {
      void publishMeetEvent({
        type: "TAB_AWAY_ALERT",
        roomId,
        userId,
        secondsAway,
        ts: Date.now(),
      });
    }
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => {
    window.clearInterval(reminderTimer);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
