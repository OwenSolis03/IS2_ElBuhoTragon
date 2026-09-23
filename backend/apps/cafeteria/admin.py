from django.contrib import admin
from django.contrib.auth.hashers import identify_hasher, make_password
from .models import Menus,Tienditas,Facultades,Usuarios
admin.site.register(Menus)
admin.site.register(Tienditas)
admin.site.register(Facultades)


@admin.register(Usuarios)
class UsuariosAdmin(admin.ModelAdmin):
    list_display = ('id_usuarios', 'nombre_usuario', 'email', 'es_admin')

    def save_model(self, request, obj, form, change):
        # Si se escribe una contraseña en claro, guardarla hasheada (login usa check_password)
        try:
            identify_hasher(obj.contrasena)
        except ValueError:
            obj.contrasena = make_password(obj.contrasena)
        super().save_model(request, obj, form, change)
