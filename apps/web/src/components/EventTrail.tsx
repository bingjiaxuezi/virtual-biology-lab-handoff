import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';
import type { RunEvent } from '../api/types';
import { summarizeEvent } from '../lib/run-derive';

export interface EventTrailProps {
  events: RunEvent[];
  definition: ExperimentDefinition;
  currentNodeId: string;
  /** 运行中才可点击跳转（读档） */
  canJump: boolean;
  onJump: (nodeId: string) => void;
}

/** 事件轨迹：节点标题 + 操作摘要，历史导航事件可点击读档，当前位置高亮。 */
export function EventTrail({
  events,
  definition,
  currentNodeId,
  canJump,
  onJump,
}: EventTrailProps) {
  // 最近一次导航事件（当前位置）
  const navEvents = events.filter(
    (e) => e.type === 'NODE_ENTERED' || e.type === 'STEPPED_BACK' || e.type === 'JUMPED_TO',
  );
  const currentEventId = navEvents[navEvents.length - 1]?.eventId;

  const visible = events.filter((e) => summarizeEvent(e, definition) !== null);

  return (
    <div className="event-trail" aria-label="事件轨迹">
      {visible.length === 0 ? (
        <p className="event-empty">还没有事件</p>
      ) : (
        <ol className="event-list">
          {[...visible].reverse().map((event) => {
            const jumpTarget =
              event.type === 'NODE_ENTERED'
                ? event.nodeId
                : event.type === 'STEPPED_BACK' || event.type === 'JUMPED_TO'
                  ? typeof event.payload.to === 'string'
                    ? event.payload.to
                    : undefined
                  : undefined;
            const jumpable =
              canJump &&
              jumpTarget !== undefined &&
              jumpTarget !== currentNodeId &&
              event.eventId !== currentEventId;
            const isCurrent = event.eventId === currentEventId;
            return (
              <li
                key={event.eventId}
                className={`event-item${isCurrent ? ' current' : ''}${jumpable ? ' jumpable' : ''}`}
              >
                {jumpable ? (
                  <button
                    type="button"
                    className="event-jump"
                    onClick={() => onJump(jumpTarget)}
                    title="回到这一步"
                  >
                    {summarizeEvent(event, definition)}
                  </button>
                ) : (
                  <span className="event-summary">{summarizeEvent(event, definition)}</span>
                )}
                <time>{new Date(event.timestamp).toLocaleTimeString()}</time>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
