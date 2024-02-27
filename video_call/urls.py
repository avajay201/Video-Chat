from django.urls import path, include
from .views import home, login_view, register, logout_view, profile

urlpatterns = [
    path('', home, name='home'),
    path('login/', login_view, name='login'),
    path('register/', register, name='register'),
    path('logout/', logout_view, name='logout'),
    path('profile/', profile, name='profile'),
]