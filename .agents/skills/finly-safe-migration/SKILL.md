---
name: finly-safe-migration
description: Use ao alterar migração, importação de backup, schema ou persistência. Não ativar para UI sem efeito nos dados; criar esta Skill não autoriza implementar migração.
---

# finly-safe-migration

Entrada: contratos de origem/destino e diff. Leia docs/MIGRATION_v1_to_v2.md.
- Preserve `saldoclaro-v1`; ofereça backup, prévia, validação e confirmação explícita.
- Compare IDs, quantidades, totais por mês/tipo, configurações, status de fatura e reembolsos.
- Preserve meses, números e IDs de parcelas; nunca invente parcelas ausentes.
- Verifique idempotência e rollback em falha. Não substitua `finly-v2` existente sem escolha expressa e backup.
- Não use dados pessoais; não grave estado parcial antes da validação integral.
Saída: matriz origem → destino → oráculo de conservação, critérios de abortar/rollback e casos sintéticos. Migração v2 pertence à tarefa independente da Issue #2.
