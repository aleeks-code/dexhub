import { ModuleRenderer } from './module-renderer'

interface ModulePageProps {
  params: Promise<{ module: string; path: string[] }>
}

export default async function ModulePage({ params }: ModulePageProps) {
  const { module: moduleId, path } = await params
  const subPath = `/${(path ?? []).join('/')}`
  return <ModuleRenderer moduleId={moduleId} path={subPath} />
}
