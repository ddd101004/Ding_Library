import OpenAI from "openai";

type ChatProps = {
  key?: string;
  baseUrl?: string;
};

export const getAIChatApi = async (
  props?: ChatProps,
  timeout = 30 * 1000,
  defaultHeaders = {}
) => {
  const apiKey = props?.key || process.env.LLM_API_KEY;
  const url = props?.baseUrl || process.env.LLM_API_URL;

  return new OpenAI({
    baseURL: url,
    apiKey,
    timeout,
    maxRetries: 2,
    ...defaultHeaders,
  });
};
