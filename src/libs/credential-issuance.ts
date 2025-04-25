import {
  Configuration,
  IssuanceApi,
  StartIssuanceInput,
} from "@affinidi-tdk/credential-issuance-client";

export async function startIssuance(apiKey: string, projectId: string, apiData: StartIssuanceInput) {
  const api = new IssuanceApi(
    new Configuration({
      apiKey,
    }),
  );
  const { data } = await api.startIssuance(projectId, apiData);
  return data;
}

