"""Business rules for connected asset chains."""

from django.db.models import Q
from django.utils import timezone

from .models import ActivityLog, Asset, AssetLink, StatusOption


BLOCKED_LINK_STATUSES = frozenset({"Missing", "Retired", "Under Maintenance"})


def get_chain_ids(asset, *, include_blocked=True):
    """Return the graph component containing ``asset``.

    Healthy traversal stops at unavailable assets. This lets an item keep an
    auditable link to a missing component while joining a usable replacement.
    """
    asset_id = asset.pk if isinstance(asset, Asset) else int(asset)
    blocked_ids = set()
    if not include_blocked:
        blocked_ids = set(
            Asset.objects.filter(status__name__in=BLOCKED_LINK_STATUSES)
            .values_list("pk", flat=True)
        )
        if asset_id in blocked_ids:
            return set()

    visited = {asset_id}
    pending = [asset_id]
    while pending:
        current_id = pending.pop()
        edges = AssetLink.objects.filter(
            Q(asset_id=current_id) | Q(linked_asset_id=current_id)
        ).values_list("asset_id", "linked_asset_id")
        for source_id, target_id in edges:
            neighbour_id = target_id if source_id == current_id else source_id
            if neighbour_id in visited or neighbour_id in blocked_ids:
                continue
            visited.add(neighbour_id)
            pending.append(neighbour_id)
    return visited


def create_bidirectional_link(asset, linked_asset, *, notes="", created_by=None):
    """Create one direct, bidirectional graph edge without flattening chains."""
    forward, created = AssetLink.objects.get_or_create(
        asset=asset,
        linked_asset=linked_asset,
        defaults={"notes": notes, "created_by": created_by},
    )
    AssetLink.objects.get_or_create(
        asset=linked_asset,
        linked_asset=asset,
        defaults={"notes": notes, "created_by": created_by},
    )
    return forward, created


def synchronize_healthy_chain(trigger_asset, *, updated_by=None):
    """Apply one assignment and In Use state to the trigger's healthy chain.

    Unavailable nodes are boundaries and are never updated. A non-empty return
    value contains conflicting assignee names and means no synchronization was
    performed.
    """
    chain_ids = get_chain_ids(trigger_asset, include_blocked=False)
    if not chain_ids:
        return []

    assets = list(
        Asset.objects.filter(pk__in=chain_ids, is_deleted=False)
        .select_related("assigned_to", "department", "status")
    )
    assigned_assets = [item for item in assets if item.assigned_to_id]
    assignee_ids = {item.assigned_to_id for item in assigned_assets}
    if len(assignee_ids) > 1:
        return [item.assigned_to.full_name for item in assigned_assets]

    trigger = next((item for item in assets if item.pk == trigger_asset.pk), trigger_asset)
    source = trigger if trigger.assigned_to_id or trigger.department_id else None
    if source is None and assigned_assets:
        source = assigned_assets[0]
    if source is None:
        source = next((item for item in assets if item.department_id), None)
    if source is None:
        return []

    in_use = StatusOption.objects.filter(name="In Use").first()
    if not in_use:
        return []

    updates = {
        "department_id": source.department_id,
        "status_id": in_use.pk,
        "updated_at": timezone.now(),
    }
    if source.assigned_to_id:
        updates["assigned_to_id"] = source.assigned_to_id
    if updated_by:
        updates["updated_by_id"] = updated_by.pk
    Asset.objects.filter(pk__in=chain_ids).update(**updates)
    return []


def pause_linked_chain(unavailable_asset, *, updated_by=None):
    """Move In Use peers to Available when one component becomes unavailable."""
    chain_ids = get_chain_ids(unavailable_asset, include_blocked=True)
    chain_ids.discard(unavailable_asset.pk)
    if not chain_ids:
        return []

    available = StatusOption.objects.filter(name="Available").first()
    if not available:
        return []

    affected = list(
        Asset.objects.filter(
            pk__in=chain_ids,
            is_deleted=False,
            status__name="In Use",
        )
    )
    if not affected:
        return []

    updates = {
        "status_id": available.pk,
        "updated_at": timezone.now(),
    }
    if updated_by:
        updates["updated_by_id"] = updated_by.pk
    Asset.objects.filter(pk__in=[item.pk for item in affected]).update(**updates)

    ActivityLog.objects.bulk_create([
        ActivityLog(
            asset=item,
            user=updated_by,
            action="STATUS_CHANGE",
            description=(
                f"Asset {item.asset_id} set to Available because linked asset "
                f"{unavailable_asset.asset_id} became {unavailable_asset.status.name}."
            ),
            old_value="In Use",
            new_value="Available",
        )
        for item in affected
    ])
    return affected
