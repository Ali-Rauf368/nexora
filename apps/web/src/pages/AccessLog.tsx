import { Card, Empty, ErrorNote, Loading, PageHeader } from "../components/ui";
import type { AccessEntry } from "../lib/api";
import { dateTime } from "../lib/format";
import { useFetch } from "../lib/useFetch";

export function AccessLogPage() {
  const { data, error } = useFetch<AccessEntry[]>("/activity");
  return (
    <>
      <PageHeader title="Access log" subtitle="Every sign-in, chart view and change, newest first. Kept for two years." />
      <ErrorNote message={error} />
      <Card className="overflow-x-auto">
        {!data ? <Loading /> : data.length === 0 ? <Empty>No activity yet.</Empty> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-fg-3">
              <tr className="border-b border-edge">
                <th className="px-5 py-3 font-semibold">When</th>
                <th className="px-3 py-3 font-semibold">Who</th>
                <th className="px-3 py-3 font-semibold">Action</th>
                <th className="px-5 py-3 font-semibold">Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {data.map((e) => (
                <tr key={e._id}>
                  <td className="whitespace-nowrap px-5 py-2.5 text-fg-2">{dateTime(e.at)}</td>
                  <td className="px-3 py-2.5 font-semibold">{e.userName}</td>
                  <td className="px-3 py-2.5"><span className="rounded-md bg-soft px-2 py-0.5 font-mono text-xs">{e.action}</span></td>
                  <td className="px-5 py-2.5 text-fg-2">{e.entityType}{e.summary && `: ${e.summary}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
