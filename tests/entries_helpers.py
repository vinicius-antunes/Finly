"""Actions shared by existing financial regressions after Entries UX changes."""
def new_entry(page, kind='credit'):
    page.get_by_text('Novo lançamento',exact=True).click()
    page.get_by_role('button',name={'credit':'Nova compra no cartão','out':'Nova despesa','income':'Nova receita','reimbursement':'Novo reembolso'}[kind],exact=True).click()
def advanced_entries(page):
    details=page.locator('.entries-advanced')
    if details.get_attribute('open') is None:details.locator('summary').click()
