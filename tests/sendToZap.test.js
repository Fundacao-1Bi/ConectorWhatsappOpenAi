jest.mock('axios', () => ({ post: jest.fn() }));
jest.mock('@/utils/sleep', () => ({ sleep: jest.fn() }));
process.env.META_NUMBER_ID = 'number-id';
const axios = require('axios');
const { sendText, sendTemplate, sendButtons } = require('../src/services/sendToZap');

beforeEach(() => { jest.clearAllMocks(); axios.post.mockResolvedValue({ data: { messages: [{ id: 'wamid.test' }] } }); jest.spyOn(console, 'log').mockImplementation(() => {}); });
afterEach(() => jest.restoreAllMocks());

it.each(['5511999999999', { userId: 'BR.AbCd123' }])('sends text, template and buttons using v26 and correct recipient: %p', async recipient => {
  await sendText(recipient, 'Olá');
  await sendTemplate(recipient, 'welcome');
  await sendButtons(recipient, { text: 'Escolha', buttonTexts: ['Sim', 'Uma opção com mais de vinte caracteres'] });
  const address = typeof recipient === 'string' ? { to: recipient } : { recipient: recipient.userId };
  const oppositeField = typeof recipient === 'string' ? 'recipient' : 'to';
  expect(axios.post).toHaveBeenCalledTimes(3);
  for (const [url, body] of axios.post.mock.calls) {
    expect(url).toBe('https://graph.facebook.com/v26.0/number-id/messages');
    expect(body).toMatchObject({ messaging_product: 'whatsapp', recipient_type: 'individual', ...address });
    expect(body).not.toHaveProperty(oppositeField);
  }
  expect(axios.post.mock.calls[0][1].text).toEqual({ preview_url: true, body: 'Olá' });
  expect(axios.post.mock.calls[1][1].template).toEqual({ name: 'welcome', language: { code: 'pt_BR' } });
  expect(axios.post.mock.calls[2][1].interactive.action.buttons[1].reply.title).toHaveLength(20);
});

it('preserves the BSUID address in every text fragment and retry', async () => {
  axios.post.mockRejectedValueOnce(new Error('temporary'));
  const text = 'a'.repeat(4090) + 'b'.repeat(4090) + 'end';
  await sendText({ userId: 'BR.AbCd123' }, text);
  expect(axios.post).toHaveBeenCalledTimes(4);
  const bodies = axios.post.mock.calls.map(([, body]) => body);
  expect(bodies[0]).toEqual(bodies[1]);
  expect(bodies.slice(1).map(body => body.text.body).join('')).toBe(text);
  for (const body of bodies) { expect(body.recipient).toBe('BR.AbCd123'); expect(body).not.toHaveProperty('to'); }
});

it('uses BSUID addressing for the long button text fallback and interactive response', async () => {
  await sendButtons({ userId: 'BR.AbCd123' }, { text: 'a'.repeat(1100), buttonTexts: ['Sim'] });
  expect(axios.post).toHaveBeenCalledTimes(2);
  expect(axios.post.mock.calls[0][1]).toMatchObject({ recipient: 'BR.AbCd123', type: 'text' });
  expect(axios.post.mock.calls[1][1]).toMatchObject({ recipient: 'BR.AbCd123', interactive: { body: { text: 'Opções:' } } });
});

it('rejects opaque identifiers in the phone field before making an HTTP request', async () => {
  await expect(sendText('BR.AbCd123', 'oi')).rejects.toThrow('phone recipient');
  expect(axios.post).not.toHaveBeenCalled();
});

it('rejects malformed BSUID recipients before making an HTTP request', async () => {
  await expect(sendText({ userId: 'not-a-bsuid' }, 'oi')).rejects.toThrow('BSUID recipient');
  expect(axios.post).not.toHaveBeenCalled();
});
