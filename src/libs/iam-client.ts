
import { ProjectsApi, Configuration } from '@affinidi-tdk/iam-client'

export async function listProjects({ apiKey, limit, exclusiveStartKey }: { apiKey: string, limit?: number, exclusiveStartKey?: string }) {

  const api = new ProjectsApi(
    new Configuration({
      apiKey
    })
  );

  const { data } = await api.listProject(limit, exclusiveStartKey)

  return data.projects;
}
