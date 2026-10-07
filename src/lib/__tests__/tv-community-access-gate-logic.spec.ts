import { describe, expect, it } from "vitest";

import {
  hasGenuineCommunityTvAuthViewerTransition,
  resolveCommunityIntentFromUrl,
  resolveCommunityTvAccessGate,
  resolveCommunityTvAuthViewerKey,
  resolveCommunityTvAuthViewerSettlement,
  resolveCommunityTvClientEntitlementProbePlan,
  resolveInitialCommunityTvGatePhase,
  ssrCommunityTvEntitlementAppliesToIntent,
} from "@/lib/tv-community-access-gate-logic";

const COMM = "comm-gate-1";

describe("resolveCommunityIntentFromUrl", () => {
  it("prefers server urlCommunityIntent", () => {
    expect(resolveCommunityIntentFromUrl("comm-a")).toBe("comm-a");
    expect(resolveCommunityIntentFromUrl(null)).toBeNull();
  });
});

describe("resolveCommunityTvAccessGate", () => {
  it("no community intent → idle", () => {
    expect(resolveCommunityTvAccessGate(null, true, {})).toEqual({
      outcome: "no_community_intent",
      phase: "idle",
    });
  });

  it("anonymous / failed access-state → denied", () => {
    expect(resolveCommunityTvAccessGate(COMM, false, null)).toEqual({
      outcome: "denied",
      phase: "denied",
      communityId: COMM,
    });
  });

  it("non-member → denied", () => {
    expect(
      resolveCommunityTvAccessGate(COMM, true, {
        communityTvViewerEntitled: false,
        isMember: false,
        viewerHostsCommunity: false,
      })
    ).toEqual({
      outcome: "denied",
      phase: "denied",
      communityId: COMM,
    });
  });

  it("active member → allowed", () => {
    expect(
      resolveCommunityTvAccessGate(COMM, true, {
        communityTvViewerEntitled: true,
        isMember: true,
      })
    ).toEqual({
      outcome: "allowed",
      phase: "allowed",
      communityId: COMM,
    });
  });

  it("owner → allowed", () => {
    expect(
      resolveCommunityTvAccessGate(COMM, true, {
        communityTvViewerEntitled: true,
        isMember: false,
        viewerHostsCommunity: true,
      })
    ).toEqual({
      outcome: "allowed",
      phase: "allowed",
      communityId: COMM,
    });
  });

  it("co-creator without membership row → allowed via backend flag", () => {
    expect(
      resolveCommunityTvAccessGate(COMM, true, {
        communityTvViewerEntitled: true,
        isMember: false,
        viewerHostsCommunity: false,
      })
    ).toEqual({
      outcome: "allowed",
      phase: "allowed",
      communityId: COMM,
    });
  });

  it("visitor-only / expired → denied", () => {
    expect(
      resolveCommunityTvAccessGate(COMM, true, {
        communityTvViewerEntitled: false,
        isMember: false,
      })
    ).toEqual({
      outcome: "denied",
      phase: "denied",
      communityId: COMM,
    });
  });
});

describe("SSR entitlement → initial gate phase", () => {
  it("A. community + SSR entitled → allowed immediately", () => {
    expect(resolveInitialCommunityTvGatePhase(COMM, COMM, "entitled")).toBe(
      "allowed"
    );
    expect(
      ssrCommunityTvEntitlementAppliesToIntent(COMM, COMM, "entitled")
    ).toBe(true);
  });

  it("B. community + SSR denied → denied immediately", () => {
    expect(resolveInitialCommunityTvGatePhase(COMM, COMM, "denied")).toBe(
      "denied"
    );
    expect(ssrCommunityTvEntitlementAppliesToIntent(COMM, COMM, "denied")).toBe(
      true
    );
  });

  it("C. community + SSR unknown → checking (fail-closed client probe)", () => {
    expect(resolveInitialCommunityTvGatePhase(COMM, COMM, "unknown")).toBe(
      "checking"
    );
    expect(
      ssrCommunityTvEntitlementAppliesToIntent(COMM, COMM, "unknown")
    ).toBe(false);
  });

  it("D. global / no community intent → idle", () => {
    expect(resolveInitialCommunityTvGatePhase(null, null, "unknown")).toBe(
      "idle"
    );
    expect(resolveInitialCommunityTvGatePhase(null, null, "denied")).toBe(
      "idle"
    );
  });

  it("E. owner/co-creator/member semantics via SSR entitled flag", () => {
    expect(resolveInitialCommunityTvGatePhase(COMM, COMM, "entitled")).toBe(
      "allowed"
    );
    expect(resolveInitialCommunityTvGatePhase(COMM, COMM, "denied")).toBe(
      "denied"
    );
  });

  it("SSR mismatch (client-only intent) → checking", () => {
    expect(
      resolveInitialCommunityTvGatePhase(COMM, "other-community", "denied")
    ).toBe("checking");
  });
});

function authSettlement(
  overrides: Partial<{
    persistRehydrated: boolean;
    persistAuthHydrationComplete: boolean;
    isAuthenticated: boolean;
    requiresVerification: boolean;
    userId: string | null;
    userRole: string | null;
    token: string | null;
  }> = {}
) {
  return resolveCommunityTvAuthViewerSettlement({
    persistRehydrated: true,
    persistAuthHydrationComplete: true,
    isAuthenticated: false,
    requiresVerification: false,
    userId: null,
    userRole: null,
    token: null,
    ...overrides,
  });
}

function clientProbePlan(
  overrides: Partial<{
    ssrApplies: boolean;
    ssrEntitlement: "entitled" | "denied" | "unknown";
    settlement: ReturnType<typeof resolveCommunityTvAuthViewerSettlement>;
    authBaselineEstablished: boolean;
    baselineViewerKey: string | null;
  }> = {}
) {
  const { settlement, ...rest } = overrides;
  return resolveCommunityTvClientEntitlementProbePlan({
    ssrApplies: true,
    ssrEntitlement: "denied",
    settlement: settlement ?? authSettlement(),
    authBaselineEstablished: false,
    baselineViewerKey: null,
    ...rest,
  });
}

function shouldRunClientEntitlementProbe(
  plan: ReturnType<typeof resolveCommunityTvClientEntitlementProbePlan>
): boolean {
  return plan === "run_client_probe";
}

describe("resolveCommunityTvAuthViewerKey", () => {
  it("anonymous viewer → null", () => {
    expect(resolveCommunityTvAuthViewerKey(false, "user-1")).toBeNull();
    expect(resolveCommunityTvAuthViewerKey(true, null)).toBeNull();
  });

  it("authenticated viewer → stable user id", () => {
    expect(resolveCommunityTvAuthViewerKey(true, "67c42f3a-aaaa")).toBe(
      "67c42f3a-aaaa"
    );
  });
});

describe("SSR definitive entitlement — client probe plan", () => {
  const USER_A = "user-a";
  const USER_B = "user-b";

  it("A. SSR denied + pre-rehydrate → defer; confirmed anonymous → baseline; no probe", () => {
    expect(
      clientProbePlan({
        settlement: authSettlement({ persistRehydrated: false }),
      })
    ).toBe("defer_until_persist_rehydrated");

    expect(
      clientProbePlan({
        settlement: authSettlement(),
      })
    ).toBe("establish_baseline");
    expect(
      shouldRunClientEntitlementProbe(
        clientProbePlan({
          settlement: authSettlement(),
          authBaselineEstablished: true,
          baselineViewerKey: null,
        })
      )
    ).toBe(false);
  });

  it("B. SSR denied + rehydrate same authenticated viewer → skip probe", () => {
    expect(
      clientProbePlan({
        ssrEntitlement: "denied",
        settlement: authSettlement({
          isAuthenticated: true,
          userId: USER_A,
          userRole: "TIPPER",
        }),
        authBaselineEstablished: true,
        baselineViewerKey: USER_A,
      })
    ).toBe("skip_ssr_authoritative");
  });

  it("C. SSR denied + token rotation (same viewer id) → skip probe", () => {
    expect(resolveCommunityTvAuthViewerKey(true, USER_A)).toBe(
      resolveCommunityTvAuthViewerKey(true, USER_A)
    );
    expect(
      clientProbePlan({
        settlement: authSettlement({
          isAuthenticated: true,
          userId: USER_A,
          userRole: "TIPPER",
        }),
        authBaselineEstablished: true,
        baselineViewerKey: USER_A,
      })
    ).toBe("skip_ssr_authoritative");
  });

  it("D. SSR denied + genuine sign-out → client probe", () => {
    expect(hasGenuineCommunityTvAuthViewerTransition(USER_A, null)).toBe(true);
    expect(
      clientProbePlan({
        settlement: authSettlement(),
        authBaselineEstablished: true,
        baselineViewerKey: USER_A,
      })
    ).toBe("run_client_probe");
  });

  it("E. SSR denied + authenticated user change → client probe", () => {
    expect(hasGenuineCommunityTvAuthViewerTransition(USER_A, USER_B)).toBe(
      true
    );
    expect(
      clientProbePlan({
        settlement: authSettlement({
          isAuthenticated: true,
          userId: USER_B,
          userRole: "TIPPER",
        }),
        authBaselineEstablished: true,
        baselineViewerKey: USER_A,
      })
    ).toBe("run_client_probe");
  });

  it("F. SSR entitled + token rotation for same viewer → skip probe", () => {
    expect(
      clientProbePlan({
        ssrEntitlement: "entitled",
        settlement: authSettlement({
          isAuthenticated: true,
          userId: USER_A,
          userRole: "TIPPER",
        }),
        authBaselineEstablished: true,
        baselineViewerKey: USER_A,
      })
    ).toBe("skip_ssr_authoritative");
  });

  it("G. SSR unknown → client probe (fail-closed)", () => {
    expect(
      resolveCommunityTvClientEntitlementProbePlan({
        ssrApplies: false,
        ssrEntitlement: "unknown",
        settlement: authSettlement({ persistRehydrated: false }),
        authBaselineEstablished: false,
        baselineViewerKey: null,
      })
    ).toBe("run_client_probe");
    expect(
      resolveCommunityTvClientEntitlementProbePlan({
        ssrApplies: false,
        ssrEntitlement: "unknown",
        settlement: authSettlement({
          isAuthenticated: true,
          userId: USER_A,
          userRole: "TIPPER",
        }),
        authBaselineEstablished: false,
        baselineViewerKey: null,
      })
    ).toBe("run_client_probe");
  });

  it("H. community intent change resets baseline → establish then skip for same viewer", () => {
    const afterIntentChange = clientProbePlan({
      ssrEntitlement: "denied",
      settlement: authSettlement({
        isAuthenticated: true,
        userId: USER_A,
        userRole: "TIPPER",
      }),
      authBaselineEstablished: false,
      baselineViewerKey: null,
    });
    expect(afterIntentChange).toBe("establish_baseline");
    expect(
      shouldRunClientEntitlementProbe(
        clientProbePlan({
          settlement: authSettlement({
            isAuthenticated: true,
            userId: USER_A,
            userRole: "TIPPER",
          }),
          authBaselineEstablished: true,
          baselineViewerKey: USER_A,
        })
      )
    ).toBe(false);
  });

  it("SSR denied + anonymous login → client probe", () => {
    expect(
      clientProbePlan({
        settlement: authSettlement({
          isAuthenticated: true,
          userId: USER_A,
          userRole: "TIPPER",
        }),
        authBaselineEstablished: true,
        baselineViewerKey: null,
      })
    ).toBe("run_client_probe");
  });
});

describe("SSR definitive entitlement — auth viewer settlement", () => {
  const USER_A = "user-a";
  const USER_B = "user-b";

  it("1. rehydrated + authenticated flag but user id missing → pending, no baseline", () => {
    const settlement = authSettlement({
      isAuthenticated: true,
      userId: null,
      userRole: "TIPPER",
    });
    expect(settlement).toEqual({ status: "pending" });
    expect(clientProbePlan({ settlement })).toBe(
      "defer_until_persist_rehydrated"
    );
    expect(
      shouldRunClientEntitlementProbe(clientProbePlan({ settlement }))
    ).toBe(false);
  });

  it("2. user id becomes available → establish authenticated baseline without probe", () => {
    const settlement = authSettlement({
      isAuthenticated: true,
      userId: USER_A,
      userRole: "TIPPER",
    });
    expect(settlement).toEqual({ status: "settled", viewerKey: USER_A });
    expect(clientProbePlan({ settlement })).toBe("establish_baseline");
    expect(
      shouldRunClientEntitlementProbe(
        clientProbePlan({
          settlement,
          authBaselineEstablished: true,
          baselineViewerKey: USER_A,
        })
      )
    ).toBe(false);
  });

  it("3. confirmed anonymous after rehydrate → anonymous baseline without probe", () => {
    const settlement = authSettlement();
    expect(settlement).toEqual({ status: "settled", viewerKey: null });
    expect(clientProbePlan({ settlement })).toBe("establish_baseline");
    expect(
      shouldRunClientEntitlementProbe(
        clientProbePlan({
          settlement,
          authBaselineEstablished: true,
          baselineViewerKey: null,
        })
      )
    ).toBe(false);
  });

  it("4. same user id after token change → settlement unchanged, skip probe", () => {
    expect(
      authSettlement({
        isAuthenticated: true,
        userId: USER_A,
        userRole: "TIPPER",
        token: "token-v1",
      })
    ).toEqual({ status: "settled", viewerKey: USER_A });
    expect(
      authSettlement({
        isAuthenticated: true,
        userId: USER_A,
        userRole: "TIPPER",
        token: "token-v2",
      })
    ).toEqual({ status: "settled", viewerKey: USER_A });
    expect(
      clientProbePlan({
        settlement: authSettlement({
          isAuthenticated: true,
          userId: USER_A,
          userRole: "TIPPER",
          token: "token-v2",
        }),
        authBaselineEstablished: true,
        baselineViewerKey: USER_A,
      })
    ).toBe("skip_ssr_authoritative");
  });

  it("5. user A → user B after initialization → probe", () => {
    expect(
      clientProbePlan({
        settlement: authSettlement({
          isAuthenticated: true,
          userId: USER_B,
          userRole: "TIPPER",
        }),
        authBaselineEstablished: true,
        baselineViewerKey: USER_A,
      })
    ).toBe("run_client_probe");
  });

  it("6. authenticated → anonymous after initialization → probe", () => {
    expect(
      clientProbePlan({
        settlement: authSettlement(),
        authBaselineEstablished: true,
        baselineViewerKey: USER_A,
      })
    ).toBe("run_client_probe");
  });

  it("7. SSR unknown ignores settlement pending → client probe", () => {
    expect(
      resolveCommunityTvClientEntitlementProbePlan({
        ssrApplies: false,
        ssrEntitlement: "unknown",
        settlement: authSettlement({
          persistRehydrated: false,
        }),
        authBaselineEstablished: false,
        baselineViewerKey: null,
      })
    ).toBe("run_client_probe");
  });

  it("rehydrated + token without isAuthenticated → pending (auth still settling)", () => {
    expect(
      authSettlement({
        token: "orphan-token",
        isAuthenticated: false,
      })
    ).toEqual({ status: "pending" });
  });
});

describe("auth hydration reconciliation (SSR definitive baseline)", () => {
  const USER_A = "67c42f3a-d8d5-4ee3-8bff-6cf77ad94ca1";
  const USER_B = "user-b-other";

  it("1. rehydrated=true, hydration incomplete, auth empty → pending; no anonymous baseline", () => {
    const settlement = authSettlement({
      persistAuthHydrationComplete: false,
    });
    expect(settlement).toEqual({ status: "pending" });
    expect(clientProbePlan({ settlement })).toBe(
      "defer_until_persist_rehydrated"
    );
    expect(
      shouldRunClientEntitlementProbe(clientProbePlan({ settlement }))
    ).toBe(false);
  });

  it("2. persisted session reconciles to user A → baseline user A; no probe", () => {
    const settlement = authSettlement({
      isAuthenticated: true,
      userId: USER_A,
      userRole: "TIPPER",
      token: "token-v1",
    });
    expect(settlement).toEqual({ status: "settled", viewerKey: USER_A });
    expect(clientProbePlan({ settlement })).toBe("establish_baseline");
    expect(
      shouldRunClientEntitlementProbe(
        clientProbePlan({
          settlement,
          authBaselineEstablished: true,
          baselineViewerKey: USER_A,
        })
      )
    ).toBe(false);
  });

  it("3. genuinely anonymous persisted state → null baseline; no probe", () => {
    const settlement = authSettlement();
    expect(settlement).toEqual({ status: "settled", viewerKey: null });
    expect(clientProbePlan({ settlement })).toBe("establish_baseline");
    expect(
      shouldRunClientEntitlementProbe(
        clientProbePlan({
          settlement,
          authBaselineEstablished: true,
          baselineViewerKey: null,
        })
      )
    ).toBe(false);
  });

  it("4. user A → user B after baseline → probe", () => {
    expect(
      clientProbePlan({
        settlement: authSettlement({
          isAuthenticated: true,
          userId: USER_B,
          userRole: "TIPPER",
        }),
        authBaselineEstablished: true,
        baselineViewerKey: USER_A,
      })
    ).toBe("run_client_probe");
  });

  it("5. user A → anonymous after baseline → probe", () => {
    expect(
      clientProbePlan({
        settlement: authSettlement(),
        authBaselineEstablished: true,
        baselineViewerKey: USER_A,
      })
    ).toBe("run_client_probe");
  });

  it("6. same user + token rotation → no probe", () => {
    expect(
      clientProbePlan({
        settlement: authSettlement({
          isAuthenticated: true,
          userId: USER_A,
          userRole: "TIPPER",
          token: "rotated-token",
        }),
        authBaselineEstablished: true,
        baselineViewerKey: USER_A,
      })
    ).toBe("skip_ssr_authoritative");
  });

  it("7. SSR unknown → client probe unchanged", () => {
    expect(
      resolveCommunityTvClientEntitlementProbePlan({
        ssrApplies: false,
        ssrEntitlement: "unknown",
        settlement: authSettlement({ persistAuthHydrationComplete: false }),
        authBaselineEstablished: false,
        baselineViewerKey: null,
      })
    ).toBe("run_client_probe");
  });

  it("signed-in user record before isAuthenticated → pending (not anonymous)", () => {
    expect(
      authSettlement({
        isAuthenticated: false,
        userId: USER_A,
        userRole: "TIPPER",
        token: null,
      })
    ).toEqual({ status: "pending" });
  });
});
