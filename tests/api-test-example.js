/**
 * 智能学术对话系统API测试示例
 *
 * 本文件展示如何测试各个API接口
 * 实际测试需要使用Jest + Supertest框架
 */

// 测试配置
const BASE_URL = "http://localhost:3007";
let token = ""; // 登录后获取
let conversationId = "";
let messageId = "";
let folderId = "";
let paperId = "existing_paper_id"; // 需要先在数据库中存在的论文ID

/**
 * 测试1：用户登录
 */
async function testLogin() {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone_number: "13800138000",
      password: Buffer.from("test123").toString("base64"),
    }),
  });

  const data = await response.json();
  console.log("✓ 登录测试:", data);

  if (data.success) {
    token = data.data.token;
    console.log("Token:", token);
  }
}

/**
 * 测试2：创建会话
 */
async function testCreateConversation() {
  const response = await fetch(`${BASE_URL}/api/chat/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: "测试会话",
      model: "deepseek-v3",
      is_deep_think: false,
    }),
  });

  const data = await response.json();
  console.log("✓ 创建会话测试:", data);

  if (data.success) {
    conversationId = data.data.conversation_id;
    console.log("会话ID:", conversationId);
  }
}

/**
 * 测试3：获取会话列表
 */
async function testGetConversations() {
  const response = await fetch(
    `${BASE_URL}/api/chat/conversations?page=1&limit=20`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await response.json();
  console.log("✓ 获取会话列表测试:", data);
}

/**
 * 测试4：发送消息（非流式）
 */
async function testSendMessage() {
  const response = await fetch(`${BASE_URL}/api/chat/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      conversation_id: conversationId,
      content: "AI是什么？",
    }),
  });

  const data = await response.json();
  console.log("✓ 发送消息测试:", data);

  if (data.success) {
    messageId = data.data.assistant_message.message_id;
    console.log("消息ID:", messageId);
    console.log("自动生成的标题:", data.data.conversation?.title);
  }
}

/**
 * 测试5：获取消息列表
 */
async function testGetMessages() {
  const response = await fetch(
    `${BASE_URL}/api/chat/messages?conversation_id=${conversationId}&limit=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const data = await response.json();
  console.log("✓ 获取消息列表测试:", data);
}

/**
 * 测试6：搜索消息
 */
async function testSearchMessages() {
  const response = await fetch(
    `${BASE_URL}/api/chat/messages/search?keyword=AI&conversation_id=${conversationId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const data = await response.json();
  console.log("✓ 搜索消息测试:", data);
}

/**
 * 测试7：创建文件夹
 */
async function testCreateFolder() {
  const response = await fetch(`${BASE_URL}/api/folders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      folder_name: "测试文件夹",
      description: "这是一个测试文件夹",
      color: "#FF5733",
    }),
  });

  const data = await response.json();
  console.log("✓ 创建文件夹测试:", data);

  if (data.success) {
    folderId = data.data.folder_id;
    console.log("文件夹ID:", folderId);
  }
}

/**
 * 测试8：获取文件夹列表
 */
async function testGetFolders() {
  const response = await fetch(`${BASE_URL}/api/folders`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  console.log("✓ 获取文件夹列表测试:", data);
}

/**
 * 测试9：添加论文到文件夹
 */
async function testAddPaperToFolder() {
  const response = await fetch(`${BASE_URL}/api/folders/${folderId}/papers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      paper_id: paperId,
      notes: "这是测试笔记",
    }),
  });

  const data = await response.json();
  console.log("✓ 添加论文到文件夹测试:", data);
}

/**
 * 测试10：查询论文状态
 */
async function testGetPaperStatus() {
  const response = await fetch(
    `${BASE_URL}/api/folders/papers/status?paper_ids=${paperId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const data = await response.json();
  console.log("✓ 查询论文状态测试:", data);
}

/**
 * 测试11：提交反馈
 */
async function testSubmitFeedback() {
  const response = await fetch(`${BASE_URL}/api/chat/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message_id: messageId,
      feedback_type: "like",
      feedback_content: "回答很棒！",
    }),
  });

  const data = await response.json();
  console.log("�� 提交反馈测试:", data);
}

/**
 * 测试12：获取反馈统计
 */
async function testGetFeedbackStats() {
  const response = await fetch(
    `${BASE_URL}/api/chat/feedback/stats?conversation_id=${conversationId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const data = await response.json();
  console.log("✓ 获取反馈统计测试:", data);
}

/**
 * 测试13：创建分享链接
 */
async function testCreateShareLink() {
  const response = await fetch(`${BASE_URL}/api/chat/share`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      conversation_id: conversationId,
      is_public: true,
    }),
  });

  const data = await response.json();
  console.log("✓ 创建分享链接测试:", data);

  if (data.success) {
    console.log("分享链接:", data.data.share_url);
    console.log("分享代码:", data.data.share_code);
  }
}

/**
 * 测试14：更新会话（置顶）
 */
async function testUpdateConversation() {
  const response = await fetch(
    `${BASE_URL}/api/chat/conversations/${conversationId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: "更新后的标题",
        is_pinned: true,
      }),
    }
  );

  const data = await response.json();
  console.log("✓ 更新会话测试:", data);
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log("========== 开始API测试 ==========\n");

  try {
    await testLogin();
    console.log("\n");

    await testCreateConversation();
    console.log("\n");

    await testGetConversations();
    console.log("\n");

    await testSendMessage();
    console.log("\n");

    await testGetMessages();
    console.log("\n");

    await testSearchMessages();
    console.log("\n");

    await testCreateFolder();
    console.log("\n");

    await testGetFolders();
    console.log("\n");

    // 如果有有效的paperId，测试添加论文
    if (paperId) {
      await testAddPaperToFolder();
      console.log("\n");

      await testGetPaperStatus();
      console.log("\n");
    }

    await testSubmitFeedback();
    console.log("\n");

    await testGetFeedbackStats();
    console.log("\n");

    await testCreateShareLink();
    console.log("\n");

    await testUpdateConversation();
    console.log("\n");

    console.log("========== 所有测试完成 ==========");
  } catch (error) {
    console.error("测试失败:", error);
  }
}

// 如果直接运行此文件（Node.js环境）
if (typeof require !== "undefined" && require.main === module) {
  runAllTests();
}

// 导出测试函数（用于Jest）
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    testLogin,
    testCreateConversation,
    testGetConversations,
    testSendMessage,
    testGetMessages,
    testSearchMessages,
    testCreateFolder,
    testGetFolders,
    testAddPaperToFolder,
    testGetPaperStatus,
    testSubmitFeedback,
    testGetFeedbackStats,
    testCreateShareLink,
    testUpdateConversation,
  };
}
