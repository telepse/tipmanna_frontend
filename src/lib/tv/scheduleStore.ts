export type ScheduledItem = {
  videoId: string;
  title: string;
  duration: number; // seconds
  startTime: number;
  endTime: number;
  rank: number;
};

export type DailySchedule = {
  date: string;
  generatedAt: number;
  items: ScheduledItem[];
};

let cachedSchedule: DailySchedule | null = null;

export function getSchedule() {
  return cachedSchedule;
}

export function setSchedule(schedule: DailySchedule) {
  cachedSchedule = schedule;
}
