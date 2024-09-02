import { createUser, getUser, saveToUser } from '@/models/userModel';
import { sendText } from '@/services/sendToZap';
import { useAI } from './ai';

const processMessages = async ({ message, contacts }: any) => {
  const { from, text, interactive, type } = message;
  const userId = from;
  if (type !== 'text' && type !== 'interactive' && type !== 'document') {
    await sendText(
      userId,
      `😕 Desculpe, ainda não consigo entender arquivos de áudio, vídeo ou imagens, mas podemos *conversar por texto*.

Basta escrever o que você deseja ✍️`
    );
    console.log('Message type not supported', type);
    return;
  }

  const contact = contacts.find((contact: any) => contact.wa_id === from);
  const {
    profile: { name },
  } = contact;
  const textBody = text?.body;
  const btnTextBody = interactive?.button_reply?.title;
  const userTextMessage = textBody || btnTextBody;
  const user = await getUser(userId);
  if (!user) {
    console.log(`User not found, creating user: ${userId} - ${name} - ${userTextMessage}`);
    await createUser(userId, name, userTextMessage);
    return await useAI({ id: userId, name }, userTextMessage);
  } else {
    console.log(`User found: ${user} - ${userTextMessage}`);
    await saveToUser(userId, 'userLastMessage', userTextMessage);
    return await useAI(user, userTextMessage);
  }
};

const processValue = async (value: { messages: any[]; contacts: any }, businessId: string) => {
  const { contacts, messages } = value;
  if (messages) {
    for (const message of messages) {
      await processMessages({ message, contacts });
    }
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
