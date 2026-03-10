import { addBill } from "@/db/bill";
import { ChatCompletion, ChatCompletionMessageParam } from "openai/resources";

export const pushBill = async ({
  user_id,
  response,
  sendMsg,
  type,
}: {
  user_id: string;
  response: ChatCompletion;
  sendMsg: ChatCompletionMessageParam[];
  type: string;
}) => {
  const { choices, model, usage } = response;
  const outputMessage = choices?.[0]?.message || {};
  const totalTokens = usage?.total_tokens || 0;

  await addBill({
    user_id,
    model,
    input_tokens: usage?.prompt_tokens || 0,
    output_tokens: usage?.completion_tokens || 0,
    total_tokens: totalTokens,
    input_content: JSON.stringify(sendMsg),
    output_content: JSON.stringify(outputMessage),
    type,
  });
};
