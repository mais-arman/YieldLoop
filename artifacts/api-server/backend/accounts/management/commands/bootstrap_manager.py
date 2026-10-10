from getpass import getpass

from audit.models import AuditEvent
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import User
from accounts.security import lock_accounts
from accounts.serializers import password_policy


class Command(BaseCommand):
    help = "Explicit interactive first-Manager provisioning. Never run at startup."

    def handle(self, *args, **options):
        username = input("Manager username: ").strip()
        password = getpass("Manager password (hidden): ")
        if password != getpass("Repeat password (hidden): "):
            raise CommandError("Passwords differ.")
        with transaction.atomic():
            lock_accounts()
            if User.objects.filter(role=User.Role.MANAGER).exists():
                raise CommandError("A Manager already exists; bootstrap refused.")
            user = User(username=username, role=User.Role.MANAGER)
            password_policy(password, user)
            user.set_password(password)
            user.full_clean()
            user.save()
            AuditEvent.objects.create(
                actor=None, target=user, event_type="manager_bootstrapped", outcome="success",
            )
        self.stdout.write("Manager provisioned. No password was logged.")
