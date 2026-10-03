import type { ReactNode } from 'react';

export interface NodeActionBarProps {
  /** 第 N 步（访问栈深度），起点为 1 */
  step: number;
  busy: boolean;
  /** 是否可回退（起点或已结束时为 false） */
  canBack: boolean;
  onBack: () => void;
  /** 右侧操作区：各节点的主按钮/附加按钮/链接 */
  children: ReactNode;
}

/** 统一操作栏：回退固定在左下，主操作固定在右下，步骤提示紧邻回退。 */
export function NodeActionBar({ step, busy, canBack, onBack, children }: NodeActionBarProps) {
  return (
    <div className="action-bar">
      <div className="action-bar-left">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy || !canBack}
          onClick={onBack}
        >
          ← 回退
        </button>
        <span className="step-hint">第 {step} 步</span>
      </div>
      <div className="action-bar-right">{children}</div>
    </div>
  );
}
