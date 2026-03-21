import Head from "next/head";

export default function PrivacyPolicyPage() {
  return (
    <>
      <Head>
        <title>隐私政策 - AI Library</title>
        <meta name="description" content="AI Library隐私政策" />
        <style>{`
          html, body {
            overflow: auto !important;
          }
        `}</style>
      </Head>

      <div className="min-h-screen bg-white py-12 px-6 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-10">
            AI Library隐私政策
          </h1>

          <div className="space-y-5 text-base leading-relaxed text-left">
            <section>
              <h2 className="text-xl font-semibold mb-3">引言</h2>
              <p className="mb-2">
                开发团队（以下简称"我们"）非常重视用户的隐私和个人信息保护。您在使用我们的AI Library系统时，我们可能会收集和使用您的相关信息。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">一、我们如何收集和使用您的个人信息</h2>

              <h3 className="text-lg font-semibold mb-2 mt-4">基础账户信息</h3>
              <p className="mb-3">
                为了完成账号注册，我们需要收集您的昵称、联系方式。
              </p>

              <h3 className="text-lg font-semibold mb-2">AI交互数据</h3>
              <p className="mb-3">
                当您使用AI助手或智能咨询功能时，我们会收集您的对话文本（Prompt）。我们将对这些数据进行去标识化处理，用于优化我们的AI模型和服务质量。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">二、我们如何使用Cookie和同类技术</h2>
              <p>
                我们使用Cookie技术来记录您的登录状态和偏好设置，以便提升您的使用体验。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">三、我们如何共享、转让、公开披露您的个人信息</h2>

              <h3 className="text-lg font-semibold mb-2 mt-4">共享</h3>
              <p className="mb-3">
                我们不会与任何第三方公司、组织和个人分享您的个人信息，除非获得您的明确同意，或基于法律法规要求。
              </p>

              <h3 className="text-lg font-semibold mb-2">第三方SDK</h3>
              <p>
                系统接入了第三方云服务、AI大模型接口，我们会对数据进行脱敏处理后再传输，并要求第三方严格遵守隐私保护义务。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">四、您的权利</h2>

              <h3 className="text-lg font-semibold mb-2 mt-4">查阅与更正</h3>
              <p className="mb-3">
                您有权登录系统查阅和更正您的个人信息。
              </p>

              <h3 className="text-lg font-semibold mb-2">删除权</h3>
              <p className="mb-3">
                在特定情形下（如我们停止运营），您可以要求我们删除您的个人信息。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">五、数据存储与安全</h2>
              <p className="mb-2">
                我们将您的个人信息存储于中华人民共和国境内。
              </p>
              <p>
                我们采取SSL加密、访问控制、去标识化等安全技术措施来保护您的数据。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">六、未成年人保护</h2>
              <p>
                若您是未成年人，建议您请您的监护人仔细阅读本隐私政策，并在征得您的监护人同意的前提下使用我们的服务。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">七、联系我们</h2>
              <p>
                如您对本隐私政策有任何疑问，请通过系统内反馈功能与我们联系。
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
