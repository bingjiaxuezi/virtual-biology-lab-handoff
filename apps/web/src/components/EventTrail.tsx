import type { RunEvent } from '../api/types';

const EVENT_LABEL: Record<string, string> = {
  RUN_STARTED: '开始实验',
  NODE_ENTERED: '进入节点',
  ACTION_PERFORMED: '执行操作',
  VARIABLE_CHANGED: '变量变化',
  OBSERVATION_SUBMITTED: '提交观察',
  QUESTION_ANSWERED: '回答问题',
  RULE_APPLIED: '规则生效',
  TRANSITION_TAKEN: '流程推进',
  AI_BRIEFING_VIEWED: '查看 AI 导学',
  AI_HINT_REQUESTED: '请求 AI 提示',
  AI_HINT_SHOWN: 'AI 提示',
  AI_OBSERVATION_ASSISTED: 'AI 观察辅助',
  AI_REVIEW_GENERATED: 'AI 复盘',
  RUN_COMPLETED: '完成实验',
};

export function EventTrail({ events }: { events: RunEvent[] }) {
  return (
    <aside className="event-trail" aria-label="事件轨迹">
      <h3>事件轨迹</h3>
      {events.length === 0 ? (
        <p className="event-empty">还没有事件</p>
      ) : (
        <ol className="event-list">
          {[...events].reverse().map((event) => (
            <li key={event.eventId} className="event-item">
              <span className="event-sequence">#{event.sequence}</span>
              <span className="event-type">{EVENT_LABEL[event.type] ?? event.type}</span>
              {event.nodeId ? <span className="event-node">{event.nodeId}</span> : null}
              <time>{new Date(event.timestamp).toLocaleTimeString()}</time>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
