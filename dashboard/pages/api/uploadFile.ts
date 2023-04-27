import { createClient } from "embedbase-js";
import { BatchAddDocument } from "embedbase-js/dist/module/types";
import { splitText } from "embedbase-js/dist/main/split";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { batch } from "@/utils/array";
import fs from "fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf";
import * as Sentry from "@sentry/nextjs";

import formidable from "formidable";

const EMBEDBASE_URL = "https://api.embedbase.xyz";

export const config = {
  api: {
    bodyParser: false,
  },
};

const getApiKey = async (req, res) => {
  // Create authenticated Supabase Client
  const supabase = createServerSupabaseClient({ req, res });
  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  let apiKey: string = ''

  try {
    const { data, status, error } = await supabase
      .from('api-keys')
      .select()
      .eq('user_id', session?.user?.id)

    if (error && status !== 406) {
      throw error
    }
    // get the first api key
    apiKey = data[0].api_key
    if (!apiKey) {
      throw new Error('No API key found')
    }

  } catch (error) {
    console.log(error)
  }
  return apiKey
}

export default async function sync(req: any, res: any) {
  if (req.method === "POST") {
    const form = new formidable.IncomingForm();
    const apiKey = await getApiKey(req, res)
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      })
    }

    const startTime = Date.now()
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error(err, fields, files);
        Sentry.captureException(err);
        res.status(500).json({ message: "Error processing request" });
        return;
      }

      const datasetId = fields.datasetId as string;
      console.log("datasetId:", datasetId);

      const embedbase = createClient(EMBEDBASE_URL, apiKey);

      // HACK to create dataset
      await embedbase.dataset(datasetId).add('');


      const file = (files.file as any);
      const pdfPath = file.filepath;
      const pdfData = fs.readFileSync(pdfPath);

      try {
        const pdfDocument = await getDocument({ data: pdfData }).promise;
        const pageCount = pdfDocument.numPages;
        let pdfText = "";
        for (let i = 1; i <= pageCount; i++) {
          const page = await pdfDocument.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            // @ts-ignore
            .map((item) => item.str)
            .join(" ");
          pdfText += `${pageText}\n`;
        }

        console.log("PDF data:", file);
        const metadata = {
          name: file.originalFilename,
          mimeType: file.mimetype,
          lastModifiedDate: file.lastModifiedDate,
          size: file.size,
        }
        console.log("PDF Content:", pdfText);

        const chunks: BatchAddDocument[] = [];
        splitText(
          pdfText,
          { maxTokens: 500, chunkOverlap: 200 },
          ({ chunk }) =>
            chunks.push({
              data: chunk,
              metadata: metadata,
            })
        );
        await batch(chunks, (chunk) => embedbase.dataset(datasetId).batchAdd(chunk))
        console.log(`Synced ${chunks.length} docs from ${datasetId} in ${Date.now() - startTime}ms`)
        res.status(200).json({ message: "File uploaded successfully" });

        // Save the PDF file to the server
        // const pdfFilePath = path.join(process.cwd(), ".", "uploaded-file.pdf");
        // fs.writeFileSync(pdfFilePath, pdfData);

      } catch (error) {
        Sentry.captureException(error);
        console.log(error);
        res.status(500).json({ message: "Error parsing PDF" });
      }
    });
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }


}