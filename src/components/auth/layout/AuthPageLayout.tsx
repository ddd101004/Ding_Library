"use client";
import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";

interface AuthPageLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function AuthPageLayout({ title, children }: AuthPageLayoutProps) {
  const router = useRouter();

  // 图片配置（底部滚动的期刊 logo）
  const imageConfigs = Array.from({ length: 20 }, (_, i) => ({
    src: `/landingpaper/landingpaper-${i + 1}.png`,
  }));

  const handleGoToHome = () => {
    router.push("/");
  };

  return (
    <div
      className="w-full min-h-screen bg-cover bg-center bg-no-repeat flex overflow-hidden"
      style={{ backgroundImage: "url('/background/landing-page-bg-1@2x.png')" }}
    >
      <Head>
        <title>临港科技智慧图书馆{title}</title>
      </Head>

      {/* 左侧图片区域 */}
      <div className="hidden h-screen lg:flex lg:w-1/2 xl:w-3/5 items-center justify-center p-8 xl:p-16 relative">
        {/* 左上角文字 */}
        <div className="absolute left-8 top-12 z-10">
          <div className="w-[395px] font-['Source_Han_Sans_CN'] font-medium text-[60px] text-[#333333] leading-[50px] mb-10">
            新一代图书馆
          </div>
          <div className="w-[557px] font-['Source_Han_Sans_CN'] font-normal text-[30px] text-[#666666] leading-[40px]">
            20亿元数据，256+期刊，带你探索世界
          </div>
        </div>

        {/* 中心装饰图 */}
        <div className="relative scale-[0.84] transform translate-y-12">
          <img
            src="/landing-page/landing-page-picture-1@2x.png"
            alt="Landing Page"
            className="w-full h-full object-contain"
          />

          {/* Powered by AI */}
          <div className="absolute left-2/4 top-5 transform -translate-x-1/2 -translate-y-full -mt-12 flex items-center gap-2">
            <img
              src="/landing-page/landing-page-star.png"
              alt="Star"
              className="w-[40px] h-[45px]"
            />
            <span className="font-['Source_Han_Sans_CN'] font-normal text-[32px] gradient-text whitespace-nowrap">
              Powered by AI
            </span>
          </div>

          {/* Answer2 */}
          <img
            src="/landing-page/landing-page-answer-2.png"
            alt="Answer2"
            className="absolute left-7 -top-2 transform -translate-y-1/4"
            style={{ width: "190px", height: "auto" }}
          />

          {/* Answer1 */}
          <img
            src="/landing-page/landing-page-answer-1.png"
            alt="Answer1"
            className="absolute right-20 -top-10 -mt-10 transform -translate-y-1/2"
            style={{ width: "190px", height: "auto" }}
          />
        </div>

        {/* 底部滚动期刊 logo */}
        <div className="absolute bottom-[54px] left-10 right-10 overflow-hidden">
          <div className="relative">
            <div className="flex animate-scroll gap-4">
              {/* 第一组 */}
              {imageConfigs.map((config, index) => (
                <div
                  key={`first-${index}`}
                  className="flex-shrink-0 w-[156px] h-[86px] bg-white shadow-[0px_0px_1px_0px_#C3C9E6] rounded-[10px] flex items-center justify-center"
                >
                  <img
                    src={config.src}
                    alt={`期刊logo-${index + 1}`}
                    className="object-contain max-w-[140px] max-h-[66px]"
                  />
                </div>
              ))}
              {/* 第二组（无缝循环） */}
              {imageConfigs.map((config, index) => (
                <div
                  key={`second-${index}`}
                  className="flex-shrink-0 w-[156px] h-[86px] bg-white shadow-[0px_0px_1px_0px_#C3C9E6] rounded-[10px] flex items-center justify-center"
                >
                  <img
                    src={config.src}
                    alt={`期刊logo-${index + 1}`}
                    className="object-contain max-w-[140px] max-h-[66px]"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 右侧表单区域 */}
      <div className="relative w-full lg:w-[730px] xl:w-2/5 bg-white m-0 rounded-[20px] flex items-center justify-center h-screen">
        {/* 左下角文字 */}
        <div className="absolute left-6 bottom-3 z-10 flex items-center">
          <img
            src="/settings/settings-other@2x.png"
            alt="Settings"
            className="w-[16px] h-[16px] mr-[3px]"
          />
          <div className="font-['Source_Han_Sans_CN'] font-normal text-[16px] text-[#666666] leading-[40px]">
            临港科技智慧图书馆
          </div>
        </div>

        {/* 右下角文字 */}
        <div className="absolute right-6 bottom-3 z-10 flex items-center">
          <img
            src="/settings/settings-mail@2x.png"
            alt="Mail"
            className="w-[16px] h-[16px] mr-[3px]"
          />
          <div className="font-['Source_Han_Sans_CN'] font-normal text-[16px] text-[#666666] leading-[40px] text-right">
            lingang@mail.com
          </div>
        </div>

        {/* 右上角返回按钮 */}
        <div className="absolute top-6 right-6 z-10">
          <button
            onClick={handleGoToHome}
            className="flex items-center text-[#666666] hover:text-[#333333] transition-colors"
            title="点击可返回到这个网页的默认首页"
          >
            <span className="font-['Source_Han_Sans_CN'] font-normal text-[14px]">
              返回 &gt;
            </span>
          </button>
        </div>

        {/* 表单内容 */}
        {children}
      </div>

      {/* CSS 动画 */}
      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll {
          animation: scroll 40s linear infinite;
        }

        .animate-scroll:hover {
          animation-play-state: paused;
        }

        .gradient-text {
          background: linear-gradient(90deg, #9459ff 0%, #2e6eff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>
    </div>
  );
}
