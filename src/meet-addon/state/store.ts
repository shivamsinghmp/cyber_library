import { create } from "zustand";
import type { MeetAddonEvent } from "@/meet-addon/events/contracts";

type MeetAddonState = {
  roomId: string | null;
  activeQuizId: string | null;
  activePollId: string | null;
  focusMessage: string | null;
  setRoomId: (roomId: string) => void;
  onEvent: (event: MeetAddonEvent) => void;
};

export const useMeetAddonStore = create<MeetAddonState>((set) => ({
  roomId: null,
  activeQuizId: null,
  activePollId: null,
  focusMessage: null,
  setRoomId: (roomId) => set({ roomId }),
  onEvent: (event) => {
    switch (event.type) {
      case "QUIZ_START":
        set({ activeQuizId: event.quizId });
        return;
      case "POLL_START":
        set({ activePollId: event.pollId });
        return;
      case "FOCUS_ALERT_202020":
        set({ focusMessage: event.message });
        return;
      default:
        return;
    }
  },
}));
