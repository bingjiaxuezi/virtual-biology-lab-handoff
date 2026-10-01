const KEY = 'vlab_student_id';

/** 无认证阶段的最简身份：本地生成并持久化。 */
export function getStudentId(): string {
  const existing = localStorage.getItem(KEY);
  if (existing) return existing;
  const id = `stu_${crypto.randomUUID().slice(0, 8)}`;
  localStorage.setItem(KEY, id);
  return id;
}
