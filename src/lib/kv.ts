import Storage from 'expo-sqlite/kv-store';

/** Synchronous key-value storage. iOS/Android: SQLite-backed. */
export const kv = {
  get: (key: string): string | null => Storage.getItemSync(key),
  set: (key: string, value: string) => Storage.setItemSync(key, value),
};
