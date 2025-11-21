from rest_framework import serializers
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

class UsuariosSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuarios
        fields = '__all__'

# --- Serializador para Reseñas ---
class ResenaSerializer(serializers.ModelSerializer):
    # Esto nos permitirá ver el nombre del usuario en la reseña, no solo el ID
    nombre_usuario = serializers.ReadOnlyField(source='id_usuario.nombre_usuario')

    class Meta:
        model = Resenas
        fields = '__all__'
        read_only_fields = ('fecha_registro',)