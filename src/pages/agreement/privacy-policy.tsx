import { GetServerSideProps } from "next";
import Head from "next/head";

export default function PrivacyPolicyPage() {
  return (
    <>
      <Head>
        <title>隐私政策 - 临港智图</title>
        <meta name="description" content="临港智图隐私政策" />
        <style>{`
          html, body {
            overflow: auto !important;
          }
        `}</style>
      </Head>

      <div className="min-h-screen bg-white py-12 px-6 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-10">
            临港智图隐私政策
          </h1>

          <div className="space-y-5 text-base leading-relaxed text-left">
            <section>
              <h2 className="text-xl font-semibold mb-3">引言</h2>
              <p className="mb-2">
                开发团队（以下简称"我们"）非常重视用户的隐私和个人信息保护。您在使用我们的临港智图系统时，我们可能会收集和使用您的相关信息。
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
                如您对本隐私政策有任何疑问，请通过临港图书馆官方与我们联系。
              </p>
            </section>

            <section className="mt-8 pt-6 border-t border-gray-200">
              <h2 className="text-xl font-semibold mb-3">上海新华数图科技有限公司隐私政策</h2>

              <p className="mb-4 font-semibold">
                我们将按法律法规要求，采取相应安全保护措施，尽力保护您的个人信息安全可控。上海新华数图科技有限公司（以下简称"新华"）作为新华服务（以下简称本服务）的提供者制定本《隐私政策》（下称"本政策"）并提醒您：
              </p>

              <p className="mb-4">
                在使用本服务前，请您务必仔细阅读并透彻理解本政策，在确认充分理解并同意后使用相关服务。一旦您开始使用本服务，即表示您已充分理解并同意本政策。
              </p>

              <p className="mb-4">
                本隐私政策在制定时充分考虑到您的需求，帮助您全面了解我们的个人信息收集和使用惯例，同时确保您最终能控制提供给我们的个人信息，这一点至关重要。本隐私政策规定我们如何收集、使用、披露、处理和存储您使用本软件时提供给我们的信息。本隐私政策下"个人信息"指通过信息本身或通过关联其他信息后能够识别特定个人的数据。我们将严格遵守本隐私政策来使用这些信息。
              </p>

              <p className="mb-4">
                如您对本政策内容有任何疑问、意见或建议，可以通过【电子邮箱xh_lingangshutu@163.com】或【5*8小时客服热线（021-20961306）】方式与我们联系。
              </p>

              <section className="mt-6">
                <h3 className="text-lg font-semibold mb-3">一、我们收集哪些信息以及如何使用信息</h3>
                <p className="mb-3">
                  为了向您提供本服务，维护本服务的正常运行，改进及优化我们的服务体验并保障您的账号安全，我们会出于本政策下述目的及方式收集您在注册、使用本服务时主动提供、授权提供或基于您所在企业组织用户要求提供的信息，以及基于您使用本服务时产生的信息。
                </p>

                <h4 className="font-semibold mb-2 mt-4">（一）您须授权我们收集和使用您个人信息的情形</h4>
                <p className="mb-3">
                  收集个人信息的目的在于向您提供服务，并且保证我们遵守适用的相关法律、法规及其他规范性文件。您有权自行选择是否提供该信息，但多数情况下，如果您不提供，我们可能无法向您提供相应的服务，也无法回应您遇到的问题。这些功能包括：
                </p>

                <div className="mb-3">
                  <p className="font-semibold mb-1">1、账号登录注册</p>
                  <p className="mb-2">
                    为了提升您使用本软件时的阅读体验，您可以使用新华账号登录本软件，以更全面的享受本软件带来的便利与愉悦。请您注意，若您未创建账号登录本软件，您仍然可以使用本软件的基本功能如浏览、搜索。但可能会影响您使用购买数字内容等附加业务功能。
                  </p>
                  <p className="mb-2">
                    为完成创建帐号，您需提供以下信息：您的手机号、邮箱、创建的用户名和密码，还可能会提供您的生日、性别等相关信息。您也可以使用第三方帐号（如微信、QQ）登录。
                  </p>
                  <p className="mb-2">
                    您提供的上述信息，将在您使用本服务期间持续授权我们使用。在您注销帐号时，我们将停止使用并删除上述信息
                  </p>
                  <p>
                    注册成为个人用户后，您可以对个人信息进行修改，您可以修改昵称、手机号等信息。
                  </p>
                </div>

                <div className="mb-3">
                  <p className="font-semibold mb-1">2、搜索、查看、收藏、反馈、下载</p>
                  <p className="mb-2">
                    您可以通过本软件快速找到您所需要的数字图书、音视频、图文资讯等内容并进行查看，并将您感兴趣的条目收藏至自己的书架或下载至本地，以方便您的管理。本软件还可以为您记录您的书签、书摘、笔记以及历史进度。
                  </p>
                  <p className="mb-2">
                    为了让您快速地找到或阅读您所需要的图书，我们可能会收集您的系统版本信息、搜索词、系统设置（语言）、应用版本信息来为您提供内容展示的最优方式。我们也会为了不断改进和优化上述的功能来使用您的上述个人信息。相关数据记录将会与您的账号相关联。
                  </p>
                  <p className="mb-2">
                    您也可以通过搜索来精准地找到您所需要的数字内容或服务。我们会保留您的搜索内容以方便您重复输入或为您展示与您搜索内容相关联的图书或服务。请您注意，您的搜索关键词信息无法单独识别您的身份，不属于您的个人信息，我们有权以任何的目的对其进行使用；只有当您的搜索关键词信息与您的其他信息相互结合使用并可以识别您的身份时，则在结合使用期间，我们会将您的搜索关键词信息作为您的个人信息，与您的搜索历史记录一同按照本隐私政策对其进行处理与保护。
                  </p>
                  <p>
                    你在使用中碰到问题，可以通过反馈功能发送给我们，我们客服会跟进处理。我们不会向第三方共享您的反馈信息。
                  </p>
                </div>

                <div className="mb-3">
                  <p className="font-semibold mb-1">3、购买功能</p>
                  <p>
                    对于付费内容，我们可能会收集您的账号信息、手机号以及订单信息，以为您准确下发您需要的数字内容或实体商品。在您下单后，您可以选择本软件的关联方或与本软件合作的第三方支付机构（微信支付及支付宝等支付通道，以下称"支付机构"）所提供的支付服务。支付功能本身并不收集您的个人信息，但我们需要将您的订单信息与这些支付机构共享以实现其确认您的支付指令并完成支付。
                  </p>
                </div>

                <h4 className="font-semibold mb-2 mt-4">（二）您可选择是否授权我们收集和使用您的个人信息的情形</h4>
                <p className="mb-3">
                  为提升您使用本软件时的用户体验，我们的以下附加功能中可能会收集和使用您的个人信息。如果您不提供这些个人信息，您依然可以使用本软件进行阅读，但您可能无法使用这些可以提升您的用户体验的附加功能。这些附加功能包括：
                </p>

                <div className="mb-3">
                  <p className="font-semibold mb-1">（1）基于摄像头（相机）的附加功能：</p>
                  <p className="mb-1"><strong>目的：</strong>您可以使用这个附加功能完成账号头像实时拍照获取的功能；通过扫描二维码使用二维码附加服务的功能；增强现实AR通过摄像头识别图片或实物，显示增强内容，您还可以和增强内容互动，进行拍照或视频合影，录取屏幕分享；意见反馈功能也可提交拍照获取的图片等内容。</p>
                  <p className="mb-1"><strong>方式：</strong>通过启动设备的摄像头功能，获取实时渲染的图片或拍摄后的图片。</p>
                  <p><strong>范围：</strong>前述应用场景下，设备摄像头实时显示或拍摄后的图片。</p>
                </div>

                <div className="mb-3">
                  <p className="font-semibold mb-1">（2）基于写入设备外部存储的功能：</p>
                  <p className="mb-1"><strong>目的：</strong>您可以使用这个功能对您想要保存的图片、二维码下载保存至设备外部存储中，方便您的离线查看或使用其他附加服务，或分享给其他用户或第三方服务；保存学习内容为离线内容；使用增强现实功能时保存互动视频或照片。</p>
                  <p className="mb-1"><strong>方式：</strong>将图片视频文件写入外部存储的图库。</p>
                  <p><strong>范围：</strong>用户在本应用内生成的图片、视频等或使用的二维码图片。</p>
                </div>

                <div className="mb-3">
                  <p className="font-semibold mb-1">（3）基于读取设备外部存储的功能：</p>
                  <p className="mb-1"><strong>目的：</strong>您可以使用这个功能对完成账号头像通过设备图库上传的功能；扫描二维码功能可以识别使用设备图库上图片；可以播放增强现实AR互动保存的图片或视频等；意见反馈功能也可使用设备图库上的图片等内容。</p>
                  <p className="mb-1"><strong>方式：</strong>通过读取设备图库的图片，获取到图片文件，上传至服务器等使用。仅限于用户自己使用，或管理员查看用户反馈解决客户问题。</p>
                  <p><strong>范围：</strong>用户选择的设备图库的图片数据。</p>
                </div>

                <div className="mb-3">
                  <p className="font-semibold mb-1">（4）基于麦克风（录制声音）的功能：</p>
                  <p className="mb-1"><strong>目的：</strong>您可以使用这个功能，在特定的学习类电子书中（如外语教辅类），录制您的声音，与标准发音进行对比评测。</p>
                  <p className="mb-1"><strong>方式：</strong>用户点录音按钮后通过麦克风录制声音。</p>
                  <p><strong>范围：</strong>只录取在用户开始录音和结束录音间录制的声音。</p>
                </div>

                <div className="mb-3">
                  <p className="font-semibold mb-1">（5）基于WIFI和GRSP访问网络连接和获取网络状态的功能：</p>
                  <p className="mb-1"><strong>目的：</strong>本服务提供的内容，需要通过网络下载，您可以使用这个功能来下载；可以获取网络状态，提示用户是否在非WIFI网络状态下下载内容。</p>
                  <p className="mb-1"><strong>方式：</strong>在非WIFI网络时，提示用户是否使用3G/4G/5G等移动数据流量继续访问网络内容。</p>
                  <p><strong>范围：</strong>在应用内需要通过网络读取文件视频等时。</p>
                </div>

                <div className="mb-3">
                  <p className="font-semibold mb-1">（6）允许程序在屏蔽关闭后在后台运行的功能：</p>
                  <p className="mb-1"><strong>目的：</strong>您可以在屏幕关闭后，依然播放音频内容。</p>
                  <p className="mb-1"><strong>方式：</strong>在后台继续播放音频。</p>
                  <p><strong>范围：</strong>音频播放中，程序调入后台运行。</p>
                </div>

                <div className="mb-3">
                  <p className="font-semibold mb-1">（7）允许手机振动、使用闪光灯、读取APP状态等功能：</p>
                  <p>您在使用相机、微信登录、支付宝支付等功能时，可能会使用到这些功能。</p>
                </div>

                <div className="mb-3">
                  <p className="font-semibold mb-1">（8）关于App自启动和关联启动：</p>
                  <p className="mb-2">
                    APP退出后，可能会通过scheme 启动App。使用的业务场景：通过其他应用扫描二维码，在网页中跳转打开本APP，直接定位到二维码对应的内容，如书籍、音视频课件等，可方便用户使用对应内容，减少查找等步骤。
                  </p>
                  <p>
                    当使用微信登陆、QQ登陆、微信支付、支付宝支付等功能时，本APP会调用微信或支付宝APP。在微信或支付宝APP内完成登陆和支付功能后，微信或支付宝APP可以调起本APP。
                  </p>
                  <p className="mb-2">
                    除上述情况外，不会在后台启动APP，本APP没有调用自启动的功能，本APP会使用一些第三方SDK，本APP没有调用这些SDK启动本APP。第三方SDK的说明见"程序中使用的第三方SDK"。
                  </p>
                </div>

                <p className="mb-3">
                  上述附加功能可能需要您在您的设备中向我们开启您的相机（摄像头）、相册（图片库）、读写设备外部存储、麦克风的访问权限、网络访问和状态获取权限、播放音视频，以实现这些功能所涉及的信息的收集和使用。请您注意，您开启这些权限即代表您授权我们可以收集和使用这些个人信息来实现上述的功能，您关闭权限即代表您取消了这些授权，则我们将不再继续收集和使用您的这些个人信息，也无法为您提供上述与这些授权所对应的功能。您关闭权限的决定不会影响此前基于您的授权所进行的个人信息的处理。
                </p>

                <div className="mb-3">
                  <p className="font-semibold mb-1">2、您向我们提供的信息</p>
                  <p>
                    在服务使用过程中，您可以对新华服务的体验问题反馈，帮助我们更好地了解您使用我们服务的体验和需求，改善我们服务,为此我们会记录您的联系信息、反馈的问题或建议，以便我们进一步联系您反馈您我们的处理意见。
                  </p>
                </div>

                <div className="mb-3">
                  <p className="font-semibold mb-1">3、程序中使用的第三方SDK</p>
                  <p className="mb-2">
                    程序中除了本软件开发商上海新华数图科技有限公司的自有SDK外，隐私政策见本文。
                  </p>
                  <p className="mb-2">
                    接入的第三方SDK列表为保障相关功能的实现和应用的安全稳定运行，我们会接入由第三方提供的软件开发包（SDK）实现该目的。
                  </p>
                  <p className="mb-3">
                    我们会对第三方SDK进行严格的安全检测，并要求合作伙伴采取严格的措施来保护您的个人数据。在满足新的服务需求及业务功能变更时，我们可能会调整我们接入的第三方SDK，并及时在本说明中向您公开说明接入第三方SDK的最新情况。请注意，第三方SDK可能因为版本升级、策略调整等原因导致数据类型存在一些变化，请以其公示的官方说明为准。
                  </p>

                  <div className="ml-4 mb-3">
                    <p className="font-semibold mb-2">（1）微信</p>
                    <p className="mb-1"><strong>使用目的：</strong>用于将商品、活动分享到朋友圈和微信好友；微信支付；微信登录</p>
                    <p className="mb-1">你注册微信服务时，微信会收集、使用你的昵称、头像、手机号码；你还可以根据自身需求选择填写性别、地区等信息。</p>
                    <p className="mb-1"><strong>收集个人信息字段：</strong>设备型号、操作系统、唯一设备标识符（IMEI/Android端如AndroidID/OAID/IDFA/OPENUDID/GUID）、SIM卡IMSI信息、设备型号、设备MAC地址、软件列表、读取/写入外部储存卡、登录IP地址、微信软件版本号、接入网络的方式、类型和状态、网络质量数据、设备加速器（如重力感应设备）、操作日志、服务日志信息（如你在微信进行搜索、查看操作的记录、服务故障信息、引荐网址等信息）等日志信息。同时，为了预防病毒、木马程序或其他恶意程序、网站，微信可能会收集你设备安装的应用信息、正在运行的进程信息或设备内存中寄存的数据，以防止你的个人信息泄露。</p>
                    <p className="mb-1">当你使用微信朋友圈功能时，为了让你的好友可以浏览你分享的内容，微信会收集、使用并按照你设定的规则展示你发布的朋友圈文字、照片、视频、位置信息（ 为实现定位功能，我们可能会收集、使用你附近的WIFI信息、你设备附近的基站ID即CellID ） 、评论、点赞、朋友圈封面等信息。</p>
                    <p className="mb-1">当你使用微信支付时，财付通公司还会收集你的相关交易订单、支付记录以便于你查询 。</p>
                    <p className="mb-1"><strong>使用方式：</strong>SDK本机采集</p>
                    <p className="mb-1"><strong>所属机构：</strong>深圳市腾讯计算机系统有限公司</p>
                    <p><strong>隐私协议链接或 sdk url：</strong></p>
                    <ul className="list-disc list-inside ml-4 mb-3">
                      <li>https://developers.weixin.qq.com/doc/oplatform/Mobile_App/Access_Guide/Android.html</li>
                      <li>https://weixin.qq.com/cgi-bin/readtemplate?lang=zh_CN&t=weixin_agreement&s=privacy</li>
                      <li>https://support.weixin.qq.com/cgi-bin/mmsupportacctnodeweb-bin/pages/RYiYJkLOrQwu0nb8</li>
                      <li>https://developers.weixin.qq.com/doc/oplatform/Mobile_App/Resource_Center_Homepage.html</li>
                    </ul>
                  </div>

                  <div className="ml-4 mb-3">
                    <p className="font-semibold mb-2">（2）腾讯开放平台</p>
                    <p className="mb-1"><strong>使用目的：</strong>QQ登录</p>
                    <p className="mb-1">你注册或使用腾讯产品或服务时，填写或上传的昵称、手机号码、头像、图片等。</p>
                    <p className="mb-1"><strong>收集个人信息字段：</strong></p>
                    <p className="mb-1"><strong>设备信息：</strong> 唯一设备标识符（IMEI/Android端如AndroidID/OAID/IDFA/OPENUDID/GUID）、SIM卡IMSI信息、设备型号、设备MAC地址、软件列表、读取/写入外部储存卡、设备型号、操作系统版本、 唯一设备标识符 、电池、信号强度等</p>
                    <p className="mb-1"><strong>软件信息：</strong>软件的版本号、浏览器类型、IP地址</p>
                    <p className="mb-1"><strong>日志信息：</strong>例如，当您使用腾讯的服务时，为了维护产品与服务的安全稳定运行，腾讯可能会收集设备信息、软件信息、服务日志信息等相关信息。</p>
                    <p className="mb-1"><strong>位置信息：</strong>例如，当您使用与位置有关的服务时，腾讯可能会记录您设备所在的位置信息，以便为您提供相关服务。您或其他用户在使用服务时提供的信息中可能包含您所在地理位置信息，例如您或其他人共享的照片包含的地理标记信息。GPS位置信息是敏感个人信息，若您拒绝提供该信息，不会影响您使用产品或服务的其他功能，仅会影响与地理位置相关的功能。</p>
                    <p className="mb-1"><strong>其他相关信息：</strong>为了帮助您更好地使用腾讯的产品或服务，经您的明确授权我们可能会收集相关信息，例如，您选择开启导入通讯录功能，腾讯可能对您联系人的姓名和电话号码进行加密，并仅收集加密后的信息。</p>
                    <p className="mb-1"><strong>使用方式：</strong>SDK本机采集</p>
                    <p className="mb-1"><strong>所属机构：</strong>深圳市腾讯计算机系统有限公司</p>
                    <p><strong>隐私协议链接或 sdk url：</strong></p>
                    <ul className="list-disc list-inside ml-4">
                      <li>https://privacy.qq.com/</li>
                    </ul>
                  </div>

                  <div className="ml-4 mb-3">
                    <p className="font-semibold mb-2">（3）支付宝</p>
                    <p className="mb-1"><strong>使用目的：</strong>支付宝支付</p>
                    <p className="mb-1"><strong>收集的个人信息类型：</strong>IMEI、IMSI、MAC 地址、设备序列号、硬件序列号、SIM卡序列号、ICCID；Android ID、OAID、SSID、BSSID；系统设置、系统属性、设备型号、设备品牌、操作系统；IP 地址、设备MAC地址、网络类型、运营商信息、Wi-Fi 状态、Wi-Fi 参数、Wi-Fi 列表；软件安装列表；运行中进程信息、读取/写入外部储存卡、网络使用习惯、网络连接权限、设备状态权限。</p>
                    <p className="mb-1"><strong>使用方式：</strong>SDK本机采集</p>
                    <p className="mb-2">本应用集成"App支付宝登录"SDK 提供支付服务（本应用不会使用支付宝sdk中除支付外的其他功能）的过程中，支付宝将会采集常用设备信息（如IMEI/IMSI、SIM卡序列号/MAC地址）、网络信息，用于保障用户的账号安全，除上述信息之外，支付宝不会通过第三方应用收集用户的其他个人数据信息。此外，如您希望了解支付宝如何保护及处理您的信息，您可参阅《支付宝隐私权政策》。</p>
                    <p className="mb-1"><strong>所属机构：</strong>支付宝（杭州）信息技术有限公司</p>
                    <p><strong>隐私协议链接或 sdk url：</strong></p>
                    <ul className="list-disc list-inside ml-4">
                      <li>https://render.alipay.com/p/c/k2cx0tg8</li>
                      <li>https://render.alipay.com/p/yuyan/180020010001196791/preview.html?agreementId=AG00000132</li>
                      <li>https://opendocs.alipay.com/common/02kiq3?pathHash=4bdc34df</li>
                      <li>https://opendocs.alipay.com/common/067o75?pathHash=d3167c2a</li>
                    </ul>
                  </div>

                  <div className="ml-4 mb-3">
                    <p className="font-semibold mb-2">COS sdk</p>
                    <p className="mb-1"><strong>使用目的：</strong>上传用户报名图片</p>
                    <p className="mb-1"><strong>收集个人信息字段：</strong>无</p>
                    <p className="mb-1"><strong>使用方式：</strong>本机SDK</p>
                    <p className="mb-1"><strong>服务商名称：</strong> 腾讯云</p>
                    <p><strong>合作放隐私政策链接/官网链接：</strong> https://cloud.tencent.com/document/product/301/100192</p>
                  </div>
                </div>

                <p className="mb-3">
                  （三）您充分知晓，以下情形中，我们收集、使用个人信息无需征得您的同意：
                </p>
                <ul className="list-disc list-inside ml-6 mb-3 space-y-1">
                  <li>1、与国家安全、国防安全有关的；</li>
                  <li>2、与公共安全、公共卫生、重大公共利益有关的；</li>
                  <li>3、与犯罪侦查、起诉、审判和判决执行等有关的；</li>
                  <li>4、出于维护个人信息主体或其他个人的生命、财产等重大合法权益但又很难得到本人同意的；</li>
                  <li>5、所收集的个人信息是个人信息主体自行向社会公众公开的；</li>
                  <li>6、从合法公开披露的信息中收集的您的个人信息的，如合法的新闻报道、政府信息公开等渠道；</li>
                  <li>7、根据您的要求签订合同所必需的；</li>
                  <li>8、用于维护所提供的服务的安全稳定运行所必需的，例如发现、处置服务的故障；</li>
                  <li>9、为合法的新闻报道所必需的；</li>
                  <li>10、学术研究机构基于公共利益开展统计或学术研究所必要，且对外提供学术研究或描述的结果时，对结果中所包含的个人信息进行去标识化处理的；</li>
                </ul>

                <div className="mb-3">
                  <p className="font-semibold mb-1">（四）我们从第三方获得您个人信息的情形</p>
                  <p>
                    在一些法律允许的情况下，我们可能从第三方处获得您的个人信息。例如，您授权第三方账户登录使用我们的服务或授权导入的您在第三方平台的信息如账户、昵称等。
                  </p>
                </div>

                <div className="mb-3">
                  <p className="font-semibold mb-1">（五）非个人信息</p>
                  <p className="mb-2">
                    我们还可能收集其他无法识别到特定个人的信息（即不属于个人信息的信息），例如您使用特定服务时产生的统计类数据，如设备相关信息、日活事件、页面访问事件、页面访问时长事件、会话事件；网络监控数据如请求时长、请求与错误请求数等；IP地址；以及应用崩溃事件等。收集此类信息的目的在于改善我们向您提供的服务。所收集信息的类别和数量取决于您如何使用我们服务。
                  </p>
                  <p>
                    就本隐私政策而言，汇总数据被视为非个人信息。如果我们将非个人信息与个人信息结合使用，则在结合使用期间，此类信息将被视为个人信息。
                  </p>
                </div>

                <div className="mb-3">
                  <p className="font-semibold mb-1">（六）与第三方服务提供商共享您的个人信息</p>
                  <p className="mb-2">
                    <strong>支付服务提供商：</strong>本业务中的支付服务由包括支付宝、微信在内的第三方提供，我们可能会将您的订单信息等信息提供给此类服务提供商，用于为您提供支付服务。
                  </p>
                  <p>
                    如我们与这些第三方分享您的个人信息，我们将采取加密等手段保障您的信息安全。对我们与之共享个人信息的公司、组织，我们会对其数据安全环境进行合理审查，并与其签署严格的数据处理协议，要求第三方对您的信息采取足够的保护措施，严格遵守相关法律法规与监管要求。
                  </p>
                </div>

                <div>
                  <p className="font-semibold mb-1">（七）我们如何使用 Cookie 和同类技术</p>
                  <p className="mb-2">
                    为使您获得更轻松的访问体验，您使用本服务时，我们可能会通过采用各种技术收集和存储您访问本服务的相关数据，在您访问或再次访问本服务时,我们能识别您的身份，并通过分析数据为您提供更好更多的服务。包括使用小型数据文件识别您的身份，这么做是为了解您的使用习惯，帮您省去重复输入账户信息的步骤，或者帮助判断您的账户安全。这些数据文件可能是Cookie、Flash Cookie，或您的浏览器或关联应用程序提供的其他本地存储（统称"Cookie"）。
                  </p>
                  <p>
                    请您理解，我们的某些服务只能通过使用Cookie才可得到实现。如果您的浏览器或浏览器附加服务允许，您可以修改对Cookie的接受程度或者拒绝新华的Cookie，但拒绝新华的Cookie在某些情况下您可能无法使用依赖于cookies的本服务的部分功能。
                  </p>
                </div>
              </section>

              <section className="mt-6">
                <h3 className="text-lg font-semibold mb-3">二、我们如何共享、转让、公开披露您的信息</h3>

                <p className="font-semibold mb-2">(一) 共享</p>
                <p className="mb-2">
                  我们不会与新华相关服务提供者以外的公司、组织和个人共享您的个人信息，但以下情况除外：
                </p>

                <p className="mb-2">在获取您同意的情况下共享：获得您的明确同意后，我们会与其他方共享您的个人信息。</p>

                <p className="mb-2">在法定情形下的共享：我们可能会根据法律法规规定、诉讼争议解决需要，或按行政、司法机关依法提出的要求，对外共享您的个人信息。</p>

                <p className="mb-2">只有透露您的资料，才能提供您所要求的第三方服务，如：</p>

                <ul className="list-disc list-inside ml-6 mb-3 space-y-1">
                  <li>1、我们可能会根据法律法规规定，或按政府主管部门的强制性要求，对外共享您的个人信息。</li>
                  <li>2、与授权合作伙伴共享：仅为实现本政策中声明的目的，我们的某些服务将由授权合作伙伴提供。我们可能会与合作伙伴共享您的某些个人信息，以提供更好的客户服务和用户体验。我们仅会出于合法、正当、必要、特定、明确的目的共享您的个人信息，并且只会共享提供服务所必要的个人信息。我们的合作伙伴无权将共享的个人信息用于任何其他用途。</li>
                  <li>3、在您被他人投诉侵犯知识产权或其他合法权利时，需要向投诉人披露您的必要资料，以便进行投诉处理的；本服务含有到其他网站的链接。除法律另有规定外，新华对其他网站的隐私保护措施不负相应法律责任。我们可能在需要的时候增加商业伙伴，但是提供给他们的将仅是综合信息，我们将不会公开您的个人信息。</li>
                </ul>

                <p className="font-semibold mb-2">(二) 转让</p>
                <p className="mb-2">
                  我们不会将您的个人信息转让给任何公司、组织和个人，但以下情况除外：
                </p>

                <p className="mb-2">在获取明确同意的情况下转让：获得您的明确同意后，我们会向其他方转让您的个人信息。</p>

                <p className="mb-3">
                  在本服务提供者发生合并、收购或破产清算情形，或其他涉及合并、收购或破产清算情形时，如涉及到个人信息转让，我们会要求新的持有您个人信息的公司、组织继续受本政策的约束，否则我们将要求该公司、组织和个人重新向您征求授权同意。
                </p>

                <p className="font-semibold mb-2">(三) 公开披露</p>
                <p className="mb-2">
                  我们仅会在以下情况下，公开披露您的个人信息：
                </p>

                <p className="mb-2">获得您明确同意或基于您的主动选择，我们可能会公开披露您的个人信息；</p>

                <p className="mb-3">
                  如果我们确定您出现违反法律法规或严重违反新华相关协议规则的情况，或为保护新华的人身财产安全免遭侵害，我们可能依据法律法规或新华相关协议规则征得您同意的情况下披露关于您的个人信息，包括相关违规行为以及新华已对您采取的措施。
                </p>

                <p className="font-semibold mb-2">(四) 共享、转让、公开披露个人信息时事先征得授权同意的例外</p>
                <ul className="list-disc list-inside ml-6 mb-3 space-y-1">
                  <li>与国家安全、国防安全有关的；</li>
                  <li>与公共安全、公共卫生、重大公共利益有关的；</li>
                  <li>与犯罪侦查、起诉、审判和判决执行等有关的；</li>
                  <li>出于维护您或其他个人的生命、财产等重大合法权益但又很难得到本人同意的；</li>
                  <li>您自行向社会公众公开的个人信息；</li>
                  <li>从合法公开披露的信息中收集个人信息的，如合法的新闻报道、政府信息公开等渠道。</li>
                </ul>

                <p className="mb-3">
                  请您注意，根据法律规定，共享、转让经匿名化处理的个人信息，且确保数据接收方无法复原并重新识别个人信息主体的，不属于个人信息的对外共享、转让及公开披露行为，对此类数据的保存及处理将无需另行向您通知并征得您的同意。
                </p>
              </section>

              <section className="mt-6">
                <h3 className="text-lg font-semibold mb-3">三、您的权力</h3>

                <p className="font-semibold mb-2">（一）控制设置</p>
                <p className="mb-2">
                  我们承认每个人对隐私权的关注各不相同。因此，我们提供了一些示例，说明本软件提供的各种方式，供您选择，以限制收集、使用、披露或处理您的个人信息，并控制您的隐私权设置：
                </p>

                <ul className="list-disc list-inside ml-6 mb-3 space-y-1">
                  <li>打开或者关闭拍照、相册、读写设备外部存储、麦克风等权限；</li>
                  <li>在本软件中点击"我的-头像"修改您的个人信息，包括昵称、头像、性别等；</li>
                  <li>在本软件查询、删除您的浏览历史信息、搜索历史信息；</li>
                  <li>登入或登出账户。</li>
                </ul>

                <p className="mb-3">
                  如果您之前因为上述目的同意我们使用您的个人信息，您可以随时通过书面或者向 xh_lingangshutu@163.com 发送邮件的方式联系我们来改变您的决定。
                </p>

                <p className="font-semibold mb-2">（二）您对您的个人信息享有的权利</p>
                <p className="mb-2">
                  根据您所适用的国家或地区法律法规，您有权要求访问、更正、删除我们持有的与您相关的任何个人信息（以下简称请求）。
                </p>

                <p className="mb-2">
                  大多数法律要求个人信息主体提出的请求应遵循特定要求，本隐私政策要求您的请求应当符合以下情形：
                </p>

                <ul className="list-disc list-inside ml-6 mb-3 space-y-1">
                  <li>通过我们专门的请求渠道，并且出于保护您的信息安全的考虑，您的请求应当是书面的（除非当地法律明确承认口头申请）；</li>
                  <li>提供足够的信息使我们可以验证您的身份，确保请求人是所请求信息主体本人或合法授权人；</li>
                </ul>

                <p className="mb-2">
                  一旦我们获得充分信息确认可处理您的请求时，我们将在适用数据保护法律规定的时间内对您的请求做出回应。具体而言：
                </p>

                <p className="mb-2">
                  基于您的要求及适用法律规定，我们可免费提供一份我们已收集并处理的关于您的个人信息记录， 如您提出对于相关信息的其他请求，我们可能会基于相关适用法律，并结合实际的管理成本向您收取一笔合理的费用。
                </p>

                <p className="mb-2">
                  如果您认为我们持有的关于您的任何信息是不正确或不完整的，可要求基于使用目的更正或完善个人信息。
                </p>

                <p className="mb-3">
                  根据您适用的法律法规，您可能有权要求我们删除您的个人数据。我们将会根据您的删除请求进行评估，若满足相应规定，我们将会采取包括技术手段在内的相应步骤进行处理。当您或我们协助您删除相关信息后，因为适用的法律和安全技术，我们可能无法立即从备份系统中删除相应的信息，我们将安全地存储您的个人信息并将其与任何进一步处理隔离，直到备份可以清除或实现匿名。
                </p>

                <p className="mb-3">
                  我们有权拒绝处理无实质意义/纠缠式重复的请求、损害他人隐私权的请求、极端不现实的请求，要求不相称的技术工作，以及根据当地法律无需给予的请求，已经公之于众的信息，保密条件下给出的信息。如果我们认为删除数据或访问数据的请求的某些方面可能会导致我们无法出于前述反欺诈和安全目的合法使用数据，可能也会予以拒绝。
                </p>

                <p className="font-semibold mb-2">（三）撤销同意</p>
                <p className="mb-2">
                  您可以通过提交请求撤销同意，包括收集、使用和/或披露我们掌握或控制的您的个人信息。根据您所使用的具体服务，可以通过发送邮件到xh_lingangshutu@163.com进行相关操作。我们将会在您做出请求后的合理时间内处理您的请求，并且会根据您的请求，在此后不再收集、使用和/或披露您的个人信息。
                </p>

                <p className="mb-3">
                  请注意，您撤销同意会导致某些法律后果。根据您授权我们处理信息的范围，这可能导致您不能享受新华的服务。但您撤回同意或授权的决定，不会影响此前基于您的授权而开展的个人信息处理。
                </p>

                <p className="font-semibold mb-2">（四）注销服务或账号</p>
                <p>
                  如您希望注销账号，请在个人中心-设置-账号与安全中，点击"注销账号"后按提示操作。如有问题，请发送邮件至xh_lingangshutu@163.com。操作账号注销后，账号将会被冻结60天，冻结期结束后，账号将被彻底注销且不可恢复。
                  由于注销账号的操作将使您无法使用本服务，请您谨慎操作。我们为了保护您或他人的合法权益会结合您对本服务的使用情况判断是否支持您的注销请求。
                </p>
              </section>

              <section className="mt-6">
                <h3 className="text-lg font-semibold mb-3">四、我们如何保护您的信息</h3>
                <p className="mb-2">
                  我们会采取各种预防措施来保护您的个人信息，以保障您的个人信息免遭丢失、盗用和误用，以及被擅自取阅、披露、更改或销毁。为确保您个人信息的安全，我们有严格的信息安全规定和流程，并有专门的信息安全团队在公司内部严格执行上述措施。例如，我们会使用加密技术确保数据的保密性；我们会使用受信赖的保护机制防止数据遭到恶意攻击；我们会部署访问控制机制，确保只有授权人员才可访问个人信息；以及我们会举办安全和隐私保护培训课程，加强员工对于保护个人信息重要性的认识。
                </p>

                <p className="mb-3">
                  我们会采取合理可行的措施，尽力避免收集无关的个人信息，并在限于达成本政策所述目的所需的期限以及所适用法律法规所要求的期限内保留您的个人信息
                </p>

                <p>
                  互联网环境并非百分之百安全，尽管我们有这些安全措施，但请注意在互联网上不存在"完善的安全措施"，我们将尽力确保您的信息的安全性。
                </p>
              </section>

              <section className="mt-6">
                <h3 className="text-lg font-semibold mb-3">五、未成年人保护</h3>
                <p>
                  我们重视未成年人的信息保护，如您为未成年人的，建议您请您的父母或监护人仔细阅读本隐私权政策，并在征得您的父母或监护人同意的前提下使用我们的服务或向我们提供信息。对于经父母或监护人同意使用我们的服务而收集未成年人个人信息的情况，我们只会在法律法规允许，父母或监护人明确同意或者保护未成年人所必要的情况下使用，共享，转让或披露此信息。我们将根据国家相关法律法规及本《隐私政策》的规定保护未成年人的个人信息。
                </p>
              </section>

              <section className="mt-6">
                <h3 className="text-lg font-semibold mb-3">六、您的个人信息如何在全球范围转移</h3>
                <p>
                  服务过程中产生的个人信息将存储在中华人民共和国境内。
                </p>
              </section>

              <section className="mt-6">
                <h3 className="text-lg font-semibold mb-3">七、个人信息的使用、存储、传播情况的说明</h3>
                <p className="mb-2">
                  服务过程中产生的个人信息将存储在中华人民共和国境内阿里云机房。
                </p>
                <p className="mb-2">
                  收集此类信息的目的在于改善我们向您提供的服务，例如记录你的学习记录，方便你继续学习。
                </p>
                <p>
                  收集的信息仅限于本服务使用，不会向第三方提供。
                </p>
              </section>

              <section className="mt-6">
                <h3 className="text-lg font-semibold mb-3">八、本政策如何更新</h3>
                <p className="mb-2">
                  我们的隐私政策可能变更。
                </p>

                <p className="mb-2">
                  未经您明确同意我们不会限制您按照本隐私政策所应享有的权利。我们会在本页面发布对本隐私政策所做的任何变更。
                </p>

                <p className="mb-3">
                  对于重大变更，我们还会提供更为显著的通知（包括我们会通过应用内消息通知甚至向您提供弹窗提示）。
                </p>

                <p className="mb-2">
                  本政策所指的重大变更包括但不限于：
                </p>

                <ul className="list-disc list-inside ml-6 mb-3 space-y-1">
                  <li>1、我们的服务模式发生重大变化。如处理个人信息的目的、处理的个人信息类型、个人信息的使用方式等；</li>
                  <li>2、我们在所有权结构、组织架构等方面发生重大变化。如业务调整、破产并购等引起的所有者变更等；</li>
                  <li>3、个人信息共享、转让或公开披露的主要对象发生变化；</li>
                  <li>4、您参与个人信息处理方面的权利及其行使方式发生重大变化；</li>
                  <li>5、我们负责处理个人信息安全的责任部门、联络方式及投诉渠道发生变化时；</li>
                  <li>6、个人信息安全影响评估报告表明存在高风险时。</li>
                </ul>
              </section>

              <section className="mt-6">
                <h3 className="text-lg font-semibold mb-3">九、联系我们</h3>
                <p className="mb-2">
                  如果您对新华的隐私保护政策或数据处理有任何疑问、意见或建议，可以通过【电子邮箱xh_lingangshutu@163.com】或【5*8小时客服热线（021-20961306）】与我们联系，我们邮寄联系方式如下：
                </p>
                <p className="mb-1">上海新华数图科技有限公司</p>
                <p className="mb-1">联系部门：临港中心</p>
                <p className="mb-1">地址：上海市浦东新区环湖南三路2555号 临港中心 邮编： 201306</p>
                <p className="mb-2">电话：021-20961306</p>
                <p className="mb-3">
                  一般情况下，我们将在收到您相关联系信息并核实您身份后十天内回复。
                </p>
                <p>
                  如果您对我们的回复不满意，特别是您认为我们的个人信息处理行为损害了您的合法权益，您还可以通过向上海市静安区有管辖权的法院提起诉讼来寻求解决方案。
                </p>
              </section>

              <section className="mt-6 text-sm text-gray-600">
                <p>最近更新日期：2025年12月31日</p>
              </section>
              <section className="mt-6 text-sm text-gray-600">
                <p>生效日期：2026年1月1日</p>
              </section>
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
