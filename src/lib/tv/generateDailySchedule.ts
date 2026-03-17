import { DailySchedule, ScheduledItem, setSchedule } from "./scheduleStore";

type Video = {
  videoId: string;
  title: string;
  duration: number; // seconds
  rank: number;
};

const DAY_SECONDS = 86400;

export function generateDailySchedule(videos: Video[]): DailySchedule {
  const today = new Date().toISOString().split("T")[0];

  // Lock ranking order
  const sorted = [...videos].sort((a, b) => a.rank - b.rank);

  let timeCursor = startOfToday();
  const endOfDay = timeCursor + DAY_SECONDS;

  const items: ScheduledItem[] = [];

  while (timeCursor < endOfDay) {
    for (const video of sorted) {
      const start = timeCursor;
      const end = start + video.duration;

      items.push({
        videoId: video.videoId,
        title: video.title,
        duration: video.duration,
        startTime: start,
        endTime: end,
        rank: video.rank,
      });

      timeCursor = end;
      if (timeCursor >= endOfDay) break;
    }
  }

  const schedule: DailySchedule = {
    date: today,
    generatedAt: Date.now(),
    items,
  };

  setSchedule(schedule);
  return schedule;
}

function startOfToday() {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );
  return Math.floor(start.getTime() / 1000);
}
