export type MessageData = {
  type: string;
  [key: string]: unknown;
};

type MessageCallback = (data: MessageData) => void;

type MessageListenerEntry = {
  id: number;
  callback: MessageCallback;
};

class MessageAPI {
  private listeners = new Map<string, MessageListenerEntry[]>();
  private listenerIndex = new Map<number, string>();
  private nextListenerId = 1;

  constructor() {
    window.addEventListener("message", event => {
      const data = event.data;

      if (!this.isMessageData(data)) {
        return;
      }

      const normalizedType = data.type.trim();
      const entries = this.listeners.get(normalizedType);
      if (!entries || entries.length === 0) {
        return;
      }

      entries.forEach(entry => {
        entry.callback(data);
      });
    });
  }

  listen(eventType: string, callback: MessageCallback): number {
    const normalizedType = eventType.trim();
    const listenerId = this.nextListenerId;
    this.nextListenerId += 1;

    const entries = this.listeners.get(normalizedType);
    if (entries) {
      entries.push({ id: listenerId, callback });
    } else {
      this.listeners.set(normalizedType, [{ id: listenerId, callback }]);
    }

    this.listenerIndex.set(listenerId, normalizedType);

    return listenerId;
  }

  remove(listenerId: number) {
    const eventType = this.listenerIndex.get(listenerId);
    if (!eventType) {
      return;
    }

    const entries = this.listeners.get(eventType);
    if (!entries) {
      this.listenerIndex.delete(listenerId);
      return;
    }

    const entryIndex = entries.findIndex(entry => entry.id === listenerId);
    if (entryIndex === -1) {
      this.listenerIndex.delete(listenerId);
      return;
    }

    entries.splice(entryIndex, 1);
    if (entries.length === 0) {
      this.listeners.delete(eventType);
    }

    this.listenerIndex.delete(listenerId);
  }

  private isMessageData(data: unknown): data is MessageData {
    if (typeof data !== "object" || data === null) {
      return false;
    }

    const typeValue = (data as { type?: unknown }).type;

    return typeof typeValue === "string" && typeValue.trim().length > 0;
  }
}

export const messageAPI = new MessageAPI();
