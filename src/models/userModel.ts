import dynamoDb from './dynamodb/connection';
import { UserSchema } from './dynamodb/schemas/userSchema';

export const getUser = async (userId: string): Promise<UserSchema> => {
  const params: any = {
    TableName: process.env.USER_TABLE,
    KeyConditionExpression: '#id = :destination',
    ExpressionAttributeNames: {
      '#id': 'id',
    },
    ExpressionAttributeValues: {
      ':destination': userId,
    },
  };
  const userRequest: any = await dynamoDb.query(params);
  if (userRequest.Count == 0) {
    return undefined;
  } else {
    return userRequest.Items[0];
  }
};

export const setNextStep = async (userId: string, nextStep: any) => {
  await saveToUser(userId, 'step', nextStep);
};

export const saveEnccejaInscricao = async (userId: string, inscricaoData: any) => {
  const {
    numeroInscricao,
    situacaoInscricao,
    anoEncceja,
    cpf,
    nomeCompleto,
    dataDeNascimento,
    sexo,
    corOuRaca,
    cep,
    endereco,
    numero,
    complemento,
    bairro,
    municipio,
    uf,
    celular,
    email,
    ufECidadeProva,
    instituicaoCertificadora,
    nivelEnsino,
    provas,
  } = inscricaoData;

  const updateUserParams: any = {
    TableName: process.env.USER_TABLE,
    Key: {
      id: userId,
    },
    UpdateExpression:
      'SET docInscricao_numeroInscricao = :numeroInscricao, docInscricao_situacaoInscricao = :situacaoInscricao, docInscricao_anoEncceja = :anoEncceja, docInscricao_cpf = :cpf, docInscricao_nomeCompleto = :nomeCompleto, docInscricao_dataDeNascimento = :dataDeNascimento, docInscricao_sexo = :sexo, docInscricao_corOuRaca = :corOuRaca, docInscricao_cep = :cep, docInscricao_endereco = :endereco, docInscricao_numero = :numero, docInscricao_complemento = :complemento, docInscricao_bairro = :bairro, docInscricao_municipio = :municipio, docInscricao_uf = :uf, docInscricao_celular = :celular, docInscricao_email = :email, docInscricao_ufECidadeProva = :ufECidadeProva, docInscricao_instituicaoCertificadora = :instituicaoCertificadora, docInscricao_nivelEnsino = :nivelEnsino, docInscricao_provas = :provas',
    ExpressionAttributeValues: {
      ':numeroInscricao': numeroInscricao,
      ':situacaoInscricao': situacaoInscricao,
      ':anoEncceja': anoEncceja,
      ':cpf': cpf,
      ':nomeCompleto': nomeCompleto,
      ':dataDeNascimento': dataDeNascimento,
      ':sexo': sexo,
      ':corOuRaca': corOuRaca,
      ':cep': cep,
      ':endereco': endereco,
      ':numero': numero,
      ':complemento': complemento,
      ':bairro': bairro,
      ':municipio': municipio,
      ':uf': uf,
      ':celular': celular,
      ':email': email,
      ':ufECidadeProva': ufECidadeProva,
      ':instituicaoCertificadora': instituicaoCertificadora,
      ':nivelEnsino': nivelEnsino,
      ':provas': provas,
    },
  };

  await dynamoDb.update(updateUserParams);
};

export const saveToUser = async (userId: string, key: string, value: any) => {
  const updateUserParams: any = {
    TableName: process.env.USER_TABLE,
    Key: {
      id: userId,
    },
    UpdateExpression: 'SET #k = :v, updatedAt = :t',
    ExpressionAttributeNames: { '#k': key },
    ExpressionAttributeValues: { ':v': value, ':t': Date.now().toString() },
  };

  await dynamoDb.update(updateUserParams);
};

export const createUser = (userId: string, name: string, message: string) => {
  const userInfo: any = {
    TableName: process.env.USER_TABLE,
    Item: {
      id: userId,
      name: name,
      step: 'PRIMEIRA_MENSAGEM',
      firstUserMessage: message,
      createdAt: Date.now().toString(),
    },
    ReturnValues: 'ALL_OLD',
  };

  return dynamoDb.put(userInfo);
};

export const deleteUser = async (userId: string) => {
  const deleteUserParams: any = {
    TableName: process.env.USER_TABLE,
    Key: {
      id: userId,
    },
  };

  await dynamoDb.delete(deleteUserParams);
};

export const saveReminder = async (userId: string, type: string, ttl: number) => {
  const reminderInfo: any = {
    TableName: process.env.REMINDER_TABLE,
    Item: {
      id: userId,
      type,
      ttl,
    },
    ReturnValues: 'ALL_OLD',
  };

  return await dynamoDb.put(reminderInfo);
};
