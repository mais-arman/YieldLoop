from django.apps import AppConfig


class AccountsConfig(AppConfig):
    name = "accounts"

    def ready(self):
        from django.db.backends.signals import connection_created

        from .database_guard import approve_development_connection
        connection_created.connect(
            approve_development_connection, dispatch_uid="yieldloop-development-write-guard",
        )
