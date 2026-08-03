import { useCallback, useEffect, useState } from "react";

/**
 * Persistencia local resiliente.
 * - Si el almacenamiento falla, la aplicación continúa con el estado en memoria
 *   y expone `storageError` para informar sin bloquear la navegación (POC-02, 9.1).
 * - `merge` permite integrar datos guardados con versiones previas del modelo.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  merge?: (stored: unknown, initial: T) => T
) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item) as unknown;
        setStoredValue(merge ? merge(parsed, initialValue) : (parsed as T));
      }
    } catch (error) {
      console.warn(`No se pudo leer el almacenamiento local "${key}":`, error);
      setStorageError(true);
    }
    setIsHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(key, JSON.stringify(next));
          }
        } catch (error) {
          console.warn(`No se pudo guardar en el almacenamiento local "${key}":`, error);
          setStorageError(true);
        }
        return next;
      });
    },
    [key]
  );

  const removeValue = useCallback(() => {
    setStoredValue(initialValue);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`No se pudo limpiar el almacenamiento local "${key}":`, error);
      setStorageError(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { value: storedValue, setValue, removeValue, isHydrated, storageError };
}
