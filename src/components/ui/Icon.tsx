import React from 'react';
import { getIcon } from '@/utils/iconMapping';

interface IconProps {
  name: string;
  className?: string;
  width?: number;
  height?: number;
}

/**
 * 通用图标组件
 * 自动映射旧的 PNG 图标名称到 lucide-react 图标组件
 *
 * @example
 * <Icon name="chat-page-close" className="w-5 h-5" />
 * <Icon name="paper-refresh" width={20} height={20} />
 */
export function Icon({ name, className, width = 20, height = 20 }: IconProps) {
  const IconComponent = getIcon(name);

  if (!IconComponent) {
    // 降级：如果找不到图标，返回 null（可以改为返回原图片）
    console.warn(`Icon not found: ${name}`);
    return null;
  }

  return <IconComponent className={className} width={width} height={height} />;
}
