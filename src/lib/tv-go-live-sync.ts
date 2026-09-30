/**
 * Suppress the GLOBAL mode-effect's immediate syncToLive when enterGlobalMode
 * already invoked syncToLive for the same explicit Go Live action.
 * Periodic interval sync is unaffected.
 */

export function shouldSkipGlobalModeEffectInitialSync(opts: {
  suppressNextInitialSync: boolean;
}): { skip: boolean; nextSuppress: false } {
  if (opts.suppressNextInitialSync) {
    return { skip: true, nextSuppress: false };
  }
  return { skip: false, nextSuppress: false };
}
