// ORBIT Frontline - Offline Sync Engine (IndexedDB + Background Replay)
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export interface OfflineAction {
  id: string;
  type: 'STATUS_UPDATE' | 'PART_SWAP' | 'POW_PHOTO' | 'OTP_SIGN' | 'CUSTOM';
  description: string;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT';
  payload: any;
  createdAt: string;
  retries: number;
  status: 'QUEUED' | 'SYNCING' | 'ERROR';
  lastError?: string;
}

const DB_NAME = 'orbit_frontline_v1';
const DB_VERSION = 1;
const QUEUE_STORE = 'offline_queue';
const CACHE_STORE = 'cached_jobs';

// Open / initialize IndexedDB
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this browser environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Queue an action when offline
export async function enqueueAction(
  action: Omit<OfflineAction, 'id' | 'createdAt' | 'retries' | 'status'>
): Promise<OfflineAction> {
  const db = await openDb();
  const id = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fullAction: OfflineAction = {
    ...action,
    id,
    createdAt: new Date().toISOString(),
    retries: 0,
    status: 'QUEUED',
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.add(fullAction);

    req.onsuccess = () => {
      // Notify listeners in current tab
      window.dispatchEvent(new CustomEvent('orbit:offline-queue-changed'));
      resolve(fullAction);
    };
    req.onerror = () => reject(req.error);
  });
}

// Retrieve all currently queued offline actions
export async function getQueuedActions(): Promise<OfflineAction[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        const sorted = (req.result as OfflineAction[]).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

// Remove an action after successful sync
export async function dequeueAction(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.delete(id);

    req.onsuccess = () => {
      window.dispatchEvent(new CustomEvent('orbit:offline-queue-changed'));
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

// Save job details for offline viewing
export async function cacheJobLocally(job: any): Promise<void> {
  if (!job?.id) return;
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, 'readwrite');
      const store = tx.objectStore(CACHE_STORE);
      const req = store.put({ id: job.id, data: job, updatedAt: Date.now() });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[OfflineDB] Could not cache job locally', err);
  }
}

// Get all locally cached jobs
export async function getCachedJobs(): Promise<any[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, 'readonly');
      const store = tx.objectStore(CACHE_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        const items = (req.result || []).map((row: any) => row.data);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

// Replay queued offline actions against the API
export async function replayOfflineQueue(): Promise<{
  total: number;
  succeeded: number;
  failed: number;
}> {
  const queue = await getQueuedActions();
  if (queue.length === 0) return { total: 0, succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      if (item.method === 'POST') {
        await api.post(item.endpoint, item.payload);
      } else if (item.method === 'PATCH') {
        await api.patch(item.endpoint, item.payload);
      } else if (item.method === 'PUT') {
        await api.put(item.endpoint, item.payload);
      }

      await dequeueAction(item.id);
      succeeded++;
    } catch (error: any) {
      console.error(`[OfflineSync] Failed to replay action ${item.id}:`, error);
      failed++;
      // Stop sequential replay on network failure to preserve order of operations
      if (!navigator.onLine || error.code === 'ERR_NETWORK') {
        break;
      }
    }
  }

  window.dispatchEvent(new CustomEvent('orbit:offline-queue-changed'));
  return { total: queue.length, succeeded, failed };
}

// React Hook for Offline Sync State & Controls
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [queuedActions, setQueuedActions] = useState<OfflineAction[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const refreshQueue = useCallback(async () => {
    const items = await getQueuedActions();
    setQueuedActions(items);
  }, []);

  const syncNow = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return;
    setIsSyncing(true);
    try {
      await replayOfflineQueue();
    } finally {
      setIsSyncing(false);
      refreshQueue();
    }
  }, [isSyncing, refreshQueue]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-trigger sync on reconnection
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleQueueChange = () => {
      refreshQueue();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('orbit:offline-queue-changed', handleQueueChange);

    refreshQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('orbit:offline-queue-changed', handleQueueChange);
    };
  }, [refreshQueue, syncNow]);

  return {
    isOnline,
    queueCount: queuedActions.length,
    queuedActions,
    isSyncing,
    syncNow,
    refreshQueue,
  };
}
