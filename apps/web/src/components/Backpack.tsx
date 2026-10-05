import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';
import type { RunEvent } from '../api/types';
import { collectBackpack } from '../lib/run-derive';

export interface BackpackProps {
  events: RunEvent[];
  definition: ExperimentDefinition;
}

/** 实验记录背包：聚合观察记录 / 问答记录 / 关键变量变化。 */
export function Backpack({ events, definition }: BackpackProps) {
  const { observations, questions, variables } = collectBackpack(events, definition);
  const total = observations.length + questions.length + variables.length;

  if (total === 0) {
    return (
      <div className="backpack empty-state" aria-label="实验记录背包">
        <p>背包还是空的</p>
        <p>提交的观察、回答和关键操作会记录在这里</p>
      </div>
    );
  }

  return (
    <div className="backpack" aria-label="实验记录背包">
      {observations.length > 0 ? (
        <section className="backpack-section">
          <h4>观察记录（{observations.length}）</h4>
          <ul>
            {observations.map((item) => (
              <li key={item.eventId}>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {questions.length > 0 ? (
        <section className="backpack-section">
          <h4>问答记录（{questions.length}）</h4>
          <ul>
            {questions.map((item) => (
              <li key={item.eventId}>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {variables.length > 0 ? (
        <section className="backpack-section">
          <h4>关键操作（{variables.length}）</h4>
          <ul>
            {variables.map((item) => (
              <li key={item.eventId}>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
