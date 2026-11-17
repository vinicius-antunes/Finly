"""Select a YYYY-MM period through the visible custom control."""
def select_month(field, value):
    field.click()
    panel=field.page.locator('.month-panel:popover-open')
    if not value:
        panel.get_by_role('button',name='Limpar',exact=True).click();return
    year,month=map(int,value.split('-'))
    while int(panel.locator('.month-year strong').inner_text())!=year:
        current=int(panel.locator('.month-year strong').inner_text())
        panel.get_by_role('button',name='Próximo ano' if current<year else 'Ano anterior',exact=True).click()
    panel.locator('.month-grid button').nth(month-1).click()
