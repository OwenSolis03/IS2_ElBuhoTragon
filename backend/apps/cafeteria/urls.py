from django.contrib import admin
from apps.cafeteria.views import UserRegisterView, login_view
from django.urls import include, path
from rest_framework import routers
from django.views.generic import RedirectView
# IMPORTAMOS ResenaViewSet
from apps.cafeteria.views import TienditasViewSet, MenusViewSet, FacultadesViewSet, UsuariosViewSet, ResenaViewSet
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = routers.DefaultRouter()
router.register(r'Tienditas', TienditasViewSet)
router.register(r'Menus', MenusViewSet)
router.register(r'Facultades', FacultadesViewSet)
router.register(r'Usuarios', UsuariosViewSet)
router.register(r'Resenas', ResenaViewSet) # <--- ¡AQUÍ ESTÁ!

urlpatterns = [
    path('admin/', admin.site.urls),  
    path('', RedirectView.as_view(url='/cafeteria/', permanent=False)),  
    path('api/', include(router.urls)),  
    path('api/login/', login_view, name='login'),
    path('api/register', UserRegisterView.as_view(), name='register'),
    path('api/token', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]