# backend/import_to_sqlite.py
"""
Importa datos desde rag_data_fixed.json a la base de datos SQLite de Django
Uso: python import_to_sqlite.py
"""

import json
import os
import django
from datetime import time

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.cafeteria.models import Facultades, Tienditas, Menus

def parse_time(time_str):
    """Convierte string de tiempo a objeto time"""
    if not time_str:
        return None
    try:
        h, m, s = time_str.split(':')
        return time(int(h), int(m), int(s))
    except:
        return None

def import_data():
    print("🦉 Importando datos a SQLite...")

    # Cargar JSON limpio
    json_path = '../llm_rag/rag_data_fixed.json'
    if not os.path.exists(json_path):
        print(f"❌ Error: No se encontró {json_path}")
        print("   Ejecuta primero: python export_for_rag.py && python fix_encoding.py")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 1. IMPORTAR FACULTADES
    print("\n📚 Importando Facultades...")
    facultades_creadas = 0
    for fac in data.get('facultades', []):
        obj, created = Facultades.objects.update_or_create(
            id_facultad=fac['id_facultad'],
            defaults={
                'nombre': fac['nombre'],
                'descripcion': fac.get('descripcion'),
                'localizacion': fac.get('localizacion')
            }
        )
        if created:
            facultades_creadas += 1

    print(f"✅ {Facultades.objects.count()} facultades en total ({facultades_creadas} nuevas)")

    # 2. IMPORTAR TIENDITAS
    print("\n🏪 Importando Cafeterías...")
    tienditas_creadas = 0
    for tienda in data.get('tienditas', []):
        # Obtener facultad
        facultad = None
        if tienda.get('id_facultad'):
            try:
                facultad = Facultades.objects.get(id_facultad=tienda['id_facultad'])
            except Facultades.DoesNotExist:
                print(f"  ⚠️ Facultad {tienda['id_facultad']} no encontrada para {tienda['nombre']}")

        # Convertir horarios
        hora_apertura = parse_time(tienda.get('hora_apertura'))
        hora_cierre = parse_time(tienda.get('hora_cierre'))

        obj, created = Tienditas.objects.update_or_create(
            id_tiendita=tienda['id_tiendita'],
            defaults={
                'nombre': tienda['nombre'],
                'direccion': tienda.get('direccion'),
                'foro_url': tienda.get('foro_url'),
                'id_facultad': facultad,
                'latitud': tienda.get('latitud'),
                'longitud': tienda.get('longitud'),
                'hora_apertura': hora_apertura,
                'hora_cierre': hora_cierre,
                'imagen_url': None  # Se puede agregar después
            }
        )
        if created:
            tienditas_creadas += 1

    print(f"✅ {Tienditas.objects.count()} cafeterías en total ({tienditas_creadas} nuevas)")

    # 3. IMPORTAR MENÚS
    print("\n🍽️ Importando Menús...")
    menus_creados = 0
    menus_error = 0

    for menu in data.get('menus', []):
        # Obtener tiendita
        tiendita = None
        if menu.get('id_tiendita'):
            try:
                tiendita = Tienditas.objects.get(id_tiendita=menu['id_tiendita'])
            except Tienditas.DoesNotExist:
                menus_error += 1
                continue

        obj, created = Menus.objects.update_or_create(
            id_menu=menu['id_menu'],
            defaults={
                'id_tiendita': tiendita,
                'nombre': menu['nombre'],
                'descripcion': menu.get('descripcion', ''),
                'precio': menu.get('precio', 0),
                'categoria': menu.get('categoria', '')
            }
        )
        if created:
            menus_creados += 1

    print(f"✅ {Menus.objects.count()} platillos en total ({menus_creados} nuevos)")
    if menus_error > 0:
        print(f"⚠️ {menus_error} menús no se pudieron importar (cafetería no encontrada)")

    # RESUMEN FINAL
    print(f"""
╔════════════════════════════════════╗
║   🎉 IMPORTACIÓN COMPLETADA 🎉    ║
╠════════════════════════════════════╣
║ Facultades:  {Facultades.objects.count():>4}                   ║
║ Cafeterías:  {Tienditas.objects.count():>4}                   ║
║ Platillos:   {Menus.objects.count():>4}                   ║
╚════════════════════════════════════╝
    """)

if __name__ == '__main__':
    import_data()