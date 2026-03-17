"use server";

export async function createVisitorTipperAction() {
  try {
    // ✅ Get IP address from a third-party IP service (works in edge/server)
    const ipRes = await fetch("https://api.ipify.org?format=json", {
      cache: "no-store",
    });
    const { ip } = await ipRes.json();

    // ✅ Capture device info from headers (only partial on server)
    const device =
      typeof navigator !== "undefined" ? navigator.userAgent : "server-device";

    const timestamp = new Date().toISOString();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/visitors/create`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip, device, timestamp }),
        cache: "no-store",
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        message: data?.error?.message || "Failed to create visitor tipper",
      };
    }

    return data;
  } catch (err) {
    console.error("Visitor creation failed:", err);
    console.error(err);
    return { success: false, message: "Unexpected error creating visitor" };
  }
}
