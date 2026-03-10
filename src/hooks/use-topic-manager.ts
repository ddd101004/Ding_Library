import { useState, useEffect, useCallback, useRef } from 'react';
import { usePreload } from './use-preload';

interface TopicManagerConfig {
  currentFunction: string | null;
  selectedButton: string | null;
}

export const useTopicManager = ({ currentFunction, selectedButton }: TopicManagerConfig) => {
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [hasInitialized, setHasInitialized] = useState(false); // 标记是否已初始化
  const { preloadData, isLoading } = usePreload();

  const quickQADefaults = [
    "什么是人工智能？它的主要应用领域有哪些？",
    "机器学习与深度学习的主要区别是什么？",
    "自然语言处理在日常生活中有哪些应用？",
    "计算机视觉技术如何改变我们的生活？",
    "大数据分析对企业决策有什么帮助？",
  ];

  const deepLearningDefaults = {
    cuttingEdge: [
      "多模态模型", "RAG技术", "大语言模型", "扩散模型", "强化学习", "自动驾驶",
      "量子计算", "边缘计算", "联邦学习", "知识图谱", "智能体", "生成式AI", "神经渲染"
    ],
    basicResearch: [
      "实验设计", "数据统计", "假设检验", "文献综述", "变量控制", "样本选择",
      "误差分析", "信度效度", "研究伦理", "数据分析", "模型验证", "结果解释", "论文写作"
    ],
    coreTechnology: [
      "Transformer", "注意力机制", "卷积网络", "循环网络", "梯度下降", "反向传播",
      "激活函数", "损失函数", "优化器", "正则化", "批量归一化", "Dropout", "预训练"
    ],
    coreConcepts: [
      "深度学习", "机器学习", "人工智能", "自然语言处理", "计算机视觉", "监督学习",
      "无监督学习", "强化学习", "迁移学习", "表征学习", "元学习", "小样本学习", "自监督学习"
    ]
  };

  // 使用 useRef 跟踪最新的 refreshCount
  const refreshCountRef = useRef(refreshCount);
  useEffect(() => {
    refreshCountRef.current = refreshCount;
  }, [refreshCount]);

  // 获取快问快答问题
  const fetchQuickQAQuestions = useCallback(async (forceRefresh = false) => {
    // 优先从 sessionStorage 读取预加载的问题
    if (!forceRefresh) {
      const prefetchedQuestions = sessionStorage.getItem("quickQA_questions_prefetched");
      if (prefetchedQuestions) {
        try {
          const questions = JSON.parse(prefetchedQuestions);
          setTopics(questions);
          return;
        } catch (error) {
          console.error("解析预加载问题失败:", error);
        }
      }
    }

    const timestamp = Date.now(); // 使用时间戳避免缓存
    const questions = await preloadData(
      "/api/ai/questions",
      {
        keyword: "",
        count: 5,
        _t: forceRefresh ? timestamp : undefined
      },
      {
        cacheKey: forceRefresh ? `quickQA_questions_${timestamp}` : "quickQA_questions",
        defaultData: quickQADefaults,
      }
    );
    setTopics(questions);

    // 如果是刷新操作，更新 sessionStorage
    if (forceRefresh) {
      sessionStorage.setItem("quickQA_questions_prefetched", JSON.stringify(questions));
    }
  }, [preloadData]);

  // 获取深度学习关键词
  const fetchDeepLearningKeywords = useCallback(async (type: string, forceRefresh = false) => {
    const keywordMap = {
      cuttingEdge: "人工智能前沿技术",
      basicResearch: "科学研究方法",
      coreTechnology: "AI核心技术",
      coreConcepts: "人工智能基础概念",
    };

    const timestamp = Date.now(); // 使用时间戳避免缓存
    const keywords = await preloadData(
      "/api/ai/keywords",
      { 
        keyword: keywordMap[type as keyof typeof keywordMap], 
        count: 13,
        _t: forceRefresh ? timestamp : undefined 
      },
      {
        cacheKey: forceRefresh ? `deepLearning_${type}_keywords_${timestamp}` : `deepLearning_${type}_keywords`,
        defaultData: deepLearningDefaults[type as keyof typeof deepLearningDefaults] || [],
      }
    );
    setTopics(keywords);
  }, [preloadData]);

  const handleTopicButtonClick = useCallback((type: string) => {
    // 仅在首次进入深度学习模式时初始化关键词
    if (!hasInitialized) {
      fetchDeepLearningKeywords(type, false);
      setHasInitialized(true);
    }
    // 后续点击不同主题按钮不会刷新关键词
  }, [hasInitialized, currentFunction, fetchDeepLearningKeywords]);

  const handleTopicClick = useCallback((topic: string) => {
    setSelectedTopic(topic);
  }, []);

  // 处理换一批 - 强制刷新
  const handleRefreshClick = useCallback(() => {
    if (currentFunction === "quickQA") {
      fetchQuickQAQuestions(true);
    } else if (currentFunction === "deepStudy" && selectedButton) {
      fetchDeepLearningKeywords(selectedButton, true);
      // 重置初始化状态，但已加载的关键词保持不变
    } else {
      console.warn("无法换一批：缺少必要的参数");
    }
  }, [currentFunction, selectedButton, fetchQuickQAQuestions, fetchDeepLearningKeywords]);

  // 初始加载
  useEffect(() => {
    if (currentFunction === "quickQA") {
      fetchQuickQAQuestions(false);
    }
  }, [currentFunction, fetchQuickQAQuestions]);

  return {
    topics,
    selectedTopic,
    isLoading,
    handleTopicButtonClick,
    handleTopicClick,
    handleRefreshClick,
    setSelectedTopic
  };
};