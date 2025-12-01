# backend/fix_encoding.py
"""
Corrige caracteres mal codificados y los convierte a versiones sin acentos
Convierte: "??????" → letra normal (á → a, é → e, etc.)
"""

import json
import unicodedata

def remove_accents(text):
    """
    Convierte caracteres acentuados a su versión sin acento
    á → a, é → e, í → i, ó → o, ú → u, ñ → n
    """
    if not isinstance(text, str):
        return text

    # Normalizar el texto (descomponer caracteres con acento)
    nfd = unicodedata.normalize('NFD', text)

    # Filtrar solo los caracteres base (sin marcas diacríticas)
    without_accents = ''.join(
        char for char in nfd
        if unicodedata.category(char) != 'Mn'  # Mn = Marcas no espaciadoras (acentos)
    )

    return without_accents


def fix_broken_encoding(text):
    """
    Arregla caracteres mal codificados como "??????"
    """
    if not isinstance(text, str):
        return text

    # Mapeo de caracteres rotos comunes
    replacements = {
        # Minúsculas
        'Ã¡': 'a',  # á
        'Ã©': 'e',  # é
        'Ã­': 'i',  # í
        'Ã³': 'o',  # ó
        'Ãº': 'u',  # ú
        'Ã±': 'n',  # ñ
        'Ã¼': 'u',  # ü

        # Mayúsculas
        'Ã': 'A',   # Á
        'Ã': 'E',   # É
        'Ã': 'I',   # Í
        'Ã': 'O',   # Ó
        'Ã': 'U',   # Ú
        'Ã': 'N',   # Ñ

        # Patrones con signos de interrogación
        '?????': '',  # Eliminar completamente
        '??????': '', # Eliminar completamente
    }

    result = text
    for wrong, correct in replacements.items():
        result = result.replace(wrong, correct)

    # Eliminar cualquier carácter de interrogación residual seguido de caracteres especiales
    result = result.replace('?', '')

    return result


def clean_string(text):
    """
    Limpia un texto: corrige encoding roto y quita acentos
    """
    if not isinstance(text, str):
        return text

    # Paso 1: Arreglar caracteres rotos
    text = fix_broken_encoding(text)

    # Paso 2: Quitar acentos de lo que quedó
    text = remove_accents(text)

    return text


def clean_dict(obj):
    """
    Limpia recursivamente un diccionario/lista/string
    """
    if isinstance(obj, dict):
        return {k: clean_dict(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_dict(item) for item in obj]
    elif isinstance(obj, str):
        return clean_string(obj)
    else:
        return obj


def main():
    print("🧹 Limpiando caracteres especiales...")

    # Cargar datos exportados
    with open('rag_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"📂 Registros cargados:")
    for table, rows in data.items():
        print(f"  - {table}: {len(rows)}")

    # Limpiar datos
    cleaned_data = clean_dict(data)

    # Guardar datos limpios
    output_path = '../llm_rag/rag_data_fixed.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(cleaned_data, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Datos limpios guardados en: {output_path}")
    print("\n📝 Transformaciones aplicadas:")
    print("  - ?????? → (eliminado)")
    print("  - á → a")
    print("  - é → e")
    print("  - í → i")
    print("  - ó → o")
    print("  - ú → u")
    print("  - ñ → n")
    print("  - Ñ → N")

    # Mostrar ejemplo
    print("\n🔍 Ejemplo de transformación:")
    sample = cleaned_data['tienditas'][0] if cleaned_data.get('tienditas') else None
    if sample:
        print(f"  Cafetería: {sample.get('nombre', 'N/A')}")
        print(f"  Ubicación: {sample.get('direccion', 'N/A')}")


if __name__ == '__main__':
    main()