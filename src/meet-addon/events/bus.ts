import type { MeetAddonEvent } from "./contracts";

type Unsubscribe = () => void;
type Handler = (event: MeetAddonEvent) => void;



const CHANNEL = "virtual-library-meet-events";

function fallbackBus(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!("BroadcastChannel" in window)) return null;
  return new BroadcastChannel(CHANNEL);
}

export async function publishMeetEvent(event: MeetAddonEvent): Promise<void> {
  try {
    if (typeof window !== "undefined" && (window as any).meet?.addon?.publishEvent) {
      await (window as any).meet.addon.publishEvent({ event });
      return;
    }
  } catch {
    // Fall back to BroadcastChannel in local/dev contexts.
  }
  const bus = fallbackBus();
  if (bus) bus.postMessage(event);
}

export function subscribeMeetEvents(handler: Handler): Unsubscribe {
  if (typeof window !== "undefined" && (window as any).meet?.addon?.onEvent) {
    const stop = (window as any).meet.addon.onEvent((raw: any) => {
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
    const ctx = await (window as any).meet?.addon?.getSidePanelContext?.();
    return ctx?.meetingCode || ctx?.meetingId || "local-room";
  } catch {
    return "local-room";
  }
}
