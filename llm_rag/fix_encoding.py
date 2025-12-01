"""
Script para limpiar el JSON y eliminar caracteres especiales
Convierte vocales con acentos a vocales sin acentos
"""

import json
import unicodedata

def remove_accents(text):
    """
    Elimina acentos y caracteres especiales de un texto
    """
    if not isinstance(text, str):
        return text

    # Normaliza y elimina acentos
    nfkd = unicodedata.normalize('NFKD', text)
    text_clean = ''.join([c for c in nfkd if not unicodedata.combining(c)])

    # Reemplazos manuales adicionales por si acaso
    replacements = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
        'ñ': 'n', 'Ñ': 'N',
        'ü': 'u', 'Ü': 'U',
        '¿': '', '¡': '',
        'á?': 'a', 'é?': 'e', 'í?': 'i', 'ó?': 'o', 'ú?': 'u',
    }

    for old, new in replacements.items():
        text_clean = text_clean.replace(old, new)

    return text_clean

def clean_dict(obj):
    """
    Limpia recursivamente un diccionario o lista
    """
    if isinstance(obj, dict):
        return {key: clean_dict(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [clean_dict(item) for item in obj]
    elif isinstance(obj, str):
        return remove_accents(obj)
    else:
        return obj

def main():
    print("🧹 Limpiando JSON...")

    # Leer archivo original
    with open('rag_data_fixed_R.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"✅ Leído: {len(data.get('menus', []))} menus, "
          f"{len(data.get('tienditas', []))} tienditas, "
          f"{len(data.get('facultades', []))} facultades")

    # Limpiar datos
    data_clean = clean_dict(data)

    # Guardar archivo limpio
    with open('rag_data_clean.json', 'w', encoding='utf-8') as f:
        json.dump(data_clean, f, ensure_ascii=False, indent=2)

    print("✅ Guardado en: rag_data_clean.json")

    # Mostrar ejemplos de cambios
    print("\n📝 Ejemplos de cambios:")
    for i, menu in enumerate(data['menus'][:3]):
        if menu.get('nombre'):
            original = menu['nombre']
            limpio = data_clean['menus'][i]['nombre']
            if original != limpio:
                print(f"  '{original}' → '{limpio}'")

    for i, tienda in enumerate(data['tienditas'][:3]):
        if tienda.get('nombre'):
            original = tienda['nombre']
            limpio = data_clean['tienditas'][i]['nombre']
            if original != limpio:
                print(f"  '{original}' → '{limpio}'")

if __name__ == "__main__":
    main()