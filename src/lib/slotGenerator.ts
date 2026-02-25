export interface Slot {
  plannedFor: string;
  durationMinutes: number;
}

/**
 * Generate a series of time slots leading up to a due date.
 * - Days until due determines count.
 * - Avoid scheduling on due date itself.
 * - Default duration 60 minutes.
 */
export const generateSlots = (
  dueDateStr: string,
  now: Date = new Date(),
): Slot[] => {
  const dueDate = new Date(dueDateStr);
  const msPerDay = 24 * 60 * 60 * 1000;
  let days = Math.ceil(
    (dueDate.getTime() - now.getTime()) / msPerDay,
  );
  if (days < 0) {
    days = 0;
  }

  let sessionCount = 1;
  if (days <= 2) {
    sessionCount = Math.min(2, days || 1);
  } else if (days <= 6) {
    sessionCount = Math.min(4, days);
  } else if (days <= 14) {
    sessionCount = Math.min(6, days - 1);
  } else {
    sessionCount = Math.min(8, days - 1);
  }
  sessionCount = Math.max(1, sessionCount);

  const slots: Slot[] = [];
  const lastDay = new Date(dueDate.getTime() - msPerDay);
  const totalDays = Math.floor(
    (lastDay.getTime() - now.getTime()) / msPerDay,
  ) + 1;
  for (let i = 0; i < sessionCount; i++) {
    const offset = Math.floor((i * totalDays) / sessionCount);
    const dt = new Date(now.getTime() + offset * msPerDay);
    slots.push({
      plannedFor: dt.toISOString(),
      durationMinutes: 60,
    });
  }
  return slots;
};
