# backend/apps/cafeteria/views.py
from rest_framework import serializers
from rest_framework import viewsets
from django.contrib.auth.hashers import make_password
from django.contrib.auth.hashers import check_password
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, filters
from rest_framework import generics, filters
from .models import Tienditas, Facultades, Menus, Usuarios, Resenas
from .serializers import TienditasSerializer, FacultadesSerializer, MenusSerializer, UsuariosSerializer, ResenaSerializer
from django.shortcuts import render
from rest_framework.serializers import ModelSerializer
from django.http import HttpResponse
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view
from rest_framework_simplejwt.tokens import RefreshToken


# --- TODO TU CÓDIGO ORIGINAL SE MANTIENE EXACTAMENTE IGUAL ---

@api_view(['POST'])
def login_view(request):
    # ... (Tu código de login se mantiene igual) ...
    print("====== DEBUG LOGIN VIEW ======")
    print("Request data:", request.data)

    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response({
            'success': False,
            'error': 'Faltan credenciales'
        }, status=status.HTTP_400_BAD_REQUEST)

    print(f"Intentando autenticar usuario: {username}")

    try:
        user_exists = Usuarios.objects.filter(nombre_usuario=username).exists()
        print(f"¿Usuario existe? {user_exists}")

        if user_exists:
            user = Usuarios.objects.get(nombre_usuario=username)
            print(f"Usuario encontrado: ID={user.id_usuarios}")

            if check_password(password, user.contrasena):
                print("Autenticación exitosa")

                # NOTA: simplejwt espera el modelo User de Django.
                # Se crea un usuario temporal para generar el token.
                temp_user, _ = User.objects.get_or_create(username=user.nombre_usuario)
                refresh = RefreshToken.for_user(temp_user)

                # --- CAMBIO REALIZADO AQUÍ ---
                # Agregamos 'username' y 'es_admin' a la respuesta
                return Response({
                    'success': True,
                    'access_token': str(refresh.access_token),
                    'refresh_token': str(refresh),
                    'username': user.nombre_usuario,  # Nombre para mostrar en el Header
                    'es_admin': user.es_admin         # 1 si es admin, 0 si no
                }, status=status.HTTP_200_OK)

            else:
                print("Contraseña incorrecta")
                return Response({
                    'success': False,
                    'error': 'Credenciales inválidas'
                }, status=status.HTTP_401_UNAUTHORIZED)
        else:
            print("Usuario no encontrado")
            return Response({
                'success': False,
                'error': 'Usuario no encontrado'
            }, status=status.HTTP_401_UNAUTHORIZED)

    except Exception as e:
        print(f"Error en login_view: {str(e)}")
        return Response({
            'success': False,
            'error': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MenusViewSet(viewsets.ModelViewSet):
    # ... (Tu código se mantiene igual) ...
    queryset = Menus.objects.all()
    serializer_class = MenusSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['id_tiendita']
    search_fields    = ['nombre']
    ordering_fields  = ['nombre']

class TienditasViewSet(viewsets.ModelViewSet):
    queryset = Tienditas.objects.all()
    serializer_class = TienditasSerializer
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    filterset_fields = ['id_facultad']
    
    search_fields = ['nombre']
    ordering_fields = ['nombre']


class FacultadesViewSet(viewsets.ModelViewSet):
    queryset = Facultades.objects.all()
    serializer_class = FacultadesSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre']


class UsuariosViewSet(viewsets.ModelViewSet):
    queryset = Usuarios.objects.all()
    serializer_class = UsuariosSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre']

class UsuarioActualView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            usuario = Usuarios.objects.get(nombre_usuario=request.user.username)
            return Response({
                'nombre_usuario': usuario.nombre_usuario,
                'id': usuario.id_usuarios,
            })
        except Usuarios.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

class MenusPorTiendita(generics.ListAPIView):
    serializer_class = MenusSerializer
    def get_queryset(self):
        tiendita_id = self.kwargs['tiendita_id']
        return Menus.objects.filter(tiendita_id=tiendita_id)

#Serializer para crear usuarios
class UserRegisterSerializer(ModelSerializer):
    class Meta:
        model = Usuarios
        fields = ['nombre_usuario', 'email', 'contrasena']
        extra_kwargs = {
            'contrasena': {'write_only': True},
        }

    def create(self, validated_data):
        contrasena = validated_data['contrasena']
        hashed_password = make_password(contrasena)
        validated_data['contrasena'] = hashed_password
        return Usuarios.objects.create(**validated_data)

class UserRegisterView(generics.CreateAPIView):
    queryset = User.objects.all() 
    serializer_class = UserRegisterSerializer
    permission_classes = [AllowAny]

def perform_create(self, serializer):
    user = serializer.save()

def home(request): 
    return HttpResponse("<h1>Vista previa<h1>")
