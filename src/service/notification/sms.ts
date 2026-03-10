import * as tencentcloud from "tencentcloud-sdk-nodejs";

// 导入对应产品模块的client models。
const smsClient = tencentcloud.sms.v20210111.Client;

const client = new smsClient({
  credential: {
    /* 必填：腾讯云账户密钥对secretId，secretKey。
     * SecretId、SecretKey 查询: https://console.cloud.tencent.com/cam/capi */
    secretId: process.env.TENCENTCLOUD_SECRET_ID,
    secretKey: process.env.TENCENTCLOUD_SECRET_KEY,
  },
  /* 必填：地域信息，可以直接填写字符串ap-guangzhou，支持的地域列表参考 https://cloud.tencent.com/document/api/382/52071#.E5.9C.B0.E5.9F.9F.E5.88.97.E8.A1.A8 */
  region: "ap-guangzhou",
});

const sendSms = async (
  phoneNumber: string | string[],
  code: string,
  templateId?: string
) => {
  const params = {
    /* 短信应用ID: 短信SmsSdkAppId在 [短信控制台] 添加应用后生成的实际SmsSdkAppId，示例如1400006666 */
    // 应用 ID 可前往 [短信控制台](https://console.cloud.tencent.com/smsv2/app-manage) 查看
    SmsSdkAppId: process.env.TENCENTCLOUD_SMS_SDK_APP_ID!,
    /* 短信签名内容: 使用 UTF-8 编码，必须填写已审核通过的签名 */
    // 签名信息可前往 [国内短信](https://console.cloud.tencent.com/smsv2/csms-sign) 或 [国际/港澳台短信](https://console.cloud.tencent.com/smsv2/isms-sign) 的签名管理查看
    SignName: process.env.TENCENTCLOUD_SMS_SIGN_NAME!,
    /* 模板 ID: 必须填写已审核通过的模板 ID */
    // 模板 ID 可前往 [国内短信](https://console.cloud.tencent.com/smsv2/csms-template) 或 [国际/港澳台短信](https://console.cloud.tencent.com/smsv2/isms-template) 的正文模板管理查看
    TemplateId: templateId || process.env.TENCENTCLOUD_SMS_TEMPLATE_ID!,
    /* 模板参数: 模板参数的个数需要与 TemplateId 对应模板的变量个数保持一致，若无模板参数，则设置为空 */
    TemplateParamSet: [code],
    /* 下发手机号码，采用 e.164 标准，+[国家或地区码][手机号]
     * 示例如：+8613711112222， 其中前面有一个+号 ，86为国家码，13711112222为手机号，最多不要超过200个手机号*/
    PhoneNumberSet: Array.isArray(phoneNumber)
      ? phoneNumber.map((phone) => `+86${phone}`)
      : [`+86${phoneNumber}`],
  };

  // 通过client对象调用想要访问的接口，需要传入请求对象以及响应回调函数
  const result = await client.SendSms(params);
    if (result.SendStatusSet && result.SendStatusSet[0].Code !== 'Ok') {
        // 忽略每日发送次数限制错误
    if (result.SendStatusSet[0].Code === 'LimitExceeded.PhoneNumberDailyLimit') {
            return { Code: 'Ok' };
    }
    const errorMessages: Record<string, string> = {
        'InvalidPhoneNumber': '手机号格式不正确',
      'InsufficientBalance': '短信余额不足，请联系管理员',
      'InvalidSignature': '短信签名无效',
      'InvalidTemplateId': '短信模板无效'
    };
    const errorCode = result.SendStatusSet[0].Code || 'Unknown';
    const errorMessage = errorMessages[errorCode] || `短信发送失败: ${result.SendStatusSet[0].Message}`;
    throw new Error(errorMessage);
  }
  return result.SendStatusSet?.[0];
};

export default sendSms;
