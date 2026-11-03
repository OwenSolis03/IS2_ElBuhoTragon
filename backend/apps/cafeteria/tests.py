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
