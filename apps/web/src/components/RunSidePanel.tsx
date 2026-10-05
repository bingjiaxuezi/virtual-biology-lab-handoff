import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';
import { useState } from 'react';
import type { RunEvent } from '../api/types';
import { Backpack } from './Backpack';
import { EventTrail } from './EventTrail';

export interface RunSidePanelProps {
  events: RunEvent[];
  definition: ExperimentDefinition;
  currentNodeId: string;
  canJump: boolean;
  onJump: (nodeId: string) => void;
  /** 背包条目数（用于页签角标） */
  backpackCount: number;
}

type Tab = 'trail' | 'backpack';

/** 侧栏：桌面为「轨迹 | 背包」页签面板；≤800px 折叠为底部抽屉。 */
export function RunSidePanel({
  events,
  definition,
  currentNodeId,
  canJump,
  onJump,
  backpackCount,
}: RunSidePanelProps) {
  const [tab, setTab] = useState<Tab>('trail');
  const [open, setOpen] = useState(false);

  return (
    <aside className={`side-panel${open ? ' open' : ''}`}>
      <button
        type="button"
        className="drawer-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '收起 ▾' : `轨迹 ${events.length} · 背包 ${backpackCount} ▴`}
      </button>
      <div className="side-panel-body">
        <div className="side-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'trail'}
            className={tab === 'trail' ? 'active' : ''}
            onClick={() => setTab('trail')}
          >
            轨迹 ({events.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'backpack'}
            className={tab === 'backpack' ? 'active' : ''}
            onClick={() => setTab('backpack')}
          >
            背包 ({backpackCount})
          </button>
        </div>
        <div className="side-content">
          {tab === 'trail' ? (
            <EventTrail
              events={events}
              definition={definition}
              currentNodeId={currentNodeId}
              canJump={canJump}
              onJump={onJump}
            />
          ) : (
            <Backpack events={events} definition={definition} />
          )}
        </div>
      </div>
    </aside>
  );
}
