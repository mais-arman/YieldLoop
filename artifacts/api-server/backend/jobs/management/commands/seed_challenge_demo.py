import json

from django.core.management.base import BaseCommand

from jobs.demo import seed, verify_target


class Command(BaseCommand):
    help = "Idempotently seed supplied cases into a positively verified development database. Never creates accounts."

    def add_arguments(self, parser):
        parser.add_argument("--actor-id", type=int, required=True)
        parser.add_argument("--confirm-database", required=True)
        parser.add_argument("--confirm-cluster", required=True)

    def handle(self, *args, **options):
        verify_target(options["confirm_database"], options["confirm_cluster"])
        results = seed(options["actor_id"])
        self.stdout.write(json.dumps(results, ensure_ascii=False))
