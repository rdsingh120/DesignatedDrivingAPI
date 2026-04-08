/**
 * SSE connection registry.
 * Maps userId (string) -> Set of active response objects.
 * Allows multiple tabs/devices per user.
 */
const connections = new Map();

export function addConnection(userId, res) {
  const id = String(userId);
  if (!connections.has(id)) connections.set(id, new Set());
  connections.get(id).add(res);
}

export function removeConnection(userId, res) {
  const id = String(userId);
  const set = connections.get(id);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) connections.delete(id);
}

/**
 * Send a notification object to all active connections for a user.
 */
export function sendToUser(userId, notification) {
  const id = String(userId);
  const set = connections.get(id);
  if (!set || set.size === 0) return;
  const data = `data: ${JSON.stringify(notification)}\n\n`;
  for (const res of set) {
    try {
      res.write(data);
    } catch (_) {
      set.delete(res);
    }
  }
}
