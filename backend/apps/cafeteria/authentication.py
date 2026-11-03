"""
Autenticación JWT contra el modelo propio `Usuarios`.

El JWTAuthentication de Simple JWT busca al usuario en `auth_user` (el modelo
de Django), pero los tokens de /api/login/ se emiten para `Usuarios`. Esta
clase resuelve el claim `user_id` contra la tabla correcta.
"""

from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.settings import api_settings

from .models import Usuarios


class UsuariosJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise InvalidToken('El token no contiene identificación de usuario')

        try:
            return Usuarios.objects.get(id_usuarios=user_id)
        except Usuarios.DoesNotExist:
            raise AuthenticationFailed('Usuario no encontrado', code='user_not_found')
