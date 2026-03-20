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