import { App, Modal, Setting } from 'obsidian';

interface Titles {
  heading: string;
  subheading: string;
  button: string;
}
const defaultTitles: Titles = {
  heading: 'Write a paragraph about',
  subheading: 'Write a paragraph about',
  button: 'Write paragraph',
};
export class PromptModal extends Modal {
  text: string;
  titles: Titles;

  onSubmit: (text: string) => void;

  constructor(app: App, onSubmit: (text: string) => void, titles: Titles = defaultTitles) {
    super(app);
    this.onSubmit = onSubmit;
    this.titles = titles;
  }

  search = (evt: Event) => {
    evt.preventDefault();
    this.onSubmit(this.text);
    this.close();
  };

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h1', { text: this.titles.heading });
    const form = contentEl.createEl('form');
    form.onsubmit = this.search;
    new Setting(form).setName(this.titles.subheading).addText((text) =>
      text.setValue(this.text).onChange((value) => {
        this.text = value;
      })
    );

    new Setting(form).addButton((btn) => {
      btn.buttonEl.type = 'submit';

      return btn.setButtonText(this.titles.button).setCta().onClick(this.search);
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
import { App, Modal, Setting, TextComponent } from 'obsidian';

const suggestions = [
  'keep email addresses seperated by a comma',
  'explain it like I am 5',
  'translate to german',
  'use the metric system',
  'format this as a markdown table',
  'fix grammar',
];

export class RewriteModal extends Modal {
  text: string;
  textfield: TextComponent;

  onSubmit: (text: string) => void;

  constructor(app: App, onSubmit: (text: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  private getLocalSuggestions() {
    return JSON.parse(window.localStorage.getItem('ava-rewrite-text')) as string[] || [];
  }

  search = (evt: Event) => {
    evt.preventDefault();
    this.onSubmit(this.text);
    // remove this text from local storage and add it to the top of the suggestions
    // window.localStorage 'ava-rewrite-text' is a list of 3 texts
    // we maintain to 3 items max with the order being most recent first
    const storedTexts = this.getLocalSuggestions();
    window.localStorage.setItem('ava-rewrite-text', JSON.stringify([
      this.text,
      // minus the current text
      ...storedTexts.filter((text) => text !== this.text),
    ].slice(0, 3)));
    this.close();
  };

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h1', { text: 'Rewrite Assist' });
    const form = contentEl.createEl('form');
    form.onsubmit = this.search;

    new Setting(form).setName('Transform to').addText((textfield) => {
      textfield
        .setPlaceholder(
          'remove all email addresses / make it sound more like [paste text] / make it more polite'
        )
        .setValue(this.text)
        .onChange((value) => {
          this.text = value;
        });
      textfield.inputEl.style.minWidth = '100%';
      this.textfield = textfield;
    });

    // Display some suggestions
    contentEl.createEl('h3', { text: 'Suggestions' });
    const suggestionContainer = contentEl.createEl('div', {
      attr: { style: 'display: flex; flex-wrap: wrap; gap: 0.5rem;' },
    });
    const localSuggestions = this.getLocalSuggestions();
    const allSuggestions = new Set([...localSuggestions, ...suggestions]);
    // TODO: add history icon for local suggestions
    // add a few suggestions
    allSuggestions.forEach((suggestion) => {
      suggestionContainer.createEl('span', {
        text: suggestion,
        cls: 'setting-hotkey ',
        attr: { style: 'width: min-content; padding: 0.5rem; cursor: pointer' },
      }).onclick = () => {
        this.text = suggestion;
        this.textfield.setValue(suggestion);
        this.search(new Event('submit'));
      };
    });

    new Setting(form).addButton((btn) => {
      btn.buttonEl.type = 'submit';

      return btn.setButtonText('Rewrite Text').setCta().onClick(this.search);
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
,// TODO: firebase hosting custom domain name does not work with SSE somehow?
export const API_HOST = process.env.API_HOST || "https://obsidian-ai-c6txy76x2q-uc.a.run.app";
export const EMBEDBASE_URL = "https://embedbase-internal-c6txy76x2q-uc.a.run.app";

export const buildHeaders = (token: string, version: string) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Client-Version': version,
});


export const feedbackUrl = 'https://forms.gle/RZLR4umCwCFpZcNE9';

export const creditsText = `Ava started as a weekend project by Ben & Louis as a mean to solve multiple problems related to having a large quantity of disparate notes. 
We are very grateful for your support and feedback.`

export const feedbackText = `Thank you for using Ava! We would love to hear your feedback.
Please fill out this form to send us your feedback.`;

export const calText = 'Feel free to schedule a call with us';
export const calUrl = 'https://cal.com/potato/20min';

// a nice svg looking like a wizard hat
export const iconAva = `<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_11_13)">
<path d="M126.5 64C126.5 98.5178 98.5178 126.5 64 126.5C29.4822 126.5 1.5 98.5178 1.5 64C1.5 29.4822 29.4822 1.5 64 1.5C98.5178 1.5 126.5 29.4822 126.5 64Z" stroke="currentColor" stroke-width="8"/>
<path d="M121.5 63.5C121.5 69.6612 118.037 75.3756 112.165 79.6072C106.294 83.8372 98.1093 86.5 89 86.5C79.8907 86.5 71.7055 83.8372 65.8353 79.6072C59.9629 75.3756 56.5 69.6612 56.5 63.5C56.5 57.3388 59.9629 51.6244 65.8353 47.3928C71.7055 43.1628 79.8907 40.5 89 40.5C98.1093 40.5 106.294 43.1628 112.165 47.3928C118.037 51.6244 121.5 57.3388 121.5 63.5Z" stroke="currentColor" stroke-width="8"/>
</g>
<defs>
<clipPath id="clip0_11_13">
<rect width="100" height="100" fill="white"/>
</clipPath>
</defs>
</svg>
`;
import { App } from 'obsidian';
import * as React from 'react';

export const AppContext = React.createContext<App>(undefined);
import { App } from 'obsidian';
import * as React from 'react';
import { AppContext } from './context';

export const useApp = (): App | undefined => {
  return React.useContext(AppContext);
};

export const useInterval = (callback: () => void, delay: number) => {
  const savedCallback = React.useRef<() => void>();

  // Remember the latest callback.
  React.useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  React.useEffect(() => {
    function tick() {
      if (savedCallback.current) {
        savedCallback.current();
      }
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRetryUntilResolved(callback: any, interval = 100) {
  const [hasResolved, setHasResolved] = React.useState(false);
  useInterval(
    () => {
      const result = callback();
      if (result) {
        setHasResolved(true);
      }
    },
    hasResolved ? null : interval
  );
  return hasResolved;
}
export default useRetryUntilResolved;
import { App } from "obsidian";
import { complete, getCompleteFiles, search } from "./utils";

// TODO: make it work on browser
// import { merge } from 'embeddings-splitter';
const maxLen = 1800; // TODO: probably should be more with string length
// TODO: very experimental
export const createContext = async (question: string, token: string, vaultId: string, version: string, app: App) => {
    const [searchResponse, files] = await Promise.all([search(question, token, vaultId, version), getCompleteFiles(app)]);
    let curLen = 0;
    const returns = [];
    for (const similarity of searchResponse["similarities"]) {
        const sentence = files.find((file) => file.path === similarity["id"])?.content;
        // const nTokens = enc.encode(sentence).length;
        const nChars = sentence?.length || 0;
        // curLen += nTokens + 4;
        curLen += nChars;
        if (curLen > maxLen) {
            break;
        }
        returns.push(sentence);
    }
    return returns.join("\n\n###\n\n");
    // return output;
    // return merge(searchResponse["similarities"].map((similarity) => similarity["data"]));
}

export const generativeSearch = async (question: string, token: string, vaultId: string, version: string, app: App) => {
    const context = await createContext(question, token, vaultId, version, app);
    const newPrompt = `Answer the question based on the context below, and if the question can't be answered based on the context, say "I don't know"\n\nContext: ${context}\n\n---\n\nQuestion: ${question}\nAnswer:`;
    console.log('generativeSearch', newPrompt);
    return complete(newPrompt, token, version, {
        stream: true,
    });
};
export const prompts = [
  {
    name: 'Fix grammar',
    params: ['Language'],
    generatePrompt: (source: string, language: string) => ({
      model: 'text-davinci-003',
      prompt: `Correct this to standard ${language}:\n\n${source}`,
      temperature: 0,
      max_tokens: 60,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    }),
  },
  {
    name: 'Translate to',
    params: ['Language'],
    generatePrompt: (source: string, language: string) => ({
      model: 'text-davinci-003',
      prompt: `Translate this to ${language}:\n\n${source}`,
      temperature: 0,
      max_tokens: 60,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      stop: '\n',
      stream: true,
      logprobs: 10,
      echo: true,
      language: 'de',
    }),
  },
  {
    name: 'Extract Keywords',
    generatePrompt: (source: string) => ({
      model: 'text-davinci-003',
      prompt: `Extract keywords from this text:\n\n${source}`,
      temperature: 0.5,
      max_tokens: 60,
      top_p: 1.0,
      frequency_penalty: 0.8,
      presence_penalty: 0.0,
    }),
  },
  {
    name: 'Summarize',
    generatePrompt: (source: string) => ({
      model: 'text-davinci-003',
      prompt: `Summarize this text:\n\n${source}`,
      temperature: 0.5,
      max_tokens: 60,
      top_p: 1.0,
      frequency_penalty: 0.8,
      presence_penalty: 0.0,
    }),
  },
  {
    name: 'Explain it like I am 5',
    generatePrompt: (source: string) => ({
      model: 'text-davinci-003',
      prompt: `Explain this to a 5 year old:\n\n${source}`,
      temperature: 0.5,
      max_tokens: 60,
      top_p: 1.0,
      frequency_penalty: 0.8,
      presence_penalty: 0.0,
    }),
  },
  {
    name: 'Change tone',
    params: ['Tone'],
    generatePrompt: (source: string, tone: string) => ({
      model: 'text-davinci-003',
      prompt: `Change the tone of this text to ${tone}:\n\n${source}`,
      temperature: 0.5,
      max_tokens: 60,
      top_p: 1.0,
      frequency_penalty: 0.8,
      presence_penalty: 0.0,
    }),
  },
];
import fs from 'fs';
import path from 'path';
import { API_HOST, buildHeaders } from './constants';

export interface RequestImageCreate {
  // e.g. 512, 768, 1024
  size?: number;
  // e.g. 1, 2, 3, 4
  limit?: number;
  // e.g. "A group of Giraffes visiting a zoo on mars populated by humans"
  prompt: string;
  outputDir: string;
}

// curl -X POST "https://obsidian-ai.web.app/v1/image/create" -H "Content-Type: application/json" -d '{"size":512,"limit":1,"prompt":"A group of Giraffes visiting a zoo on mars populated by humans"}' > giraffes2.jpg

export interface ResponseImageCreate {
  imagePaths: string[];
}

/**
 * Create an image from a prompt
 * Only one image is supported at the moment
 * @param request
 * @returns
 */
export const createImage = async (
  request: RequestImageCreate,
  token: string,
  version: string
): Promise<ResponseImageCreate> => {
  const response = await fetch(`${API_HOST}/v1/image/create`, {
    method: 'POST',
    headers: buildHeaders(token, version),
    body: JSON.stringify({
      size: request.size || 512,
      limit: request.limit || 1,
      prompt: request.prompt,
    }),
  });

  if (response.status !== 200) {
    const data = await response.json();
    throw new Error(`Failed to create image: ${data.message}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  // file name is "time"_"the prompt as a writable encoded path" (only keep alphanumeric and underscores)
  const encoded = request.prompt.replace(/[^a-zA-Z0-9_]/g, '_');
  // if it's too long, truncate it
  const truncated = encoded.length > 100 ? encoded.substring(0, 100) : encoded;
  const fileName = `${Date.now()}_${truncated}`;
  const filePath = path.resolve(
    path.join(request.outputDir, `${fileName}.jpg`)
  );

  fs.writeFileSync(filePath, buffer);

  return {
    imagePaths: [filePath],
  };
};
import { Editor } from 'obsidian';
import create from 'zustand/vanilla';
import { AvaSettings } from './LegacySettings';
import { ISimilarFile, LinksStatus } from './utils';

type State = {
  linksStatus: LinksStatus;
  setLinksStatus: (status: LinksStatus) => void;
  embeds: ISimilarFile[];
  setEmbeds: (embeds: ISimilarFile[]) => void;
  setEmbedsLoading: (loading: boolean) => void;
  content: string;
  editorContext: Editor;
  appendContentToRewrite: (content: string) => void;
  replaceContentToRewrite: (content: string) => void;
  setEditorContext: (editor: Editor) => void;
  prompt: string;
  reset: () => void;
  setPrompt: (prompt: string) => void;
  settings: AvaSettings;
  loadingEmbeds: boolean;
  loadingContent: boolean;
  currentFilePath: string;
  currentFileContent: string;
  currentFileTags: string[];
  version: string;
};

export const store = create<State>((set) => ({
  version: '',
  settings: {
    useLinks: false,
    debug: false,
    token: '',
    vaultId: '',
    userId: '',
    experimental: false,
    ignoredFolders: [],
  },
  // used to dispaly loading state in the sidebar
  loadingEmbeds: false,
  // used to display loading state in the
  linksStatus: 'disabled',
  setLinksStatus: (status: LinksStatus) => {
    set(() => ({ linksStatus: status }));
  },
  // used to fire /search from react component
  currentFilePath: '',
  currentFileContent: '',
  currentFileTags: [],

  // list of embeds to display in the sidebar
  embeds: [],
  setEmbeds: (embeds: ISimilarFile[]) => {
    set(() => ({ embeds: embeds }));
  },
  setEmbedsLoading: (loading: boolean) => {
    set(() => ({ loadingEmbeds: loading }));
  },
  // used for both the rewrite and complete paragraph
  loadingContent: false,
  content: '',
  appendContentToRewrite: (content: string) => {
    console.log(content);
    set((state) => ({ content: state.content + content }));
  },
  replaceContentToRewrite: (content: string) => {
    set(() => ({ content: content }));
  },
  prompt: '',
  setPrompt: (prompt: string) => {
    set(() => ({ prompt: prompt }));
  },

  // used in all the sidebars to be able to modify the editor
  editorContext: null,
  setEditorContext: (editor: Editor) => {
    set(() => ({ editorContext: editor }));
  },

  reset: () => {
    set(() => ({ content: '', prompt: '' }));
  },
}));
export const tutorial = `
| <!-- -->    | <!-- -->    |
| ------------- | ------------- | ----- |
| Feedback     | Fill out this form to send us your feedback | https://forms.gle/RZLR4umCwCFpZcNE9 |
| Schedule a call      | Schedule a call with us    |   https://cal.com/potato/20min |
| Join the community | Join the Discord community | https://discord.gg/DYE6VFTJET |


### Find similar notes

The following will help you find notes similar to the one you're currently viewing:

1.  **Make sure you have AVA Links enabled** (you can see this in the plugin settings)
2.  Press cmd+p
3.  Type "ava link"
4.  Select "🧙 AVA - Generate Link"


### Make sense of messy information

1.  Select the text below

a messy
piece
of       èèè information
thqt contqqins in,portqnt clues
on hzo to use the plugin

3.  Press cmd+p
4.  Type "rewrite"
5.  Select "🧙 AVA - Rewrite Selection"
6.  Type "decipher"
7.  Click "Rewrite Text" to complete the transformation
8.  Now change the text instruction in Write panel to ask "remove all vowels" and press enter

### Get tags suggestions

Want to classify your notes, but can't find the right tags?

1.  Press cmd+p
2.  Type "ava tag"
3.  Select "🧙 AVA - Suggest tags"

🪄 Pro-tip: using tags before using links increases of finding similar notes


### Using complete for lazy calculation

1. Select text below

each requests costs $0.03

we had 3000 requests that means

3. Press cmd+p
4. Type "ava complete"
5. Select "🧙AVA - Complete"



### Tips & Tricks

🪄 Pro-tip: **You can use "Generate Link" as a very powerful search bar.** *If you're struggling to find a note in your vault*, 

1.  open a new file
2. type whatever information you can remember
3. Use  "Generate Link."


### Credits

Ava started as a weekend project by Ben & Louis as a mean to solve multiple problems related to having a large quantity of disparate notes. 
We are very grateful for your support and feedback.

`;
import { SSE } from 'lib/sse';
import { camelCase, isArray, isObject, transform } from 'lodash';
import { App } from 'obsidian';
import { API_HOST, buildHeaders, EMBEDBASE_URL } from './constants';
import AvaPlugin from './main';

export const camelize = (obj: Record<string, unknown>) =>
  transform(
    obj,
    (result: Record<string, unknown>, value: unknown, key: string, target) => {
      const camelKey = isArray(target) ? key : camelCase(key);
      result[camelKey] = isObject(value)
        ? camelize(value as Record<string, unknown>)
        : value;
    }
  );

// TODO: threshold configurable in settings, maybe?
const SEMANTIC_SIMILARITY_THRESHOLD = 0.35;
export interface ISimilarFile {
  score: number;
  id: string;
  data: string;
}
export interface ISearchRequest {
  query: string;
}

export interface ISearchResponse {
  query: string;
  similarities: {
    id: string;
    data: string;
    score: number;
  }[];
}

// this is so that the model can complete something at least of equal length
export const REWRITE_CHAR_LIMIT = 5800;
export const EMBED_CHAR_LIMIT = 25000;
export const search = async (
  query: string,
  token: string,
  vaultId: string,
  version: string,
): Promise<ISearchResponse> => {
  console.log('Search query:', query);
  const response = await fetch(`${EMBEDBASE_URL}/v1/${vaultId}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Client-Version': version,
    },
    body: JSON.stringify({
      query: query,
    }),
  }).then((res) => res.json());
  if (response.message) {
    throw new Error(`Failed to search: ${response.message}`);
  }
  console.log('Search response:', response);
  return response;
};

export const createSemanticLinks = async (
  title: string,
  text: string,
  token: string,
  vaultId: string,
  version: string,
) => {
  const response = await search(
    `File:\n${title}\nContent:\n${text}`,
    token,
    vaultId,
    version,
  );

  if (!response.similarities) {
    return [];
  }
  const similarities = response.similarities.filter(
    (similarity) =>
      similarity.id !== title &&
      similarity.score > SEMANTIC_SIMILARITY_THRESHOLD
  );
  return similarities;
};

export interface ICompletion {
  stream?: boolean;
  stop?: string[];
  frequencyPenalty?: number;
  maxTokens?: number;
  presencePenalty?: number;
  temperature?: number;
  topP?: number;
  model?: string;
}
export const complete = async (
  prompt: string,
  token: string,
  version: string,
  options?: ICompletion
  // TODO how to use SSE type?
): Promise<any | string> => {
  // TODO: back-end
  prompt = prompt.trim();
  const stream = options?.stream !== undefined ? options?.stream : true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = {
    frequency_penalty: options?.frequencyPenalty || 0,
    max_tokens: options?.maxTokens || 2000,
    model: options?.model || 'text-davinci-003',
    presence_penalty: options?.presencePenalty || 0,
    prompt: prompt,
    stream: stream,
    temperature: options?.temperature || 0.7,
    top_p: options?.topP !== undefined ? options?.topP : 1,
  };
  if (options?.stop) body.stop = options.stop;
  if (stream) {
    const source = new SSE(`${API_HOST}/v1/text/create`, {
      headers: buildHeaders(token, version),
      method: 'POST',
      payload: JSON.stringify(body),
    });
    return source;
  } else {
    const response = await fetch(`${API_HOST}/v1/text/create`, {
      method: 'POST',
      headers: buildHeaders(token, version),
      body: JSON.stringify(body),
    }).then((response) => response.json());
    console.log('Response:', response);
    const completion = response.choices[0].text;
    return completion;
  }
};

export const createParagraph = (
  text: string,
  token: string,
  version: string
) => {
  const prompt = `Write a paragraph about ${text}`;
  return complete(prompt, token, version);
};
export const buildRewritePrompt = (content: string, alteration: string) =>
  `You're a powerful AI editor that rewrites text exactly as humans say.\n\n Could you rewrite the following and ${alteration.trim()}:\n\n${content.trim()}`;
export const rewrite = (
  content: string,
  alteration: string,
  token: string,
  version: string
) => {
  const p = buildRewritePrompt(content, alteration);
  console.log('Prompt:', p);
  return complete(p, token, version);
};

export const deleteFromIndex = async (
  ids: string[],
  token: string,
  vaultId: string,
  version: string
) => {
  if (!token) {
    console.log('Tried to call delete without a token');
    return;
  }
  if (!vaultId) {
    console.log('Tried to call delete without a token');
    return;
  }
  console.log('deleting', ids.length, 'notes');
  const response = await fetch(`${EMBEDBASE_URL}/v1/${vaultId}`, {
    method: 'DELETE',
    headers: buildHeaders(token, version),
    body: JSON.stringify({
      ids,
    }),
  }).then((res) => res.json());
  if (response.message) {
    throw new Error(`Failed to delete: ${response.message}`);
  }
  return response;
};

interface SyncIndexRequest {
  id: string;
  data: string;
}
export const syncIndex = async (
  notes: SyncIndexRequest[],
  token: string,
  vaultId: string,
  version: string
) => {
  // stop silently not necessiraly need to span the user
  if (!token) {
    console.log('Tried to call refresh without a token');
    return;
  }
  if (!vaultId) {
    console.log('Tried to call refresh without a token');
    return;
  }
  console.log('refreshing', notes.length, 'notes');
  const response = await fetch(`${EMBEDBASE_URL}/v1/${vaultId}`, {
    method: 'POST',
    headers: buildHeaders(token, version),
    body: JSON.stringify({
      documents: notes.map((note) => ({
        id: note.id,
        data: note.data,
      })),
    }),
  }).then((res) => res.json());
  if (response.message) {
    throw new Error(response.message);
  }
  console.log('Refresh response:', response);
  return response;
};

interface IClearResponse {
  status: string;
  message?: string;
}
export const clearIndex = async (
  token: string,
  vaultId: string,
  version: string
): Promise<IClearResponse> => {
  const response = await fetch(`${EMBEDBASE_URL}/v1/${vaultId}/clear`, {
      headers: buildHeaders(token, version),
    }).then((res) => res.json());
  if (response.message) {
    throw new Error(response.message);
  }
  console.log('Clear response:', response);
  return response;
};

/**
 * v1: Simply generate tags using text completion based on the current note
 * TODO v2: pick 3 random notes and use as examples in the prompt
 * TODO v3: use /search to find similar notes and return a set of tags
 * TODO v4: use /search to find similar notes and get a set of tags and expand with text completion
 * @param noteContent
 * @param token
 * @param version
 */
export const suggestTags = async (
  noteContent: string,
  token: string,
  version: string
): Promise<any> => {
  const prompt = `Suggest a short list of NEW tags in lower case for the note content that represent the main topics (for example "#to-process #dogs ..."):\n\n${noteContent}\n\nTags:#`;
  return await complete(prompt, token, version, {
    maxTokens: 100,
    temperature: 0.5,
    topP: 0.5,
    stop: ['\n'],
    stream: true,
  });
};

// interface like
//{"status":"ok","usage":{"/v1/search":16,"/v1/search/refresh":1,"/v1/text/create":0,"/v1/search/clear":0,"/v1/image/create":6}}
export interface Usage {
  '/v1/search': number;
  '/v1/search/refresh': number;
  '/v1/text/create': number;
  '/v1/search/clear': number;
  '/v1/image/create': number;
}

// human friendly endpoint names i.e. /v1/search -> Links ...
export const ENDPOINT_NAMES: { [key: string]: string } = {
  '/v1/search': 'Links',
  '/v1/search/refresh': 'Links',
  '/v1/search/clear': 'Links',
  '/v1/text/create': 'Texts',
  '/v1/image/create': 'Images',
};

export const getUsage = async (
  token: string,
  version: string
): Promise<Usage> => {
  const response = await fetch(`${API_HOST}/v1/billing/usage`, {
    method: 'GET',
    headers: buildHeaders(token, version),
  }).then((res) => res.json()).catch(() => ({ message: 'Internal error' }));
  console.log('Usage response:', response);
  if (response.message) {
    throw new Error(response.message);
  }
  console.log('Usage response:', response);
  return response.usage;
};

/**
 * Get all Markdown files in the vault with their content and tags
 * @param {App} app
 * @returns {Promise<{path: string, content: string, tags: string[]}[]>}
 */
export const getCompleteFiles = async (app: App) => {
  const files = app.vault.getFiles().filter((file) => file.extension === 'md');
  const filesData = await Promise.all(
    files.map(async (file) => {
      const data = await app.vault.read(file);
      const cache = app.metadataCache.getFileCache(file);
      const tags = cache?.tags?.map((tag) => tag.tag) || [];
      return { path: file.path, content: data, tags };
    })
  );
  return filesData;
};

// used to uniquely identify the obsidian vault
export const getVaultId = (plugin: AvaPlugin) => {
  let vaultId = plugin.settings.vaultId;
  if (vaultId) {
    return vaultId;
    // else if should be removed by 22 of Jan 2023
  } else {
    vaultId = Math.random().toString(36).substring(2, 15);
    plugin.settings.vaultId = vaultId;
    plugin.saveSettings();
    return vaultId;
  }
};

const baseURL = 'https://app.anotherai.co';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const openApp = async (vaultId: string) => {
  window.open(`${baseURL}/signup?token=${vaultId}&service=obsidian`);
};

export async function getLinkData(vaultId: string) {
  const response = await fetch(
    `https://auth-c6txy76x2q-uc.a.run.app?token=${vaultId}&service=obsidian`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  const data: LinkData = await response.json();
  return data;
}

interface LinkData {
  userId: string;
  token: string;
}

export type LinksStatus = 'disabled' | 'loading' | 'running' | 'error';
