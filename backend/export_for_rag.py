import json
import pymysql

connection = pymysql.connect(
    host='localhost',
    user='root',
    password='owen1234',
    database='el_buho_tragon',
    charset='utf8mb4',
    cursorclass=pymysql.cursors.DictCursor
)

data = {}

with connection.cursor() as cursor:
    # Export menus (all columns)
    print("Exporting menus...")
    cursor.execute("SELECT * FROM menus")
    data['menus'] = cursor.fetchall()

    # Export tienditas with faculty name (exclude imagen_url)
    print("Exporting tienditas...")
    cursor.execute("""
                   SELECT t.id_tiendita, t.nombre, t.direccion, t.foro_url,
                          t.id_facultad, f.nombre as facultad_nombre,
                          t.latitud, t.longitud, t.hora_apertura, t.hora_cierre
                   FROM tienditas t
                            LEFT JOIN facultades f ON t.id_facultad = f.id_facultad
                   """)
    data['tienditas'] = cursor.fetchall()

    # Export facultades (all columns)
    print("Exporting facultades...")
    cursor.execute("SELECT * FROM facultades")
    data['facultades'] = cursor.fetchall()

    print(f"\n📊 Summary:")
    for table, rows in data.items():
        print(f"  - {table}: {len(rows)} records")

connection.close()

with open('rag_data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False, default=str)

print("\n✅ Data exported to rag_data.json (images excluded)")