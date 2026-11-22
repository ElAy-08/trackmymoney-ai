const SLOW_REQUEST_DELAY_MS = 3_500;

let nextRequestId = 0;
const slowRequestIds = new Set<number>();
const subscribers = new Set<() => void>();

function notifySubscribers(): void {
  subscribers.forEach((subscriber) => subscriber());
}

export function hasSlowApiRequests(): boolean {
  return slowRequestIds.size > 0;
}

export function subscribeToSlowApiRequests(
  subscriber: () => void,
): () => void {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

export function trackApiRequest<T>(request: () => Promise<T>): Promise<T> {
  const requestId = nextRequestId++;
  let isSlow = false;
  const timeout = setTimeout(() => {
    isSlow = true;
    slowRequestIds.add(requestId);
    notifySubscribers();
  }, SLOW_REQUEST_DELAY_MS);

  return Promise.resolve()
    .then(request)
    .finally(() => {
      clearTimeout(timeout);
      if (isSlow) {
        slowRequestIds.delete(requestId);
        notifySubscribers();
      }
    });
}
