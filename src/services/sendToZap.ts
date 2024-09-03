import { sleep } from '@/utils/sleep';
import axios from 'axios';

const numberId = process.env.META_NUMBER_ID;

const META_BASE_URL = `https://graph.facebook.com/v19.0/${numberId}/messages`;

const config = {
  headers: {
    'content-type': 'application/json',
    Authorization: 'Bearer ' + process.env.META_ACCESS_TOKEN,
  },
};

export const sendTemplate = async (to: string, templateName: string) => {
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    preview_url: true,
    template: { name: templateName, language: { code: 'pt_BR' } },
  };
  console.log(`sending template to ${to}: ${templateName}`);
  try {
    const response = await axios.post(META_BASE_URL, body, config);
    console.log('meta answer', response.data);
  } catch (err) {
    console.log('meta error, retrying...', err, err?.response?.data?.error);
    await sleep(5000);
    const response = await axios.post(META_BASE_URL, body, config);
    console.log('meta answer at retry', response.data);
  }
};

export const sendText = async (to: string, text: string) => {
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'text',
    text: {
      preview_url: true,
      body: text.substring(0, 4090),
    },
  };
  console.log(`sending message to ${to}: ${text}`);
  try {
    const response = await axios.post(META_BASE_URL, body, config);
    console.log('meta answer', response.data);
  } catch (err) {
    console.log('meta error, retrying...', err, err?.response?.data?.error);
    await sleep(5000);
    const response = await axios.post(META_BASE_URL, body, config);
    console.log('meta answer at retry', response.data);
  }
  if (text.length > 4090) {
    await sendText(to, text.substring(4090));
  }
};

export const sendButtons = async (
  to: string,
  {
    text,
    buttonTexts,
  }: {
    text: string;
    buttonTexts: string[];
  }
) => {
  let btnTitleText = text;
  if (text.length > 1023) {
    await sendText(to, text);
    btnTitleText = 'Opções:';
  }
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: btnTitleText,
      },
      action: {
        buttons: buttonTexts.map((buttonText) => ({
          type: 'reply',
          reply: {
            id: buttonText.slice(0, 20),
            title: buttonText.slice(0, 20),
          },
        })),
      },
    },
  };
  console.log(`sending message to ${to}: ${text} - ${buttonTexts}`);
  try {
    const response = await axios.post(META_BASE_URL, body, config);
    console.log('meta answer', response.data);
  } catch (err) {
    console.log('meta error, retrying...', err, err?.response?.data?.error);
    await sleep(5000);
    const response = await axios.post(META_BASE_URL, body, config);
    console.log('meta answer at retry', response.data);
  }
};
