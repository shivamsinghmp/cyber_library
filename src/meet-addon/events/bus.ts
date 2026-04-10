import type { MeetAddonEvent } from "./contracts";

type Unsubscribe = () => void;
type Handler = (event: MeetAddonEvent) => void;



const CHANNEL = "virtual-library-meet-events";

function fallbackBus(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!("BroadcastChannel" in window)) return null;
  return new BroadcastChannel(CHANNEL);
}

export function subscribeMeetEvents(handler: Handler): Unsubscribe {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof window !== "undefined" && (window as any).meet?.addon?.onEvent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
