import { useState } from "react";
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
import { Upload, Trash2, Search, ArrowLeft, ArrowRight } from "lucide-react";

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

  const handleImport = () => {
    try {
      const rows = importData.split("\n").map(r => r.split(","));
      const entries = rows.map(r => ({
        applicationNo: r[0]?.trim() || "",
        title: r[1]?.trim(),
        classNo: r[2]?.trim(),
        applicant: r[3]?.trim(),
        agent: r[4]?.trim(),
        filingDate: r[5]?.trim(),
      })).filter(e => e.applicationNo);

      if (!entries.length) {
        toast({ title: "Error", description: "No valid data found", variant: "destructive" });
        return;
      }

      importMutation.mutate({ data: { entries } }, {
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
    } catch (e) {
      toast({ title: "Error", description: "Invalid CSV format", variant: "destructive" });
    }
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

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Journal Entries</h1>
          <p className="text-muted-foreground mt-1">Raw imported publication data.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary"><Upload className="mr-2 h-4 w-4" /> Import Data</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Import Journal Data (CSV)</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">Format: ApplicationNo, Title, ClassNo, Applicant, Agent, FilingDate</p>
                <Textarea 
                  className="min-h-[200px] font-mono text-xs" 
                  placeholder="Paste CSV data here..."
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportOpen(false)}>Cancel</Button>
                <Button onClick={handleImport} disabled={importMutation.isPending || !importData}>Import</Button>
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
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            className="pl-8"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="border rounded-md flex-1 overflow-auto bg-card">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-[120px]">App No.</TableHead>
              <TableHead className="w-[80px]">Class</TableHead>
              <TableHead className="min-w-[200px]">Title</TableHead>
              <TableHead className="min-w-[200px]">Applicant</TableHead>
              <TableHead className="min-w-[200px]">Agent</TableHead>
              <TableHead className="w-[120px]">Filing Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell></TableRow>
            ) : data?.entries?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center">No entries found.</TableCell></TableRow>
            ) : (
              data?.entries?.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-xs">{entry.applicationNo}</TableCell>
                  <TableCell>{entry.classNo}</TableCell>
                  <TableCell className="font-medium truncate max-w-[300px]" title={entry.title || ""}>{entry.title}</TableCell>
                  <TableCell className="truncate max-w-[300px]" title={entry.applicant || ""}>{entry.applicant}</TableCell>
                  <TableCell className="truncate max-w-[300px]" title={entry.agent || ""}>{entry.agent}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{entry.filingDate}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {data?.entries.length || 0} of {data?.total || 0} results
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
