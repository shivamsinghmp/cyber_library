import { google, calendar_v3 } from "googleapis";
import * as fs from "fs";
import { getAppSetting } from "./app-settings";

async function getCalendarCredentials(): Promise<{
  serviceAccountEmail: string;
  privateKey: string;
  calendarId: string;
} | null> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || (await getAppSetting("GOOGLE_SERVICE_ACCOUNT_EMAIL"));
  const rawKey = process.env.GOOGLE_PRIVATE_KEY?.trim() || (await getAppSetting("GOOGLE_PRIVATE_KEY"));
  const calId = process.env.GOOGLE_CALENDAR_ID?.trim() || (await getAppSetting("GOOGLE_CALENDAR_ID"));
  if (!email || !rawKey) {
    console.warn("⚠️ Google Calendar integration is disabled due to missing credentials.");
    return null;
  }
  const privateKey = rawKey.replace(/\\n/g, "\n");
  return {
    serviceAccountEmail: email,
    privateKey,
    calendarId: calId || "primary",
  };
}

/** Returns calendar client and calendarId; null if credentials missing. */
async function getCalendarClient(): Promise<{ client: calendar_v3.Calendar; calendarId: string } | null> {
  const creds = await getCalendarCredentials();
  if (!creds) return null;
  const auth = new google.auth.JWT({
    email: creds.serviceAccountEmail,
    key: creds.privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar"],
    subject: creds.calendarId,
  });
  const client = google.calendar({ version: "v3", auth });
  return { client, calendarId: creds.calendarId };
}

export const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

/** Fetch attendees for a calendar event (for admin diagnostics / auto-admit visibility). */
export async function getCalendarEventAttendees(
  eventId: string
): Promise<{ email: string | null; responseStatus: string | null }[] | null> {
  const cal = await getCalendarClient();
  if (!cal) return null;
  const { client, calendarId: cid } = cal;

  try {
    const res = await client.events.get({
      calendarId: cid,
      eventId,
    });
    const attendees = res.data.attendees || [];
    return attendees.map((a) => ({
      email: a.email ?? null,
      responseStatus: a.responseStatus ?? null,
    }));
  } catch (error: any) {
    console.error(`Failed to fetch attendees for Calendar Event ${eventId}:`, error);
    let errorString = "";
    if (error.response?.data) {
      errorString = JSON.stringify(error.response.data, null, 2);
    } else {
      errorString = error.toString();
    }
    try {
      fs.writeFileSync(
        "calendar-invite-error.txt",
        `\n--- ATTENDEE FETCH ERROR AT ${new Date().toISOString()} ---\n${errorString}\n`,
        { flag: "a" }
      );
    } catch (e) {}
    return null;
  }
}

/**
 * Automatically adds a student's email as an attendee (Guest) to an existing
 * Google Calendar event, allowing them to bypass the waiting room.
 *
 * @param eventId The Google Calendar Event ID
 * @param studentEmail The email of the user to invite
 * @returns boolean indicating success
 */
export async function addStudentToCalendarEvent(eventId: string, studentEmail: string): Promise<boolean> {
  const cal = await getCalendarClient();
  if (!cal) return false;
  const { client, calendarId: cid } = cal;

  try {
    const eventRes = await client.events.get({
      calendarId: cid,
      eventId,
    });

    const event = eventRes.data;
    const attendees = event.attendees || [];

    // Check if exactly this email is already invited
    if (attendees.some(a => a.email?.toLowerCase() === studentEmail.toLowerCase())) {
      console.log(`Student ${studentEmail} is already invited to event ${eventId}.`);
      return true; // Fast exit
    }

    // 2. Append the new student
    attendees.push({
      email: studentEmail,
      responseStatus: "accepted", // Optional: marks them as attending automatically
    });

    await client.events.patch({
      calendarId: cid,
      eventId,
      sendUpdates: "all", // Sends an invite email so the student has the link in their inbox too
      requestBody: {
        attendees,
      },
    });

    console.log(`Successfully added ${studentEmail} to Google Calendar event ${eventId}.`);
    return true;
  } catch (error: any) {
    console.error(`Failed to add ${studentEmail} to Calendar Event ${eventId}:`, error);
    let errorString = "";
    if (error.response?.data) {
      errorString = JSON.stringify(error.response.data, null, 2);
    } else {
      errorString = error.toString();
    }
    
    try {
      fs.writeFileSync("calendar-invite-error.txt", `\n--- ATTENDEE INVITE ERROR AT ${new Date().toISOString()} ---\n${errorString}\n`, { flag: 'a' });
    } catch(e) {}

    return false;
  }
}

/**
 * Automatically creates a new Google Calendar event with a Meet video conference.
 * Uses a dummy time (tomorrow) as Google Meet links remain active independent of the scheduled time.
 *
 * @param eventName The title of the event
 * @param startTime Date object for event start
 * @param endTime Date object for event end
 * @returns Object containing the generated `calendarEventId` and `meetLink`
 */
export async function createStudyRoomEvent(eventName: string, startTime: Date, endTime: Date): Promise<{ calendarEventId: string; meetLink: string } | null> {
  const cal = await getCalendarClient();
  if (!cal) return null;
  const { client, calendarId: cid } = cal;

  try {
    const res = await client.events.insert({
      calendarId: cid,
      conferenceDataVersion: 1, // Crucial for generating a Meet link
      requestBody: {
        summary: eventName,
        description: "Auto-generated Study Room for The Cyber Library",
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
        conferenceData: {
          createRequest: {
            requestId: Math.random().toString(36).substring(7),
            conferenceSolutionKey: { type: "hangoutsMeet" }
          }
        }
      }
    });

    const hangoutLink = res.data.hangoutLink;
    const eventId = res.data.id;

    if (!hangoutLink || !eventId) {
      throw new Error("Google API did not return a Meet link or Event ID.");
    }

    console.log(`Successfully created Calendar Event ${eventId} with Meet Link ${hangoutLink}`);
    return {
      calendarEventId: eventId,
      meetLink: hangoutLink
    };
  } catch (error: any) {
    console.error("Failed to create Google Calendar Event:");
    let errorString = "";
    if (error.response?.data) {
      errorString = JSON.stringify(error.response.data, null, 2);
    } else {
      errorString = error.toString();
    }
    console.error(errorString);
    try {
      fs.writeFileSync("calendar-error.txt", `\n--- ERROR AT ${new Date().toISOString()} ---\n${errorString}\n`, { flag: 'a' });
    } catch(e) {}
    
    return null;
  }
}
