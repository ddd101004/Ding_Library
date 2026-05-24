/**
 * 勾选聊天页 /checkedchat — 预设话题对话页面
 *
 * 【前端】路由：/checkedchat
 *
 * 职责：
 * - 展示预设话题列表供用户选择
 * - 选择后进入AI对话模式
 * - 使用WithSidebarLayout布局（isCheckedChat模式）
 */
import Head from "next/head";
import CheckedChat from '../components/chat/CheckedChat';
import { useRouter } from 'next/router';
import WithSidebarLayout from '../components/layout/WithSidebarLayout';
import SearchModal from '../components/chat/common/SearchModal';

export default function ChatPage1() {
  const router = useRouter();
  const { function: functionType } = router.query;
  
  return (
    <>
      <Head>
        <title>AI智慧学术交互系统-AI对话</title>
      </Head>
      <WithSidebarLayout 
        isCheckedChat={true}
        functionType={functionType as string} 
        backgroundImage=""
      >
        <CheckedChat selectedFunction={functionType as string}/>
      </WithSidebarLayout>
      <SearchModal />
    </>
  );
}