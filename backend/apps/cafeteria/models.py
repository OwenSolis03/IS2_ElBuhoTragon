from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator

class Facultades(models.Model):
    id_facultad = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, null=True)
    localizacion = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'Facultades'

class Tienditas(models.Model):
    id_tiendita = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=255)
    id_facultad = models.ForeignKey(Facultades, models.DO_NOTHING, db_column='id_facultad', blank=True, null=True)
    direccion = models.CharField(max_length=255, blank=True, null=True)
    foro_url = models.CharField(max_length=255, blank=True, null=True)
    
    # Mapa y Foto
    latitud = models.DecimalField(max_digits=20, decimal_places=15, blank=True, null=True)
    longitud = models.DecimalField(max_digits=20, decimal_places=15, blank=True, null=True)
    imagen_url = models.TextField(blank=True, null=True)

    # Horarios
    hora_apertura = models.TimeField(blank=True, null=True)
    hora_cierre = models.TimeField(blank=True, null=True)

    # (Quitamos categoria y rango_precio de aquí)

    class Meta:
        managed = True
        db_table = 'Tienditas'

class Menus(models.Model):
    id_menu = models.AutoField(primary_key=True)
    id_tiendita = models.ForeignKey(Tienditas, models.DO_NOTHING, db_column='id_tiendita', blank=True, null=True)
    nombre = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, null=True)
    precio = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    
    # --- NUEVO CAMPO: Categoría del platillo ---
    categoria = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'Menus'

# ... (Usuarios y Resenas se quedan IGUAL) ...
class Usuarios(models.Model):
    id_usuarios = models.AutoField(primary_key=True)
    nombre_usuario = models.CharField(max_length=255)
    contrasena = models.CharField(max_length=255)
    email = models.EmailField(unique=True, blank=True, null=True)
    es_admin = models.IntegerField(blank=True, null=True)
    fecha_registro = models.DateTimeField(blank=True, null=True)
    class Meta:
        managed = True
        db_table = 'Usuarios'
    @property
    def id(self):
        return self.id_usuarios

class Resenas(models.Model):
    id_resena = models.AutoField(primary_key=True)
    id_tiendita = models.ForeignKey(Tienditas, on_delete=models.CASCADE, db_column='id_tiendita', related_name='resenas')
    id_usuario = models.ForeignKey(Usuarios, on_delete=models.SET_NULL, null=True, db_column='id_usuario')
    calificacion = models.IntegerField(validators=[MaxValueValidator(5), MinValueValidator(1)])
    comentario = models.TextField(blank=True, null=True)
    fecha_registro = models.DateTimeField(auto_now_add=True, db_column='fecha_res')
    class Meta:
        managed = True
        db_table = 'resenas'
        ordering = ['-fecha_registro']