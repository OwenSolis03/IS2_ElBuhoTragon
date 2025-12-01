# backend/export_for_rag.py
"""
Exporta datos desde SQLite Django a JSON para el RAG
"""

import json
import os
import django
import sys

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.cafeteria.models import Menus, Tienditas, Facultades

def export_data():
    print("🦉 Exportando datos desde SQLite...")

    data = {}

    # Export menus
    print("📋 Exportando menús...")
    menus = Menus.objects.all().values(
        'id_menu', 'nombre', 'descripcion', 'precio',
        'id_tiendita__id_tiendita', 'categoria'
    )

    data['menus'] = []
    for menu in menus:
        data['menus'].append({
            'id_menu': menu['id_menu'],
            'nombre': menu['nombre'],
            'descripcion': menu.get('descripcion', ''),
            'precio': str(menu.get('precio', '0.00')),
            'id_tiendita': menu.get('id_tiendita__id_tiendita'),
            'categoria': menu.get('categoria', '')
        })

    # Export tienditas
    print("🏪 Exportando cafeterías...")
    tienditas = Tienditas.objects.select_related('id_facultad').all()

    data['tienditas'] = []
    for t in tienditas:
        data['tienditas'].append({
            'id_tiendita': t.id_tiendita,
            'nombre': t.nombre,
            'direccion': t.direccion or '',
            'foro_url': t.foro_url or '',
            'id_facultad': t.id_facultad.id_facultad if t.id_facultad else None,
            'facultad_nombre': t.id_facultad.nombre if t.id_facultad else '',
            'latitud': str(t.latitud) if t.latitud else None,
            'longitud': str(t.longitud) if t.longitud else None,
            'hora_apertura': str(t.hora_apertura) if t.hora_apertura else None,
            'hora_cierre': str(t.hora_cierre) if t.hora_cierre else None
        })

    # Export facultades
    print("📚 Exportando facultades...")
    facultades = Facultades.objects.all().values()
    data['facultades'] = list(facultades)

    # Resumen
    print(f"\n📊 Resumen:")
    for table, rows in data.items():
        print(f"  - {table}: {len(rows)} registros")

    # Guardar JSON
    output_path = 'rag_data.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Datos exportados a {output_path}")
    return output_path

if __name__ == '__main__':
    export_data()