import { createClient } from "./client";
import { RealtimeChannel } from "@supabase/supabase-js";

// Channel names
export const CHANNELS = {
  ORDERS: "orders-channel",
  PRODUCTS: "products-channel",
} as const;

// Broadcast event types
export const EVENTS = {
  ORDER_CREATED: "order:created",
  ORDER_PENDING: "order:pending",
  ORDER_PAID: "order:paid",
  ORDER_SHIPPED: "order:shipped",
  ORDER_COMPLETED: "order:completed",
  ORDER_UPDATED: "order:updated",
  STOCK_UPDATED: "stock:updated",
  PRODUCT_CREATED: "product:created",
  PRODUCT_DELETED: "product:deleted",
} as const;

// Channel registry to track active subscriptions
const channelRegistry: Map<
  string,
  {
    channel: RealtimeChannel;
    callbacks: Map<string, Set<(payload: Record<string, unknown>) => void>>;
  }
> = new Map();

/**
 * Broadcast a message via WebSocket
 * Based on: https://supabase.com/docs/guides/realtime/broadcast
 */
export async function broadcast(
  channelName: string,
  event: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const supabase = createClient();

  // Check if we have an existing subscribed channel
  const existing = channelRegistry.get(channelName);
  if (existing) {
    try {
      const response = await existing.channel.send({
        type: "broadcast",
        event,
        payload,
      });
      if (response === "ok") {
        console.log(
          `[Realtime] ✓ broadcast sent via existing channel: ${event}`,
        );
      } else {
        console.warn(`[Realtime] broadcast response: ${response}`);
      }
      return;
    } catch (err) {
      console.warn("[Realtime] broadcast via existing channel failed:", err);
    }
  }

  // Create channel with the SAME name as subscribers use
  // This is critical - broadcast only reaches subscribers on the same channel name
  const channel = supabase.channel(channelName, {
    config: {
      broadcast: { ack: true, self: false },
    },
  });

  let isResolved = false;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (isResolved) return;
      isResolved = true;
      console.warn("[Realtime] broadcast timeout");
      resolve();
    }, 5000);

    channel.subscribe(async (status) => {
      if (isResolved) return;

      if (status === "SUBSCRIBED") {
        // Add to registry so it can be reused
        if (!channelRegistry.has(channelName)) {
          channelRegistry.set(channelName, {
            channel,
            callbacks: new Map(),
          });
        }

        try {
          const response = await channel.send({
            type: "broadcast",
            event,
            payload,
          });

          clearTimeout(timeout);

          if (response === "ok") {
            console.log(`[Realtime] ✓ broadcast sent: ${event}`);
          } else {
            console.warn("[Realtime] broadcast response:", response);
          }
        } catch (err) {
          clearTimeout(timeout);
          console.error("[Realtime] broadcast error", err);
        }

        isResolved = true;
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timeout);
        console.warn(`[Realtime] broadcast channel ${status}`);
        isResolved = true;
        resolve();
      }
    });
  });
}

/**
 * Subscribe to broadcast messages on a channel
 * Based on: https://supabase.com/docs/guides/realtime/broadcast#receiving-broadcast-messages
 */
export function subscribeToChannel(
  channelName: string,
  events: string[],
  callback: (event: string, payload: Record<string, unknown>) => void,
  options?: { self?: boolean },
): RealtimeChannel {
  const supabase = createClient();

  // Check if channel already exists in registry
  const existing = channelRegistry.get(channelName);
  if (existing) {
    console.log(
      `[Realtime] reusing existing channel ${channelName}, adding callbacks`,
    );

    // Add callbacks to existing channel
    events.forEach((eventName) => {
      let callbackSet = existing.callbacks.get(eventName);
      if (!callbackSet) {
        callbackSet = new Set();
        existing.callbacks.set(eventName, callbackSet);
      }
      callbackSet.add((payload) => callback(eventName, payload));
    });

    return existing.channel;
  }

  // Create new channel
  const channel = supabase.channel(channelName, {
    config: {
      broadcast: { self: options?.self ?? false },
    },
  });

  // Initialize registry entry
  const callbacks = new Map<
    string,
    Set<(payload: Record<string, unknown>) => void>
  >();
  events.forEach((eventName) => {
    const callbackSet = new Set<(payload: Record<string, unknown>) => void>();
    callbackSet.add((payload) => callback(eventName, payload));
    callbacks.set(eventName, callbackSet);
  });

  channelRegistry.set(channelName, { channel, callbacks });

  // Register handlers for each event
  events.forEach((eventName) => {
    channel.on(
      "broadcast",
      { event: eventName },
      (message: { payload: Record<string, unknown> }) => {
        console.log(`[Realtime] received event: ${eventName}`, message.payload);

        // Call all registered callbacks for this event
        const entry = channelRegistry.get(channelName);
        const callbackSet = entry?.callbacks.get(eventName);
        if (callbackSet) {
          callbackSet.forEach((cb) => {
            try {
              cb(message.payload ?? {});
            } catch (err) {
              console.error("[Realtime] subscriber callback error:", err);
            }
          });
        }
      },
    );
  });

  // Subscribe to the channel with status handling
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      console.log(
        `[Realtime] ✓ subscribed to ${channelName} for events:`,
        events,
      );
    } else if (status === "CHANNEL_ERROR") {
      console.error(`[Realtime] ✗ channel ${channelName} error`);
    } else if (status === "TIMED_OUT") {
      console.warn(`[Realtime] ⚠ channel ${channelName} timed out`);
    } else if (status === "CLOSED") {
      console.log(`[Realtime] channel ${channelName} closed`);
      channelRegistry.delete(channelName);
    }
  });

  return channel;
}

/**
 * Subscribe to Postgres database changes
 * Based on: https://supabase.com/docs/guides/realtime/postgres-changes
 */
export function subscribeToPostgresChannel(
  channelName: string,
  changeSpec: {
    event: "INSERT" | "UPDATE" | "DELETE" | "*";
    schema: string;
    table: string;
    filter?: string;
  },
  callback: (payload: {
    eventType: string;
    new: Record<string, unknown>;
    old: Record<string, unknown>;
    schema: string;
    table: string;
  }) => void,
): RealtimeChannel {
  console.log(
    `[Realtime] subscribeToPostgresChannel called for ${channelName}`,
    changeSpec,
  );

  const supabase = createClient();

  // Check if channel already exists in registry - reuse it
  const existing = channelRegistry.get(channelName);
  if (existing) {
    console.log(`[Realtime] reusing existing postgres channel ${channelName}`);
    return existing.channel;
  }

  const channel = supabase.channel(channelName);

  // Initialize registry entry
  channelRegistry.set(channelName, {
    channel,
    callbacks: new Map(),
  });

  // Use proper postgres_changes subscription
  const subscriptionConfig: {
    event: "INSERT" | "UPDATE" | "DELETE" | "*";
    schema: string;
    table: string;
    filter?: string;
  } = {
    event: changeSpec.event,
    schema: changeSpec.schema,
    table: changeSpec.table,
  };

  if (changeSpec.filter) {
    subscriptionConfig.filter = changeSpec.filter;
  }

  channel
    .on("postgres_changes", subscriptionConfig, (payload) => {
      console.log(`[Realtime] received postgres change:`, payload);
      try {
        callback(payload as any);
      } catch (err) {
        console.error("[Realtime] postgres subscriber callback error:", err);
      }
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(
          `[Realtime] ✓ subscribed to postgres channel ${channelName}`,
        );
      } else if (status === "CHANNEL_ERROR") {
        // Postgres changes require RLS policies - this is expected if not configured
        console.warn(
          `[Realtime] postgres channel ${channelName} error (check RLS policies)`,
        );
      } else if (status === "TIMED_OUT") {
        console.warn(`[Realtime] ⚠ postgres channel ${channelName} timed out`);
      } else if (status === "CLOSED") {
        console.log(`[Realtime] postgres channel ${channelName} closed`);
        channelRegistry.delete(channelName);
      }
    });

  return channel;
}

/**
 * Unsubscribe and remove a channel
 */
export function unsubscribeFromChannel(channel: RealtimeChannel): void {
  // Find and remove from registry
  for (const [name, entry] of channelRegistry.entries()) {
    if (entry.channel === channel) {
      channelRegistry.delete(name);
      console.log(`[Realtime] removed ${name} from registry`);
      break;
    }
  }

  // Don't actually remove the channel - just clear callbacks
  // This prevents WebSocket disconnection issues
  console.log("[Realtime] channel callbacks cleared (channel kept alive)");
}

/**
 * Subscribe to all broadcast events on a channel using wildcard
 */
export function subscribeToAllBroadcasts(
  channelName: string,
  callback: (event: string, payload: Record<string, unknown>) => void,
  options?: { self?: boolean },
): RealtimeChannel {
  const supabase = createClient();

  // Check if channel already exists in registry - reuse it
  const existing = channelRegistry.get(channelName);
  if (existing) {
    console.log(`[Realtime] reusing existing wildcard channel ${channelName}`);
    return existing.channel;
  }

  const channel = supabase.channel(channelName, {
    config: {
      broadcast: { self: options?.self ?? false },
    },
  });

  // Use "*" to listen to all events
  channel.on(
    "broadcast",
    { event: "*" },
    (message: { event: string; payload: Record<string, unknown> }) => {
      console.log(
        `[Realtime] received wildcard event: ${message.event}`,
        message.payload,
      );
      try {
        callback(message.event, message.payload ?? {});
      } catch (err) {
        console.error("[Realtime] subscriber callback error:", err);
      }
    },
  );

  // Add to registry with wildcard callback
  const callbacks = new Map<
    string,
    Set<(payload: Record<string, unknown>) => void>
  >();
  const wildcardSet = new Set<(payload: Record<string, unknown>) => void>();
  wildcardSet.add((payload) => callback("*", payload));
  callbacks.set("*", wildcardSet);
  channelRegistry.set(channelName, { channel, callbacks });

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      console.log(
        `[Realtime] ✓ subscribed to all broadcasts on ${channelName}`,
      );
    } else if (status === "CHANNEL_ERROR") {
      console.error(`[Realtime] ✗ channel ${channelName} error`);
    }
  });

  return channel;
}

/**
 * Check if a channel is connected
 */
export function isChannelFailed(_channelName: string): boolean {
  return false;
}

/**
 * Get debug information about realtime connections
 */
export function getRealtimeRegistrySnapshot(): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  channelRegistry.forEach((value, key) => {
    snapshot[key] = {
      callbackCount: value.callbacks.size,
      state: value.channel.state,
    };
  });
  return snapshot;
}
