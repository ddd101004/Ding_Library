import { GetServerSideProps } from "next";
import Head from "next/head";

export default function UserServiceAgreementPage() {
  return (
    <>
      <Head>
        <title>用户服务协议 - 临港智图</title>
        <meta name="description" content="临港智图用户服务协议" />
        <style>{`
          html, body {
            overflow: auto !important;
          }
        `}</style>
      </Head>

      <div className="min-h-screen bg-white py-12 px-6 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-10">
            临港智图用户服务协议
          </h1>

          <div className="space-y-5 text-base leading-relaxed text-left">
            <section>
              <p className="font-semibold mb-2">版本更新日期：2025年12月31日</p>
              <p className="font-semibold">生效日期：2026年1月1日</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">特别提示：</h2>
              <p className="mb-2">
                在此特别提醒您（用户）在注册成为用户之前，请认真阅读本《用户服务协议》（以下简称"本协议"），确保您充分理解本协议中各条款。请您审慎阅读并选择接受或不接受本协议。除非您接受本协议所有条款，否则您无权注册、登录或使用本协议所涉服务。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">一、服务内容</h2>
              <p className="mb-2">
                临港智图（以下简称"本系统"）是运用人工智能、大数据分析等技术为您提供的智能图书检索、个性化推荐、AI辅助阅读、AI助手等服务。
              </p>
              <p>
                本系统可能会根据您的阅读历史和偏好，利用算法技术向您提供个性化的图书推荐服务。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">二、账号注册与安全</h2>
              <p className="mb-2">
                您需使用手机号认证注册。
              </p>
              <p>
                <strong className="font-semibold">账号管理：</strong> 您的账号仅限您本人使用，禁止赠与、借用、租用、转让或售卖。因账号归属权产生的纠纷，由您自行承担。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">三、用户行为规范</h2>
              <p className="mb-2">
                您承诺不会利用本系统进行任何违法违规行为，包括但不限于上传反动、色情、暴力内容。
              </p>
              <p>
                <strong className="font-semibold">针对AI功能的规范：</strong> 您在使用AI助手或检索功能时，不得恶意输入诱导性、攻击性或违反法律法规的指令（Prompt）；不得利用本系统生成虚假信息。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">四、知识产权声明</h2>
              <p className="mb-2">
                本系统包含的所有软件、算法、代码、界面设计、数据模型等知识产权归开发者所有。
              </p>
              <p>
                <strong className="font-semibold">AI生成内容：</strong> 本系统AI助手生成的回复、摘要、推荐语等内容，其知识产权归属遵循法律规定。您可将其用于个人学习或研究，但不得用于商业用途，且不得声称该内容由人类创作。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">五、AI服务免责声明</h2>
              <p className="mb-2">
                <strong className="font-semibold">准确性：</strong> 基于人工智能技术的特性，本系统提供的书籍推荐、AI问答回复、内容摘要等可能存在误差、幻觉或滞后。本系统不保证AI生成内容的绝对准确性、完整性和适用性，相关内容仅供参考，不构成专业建议。
              </p>
              <p className="mb-2">
                <strong className="font-semibold">算法推荐：</strong> 系统可能会基于您的历史行为进行算法推荐。
              </p>
              <p>
                <strong className="font-semibold">不可抗力：</strong> 因网络故障、服务器维护、电力故障等不可抗力导致的服务中断，我们不承担责任。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">六、协议的变更与终止</h2>
              <p>
                我们有权在必要时修改本协议条款。您可以在相关服务页面查阅最新版本的协议条款。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">七、法律适用与管辖</h2>
              <p>
                本协议之效力、解释、变更、执行与争议解决均适用中华人民共和国法律。
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {},
  };
};
