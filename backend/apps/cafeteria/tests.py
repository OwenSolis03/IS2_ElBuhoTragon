"""
Pruebas de seguridad de la API (regresión de la auditoría run-1).

Ejecutar desde backend/:  DJANGO_DEBUG=true python manage.py test apps.cafeteria
Usan una BD de prueba temporal; no tocan el_buho_tragon.db ni cargan el RAG.
"""
from unittest import mock

from django.contrib.auth.hashers import check_password, make_password
from django.core.cache import cache
from django.test import TestCase
from django.urls import Resolver404, resolve
from django.utils import timezone
from rest_framework.test import APIClient

from apps.cafeteria.models import Facultades, Resenas, Tienditas, Usuarios

PASSWORD = 'Buho-Tragon-2026!'


def crear_usuario(nombre, es_admin=0):
    return Usuarios.objects.create(
        nombre_usuario=nombre, email=f'{nombre}@example.test',
        contrasena=make_password(PASSWORD), es_admin=es_admin, fecha_registro=timezone.now(),
    )


class BaseAPITest(TestCase):
    def setUp(self):
        cache.clear()  # los throttles guardan su estado en la caché
        self.client = APIClient()
        self.facultad = Facultades.objects.create(nombre='Sociales')
        self.tienda = Tienditas.objects.create(nombre='Cafeteria Derecho', id_facultad=self.facultad)
        self.admin = crear_usuario('admin', es_admin=1)
        self.ana = crear_usuario('ana')
        self.beto = crear_usuario('beto')

    def login(self, usuario):
        res = self.client.post('/api/login/', {'username': usuario.nombre_usuario, 'password': PASSWORD}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        return res.data['access_token']

    def como(self, usuario):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.login(usuario)}')
        return client


class CatalogoTests(BaseAPITest):
    def test_lectura_publica(self):
        self.assertEqual(self.client.get('/api/Tienditas/').status_code, 200)

    def test_anonimo_no_escribe(self):
        self.assertIn(self.client.post('/api/Menus/', {'nombre': 'x', 'precio': '1.00', 'id_tiendita': self.tienda.pk}, format='json').status_code, (401, 403))
        self.assertIn(self.client.delete(f'/api/Tienditas/{self.tienda.pk}/').status_code, (401, 403))
        self.assertTrue(Tienditas.objects.filter(pk=self.tienda.pk).exists())

    def test_usuario_normal_no_escribe(self):
        res = self.como(self.ana).patch(f'/api/Tienditas/{self.tienda.pk}/', {'nombre': 'hackeada'}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_admin_escribe(self):
        res = self.como(self.admin).post('/api/Menus/', {'nombre': 'Mollete', 'precio': '30.00', 'id_tiendita': self.tienda.pk}, format='json')
        self.assertEqual(res.status_code, 201, res.data)

    def test_imagen_url_rechaza_esquemas_raros(self):
        res = self.como(self.admin).patch(f'/api/Tienditas/{self.tienda.pk}/', {'imagen_url': 'http://tracker.example/x.png'}, format='json')
        self.assertEqual(res.status_code, 400)


class UsuariosTests(BaseAPITest):
    def test_anonimo_no_lista_usuarios(self):
        self.assertEqual(self.client.get('/api/Usuarios/').status_code, 401)

    def test_usuario_no_ve_ni_edita_a_otro(self):
        ana = self.como(self.ana)
        self.assertEqual(ana.get('/api/Usuarios/').status_code, 403)
        self.assertEqual(ana.patch(f'/api/Usuarios/{self.beto.pk}/', {'email': 'x@example.test'}, format='json').status_code, 403)
        self.assertEqual(ana.delete(f'/api/Usuarios/{self.beto.pk}/').status_code, 403)

    def test_perfil_propio_sin_hash_y_sin_escalar(self):
        ana = self.como(self.ana)
        res = ana.get(f'/api/Usuarios/{self.ana.pk}/')
        self.assertEqual(res.status_code, 200)
        self.assertNotIn('contrasena', res.data)
        ana.patch(f'/api/Usuarios/{self.ana.pk}/', {'es_admin': 1}, format='json')
        self.ana.refresh_from_db()
        self.assertEqual(self.ana.es_admin, 0)

    def test_cambio_de_contrasena_se_hashea(self):
        nueva = 'Otra-Clave-Segura-9'
        res = self.como(self.ana).patch(f'/api/Usuarios/{self.ana.pk}/', {'contrasena': nueva}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.ana.refresh_from_db()
        self.assertTrue(check_password(nueva, self.ana.contrasena))

    def test_no_se_crean_usuarios_por_el_viewset(self):
        res = self.client.post('/api/Usuarios/', {'nombre_usuario': 'x', 'contrasena': PASSWORD, 'es_admin': 1}, format='json')
        self.assertIn(res.status_code, (401, 403, 405))


class RegistroYLoginTests(BaseAPITest):
    def test_registro_fuerza_no_admin(self):
        res = self.client.post('/api/register', {'nombre_usuario': 'nuevo', 'email': 'n@example.test', 'contrasena': PASSWORD, 'es_admin': 1}, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(Usuarios.objects.get(nombre_usuario='nuevo').es_admin, 0)

    def test_registro_rechaza_contrasena_debil(self):
        res = self.client.post('/api/register', {'nombre_usuario': 'debil', 'email': 'd@example.test', 'contrasena': '1234'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_nombre_duplicado_no_bloquea_login(self):
        res = self.client.post('/api/register', {'nombre_usuario': 'ANA', 'email': 'otra@example.test', 'contrasena': PASSWORD}, format='json')
        self.assertEqual(res.status_code, 400)
        # Aunque la BD histórica ya tenga duplicados, el login de la víctima sigue funcionando
        Usuarios.objects.create(nombre_usuario='ana', contrasena=make_password('otra'), fecha_registro=timezone.now())
        self.login(self.ana)

    def test_mensaje_de_error_uniforme(self):
        a = self.client.post('/api/login/', {'username': 'no-existe', 'password': 'x'}, format='json')
        b = self.client.post('/api/login/', {'username': 'ana', 'password': 'x'}, format='json')
        self.assertEqual((a.status_code, a.data), (b.status_code, b.data))

    def test_login_tiene_limite_de_intentos(self):
        codigos = [self.client.post('/api/login/', {'username': 'ana', 'password': 'mal'}, format='json').status_code for _ in range(11)]
        self.assertEqual(codigos[-1], 429)

    def test_endpoint_token_eliminado(self):
        # Se comprueba el enrutado directamente: renderizar la página 404 en el cliente de
        # pruebas falla con Django 5.1 + Python 3.14 (incompatibilidad ajena a la app).
        for ruta in ('/api/token', '/api/token/refresh/'):
            with self.assertRaises(Resolver404):
                resolve(ruta)


class ResenasTests(BaseAPITest):
    def test_anonimo_no_publica(self):
        res = self.client.post('/api/Resenas/', {'id_tiendita': self.tienda.pk, 'calificacion': 5}, format='json')
        self.assertEqual(res.status_code, 401)

    def test_autor_sale_del_token(self):
        res = self.como(self.ana).post('/api/Resenas/', {'id_tiendita': self.tienda.pk, 'calificacion': 4, 'id_usuario': self.beto.pk}, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(Resenas.objects.get(pk=res.data['id_resena']).id_usuario_id, self.ana.pk)

    def test_no_se_borra_resena_ajena(self):
        resena = Resenas.objects.create(id_tiendita=self.tienda, id_usuario=self.ana, calificacion=5)
        self.assertEqual(self.como(self.beto).delete(f'/api/Resenas/{resena.pk}/').status_code, 403)
        self.assertEqual(self.como(self.admin).delete(f'/api/Resenas/{resena.pk}/').status_code, 204)

    def test_listado_sin_n_mas_1(self):
        for _ in range(10):
            Resenas.objects.create(id_tiendita=self.tienda, id_usuario=self.ana, calificacion=3)
        with self.assertNumQueries(1):
            self.client.get('/api/Resenas/')


class ChatbotTests(BaseAPITest):
    def _stub(self):
        rag = mock.Mock()
        rag.query.return_value = {'answer': 'ok', 'context': []}
        return mock.patch('apps.cafeteria.views.get_rag_instance', return_value=rag), \
            mock.patch('apps.cafeteria.views.RAG_AVAILABLE', True)

    def test_x_forwarded_for_no_evade_el_limite(self):
        p1, p2 = self._stub()
        with p1, p2:
            codigos = [
                self.client.post('/api/chatbot/', {'message': 'hola'}, format='json', HTTP_X_FORWARDED_FOR=f'10.0.0.{i}').status_code
                for i in range(16)
            ]
        self.assertEqual(codigos[-1], 429)
