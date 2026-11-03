"""
Permisos y límites de peticiones de la API.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS
from rest_framework.throttling import SimpleRateThrottle

from .models import Usuarios


def es_admin(user):
    return isinstance(user, Usuarios) and bool(user.es_admin)


class EsAdmin(BasePermission):
    """Solo usuarios con es_admin activo."""

    def has_permission(self, request, view):
        return es_admin(request.user)


class EsAdminOSoloLectura(BasePermission):
    """Lectura pública; crear, editar y borrar solo para administradores."""

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or es_admin(request.user)


class PermisoResena(BasePermission):
    """
    Lectura pública. Publicar requiere sesión iniciada.
    Editar o borrar: el autor de la reseña o un administrador.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return isinstance(request.user, Usuarios)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return es_admin(request.user) or obj.id_usuario_id == request.user.id_usuarios


# ========================================
# THROTTLING (por IP, o global para el chatbot)
# ========================================

class _ThrottlePorIP(SimpleRateThrottle):
    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class LoginThrottle(_ThrottlePorIP):
    scope = 'login'


class RegistroThrottle(_ThrottlePorIP):
    scope = 'registro'


class ChatbotThrottle(_ThrottlePorIP):
    scope = 'chatbot'


class ChatbotGlobalThrottle(SimpleRateThrottle):
    """Tope diario de mensajes al chatbot sumando a todos los usuarios (control de costo de Bedrock)."""
    scope = 'chatbot_global'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': 'global'}
