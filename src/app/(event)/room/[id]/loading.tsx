import { BeatLoader } from "react-spinners";

export default function RoomLoading() {
  return (
    <div
      className="flex h-screen items-center justify-center"
      aria-busy="true"
      aria-label="Loading event room"
    >
      <BeatLoader
        color="#f57d11"
        size={20}
      />
    </div>
  );
}
