import { OpenAIStream, OpenAIStreamPayload } from "../../utils/OpenAIStream";
import { ipRateLimit } from '../../lib/ip-rate-limit'

export const config = {
  runtime: "edge",
};

interface RequestPayload {
  prompt: string;
}

const defaultChatSystem =
  "You are a powerful AI assistant that can help people answer their questions. You can use context to help you answer the question. You can also use the conversation history to help you answer the question exactly. When you are given in the metadata a path, links or urls in the context, you add them as markdown footnotes (for example fooBar[^1], qux[^2]...) with references at the end (eg [^1]: https://..., [^2]: https://...)."
const handler = async (req: Request, res: Response): Promise<Response> => {
  const rl = await ipRateLimit(req)
  console.log("rl", rl)
  // If the status is not 200 then it has been rate limited.
  if (rl.status !== 200) return rl

  const { prompt } = (await req.json()) as RequestPayload;
  if (!prompt) {
    return new Response("No prompt in the request", { status: 400 });
  }

  console.log("prompt", prompt);
  const payload: OpenAIStreamPayload = {
    model: "gpt-4",
    // model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: defaultChatSystem },
      { role: "user", content: prompt }],
    stream: true,
  };

  const stream = await OpenAIStream(payload);
  return new Response(stream);
};

export default handler;
