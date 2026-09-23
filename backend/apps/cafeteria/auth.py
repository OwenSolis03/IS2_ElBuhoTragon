"""
Autenticación y permisos sobre la tabla Usuarios de la app.

Los tokens se emiten en login_view para Usuarios (no para django.contrib.auth.User),
así que el JWT se resuelve contra Usuarios y lleva un claim que lo distingue de
cualquier otro token firmado con la misma SECRET_KEY.
"""
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import SAFE_METHODS, BasePermission
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.settings import api_settings

from .models import Usuarios

TOKEN_APP_CLAIM = 'app'
TOKEN_APP_VALUE = 'usuarios'


class UsuariosJWTAuthentication(JWTAuthentication):
    """JWTAuthentication que resuelve el usuario en Usuarios en vez de auth.User."""

    def get_user(self, validated_token):
        if validated_token.get(TOKEN_APP_CLAIM) != TOKEN_APP_VALUE:
            raise InvalidToken('Token no emitido para usuarios de la app')
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise InvalidToken('El token no identifica a un usuario')
        try:
            return Usuarios.objects.get(id_usuarios=user_id)
        except Usuarios.DoesNotExist:
            raise AuthenticationFailed('Usuario no encontrado', code='user_not_found')


def es_admin_app(user) -> bool:
    return isinstance(user, Usuarios) and user.es_admin == 1


class IsAppAdminOrReadOnly(BasePermission):
    """Lectura pública; escritura solo para administradores de la app."""

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or es_admin_app(request.user)


class IsSelfOrAppAdmin(BasePermission):
    """Un usuario solo ve/edita su propio registro; el listado completo es solo para admins."""

    def has_permission(self, request, view):
        if not isinstance(request.user, Usuarios):
            return False
        if getattr(view, 'action', None) == 'list':
            return es_admin_app(request.user)
        return True

    def has_object_permission(self, request, view, obj):
        return obj.pk == request.user.pk or es_admin_app(request.user)


class IsReviewOwnerOrAppAdmin(BasePermission):
    """Las reseñas se leen públicamente; solo su autor o un admin las modifica o borra."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.id_usuario_id == request.user.pk or es_admin_app(request.user)
