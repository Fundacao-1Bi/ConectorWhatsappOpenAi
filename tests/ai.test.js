jest.mock('@/services/OpenAI', () => ({ createMessage: jest.fn(), createThread: jest.fn(), getRunStatus: jest.fn(), listMessagesByThread: jest.fn(), runAssistant: jest.fn() }));
jest.mock('@/utils/sleep', () => ({ sleep: jest.fn() }));
jest.mock('@/models/userModel', () => ({ saveToUser: jest.fn() }));
jest.mock('@/services/sendToZap', () => ({ sendText: jest.fn() }));
const api = require('@/services/OpenAI');
const { saveToUser } = require('@/models/userModel');
const { sendText } = require('@/services/sendToZap');
const { useAI } = require('../src/processors/ai');

it('keeps AI persistence keyed to the user while replying to the explicit BSUID recipient', async () => {
  api.runAssistant.mockResolvedValue({ id: 'run-1' });
  api.getRunStatus.mockResolvedValue({ status: 'completed' });
  api.listMessagesByThread.mockResolvedValue({ data: [{ role: 'assistant', content: [{ type: 'text', text: { value: '**Olá**' } }] }] });
  const user = { id: 'BR.AbCd123', threadId: 'thread-existing', aiUsageCount: 2 };
  await useAI(user, 'oi', { userId: 'BR.AbCd123' });
  expect(api.createThread).not.toHaveBeenCalled();
  expect(api.createMessage).toHaveBeenCalledWith('thread-existing', 'oi');
  expect(saveToUser).toHaveBeenCalledWith(user.id, 'AILastMesage', '*Olá*');
  expect(sendText).toHaveBeenCalledWith({ userId: 'BR.AbCd123' }, '*Olá*');
});
