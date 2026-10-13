jest.mock('@/models/userModel', () => ({ getUser: jest.fn(), createUser: jest.fn(), saveToUser: jest.fn() }));
jest.mock('@/services/sendToZap', () => ({ sendText: jest.fn() }));
jest.mock('../src/processors/ai', () => ({ useAI: jest.fn() }));
const { processChanges } = require('../src/processors/slicers');
const { getUser, createUser, saveToUser } = require('@/models/userModel');
const { useAI } = require('../src/processors/ai');
const { sendText } = require('@/services/sendToZap');
const run = (message, contacts) => processChanges([{ field: 'messages', value: { messages: [message], contacts } }], 'business');
beforeEach(() => { jest.clearAllMocks(); jest.spyOn(console, 'log').mockImplementation(() => {}); getUser.mockResolvedValue(undefined); });
afterEach(() => jest.restoreAllMocks());

it('creates a BSUID-only user with the matched contact and passes an explicit recipient to AI', async () => {
  await run({ from_user_id: 'BR.AbCd123', type: 'text', text: { body: 'oi' } }, [{ profile: { name: 'Wrong' } }, { user_id: 'BR.AbCd123', profile: { name: 'Maria' } }]);
  expect(getUser).toHaveBeenCalledWith('BR.AbCd123');
  expect(createUser).toHaveBeenCalledWith('BR.AbCd123', 'Maria', 'oi');
  expect(useAI).toHaveBeenCalledWith({ id: 'BR.AbCd123', name: 'Maria' }, 'oi', { userId: 'BR.AbCd123' });
});

it('keeps the legacy phone key and existing AI thread when both identities are supplied', async () => {
  const user = { id: '5511999999999', name: 'Maria', threadId: 'thread-existing' };
  getUser.mockResolvedValue(user);
  await run({ from: user.id, from_user_id: 'BR.AbCd123', type: 'interactive', interactive: { button_reply: { title: 'Sim' } } }, [{ wa_id: user.id, user_id: 'BR.AbCd123', profile: { name: 'Maria' } }]);
  expect(getUser).toHaveBeenCalledWith(user.id);
  expect(createUser).not.toHaveBeenCalled();
  expect(saveToUser).toHaveBeenCalledWith(user.id, 'userLastMessage', 'Sim');
  expect(useAI).toHaveBeenCalledWith(user, 'Sim', user.id);
});

it('preserves opaque from identifiers and handles omitted contacts/profile', async () => {
  await run({ from: 'BR.AbCd123', type: 'text', text: { body: 'oi' } });
  expect(createUser).toHaveBeenCalledWith('BR.AbCd123', 'Usuário', 'oi');
  expect(useAI).toHaveBeenCalledWith({ id: 'BR.AbCd123', name: 'Usuário' }, 'oi', { userId: 'BR.AbCd123' });
});

it('replies to unsupported media using the BSUID', async () => {
  await run({ from_user_id: 'BR.AbCd123', type: 'audio' });
  expect(sendText).toHaveBeenCalledWith({ userId: 'BR.AbCd123' }, expect.any(String));
  expect(getUser).not.toHaveBeenCalled();
});

it.each([
  [{ type: 'text' }, []],
  [{ from_user_id: 'BR.AbCd123', type: 'text' }, [{ user_id: 'BR.AbCd123' }, { user_id: 'BR.AbCd123' }]],
  [{ from: '5511999999999', from_user_id: 'BR.AbCd123', type: 'text' }, [{ wa_id: '5511999999999', user_id: 'BR.Other' }]],
])('fails closed for missing, ambiguous or conflicting identities', async (message, contacts) => {
  await expect(run(message, contacts)).rejects.toThrow('WhatsApp message');
  expect(getUser).not.toHaveBeenCalled();
  expect(sendText).not.toHaveBeenCalled();
});

it('rejects malformed non-phone from fields instead of deriving a phone', async () => {
  await expect(run({ from: 'opaque-but-invalid', type: 'text' })).rejects.toThrow('invalid BSUID');
  expect(getUser).not.toHaveBeenCalled();
});

it('rejects divergent BSUID sender fields before persistence even without contacts', async () => {
  await expect(run({ from: 'BR.A', from_user_id: 'BR.B', type: 'text', text: { body: 'oi' } })).rejects.toThrow('conflicting BSUID sender identities');
  expect(getUser).not.toHaveBeenCalled();
  expect(createUser).not.toHaveBeenCalled();
  expect(useAI).not.toHaveBeenCalled();
  expect(sendText).not.toHaveBeenCalled();
});
