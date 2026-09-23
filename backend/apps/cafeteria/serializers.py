from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from .models import Tienditas, Facultades, Menus, Usuarios, Resenas

# Límites para campos TextField (el modelo no los acota)
MAX_DESCRIPCION = 2000
MAX_COMENTARIO = 1000
MAX_IMAGEN_URL = 3 * 1024 * 1024  # la UI sube imágenes como data URL


class TienditasSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tienditas
        fields = '__all__'

    def validate_imagen_url(self, value):
        if not value:
            return value
        if len(value) > MAX_IMAGEN_URL:
            raise serializers.ValidationError('La imagen es demasiado grande (máximo 3 MB).')
        if not (value.startswith('data:image/') or value.startswith('https://')):
            raise serializers.ValidationError('La imagen debe ser un data:image/... o una URL https://.')
        return value


class FacultadesSerializer(serializers.ModelSerializer):
    descripcion = serializers.CharField(max_length=MAX_DESCRIPCION, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Facultades
        fields = '__all__'


class MenusSerializer(serializers.ModelSerializer):
    descripcion = serializers.CharField(max_length=MAX_DESCRIPCION, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Menus
        fields = '__all__'


def validar_nombre_usuario_unico(value, instance=None):
    """El login busca por nombre_usuario: no puede repetirse (sin distinguir mayúsculas)."""
    qs = Usuarios.objects.filter(nombre_usuario__iexact=value)
    if instance is not None:
        qs = qs.exclude(pk=instance.pk)
    if qs.exists():
        raise serializers.ValidationError('Ese nombre de usuario ya está registrado.')
    return value


def validar_contrasena(value, user=None):
    try:
        validate_password(value, user=user)
    except DjangoValidationError as e:
        raise serializers.ValidationError(list(e.messages))
    return value


class UsuariosSerializer(serializers.ModelSerializer):
    """Lectura/edición del propio perfil. El alta de usuarios va por /api/register."""

    class Meta:
        model = Usuarios
        fields = ['id_usuarios', 'nombre_usuario', 'email', 'contrasena', 'es_admin', 'fecha_registro']
        read_only_fields = ['id_usuarios', 'es_admin', 'fecha_registro']
        extra_kwargs = {'contrasena': {'write_only': True, 'required': False}}

    def validate_nombre_usuario(self, value):
        return validar_nombre_usuario_unico(value, self.instance)

    def validate_contrasena(self, value):
        return validar_contrasena(value, self.instance)

    def create(self, validated_data):
        validated_data['contrasena'] = make_password(validated_data['contrasena'])
        validated_data.setdefault('fecha_registro', timezone.now())
        validated_data['es_admin'] = 0
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'contrasena' in validated_data:
            validated_data['contrasena'] = make_password(validated_data['contrasena'])
        return super().update(instance, validated_data)


class ResenaSerializer(serializers.ModelSerializer):
    nombre_usuario = serializers.ReadOnlyField(source='id_usuario.nombre_usuario')
    comentario = serializers.CharField(max_length=MAX_COMENTARIO, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Resenas
        fields = '__all__'
        # El autor lo fija el servidor a partir del token, nunca el cliente
        read_only_fields = ('fecha_registro', 'id_usuario')
