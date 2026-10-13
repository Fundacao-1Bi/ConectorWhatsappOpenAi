# ConectorWhatsappOpenAi
Conector Open Source do Whatsapp Cloud Api com a Assistants API da Open AI, feito com ♡ pelo time do AprendiZAP da Fundação 1Bi.

### Graph API v26.0 e identidades do WhatsApp

O envio de mensagens usa `https://graph.facebook.com/v26.0/{META_NUMBER_ID}/messages`.
Textos, templates comuns e botões aceitam telefone (`to`) ou BSUID (`recipient`).
BSUIDs devem permanecer inteiros; não normalize ou remova o prefixo de país.
Templates de autenticação precisam de telefone e não podem ser enviados ao BSUID.
Referência: [Business-scoped user IDs](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids/).

O processamento recebe `from_user_id` e `contacts[].user_id` sem exigir `from`,
`wa_id` ou `profile`. Quando o telefone está presente, a chave histórica do usuário
continua sendo o telefone. Sem telefone, a chave é o BSUID e a resposta usa
`recipient`. Contatos sem identificador não são associados por igualdade de campos
ausentes; identidades conflitantes ou ambíguas são rejeitadas.

Esta alteração não associa automaticamente registros antigos por telefone a
registros por BSUID e não migra threads entre identidades. Essa associação exige
um fluxo de identidade autenticado e uma migração específica. Até então, um usuário
que passar a ocultar o telefone pode começar uma nova thread sob o BSUID.

Validação local, sem envio à Meta, OpenAI ou AWS:

```sh
npm ci --ignore-scripts
npm test
npm run typecheck
npm run build
```

Os testes simulam as dependências externas e cobrem o contrato de endereçamento,
fragmentação, retries, botões, templates, seleção de contato e resposta da IA.
O repositório ainda declara runtime Lambda Node.js 16 em `serverless.yml`, que
precisa ser atualizado e validado em uma manutenção separada antes de uma nova
implantação. O novo workflow de PR executa somente validações. O pipeline Serverless legado
executa deploy em pushes para `main`/`develop`; publicar uma branch `codex/*` e
abrir um PR não aciona esse deploy.
