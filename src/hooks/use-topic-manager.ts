/**
 * 话题推荐管理 Hook — 管理聊天主页的快问快答问题和深度学习关键词推荐
 *
 * 核心函数：
 * - handleTopicButtonClick(type) — 点击话题按钮时加载对应类型的数据
 * - handleTopicClick(topic) — 选择某个话题，填入输入框
 * - handleRefreshClick() — 换一批，强制刷新话题数据（跳过缓存）
 * - topics — 当前话题列表（问题或关键词）
 * - selectedTopic — 当前选中的话题
 * - isLoading — 是否正在加载
 *
 * 数据来源：
 * - quickQA模式：调用 /api/ai/questions 获取5个推荐问题
 * - deepStudy模式：调用 /api/ai/keywords 获取13个关键词（随机主题池）
 * - 优先读sessionStorage缓存，API失败使用默认数据兜底
 *
 * 使用组件：
 * - ChatConversation — 对话详情页，管理话题推荐区域
 * - CheckedChat — 已选对话页，管理话题推荐区域
 */
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
  const hasLoadedKeywordsRef = useRef(false);
  const { preloadData, isLoading } = usePreload();
//快问快答默认问题（备用，当API调用失败时使用）
  const quickQADefaults = [
    "什么是人工智能？它的主要应用领域有哪些？",
    "机器学习与深度学习的主要区别是什么？",
    "自然语言处理在日常生活中有哪些应用？",
    "计算机视觉技术如何改变我们的生活？",
    "大数据分析对企业决策有什么帮助？",
  ];

  // 深度学习默认关键词（备用，当API调用失败时使用）
  const deepLearningDefaults = [
    "深度学习", "机器学习", "人工智能", "神经网络", "Transformer",
    "注意力机制", "卷积网络", "循环网络", "强化学习", "生成对抗网络",
    "迁移学习", "监督学习", "无监督学习"
  ];

  // 内置的主题池列表，用于深度学习（用于生成多样化的关键词）
  const deepLearningTopics = [
    "深度学习", "机器学习", "人工智能", "数据科学", "计算机视觉",
    "自然语言处理", "强化学习", "神经网络", "大数据分析", "云计算"
  ];

  // 使用 useRef 跟踪最新的 refreshCount
  const refreshCountRef = useRef(refreshCount);
  useEffect(() => {
    refreshCountRef.current = refreshCount;
  }, [refreshCount]);

  // ！！获取快问快答问题
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

  // ！！获取深度学习关键词
  const fetchDeepLearningKeywords = useCallback(async (forceRefresh = false) => {
    const timestamp = Date.now();

    // 从主题池中随机选择一个主题
    const randomTopic = deepLearningTopics[Math.floor(Math.random() * deepLearningTopics.length)];

    const keywords = await preloadData(
      "/api/ai/keywords",
      {
        keyword: randomTopic,
        count: 13,
        _t: forceRefresh ? timestamp : undefined
      },
      {
        cacheKey: forceRefresh ? `deepLearning_keywords_${randomTopic}_${timestamp}` : `deepLearning_keywords_${randomTopic}`,
        defaultData: deepLearningDefaults,
      }
    );
    setTopics(keywords);
  }, [preloadData, deepLearningTopics]);

  const handleTopicButtonClick = useCallback((type: string) => {
    if (currentFunction === "deepStudy" && !hasLoadedKeywordsRef.current) {
      fetchDeepLearningKeywords(false);
      hasLoadedKeywordsRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFunction]);

  const handleTopicClick = useCallback((topic: string) => {
    setSelectedTopic(topic);
  }, []);

  // 处理换一批 - 强制刷新
  const handleRefreshClick = useCallback(() => {
    if (currentFunction === "quickQA") {
      fetchQuickQAQuestions(true);
    } else if (currentFunction === "deepStudy") {
      fetchDeepLearningKeywords(true);
      // 强制刷新，重新加载关键词
    } else {
      console.warn("无法换一批：缺少必要的参数");
    }
  }, [currentFunction, fetchQuickQAQuestions, fetchDeepLearningKeywords]);

  // 初始加载
  useEffect(() => {
    if (currentFunction === "quickQA") {
      fetchQuickQAQuestions(false);
    } else if (currentFunction === "deepStudy" && !hasLoadedKeywordsRef.current) {
      fetchDeepLearningKeywords(false);
      hasLoadedKeywordsRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFunction]);

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
