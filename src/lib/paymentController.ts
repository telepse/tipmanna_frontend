/* ───────────── Event-Scoped Execution Queues ───────────── */

type PaymentTask = () => Promise<void>;

const eventQueues = new Map<string, PaymentTask[]>();
const eventRunning = new Map<string, boolean>();

/* ───────────── Internal Runner ───────────── */

async function runQueue(eventId: string) {
  if (eventRunning.get(eventId)) return;

  eventRunning.set(eventId, true);

  const queue = eventQueues.get(eventId);
  if (!queue) return;

  while (queue.length > 0) {
    const task = queue.shift();
    if (!task) continue;

    try {
      await task(); // STRICT SEQUENTIAL AWAIT
    } catch {
      // Never block queue on animation failure
    }
  }

  eventRunning.set(eventId, false);
}

/* ───────────── Public Entry Point ───────────── */

export function startPaymentAnimations(
  eventId: string,
  animations: PaymentTask[]
) {
  if (!eventQueues.has(eventId)) {
    eventQueues.set(eventId, []);
  }

  const queue = eventQueues.get(eventId)!;

  // FIFO enqueue
  queue.push(...animations);

  // Start processor
  runQueue(eventId);
}
