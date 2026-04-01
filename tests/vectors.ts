// tests/vectors.ts

export interface FileTestVector {
  filename: string;
  mimetype: string;
  charset?: string;
  url?: string;
  mustInclude: string[];
  mustNotInclude: string[];
}

export const GENERAL_TEST_VECTORS: FileTestVector[] = [
  {
    filename: 'test.docx',
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    mustInclude: [
      '314b0a30-5b04-470b-b9f7-eed2c2bec74a',
      '49e168b7-d2ae-407f-a055-2167576f39a1',
      '## d666f1f7-46cb-42bd-9a39-9a39cf2a509f',
      '# Abstract',
      '# Introduction',
      'AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation',
      'data:image/png;base64...',
    ],
    mustNotInclude: [
      'data:image/png;base64,iVBORw0KGgoAAAANSU',
    ],
  },
  {
    filename: 'test.xlsx',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    mustInclude: [
      '## 09060124-b5e7-4717-9d07-3c046eb',
      '6ff4173b-42a5-4784-9b19-f49caff4d93d',
      'affc7dad-52dc-4b98-9b5d-51e65d8a8ad0',
    ],
    mustNotInclude: [],
  },
  {
    filename: 'test.pptx',
    mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    mustInclude: [
      '2cdda5c8-e50e-4db4-b5f0-9722a649f455',
      '04191ea8-5c73-4215-a1d3-1cfb43aaaf12',
      '44bf7d06-5e7a-4a40-a2e1-a2e42ef28c8a',
      '1b92870d-e3b5-4e65-8153-919f4ff45592',
      'AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation',
      'a3f6004b-6f4f-4ea8-bee3-3741f4dc385f',
      '2003',
      '![This phrase of the caption is Human-written.](Picture4.jpg)',
    ],
    mustNotInclude: [
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQE',
    ],
  },
  {
    filename: 'test_outlook_msg.msg',
    mimetype: 'application/vnd.ms-outlook',
    mustInclude: [
      '# Email Message',
      '**From:** test.sender@example.com',
      '**To:** test.recipient@example.com',
      '**Subject:** Test Email Message',
      '## Content',
      'This is the body of the test email message',
    ],
    mustNotInclude: [],
  },
  {
    filename: 'test.pdf',
    mimetype: 'application/pdf',
    mustInclude: [
      'While there is contemporaneous exploration of multi-agent approaches',
    ],
    mustNotInclude: [],
  },
  {
    filename: 'test_blog.html',
    mimetype: 'text/html',
    charset: 'utf-8',
    url: 'https://microsoft.github.io/autogen/blog/2023/04/21/LLM-tuning-math',
    mustInclude: [
      'Large language models (LLMs) are powerful tools that can generate natural language texts for various applications, such as chatbots, summarization, translation, and more. GPT-4 is currently the state of the art LLM in the world. Is model selection irrelevant? What about inference parameters?',
      'an example where high cost can easily prevent a generic complex',
    ],
    mustNotInclude: [],
  },
  {
    filename: 'test_mskanji.csv',
    mimetype: 'text/csv',
    charset: 'cp932',
    mustInclude: [
      '| 名前 | 年齢 | 住所 |',
      '| --- | --- | --- |',
      '| 佐藤太郎 | 30 | 東京 |',
      '| 三木英子 | 25 | 大阪 |',
      '| 髙橋淳 | 35 | 名古屋 |',
    ],
    mustNotInclude: [],
  },
  {
    filename: 'test.json',
    mimetype: 'application/json',
    charset: 'ascii',
    mustInclude: [
      '5b64c88c-b3c3-4510-bcb8-da0b200602d8',
      '9700dc99-6685-40b4-9a3a-5e406dcb37f3',
    ],
    mustNotInclude: [],
  },
  {
    filename: 'test_rss.xml',
    mimetype: 'text/xml',
    charset: 'utf-8',
    mustInclude: [
      '# The Official Microsoft Blog',
      '## Ignite 2024: Why nearly 70% of the Fortune 500 now use Microsoft 365 Copilot',
      'In the case of AI, it is absolutely true that the industry is moving incredibly fast',
    ],
    mustNotInclude: [
      '<rss',
      '<feed',
    ],
  },
  {
    filename: 'test_notebook.ipynb',
    mimetype: 'application/json',
    charset: 'ascii',
    mustInclude: [
      '# Test Notebook',
      '```python',
      'print("markitdown")',
      '```',
      '## Code Cell Below',
    ],
    mustNotInclude: [
      'nbformat',
      'nbformat_minor',
    ],
  },
  {
    filename: 'test_files.zip',
    mimetype: 'application/zip',
    mustInclude: [
      '314b0a30-5b04-470b-b9f7-eed2c2bec74a',
      '49e168b7-d2ae-407f-a055-2167576f39a1',
      '## d666f1f7-46cb-42bd-9a39-9a39cf2a509f',
      '# Abstract',
      '# Introduction',
      'AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation',
      '2cdda5c8-e50e-4db4-b5f0-9722a649f455',
      '04191ea8-5c73-4215-a1d3-1cfb43aaaf12',
      '44bf7d06-5e7a-4a40-a2e1-a2e42ef28c8a',
      '1b92870d-e3b5-4e65-8153-919f4ff45592',
      '## 09060124-b5e7-4717-9d07-3c046eb',
      '6ff4173b-42a5-4784-9b19-f49caff4d93d',
      'affc7dad-52dc-4b98-9b5d-51e65d8a8ad0',
    ],
    mustNotInclude: [],
  },
  {
    filename: 'test.epub',
    mimetype: 'application/epub+zip',
    mustInclude: [
      '**Authors:** Test Author',
      'A test EPUB document for MarkItDown testing',
      '# Chapter 1: Test Content',
      'This is a **test** paragraph with some formatting',
      'A bullet point',
      'Another point',
      '# Chapter 2: More Content',
      '_different_ style',
      '> This is a blockquote for testing',
    ],
    mustNotInclude: [],
  },
];

export const DATA_URI_TEST_VECTORS: FileTestVector[] = [
  {
    filename: 'test.docx',
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    mustInclude: [
      '314b0a30-5b04-470b-b9f7-eed2c2bec74a',
      '49e168b7-d2ae-407f-a055-2167576f39a1',
      '## d666f1f7-46cb-42bd-9a39-9a39cf2a509f',
      '# Abstract',
      '# Introduction',
      'AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation',
      'data:image/png;base64,iVBORw0KGgoAAAANSU',
    ],
    mustNotInclude: [
      'data:image/png;base64...',
    ],
  },
  {
    filename: 'test.pptx',
    mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    mustInclude: [
      '2cdda5c8-e50e-4db4-b5f0-9722a649f455',
      '04191ea8-5c73-4215-a1d3-1cfb43aaaf12',
      '44bf7d06-5e7a-4a40-a2e1-a2e42ef28c8a',
      '1b92870d-e3b5-4e65-8153-919f4ff45592',
      'AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation',
      'a3f6004b-6f4f-4ea8-bee3-3741f4dc385f',
      '2003',
      '![This phrase of the caption is Human-written.]',
      // Note: TS port does not yet inline base64 data URIs for PPTX images.
      // The Python original does, but the TS PptxConverter always uses filename refs.
    ],
    mustNotInclude: [],
  },
];
