import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/api/request";
import { uploadFileToLocal } from "@/api/upload-local";
import { cn } from "@/lib/utils";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileImported: (folderId: string, fileData: any) => void;
  onRefreshFolder?: (folderId: string) => void;
  folderId?: string;
  onProcessingChange?: (isProcessing: boolean) => void;
  folderContents?: any[]; // 新增：文件夹内容，用于检测重复
}

export default function ImportModal({ isOpen, onClose, onFileImported, onRefreshFolder, onProcessingChange, folderId, folderContents = [] }: ImportModalProps) {
  const [showFirstModal, setShowFirstModal] = useState(false);
  const [showSecondModal, setShowSecondModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHoveringFirstModal, setIsHoveringFirstModal] = useState(false);
  const [isHoveringSecondModal, setIsHoveringSecondModal] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);
  const firstModalRef = useRef<HTMLDivElement>(null);
  const secondModalRef = useRef<HTMLDivElement>(null);
  const historyModalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 检查文件类型是否支持
  const isSupportedFileType = (fileName: string): boolean => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['pdf', 'docx', 'txt'].includes(ext || '');
  };

  // 检查文件大小是否超过限制
  const isFileSizeValid = (file: File): boolean => {
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    return file.size <= MAX_FILE_SIZE;
  };

  // 格式化文件大小显示
  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // 格式化日期
  const formatDate = (dateString?: string): string => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date
      .toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\//g, "-");
  };

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if (!files || files.length === 0) {
      // 用户取消了文件选择，关闭整个导入弹窗
      setIsProcessing(false);
      if (onProcessingChange) {
        onProcessingChange(false);
      }
      onClose();
      return;
    }

    const file = files[0];

    // 检查文件类型
    if (!isSupportedFileType(file.name)) {
      toast.error('不支持的文件类型，仅支持 PDF、DOCX、TXT 格式（不支持 DOC 和 MD）');
      return;
    }

    // 检查文件大小
    if (!isFileSizeValid(file)) {
      toast.error(`文件大小超过限制，请选择小于 50MB 的文件（当前大小：${formatFileSize(file.size)}）`);
      return;
    }

    // 检查文件是否为空
    if (file.size === 0) {
      toast.error('文件内容为空，无法上传');
      return;
    }

    // 检查是否有文件夹ID
    if (!folderId) {
      toast.error('请先选择一个知识库文件夹');
      return;
    }

    setIsProcessing(true);
    // 不在这里关闭第二个弹窗，因为用户可能需要重新选择文件
    // 只在文件选择完成后关闭弹窗

    try {
  const result = await uploadFileToLocal(file, (progress) => {
    // 上传进度回调
  });


      if (result.id) {
        try {
          // 调用API将文件添加到文件夹中
          await apiPost(`/api/folders/${folderId}/items`, {
            item_id: result.id
          });

  
          // 上传成功，调用回调函数
          onFileImported(folderId, {
            id: result.id,
            title: result.title || file.name,
            fileSize: file.size,
            fileType: file.name.split('.').pop()?.toLowerCase() || '',
            cosKey: result.cos_key,
            parseStatus: result.parse_status,
            addedAt: new Date().toISOString() // 记录上传时间
          });

          // 刷新文件夹内容
          if (onRefreshFolder) {
            onRefreshFolder(folderId);
          }

          toast.success(`文件 "${file.name}" 导入成功`);
        } catch (apiError: any) {
          console.error('将文件添加到文件夹失败:', apiError);
          toast.error(`文件上传成功但添加到文件夹失败: ${apiError.message || '未知错误'}`);
        }

        // 无论API调用是否成功，都关闭弹窗
        onClose();
        setShowSecondModal(false);
      } else {
        toast.error(`文件 "${file.name}" 导入失败`);
      }

    } catch (error: any) {
      console.error(`文件 ${file.name} 导入失败:`, error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error(`文件 "${file.name}" 导入失败: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
      // 确保通知父组件重置状态
      if (onProcessingChange) {
        onProcessingChange(false);
      }
      setShowSecondModal(false);
      // 清空 input 的值
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 处理历史记录
  const handleHistoryClick = async () => {
    // 关闭前两个弹窗
    setShowSecondModal(false);
    setShowFirstModal(false);
    // 立即显示历史记录弹窗
    setShowHistoryModal(true);
  };

  // 加载历史记录数据
  const loadHistoryData = async (page: number = 1, reset: boolean = false) => {
    try {
      setIsLoadingHistory(true);
      // 调用 API 获取用户历史记录
      const response = await apiGet('/api/chat/conversations', {
        params: { page, size: 20 }
      });

      // 确保设置的是数组
      const data = response.data;

      let newHistoryItems: any[] = [];
      let hasMore = false;

      if (data && typeof data === 'object' && Array.isArray(data.items)) {
        newHistoryItems = data.items;
        hasMore = data.has_more || false;
        setHasMoreHistory(hasMore);
      } else if (Array.isArray(data)) {
        newHistoryItems = data;
        setHasMoreHistory(false); // 直接返回数组时假设没有更多数据
      } else if (data && typeof data === 'object' && Array.isArray(data.conversations)) {
        newHistoryItems = data.conversations;
        setHasMoreHistory(false);
      } else {
        newHistoryItems = [];
        setHasMoreHistory(false);
      }

      if (reset) {
        setHistoryData(newHistoryItems);
        setHistoryPage(1);
      } else {
        setHistoryData(prev => [...prev, ...newHistoryItems]);
        setHistoryPage(page);
      }
    } catch (error) {
      console.error('获取历史记录失败:', error);
      toast.error('获取历史记录失败');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 获取历史记录数据的effect
  useEffect(() => {
    if (showHistoryModal && historyData.length === 0) {
      loadHistoryData(1, true);
    }
  }, [showHistoryModal]);

  // 自动选中已存在的历史记录（基于标题匹配）
  useEffect(() => {
    if (showHistoryModal && historyData.length > 0 && folderContents.length > 0) {
      const existingTitles = getExistingConversationTitles();

      setSelectedConversations(prev => {
        const newSet = new Set(prev);
        historyData.forEach(conversation => {
          const isExisting = existingTitles.has(conversation.title);
          if (isExisting) {
            newSet.add(conversation.conversation_id);
          }
        });
        return newSet;
      });
    }
  }, [showHistoryModal, historyData, folderContents]);

  // 重置历史记录状态当弹窗关闭时
  useEffect(() => {
    if (!showHistoryModal) {
      setHistoryData([]);
      setHistoryPage(1);
      setHasMoreHistory(true);
      setSelectedConversations(new Set());
    }
  }, [showHistoryModal]);

  // 处理历史记录弹窗滚动
  const handleHistoryScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    if (element.scrollHeight - element.scrollTop <= element.clientHeight + 50) {
      // 接近底部时加载更多
      if (hasMoreHistory && !isLoadingHistory) {
        loadHistoryData(historyPage + 1, false);
      }
    }
  };

  // 清理定时器的effect
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    };
  }, []);

  // 通知父组件处理状态变化
  useEffect(() => {
    if (onProcessingChange) {
      onProcessingChange(isProcessing);
    }
  }, [isProcessing, onProcessingChange]);

  // 获取当前文件夹中已存在的会话标题列表
  const getExistingConversationTitles = (): Set<string> => {
    const conversationItems = folderContents.filter(item => item.item_type === 'conversation');
    const titles = conversationItems.map(item => item.title).filter(title => title && title.trim() !== '');
    return new Set(titles);
  };

  // 获取当前文件夹中已存在的会话ID集合（保留用于兼容性）
  const getExistingConversationIds = (): Set<string> => {
    const conversationItems = folderContents.filter(item => item.item_type === 'conversation');
    const ids = conversationItems.map(item => item.conversation_id).filter(id => id && id.trim() !== '');
    return new Set(ids);
  };


  // 点击外部关闭弹窗
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 检查点击是否在导入图标区域
      const target = event.target as Element;
      if (target.closest('[data-import-icon]')) {
        return; // 如果点击的是导入图标，不关闭弹窗
      }

      const clickedOutsideFirstModal = firstModalRef.current && !firstModalRef.current.contains(event.target as Node);
      const clickedOutsideSecondModal = secondModalRef.current && !secondModalRef.current.contains(event.target as Node);
      const clickedOutsideHistoryModal = historyModalRef.current && !historyModalRef.current.contains(event.target as Node);

      // 如果点击历史记录弹窗外部，关闭历史记录弹窗
      if (showHistoryModal && clickedOutsideHistoryModal) {
        setShowHistoryModal(false);
        setIsProcessing(false);
        if (onProcessingChange) {
          onProcessingChange(false);
        }
        onClose();
        return;
      }

      // 关闭条件：点击了第一个弹窗外部，并且（第二个弹窗未显示 或 点击了第二个弹窗外部）
      if (clickedOutsideFirstModal && (!showSecondModal || clickedOutsideSecondModal)) {
        setIsProcessing(false);
        if (onProcessingChange) {
          onProcessingChange(false);
        }
        onClose();
        setShowSecondModal(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, showSecondModal, showHistoryModal, onClose, onProcessingChange]);

  // 同步isOpen和showFirstModal
  useEffect(() => {
    setShowFirstModal(isOpen);
  }, [isOpen]);

  // 重置状态当弹窗关闭时
  useEffect(() => {
    if (!isOpen) {
      setShowSecondModal(false);
      setShowHistoryModal(false);
      setIsHoveringFirstModal(false);
      setIsHoveringSecondModal(false);
      setHistoryData([]);
      setHistoryPage(1);
      setHasMoreHistory(true);
      setSelectedConversations(new Set());
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // 重置处理状态
      setIsProcessing(false);
      // 确保通知父组件重置状态
      if (onProcessingChange) {
        onProcessingChange(false);
      }
    }
  }, [isOpen, onProcessingChange]);

  
  if (!isOpen) return null;

  return (
    <>
    <div className="relative">
      {/* 导入弹窗 - 点击导入图标后一直显示 */}
      {showFirstModal && (
      <div
        ref={firstModalRef}
        className="w-[120px] h-[52px] bg-[#FFFFFF] shadow-[0px_10px_29px_1px_rgba(89,106,178,0.1)] rounded-[6px] border border-[#E9ECF2] relative z-[60]"
        onMouseEnter={() => {
          setIsHoveringFirstModal(true);
          // 只有在鼠标进入第一个弹窗时才显示第二个弹窗
          setShowSecondModal(true);
        }}
        onMouseLeave={() => {
          setIsHoveringFirstModal(false);
          // 鼠标离开第一个弹窗时，延迟关闭第二个弹窗
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
          }
          hoverTimeoutRef.current = setTimeout(() => {
            setShowSecondModal(false);
          }, 300);
        }}
      >
        <button
          className={cn(
            "w-full text-left hover:bg-[#F1F6FF] transition-colors",
            "text-[16px] text-[#333333] px-[16px] py-[12px] h-[52px]",
            "flex items-center rounded-[6px] cursor-default",
            isHoveringFirstModal ? "bg-[#F1F6FF]" : "bg-transparent"
          )}
        >
          导入
        </button>
      </div>
      )}

      {/* 第二个弹窗 - 文件和历史记录 */}
      {showSecondModal && (
        <div
          ref={secondModalRef}
          className="w-[120px] h-[98px] bg-[#FFFFFF] shadow-[0px_10px_29px_1px_rgba(89,106,178,0.1)] rounded-[6px] border border-[#E9ECF2] absolute top-0 right-[130px] z-[61]"
          onMouseEnter={() => {
            setIsHoveringSecondModal(true);
            // 鼠标进入第二个弹窗时，取消关闭定时器
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            setIsHoveringSecondModal(false);
            // 鼠标离开第二个弹窗时，延迟关闭
            hoverTimeoutRef.current = setTimeout(() => {
              setShowSecondModal(false);
            }, 300);
          }}
        >
          {/* 文件选项 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              // 不关闭前两个弹窗，保持它们显示
              // 直接触发文件选择
              fileInputRef.current?.click();
            }}
            className="w-full text-left transition-colors text-[16px] text-[#333333] px-[16px] py-[12px] h-[48px] flex items-center rounded-t-[6px] w-[120px] bg-transparent cursor-pointer hover:bg-[#F1F6FF]"
          >
            文件
          </button>

          {/* 历史记录选项 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleHistoryClick();
            }}
            className="w-full text-left transition-colors text-[16px] text-[#333333] px-[16px] py-[12px] h-[48px] flex items-center rounded-b-[6px] w-[120px] mt-[2px] bg-transparent cursor-pointer hover:bg-[#F1F6FF]"
          >
            历史记录
          </button>
        </div>
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.docx,.txt"
        onChange={handleFileUpload}
        disabled={isProcessing}
      />

      {/* 处理中状态指示器 - 在导入图标附近显示 */}
      {isProcessing && (
        <div
          className="absolute top-[-35px] right-[280px] flex items-center z-[62] whitespace-nowrap"
        >
          <div className="w-5 h-5 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mr-3"></div>
          <p className="text-sm text-gray-700 font-medium">正在导入...</p>
        </div>
      )}

      {/* 历史记录弹窗 */}
      {showHistoryModal && (
        <>
          {/* 灰色背景罩 - 不添加点击关闭功能 */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          />
          <div
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[864px] h-[593px] bg-white shadow-[0px_10px_29px_1px_rgba(89,106,178,0.1)] rounded-[20px] border border-[#E9ECF2] z-[60] overflow-hidden"
            ref={historyModalRef}
            onClick={(e) => e.stopPropagation()} // 防止事件冒泡到背景罩
          >
          {/* 关闭按钮 */}
          <button
            onClick={() => {
              setShowHistoryModal(false);
              // 重置处理状态
              setIsProcessing(false);
              if (onProcessingChange) {
                onProcessingChange(false);
              }
              onClose();
            }}
            className="absolute top-[31px] right-[31px] w-[18px] h-[18px] flex items-center justify-center text-[18px] text-gray-500 hover:text-gray-700 bg-none border-0 cursor-pointer"
          >
            ×
          </button>
          {/* 标题栏 */}
          <div className="flex justify-between items-center px-[32px] pt-[26px] h-[60px]">
            <h2 className="font-[500] text-[30px] text-[#333333] m-0">
              选择历史记录
            </h2>
          </div>

          {/* 分割线 */}
          <div className="w-[803px] h-[1px] bg-[#E0E1E5] rounded-[1px] ml-[32px] mt-[26px]" />

          {/* 历史记录图标和标题 */}
          <div className="flex items-center mt-[31px] ml-[32px]">
            {/* 历史记录图标 */}
            <img
              src="/slibar/slibar-history@2x.png"
              alt="历史记录"
              className="w-[21px] h-[21px] mr-[16px]"
            />
            {/* 历史记录标题 */}
            <div className="text-[16px] text-[#333333] font-[500]">
              历史记录
            </div>
          </div>

          {/* 历史记录内容 */}
          <div
            onScroll={handleHistoryScroll}
            className="absolute top-[166px] left-0 right-0 bottom-[100px] px-[32px] overflow-y-auto overflow-x-hidden"
          >
            {!Array.isArray(historyData) || historyData.length === 0 ? (
              isLoadingHistory ? (
                <div className="text-center py-[50px] text-[#666]">
                  加载中...
                </div>
              ) : (
                <div className="text-center py-[50px] text-[#666]">
                  暂无历史记录
                </div>
              )
            ) : (
              <div className="flex flex-col gap-[15px]">
                {(() => {
                  // 获取已存在的会话标题集合
                  const existingTitles = getExistingConversationTitles();

                  return historyData.map((conversation, index) => {
                    const isExisting = existingTitles.has(conversation.title);
                    const isSelected = selectedConversations.has(conversation.conversation_id);

                    return (
                      <div
                        key={conversation.conversation_id || index}
                        className={cn(
                          "flex items-center py-[8px] pl-[38px]",
                          isExisting ? "cursor-not-allowed opacity-60" : "cursor-pointer opacity-100"
                        )}
                        onClick={() => {
                          // 如果已存在，不允许点击
                          if (isExisting) {
                            return;
                          }

                          // 切换选中状态
                          setSelectedConversations(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(conversation.conversation_id)) {
                              newSet.delete(conversation.conversation_id);
                            } else {
                              newSet.add(conversation.conversation_id);
                            }
                            return newSet;
                          });
                        }}
                      >
                        {/* 复选框 */}
                        <div className={cn(
                          "w-[14px] h-[14px] rounded-[2px] border mr-[12px] flex-shrink-0 flex items-center justify-center",
                          isSelected ? "bg-[#0D9488] border-[#0D9488]" : "bg-[#FFFFFF] border-[#666666]",
                          isExisting ? "cursor-not-allowed" : "cursor-pointer"
                        )}>
                          {/* 选中状态显示白色勾号 */}
                          {isSelected && (
                            <div
                              className="w-[8px] h-[12px] border-2 border-white border-t-0 border-l-0 transform rotate-45 mb-[2px]"
                            />
                          )}
                        </div>

                        {/* 会话标题 */}
                        <div className={cn(
                          "text-[14px] flex-1 overflow-hidden text-ellipsis whitespace-nowrap",
                          isExisting ? "text-[#999999]" : (isSelected ? "text-[#0D9488]" : "text-[#666666]")
                        )}>
                          {conversation.title || `对话 ${index + 1}`}
                          {isExisting && (
                            <span className="text-[12px] text-[#999999] ml-[8px]">
                              (已存在)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}

                {/* 加载更多指示器 */}
                {isLoadingHistory && (
                  <div className="text-center py-[20px] text-[#666]">
                    加载中...
                  </div>
                )}

                {/* 没有更多数据的提示 */}
                {!hasMoreHistory && historyData.length > 0 && (
                  <div className="text-center py-[20px] text-[#999] text-[12px]">
                    已加载全部历史记录
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 按钮区域 - 固定在底部，不参与滚动 */}
          <div
            className="absolute bottom-[30px] right-[30px] flex gap-[16px] items-center"
          >
            <button
              onClick={() => {
                setShowHistoryModal(false);
                // 重置处理状态
                setIsProcessing(false);
                if (onProcessingChange) {
                  onProcessingChange(false);
                }
                onClose();
              }}
              className="w-[128px] h-[40px] bg-[#FFFFFF] rounded-[20px] border border-[#C8C9CC] text-[16px] text-[#666666] transition-all duration-200 ease hover:bg-[#F8F9FA]"
            >
              取消
            </button>
            <button
              onClick={async () => {
                // 获取已存在的会话标题集合
                const existingTitles = getExistingConversationTitles();

                // 获取选中的对话，但过滤掉已存在的
                const selectedConversationsData = historyData.filter(conv => {
                  const isSelected = selectedConversations.has(conv.conversation_id);
                  const isExisting = existingTitles.has(conv.title);
                  return isSelected && !isExisting; // 只选择已选中且未存在的
                });

                if (selectedConversationsData.length === 0) {
                  const existingCount = historyData.filter(conv =>
                    selectedConversations.has(conv.conversation_id) &&
                    existingTitles.has(conv.title)
                  ).length;

                  if (existingCount > 0) {
                    toast.info('选中的历史记录都已存在于文件夹中');
                  } else {
                    toast.info('请选择要导入的历史记录');
                  }
                  return;
                }

                try {
                  if (!folderId) {
                    toast.error('文件夹ID不存在');
                    return;
                  }

                  // 立即关闭历史记录弹窗
                  setShowHistoryModal(false);

                  // 设置处理状态（这会显示导入状态图标并禁用导入按钮）
                  setIsProcessing(true);

                  // 构建请求体
                  const items = selectedConversationsData.map(conversation => ({
                    item_type: 'conversation' as const,
                    item_id: conversation.conversation_id
                  }));

                  // 调用API批量添加到文件夹
                  const response = await apiPost(`/api/folders/${folderId}/items`, {
                    items: items
                  });

                  // 处理响应结果
                  if (response.data) {
                    const { added_count, failed_count, errors } = response.data;
                    const totalSelected = selectedConversationsData.length;

                    // 只为成功添加的项目调用回调函数
                    const successfulItems = selectedConversationsData.filter(conversation => {
                      // 检查这个项目是否在错误列表中
                      const isError = errors.some((error: any) => error.item_id === conversation.conversation_id);
                      return !isError;
                    });

                    for (const conversation of successfulItems) {
                      onFileImported(folderId, {
                        id: conversation.conversation_id,
                        title: conversation.title || `对话 ${conversation.conversation_id}`,
                        fileSize: 0,
                        fileType: 'conversation',
                        parseStatus: 'completed'
                      });
                    }

                    // 根据结果显示不同的提示信息
                    if (failed_count === 0) {
                      toast.success(`已成功导入 ${added_count} 个历史记录到文件夹`);
                    } else if (added_count === 0) {
                      toast.warning(`所有 ${failed_count} 个历史记录都已存在于文件夹中`);
                    } else {
                      toast.success(`已成功导入 ${added_count} 个历史记录，${failed_count} 个重复已跳过`);
                    }
                  } else {
                    // 兼容旧的响应格式
                    for (const conversation of selectedConversationsData) {
                      onFileImported(folderId, {
                        id: conversation.conversation_id,
                        title: conversation.title || `对话 ${conversation.conversation_id}`,
                        fileSize: 0,
                        fileType: 'conversation',
                        parseStatus: 'completed'
                      });
                    }
                    toast.success(`已成功导入 ${selectedConversationsData.length} 个历史记录到文件夹`);
                  }

                  // 完成后关闭整个导入弹窗
                  onClose();
                } catch (error: any) {
                  console.error('批量导入历史记录失败:', error);
                  toast.error('导入失败: ' + (error.message || '未知错误'));
                } finally {
                  // 完成后重置处理状态
                  setIsProcessing(false);
                  if (onProcessingChange) {
                    onProcessingChange(false);
                  }
                }
              }}
              className="w-[128px] h-[40px] bg-[#0D9488] rounded-[20px] border-0 text-[16px] text-[#FFFFFF] transition-all duration-200 ease hover:bg-[#0F766E]"
            >
              确认
            </button>
          </div>
        </div>
        </>
      )}
    </div>
    </>
  );
}