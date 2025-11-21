from rest_framework import viewsets, filters, generics
# --- IMPORTACIONES QUE FALTABAN ---
from rest_framework.views import APIView
from rest_framework.serializers import ModelSerializer
# ----------------------------------
from django.contrib.auth.hashers import check_password, make_password
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import api_view 
from rest_framework.response import Response
from rest_framework import status 
from rest_framework_simplejwt.tokens import RefreshToken
from django.http import HttpResponse

# Importamos Modelos y Serializadores (incluyendo Resenas)
from .models import Tienditas, Facultades, Menus, Usuarios, Resenas
from .serializers import TienditasSerializer, FacultadesSerializer, MenusSerializer, UsuariosSerializer, ResenaSerializer

@api_view(['POST'])
def login_view(request):
    print("====== DEBUG LOGIN VIEW ======")
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response({'success': False, 'error': 'Faltan credenciales'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user_exists = Usuarios.objects.filter(nombre_usuario=username).exists()
        if user_exists:
            user = Usuarios.objects.get(nombre_usuario=username)
            if check_password(password, user.contrasena):
                refresh = RefreshToken.for_user(user)
                return Response({
                    'success': True,
                    'access_token': str(refresh.access_token),
                    'refresh_token': str(refresh),
                    'username': user.nombre_usuario,
                    'es_admin': user.es_admin
                }, status=status.HTTP_200_OK)
            else:
                return Response({'success': False, 'error': 'Credenciales inválidas'}, status=status.HTTP_401_UNAUTHORIZED)
        else:
            return Response({'success': False, 'error': 'Usuario no encontrado'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'success': False, 'error': 'Error servidor'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- VIEWSETS ---

class MenusViewSet(viewsets.ModelViewSet):
    queryset = Menus.objects.all()
    serializer_class = MenusSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['id_tiendita']
    search_fields = ['nombre']

class TienditasViewSet(viewsets.ModelViewSet):
    queryset = Tienditas.objects.all()
    serializer_class = TienditasSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre']

class FacultadesViewSet(viewsets.ModelViewSet): 
    queryset = Facultades.objects.all()
    serializer_class = FacultadesSerializer

class UsuariosViewSet(viewsets.ModelViewSet): 
    queryset = Usuarios.objects.all()
    serializer_class = UsuariosSerializer

# --- VIEWSET DE RESEÑAS ---
class ResenaViewSet(viewsets.ModelViewSet):
    queryset = Resenas.objects.all()
    serializer_class = ResenaSerializer
    # Solo usuarios logueados pueden comentar, cualquiera puede leer
    permission_classes = [IsAuthenticatedOrReadOnly] 
    
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['id_tiendita'] # Vital para filtrar por cafetería
    ordering_fields = ['fecha_registro', 'calificacion']
    ordering = ['-fecha_registro'] # Las más nuevas primero

    def perform_create(self, serializer):
        # Asigna automáticamente el usuario que hace la petición
        try:
            usuario_app = Usuarios.objects.get(nombre_usuario=self.request.user.username)
            serializer.save(id_usuario=usuario_app)
        except:
            # Fallback por si acaso
            serializer.save()

class UsuarioActualView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        return Response({'status': 'ok'})

class MenusPorTiendita(generics.ListAPIView):
    serializer_class = MenusSerializer
    def get_queryset(self):
        tiendita_id = self.kwargs['tiendita_id']
        return Menus.objects.filter(id_tiendita=tiendita_id)


# --- REGISTRO ---
class UserRegisterSerializer(ModelSerializer):
    class Meta:
        model = Usuarios
        fields = ['nombre_usuario', 'email', 'contrasena']
        extra_kwargs = {'contrasena': {'write_only': True}}
    def create(self, validated_data):
        from django.utils import timezone
        validated_data['contrasena'] = make_password(validated_data['contrasena'])
        validated_data['es_admin'] = 0
        validated_data['fecha_registro'] = timezone.now()
        return Usuarios.objects.create(**validated_data)

class UserRegisterView(generics.CreateAPIView):
    queryset = Usuarios.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [AllowAny]

def home(request): 
    return HttpResponse("<h1>API Activa</h1>")