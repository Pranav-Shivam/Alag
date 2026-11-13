import { useState } from "react";
import { BadgeCheck, Check, History, RotateCcw, ShieldAlert, UserCheck } from "lucide-react";
import { Button, Callout, Card, Chip, SectionTitle, TextArea, TextInput } from "../../components/ui";
import { approverFor, grossProfit, sellingPrice, usd } from "../../studio/calc";
import { useStudio } from "../../studio/store";
import type { MarginDecision, PricingRules } from "../../studio/types";
import DiscountPreview from "./DiscountPreview";
import MarginScale from "./MarginScale";
import { pct, signedUsd } from "./shared";

const MIN_REASON = 10;
const EXCEPTION_PREFIX = "Exception requested: ";

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 rounded-control border border-line bg-surface-2 p-2.5">
      <div className="text-xs text-muted">{label}</div>
      <div className="break-words text-base font-semibold tabular-nums text-ink">{value}</div>
      {sub ? <div className="text-xs tabular-nums text-muted">{sub}</div> : null}
    </div>
  );
}

export default function DecisionCard({ qid, margin, cost, rules, rulesVersion, approved }: { qid: string; margin: MarginDecision; cost: number; rules: PricingRules; rulesVersion: number; approved: boolean }) {
  const setMargin = useStudio((s) => s.setMargin);
  const logActivity = useStudio((s) => s.logActivity);

  const rec = margin.recommendedPct;
  const [chosen, setChosen] = useState(margin.chosenPct);
  const [text, setText] = useState(String(margin.chosenPct));
  const [reason, setReason] = useState(margin.reason?.startsWith(EXCEPTION_PREFIX) ? "" : (margin.reason ?? ""));
  const [exception, setException] = useState("");

  const update = (v: number) => {
    const c = Math.min(40, Math.max(0, v));
    setChosen(c);
    setText(String(c));
  };

  const price = sellingPrice(cost, chosen);
  const recPrice = sellingPrice(cost, rec);
  const profit = grossProfit(cost, chosen);
  const diff = price - recPrice;

  const belowMin = chosen < rules.minMarginPct;
  const outsideBand = Math.abs(chosen - rec) > rules.toleranceBandPct;
  const differs = chosen !== rec;
  const reasonOk = reason.trim().length >= MIN_REASON;
  const exceptionOk = exception.trim().length >= MIN_REASON;
  const approver = approverFor(rules, price, chosen);
  const unsaved = chosen !== margin.chosenPct;

  const canApprove = !belowMin && (!outsideBand || reasonOk) && !(margin.approvedBy && !unsaved && (margin.reason ?? "") === (differs ? reason.trim() : ""));

  const revision = (what: string) => {
    if (approved) logActivity(qid, { stepId: 5, actor: "System", who: "Revision control", text: `Estimate revision opened: ${what} on an approved estimate` });
  };

  const approve = () => {
    if (!canApprove) return;
    const r = differs && reason.trim() ? reason.trim() : undefined;
    setMargin(qid, { chosenPct: chosen, reason: r, approvedBy: approver.approver });
    logActivity(qid, { stepId: 5, actor: "Human", who: "You", text: `Approved a ${pct(chosen, 1)} margin at a selling price of ${usd(price)} as ${approver.approver}${r ? `. Reason: ${r}` : ""}` });
    revision("margin approval");
  };

  const requestException = () => {
    if (!belowMin || !exceptionOk) return;
    const r = `${EXCEPTION_PREFIX}${exception.trim()}`;
    setMargin(qid, { chosenPct: chosen, reason: r, approvedBy: undefined });
    logActivity(qid, { stepId: 5, actor: "Human", who: "You", text: `Asked a Director to approve an exception at ${pct(chosen, 1)} margin, below the ${pct(rules.minMarginPct, 1)} minimum. Reason: ${exception.trim()}` });
    revision("margin exception request");
  };

  const reset = () => {
    update(rec);
    setReason("");
    setException("");
    if (margin.chosenPct !== rec || margin.reason) {
      setMargin(qid, { chosenPct: rec, reason: undefined, approvedBy: undefined });
      revision("margin reset to the recommendation");
    }
  };

  // Current saved decision.
  const savedBelowMin = margin.chosenPct < rules.minMarginPct;
  const pendingException = !margin.approvedBy && savedBelowMin && (margin.reason ?? "").startsWith(EXCEPTION_PREFIX);

  const upTo = approver.tier?.upToValue;
  const approverWhy = belowMin
    ? `Below the minimum margin, so a Director must approve an exception. The normal approval path is closed.`
    : approver.escalated && approver.tier
      ? `Margin ${pct(chosen, 1)} is below ${pct(approver.tier.escalateBelowMarginPct ?? 0)} for quotes in the ${approver.tier.approver} tier, so approval moves up to ${approver.approver}.`
      : `A quote of ${usd(price)} falls in the ${approver.tier?.approver ?? approver.approver} tier${upTo ? ` (up to ${usd(upTo)})` : ""}.`;

  return (
    <>
    <Card className="p-4">
      <SectionTitle title="Margin decision" hint="Pick the margin to quote. Limits come from the live pricing rules." />

      <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-live="polite">
        {pendingException ? (
          <Chip tone="danger" icon={ShieldAlert}>
            Exception requested, waiting for a Director
          </Chip>
        ) : margin.approvedBy ? (
          <Chip tone="ok" icon={BadgeCheck}>
            Approved by {margin.approvedBy}
          </Chip>
        ) : margin.chosenPct !== rec ? (
          <Chip tone="warn">Overridden, not approved yet</Chip>
        ) : (
          <Chip tone="info">Recommended, not approved yet</Chip>
        )}
        {margin.chosenPct !== rec && margin.approvedBy ? <Chip tone="warn">Overridden</Chip> : null}
        {unsaved ? <Chip tone="neutral">Unsaved change</Chip> : null}
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 @md:grid-cols-[minmax(0,1fr)_7.5rem]">
        <MarginScale value={chosen} onChange={update} minPct={rules.minMarginPct} recommendedPct={rec} bandPct={rules.toleranceBandPct} />
        <TextInput
          label="Margin, percent"
          type="number"
          inputMode="decimal"
          min={0}
          max={40}
          step={0.5}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value.trim() !== "" && Number.isFinite(n)) setChosen(Math.min(40, Math.max(0, n)));
          }}
          onBlur={() => setText(String(chosen))}
          className="tabular-nums"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 @md:grid-cols-4" aria-live="polite">
        <Metric label="Cost" value={usd(cost)} sub="Engine, with overrides" />
        <Metric label="Selling price" value={usd(price)} sub={`At ${pct(chosen, 1)} margin`} />
        <Metric label="Gross profit" value={usd(profit)} />
        <Metric label="Versus recommended price" value={signedUsd(diff)} sub={`Recommended ${usd(recPrice)}`} />
      </div>

      <div className="mt-4 space-y-3">
        {belowMin ? (
          <>
            <Callout tone="danger" icon={ShieldAlert} title={`Below the minimum margin of ${pct(rules.minMarginPct, 1)}`}>
              This margin cannot be approved here. A Director must approve an exception. Write the reason below and send the request. It does not approve the margin.
            </Callout>
            <TextArea
              label="Exception reason for the Director"
              rows={2}
              value={exception}
              onChange={(e) => setException(e.target.value)}
              hint={`Required, at least ${MIN_REASON} characters.`}
              error={exception.trim().length > 0 && !exceptionOk ? `Write at least ${MIN_REASON} characters.` : undefined}
            />
          </>
        ) : differs ? (
          <TextArea
            label={outsideBand ? "Reason for leaving the tolerance band (required)" : "Reason for the change (optional)"}
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            hint={outsideBand ? `This is more than ${pct(rules.toleranceBandPct, 1)} from the recommendation. At least ${MIN_REASON} characters.` : `Within the ${pct(rules.toleranceBandPct, 1)} band around the recommendation.`}
            error={outsideBand && reason.trim().length > 0 && !reasonOk ? `Write at least ${MIN_REASON} characters.` : undefined}
          />
        ) : null}

        <div className="flex items-start gap-2 rounded-control border border-line bg-surface-2 p-2.5 text-sm" aria-live="polite">
          <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <div className="min-w-0">
            <div className="text-ink">
              Approver: <strong className="font-semibold">{belowMin ? "Director (exception)" : approver.approver}</strong>
            </div>
            <div className="text-xs text-muted">{approverWhy}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {belowMin ? (
            <>
              <Button variant="primary" icon={Check} disabled>
                Approve margin
              </Button>
              <Button icon={ShieldAlert} onClick={requestException} disabled={!exceptionOk}>
                Request Director exception
              </Button>
            </>
          ) : (
            <Button variant="primary" icon={Check} onClick={approve} disabled={!canApprove}>
              Approve margin
            </Button>
          )}
          <Button icon={RotateCcw} onClick={reset}>
            Reset to recommendation
          </Button>
        </div>
        {approved ? (
          <p className="flex items-start gap-1.5 text-xs text-muted">
            <History className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            This estimate is approved. Changing the margin creates a revision and is logged.
          </p>
        ) : null}
      </div>

      <div className="mt-4">
        <h4 className="mb-1 text-xs font-semibold text-ink">How the price is calculated</h4>
        <pre className="whitespace-pre-wrap break-words rounded-control border border-line bg-surface-2 p-3 font-mono text-xs leading-relaxed text-ink" aria-live="polite">
          {`Selling price = cost / (1 - margin)
              = ${usd(cost)} / (1 - ${+(chosen / 100).toFixed(4)})
              = ${usd(price)}
Gross profit  = selling price - cost
              = ${usd(profit)}`}
        </pre>
      </div>
    </Card>
    <DiscountPreview cost={cost} price={price} rules={rules} rulesVersion={rulesVersion} />
    </>
  );
}
