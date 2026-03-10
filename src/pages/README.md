# Chat 页面通知组件集成说明

## 修改内容

已在 Chat 页面 (`src/pages/chat.tsx`) 中添加了全文传递完成通知组件。

## 修改详情

### 1. 导入组件

在文件顶部添加了导入语句：

```tsx
import FullTextDeliveryToast from '../components/notice/fullTextDeliveryToast';
```

### 2. 添加组件到页面

在 `<>...</>` 片段中（SearchModal 之后）添加了组件：

```tsx
{/* 全文传递完成通知 */}
<FullTextDeliveryToast />
```

## 组件功能

`FullTextDeliveryToast` 组件用于显示全文传递完成的通知，具有以下特性：

- **固定定位**：显示在浏览器窗口的右下角
- **样式**：浅蓝色背景 (#f0f4ff)，圆角卡片设计
- **内容**：
  - 标题："全文传递已完成"
  - 副标题："前往设置-全文传递查看"
  - 操作按钮："前往查看"
- **响应式**：最小宽度 450px，适应不同屏幕尺寸

## 效果展示

访问 Chat 页面 (`/chat`) 时，会在浏览器右下角看到一个固定的通知卡片，显示全文传递完成的提示信息。

## 自定义配置

如需修改通知的行为或样式，可以编辑 `src/components/notice/fullTextDeliveryToast.tsx` 文件。

### 可配置项：

1. **显示/隐藏**：添加状态控制
2. **点击事件**：修改 `onClick` 处理函数
3. **样式**：修改 Tailwind CSS 类名
4. **位置**：修改 `fixed bottom-8 right-8` 定位

### 示例：添加显示控制

```tsx
// 在 Chat 页面中添加状态
import { useState } from "react";

export default function ChatPage() {
  const [showToast, setShowToast] = useState(true);

  return (
    <>
      {/* ...其他内容 */}
      {showToast && <FullTextDeliveryToast />}
    </>
  );
}

// 在组件中添加关闭功能
// 修改 fullTextDeliveryToast.tsx
const FullTextDeliveryToast: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed bottom-8 right-8 z-50">
      {/* ... */}
      <button onClick={onClose} className="close-button">×</button>
    </div>
  );
};
```

## 注意事项

1. **z-index**：组件使用 `z-50`，确保显示在其他内容之上
2. **响应式**：在移动端可能需要调整最小宽度或布局
3. **性能**：组件是无状态的，如需要持久化控制，建议提升状态到父组件或使用全局状态管理

## 后续优化建议

1. **添加关闭功能**：让用户可以手动关闭通知
2. **自动隐藏**：设置定时器自动隐藏通知
3. **动画效果**：添加进入/退出动画
4. **多通知管理**：支持同时显示多个通知
5. **路由跳转**：点击"前往查看"按钮跳转到全文传递页面

## 文件位置

- 组件文件：`src/components/notice/fullTextDeliveryToast.tsx`
- Chat 页面文件：`src/pages/chat.tsx`
- 说明文档：`src/pages/README.md`
