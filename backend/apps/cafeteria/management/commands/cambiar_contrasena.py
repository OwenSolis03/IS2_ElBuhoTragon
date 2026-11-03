"""
Cambia la contraseña de un usuario de la tabla Usuarios.
La contraseña se pide de forma oculta (no queda en el historial de la terminal).

Usage: python manage.py cambiar_contrasena <nombre_usuario>
"""
from getpass import getpass

from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from apps.cafeteria.models import Usuarios


class Command(BaseCommand):
    help = 'Cambia la contraseña de un usuario de El Búho Tragón'

    def add_arguments(self, parser):
        parser.add_argument('nombre_usuario')

    def handle(self, *args, **options):
        usuario = Usuarios.objects.filter(nombre_usuario=options['nombre_usuario']).first()
        if usuario is None:
            raise CommandError(f"No existe el usuario '{options['nombre_usuario']}'")

        for _ in range(3):
            nueva = getpass('Nueva contraseña: ')
            if nueva != getpass('Repítela: '):
                self.stderr.write('No coinciden. Intenta de nuevo.')
                continue
            try:
                validate_password(nueva)
            except ValidationError as e:
                self.stderr.write(' '.join(e.messages))
                continue

            usuario.contrasena = make_password(nueva)
            usuario.save(update_fields=['contrasena'])
            self.stdout.write(self.style.SUCCESS(f"Contraseña de '{usuario.nombre_usuario}' actualizada."))
            return

        raise CommandError('Demasiados intentos; no se cambió nada.')
