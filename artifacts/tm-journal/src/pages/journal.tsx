import { useState, useMemo } from "react";
import { 
  useGetJournalEntries, 
  useImportJournalEntries, 
  useClearJournalEntries,
  getGetJournalEntriesQueryKey,
  getGetStatsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Trash2, Search, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

type ParsedEntry = {
  applicationNo: string;
  title?: string;
  classNo?: string;
  applicant?: string;
  agent?: string;
  filingDate?: string;
};

type ParseResult = {
  entries: ParsedEntry[];
  mappedColumns: Record<string, string>;
  hasHeader: boolean;
  separator: string;
  warnings: string[];
};

const COLUMN_ALIASES: Record<string, string[]> = {
  applicationNo: ["application no", "app no", "appno", "application number", "serial no", "serial number", "tm no", "application", "reg no", "regno", "no.", "no"],
  title: ["title", "mark", "trademark", "trade mark", "mark name", "word mark", "name", "description"],
  classNo: ["class", "class no", "class number", "classes", "goods", "services", "int class", "nice class"],
  applicant: ["applicant", "owner", "proprietor", "applicant name", "holder"],
  agent: ["agent", "attorney", "representative", "agent name", "attorney name"],
  filingDate: ["filing date", "date filed", "filed", "application date", "date of filing", "filing"],
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

function detectSeparator(line: string): string {
  const tabs = (line.match(/\t/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  return tabs > commas ? "\t" : ",";
}

function splitRow(line: string, sep: string): string[] {
  if (sep === "\t") return line.split("\t").map(s => s.trim());
  // Simple CSV split that handles quoted fields
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function mapHeaderToField(header: string): string | null {
  const norm = normalizeHeader(header);
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(norm)) return field;
    if (aliases.some(a => norm.includes(a) || a.includes(norm))) return field;
  }
  return null;
}

function detectHeaderRow(cells: string[]): boolean {
  const normCells = cells.map(normalizeHeader);
  let matches = 0;
  for (const cell of normCells) {
    for (const aliases of Object.values(COLUMN_ALIASES)) {
      if (aliases.some(a => cell.includes(a) || a.includes(cell))) { matches++; break; }
    }
  }
  return matches >= 2;
}

function parseSmartCSV(raw: string): ParseResult {
  const warnings: string[] = [];
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return { entries: [], mappedColumns: {}, hasHeader: false, separator: ",", warnings: ["No data found"] };

  const sep = detectSeparator(lines[0]);
  const firstRow = splitRow(lines[0], sep);
  const hasHeader = detectHeaderRow(firstRow);

  const mappedColumns: Record<string, string> = {};
  let colMap: Record<number, string> = {};

  if (hasHeader) {
    firstRow.forEach((h, i) => {
      const field = mapHeaderToField(h);
      if (field) { colMap[i] = field; mappedColumns[field] = h; }
    });
    if (!mappedColumns.applicationNo) warnings.push("Could not detect Application No column — using column 0");
  } else {
    // Positional fallback: ApplicationNo, Title, ClassNo, Applicant, Agent, FilingDate
    colMap = { 0: "applicationNo", 1: "title", 2: "classNo", 3: "applicant", 4: "agent", 5: "filingDate" };
    warnings.push("No header row detected — using positional mapping (AppNo, Title, Class, Applicant, Agent, FilingDate)");
  }

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const entries: ParsedEntry[] = [];

  for (const line of dataLines) {
    if (!line.trim()) continue;
    const cells = splitRow(line, sep);
    const appNo = colMap[0] === "applicationNo"
      ? cells[0]
      : cells[Object.entries(colMap).find(([, v]) => v === "applicationNo")?.[0] as any] || cells[0];
    if (!appNo?.trim()) continue;

    const get = (field: string) => {
      const idx = Object.entries(colMap).find(([, v]) => v === field)?.[0];
      return idx !== undefined ? cells[+idx]?.trim() || undefined : undefined;
    };

    entries.push({
      applicationNo: appNo.trim(),
      title: get("title"),
      classNo: get("classNo"),
      applicant: get("applicant"),
      agent: get("agent"),
      filingDate: get("filingDate"),
    });
  }

  return { entries, mappedColumns, hasHeader, separator: sep === "\t" ? "tab" : "comma", warnings };
}

export default function JournalEntries() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importData, setImportData] = useState("");

  const limit = 50;
  const { data, isLoading } = useGetJournalEntries(
    { page, limit, search: search || undefined }, 
    { query: { queryKey: getGetJournalEntriesQueryKey({ page, limit, search: search || undefined }) } }
  );

  const importMutation = useImportJournalEntries();
  const clearMutation = useClearJournalEntries();

  const parseResult = useMemo<ParseResult | null>(() => {
    if (!importData.trim()) return null;
    try { return parseSmartCSV(importData); } catch { return null; }
  }, [importData]);

  const handleImport = () => {
    if (!parseResult || !parseResult.entries.length) {
      toast({ title: "Error", description: "No valid data found", variant: "destructive" });
      return;
    }
    importMutation.mutate({ data: { entries: parseResult.entries } }, {
      onSuccess: (res) => {
        toast({ title: "Import Successful", description: res.message });
        setIsImportOpen(false);
        setImportData("");
        setPage(1);
        queryClient.invalidateQueries({ queryKey: getGetJournalEntriesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      },
      onError: () => toast({ title: "Import Failed", variant: "destructive" })
    });
  };

  const handleClear = () => {
    if (!confirm("Are you sure you want to clear all journal entries?")) return;
    clearMutation.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Entries Cleared" });
        setPage(1);
        queryClient.invalidateQueries({ queryKey: getGetJournalEntriesQueryKey() });
      }
    });
  };

  const totalPages = data?.total ? Math.ceil(data.total / limit) : 1;

  const FIELD_LABELS: Record<string, string> = {
    applicationNo: "App No", title: "Title", classNo: "Class",
    applicant: "Applicant", agent: "Agent", filingDate: "Filing Date",
  };

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-5xl font-[family-name:var(--font-display)] tracking-wider text-[#0C0C0C]">Journal Entries</h1>
          <p className="text-sm text-[rgba(12,12,12,0.55)] mt-1 font-[family-name:var(--font-sans)]">Raw imported publication data.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportOpen} onOpenChange={(open) => { setIsImportOpen(open); if (!open) setImportData(""); }}>
            <DialogTrigger asChild>
              <Button><Upload className="mr-2 h-4 w-4" /> Import Data</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[660px] bg-[#FAF6EE] border-[3px] border-[#0C0C0C] rounded-[6px] nb-shadow-lg p-0 overflow-hidden">
              <DialogHeader className="px-6 pt-6 pb-4 border-b-[2px] border-[#0C0C0C] bg-[#E8DFC7]">
                <DialogTitle
                  className="text-2xl text-[#0C0C0C]"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}
                >
                  Import Journal Data
                </DialogTitle>
                <p className="text-xs font-[family-name:var(--font-mono)] text-[rgba(12,12,12,0.55)] mt-1">
                  Paste CSV or tab-separated data. Headers are auto-detected.
                </p>
              </DialogHeader>

              <div className="space-y-4 p-6">
                <Textarea 
                  className="min-h-[180px] font-[family-name:var(--font-mono)] text-xs bg-[#FAF6EE] border-[2px] border-[#0C0C0C] rounded-none placeholder:text-[rgba(12,12,12,0.35)] focus-visible:border-[#C94A00] focus-visible:ring-0"
                  placeholder={"Paste CSV or spreadsheet data here...\n\nExample with header:\nApplication No\tTitle\tClass\tApplicant\tAgent\tFiling Date\n12345678\tSUPER MARK\t25\tACME Corp\tSmith & Co\t2024-01-15\n\nWithout header (positional):\n12345678,SUPER MARK,25,ACME Corp,Smith & Co,2024-01-15"}
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                />

                {parseResult && importData.trim() && (
                  <div className="border-[2px] border-[#0C0C0C] rounded-[4px] overflow-hidden">
                    <div className={`px-4 py-2 flex items-center gap-2 border-b-[2px] border-[#0C0C0C] ${parseResult.entries.length > 0 ? "bg-[rgba(13,153,112,0.12)]" : "bg-[rgba(201,74,0,0.12)]"}`}>
                      {parseResult.entries.length > 0
                        ? <CheckCircle2 className="h-4 w-4 text-[#0A6B52] shrink-0" />
                        : <AlertCircle className="h-4 w-4 text-[#C94A00] shrink-0" />
                      }
                      <span className="text-xs font-[family-name:var(--font-mono)] font-medium uppercase tracking-wide text-[#0C0C0C]">
                        {parseResult.entries.length > 0
                          ? `${parseResult.entries.length} rows detected · ${parseResult.separator}-separated · ${parseResult.hasHeader ? "Header row found" : "No header (positional)"}`
                          : "No valid rows detected"
                        }
                      </span>
                    </div>
                    {Object.keys(parseResult.mappedColumns).length > 0 && (
                      <div className="px-4 py-3 bg-[#FAF6EE]">
                        <p className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[rgba(12,12,12,0.45)] mb-2">Mapped Columns</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(parseResult.mappedColumns).map(([field, header]) => (
                            <span key={field} className="inline-flex items-center gap-1 text-[10px] font-[family-name:var(--font-mono)] bg-[rgba(13,153,112,0.12)] border border-[#0D9970] text-[#0A6B52] px-2 py-0.5 rounded-[3px]">
                              <CheckCircle2 className="h-3 w-3" />
                              {FIELD_LABELS[field] ?? field}
                              {header !== field && <span className="opacity-60 ml-0.5">← {header}</span>}
                            </span>
                          ))}
                          {(["applicationNo","title","classNo","applicant","agent","filingDate"] as const)
                            .filter(f => !parseResult.mappedColumns[f])
                            .map(f => (
                              <span key={f} className="inline-flex items-center gap-1 text-[10px] font-[family-name:var(--font-mono)] bg-[rgba(12,12,12,0.06)] border border-[rgba(12,12,12,0.2)] text-[rgba(12,12,12,0.4)] px-2 py-0.5 rounded-[3px]">
                                {FIELD_LABELS[f]} — not found
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                    {parseResult.warnings.length > 0 && (
                      <div className="px-4 py-2 border-t-[1px] border-[rgba(12,12,12,0.15)] bg-[rgba(212,168,0,0.08)]">
                        {parseResult.warnings.map((w, i) => (
                          <p key={i} className="text-[10px] font-[family-name:var(--font-mono)] text-[#8a6800]">⚠ {w}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="px-6 py-4 border-t-[2px] border-[#0C0C0C] bg-[#E8DFC7] flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setIsImportOpen(false); setImportData(""); }}>Cancel</Button>
                <Button
                  onClick={handleImport}
                  disabled={importMutation.isPending || !parseResult || parseResult.entries.length === 0}
                >
                  {importMutation.isPending ? "Importing..." : `Import ${parseResult?.entries.length ? `(${parseResult.entries.length} rows)` : ""}`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="destructive" onClick={handleClear} disabled={clearMutation.isPending}>
            <Trash2 className="mr-2 h-4 w-4" /> Clear All
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[rgba(12,12,12,0.35)]" />
          <Input
            placeholder="Search entries..."
            className="pl-8"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="border-[3px] border-[#0C0C0C] rounded-[6px] flex-1 overflow-auto bg-[#FAF6EE] nb-shadow">
        <Table>
          <TableHeader className="sticky top-0 bg-[#E8DFC7] z-10 border-b-[2px] border-[#0C0C0C]">
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#0C0C0C] border-r border-[rgba(12,12,12,0.15)] w-[130px]">App No.</TableHead>
              <TableHead className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#0C0C0C] border-r border-[rgba(12,12,12,0.15)] w-[60px]">Class</TableHead>
              <TableHead className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#0C0C0C] border-r border-[rgba(12,12,12,0.15)] min-w-[200px]">Title</TableHead>
              <TableHead className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#0C0C0C] border-r border-[rgba(12,12,12,0.15)] min-w-[180px]">Applicant</TableHead>
              <TableHead className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#0C0C0C] border-r border-[rgba(12,12,12,0.15)] min-w-[180px]">Agent</TableHead>
              <TableHead className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#0C0C0C] w-[120px]">Filing Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-[rgba(12,12,12,0.45)] font-[family-name:var(--font-mono)] text-xs">Loading...</TableCell></TableRow>
            ) : data?.entries?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-[rgba(12,12,12,0.35)] font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider">No entries found.</TableCell></TableRow>
            ) : (
              data?.entries?.map((entry, idx) => (
                <TableRow key={entry.id} className={`border-b border-[rgba(12,12,12,0.08)] hover:bg-[#F0E8D0] ${idx % 2 === 1 ? "bg-[rgba(232,223,199,0.35)]" : ""}`}>
                  <TableCell className="font-[family-name:var(--font-mono)] text-xs text-[#C94A00] border-r border-[rgba(12,12,12,0.08)]">{entry.applicationNo}</TableCell>
                  <TableCell className="font-[family-name:var(--font-mono)] text-xs border-r border-[rgba(12,12,12,0.08)]">{entry.classNo}</TableCell>
                  <TableCell className="font-medium text-sm truncate max-w-[300px] border-r border-[rgba(12,12,12,0.08)]" title={entry.title || ""}>{entry.title}</TableCell>
                  <TableCell className="text-sm truncate max-w-[300px] border-r border-[rgba(12,12,12,0.08)]" title={entry.applicant || ""}>{entry.applicant}</TableCell>
                  <TableCell className="text-sm truncate max-w-[300px] border-r border-[rgba(12,12,12,0.08)]" title={entry.agent || ""}>{entry.agent}</TableCell>
                  <TableCell className="font-[family-name:var(--font-mono)] text-xs text-[rgba(12,12,12,0.55)] whitespace-nowrap">{entry.filingDate}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs font-[family-name:var(--font-mono)] text-[rgba(12,12,12,0.45)] uppercase tracking-wider">
          Showing {data?.entries.length || 0} of {data?.total || 0} entries
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-[family-name:var(--font-mono)] px-2 uppercase tracking-wider">Page {page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
