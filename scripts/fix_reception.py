import sys

def replace_in_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

reception_replacements = [
    ("Bs. {(s.price * exchangeRate).toFixed(2)}",
     "${Number(s.price).toFixed(2)} (Ref: Bs. {(s.price * exchangeRate).toFixed(2)})"),
     
    ("Bs. {(p.price * exchangeRate).toFixed(2)}",
     "${Number(p.price).toFixed(2)} (Ref: Bs. {(p.price * exchangeRate).toFixed(2)})"),
     
    ("Bs. {(subtotal * exchangeRate).toFixed(2)}",
     "${Number(subtotal).toFixed(2)} (Ref: Bs. {(subtotal * exchangeRate).toFixed(2)})"),
     
    ("- Bs. {(discount * exchangeRate).toFixed(2)}",
     "- ${Number(discount).toFixed(2)} (Ref: - Bs. {(discount * exchangeRate).toFixed(2)})"),
     
    ("Bs. {(total * exchangeRate).toFixed(2)}",
     "${Number(total).toFixed(2)} (Ref: Bs. {(total * exchangeRate).toFixed(2)})"),
]

replace_in_file('src/components/ReceptionModule.jsx', reception_replacements)
