const KEY = 'vlab_student_id';

/** HTTP 非安全上下文下 crypto.randomUUID 不可用，需回退。 */
function uuid(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  if (typeof c?.getRandomValues === 'function') {
    const b = c.getRandomValues(new Uint8Array(16));
    b[6] = ((b[6] ?? 0) & 0x0f) | 0x40;
    b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** 无认证阶段的最简身份：本地生成并持久化。 */
export function getStudentId(): string {
  const existing = localStorage.getItem(KEY);
  if (existing) return existing;
  const id = `stu_${uuid().slice(0, 8)}`;
  localStorage.setItem(KEY, id);
  return id;
}
