import type { MediaNode } from '@virtual-biology-lab/experiment-schema';
import { useEffect, useState } from 'react';
import { assetContentUrl, fetchAssetText } from '../api/client';
import type { NodeRendererProps } from './types';

const MEDIA_LABEL: Record<string, string> = { VIDEO: '视频', IMAGE: '图片', TEXT: '文本' };

/** 媒体节点：有实体文件时真实渲染，缺失/加载失败降级为占位卡片，不阻塞流程。 */
export function MediaNodeView({ node, definition, busy, onCommand }: NodeRendererProps) {
  const typed = node as MediaNode;
  const asset = definition.assets.find((a) => a.assetId === typed.config.assetId);
  const mediaType = typed.config.mediaType;
  const assetId = typed.config.assetId;

  const [missing, setMissing] = useState(false);
  const [text, setText] = useState<string | null>(null);

  // TEXT 类型需要主动拉取内容；404（未上传文件）→ 降级
  useEffect(() => {
    if (mediaType !== 'TEXT' || !asset) return;
    let cancelled = false;
    fetchAssetText(assetId)
      .then((content) => {
        if (cancelled) return;
        if (content === null) setMissing(true);
        else setText(content);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [mediaType, assetId, asset]);

  const renderMedia = () => {
    if (!asset || missing) return null;
    const url = assetContentUrl(assetId);
    if (mediaType === 'IMAGE') {
      return (
        <img
          className="media-content"
          src={url}
          alt={asset.name ?? assetId}
          onError={() => setMissing(true)}
        />
      );
    }
    if (mediaType === 'VIDEO') {
      // 视频加载失败时 error 事件在 <source>/<video> 上触发
      return (
        // biome-ignore lint/a11y/useMediaCaption: 教学演示视频暂无字幕轨
        <video className="media-content" controls src={url} onError={() => setMissing(true)} />
      );
    }
    // TEXT
    if (text === null) return <p className="panel-hint">素材加载中……</p>;
    return <pre className="media-text">{text}</pre>;
  };

  const media = renderMedia();

  return (
    <section className="node-panel">
      <h2>{typed.label ?? '观察材料'}</h2>
      {media ?? (
        <div className="media-card">
          <span className="media-badge">{MEDIA_LABEL[mediaType] ?? mediaType}</span>
          <div className="media-body">
            <strong>{asset?.name ?? assetId}</strong>
            <span className="media-asset-id">
              {assetId}（{asset ? '未上传文件，占位展示' : '未在 assets 中声明'}）
            </span>
          </div>
        </div>
      )}
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
