import OpenAI from 'openai';

const openAi = new OpenAI({ apiKey: process.env.OPENAI_TOKEN });
const assistantID = process.env.OPENAI_ASSISTANT_ID;

const runAssistant = async (threadId: any) => {
  const run = await openAi.beta.threads.runs.create(threadId, {
    assistant_id: assistantID,
  });
  return run;
};

const createMessage = async (threadId: any, text: string) => {
  const messageAPI = await openAi.beta.threads.messages.create(threadId, {
    role: 'user',
    content: text,
  });
  return messageAPI;
};

const createThread = async () => {
  const thread = await openAi.beta.threads.create();
  return thread.id;
};

const getRunStatus = async (threadId: any, runId: any) => {
  const run = await openAi.beta.threads.runs.retrieve(threadId, runId);

  return run;
};
const listMessagesByThread = async (threadId: any) => {
  const threadMessages = await openAi.beta.threads.messages.list(threadId);

  return threadMessages;
};

export { createThread, createMessage, runAssistant, getRunStatus, listMessagesByThread };
