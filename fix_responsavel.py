import re

with open('src/app/api/simulados/route.ts', 'r') as f:
    content = f.read()

# 1. Fetch the responsible teacher regardless of user role
fetch_logic = """    // Buscar a Prova e seu gabarito se provaId for fornecido
    let gabarito: any = null
    let canView = false

    // BUSCAR RESPONSÁVEL
    let responsavelName: string | null = null;
    let whereResponsavelQuery: any = { turmaId, anoLetivo: 2026 }
    if (provaId) {
      whereResponsavelQuery.provaId = provaId
    } else {
      whereResponsavelQuery.areaId = areaId
    }
    const responsaveisGerais = await (prisma as any).responsavelSimulado.findMany({
      where: whereResponsavelQuery,
      include: { user: { select: { name: true } } }
    })
    const responsavelEncontrado = responsaveisGerais.find((r: any) => r.unidade === null || r.unidade === parseInt(unidade))
    if (responsavelEncontrado && responsavelEncontrado.user) {
      responsavelName = responsavelEncontrado.user.name
    }
"""

content = content.replace(
    '    // Buscar a Prova e seu gabarito se provaId for fornecido\n    let gabarito: any = null\n    let canView = false',
    fetch_logic
)

# 2. Modify canEdit check
old_canedit_check = """    // Verificar se o usuário TEM PERMISSÃO DE EDIÇÃO para esta consulta
    let canEdit = user.isSuperuser || user.isDirecao
    if (!canEdit) {
      let whereResponsavel: any = { userId: user.id, turmaId, anoLetivo: 2026 }
      if (provaId) {
        whereResponsavel.provaId = provaId
        // O responsável pode estar vinculado à unidade específica ou a todas (nulo)
        // Se unidade estiver presente na req, checamos se ele tem permissão nela ou nulo
      } else {
        whereResponsavel.areaId = areaId
      }
      
      const isResponsavel = await (prisma as any).responsavelSimulado.findMany({
        where: whereResponsavel
      })

      // Se encontrou, checa se a unidade bate
      canEdit = isResponsavel.some((r: any) => r.unidade === null || r.unidade === parseInt(unidade))
      if (canEdit) canView = true // Se pode editar, pode ver
    }"""

new_canedit_check = """    // Verificar se o usuário TEM PERMISSÃO DE EDIÇÃO para esta consulta
    let canEdit = user.isSuperuser || user.isDirecao
    if (!canEdit) {
      // Verifica se o usuário atual é o responsável encontrado acima
      canEdit = responsavelEncontrado && responsavelEncontrado.userId === user.id;
      if (canEdit) canView = true // Se pode editar, pode ver
    }"""

content = content.replace(old_canedit_check, new_canedit_check)

# 3. Add responsavelName to the returned JSON
content = content.replace(
    'gabarito: (canEdit || canView) ? gabarito : null // Editores e visualizadores veem o gabarito',
    'gabarito: (canEdit || canView) ? gabarito : null, // Editores e visualizadores veem o gabarito\n        responsavelName'
)

with open('src/app/api/simulados/route.ts', 'w') as f:
    f.write(content)

print("Backend updated with responsavelName.")
