import { describe, expect, it } from "vitest";
import { resolveInitialHostAuthView } from "../signin-form-host-view";

describe("resolveInitialHostAuthView", () => {
  it("standalone sign-in page uses signIn", () => {
    expect(
      resolveInitialHostAuthView({
        mode: "page",
        pathname: "/sign-in",
      })
    ).toBe("signIn");
  });

  it("standalone sign-up page uses signUp", () => {
    expect(
      resolveInitialHostAuthView({
        mode: "page",
        pathname: "/sign-up",
      })
    ).toBe("signUp");
  });

  it("modal defaults to signUp when prop omitted", () => {
    expect(
      resolveInitialHostAuthView({
        mode: "modal",
        pathname: "/explore",
      })
    ).toBe("signUp");
  });

  it("modal respects defaultHostAuthView signIn", () => {
    expect(
      resolveInitialHostAuthView({
        mode: "modal",
        pathname: "/explore",
        defaultHostAuthView: "signIn",
      })
    ).toBe("signIn");
  });
});
