import type { MeetAddonEvent } from "./contracts";

type Unsubscribe = () => void;
type Handler = (event: MeetAddonEvent) => void;

declare global {
  interface Window {
    meet?: {
      addon?: {
        getSidePanelContext?: () => Promise<{ meetingCode?: string; meetingId?: string }>;
        createSpace?: (args: { url: string }) => Promise<void>;
        publishEvent?: (args: { event: unknown }) => Promise<void>;
        onEvent?: (handler: (event: unknown) => void) => Unsubscribe | void;
      };
    };
  }
}

const CHANNEL = "virtual-library-meet-events";

function fallbackBus(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!("BroadcastChannel" in window)) return null;
  return new BroadcastChannel(CHANNEL);
}

export async function publishMeetEvent(event: MeetAddonEvent): Promise<void> {
  try {
    if (typeof window !== "undefined" && window.meet?.addon?.publishEvent) {
      await window.meet.addon.publishEvent({ event });
      return;
    }
  } catch {
    // Fall back to BroadcastChannel in local/dev contexts.
  }
  const bus = fallbackBus();
  if (bus) bus.postMessage(event);
}

export function subscribeMeetEvents(handler: Handler): Unsubscribe {
  if (typeof window !== "undefined" && window.meet?.addon?.onEvent) {
    const stop = window.meet.addon.onEvent((raw) => {
      if (raw && typeof raw === "object") handler(raw as MeetAddonEvent);
    });
    return typeof stop === "function" ? stop : () => {};
  }
  const bus = fallbackBus();
  if (!bus) return () => {};
  const listener = (ev: MessageEvent<MeetAddonEvent>) => handler(ev.data);
  bus.addEventListener("message", listener);
  return () => {
    bus.removeEventListener("message", listener);
    bus.close();
  };
}

export async function getMeetRoomId(): Promise<string> {
  if (typeof window === "undefined") return "local-room";
  try {
    const ctx = await window.meet?.addon?.getSidePanelContext?.();
    return ctx?.meetingCode || ctx?.meetingId || "local-room";
  } catch {
    return "local-room";
  }
}
