from accounts.security import ReadyAccount
from accounts.views import ProtectedView
from django.core.paginator import EmptyPage, Paginator
from django.db.models import Q
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import services
from .models import ProductionJob
from .policy import require_creator, visible_jobs
from .serializers import CreateInput, ListInput, UpdateInput, checked, job_data


class JobsView(ProtectedView):
    permission_classes = (IsAuthenticated, ReadyAccount)

    def get(self, request):
        values = checked(ListInput, request.query_params.dict())
        jobs = visible_jobs(request.user)
        if "status" in values:
            jobs = jobs.filter(status=values["status"])
        if values["search"]:
            search = values["search"]
            jobs = jobs.filter(
                Q(title__icontains=search) | Q(job_number__icontains=search) | Q(notes__icontains=search) | Q(reference__icontains=search)
            )
        paginator = Paginator(jobs, values["page_size"])
        try:
            page = paginator.page(values["page"])
        except EmptyPage:
            raise NotFound() from None
        return Response({
            "count": paginator.count, "page": page.number, "page_size": values["page_size"],
            "total_pages": paginator.num_pages,
            "results": [job_data(job, request.user) for job in page],
        })

    def post(self, request):
        require_creator(request.user)
        job, actor = services.create_job(request, checked(CreateInput, request.data))
        return Response(job_data(job, actor), status=201)


class JobView(ProtectedView):
    permission_classes = (IsAuthenticated, ReadyAccount)

    def get(self, request, pk):
        try:
            job = visible_jobs(request.user).get(pk=pk)
        except ProductionJob.DoesNotExist:
            raise NotFound() from None
        return Response(job_data(job, request.user))

    def patch(self, request, pk):
        job, actor = services.update_job(request, pk, checked(UpdateInput, request.data))
        return Response(job_data(job, actor))
