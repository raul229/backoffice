from django.conf import settings
from django.http import HttpResponse


class DevCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get("Origin")
        if request.method == "OPTIONS":
            response = HttpResponse()
        else:
            response = self.get_response(request)

        if origin in settings.CORS_ALLOWED_ORIGINS:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Credentials"] = "true"
        requested_headers = request.headers.get("Access-Control-Request-Headers")
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = (
            requested_headers or "Content-Type, Authorization, X-CSRFToken"
        )
        response["Access-Control-Max-Age"] = "86400"
        response["Vary"] = "Origin"
        return response
