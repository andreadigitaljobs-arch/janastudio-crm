import sys

def replace_in_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

finance_replacements = [
    # Top cards
    ("Bs. {formatBs(balance * (rates?.usd || 550))}",
     "${formatBs(balance)} USD\n                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '800', marginTop: '4px' }}>Ref: Bs. {formatBs(balance * (rates?.usd || 550))}</div>"),
    
    ("Bs. {formatBs(stats.ingresosTotales * (rates?.usd || 550))}",
     "${formatBs(stats.ingresosTotales)} USD\n                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '800', marginTop: '4px' }}>Ref: Bs. {formatBs(stats.ingresosTotales * (rates?.usd || 550))}</div>"),
     
    ("Bs. {formatBs(stats.egresosTotales * (rates?.usd || 550))}",
     "${formatBs(stats.egresosTotales)} USD\n                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '800', marginTop: '4px' }}>Ref: Bs. {formatBs(stats.egresosTotales * (rates?.usd || 550))}</div>"),
     
    ("Bs. {formatBs(cajaDisponible * (rates?.usd || 550))}",
     "${formatBs(cajaDisponible)} USD\n                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '800', marginTop: '4px' }}>Ref: Bs. {formatBs(cajaDisponible * (rates?.usd || 550))}</div>"),
     
    ("Bs. {formatBs(totalEfectivo * (rates?.usd || 550))}",
     "${formatBs(totalEfectivo)} USD\n                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', marginTop: '2px' }}>Ref: Bs. {formatBs(totalEfectivo * (rates?.usd || 550))}</div>"),
     
    ("Bs. {formatBs(totalPagoMovil * (rates?.usd || 550))}",
     "${formatBs(totalPagoMovil)} USD\n                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', marginTop: '2px' }}>Ref: Bs. {formatBs(totalPagoMovil * (rates?.usd || 550))}</div>"),
     
    ("Bs. {formatBs(totalComisiones * (rates?.usd || 550))}",
     "${formatBs(totalComisiones)} USD\n                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', marginTop: '2px' }}>Ref: Bs. {formatBs(totalComisiones * (rates?.usd || 550))}</div>"),
     
    ("Bs. {formatBs(netoReal * (rates?.usd || 550))}",
     "${formatBs(netoReal)} USD\n                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', marginTop: '2px' }}>Ref: Bs. {formatBs(netoReal * (rates?.usd || 550))}</div>"),

    # Other cards and lists in FinanceModule
    ("Bs. {formatBs(totalMembers > 0 ? totalPayroll / totalMembers : 0)}",
     "${formatBs((totalMembers > 0 ? totalPayroll / totalMembers : 0) / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: Bs. {formatBs(totalMembers > 0 ? totalPayroll / totalMembers : 0)}</span>"),
     
    ("Bs. {formatBs(utilidadNetaCalculada)}",
     "${formatBs(utilidadNetaCalculada / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: Bs. {formatBs(utilidadNetaCalculada)}</span>"),
     
    ("Bs. {formatBs(ptoEquilibrio)}",
     "${formatBs(ptoEquilibrio / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: Bs. {formatBs(ptoEquilibrio)}</span>"),
     
    ("Bs. {formatBs(ticketProm)}",
     "${formatBs(ticketProm / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: Bs. {formatBs(ticketProm)}</span>"),
     
    ("Bs. {formatBs(ingresosTotales)}",
     "${formatBs(ingresosTotales / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: Bs. {formatBs(ingresosTotales)}</span>"),
     
    ("-Bs. {formatBs(egresosEstilistas)}",
     "-${formatBs(egresosEstilistas / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: -Bs. {formatBs(egresosEstilistas)}</span>"),
     
    ("-Bs. {formatBs(totalFixedCosts)}",
     "-${formatBs(totalFixedCosts / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: -Bs. {formatBs(totalFixedCosts)}</span>"),
     
    ("-Bs. {formatBs(fixedCosts[c.key] || 0)}",
     "-${formatBs((fixedCosts[c.key] || 0) / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: -Bs. {formatBs(fixedCosts[c.key] || 0)}</span>"),
     
    ("-Bs. {formatBs(c.value)}",
     "-${formatBs(c.value / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: -Bs. {formatBs(c.value)}</span>"),
     
    ("-Bs. {formatBs(costosVariables)}",
     "-${formatBs(costosVariables / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: -Bs. {formatBs(costosVariables)}</span>"),
     
    ("Bs. {formatBs(b.incomeBs)}",
     "${formatBs(b.incomeBs / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: Bs. {formatBs(b.incomeBs)}</span>"),
     
    ("-Bs. {formatBs(netCostoBs)}",
     "-${formatBs(netCostoBs / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: -Bs. {formatBs(netCostoBs)}</span>"),
     
    ("Bs. {formatBs(gananciaSalonBs)}",
     "${formatBs(gananciaSalonBs / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: Bs. {formatBs(gananciaSalonBs)}</span>"),
     
    ("Bs. {formatBs(st.balanceBs)}",
     "${formatBs(st.balanceBs / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: Bs. {formatBs(st.balanceBs)}</span>"),
]

services_replacements = [
    # ServicesModule.jsx
    ("return `${(Number(price) * (rates?.usd || 550)).toLocaleString('es-VE')} Bs.`;",
     "return `$${Number(price).toLocaleString('es-VE')} USD (Ref: ${(Number(price) * (rates?.usd || 550)).toLocaleString('es-VE')} Bs.)`;"),
     
    ("{formatBs(avgTicket)}",
     "${formatBs(avgTicket / (rates?.usd || 550))} USD\n                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', marginTop: '4px' }}>Ref: Bs. {formatBs(avgTicket)}</div>"),
     
    ("{formatBs(selectedServiceDetail.price)}",
     "${formatBs(selectedServiceDetail.price / rates.usd)} USD\n                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '800', marginTop: '4px' }}>Ref: Bs. {formatBs(selectedServiceDetail.price)}</div>"),
     
    ("{Math.round(selectedServiceDetail.price * rates.usd).toLocaleString()} Bs.",
     "${selectedServiceDetail.price} USD (Ref: {Math.round(selectedServiceDetail.price * rates.usd).toLocaleString()} Bs.)"),
     
    ("{formatBs(variation.price)}",
     "${formatBs(variation.price / rates.usd)} USD (Ref: Bs. {formatBs(variation.price)})"),
     
    ("{Math.round(variation.price * rates.usd).toLocaleString()} Bs.",
     "${variation.price} USD (Ref: {Math.round(variation.price * rates.usd).toLocaleString()} Bs.)"),
     
    ("≈ {Math.round((Number(newService.price) || 0) * rates.usd).toLocaleString()} Bs.",
     "≈ ${Number(newService.price) || 0} USD (Ref: {Math.round((Number(newService.price) || 0) * rates.usd).toLocaleString()} Bs.)"),
     
    ("EQUIVALENTE BS.", "EQUIVALENTE"),
    
    ("{Math.round(((Number(newService.price) || 0) - ((Number(newService.price) || 0) * (Number(newService.commission_stylist) || 0) / 100)) * rates.usd).toLocaleString()} Bs.",
     "${(Number(newService.price) || 0) - ((Number(newService.price) || 0) * (Number(newService.commission_stylist) || 0) / 100)} USD (Ref: {Math.round(((Number(newService.price) || 0) - ((Number(newService.price) || 0) * (Number(newService.commission_stylist) || 0) / 100)) * rates.usd).toLocaleString()} Bs.)"),
     
    ("{Math.round((((Number(newService.price) || 0) * (Number(newService.commission_stylist) || 0)) / 100) * rates.usd).toLocaleString()} Bs.",
     "${(((Number(newService.price) || 0) * (Number(newService.commission_stylist) || 0)) / 100)} USD (Ref: {Math.round((((Number(newService.price) || 0) * (Number(newService.commission_stylist) || 0)) / 100) * rates.usd).toLocaleString()} Bs.)"),
]

reception_replacements = [
    # ReceptionModule.jsx
    ("Bs. {(item.price * exchangeRate).toFixed(2)}",
     "${Number(item.price).toFixed(2)} USD (Ref: Bs. {(item.price * exchangeRate).toFixed(2)})"),
]

reports_replacements = [
    # ReportsModule.jsx
    ("Bs. {formatBs(total)}",
     "${formatBs(total / (exchangeRate || 550))} USD"),
     
    ("Bs. {formatBs(amount || value)}",
     "${formatBs((amount || value) / (exchangeRate || 550))} USD"),
     
    ("value: `Bs. ${formatBs(ingresosTotales)}`",
     "value: `$ ${formatBs(ingresosTotales / (exchangeRate || 550))} USD`"),
     
    ("value: `Bs. ${formatBs(ticketPromedio)}`",
     "value: `$ ${formatBs(ticketPromedio / (exchangeRate || 550))} USD`"),
     
    ("Ingresos (Bs.)", "Ingresos"),
    
    ("unit: 'Bs.'", "unit: 'USD'"),
    
    ("Bs. ${formatBs(o.current)} / Bs. ${formatBs(o.target)}",
     "$${formatBs(o.current / (exchangeRate || 550))} / $${formatBs(o.target / (exchangeRate || 550))}"),
     
    ("Bs. {formatBs(t.ingresos)}",
     "${formatBs(t.ingresos / (exchangeRate || 550))} USD"),
     
    ("Bs. {formatBs(c.total)}",
     "${formatBs(c.total / (exchangeRate || 550))} USD"),
]

topbar_replacements = [
    # TopBar.jsx
    ("Bs. {rates.bcv?.toFixed(2)}", "${rates.bcv?.toFixed(2)} Bs"),
    ("Bs. {rates.usdt?.toFixed(2)}", "${rates.usdt?.toFixed(2)} Bs"),
]

replace_in_file('src/components/FinanceModule.jsx', finance_replacements)
replace_in_file('src/components/ServicesModule.jsx', services_replacements)
replace_in_file('src/components/ReceptionModule.jsx', reception_replacements)
replace_in_file('src/components/ReportsModule.jsx', reports_replacements)
replace_in_file('src/components/TopBar.jsx', topbar_replacements)
