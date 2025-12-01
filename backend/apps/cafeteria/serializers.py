from rest_framework import serializers
# IMPORTACIONES NUEVAS NECESARIAS
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from .models import Tienditas, Facultades, Menus, Usuarios, Resenas

class TienditasSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tienditas
        fields = '__all__'

class FacultadesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Facultades
        fields = '__all__'

class MenusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Menus
        fields = '__all__'

# --- ESTA ES LA CLASE QUE DEBES CORREGIR ---
class UsuariosSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuarios
        fields = '__all__'

    # AGREGAMOS ESTE MÉTODO PARA INTERCEPTAR EL GUARDADO
    def create(self, validated_data):
        # 1. Encriptar contraseña (si existe)
        if 'contrasena' in validated_data:
            validated_data['contrasena'] = make_password(validated_data['contrasena'])
        
        # 2. Poner fecha automática (si no existe)
        if 'fecha_registro' not in validated_data:
            validated_data['fecha_registro'] = timezone.now()
            
        return super().create(validated_data)

class ResenaSerializer(serializers.ModelSerializer):
    nombre_usuario = serializers.ReadOnlyField(source='id_usuario.nombre_usuario')

    class Meta:
        model = Resenas
        fields = '__all__'
        read_only_fields = ('fecha_registro',)