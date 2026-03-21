import { useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 直接跳转到登录页
    router.push("/login");
  }, [router]);

  return (
    <>
      <Head>
        <title>AI智慧学术交互系统</title>
        <meta
          name="description"
          content="新一代图书馆·陪你探索世界"
        />
        <meta
          name="keywords"
          content="智慧图书馆,文献检索,科研助手,学术搜索,AI助手"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在跳转...</p>
        </div>
      </div>
    </>
  );
}
