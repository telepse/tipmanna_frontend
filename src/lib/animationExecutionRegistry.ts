class AnimationExecutionRegistry {
  private memory = new Set<string>();

  private buildKey(animationId: string, surface: string, executionKey: string) {
    return `${animationId}:${surface}:${executionKey}`;
  }

  trySpawn(animationId: string, surface: string, executionKey: string) {
    const key = this.buildKey(animationId, surface, executionKey);

    if (this.memory.has(key)) return false;

    this.memory.add(key);
    return true;
  }

  complete(animationId: string, surface: string, executionKey: string) {
    const key = this.buildKey(animationId, surface, executionKey);
    this.memory.delete(key);
  }
}

export const animationExecutionRegistry = new AnimationExecutionRegistry();
