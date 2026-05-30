/** Event-level tip customization (config-driven strip + quote lock). */
export function isTipCustomizationEnabled(): boolean {
  return (
    String(process.env.NEXT_PUBLIC_TIP_CUSTOMIZATION_ENABLED || "")
      .trim()
      .toLowerCase() === "true" ||
    process.env.NEXT_PUBLIC_TIP_CUSTOMIZATION_ENABLED === "1"
  );
}
