import json

# Common Spanish character replacements
replacements = {
    'á': ['?????', 'Ã¡'],
    'é': ['?????', 'Ã©'],
    'í': ['?????', 'Ã­'],
    'ó': ['?????', 'Ã³'],
    'ú': ['?????', 'Ãº'],
    'ñ': ['?????', 'Ã±'],
    'Á': ['?????', 'Ã'],
    'É': ['?????', 'Ã'],
    'Í': ['?????', 'Ã'],
    'Ó': ['?????', 'Ã'],
    'Ú': ['?????', 'Ã'],
    'Ñ': ['?????', 'Ã'],
    'ü': ['??????', 'Ã¼'],
}

def fix_string(text):
    if not isinstance(text, str):
        return text

    for correct, wrongs in replacements.items():
        for wrong in wrongs:
            text = text.replace(wrong, correct)

    return text

def fix_dict(obj):
    if isinstance(obj, dict):
        return {k: fix_dict(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [fix_dict(item) for item in obj]
    elif isinstance(obj, str):
        return fix_string(obj)
    else:
        return obj

# Load the exported data
with open('rag_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Fix encoding issues
fixed_data = fix_dict(data)

# Save fixed data
with open('../llm_rag/rag_data_fixed.json', 'w', encoding='utf-8') as f:
    json.dump(fixed_data, f, indent=2, ensure_ascii=False)

print("✅ Fixed data saved to rag_data_fixed.json")
print("\nSample fixes:")
print("  ????? → á, é, í, ó, ú")
print("  ????? → ñ")