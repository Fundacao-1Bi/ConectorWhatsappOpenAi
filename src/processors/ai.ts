import {
  createMessage,
  createThread,
  getRunStatus,
  listMessagesByThread,
  runAssistant,
} from '@/services/OpenAI';
import { sleep } from '@/utils/sleep';
import { UserSchema } from '@/models/dynamodb/schemas/userSchema';
import { saveToUser } from '@/models/userModel';
import { sendText } from '@/services/sendToZap';

const chooseMessage = (thread: any) => {
  const messageObj = thread.data.find((msgObj: any) => (msgObj.role = 'assistant'));
  const message = messageObj?.content?.find((msgContent: any) => msgContent.type == 'text');
  return message?.text?.value;
};

const markdownToZapCorrections = (text: string) => {
  return text.replace(/\*\*/g, '*').replace(/__/g, '_').replace(/### /g, '').replace(/\\/g, '');
};

const processAiRun = async ({
  userId,
  runId,
  threadId,
}: {
  userId: string;
  runId: string;
  threadId: string;
}) => {
  const { status } = await getRunStatus(threadId, runId);

  if (status == 'completed') {
    const thread = await listMessagesByThread(threadId);
    const message = chooseMessage(thread);
    if (message) {
      const zapFormattedMessage = markdownToZapCorrections(message);
      await saveToUser(userId, 'AILastMesage', zapFormattedMessage);
      await sendText(userId, zapFormattedMessage);
      return true;
    }
  }
  return false;
};

export const useAI = async (user: UserSchema, text: string) => {
  const threadId = user?.threadId || (await createThread());
  await createMessage(threadId, text);
  const run = await runAssistant(threadId);
  const userAiUsageCount = user.aiUsageCount || 0;
  if (!user.threadId) {
    await saveToUser(user.id, 'threadId', threadId);
  }
  await saveToUser(user.id, 'aiUsageCount', userAiUsageCount + 1);

  const MAX_POLLING_RETRIES = 200;
  for (let i = 0; i < MAX_POLLING_RETRIES; i++) {
    const AiSentWithSuccess = await processAiRun({ userId: user.id, runId: run.id, threadId });
    if (AiSentWithSuccess) {
      break;
    }
    await sleep(1000);
  }
};
