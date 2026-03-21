import { useState, useRef, useEffect } from 'react';

interface AudioRecorderResult {
  isRecording: boolean;
  toggleRecording: () => void;
  transcribedText: string;
  setTranscribedText: (text: string) => void;
}

export function useAudioRecorder(): AudioRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const accumulatedTextRef = useRef(''); // 累积的识别文本

  // Cleanup function to stop recognition
  const cleanupRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  // Automatically cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupRecognition();
    };
  }, []);

  // Toggle recording state
  const toggleRecording = () => {
    if (isRecording) {
      // 停止识别
      cleanupRecognition();
    } else {
      // 开始识别
      startRealTimeRecognition();
    }
  };

  // 设置累积文本（外部调用）
  const setAccumulatedText = (text: string) => {
    accumulatedTextRef.current = text;
  };

  // 重写 setTranscribedText 以支持累积文本
  const customSetTranscribedText = (text: string) => {
    if (!isRecording) {
      // 不在录音状态时，设置累积文本
      accumulatedTextRef.current = text;
    }
    setTranscribedText(text);
  };

  // Start real-time speech recognition
  const startRealTimeRecognition = () => {
    try {
      // 检查浏览器是否支持语音识别
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('浏览器不支持语音识别，请使用Chrome浏览器或联系管理员配置语音识别服务');
        return;
      }

      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();

      // 配置语音识别
      recognition.continuous = true; // 持续识别
      recognition.interimResults = true; // 显示临时结果
      recognition.lang = 'zh-CN'; // 中文识别
      recognition.maxAlternatives = 1;

      // 重置本次转录文本，但保留累积文本
      finalTranscriptRef.current = '';
      // 不清空 transcribedText，保留累积的文本
      // setTranscribedText('');

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';

        // 处理识别结果
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;

          if (event.results[i].isFinal) {
            // 最终结果，添加到本次累积文本中
            finalTranscriptRef.current += transcript;
          } else {
            // 临时结果，实时显示
            interimTranscript = transcript;
          }
        }

        // 实时更新显示的文本（累积文本 + 本次最终结果 + 临时结果）
        const currentText = accumulatedTextRef.current + finalTranscriptRef.current + interimTranscript;
        setTranscribedText(currentText);
      };

      recognition.onerror = (event: any) => {
        console.error('语音识别错误:', event.error);
        setIsRecording(false);

        // 根据错误类型显示不同的提示
        switch (event.error) {
          case 'no-speech':
            // 静默处理，不显示提示
            break;
          case 'not-allowed':
          case 'service-not-allowed':
            alert('无法访问麦克风，请检查麦克风权限');
            break;
          default:
            console.warn('语音识别出现问题:', event.error);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        // 识别结束时，将本次最终结果添加到累积文本中
        if (finalTranscriptRef.current) {
          accumulatedTextRef.current += finalTranscriptRef.current;
        }
      };

      // 保存识别实例并开始
      recognitionRef.current = recognition;
      recognition.start();

    } catch (error) {
      console.error('启动语音识别失败:', error);
      alert('无法启动语音识别，请检查麦克风权限');
      setIsRecording(false);
    }
  };

  return {
    isRecording,
    toggleRecording,
    transcribedText,
    setTranscribedText: customSetTranscribedText
  };
}
