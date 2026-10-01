import type { MediaNode } from '@virtual-biology-lab/experiment-schema';
import type { NodeRendererProps } from './types';

const MEDIA_LABEL: Record<string, string> = { VIDEO: '视频', IMAGE: '图片', TEXT: '文本' };

export function MediaNodeView({ node, definition, busy, onCommand }: NodeRendererProps) {
  const typed = node as MediaNode;
  const asset = definition.assets.find((a) => a.assetId === typed.config.assetId);

  return (
    <section className="node-panel">
      <h2>{typed.label ?? '观察材料'}</h2>
      <div className="media-card">
        <span className="media-badge">
          {MEDIA_LABEL[typed.config.mediaType] ?? typed.config.mediaType}
        </span>
        <div className="media-body">
          <strong>{asset?.name ?? typed.config.assetId}</strong>
          <span className="media-asset-id">{typed.config.assetId}</span>
        </div>
      </div>
      {typed.config.caption ? <p>{typed.config.caption}</p> : null}
      <button
        type="button"
        className="primary"
        disabled={busy}
        onClick={() => onCommand({ type: 'ADVANCE' })}
      >
        继续
      </button>
    </section>
  );
}
