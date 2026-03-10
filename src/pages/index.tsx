import { Button } from "../components/ui/button";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  // 首页允许滚动并应用自定义滚动条样式
  useEffect(() => {
    // 保存原始样式和类名
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlClass = document.documentElement.className;
    const originalBodyClass = document.body.className;

    // 设置为允许滚动
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";

    // 添加自定义滚动条类
    document.documentElement.classList.add("scrollbar-thin");
    document.body.classList.add("scrollbar-thin");

    // 清理函数：组件卸载时恢复原始样式和类名
    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.className = originalHtmlClass;
      document.body.className = originalBodyClass;
    };
  }, []);

  // 定义图片配置数据
  const imageConfigs = [
    // 第一排7个框
    [
      { src: "/landingpaper/landingpaper-1.png", width: 152, height: 63 },
      { src: "/landingpaper/landingpaper-2.png", width: 172, height: 63 },
      { src: "/landingpaper/landingpaper-3.png", width: 154, height: 58 },
      { src: "/landingpaper/landingpaper-4.png", width: 145, height: 75 },
      { src: "/landingpaper/landingpaper-5.png", width: 138, height: 67 },
      { src: "/landingpaper/landingpaper-6.png", width: 143, height: 62 },
      { src: "/landingpaper/landingpaper-7.png", width: 129, height: 67 },
    ],
    // 第二排8个框
    [
      { src: "/landingpaper/landingpaper-8.png", width: 139, height: 67 },
      { src: "/landingpaper/landingpaper-9.png", width: 138, height: 50 },
      { src: "/landingpaper/landingpaper-10.png", width: 152, height: 28 },
      { src: "/landingpaper/landingpaper-11.png", width: 152, height: 28 },
      { src: "/landingpaper/landingpaper-12.png", width: 152, height: 28 },
      { src: "/landingpaper/landingpaper-13.png", width: 136, height: 85 },
      { src: "/landingpaper/landingpaper-14.png", width: 136, height: 85 },
      { src: "/landingpaper/landingpaper-15.png", width: 156, height: 85 },
    ],
    // 第三排7个框
    [
      { src: "/landingpaper/landingpaper-16.png", width: 152, height: 63 },
      { src: "/landingpaper/landingpaper-17.png", width: 145, height: 75 },
      { src: "/landingpaper/landingpaper-18.png", width: 155, height: 75 },
      { src: "/landingpaper/landingpaper-19.png", width: 146, height: 40 },
      { src: "/landingpaper/landingpaper-20.png", width: 142, height: 52 },
      { src: "/landingpaper/landingpaper-21.png", width: 146, height: 40 },
      { src: "/landingpaper/landingpaper-22.png", width: 145, height: 44 },
    ],
  ];

  return (
    <div className="w-full">
      <Head>
        <title>临港科技智慧图书馆</title>
        <meta
          name="description"
          content="新一代图书馆·陪你探索世界。3亿文献、AI对话、秒级响应，搜索顶级文献库，AI快问快答，深度伴读解析。"
        />
        <meta
          name="keywords"
          content="智慧图书馆,临港科技,AI图书馆,文献检索,科研助手,学术搜索"
        />

        {/* 预加载首屏关键资源 */}
        <link
          rel="preload"
          href="/background/layer-4@2x.png"
          as="image"
          type="image/png"
        />
        <link
          rel="preload"
          href="/landing-page/landing-page-picture-1@2x.png"
          as="image"
          type="image/png"
        />

        {/* 性能优化 */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
      </Head>
      {/* 第一屏 - 高度缩小至90%，文字区上移20px */}
      <div className="w-full">
        <div
          className="min-h-[calc(90vh-100px)] w-full bg-[url('/background/layer-4@2x.png')] bg-cover bg-center bg-no-repeat flex items-center relative"
        >
          {/* 中间固定宽度容器 */}
          <div className="responsive-container">
            <div className="flex flex-col lg:flex-row items-center justify-between w-full px-4 lg:px-0">
              {/* 文字内容区 - 上移20px（添加 -translate-y-5） */}
              <div className="ml-0 sm:ml-4 lg:ml-8 xl:ml-12 text-left flex flex-col transform scale-90 origin-left -translate-y-5 w-full lg:w-auto">
                <p className="w-full max-w-[400px] font-normal text-[20px] sm:text-[24px] lg:text-[30px] leading-[28px] sm:leading-[36px] lg:leading-[40px] gradient-text mb-[15px] sm:mb-[20px] lg:mb-[23px]">
                  新一代图书馆·陪你探索世界
                </p>

                <h1 className="w-full max-w-[700px] font-medium text-[32px] sm:text-[40px] lg:text-[60px] leading-[38px] sm:leading-[48px] lg:leading-[57px] text-[#333333] mb-[20px] sm:mb-[30px] lg:mb-[39px]">
                  临港科技智慧图书馆
                </h1>

                <div className="w-full max-w-[513px] font-normal text-[18px] sm:text-[24px] lg:text-[30px] leading-[26px] sm:leading-[32px] lg:leading-[40px] text-[#333333] mb-[40px] sm:mb-[60px] lg:mb-[90px] flex items-center gap-[10px] sm:gap-[12px] lg:gap-[15px]">
                  <span>3亿文献</span>
                  <span>·</span>
                  <span>AI对话</span>
                  <span>·</span>
                  <span>秒级响应</span>
                </div>

                <div className="flex flex-col mb-[50px] sm:mb-[80px] lg:mb-[135px]">
                  <p className="w-full max-w-[400px] font-normal text-[14px] sm:text-[18px] lg:text-[22px] leading-[20px] sm:leading-[24px] lg:leading-[22px] text-[#666666] mb-[12px] sm:mb-[16px] lg:mb-[20px]">
                    搜索3亿篇顶级文献库查找科学灵感
                  </p>
                  <p className="w-full max-w-[400px] font-normal text-[14px] sm:text-[18px] lg:text-[22px] leading-[20px] sm:leading-[24px] lg:leading-[22px] text-[#666666] mb-[12px] sm:mb-[16px] lg:mb-[20px]">
                    1秒响应AI快问快答，精准科学知识
                  </p>
                  <p className="w-full max-w-[400px] font-normal text-[14px] sm:text-[18px] lg:text-[22px] leading-[20px] sm:leading-[24px] lg:leading-[22px] text-[#666666]">
                    深度伴读解析文献要点，更快到达研究
                  </p>
                </div>

                <Button
                  onClick={() => router.push("/login")}
                  className="mt-0 sm:mt-[-40px] lg:mt-[-80px] w-[200px] sm:w-[230px] lg:w-[270px] h-[46px] sm:h-[52px] lg:h-[58px] gradient-button rounded-[23px] sm:rounded-[26px] lg:rounded-[30px] flex items-center justify-center border-none cursor-pointer"
                >
                  <span className="font-normal text-[20px] sm:text-[24px] lg:text-[30px] text-white leading-[46px] sm:leading-[52px] lg:leading-[60px]">
                    即刻探索
                    <span className="ml-2 transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </Button>
              </div>

              {/* 图片内容区 - 保留原有样式和间距 - 小屏幕下隐藏 */}
              <div className="hidden lg:flex relative w-[49%] h-full items-center justify-center mt-20">
                <div className="relative">
                  <Image
                    src="/landing-page/landing-page-picture-1@2x.png"
                    alt="智慧图书馆功能展示"
                    width={828}
                    height={503}
                    priority
                    className="w-full h-full object-contain"
                  />

                  {/* Powered by AI - 保留原有定位 */}
                  <div className="absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-full -mt-12 flex items-center gap-2">
                    <Image
                      src="/landing-page/landing-page-star.png"
                      alt="星标图标"
                      width={30}
                      height={34}
                    />
                    <span className="font-normal text-[30px] gradient-text whitespace-nowrap">
                      Powered by AI
                    </span>
                  </div>

                  {/* Answer2 - 保留原有定位 */}
                  <Image
                    src="/landing-page/landing-page-answer-2.png"
                    alt="AI回答示例2"
                    width={170}
                    height={120}
                    className="absolute left-4 -top-5 transform -translate-y-1/4"
                  />

                  {/* Answer1 - 保留原有定位 */}
                  <Image
                    src="/landing-page/landing-page-answer-1.png"
                    alt="AI回答示例1"
                    width={170}
                    height={120}
                    className="absolute right-0 -top-20 -mt-10 transform -translate-y-1/2"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* 第二屏 - 高度缩小至90%，左右间距扩大2倍（gap-32） */}
      <div className="w-full">
        <div
          className="min-h-[calc(90vh-380px)] w-full bg-[url('/background/layer-1@2x.png')] bg-cover bg-center bg-no-repeat flex flex-col items-center justify-start pt-[30px] lg:pt-[50px] relative"
        >
          {/* 中间固定宽度容器 */}
          <div className="responsive-container w-full  mt-[100px]">
            <h1 className="max-w-[593px] w-full font-medium text-[24px] sm:text-[30px] lg:text-[50px] leading-[32px] sm:leading-[40px] lg:leading-[60px] text-[#333333] mb-[40px] sm:mb-[60px] lg:mb-[170px] text-center mx-auto px-4">
              二步即可解锁AI深度伴读
            </h1>

            {/* 响应式布局：小屏幕垂直排列，大屏幕水平排列 */}
            <div className="flex flex-col lg:flex-row items-center justify-center w-full mt-0 lg:mt-[-120px] gap-8 lg:gap-32 px-4 lg:px-0">
              <div className="relative w-full lg:w-[49%] flex items-center justify-center order-2 lg:order-1 lg:ml-[20px]">
                <div className="w-full max-w-[500px] lg:w-[645px] lg:h-[393px]">
                  <Image
                    src="/landing-page/landing-page-picture-2@2x.png"
                    alt="第一步：提出疑问找寻答案"
                    width={645}
                    height={393}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              <div className="w-full lg:w-auto text-left flex flex-col px-4 lg:px-0 order-1 lg:order-2">
                <div className="flex flex-col">
                  <div className="flex flex-col items-start">
                    <Image
                      src="/landing-page/landing-page-search@2x.png"
                      alt="搜索图标"
                      width={101}
                      height={100}
                      className="w-[60px] h-[60px] sm:w-[80px] sm:h-[80px] lg:w-[101px] lg:h-[100px] mb-[15px] sm:mb-[20px] lg:mb-[30px]"
                    />
                    <div>
                      <p className="font-medium text-[20px] sm:text-[24px] lg:text-[30px] leading-[30px] sm:leading-[36px] lg:leading-[40px] gradient-text mb-0">
                        第一步
                      </p>
                      <p className="max-w-full font-medium text-[20px] sm:text-[24px] lg:text-[30px] leading-[30px] sm:leading-[36px] lg:leading-[40px] text-[#333333] mb-[20px] sm:mb-[30px] lg:mb-[50px]">
                        提出疑问 找寻答案
                      </p>
                      <p className="max-w-full lg:w-[350px] font-normal text-[16px] sm:text-[18px] lg:text-[22px] leading-[24px] sm:leading-[30px] lg:leading-[36px] text-[#666666]">
                        科研疑问随时问，深度解惑不模糊为你的研究难题提供靠谱思路
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* 第三屏 - 高度缩小至90%，左右间距扩大2倍（gap-32） */}
      <div className="w-full">
        <div
          className="min-h-[calc(90vh-300px)] w-full bg-[url('/background/layer-2@2x.png')] bg-cover bg-center bg-no-repeat flex items-center py-[30px] lg:py-0 relative"
        >
          {/* 中间固定宽度容器 */}
          <div className="responsive-container w-full">
            {/* 响应式布局：小屏幕垂直排列，大屏幕水平排列，左右间距扩大2倍（原gap默认→gap-32） */}
            <div className="flex flex-col lg:flex-row items-center justify-center w-full gap-8 lg:gap-32 px-4 lg:px-0">
              <div className="text-left flex flex-col w-full lg:w-auto order-1 lg:order-1">
                <div className="flex flex-col">
                  <div className="flex flex-col items-start">
                    <Image
                      src="/landing-page/landing-page-global-ai@2x.png"
                      alt="AI全局分析图标"
                      width={101}
                      height={100}
                      className="w-[60px] h-[60px] sm:w-[80px] sm:h-[80px] lg:w-[101px] lg:h-[100px] mb-[15px] sm:mb-[20px] lg:mb-[30px]"
                    />
                    <div>
                      <p className="font-medium text-[20px] sm:text-[24px] lg:text-[30px] leading-[30px] sm:leading-[36px] lg:leading-[40px] gradient-text mb-0">
                        第二步
                      </p>
                      <p className="max-w-full lg:w-[320px] font-medium text-[20px] sm:text-[24px] lg:text-[30px] leading-[30px] sm:leading-[36px] lg:leading-[40px] text-[#333333] mb-[20px] sm:mb-[30px] lg:mb-[50px]">
                        选择疑难点 AI深度解析
                      </p>
                      <p className="max-w-full lg:w-[356px] font-normal text-[16px] sm:text-[18px] lg:text-[22px] leading-[24px] sm:leading-[30px] lg:leading-[36px] text-[#666666]">
                        针对研究难点解惑，逻辑清晰有深度 助力研究少走弯路
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative w-full lg:w-[49%] flex items-center justify-center order-2 lg:order-2">
                <div className="w-full max-w-[500px] lg:w-[700px] lg:h-[426px]">
                  <Image
                    src="/landing-page/landing-page-picture-3@2x.png"
                    alt="第二步：选择疑难点AI深度解析"
                    width={700}
                    height={426}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 第四屏 - 修改后的样式 */}
      <div className="w-full">
        <div className="w-full min-h-[650px] bg-white flex flex-col items-center py-[40px] lg:py-0">
          {/* 中间固定宽度容器 */}
          <div className="responsive-container w-full px-4 lg:px-0">
            <h2 className="max-w-[700px] w-full font-medium text-[28px] sm:text-[40px] lg:text-[60px] leading-[34px] sm:leading-[48px] lg:leading-[29px] text-[#333333] text-center mt-[30px] sm:mt-[50px] lg:mt-[60px] mb-[30px] sm:mb-[40px] lg:mb-[50px] mx-auto">
              20亿元数据，256+期刊
            </h2>

            <p className="max-w-[761px] w-full font-normal text-[16px] sm:text-[22px] lg:text-[30px] leading-[22px] sm:leading-[28px] lg:leading-[29px] text-[#333333] text-center mb-[15px] sm:mb-[18px] lg:mb-[60px] mx-auto px-4">
              数据来自权威期刊数据库，nature，ACS，EBSCO
            </p>

            <div className="flex flex-col items-center gap-[15px] sm:gap-[18px] lg:gap-[20px] mt-[15px] sm:mt-[18px] lg:mt-[20px]">
              {/* 第一排 - 7个框 */}
              <div className="flex gap-[15px] sm:gap-[18px] lg:gap-[20px] min-w-min">
                {imageConfigs[0].map((config, index) => (
                  <div
                    key={`row1-${index}`}
                    className="w-[156px] h-[86px] bg-white shadow-[0px_0px_1px_0px_#C3C9E6] rounded-[10px] flex-shrink-0 flex items-center justify-center"
                  >
                    <Image
                      src={config.src}
                      alt={`期刊logo-${index + 1}`}
                      width={config.width}
                      height={config.height}
                      className="object-contain"
                    />
                  </div>
                ))}
              </div>

              {/* 第二排 - 8个框 */}
              <div className="flex gap-[15px] sm:gap-[18px] lg:gap-[20px] min-w-min">
                {imageConfigs[1].map((config, index) => (
                  <div
                    key={`row2-${index}`}
                    className="w-[156px] h-[86px] bg-white shadow-[0px_0px_1px_0px_#C3C9E6] rounded-[10px] flex-shrink-0 flex items-center justify-center"
                  >
                    <Image
                      src={config.src}
                      alt={`期刊logo-${index + 8}`}
                      width={config.width}
                      height={config.height}
                      className="object-contain"
                    />
                  </div>
                ))}
              </div>

              {/* 第三排 - 7个框 */}
              <div className="flex gap-[15px] sm:gap-[18px] lg:gap-[20px] min-w-min">
                {imageConfigs[2].map((config, index) => (
                  <div
                    key={`row3-${index}`}
                    className="w-[156px] h-[86px] bg-white shadow-[0px_0px_1px_0px_#C3C9E6] rounded-[10px] flex-shrink-0 flex items-center justify-center"
                  >
                    <Image
                      src={config.src}
                      alt={`期刊logo-${index + 16}`}
                      width={config.width}
                      height={config.height}
                      className="object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

     {/* 第五屏 - 修改后的样式 */}
<div className="w-full">
  <div className="w-full min-h-[327px] bg-[#303133] flex items-center py-[40px] lg:py-[50px] relative">
    {/* 中间固定宽度容器 */}
    <div className="responsive-container w-full px-4 lg:px-0">
      {/* 图书馆Logo图片 */}
      <div className="absolute left-[361px] top-[70px]">
        <Image
          src="/landing-page/landing-page-library@2x.png"
          alt="临港科技智慧图书馆"
          width={300} // 根据实际图片尺寸调整
          height={80} // 根据实际图片尺寸调整
          className="object-contain"
        />
      </div>

      {/* 版权信息 - 距离左边距360px，距离logo 40px */}
      <div className="absolute left-[360px] top-[180px] flex flex-col">
        <div className="font-light text-[14px] sm:text-[15px] lg:text-[16px] text-[#F2F4FF] leading-[24px] lg:leading-[30px] mb-[8px] lg:mb-[10px]">
          版权所有@临港科技智慧图书馆
        </div>
        <div className="font-light text-[14px] sm:text-[15px] lg:text-[16px] text-[#F2F4FF] leading-[24px] lg:leading-[30px] mb-[8px] lg:mb-[10px]">
          沪ICP备2024047696号-2
        </div>
        <div className="font-light text-[14px] sm:text-[15px] lg:text-[16px] text-[#F2F4FF] leading-[24px] lg:leading-[30px] mb-[8px] lg:mb-[10px]">
          沪公网安备31011502020126号
        </div>
        <div className="font-light text-[14px] sm:text-[15px] lg:text-[16px] text-[#F2F4FF] leading-[24px] lg:leading-[30px]">
          出版物经营许可证：新出发沪零字第LG10846号
        </div>
      </div>

      {/* 社交媒体图标 */}
      <div className="absolute left-[360px] bottom-[70px] flex gap-[56px]">
        <Image
          src="/landing-page/landing-page-phone@2x.png"
          alt="电话"
          width={40}
          height={40}
          className="w-[40px] h-[40px] object-contain"
        />
        <Image
          src="/landing-page/landing-page-link@2x.png"
          alt="链接"
          width={40}
          height={40}
          className="w-[40px] h-[40px] object-contain"
        />
        <Image
          src="/landing-page/landing-page-wechat@2x.png"
          alt="微信"
          width={40}
          height={40}
          className="w-[40px] h-[40px] object-contain"
        />
      </div>

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between w-full gap-8 lg:gap-0">
        {/* 左侧内容区域 - 现在为空，因为内容都移到绝对定位了 */}
        <div className="w-full lg:w-auto"></div>

        {/* 右侧表格 - 修改行间距 */}
        <div className="table-container w-full lg:w-auto overflow-x-auto">
          <div className="flex gap-8 lg:gap-0">
            <div className="table-column flex-shrink-0">
              <div className="table-column-title text-white mb-[25px]">
                资源中心
              </div>
              <div className="table-items">
                <div className="table-column-item text-white">外文发现</div>
                <div className="table-column-item text-white">中文发现</div>
                <div className="table-column-item text-white">全文传递</div>
                <div className="table-column-item text-white">数据库导航</div>
                <div className="table-column-item text-white">复合检索</div>
                <div className="table-column-item text-white">青悦读</div>
                <div className="table-column-item text-white">少儿专区</div>
              </div>
            </div>

            <div className="table-column flex-shrink-0">
              <div className="table-column-title text-white mb-[25px]">
                学术
              </div>
              <div className="table-items">
                <div className="table-column-item text-white">热门数据</div>
                <div className="table-column-item text-white">热门图书</div>
                <div className="table-column-item text-white">热门文章</div>
              </div>
            </div>

            <div className="table-column flex-shrink-0">
              <div className="table-column-title text-white mb-[25px]">
              图书
              </div>
              <div className="table-items">
                <div className="table-column-item text-white">四史</div>
                <div className="table-column-item text-white">文学小说</div>
                <div className="table-column-item text-white">少儿</div>
                <div className="table-column-item text-white">传记</div>
                <div className="table-column-item text-white">人文社科</div>
                <div className="table-column-item text-white">艺术</div>
              </div>
            </div>

            <div className="table-column flex-shrink-0">
              <div className="table-column-title text-white mb-[25px]">
                特色专题
              </div>
              <div className="table-items">
                <div className="table-column-item text-white">人工智能</div>
                <div className="table-column-item text-white">集成电路</div>
                <div className="table-column-item text-white">金融产业</div>
                <div className="table-column-item text-white">民用航空</div>
                <div className="table-column-item text-white">生物医药</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
    </div>
  );
}
