import "server-only";
import { type Client, type Transaction, createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * The local `file:` driver is synchronous: a connection waiting on SQLite's write
 * lock blocks the whole event loop, so the lock holder can never commit. Instead,
 * queue every statement and transaction through one async lock. Code inside a
 * transaction must use `tx`, never `db`, or it would wait on itself.
 */
function serialize(client: Client): Client {
  let tail: Promise<void> = Promise.resolve();
  const acquire = () => {
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    const ready = tail.then(() => release);
    tail = tail.then(() => held);
    return ready;
  };
  const exclusive =
    <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
    async (...args: A) => {
      const release = await acquire();
      try {
        return await fn(...args);
      } finally {
        release();
      }
    };

  const wrapTx = (tx: Transaction, release: () => void): Transaction => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        release();
      }
    };
    return new Proxy(tx, {
      get(target, prop) {
        const value = Reflect.get(target, prop, target);
        if (prop === "commit" || prop === "rollback") {
          return async () => {
            try {
              return await value.call(target);
            } finally {
              finish();
            }
          };
        }
        if (prop === "close") {
          return () => {
            try {
              return value.call(target);
            } finally {
              finish();
            }
          };
        }
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  };

  return new Proxy(client, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target);
      if (prop === "execute" || prop === "batch" || prop === "executeMultiple" || prop === "migrate") {
        return exclusive((...args: unknown[]) => value.apply(target, args));
      }
      if (prop === "transaction") {
        return async (...args: unknown[]) => {
          const release = await acquire();
          try {
            return wrapTx(await value.apply(target, args), release);
          } catch (e) {
            release();
            throw e;
          }
        };
      }
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

const url = process.env.DATABASE_URL!;
const client = createClient({
  url,
  authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  // Only matters if another process (e.g. drizzle-kit studio) holds the lock.
  timeout: 1000,
});

export const db = drizzle(url.startsWith("file:") ? serialize(client) : client, { schema });
