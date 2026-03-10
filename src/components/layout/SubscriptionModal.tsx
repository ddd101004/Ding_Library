import React from "react";

interface SubscriptionModalProps {
  show: boolean;
  onClose: () => void;
}

const BenefitItem: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-center">
    <div className="w-[16px] h-[16px] rounded-full bg-[#3B80FF]/20 flex items-center justify-center mr-2">
      <img
        src="/settings/settings-correct.svg"
        alt="正确"
        className="w-[15px] h-[15px]"
      />
    </div>
    <span className="text-base font-medium">{text}</span>
  </div>
);

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  show,
  onClose,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-white relative w-[864px] h-[760px] shadow-[0px_10px_29px_1px_rgba(89,106,178,0.1)] rounded-[20px] border border-[#E9ECF2]"
      >
        {/* 弹窗内容 */}
        <div className="w-full h-full relative p-0">
          {/* 底部按钮区域 */}
          <div className="absolute bottom-[30px] right-[30px] flex gap-[40px]">
            <button
              onClick={onClose}
              className="w-[128px] h-[40px] bg-white border border-[#C8C9CC] rounded-[20px] text-[#666666] text-[16px] hover:shadow-md hover:scale-105 transition-all duration-200"
            >
              下次再说
            </button>
            <button className="w-[128px] h-[40px] bg-[#3B80FF] rounded-[20px] text-white text-[16px] hover:shadow-md hover:scale-105 transition-all duration-200">
              立即升级
            </button>
          </div>

          {/* 标题区域 */}
          <div
            className="absolute top-[26px] left-[31px] flex items-center"
          >
            <span className="text-[30px] font-bold">计划</span>
            <span
              className="text-[16px] text-[#666666] font-medium ml-[20px]"
            >
              管理您的订阅计划
            </span>
          </div>

          {/* 分隔线 */}
          <div
            className="absolute top-[83px] left-[31px] w-[803px] h-[1px] bg-[#E0E1E5] rounded-[1px]"
          ></div>

          {/* 订阅计划栏目 */}
          <div
            className="absolute top-[108px] left-0 right-0 flex pl-[30px] pr-[31px] gap-[21px]"
          >
            <div className="w-[254px] h-[560px] rounded-[20px] border border-[#E9ECF2] relative">
              {/* 半透明背景层 */}
              <div
                className="absolute inset-0 rounded-[20px] bg-[#3B80FF] opacity-10"
              ></div>

              {/* 内容容器 */}
              <div className="absolute inset-0 z-10">
                {/* 标题 */}
                <div className="absolute left-[20px] top-[54px] font-medium text-2xl">
                  基础计划
                </div>

                {/* 收费说明 */}
                <div className="absolute left-[20px] top-[89px] text-sm text-gray-600">
                  每年按用户/电子邮件月收费
                </div>

                {/* 价格 */}
                <div className="absolute left-[20px] top-[120px] flex items-baseline">
                  <span className="text-2xl">￥</span>
                  <span className="text-5xl ml-1">9.99</span>
                </div>

                {/* 付费说明 */}
                <div className="absolute left-[20px] top-[175px] text-sm text-gray-400">
                  一次性付费+服务费
                </div>

                {/* 立即购买按钮 */}
                <button
                  className="absolute left-[20px] top-[229px] w-[214px] h-[40px] bg-white text-[#3B80FF] font-medium flex items-center justify-center rounded-[10px] border border-[#3B80FF] text-[20px]"
                >
                  立即购买
                </button>

                {/* 福利列表 */}
                <div className="absolute left-[20px] top-[304px] space-y-[35px]">
                  <BenefitItem text="福利1" />
                  <BenefitItem text="福利2" />
                  <BenefitItem text="福利3" />
                  <BenefitItem text="福利4" />
                </div>
              </div>
            </div>

            {/* 高级计划 */}
            <div className="w-[254px] h-[560px] bg-[url('/background/settings-bg@2x.png')] bg-center rounded-[20px] border border-[#E9ECF2] relative">
              {/* 标题 */}
              <div className="absolute left-[20px] top-[54px] font-medium text-2xl">
                高级计划
              </div>

              {/* 收费说明 */}
              <div className="absolute left-[20px] top-[89px] text-sm text-gray-600">
                每年按用户/电子邮件月收费
              </div>

              {/* 价格 */}
              <div className="absolute left-[20px] top-[120px] flex items-baseline">
                <span className="text-2xl">￥</span>
                <span className="text-5xl ml-1">19.99</span>
              </div>

              {/* 付费说明 */}
              <div className="absolute left-[20px] top-[175px] text-sm text-gray-400">
                一次性付费+服务费
              </div>

              {/* 切换计划按钮 */}
              <button
                className="absolute left-[20px] top-[229px] w-[214px] h-[40px] bg-[#3B80FF] border border-[#E9ECF2] rounded-[10px] text-white font-medium text-[20px]"
              >
                切换计划
              </button>

              {/* 福利列表 */}
              <div className="absolute left-[20px] top-[304px] space-y-[35px]">
                <BenefitItem text="福利1pro" />
                <BenefitItem text="福利2pro" />
                <BenefitItem text="福利3pro" />
                <BenefitItem text="福利4pro" />
              </div>
            </div>

            {/* 专业计划 */}
            <div className="w-[254px] h-[560px] bg-[url('/background/bg@2x.png')] bg-cover bg-center rounded-[20px] border border-[#E9ECF2] relative">
              {/* 标题 */}
              <div className="absolute left-[20px] top-[54px] font-medium text-2xl text-[#3A57B5]">
                专业计划
              </div>

              {/* 收费说明 */}
              <div className="absolute left-[20px] top-[89px] text-sm text-[#3A57B5]">
                每年按用户/电子邮件月收费
              </div>

              {/* 价格 */}
              <div className="absolute left-[20px] top-[120px] w-[107px] h-[39px] font-bold text-[40px] text-[#3A57B5] leading-[40px] font-[OPPOSans]">
                定制
              </div>

              {/* 付费说明 */}
              <div className="absolute left-[20px] top-[175px] text-sm text-[#3A57B5]">
                一次性付费+服务费
              </div>

              {/* 联系我们按钮 */}
              <button
                className="absolute left-[20px] top-[229px] w-[214px] h-[40px] bg-gradient-to-r from-[#7934F6] to-[#2E6EFF] border border-[#E9ECF2] rounded-[10px] text-white font-medium text-[20px]"
              >
                联系我们
              </button>

              {/* 福利列表 */}
              <div
                className="absolute left-[20px] top-[304px] space-y-[35px] text-[#3B4E8D]"
              >
                <BenefitItem text="福利1promax" />
                <BenefitItem text="福利2promax" />
                <BenefitItem text="福利3promax" />
                <BenefitItem text="福利4promax" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;
