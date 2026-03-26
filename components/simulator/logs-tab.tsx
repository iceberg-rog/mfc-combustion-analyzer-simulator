"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SectionCard } from "./shared";
import { LogEntry, Simulator } from "./types";

function LogsCard({ title, entries }: { title: string; entries: LogEntry[] }) {
  return (
    <SectionCard title={title} eyebrow="Timeline">
      <ScrollArea className="h-[380px] pr-4">
        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="rounded-[20px] border border-stone-200 bg-stone-50/80 p-4 text-sm text-slate-500">
              No entries yet.
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="rounded-[20px] border border-stone-200 bg-stone-50/80 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-900">{entry.kind}</span>
                  <span className="font-mono text-xs text-slate-500">t={entry.t.toFixed(1)}s</span>
                </div>
                <div className="mt-2 leading-6 text-slate-700">{entry.message}</div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </SectionCard>
  );
}

export function LogsTab({ sim }: { sim: Simulator }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <LogsCard title="Event log" entries={sim.eventLog} />
      <LogsCard title="Alarm history" entries={sim.alarmHistory} />
    </div>
  );
}
