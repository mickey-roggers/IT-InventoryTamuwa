"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Check, ExternalLink, Link2, Loader2, Search } from "lucide-react";

import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { DeleteResourceButton } from "@/components/record-actions";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/tailwind/button";
import { Card, CardContent } from "@/components/tailwind/card";
import { Input } from "@/components/tailwind/input";
import { Label } from "@/components/tailwind/label";
import { Skeleton } from "@/components/tailwind/skeleton";
import { Textarea } from "@/components/tailwind/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/tailwind/table";
import { apiErrorMessage, apiFetch, unpackResults } from "@/lib/api";
import { assetDisplayName, assetOptionLabel, formatDate } from "@/lib/format";
import type {
  Asset,
  AssetLink,
  AssetLinkHistory,
  Paginated,
} from "@/lib/types";

export default function AssetLinksPage() {
  const { user } = useAuth();
  const { mutate: mutateCache } = useSWRConfig();
  const { data, isLoading, mutate } = useSWR<
    Paginated<AssetLink> | AssetLink[]
  >("asset-links/?page_size=1000", apiFetch);
  const { data: assets } = useSWR<Paginated<Asset> | Asset[]>(
    "assets/?page_size=1000",
    apiFetch,
  );
  const { data: history, mutate: mutateHistory } = useSWR<
    Paginated<AssetLinkHistory> | AssetLinkHistory[]
  >("asset-link-history/?needs_attention=true&page_size=1000", apiFetch);
  const assetMap = new Map(
    unpackResults(assets).map((asset) => [asset.id, asset]),
  );
  const links = unpackResults(data).filter(
    (link) => link.asset < link.linked_asset,
  );
  const brokenLinks = unpackResults(history).filter(
    (link) => link.asset < link.linked_asset,
  );
  const isAdmin = Boolean(
    user?.is_staff ||
    user?.is_superuser ||
    user?.profile?.role === "admin" ||
    user?.profile?.role === "super_admin",
  );
  const refreshLinks = () => {
    void mutate();
    void mutateHistory();
    void mutateCache("system-alerts/");
  };

  return (
    <>
      <PageHeader
        eyebrow="Inventory relationships"
        title="Asset links"
        description="Connect equipment as chains. If one component is missing, retired, or under maintenance, its in-use chain is paused until a healthy replacement is linked."
        actions={
          isAdmin ? (
            <AssetLinkDialog assets={unpackResults(assets)} onCreated={refreshLinks} />
          ) : undefined
        }
      />
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10" />
              ))}
            </div>
          ) : links.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Primary asset</TableHead>
                    <TableHead>Linked asset</TableHead>
                    <TableHead>Link state</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Linked</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => {
                    const first = assetMap.get(link.asset);
                    const second = assetMap.get(link.linked_asset);
                    const active =
                      first?.status.name === "In Use" &&
                      second?.status.name === "In Use";
                    const incomplete = [
                      first?.status.name,
                      second?.status.name,
                    ].some(
                      (value) =>
                        value === "Missing" || value === "Retired" || value === "Under Maintenance",
                    );
                    const needsAttention = incomplete || !active;
                    return (
                      <TableRow key={link.id} className={needsAttention ? "bg-amber-50/80 hover:bg-amber-100/80 dark:bg-amber-950/20 dark:hover:bg-amber-950/30" : undefined}>
                        <TableCell>
                          <AssetLinkCell
                            asset={first}
                            label={link.asset_display}
                          />
                        </TableCell>
                        <TableCell>
                          <AssetLinkCell
                            asset={second}
                            label={link.linked_asset_display}
                          />
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            value={
                              incomplete
                                ? "Incomplete"
                                : active
                                  ? "Active"
                                  : "Waiting to be assigned"
                            }
                          />
                        </TableCell>
                        <TableCell className="max-w-md text-muted-foreground">
                          {link.notes || "—"}
                        </TableCell>
                        <TableCell>{formatDate(link.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            {isAdmin && (
                              <DeleteResourceButton
                                endpoint={`asset-links/${link.id}/`}
                                label="Asset link"
                                onDeleted={refreshLinks}
                                iconOnly
                              />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="p-14 text-center text-muted-foreground">
              No assets have been linked yet.
            </p>
          )}
        </CardContent>
      </Card>
      <Card className="mt-4 overflow-hidden border-border/70 shadow-sm">
        <CardContent className="p-0">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold">Broken links waiting for attention</h2>
            <p className="text-sm text-muted-foreground">
              Yellow rows were linked before and are waiting for a replacement or follow-up.
            </p>
          </div>
          {brokenLinks.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Previously linked asset</TableHead>
                  <TableHead>Unlinked</TableHead>
                  <TableHead>Follow-up</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brokenLinks.map((item) => (
                  <TableRow key={item.id} className="bg-amber-50/80 hover:bg-amber-100/80 dark:bg-amber-950/20 dark:hover:bg-amber-950/30">
                    <TableCell>
                      <span className="font-medium">{item.asset_alias_name || item.asset_display}</span>
                      {item.asset_alias_name && <span className="ml-2 font-mono text-xs text-muted-foreground">{item.asset_display}</span>}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{item.linked_asset_alias_name || item.linked_asset_display}</span>
                      {item.linked_asset_alias_name && <span className="ml-2 font-mono text-xs text-muted-foreground">{item.linked_asset_display}</span>}
                    </TableCell>
                    <TableCell>{formatDate(item.unlinked_at, true)}</TableCell>
                    <TableCell>
                      <StatusBadge value={item.attention_required && !item.attention_resolved_at ? "Needs attention" : "Resolved"} />
                      {item.attention_resolution && <p className="mt-1 max-w-72 text-xs text-muted-foreground">{item.attention_resolution}</p>}
                    </TableCell>
                    <TableCell>
                      {item.unlinked_by_username || "System"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No broken links need attention.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function AssetLinkDialog({ assets, onCreated }: { assets: Asset[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [primaryId, setPrimaryId] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const primary = assets.find((asset) => String(asset.id) === primaryId);
  const relatedAssets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assets.filter((asset) => asset.id !== primary?.id && (!query || assetOptionLabel(asset).toLowerCase().includes(query)));
  }, [assets, primary?.id, search]);

  function reset() {
    setPrimaryId("");
    setSelectedIds([]);
    setSearch("");
    setNotes("");
    setError("");
  }

  function toggle(assetId: number) {
    setSelectedIds((current) => current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!primaryId || !selectedIds.length) return;
    setSaving(true);
    setError("");
    try {
      await apiFetch("asset-links/", {
        method: "POST",
        body: JSON.stringify({ asset: Number(primaryId), linked_asset_ids: selectedIds, notes }),
      });
      setOpen(false);
      reset();
      onCreated();
    } catch (caught) {
      setError(apiErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button onClick={() => { reset(); setOpen(true); }}><Link2 />Link assets</Button>
      <Modal open={open} onClose={() => { if (!saving) setOpen(false); }} title="Link assets" description="Keep the primary asset on the left, then select as many related assets as needed on the right." className="sm:max-w-5xl">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
            <section className="space-y-3 rounded-xl border bg-muted/25 p-4">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Primary asset</p><p className="mt-1 text-sm text-muted-foreground">The item the other assets belong with.</p></div>
              <div className="space-y-2">
                <Label htmlFor="primary-asset">Asset</Label>
                <select id="primary-asset" required value={primaryId} onChange={(event) => { setPrimaryId(event.target.value); setSelectedIds((current) => current.filter((id) => String(id) !== event.target.value)); }} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50">
                  <option value="" disabled>Select primary asset</option>
                  {assets.map((asset) => <option key={asset.id} value={asset.id}>{assetOptionLabel(asset)}</option>)}
                </select>
              </div>
              {primary && <div className="rounded-lg border bg-background p-3"><p className="font-medium">{assetDisplayName(primary)}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{primary.asset_id} · {primary.model_description}</p><div className="mt-3"><StatusBadge value={primary.status.name} /></div></div>}
              <div className="space-y-2"><Label htmlFor="link-notes">Notes</Label><Textarea id="link-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional context for this group" /></div>
            </section>
            <section className="min-w-0 space-y-3 rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Related assets</p><p className="mt-1 text-sm text-muted-foreground">Select one or more items to link directly.</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{selectedIds.length} selected</span></div>
              <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search asset ID, alias, model, or serial…" className="pl-9" /></div>
              <div className="max-h-[24rem] space-y-1 overflow-y-auto rounded-lg border p-1">
                {!primaryId ? <p className="p-8 text-center text-sm text-muted-foreground">Choose the primary asset first.</p> : relatedAssets.length ? relatedAssets.map((asset) => {
                  const selected = selectedIds.includes(asset.id);
                  return <button key={asset.id} type="button" onClick={() => toggle(asset.id)} className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${selected ? "bg-primary/10 ring-1 ring-primary/25" : "hover:bg-muted"}`}>
                    <span className={`grid size-5 shrink-0 place-items-center rounded border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"}`}>{selected && <Check className="size-3.5" />}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium">{assetDisplayName(asset)}</span><span className="block truncate font-mono text-xs text-muted-foreground">{asset.asset_id} · {asset.model_description}</span></span>
                    <StatusBadge value={asset.status.name} />
                  </button>;
                }) : <p className="p-8 text-center text-sm text-muted-foreground">No matching assets.</p>}
              </div>
            </section>
          </div>
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving || !primaryId || !selectedIds.length}>{saving && <Loader2 className="animate-spin" />}Link {selectedIds.length || ""} asset{selectedIds.length === 1 ? "" : "s"}</Button></div>
        </form>
      </Modal>
    </>
  );
}

function AssetLinkCell({
  asset,
  label,
}: {
  asset: Asset | undefined;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div>
        <p className="font-medium">{asset ? assetDisplayName(asset) : label}</p>
        <p className="font-mono text-xs text-muted-foreground">
          {asset ? `${asset.asset_id} · ${asset.model_description}` : "Asset details unavailable"}
        </p>
      </div>
      {asset && (
        <Button asChild variant="ghost" size="icon-sm">
          <Link href={`/assets/${asset.id}`} aria-label={`Open ${label}`}>
            <ExternalLink />
          </Link>
        </Button>
      )}
    </div>
  );
}
