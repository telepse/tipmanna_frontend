export type HostAuthViewKind = "signIn" | "signUp";

export function resolveInitialHostAuthView(input: {
  mode: "page" | "modal";
  pathname: string;
  defaultHostAuthView?: HostAuthViewKind;
}): HostAuthViewKind {
  if (input.mode === "page" && input.pathname === "/sign-in") {
    return "signIn";
  }
  if (input.mode === "page" && input.pathname === "/sign-up") {
    return "signUp";
  }
  return input.defaultHostAuthView ?? "signUp";
}
