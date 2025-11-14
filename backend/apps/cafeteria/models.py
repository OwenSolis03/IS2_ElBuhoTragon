from django.db import models

class Facultades(models.Model):
    id_facultad = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, null=True)
    localizacion = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        # managed = False  <-- Al comentarlo, Django ahora sí creará la tabla
        db_table = 'Facultades'


class Tienditas(models.Model):
    id_tiendita = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=255)
    # Usamos 'Facultades' (sin comillas) porque la clase está definida arriba
    id_facultad = models.ForeignKey(Facultades, models.DO_NOTHING, db_column='id_facultad', blank=True, null=True)
    direccion = models.CharField(max_length=255, blank=True, null=True)
    foro_url = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        # managed = False
        db_table = 'Tienditas'


class Menus(models.Model):
    id_menu = models.AutoField(primary_key=True)
    # Usamos 'Tienditas' (sin comillas) si movemos la clase arriba, o string si está abajo.
    # Como Tienditas está definida aquí mismo, Django es inteligente con strings.
    id_tiendita = models.ForeignKey('Tienditas', models.DO_NOTHING, db_column='id_tiendita', blank=True, null=True)
    nombre = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, null=True)
    precio = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    class Meta:
        # managed = False
        db_table = 'Menus'


class Usuarios(models.Model):
    id_usuarios = models.AutoField(primary_key=True)
    nombre_usuario = models.CharField(max_length=255)
    contrasena = models.CharField(max_length=255)
    es_admin = models.IntegerField(blank=True, null=True)
    fecha_registro = models.DateTimeField(blank=True, null=True)

    class Meta:
        # managed = False
        db_table = 'Usuarios'

    @property
    def id(self):
        return self.id_usuarios