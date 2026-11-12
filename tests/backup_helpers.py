"""Shared actions for the single-dialog import flow (no server or fixtures)."""
def restore_backup(page, content, name='synthetic-v2.json', opened=False):
    if not opened:
        page.get_by_role('button',name='Importar backup JSON',exact=True).click()
    modal=page.get_by_role('dialog')
    modal.get_by_label('Selecionar arquivo JSON',exact=True).set_input_files({'name':name,'mimeType':'application/json','buffer':content if isinstance(content,bytes) else content.encode()})
    modal.get_by_text('Arquivo válido. Você pode continuar.',exact=True).wait_for()
    modal.get_by_role('button',name='Continuar',exact=True).click()
    modal.get_by_role('heading',name='Confira os dados do backup',exact=True).wait_for()
    modal.get_by_role('button',name='Continuar',exact=True).click()
    if modal.get_by_role('checkbox').count():modal.get_by_role('checkbox').check()
    modal.get_by_role('button',name='Restaurar dados',exact=True).click()
    modal.wait_for(state='hidden')
