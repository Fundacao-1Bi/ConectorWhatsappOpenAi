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

### Runtime e validação

Lambda, bundle, testes e workflows usam Node.js 22 (`.nvmrc`).
O runtime `nodejs22.x` é suportado pela AWS sobre Amazon Linux 2023:
[matriz oficial de runtimes](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html).
O SDK AWS usado pelo código é incluído no bundle para não depender da versão
pré-instalada no runtime.

```sh
nvm use
npm ci --ignore-scripts
npm run validate
```

A validação executa testes com dependências externas simuladas, typecheck, bundle,
ESLint e empacotamento Serverless offline. O último usa valores fictícios para as
variáveis de ambiente, não consulta SSM e verifica o runtime e a inicialização dos
dois handlers do ZIP em Node22. Não envia mensagens à Meta/OpenAI nem acessa dados AWS.

O Serverless está fixado em 3.40.0 no lockfile. Seu schema antecede Node22; o plugin
local `plugins/node22-runtime.js` acrescenta somente `nodejs22.x` ao enum de runtimes,
com `configValidationMode: error` preservado. A validação também comprova que um
runtime inválido continua sendo rejeitado. Esse ajuste pode ser removido em uma
futura migração do framework com suporte nativo ao schema Node22.

O workflow de PR executa somente validações. O pipeline de pushes para
`main`/`develop` repete as mesmas validações antes de obter credenciais e implantar.
Publicar uma branch `codex/*` e abrir um PR não aciona deploy. O merge para `main`
implanta em produção; o resultado do deploy e a integração real com a Meta devem
ser verificados separadamente.
