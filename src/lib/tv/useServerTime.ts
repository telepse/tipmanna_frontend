import { useEffect, useState } from "react";

export function useServerTime(serverNow: number) {
  const [drift, setDrift] = useState(0);

  useEffect(() => {
    const localNow = Date.now() / 1000;
    setDrift(serverNow - localNow);
  }, [serverNow]);

  function now() {
    return Date.now() / 1000 + drift;
  }

  return now;
}
