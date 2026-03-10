import { AppError } from './errors';
import type { BackendEnv } from '../worker-types';

const sanitizeFileName = (fileName: string) => {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, '-');
};

export const storeStrategyArtifact = async (input: {
  env: BackendEnv;
  strategyId: string;
  version: string;
  fileName: string;
  contentBase64: string;
  contentType?: string;
}) => {
  if (!input.env.STRATEGY_ARTIFACTS) {
    throw new AppError('Strategy artifact storage is not configured', 500);
  }

  const key = `strategies/${input.strategyId}/${input.version}/${sanitizeFileName(input.fileName)}`;
  const body = Uint8Array.from(Buffer.from(input.contentBase64, 'base64'));

  await input.env.STRATEGY_ARTIFACTS.put(key, body, {
    httpMetadata: input.contentType ? { contentType: input.contentType } : undefined,
  });

  return key;
};

export const loadStrategyArtifact = async (env: BackendEnv, key: string) => {
  if (!env.STRATEGY_ARTIFACTS) {
    throw new AppError('Strategy artifact storage is not configured', 500);
  }

  const object = await env.STRATEGY_ARTIFACTS.get(key);
  if (!object) {
    throw new AppError(`Strategy artifact not found for key ${key}`, 404);
  }

  return object.arrayBuffer();
};