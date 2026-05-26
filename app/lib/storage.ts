const PREFIX = "alma4d:";

// 🔹 Monta chave com prefixo
function key(name: string) {
  return `${PREFIX}${name}`;
}

// 🔹 SET
export function setStorageItem(name: string, value: unknown) {
  try {
    localStorage.setItem(key(name), JSON.stringify(value));
  } catch (e) {
    console.error("Erro ao salvar no storage:", e);
  }
}

// 🔹 GET
export function getStorageItem<T = unknown>(name: string): T | null {
  try {
    const raw = localStorage.getItem(key(name));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// 🔹 REMOVE
export function removeStorageItem(name: string) {
  try {
    localStorage.removeItem(key(name));
  } catch {}
}

// 🔹 CLEAR SOMENTE alma4d
export function clearAlma4dStorage() {
  try {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith(PREFIX)) {
        localStorage.removeItem(k);
      }
    });
  } catch {}
}
