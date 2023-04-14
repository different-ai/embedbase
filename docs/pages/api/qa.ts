import { OpenAIStream, OpenAIStreamPayload } from "../../utils/OpenAIStream";
import { ipRateLimit } from '../../lib/ip-rate-limit'

export const config = {
  runtime: "edge",
};

interface RequestPayload {
  prompt: string;
}

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
    messages: [{ role: "user", content: prompt }],
    stream: true,
  };

  const stream = await OpenAIStream(payload);
  return new Response(stream);
};

export default handler;
