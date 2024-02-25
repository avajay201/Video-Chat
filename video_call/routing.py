from django.urls import path
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from . import consumers

websocket_urlpatterns = [
    path('ws/video_call/', consumers.VideoCallConsumer.as_asgi()),
]
