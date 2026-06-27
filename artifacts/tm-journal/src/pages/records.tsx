import { useState } from "react";
import { 
  useGetRecords,
  getGetRecordsQueryKey
} from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, ExternalLink } from "lucide-react";

export default function Records() {
  const [search, setSearch] = useState("");

  const { data: records, isLoading } = useGetRecords(
    { search: search || undefined },
    { query: { queryKey: getGetRecordsQueryKey({ search: search || undefined }) } }
  );

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1
            className="text-5xl text-[#0C0C0C]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}
          >
            Generated Records
          </h1>
          <p className="text-sm text-[rgba(12,12,12,0.55)] mt-1">Read-only history of generated documents.</p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[rgba(12,12,12,0.35)]" />
          <Input
            placeholder="Search records..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border-[3px] border-[#0C0C0C] rounded-[6px] flex-1 overflow-auto bg-[#FAF6EE] nb-shadow">
        <Table>
          <TableHeader className="sticky top-0 bg-[#E8DFC7] z-10 border-b-[2px] border-[#0C0C0C]">
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#0C0C0C] border-r border-[rgba(12,12,12,0.15)] w-[100px]">Journal</TableHead>
              <TableHead className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#0C0C0C] border-r border-[rgba(12,12,12,0.15)] w-[130px]">App No.</TableHead>
              <TableHead className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#0C0C0C] border-r border-[rgba(12,12,12,0.15)] min-w-[200px]">Title</TableHead>
              <TableHead className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#0C0C0C] border-r border-[rgba(12,12,12,0.15)] w-[100px]">Type</TableHead>
              <TableHead className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#0C0C0C] border-r border-[rgba(12,12,12,0.15)] w-[140px]">Term</TableHead>
              <TableHead className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#0C0C0C] border-r border-[rgba(12,12,12,0.15)] w-[140px]">Date</TableHead>
              <TableHead className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#0C0C0C] w-[80px]">Docs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center font-[family-name:var(--font-mono)] text-xs text-[rgba(12,12,12,0.45)] uppercase tracking-wider">Loading...</TableCell></TableRow>
            ) : records?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center font-[family-name:var(--font-mono)] text-xs text-[rgba(12,12,12,0.35)] uppercase tracking-wider">No records found.</TableCell></TableRow>
            ) : (
              records?.map((record, idx) => (
                <TableRow key={record.id} className={`border-b border-[rgba(12,12,12,0.08)] hover:bg-[#F0E8D0] ${idx % 2 === 1 ? "bg-[rgba(232,223,199,0.35)]" : ""}`}>
                  <TableCell className="font-[family-name:var(--font-mono)] text-xs font-medium border-r border-[rgba(12,12,12,0.08)]">{record.journalNo}</TableCell>
                  <TableCell className="font-[family-name:var(--font-mono)] text-xs text-[#C94A00] border-r border-[rgba(12,12,12,0.08)]">{record.applicationNo}</TableCell>
                  <TableCell className="text-sm truncate max-w-[300px] border-r border-[rgba(12,12,12,0.08)]" title={record.title || ""}>{record.title}</TableCell>
                  <TableCell className="border-r border-[rgba(12,12,12,0.08)]">
                    <span className={`inline-flex items-center rounded-[4px] border-2 px-2 py-0.5 text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider ${
                      record.matchType === "TM"
                        ? "border-[#C94A00] bg-[rgba(201,74,0,0.12)] text-[#C94A00]"
                        : "border-[#0A6B52] bg-[rgba(10,107,82,0.12)] text-[#0A6B52]"
                    }`}>
                      {record.matchType}
                    </span>
                  </TableCell>
                  <TableCell className="font-[family-name:var(--font-mono)] text-xs font-medium border-r border-[rgba(12,12,12,0.08)]">{record.matchedTerm}</TableCell>
                  <TableCell className="font-[family-name:var(--font-mono)] text-xs text-[rgba(12,12,12,0.55)] whitespace-nowrap border-r border-[rgba(12,12,12,0.08)]">
                    {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : ""}
                  </TableCell>
                  <TableCell>
                    {record.docUrl && (
                      <a href={record.docUrl} target="_blank" rel="noreferrer" className="text-[#0D9970] hover:text-[#0A6B52] flex items-center gap-1 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors">
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="text-[10px] font-[family-name:var(--font-mono)] text-[rgba(12,12,12,0.45)] uppercase tracking-wider">
        {records?.length || 0} records
      </div>
    </div>
  );
}
