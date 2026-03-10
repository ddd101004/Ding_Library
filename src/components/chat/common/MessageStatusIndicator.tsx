import React from 'react';
import StopStreamingButton from './StopStreamingButton';

interface MessageStatusIndicatorProps {
  isStreaming: boolean;
  isSending?: boolean;
  hasError?: boolean;
  onStopStreaming?: () => void;
  hasThinking?: boolean;
}

const MessageStatusIndicator: React.FC<MessageStatusIndicatorProps> = ({
  isStreaming,
  isSending = false,
  hasError = false,
  onStopStreaming,
  hasThinking = false,
}) => {
  if (hasError) {
    return (
      <div className="text-red-500 text-sm mt-1 flex items-center">
        <span className="mr-1">发送失败</span>
        {onStopStreaming && (
          <button
            onClick={onStopStreaming}
            className="text-blue-500 hover:underline"
          >
            重试
          </button>
        )}
      </div>
    );
  }

  if (isSending && !isStreaming) {
    return (
      <div className="text-gray-500 text-sm mt-1">
        发送中...
      </div>
    );
  }

  if (isStreaming && onStopStreaming) {
    return (
      <StopStreamingButton
        onStop={onStopStreaming}
        hasThinking={hasThinking}
        isStreaming={isStreaming}
      />
    );
  }

  return null;
};

export default MessageStatusIndicator;