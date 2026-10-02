/**
 * 试玩会话测试：PreviewSession 直接驱动真实 experiment-runtime（不经 API、不落库），
 * 走酶温度实验的 80℃ 高温路径，验证与学生端一致的行为语义。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PreviewSession } from '../src/preview/session';

const definition = JSON.parse(
  readFileSync(resolve(process.cwd(), '../../examples/enzyme-temperature.v0.1.json'), 'utf-8'),
) as Record<string, unknown>;

describe('PreviewSession（教师试玩，纯内存）', () => {
  it('80℃ 高温路径：DENATURED 结局 + 得分 10 + 完整事件轨迹', async () => {
    const session = await PreviewSession.start(definition);

    let run = session.getRun();
    expect(run.status).toBe('RUNNING');

    // START → ADVANCE
    let result = await session.dispatch({ type: 'ADVANCE' });
    expect(result.ok).toBe(true);

    // 变量输入：温度 80
    result = await session.dispatch({ type: 'SET_VARIABLE', variableId: 'temperature', value: 80 });
    expect(result.ok).toBe(true);
    result = await session.dispatch({ type: 'ADVANCE' });
    expect(result.ok).toBe(true);

    // CONDITION 自动走高温分支 → 变性媒体节点
    result = await session.dispatch({ type: 'ADVANCE' });
    expect(result.ok).toBe(true);
    run = session.getRun();
    expect(run.state.variables.sampleStatus).toBe('DENATURED');

    // 媒体 → 观察节点
    result = await session.dispatch({ type: 'ADVANCE' });
    expect(result.ok).toBe(true);
    expect(session.getRun().currentNodeId).toBe('observe');

    // 观察记录
    result = await session.dispatch({ type: 'SUBMIT_OBSERVATION', text: '没有气泡产生' });
    expect(result.ok).toBe(true);
    result = await session.dispatch({ type: 'ADVANCE' });
    expect(result.ok).toBe(true);

    run = session.getRun();
    expect(run.status).toBe('COMPLETED');
    expect(run.state.score).toBe(10);

    // 事件轨迹完整且按 sequence 升序
    const events = await session.events();
    expect(events.length).toBeGreaterThan(5);
    const sequences = events.map((e) => e.sequence);
    expect(sequences).toEqual([...sequences].sort((a, b) => a - b));
    expect(events.some((e) => e.type === 'VARIABLE_CHANGED')).toBe(true);
    expect(events.some((e) => e.type === 'OBSERVATION_SUBMITTED')).toBe(true);
  });

  it('拒绝命令返回原因而不是抛错', async () => {
    const session = await PreviewSession.start(definition);
    // START 节点上 SET_VARIABLE 不合法
    const result = await session.dispatch({
      type: 'SET_VARIABLE',
      variableId: 'temperature',
      value: 80,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.length).toBeGreaterThan(0);
  });

  it('非法 Definition 启动即报错', async () => {
    await expect(PreviewSession.start({ not: 'a definition' })).rejects.toThrow(/试玩启动失败/);
  });
});
