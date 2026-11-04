from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework.throttling import SimpleRateThrottle

from .models import Facultades, Tienditas, Usuarios, Resenas


class SeguridadAPITests(TestCase):
    """Verifica permisos, registro y autenticación de la API."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.facultad = Facultades.objects.create(nombre='Derecho')
        self.tiendita = Tienditas.objects.create(nombre='Cafetería Derecho', id_facultad=self.facultad)
        self.alumno = self._crear_usuario('alumno', es_admin=0)
        self.otro = self._crear_usuario('otro', es_admin=0)
        self.admin = self._crear_usuario('admin', es_admin=1)

    def _crear_usuario(self, nombre, es_admin):
        return Usuarios.objects.create(
            nombre_usuario=nombre,
            contrasena=make_password('ClaveSegura#2026'),
            email=f'{nombre}@unison.mx',
            es_admin=es_admin,
            fecha_registro=timezone.now(),
        )

    def _login(self, usuario):
        res = self.client.post('/api/login/', {'username': usuario.nombre_usuario, 'password': 'ClaveSegura#2026'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access_token']}")

    # --- Usuarios ---

    def test_lista_de_usuarios_no_es_publica(self):
        self.assertEqual(self.client.get('/api/Usuarios/').status_code, 401)

    def test_alumno_no_puede_listar_usuarios(self):
        self._login(self.alumno)
        self.assertEqual(self.client.get('/api/Usuarios/').status_code, 403)

    def test_admin_lista_usuarios_sin_hash_de_contrasena(self):
        self._login(self.admin)
        res = self.client.get('/api/Usuarios/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(all('contrasena' not in u for u in res.data))

    # --- Registro ---

    def test_registro_ignora_es_admin_del_cliente(self):
        res = self.client.post('/api/register', {
            'nombre_usuario': 'colado', 'email': 'colado@unison.mx',
            'contrasena': 'ClaveSegura#2026', 'es_admin': 1,
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Usuarios.objects.get(nombre_usuario='colado').es_admin, 0)
        self.assertNotIn('contrasena', res.data)

    def test_registro_exige_correo_unison(self):
        res = self.client.post('/api/register', {
            'nombre_usuario': 'externo', 'email': 'externo@gmail.com', 'contrasena': 'ClaveSegura#2026',
        }, format='json')
        self.assertEqual(res.status_code, 400)

    def test_registro_rechaza_usuario_duplicado(self):
        res = self.client.post('/api/register', {
            'nombre_usuario': 'alumno', 'email': 'alumno2@unison.mx', 'contrasena': 'ClaveSegura#2026',
        }, format='json')
        self.assertEqual(res.status_code, 400)

    # --- Login ---

    def test_login_no_revela_si_el_usuario_existe(self):
        inexistente = self.client.post('/api/login/', {'username': 'nadie', 'password': 'x'}, format='json')
        mala_clave = self.client.post('/api/login/', {'username': 'alumno', 'password': 'x'}, format='json')
        self.assertEqual(inexistente.status_code, 401)
        self.assertEqual(inexistente.data, mala_clave.data)

    # --- Catálogo (Tienditas, Menus, Facultades) ---

    def test_catalogo_es_de_lectura_publica(self):
        for url in ('/api/Tienditas/', '/api/Menus/', '/api/Facultades/'):
            self.assertEqual(self.client.get(url).status_code, 200, url)

    def test_anonimo_no_puede_borrar_cafeterias(self):
        res = self.client.delete(f'/api/Tienditas/{self.tiendita.id_tiendita}/')
        self.assertEqual(res.status_code, 401)
        self.assertTrue(Tienditas.objects.filter(pk=self.tiendita.pk).exists())

    def test_alumno_no_puede_borrar_cafeterias(self):
        self._login(self.alumno)
        self.assertEqual(self.client.delete(f'/api/Tienditas/{self.tiendita.id_tiendita}/').status_code, 403)

    def test_admin_puede_borrar_cafeterias(self):
        self._login(self.admin)
        self.assertEqual(self.client.delete(f'/api/Tienditas/{self.tiendita.id_tiendita}/').status_code, 204)

    # --- Reseñas ---

    def test_resena_requiere_sesion(self):
        res = self.client.post('/api/Resenas/', {'id_tiendita': self.tiendita.pk, 'calificacion': 5}, format='json')
        self.assertEqual(res.status_code, 401)

    def test_resena_toma_el_autor_del_token(self):
        self._login(self.alumno)
        res = self.client.post('/api/Resenas/', {
            'id_tiendita': self.tiendita.pk, 'calificacion': 5,
            'comentario': 'Ricos molletes', 'id_usuario': self.otro.pk,
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Resenas.objects.get().id_usuario_id, self.alumno.pk)

    def test_solo_autor_o_admin_borran_resena(self):
        resena = Resenas.objects.create(id_tiendita=self.tiendita, id_usuario=self.alumno, calificacion=4)
        self._login(self.otro)
        self.assertEqual(self.client.delete(f'/api/Resenas/{resena.pk}/').status_code, 403)
        self._login(self.admin)
        self.assertEqual(self.client.delete(f'/api/Resenas/{resena.pk}/').status_code, 204)

    # --- Chatbot ---

    def test_chatbot_rechaza_mensajes_largos(self):
        res = self.client.post('/api/chatbot/', {'message': 'a' * 501}, format='json')
        self.assertIn(res.status_code, (400, 503))


# DRF lee DEFAULT_THROTTLE_RATES al importar, así que override_settings no aplica
@patch.object(SimpleRateThrottle, 'THROTTLE_RATES',
              {'login': '3/minute', 'registro': '5/hour', 'chatbot': '2/hour', 'chatbot_global': '100/day'})
class ThrottlingTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_login_se_limita_por_ip(self):
        codigos = [self.client.post('/api/login/', {'username': 'x', 'password': 'y'}, format='json').status_code
                   for _ in range(4)]
        self.assertEqual(codigos[-1], 429)

    def test_chatbot_se_limita_por_ip(self):
        codigos = [self.client.post('/api/chatbot/', {'message': ''}, format='json').status_code
                   for _ in range(3)]
        self.assertEqual(codigos[-1], 429)


class FormatoRAGTests(TestCase):
    """Funciones puras del motor de Bedrock (no llaman a AWS)."""

    def test_filtro_de_presupuesto_quita_platillos_caros(self):
        from llm_rag.rag_engine_bedrock import filter_by_budget
        doc = "CAFETERÍA: Artes\nUBICACIÓN: x\n\nMENÚ (COMIDA):\n- Mollete ($30 MXN)\n- Torta ($70 MXN)"
        filtrado = filter_by_budget([doc], 40)
        self.assertEqual(len(filtrado), 1)
        self.assertIn('Mollete', filtrado[0])
        self.assertNotIn('Torta', filtrado[0])

    def test_filtro_de_presupuesto_descarta_cafeterias_sin_opciones(self):
        from llm_rag.rag_engine_bedrock import filter_by_budget
        doc = "CAFETERÍA: Derecho\n\nMENÚ (COMIDA):\n- Torta ($70 MXN)"
        self.assertEqual(filter_by_budget([doc], 40), [])

    def test_limpieza_de_respuesta_separa_vinetas(self):
        from llm_rag.rag_engine_bedrock import clean_answer
        self.assertEqual(clean_answer("Hay: • **A** ($30) • B ($40)"), "Hay:\n• A ($30)\n• B ($40)")


class UbicacionRAGTests(TestCase):
    """Detección de lugares del campus y GPS fuera del campus (sin llamar a AWS)."""

    def test_detecta_lugar_con_acento(self):
        from llm_rag.rag_utils import find_locations
        self.assertEqual([p[0] for p in find_locations("cosas por 50 pesos cerca de economía")], ["economia"])

    def test_detecta_dos_lugares_para_calcular_distancia(self):
        from llm_rag.rag_utils import find_locations
        lugares = [p[0] for p in find_locations("¿qué tan lejos está medicina de artes?")]
        self.assertEqual(lugares, ["medicina", "artes"])

    def test_detecta_lugares_de_dos_palabras(self):
        from llm_rag.rag_utils import find_locations
        self.assertEqual(find_locations("algo en trabajo social")[0][0], "trabajo social")

    def test_sin_lugar_no_inventa_ubicacion(self):
        from llm_rag.rag_utils import find_locations
        self.assertEqual(find_locations("¿dónde venden molletes?"), [])

    def test_gps_lejos_del_campus_no_cuenta(self):
        from llm_rag.rag_utils import is_on_campus
        self.assertFalse(is_on_campus(29.13, -111.01))     # ~8 km, otra parte de Hermosillo
        self.assertTrue(is_on_campus(29.0846, -110.9625))  # junto a la cafetería de Derecho


DATOS_PRUEBA = {
    'tienditas': [
        {'id_tiendita': 1, 'nombre': 'Cafeteria Derecho', 'latitud': '29.084596', 'longitud': '-110.962472'},
        {'id_tiendita': 2, 'nombre': 'Cafeteria Artes', 'latitud': '29.081127', 'longitud': '-110.959141'},
        {'id_tiendita': 3, 'nombre': 'Cafeteria Medicina', 'latitud': '29.081320', 'longitud': '-110.969137'},
    ],
    'menus': [
        {'nombre': 'Molletes', 'precio': '45.00', 'id_tiendita': 1, 'categoria': 'Comida'},
        {'nombre': 'Mollete Sencillo', 'precio': '30.00', 'id_tiendita': 2, 'categoria': 'Comida'},
        {'nombre': 'Torta de jamon', 'precio': '50.00', 'id_tiendita': 1, 'categoria': 'Comida'},
        {'nombre': 'Paletas', 'precio': '5.00', 'id_tiendita': 3, 'categoria': 'Postres'},
        {'nombre': 'Chilaquiles', 'precio': '60.00', 'id_tiendita': 3, 'categoria': 'Desayuno'},
    ],
}


class ListaDePreciosRAGTests(TestCase):
    """Lista determinista de platillos por precio (sin llamar a AWS)."""

    def setUp(self):
        from llm_rag.rag_engine_bedrock import build_menu_items
        self.items = build_menu_items(DATOS_PRUEBA)

    def test_detecta_platillo_en_plural_y_con_acento(self):
        from llm_rag.rag_engine_bedrock import find_dish_terms
        self.assertEqual(find_dish_terms("¿dónde venden molletes?", self.items), ["mollet"])
        self.assertEqual(find_dish_terms("¿cuál es la torta de jamón más barata?", self.items), ["jamon", "torta"])

    def test_no_confunde_palabras_de_la_pregunta_con_platillos(self):
        from llm_rag.rag_engine_bedrock import find_dish_terms
        self.assertEqual(find_dish_terms("¿qué puedo comer con 40 pesos?", self.items), [])
        self.assertEqual(find_dish_terms("¿dónde desayuno?", self.items), [])

    def test_lista_de_platillo_va_del_mas_barato_al_mas_caro(self):
        from llm_rag.rag_engine_bedrock import price_list_doc
        doc = price_list_doc(self.items, ["mollet"], cheapest=False)
        lineas = doc.split("\n")[1:]
        self.assertEqual(lineas, ["- Mollete Sencillo en Cafeteria Artes ($30 MXN)",
                                  "- Molletes en Cafeteria Derecho ($45 MXN)"])

    def test_mas_barato_sin_platillo_usa_todo_el_menu(self):
        from llm_rag.rag_engine_bedrock import CHEAPEST_INTENT, price_list_doc
        self.assertTrue(CHEAPEST_INTENT.search("¿qué es lo más barato?"))
        self.assertTrue(CHEAPEST_INTENT.search("la chimichanga más económica"))
        doc = price_list_doc(self.items, [], cheapest=True)
        self.assertIn("Paletas en Cafeteria Medicina ($5 MXN)", doc.split("\n")[1])

    def test_sin_platillo_ni_mas_barato_no_agrega_lista(self):
        from llm_rag.rag_engine_bedrock import price_list_doc
        self.assertIsNone(price_list_doc(self.items, [], cheapest=False))

    def test_lista_respeta_presupuesto_y_sobrevive_al_filtro(self):
        from llm_rag.rag_engine_bedrock import filter_by_budget, price_list_doc
        doc = price_list_doc(self.items, ["mollet"], cheapest=False, budget=40)
        self.assertNotIn("$45", doc)
        self.assertEqual(filter_by_budget([doc], 40), [doc])

    def test_lista_incluye_maximo_tres_cafeterias(self):
        from llm_rag.rag_engine_bedrock import build_menu_items, price_list_doc
        datos = {'tienditas': [{'id_tiendita': n, 'nombre': f'Cafe {n}'} for n in range(1, 6)],
                 'menus': [{'nombre': 'Taco', 'precio': str(20 + n), 'id_tiendita': n} for n in range(1, 6)]}
        doc = price_list_doc(build_menu_items(datos), ["taco"], cheapest=False)
        self.assertEqual([l.split(" en ")[1] for l in doc.split("\n")[1:]],
                         ["Cafe 1 ($21 MXN)", "Cafe 2 ($22 MXN)", "Cafe 3 ($23 MXN)"])

    def test_lista_con_ubicacion_muestra_metros(self):
        from llm_rag.rag_engine_bedrock import price_list_doc
        doc = price_list_doc(self.items, ["mollet"], cheapest=False, origin=(29.0846, -110.9625))
        self.assertIn("Molletes en Cafeteria Derecho, a 3 metros ($45 MXN)", doc)


class RecuperacionRAGTests(TestCase):
    """Recuperación y ubicación del motor, con embeddings y modelo falsos (sin AWS)."""

    def setUp(self):
        import numpy as np
        from llm_rag.rag_engine_bedrock import BuhoRAGBedrock, build_documents, build_menu_items
        self.rag = BuhoRAGBedrock(data_path="/no/existe.json")
        self.rag.data = DATOS_PRUEBA
        self.rag.documents, self.rag.doc_metadata = build_documents(DATOS_PRUEBA)
        self.rag.menu_items = build_menu_items(DATOS_PRUEBA)
        # La pregunta se parece solo a los documentos de Medicina (la más lejana de Derecho)
        self.rag.embeddings = np.array(
            [[1.0, 0.0] if m['id'] == 3 else [0.0, 1.0] for m in self.rag.doc_metadata], dtype=np.float32)
        self.rag._embed = lambda text: np.array([1.0, 0.0], dtype=np.float32)
        self.prompts = []

        def converse(model_id, system, messages, max_tokens):
            self.prompts.append((system, messages[-1]["content"][0]["text"]))
            return "Cafetería Artes"  # la reformulación "copia" una cafetería del historial
        self.rag._converse = converse

    def test_con_ubicacion_entra_la_cafeteria_mas_cercana(self):
        docs = self.rag._retrieve_context("algo", 29.0846, -110.9625, k=1)
        self.assertIn("CAFETERÍA: Cafeteria Derecho", docs[0])
        self.assertIn("DISTANCIA: 3 metros", docs[0])

    def test_lugar_del_historial_sale_de_lo_que_escribio_el_usuario(self):
        historial = [("estoy en medicina", "Cerca de Medicina está Cafeteria Medicina")]
        resultado = self.rag.query("¿y algo con 30 pesos?", history=historial)
        self.assertEqual(resultado['location_used'], "MEDICINA")

    def test_reformulacion_no_inventa_ubicacion(self):
        historial = [("¿dónde venden molletes?", "• Cafeteria Artes: Mollete Sencillo ($30)")]
        resultado = self.rag.query("¿y cuál es el más barato?", history=historial)
        self.assertIsNone(resultado['location_used'])

    def test_platillo_agrega_lista_de_precios_al_contexto(self):
        resultado = self.rag.query("¿dónde venden molletes?", history=[])
        self.assertTrue(resultado['context'][0].startswith("PLATILLOS QUE COINCIDEN"))
        self.assertIn("Mollete Sencillo en Cafeteria Artes ($30 MXN)", self.prompts[-1][1])
