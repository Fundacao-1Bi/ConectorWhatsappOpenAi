// Keep database identities separate from outbound Graph API addressing.
export type WhatsAppRecipient = string | { userId: string };

const isBsuid = (value: string) => /^[A-Z]{2}\.(?:ENT\.)?[A-Za-z0-9]{1,128}$/.test(value);

type Contact = { wa_id?: string; user_id?: string; profile?: { name?: string } };
type MessageIdentity = { from?: string; from_user_id?: string };

export const recipientFields = (recipient: WhatsAppRecipient) => {
  if (typeof recipient === 'string') {
    if (!/^\d+$/.test(recipient)) throw new Error('WhatsApp phone recipient must contain only digits');
    return { to: recipient };
  }
  if (!isBsuid(recipient.userId)) throw new Error('WhatsApp BSUID recipient is invalid');
  return { recipient: recipient.userId };
};

export const resolveMessageIdentity = (message: MessageIdentity, contacts: Contact[] = []) => {
  const phone = message.from && /^\d+$/.test(message.from) ? message.from : undefined;
  const fromBsuid = !phone ? message.from : undefined;
  if (fromBsuid && message.from_user_id && fromBsuid !== message.from_user_id) {
    throw new Error('WhatsApp message has conflicting BSUID sender identities');
  }
  const userId = message.from_user_id || fromBsuid;
  if (!phone && !userId) throw new Error('WhatsApp message has no sender identity');
  if (userId && !isBsuid(userId)) throw new Error('WhatsApp message has invalid BSUID');

  const matchingContacts = contacts.filter(contact =>
    (Boolean(phone) && contact.wa_id === phone) ||
    (Boolean(userId) && contact.user_id === userId)
  );
  if (matchingContacts.length > 1) throw new Error('WhatsApp message has ambiguous contacts');
  const contact = matchingContacts[0];
  if (contact && ((phone && contact.wa_id && contact.wa_id !== phone) ||
    (userId && contact.user_id && contact.user_id !== userId))) {
    throw new Error('WhatsApp message and contact identities conflict');
  }

  return {
    // Retain existing phone keys; a BSUID alone must never infer a phone or merge a thread.
    id: phone || userId!,
    name: contact?.profile?.name || 'Usuário',
    recipient: phone || { userId: userId! },
  };
};
