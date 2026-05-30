import { EVENT_STATS } from "@/constants";
import { EventStatCard } from "./event-stat-card";

export const EventStats = () => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {EVENT_STATS.map((item, index) => (
        <EventStatCard
          key={index}
          title={item.title}
          value={item.value}
          icon={item.icon}
          isMoney={item.isMoney}
        />
      ))}
    </div>
  );
};
