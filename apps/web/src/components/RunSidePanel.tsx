import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';
import { useState } from 'react';
import type { RunEvent } from '../api/types';
import { Backpack } from './Backpack';

export interface RunSidePanelProps {
  events: RunEvent[];
  definition: ExperimentDefinition;
  /** 背包条目数（用于移动端抽屉横条） */
  backpackCount: number;
}

/** 侧栏背包：桌面为固定面板；≤800px 折叠为底部抽屉。 */
export function RunSidePanel({ events, definition, backpackCount }: RunSidePanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <aside className={`side-panel${open ? ' open' : ''}`}>
      <button
        type="button"
        className="drawer-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '收起 ▾' : `背包 (${backpackCount}) ▴`}
      </button>
      <div className="side-panel-body">
        <Backpack events={events} definition={definition} />
      </div>
    </aside>
  );
}
