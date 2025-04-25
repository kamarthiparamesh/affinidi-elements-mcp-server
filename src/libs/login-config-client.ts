
import { ConfigurationApi, Configuration } from '@affinidi-tdk/login-configuration-client'

export async function listLoginConfigurations({ apiKey, limit, exclusiveStartKey }: { apiKey: string, limit?: number, exclusiveStartKey?: string }) {

  const api = new ConfigurationApi(
    new Configuration({
      apiKey,
    })
  );

  const { data } = await api.listLoginConfigurations(limit, exclusiveStartKey);

  return data.configurations;
}
