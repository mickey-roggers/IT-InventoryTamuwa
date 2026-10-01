from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from assets.models import Asset, AssetLink, Category, Department, StatusOption
from requisition.models import Requisition, RequisitionItem
from technicians.models import Technician
from users.models import UserProfile


class ExtendedApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.department = Department.objects.create(name="ICT")
        self.admin = User.objects.create_user(
            username="api-admin", password="AdminPass123!", is_staff=False
        )
        UserProfile.objects.create(
            user=self.admin,
            role="admin",
            department=self.department,
            is_first_login=False,
        )
        self.viewer = User.objects.create_user(
            username="api-viewer", password="ViewerPass123!"
        )
        UserProfile.objects.create(
            user=self.viewer,
            role="viewer",
            is_first_login=False,
        )

    def test_user_management_is_readable_but_only_staff_can_write(self):
        self.client.force_authenticate(self.viewer)
        self.assertEqual(self.client.get("/api/users/").status_code, 200)
        denied = self.client.post(
            "/api/users/", {"username": "blocked", "password": "StrongPass123!"}, format="json"
        )
        self.assertEqual(denied.status_code, 403)

        self.client.force_authenticate(self.admin)
        created = self.client.post(
            "/api/users/",
            {
                "username": "new-user",
                "password": "StrongPass123!",
                "role": "technician",
                "department_id": self.department.pk,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        user = User.objects.get(username="new-user")
        self.assertEqual(user.profile.role, "technician")
        self.assertEqual(user.profile.department, self.department)
        self.assertTrue(user.profile.must_change_password)

    def test_current_user_can_update_profile_and_change_password(self):
        self.client.force_authenticate(self.viewer)
        updated = self.client.patch(
            "/api/auth/me/",
            {
                "first_name": "Api",
                "last_name": "Viewer",
                "phone_number": "+254700000000",
                "department_id": self.department.pk,
            },
            format="json",
        )
        self.assertEqual(updated.status_code, 200, updated.data)
        self.assertEqual(updated.data["profile"]["department_id"], self.department.pk)

        changed = self.client.post(
            "/api/auth/change-password/",
            {"current_password": "ViewerPass123!", "new_password": "AnotherStrongPass456!"},
            format="json",
        )
        self.assertEqual(changed.status_code, 200, changed.data)
        self.viewer.refresh_from_db()
        self.assertTrue(self.viewer.check_password("AnotherStrongPass456!"))

    def test_asset_quantities_report_status_totals(self):
        category = Category.objects.create(name="Laptop", short_code="LAP")
        available = StatusOption.objects.create(name="Available")
        in_use = StatusOption.objects.create(name="In Use")
        Asset.objects.create(
            asset_id="LAP-001", category=category, model_description="Laptop one",
            serial_number="SER-001", status=available, created_by=self.admin, updated_by=self.admin,
        )
        Asset.objects.create(
            asset_id="LAP-002", category=category, model_description="Laptop two",
            serial_number="SER-002", status=in_use, department=self.department,
            created_by=self.admin, updated_by=self.admin,
        )
        self.client.force_authenticate(self.viewer)
        response = self.client.get("/api/asset-quantities/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]["total"], 2)
        self.assertEqual(response.data[0]["available"], 1)
        self.assertEqual(response.data[0]["in_use"], 1)

    def test_bought_queue_processing_links_assets_and_tracks_quantity(self):
        category = Category.objects.create(name="Monitor", short_code="MON")
        available = StatusOption.objects.create(name="Available")
        asset = Asset.objects.create(
            asset_id="MON-001", category=category, model_description="Monitor",
            serial_number="MON-SER-001", status=available,
            created_by=self.admin, updated_by=self.admin,
        )
        requisition = Requisition.objects.create(
            req_no="REQ-001", company="Tamuwa", title="Displays", status="Bought",
            created_by=self.admin,
        )
        item = RequisitionItem.objects.create(
            requisition=requisition, item_name="Monitor", item_type="Asset",
            unit_price="25000", quantity=2, is_approved=True,
        )
        self.client.force_authenticate(self.admin)
        queued = self.client.get("/api/requisition-items/?bought_queue=true")
        self.assertEqual(queued.data["count"], 1)

        first = self.client.post(
            f"/api/requisition-items/{item.pk}/process/", {"asset_id": asset.pk}, format="json"
        )
        self.assertEqual(first.status_code, 200, first.data)
        item.refresh_from_db()
        asset.refresh_from_db()
        self.assertEqual(item.quantity, 1)
        self.assertFalse(item.is_processed)
        self.assertEqual(asset.requisition, requisition)

        second = self.client.post(
            f"/api/requisition-items/{item.pk}/process/", {"asset_id": asset.pk}, format="json"
        )
        self.assertEqual(second.status_code, 200, second.data)
        item.refresh_from_db()
        self.assertTrue(item.is_processed)

    def test_technician_related_records_are_manageable(self):
        technician = Technician.objects.create(company_name="Repairs Ltd", technician_name="Jane")
        self.client.force_authenticate(self.viewer)
        denied = self.client.post(
            "/api/technician-assistants/",
            {"technician": technician.pk, "name": "Blocked", "is_active": True},
            format="json",
        )
        self.assertEqual(denied.status_code, 403)
        self.client.force_authenticate(self.admin)
        assistant = self.client.post(
            "/api/technician-assistants/",
            {"technician": technician.pk, "name": "Alex", "is_active": True},
            format="json",
        )
        self.assertEqual(assistant.status_code, 201, assistant.data)
        service = self.client.post(
            "/api/technician-services/",
            {"technician": technician.pk, "service_name": "Screen replacement", "typical_cost": "5000"},
            format="json",
        )
        self.assertEqual(service.status_code, 201, service.data)
        recommendation = self.client.post(
            "/api/technician-recommendations/",
            {
                "technician": technician.pk,
                "recommendation_type": "REPAIR",
                "description": "Replace damaged display",
                "priority": "HIGH",
            },
            format="json",
        )
        self.assertEqual(recommendation.status_code, 201, recommendation.data)

        detail = self.client.get(f"/api/technicians/{technician.pk}/")
        self.assertEqual(len(detail.data["assistants"]), 1)
        self.assertEqual(len(detail.data["services"]), 1)

    def test_asset_linking_accepts_multiple_assets_and_builds_complete_chain(self):
        category = Category.objects.create(name="Dock", short_code="DCK")
        available = StatusOption.objects.create(name="Available")
        assets = [
            Asset.objects.create(
                asset_id=f"DCK-00{index}", category=category,
                model_description=f"Dock {index}", serial_number=f"DCK-SER-{index}",
                status=available, created_by=self.admin, updated_by=self.admin,
            )
            for index in range(1, 4)
        ]
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            "/api/asset-links/",
            {"asset": assets[0].pk, "linked_asset_ids": [assets[1].pk, assets[2].pk]},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(AssetLink.objects.count(), 6)

    def test_creating_asset_from_bought_queue_generates_id_and_reduces_quantity(self):
        category = Category.objects.create(name="Laptop", short_code="LAP")
        available = StatusOption.objects.create(name="Available")
        requisition = Requisition.objects.create(
            req_no="REQ-QUEUE", company="Tamuwa", title="Laptops", status="Bought", created_by=self.admin
        )
        item = RequisitionItem.objects.create(
            requisition=requisition, item_type="Asset", item_name="Laptop",
            unit_price="50000", quantity=2, is_approved=True,
        )
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            "/api/assets/",
            {
                "asset_id": "", "category_id": category.pk,
                "model_description": "Queue laptop", "serial_number": "QUEUE-SER-1",
                "status_id": available.pk, "requisition_item_id": item.pk,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["asset_id"], "LAP-001")
        self.assertEqual(response.data["requisition"], requisition.pk)
        item.refresh_from_db()
        self.assertEqual(item.quantity, 1)
        self.assertFalse(item.is_processed)
