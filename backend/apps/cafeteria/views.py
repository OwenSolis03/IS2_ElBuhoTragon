# backend/apps/cafeteria/views.py
"""
Vistas de la API - El Búho Tragón
Incluye: Autenticación, CRUD de recursos, Chatbot RAG
"""

import sys
import os
import logging

# Django & DRF imports
from django.http import HttpResponse
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone
from rest_framework import viewsets, filters, generics, status
from rest_framework.views import APIView
from rest_framework.serializers import ModelSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend

# Modelos y Serializadores
from .models import Tienditas, Facultades, Menus, Usuarios, Resenas
from .serializers import (
    TienditasSerializer,
    FacultadesSerializer,
    MenusSerializer,
    UsuariosSerializer,
    ResenaSerializer
)

# Configurar logging
logger = logging.getLogger(__name__)


# ========================================
# AUTENTICACIÓN
# ========================================

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Login personalizado con JWT
    Body: { "username": "...", "password": "..." }
    """
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response(
            {'success': False, 'error': 'Faltan credenciales'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user_exists = Usuarios.objects.filter(nombre_usuario=username).exists()

        if not user_exists:
            return Response(
                {'success': False, 'error': 'Usuario no encontrado'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        user = Usuarios.objects.get(nombre_usuario=username)

        # Verificación segura de contraseña (hash)
        if not check_password(password, user.contrasena):
            return Response(
                {'success': False, 'error': 'Credenciales inválidas'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Login exitoso - Generar tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            'success': True,
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'username': user.nombre_usuario,
            'es_admin': user.es_admin
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error en login: {e}", exc_info=True)
        return Response(
            {'success': False, 'error': 'Error del servidor'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class UserRegisterSerializer(ModelSerializer):
    """Serializador para registro de usuarios con Hashing"""
    class Meta:
        model = Usuarios
        fields = ['nombre_usuario', 'email', 'contrasena']
        extra_kwargs = {'contrasena': {'write_only': True}}

    def create(self, validated_data):
        # AQUI ESTA EL CAMBIO DE SEGURIDAD
        validated_data['contrasena'] = make_password(validated_data['contrasena'])
        validated_data['es_admin'] = 0
        validated_data['fecha_registro'] = timezone.now()
        return Usuarios.objects.create(**validated_data)


class UserRegisterView(generics.CreateAPIView):
    """Endpoint para registro de nuevos usuarios"""
    queryset = Usuarios.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [AllowAny]


class UsuarioActualView(APIView):
    """Verifica si el usuario está autenticado"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'status': 'ok'})


# ========================================
# VIEWSETS DE RECURSOS
# ========================================

class TienditasViewSet(viewsets.ModelViewSet):
    """CRUD de Cafeterías"""
    queryset = Tienditas.objects.all()
    serializer_class = TienditasSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre']


class MenusViewSet(viewsets.ModelViewSet):
    """CRUD de Menús"""
    queryset = Menus.objects.all()
    serializer_class = MenusSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['id_tiendita', 'categoria']
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['precio']


class FacultadesViewSet(viewsets.ModelViewSet):
    """CRUD de Facultades"""
    queryset = Facultades.objects.all()
    serializer_class = FacultadesSerializer


class UsuariosViewSet(viewsets.ModelViewSet):
    """CRUD de Usuarios"""
    queryset = Usuarios.objects.all()
    serializer_class = UsuariosSerializer


# --- AQUI ESTA EL CAMBIO NUCLEAR PARA LAS RESEÑAS ---
class ResenaViewSet(viewsets.ModelViewSet):
    """
    CRUD de Reseñas - MODIFICADO PARA DEMO
    Se ha deshabilitado la seguridad estricta para permitir el flujo sin tokens complejos.
    El Frontend DEBE enviar 'id_usuario'.
    """
    queryset = Resenas.objects.all()
    serializer_class = ResenaSerializer

    # 1. Esto evita que Django intente leer el Token y falle
    authentication_classes = []
    # 2. Esto deja pasar la petición sin preguntar quién es
    permission_classes = [AllowAny]

    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['id_tiendita']
    ordering_fields = ['fecha_registro', 'calificacion']
    ordering = ['-fecha_registro']

    def perform_create(self, serializer):
        # Guardamos directamente usando el id_usuario que viene del frontend
        # Ya no intentamos leer self.request.user
        serializer.save()
# ----------------------------------------------------


class MenusPorTiendita(generics.ListAPIView):
    """Lista los menús de una cafetería específica"""
    serializer_class = MenusSerializer

    def get_queryset(self):
        tiendita_id = self.kwargs['tiendita_id']
        return Menus.objects.filter(id_tiendita=tiendita_id)


# ========================================
# CHATBOT RAG (Mantenido intacto)
# ========================================

# Importar el motor RAG
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../llm_rag'))

try:
    from rag_engine import BuhoRAG
    RAG_AVAILABLE = True
except ImportError as e:
    logger.warning(f"[WARN] RAG no disponible: {e}")
    RAG_AVAILABLE = False
    BuhoRAG = None

# Instancia global del RAG (Singleton)
_rag_instance = None


def get_rag_instance():
    """
    Obtiene o crea la instancia del RAG (Lazy Loading)
    Esto evita cargar el modelo hasta que sea necesario
    """
    global _rag_instance

    if not RAG_AVAILABLE:
        raise RuntimeError("RAG engine no está disponible")

    if _rag_instance is None:
        logger.info("[Buho] Inicializando RAG por primera vez...")
        _rag_instance = BuhoRAG()
        _rag_instance.load_data()
        _rag_instance.build_index()
        logger.info("[OK] RAG inicializado correctamente")

    return _rag_instance


# Reemplaza SOLO esta función en tu views.py existente
# (desde la línea 227 aproximadamente, donde empieza @api_view(['POST']))

@api_view(['POST'])
@permission_classes([AllowAny])
def chatbot_query(request):
    """
    Endpoint para el chatbot RAG
    """
    try:
        # Validar entrada
        message = request.data.get('message', '').strip()
        user_lat = request.data.get('lat')
        user_lon = request.data.get('lon')

        if not message:
            return Response(
                {
                    'success': False,
                    'error': 'El mensaje no puede estar vacío'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar disponibilidad del RAG
        if not RAG_AVAILABLE:
            return Response(
                {
                    'success': False,
                    'error': 'El chatbot no está disponible en este momento'
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # Comandos especiales
        if message.lower() in ['reset', 'reiniciar', 'borrar historial', 'limpiar']:
            rag = get_rag_instance()
            rag.reset_conversation()
            return Response({
                'success': True,
                'answer': 'Conversacion reiniciada. En que puedo ayudarte ahora?',
                'metadata': {'command': 'reset'}
            })

        # Procesar consulta normal
        logger.info(f"[Chat] Consulta chatbot: {message[:50]}...")
        rag = get_rag_instance()
        result = rag.query(message, user_lat=user_lat, user_lon=user_lon)

        # FIX: Verificar que los saltos de línea están presentes
        answer_text = result['answer']
        logger.info(f"[Chat] Respuesta con {answer_text.count(chr(10))} saltos de linea")

        return Response({
            'success': True,
            'answer': answer_text,
            'metadata': {
                'budget_detected': result.get('budget_detected'),
                'location_used': result.get('location_used'),
                'context_docs': len(result.get('context', [])),
                'conversation_length': len(rag.chat_history)
            }
        }, status=status.HTTP_200_OK)

    except RuntimeError as e:
        logger.error(f"[ERROR] Error de configuracion RAG: {e}")
        return Response({
            'success': False,
            'error': 'El servicio de chatbot no está configurado correctamente'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    except Exception as e:
        logger.error(f"[ERROR] Error inesperado en chatbot: {e}", exc_info=True)
        return Response({
            'success': False,
            'error': 'Ups, algo salio mal. Puedes intentar de nuevo?'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ========================================
# UTILIDADES
# ========================================

def home(request):
    """Página de inicio de la API"""
    return HttpResponse("""
        <html>
            <head>
                <title>El Búho Tragón API</title>
                <style>
                    body { 
                        font-family: system-ui; 
                        max-width: 600px; 
                        margin: 50px auto; 
                        padding: 20px;
                        background: #f5f5f5;
                    }
                    h1 { color: #4b3423; }
                    .status { 
                        background: #4ade80; 
                        color: white; 
                        padding: 10px; 
                        border-radius: 5px; 
                    }
                </style>
            </head>
            <body>
                <h1>🦉 El Búho Tragón API</h1>
                <div class="status">✅ Sistema Activo</div>
                <p>Endpoints disponibles:</p>
                <ul>
                    <li><code>/api/Tienditas/</code> - Cafeterías</li>
                    <li><code>/api/Menus/</code> - Menús</li>
                    <li><code>/api/Resenas/</code> - Reseñas</li>
                    <li><code>/api/chatbot/</code> - Chatbot RAG</li>
                    <li><code>/api/login/</code> - Autenticación</li>
                </ul>
            </body>
        </html>
    """)