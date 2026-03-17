export type EventStatus = "Completed" | "Ongoing" | "Upcoming";

export const getStatusColor = (status: EventStatus | string) => {
  switch (status) {
    case "Completed":
      return "text-white bg-black px-2 py-1 rounded-full text-sm";
    case "Ongoing":
      return "text-white bg-moonstone-blue px-2 py-1 rounded-full text-sm";
    case "Upcoming":
      return "text-white bg-primary px-2 py-1 rounded-full text-sm";
    default:
      return "text-gray-600 bg-gray-100 px-2 py-1 rounded-full text-sm";
  }
};
