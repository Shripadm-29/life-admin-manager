import { addDays, endOfDay, max, min, startOfDay } from 'date-fns';
import {
  CalendarBusyEvent,
  CalendarFreeBlock,
  CalendarPlanningContext,
} from './plannerTypes';
import { supabase } from './supabaseClient';

const WORK_START_HOUR = 8;
const WORK_END_HOUR = 21;
const MAX_LOOKAHEAD_DAYS = 10;

const getGoogleProviderToken = async (): Promise<string | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  const session = data.session as { provider_token?: string } | null;
  return session?.provider_token || null;
};

const buildDailyWindow = (date: Date) => {
  const start = new Date(date);
  start.setHours(WORK_START_HOUR, 0, 0, 0);
  const end = new Date(date);
  end.setHours(WORK_END_HOUR, 0, 0, 0);
  return { start, end };
};

const mergeBusyEvents = (events: CalendarBusyEvent[]): CalendarBusyEvent[] => {
  const sorted = [...events].sort(
    (left, right) => new Date(left.start).getTime() - new Date(right.start).getTime(),
  );
  const merged: CalendarBusyEvent[] = [];

  for (const event of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous) {
      merged.push({ ...event });
      continue;
    }

    if (new Date(event.start) <= new Date(previous.end)) {
      previous.end = new Date(
        Math.max(new Date(previous.end).getTime(), new Date(event.end).getTime()),
      ).toISOString();
      previous.title = `${previous.title}; ${event.title}`;
      continue;
    }

    merged.push({ ...event });
  }

  return merged;
};

const computeFreeBlocks = (
  busyEvents: CalendarBusyEvent[],
  rangeStart: Date,
  rangeEnd: Date,
): CalendarFreeBlock[] => {
  const freeBlocks: CalendarFreeBlock[] = [];
  const mergedBusy = mergeBusyEvents(busyEvents);
  let currentDay = startOfDay(rangeStart);
  const lastDay = startOfDay(rangeEnd);

  while (currentDay <= lastDay) {
    const { start, end } = buildDailyWindow(currentDay);
    const windowStart = max([start, rangeStart]);
    const windowEnd = min([end, rangeEnd]);

    if (windowStart >= windowEnd) {
      currentDay = addDays(currentDay, 1);
      continue;
    }

    let cursor = windowStart;
    for (const event of mergedBusy.filter((item) => new Date(item.end) > windowStart && new Date(item.start) < windowEnd)) {
      const busyStart = max([new Date(event.start), windowStart]);
      const busyEnd = min([new Date(event.end), windowEnd]);
      if (busyStart > cursor) {
        const durationMinutes = Math.round((busyStart.getTime() - cursor.getTime()) / 60000);
        if (durationMinutes >= 20) {
          freeBlocks.push({
            start: cursor.toISOString(),
            end: busyStart.toISOString(),
            duration_minutes: durationMinutes,
          });
        }
      }
      if (busyEnd > cursor) {
        cursor = busyEnd;
      }
    }

    if (cursor < windowEnd) {
      const durationMinutes = Math.round((windowEnd.getTime() - cursor.getTime()) / 60000);
      if (durationMinutes >= 20) {
        freeBlocks.push({
          start: cursor.toISOString(),
          end: windowEnd.toISOString(),
          duration_minutes: durationMinutes,
        });
      }
    }

    currentDay = addDays(currentDay, 1);
  }

  return freeBlocks;
};

export const getCalendarPlanningContext = async (
  dueDate?: string | null,
): Promise<CalendarPlanningContext> => {
  const providerToken = await getGoogleProviderToken();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  if (!providerToken) {
    return {
      connected: false,
      timezone,
      busy_events: [],
      free_blocks: [],
    };
  }

  const rangeStart = new Date();
  const tentativeRangeEnd = dueDate ? new Date(dueDate) : addDays(rangeStart, 7);
  const rangeEnd = min([endOfDay(tentativeRangeEnd), addDays(rangeStart, MAX_LOOKAHEAD_DAYS)]);

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('timeMin', rangeStart.toISOString());
  url.searchParams.set('timeMax', rangeEnd.toISOString());
  url.searchParams.set('maxResults', '100');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${providerToken}`,
    },
  });

  if (!response.ok) {
    return {
      connected: false,
      timezone,
      busy_events: [],
      free_blocks: [],
    };
  }

  const json = await response.json();
  const busyEvents: CalendarBusyEvent[] = (json.items || [])
    .filter((event: any) => event.status !== 'cancelled' && event.start?.dateTime && event.end?.dateTime)
    .map((event: any) => ({
      title: event.summary || 'Busy',
      start: event.start.dateTime,
      end: event.end.dateTime,
    }));

  return {
    connected: true,
    timezone,
    busy_events: busyEvents,
    free_blocks: computeFreeBlocks(busyEvents, rangeStart, rangeEnd),
  };
};