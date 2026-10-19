import { createUser, getUser, saveToUser } from '@/models/userModel';
import { sendText } from '@/services/sendToZap';
import { useAI } from './ai';
import { resolveMessageIdentity } from '@/services/whatsappIdentity';

const processMessages = async ({ message, contacts }: any) => {
  const { text, interactive, type } = message;
  const { id: userId, name, recipient } = resolveMessageIdentity(message, contacts);
  if (type !== 'text' && type !== 'interactive' && type !== 'document') {
    await sendText(
      recipient,
      `😕 Desculpe, ainda não consigo entender arquivos de áudio, vídeo ou imagens, mas podemos *conversar por texto*.

Basta escrever o que você deseja ✍️`
    );
    console.log('Message type not supported', type);
    return;
  }

  const textBody = text?.body;
  const btnTextBody = interactive?.button_reply?.title;
  const userTextMessage = textBody || btnTextBody;
  const user = await getUser(userId);
  if (!user) {
    console.log(`User not found, creating user: ${userId} - ${name} - ${userTextMessage}`);
    await createUser(userId, name, userTextMessage);
    return await useAI({ id: userId, name }, userTextMessage, recipient);
  } else {
    console.log(`User found: ${user} - ${userTextMessage}`);
    await saveToUser(userId, 'userLastMessage', userTextMessage);
    return await useAI(user, userTextMessage, recipient);
  }
};

const processValue = async (value: { messages: any[]; contacts: any }, businessId: string) => {
  const { contacts, messages } = value;
  if (messages) {
    await Promise.all(
      messages.map(async (message) => {
        await processMessages({ message, contacts });
      })
    );
  }
};

export const processChanges = async (
  changes: { field: string; value: any }[],
  businessId: string
) => {
  for (const change of changes) {
    const { field, value } = change;
    if (value && field === 'messages') {
      console.log('value', value);
      await processValue(value, businessId);
    }
  }
};
