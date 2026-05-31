const PRODUCT_MOVEMENT_DB_NAME = "product_movement_db";
const PRODUCT_MOVEMENT_DB_VERSION = 1;
const MOVEMENT_ANALYSIS_STORE = "movement_analysis_details";

function getIndexedDb() {
  if (typeof window === "undefined") return null;
  return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || null;
}

export function openProductMovementDb() {
  return new Promise((resolve, reject) => {
    const indexedDb = getIndexedDb();
    if (!indexedDb) {
      reject(new Error("IndexedDB no está disponible en este navegador."));
      return;
    }

    const request = indexedDb.open(PRODUCT_MOVEMENT_DB_NAME, PRODUCT_MOVEMENT_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MOVEMENT_ANALYSIS_STORE)) {
        const store = db.createObjectStore(MOVEMENT_ANALYSIS_STORE, { keyPath: "analysisId" });
        store.createIndex("savedAt", "savedAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("No se pudo abrir IndexedDB."));
  });
}

function runStoreTransaction(mode, callback) {
  return openProductMovementDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(MOVEMENT_ANALYSIS_STORE, mode);
        const store = transaction.objectStore(MOVEMENT_ANALYSIS_STORE);
        const request = callback(store);

        transaction.oncomplete = () => {
          db.close();
          resolve(request?.result);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error || request?.error || new Error("No se pudo completar la operación en IndexedDB."));
        };
      })
  );
}

export function saveMovementAnalysisDetail(analysisId, rows = []) {
  if (!analysisId) return Promise.resolve(null);
  return runStoreTransaction("readwrite", (store) =>
    store.put({
      analysisId,
      rows,
      savedAt: new Date().toISOString(),
    })
  );
}

export function getMovementAnalysisDetail(analysisId) {
  if (!analysisId) return Promise.resolve(null);
  return runStoreTransaction("readonly", (store) => store.get(analysisId));
}

export function deleteMovementAnalysisDetail(analysisId) {
  if (!analysisId) return Promise.resolve(null);
  return runStoreTransaction("readwrite", (store) => store.delete(analysisId));
}

export async function clearOldMovementAnalysisDetails(keepAnalysisId = "", maxAgeDays = 15) {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const db = await openProductMovementDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MOVEMENT_ANALYSIS_STORE, "readwrite");
    const store = transaction.objectStore(MOVEMENT_ANALYSIS_STORE);
    const request = store.openCursor();
    let deleted = 0;

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;

      const value = cursor.value;
      const savedAt = value?.savedAt ? new Date(value.savedAt).getTime() : 0;
      if (value?.analysisId !== keepAnalysisId && savedAt && savedAt < cutoff) {
        cursor.delete();
        deleted += 1;
      }
      cursor.continue();
    };

    transaction.oncomplete = () => {
      db.close();
      resolve(deleted);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error("No se pudieron limpiar análisis antiguos."));
    };
  });
}
