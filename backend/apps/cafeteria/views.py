# backend/apps/cafeteria/views.py
"""
Vistas de la API - El Búho Tragón
Incluye: Autenticación, CRUD de recursos, Chatbot RAG
"""

import sys
import os
import logging
import threading

# Django & DRF imports
from django.http import HttpResponse
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone
from rest_framework import viewsets, filters, generics, status
from rest_framework.views import APIView
from rest_framework.serializers import ModelSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend

# Modelos y Serializadores
from .auth import (
    TOKEN_APP_CLAIM,
    TOKEN_APP_VALUE,
    IsAppAdminOrReadOnly,
    IsReviewOwnerOrAppAdmin,
    IsSelfOrAppAdmin,
)
from .models import Tienditas, Facultades, Menus, Usuarios, Resenas
from .serializers import (
    TienditasSerializer,
    FacultadesSerializer,
    MenusSerializer,
    UsuariosSerializer,
    ResenaSerializer,
    validar_contrasena,
    validar_nombre_usuario_unico,
)

# Configurar logging
logger = logging.getLogger(__name__)


# ========================================
# AUTENTICACIÓN
# ========================================

class LoginRateThrottle(AnonRateThrottle):
    """Limita la adivinación de contraseñas por IP."""
    scope = 'login'
    rate = '10/min'


class RegisterRateThrottle(AnonRateThrottle):
    """Cada registro crea una fila y calcula un hash PBKDF2: limitar por IP."""
    scope = 'register'
    rate = '20/hour'


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def login_view(request):
    """
    Login personalizado con JWT
    Body: { "username": "...", "password": "..." }
    """
    username = request.data.get('username')
    password = request.data.get('password')

    if not isinstance(username, str) or not isinstance(password, str) or not username or not password:
        return Response(
            {'success': False, 'error': 'Faltan credenciales'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # nombre_usuario no es único en la BD histórica: se prueba cada coincidencia
        # en vez de .get(), que fallaba con duplicados y bloqueaba el login.
        candidatos = list(Usuarios.objects.filter(nombre_usuario=username))
        user = next((u for u in candidatos if check_password(password, u.contrasena)), None)

        if user is None:
            if not candidatos:
                make_password(password)  # mismo costo que un usuario existente (sin oráculo de tiempo)
            # Mismo mensaje para usuario inexistente y contraseña incorrecta
            return Response(
                {'success': False, 'error': 'Usuario o contraseña incorrectos'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Login exitoso - Generar tokens (marcados como tokens de Usuarios, ver auth.py)
        refresh = RefreshToken.for_user(user)
        refresh[TOKEN_APP_CLAIM] = TOKEN_APP_VALUE
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

    def validate_nombre_usuario(self, value):
        return validar_nombre_usuario_unico(value)

    def validate_contrasena(self, value):
        return validar_contrasena(value)

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
    throttle_classes = [RegisterRateThrottle]


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
    permission_classes = [IsAppAdminOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre']


class MenusViewSet(viewsets.ModelViewSet):
    """CRUD de Menús"""
    queryset = Menus.objects.all()
    serializer_class = MenusSerializer
    permission_classes = [IsAppAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['id_tiendita', 'categoria']
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['precio']


class FacultadesViewSet(viewsets.ModelViewSet):
    """CRUD de Facultades"""
    queryset = Facultades.objects.all()
    serializer_class = FacultadesSerializer
    permission_classes = [IsAppAdminOrReadOnly]


class UsuariosViewSet(viewsets.ModelViewSet):
    """Perfil de usuario: cada quien el suyo; el listado es solo para admins.
    El alta de usuarios se hace en /api/register."""
    queryset = Usuarios.objects.all()
    serializer_class = UsuariosSerializer
    permission_classes = [IsSelfOrAppAdmin]
    http_method_names = ['get', 'put', 'patch', 'delete', 'head', 'options']
    ordering_fields = ['nombre_usuario', 'fecha_registro']


class ResenaViewSet(viewsets.ModelViewSet):
    """CRUD de Reseñas: lectura pública; crear requiere sesión; editar/borrar solo autor o admin."""
    queryset = Resenas.objects.select_related('id_usuario')
    serializer_class = ResenaSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsReviewOwnerOrAppAdmin]

    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['id_tiendita']
    ordering_fields = ['fecha_registro', 'calificacion']
    ordering = ['-fecha_registro']

    def perform_create(self, serializer):
        # El autor sale del token, nunca del cuerpo de la petición
        serializer.save(id_usuario=self.request.user)


class MenusPorTiendita(generics.ListAPIView):
    """Lista los menús de una cafetería específica"""
    serializer_class = MenusSerializer

    def get_queryset(self):
        tiendita_id = self.kwargs['tiendita_id']
        return Menus.objects.filter(id_tiendita=tiendita_id)


# ========================================
# CHATBOT RAG (Mantenido intacto)
# ========================================

# Importar el motor RAG (paquete llm_rag/ en la raíz del repo)
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..'))

try:
    from llm_rag import get_rag_engine
    RAG_AVAILABLE = True
except ImportError as e:
    logger.warning(f"[WARN] RAG no disponible: {e}")
    RAG_AVAILABLE = False
    get_rag_engine = None

# Límites defensivos para el historial que envía el cliente (no confiar en input externo)
MAX_HISTORY_TURNS = 6
MAX_HISTORY_CHARS = 1000
MAX_MESSAGE_CHARS = 500

# El RAG atiende una consulta a la vez (un solo GPU): acotar cuántas pueden esperar
# en cola para que un pico no deje hilos bloqueados indefinidamente.
MAX_PENDING_CHAT = 8
_chat_slots = threading.BoundedSemaphore(MAX_PENDING_CHAT)


class ChatbotRateThrottle(UserRateThrottle):
    """Cada consulta ocupa el LLM varios segundos: limitar por usuario/IP."""
    scope = 'chatbot'
    rate = '15/min'


def _sanitize_history(raw):
    """
    Valida y acota el historial de conversación enviado por el cliente.
    El historial vive en el frontend (stateless en el servidor) para evitar
    que todas las conversaciones de todos los usuarios compartan el mismo
    estado en memoria del proceso RAG.
    """
    if not isinstance(raw, list):
        return []

    sanitized = []
    for item in raw[-MAX_HISTORY_TURNS:]:
        if isinstance(item, (list, tuple)) and len(item) == 2:
            q, a = item
            if isinstance(q, str) and isinstance(a, str):
                sanitized.append((q[:MAX_HISTORY_CHARS], a[:MAX_HISTORY_CHARS]))
    return sanitized


def get_rag_instance():
    """
    Obtiene la instancia Singleton del RAG (Lazy Loading vía llm_rag.get_rag_engine).
    """
    if not RAG_AVAILABLE:
        raise RuntimeError("RAG engine no está disponible")

    return get_rag_engine()


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ChatbotRateThrottle])
def chatbot_query(request):
    """
    Endpoint para el chatbot RAG
    """
    try:
        # Validar entrada
        message = request.data.get('message', '')
        message = message.strip() if isinstance(message, str) else ''
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

        if len(message) > MAX_MESSAGE_CHARS:
            return Response(
                {
                    'success': False,
                    'error': f'El mensaje es muy largo (máximo {MAX_MESSAGE_CHARS} caracteres)'
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

        # El historial de conversación vive en el cliente y se reenvía en cada
        # request: el RAG no guarda estado por usuario (ver _sanitize_history).
        history = _sanitize_history(request.data.get('history'))

        # Comandos especiales
        if message.lower() in ['reset', 'reiniciar', 'borrar historial', 'limpiar']:
            return Response({
                'success': True,
                'answer': 'Conversacion reiniciada. En que puedo ayudarte ahora?',
                'metadata': {'command': 'reset'}
            })

        # Procesar consulta normal
        logger.info(f"[Chat] Consulta chatbot: {message[:50]}...")
        if not _chat_slots.acquire(blocking=False):
            return Response(
                {
                    'success': False,
                    'error': 'El Buhito está atendiendo muchas preguntas. Intenta en un momento.'
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        try:
            rag = get_rag_instance()
            result = rag.query(message, user_lat=user_lat, user_lon=user_lon, history=history)
        finally:
            _chat_slots.release()

        answer_text = result['answer']

        return Response({
            'success': True,
            'answer': answer_text,
            'metadata': {
                'budget_detected': result.get('budget_detected'),
                'location_used': result.get('location_used'),
                'context_docs': len(result.get('context', [])),
                'conversation_length': len(history) + 1
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