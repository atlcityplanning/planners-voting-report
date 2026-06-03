import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Copy, ExternalLink, LoaderCircle, ShieldCheck, Wrench } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

import { provisionMondayVotingReportBoard } from "@/server/reportActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/monday-provision")({
  component: MondayProvisionRoute,
});

type MondayBoardKind = "public" | "private" | "share";

type ProvisionResult = Awaited<ReturnType<typeof provisionMondayVotingReportBoard>>;

function MondayProvisionRoute() {
  const provisionBoard = useServerFn(provisionMondayVotingReportBoard);
  const [provisioningKey, setProvisioningKey] = useState("");
  const [boardName, setBoardName] = useState("NPU Voting Reports");
  const [boardDescription, setBoardDescription] = useState(
    "Tracks NPU voting report submissions, review status, and finalized PDFs.",
  );
  const [boardKind, setBoardKind] = useState<MondayBoardKind>("private");
  const [workspaceId, setWorkspaceId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ProvisionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  const resultJson = result ? JSON.stringify(result, null, 2) : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setCopyStatus("");
    setIsSubmitting(true);

    try {
      const nextResult = await provisionBoard({
        data: {
          provisioningKey,
          boardName,
          boardDescription,
          boardKind,
          workspaceId: workspaceId || undefined,
        },
      });

      setResult(nextResult);
    } catch (error) {
      setResult(null);
      setErrorMessage(error instanceof Error ? error.message : "Unable to provision board.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyResult() {
    if (!resultJson) {
      return;
    }

    await navigator.clipboard.writeText(resultJson);
    setCopyStatus("Copied");
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-12rem)] w-full max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-8">
      <section className="space-y-6">
        <div className="space-y-4">
          <Badge variant="outline" className="gap-1.5">
            <ShieldCheck />
            Temporary Admin
          </Badge>
          <div className="space-y-3">
            <h1 className="font-display text-5xl leading-none tracking-normal text-foreground sm:text-6xl">
              Monday Board Provisioning
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Create the board, workflow groups, report columns, link columns, and PDF file column
              with a single-use provisioning key.
            </p>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-border bg-muted/35 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <Wrench className="size-4 text-primary" />
            Required server values
          </div>
          <div className="grid gap-2 text-muted-foreground">
            <code className="rounded-xl bg-background px-3 py-2">MONDAY_API_TOKEN</code>
            <code className="rounded-xl bg-background px-3 py-2">MONDAY_PROVISIONING_KEY</code>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            The provisioning key is consumed before monday.com is called. Set a new key before
            creating another board.
          </p>
        </div>
      </section>

      <section className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Board Details</CardTitle>
            <CardDescription>Provision a fresh monday.com board.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="provisioning-key">Provisioning Key</Label>
                <Input
                  id="provisioning-key"
                  type="password"
                  value={provisioningKey}
                  onChange={(event) => setProvisioningKey(event.target.value)}
                  autoComplete="off"
                  required
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  Single use. A successful or failed provisioning attempt prevents this key from
                  being used again.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="board-name">Board Name</Label>
                <Input
                  id="board-name"
                  value={boardName}
                  onChange={(event) => setBoardName(event.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="board-description">Board Description</Label>
                <Textarea
                  id="board-description"
                  value={boardDescription}
                  onChange={(event) => setBoardDescription(event.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="board-kind">Board Kind</Label>
                  <Select
                    value={boardKind}
                    onValueChange={(value) => setBoardKind(value as MondayBoardKind)}
                  >
                    <SelectTrigger id="board-kind" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="share">Shareable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="workspace-id">Workspace ID</Label>
                  <Input
                    id="workspace-id"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={workspaceId}
                    onChange={(event) => setWorkspaceId(event.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {errorMessage ? (
                <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {errorMessage}
                </p>
              ) : null}

              <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-fit">
                {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Wrench />}
                Provision Board
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <CardTitle>Provisioning Result</CardTitle>
                <CardDescription>Store these IDs for the item sync step.</CardDescription>
              </div>
              {result ? (
                <Badge variant="secondary" className="gap-1.5">
                  <CheckCircle2 />
                  Created
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {result ? (
              <>
                <div className="grid gap-3 rounded-2xl border border-border bg-muted/35 p-4 text-sm">
                  <div className="grid gap-1">
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      Board ID
                    </span>
                    <code className="text-base font-semibold text-foreground">{result.board.id}</code>
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-fit">
                    <a href={result.board.url} target="_blank" rel="noreferrer">
                      <ExternalLink />
                      Open Board
                    </a>
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleCopyResult}>
                    <Copy />
                    Copy JSON
                  </Button>
                  {copyStatus ? (
                    <span className="text-xs font-medium text-muted-foreground">{copyStatus}</span>
                  ) : null}
                </div>

                <pre className="max-h-[28rem] overflow-auto rounded-2xl border border-border bg-foreground p-4 text-xs leading-5 text-background">
                  {resultJson}
                </pre>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
                No board has been provisioned in this session.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
