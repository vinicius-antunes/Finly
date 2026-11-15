"""Actions shared by existing financial regressions after Entries UX changes."""
def new_entry(page, kind='credit'):
    page.get_by_role('button',name='Novo lançamento',exact=True).click()
    page.get_by_role('button',name='Continuar no cadastro anterior',exact=True).click()
    page.get_by_role('dialog').get_by_label('Tipo',exact=True).select_option(kind)
def advanced_entries(page):
    details=page.locator('.entries-advanced')
    if details.get_attribute('open') is None:details.locator('summary').click()
