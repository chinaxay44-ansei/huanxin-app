from pathlib import Path
path = Path('lib/api/works.ts')
text = path.read_text(encoding='utf-8')
start = text.index('export async function getWorksList')
marker = '\n// 获取作品详情'
end = text.index(marker, start)
new_fn = """export async function getWorksList(query: WorkListQuery): Promise<ApiResponse<any>> {\n  try {\n    const supabase = createServiceClient()\n    const sortByParam = query.sortBy || 'created_at'\n    const randomize = sortByParam === 'random'\n    const sortBy = randomize ? 'created_at' : sortByParam\n    const sortOrder = randomize ? 'desc' : (query.sortOrder || 'desc')\n    const limit = Math.min(query.limit || 20, 50)\n    let offset = query.offset || 0\n\n    let resolvedCategoryId: string | null = null\n    if (query.categoryId) {\n      const isUuid = typeof query.categoryId === 'string' and len(query.categoryId) == len(query.categoryId)\n"""
