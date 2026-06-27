import { useState } from "react";
import { 
  useGetReviewItems, 
  useUpdateReviewItem,
  useClearReviewItems,
  getGetReviewItemsQueryKey,
  getGetStatsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  REVIEW:     "border-[#C94A00] bg-[rgba(201,74,0,0.12)] text-[#C94A00]",
  MAILMERGE:  "border-[#0A6B52] bg-[rgba(10,107,82,0.12)] text-[#0A6B52]",
  GENERATED:  "border-[#0D9970] bg-[rgba(13,153,112,0.12)] text-[#0D9970]",
};

export default function ReviewItems() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [matchTypeFilter, setMatchTypeFilter] = useState<string>("all");

  const queryParams = {
    ...(statusFilter !== "all" && { status: statusFilter }),
    ...(matchTypeFilter !== "all" && { matchType: matchTypeFilter })
  };

  const { data: items, isLoading } = useGetReviewItems(queryParams, {
    query: { queryKey: getGetReviewItemsQueryKey(queryParams) }
  });

  const updateMutation = useUpdateReviewItem();
  const clearMutation = useClearReviewItems();

  const handleClear = () => {
    if (!confirm("Clear all review items?")) return;
    clearMutation.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Review items cleared" });
        queryClient.invalidateQueries({ queryKey: getGetReviewItemsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      }
    });
  };

  const cycleStatus = (id: number, currentStatus: string) => {
    const sequence = ["REVIEW", "MAILMERGE", "GENERATED"];
    const nextStatus = sequence[(sequence.indexOf(currentStatus) + 1) % sequence.length];
    updateMutation.mutate({ id, data: { status: nextStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetReviewItemsQueryKey(queryParams) });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      },
      onError: () => toast({ title: "Failed to update status", variant: "destructive" })
    });
  };

  const selectClasses = "rounded-none border-[2px] border-[#0C0C0C] bg-[#FAF6EE] focus:border-[#C94A00] focus:ring-0 h-9 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wide";

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1
            className="text-5xl text-[#0C0C0C]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}
          >
            Review Items
          </h1>
          <p className="text-sm text-[rgba(12,12,12,0.55)] mt-1">Process and review matched entries. Click a status badge to advance it.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[rgba(12,12,12,0.5)]">Status:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={`w-[140px] ${selectClasses}`}>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="rounded-[6px] border-[2px] border-[#0C0C0C] bg-[#FAF6EE]">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="REVIEW">Review</SelectItem>
                <SelectItem value="MAILMERGE">Mail Merge</SelectItem>
                <SelectItem value="GENERATED">Generated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[rgba(12,12,12,0.5)]">Type:</span>
            <Select value={matchTypeFilter} onValueChange={setMatchTypeFilter}>
              <SelectTrigger className={`w-[140px] ${selectClasses}`}>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="rounded-[6px] border-[2px] border-[#0C0C0C] bg-[#FAF6EE]">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="TM">TM Number</SelectItem>
                <SelectItem value="KEYWORD">Keyword</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="destructive" onClick={handleClear} disabled={clearMutation.isPending}>
            <Trash2 className="mr-2 h-4 w-4" /> Clear
          </Button>
        </div>
      </div>

      <div className="border-[3px] border-[#0C0C0C] rounded-[6px] flex-1 overflow-auto bg-[#FAF6EE] nb-shadow">
        <Table>
          <TableHeader className="sticky top-0 bg-[#E8DFC7] z-10 border-b-[2px] border-[#0C0C0C]">
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#0C0C0C] border-r border-[rgba(12,12,12,0.15)] w-[120px]">Status</TableHead>
              <TableHead className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#0C0C0C] border-r border-[rgba(12,12,12,0.15)] w-[100px]">Type</TableHead>
              <TableHead className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#0C0C0C] border-r border-[rgba(12,12,12,0.15)] w-[140px]">Matched Term</TableHead>
              <TableHead className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#0C0C0C] border-r border-[rgba(12,12,12,0.15)] w-[130px]">App No.</TableHead>
              <TableHead className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#0C0C0C] border-r border-[rgba(12,12,12,0.15)] min-w-[200px]">Title</TableHead>
              <TableHead className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#0C0C0C] min-w-[200px]">Applicant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center font-[family-name:var(--font-mono)] text-xs text-[rgba(12,12,12,0.45)] uppercase tracking-wider">Loading...</TableCell></TableRow>
            ) : items?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center font-[family-name:var(--font-mono)] text-xs text-[rgba(12,12,12,0.35)] uppercase tracking-wider">No items to review.</TableCell></TableRow>
            ) : (
              items?.map((item, idx) => (
                <TableRow key={item.id} className={`border-b border-[rgba(12,12,12,0.08)] hover:bg-[#F0E8D0] ${idx % 2 === 1 ? "bg-[rgba(232,223,199,0.35)]" : ""}`}>
                  <TableCell className="border-r border-[rgba(12,12,12,0.08)]">
                    <button
                      className={`inline-flex items-center rounded-[4px] border-2 px-2 py-0.5 text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all duration-100 cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5 ${STATUS_STYLES[item.status] || "border-[rgba(12,12,12,0.4)] text-[#555]"}`}
                      onClick={() => cycleStatus(item.id, item.status)}
                      title="Click to advance status"
                    >
                      {item.status}
                    </button>
                  </TableCell>
                  <TableCell className="border-r border-[rgba(12,12,12,0.08)]">
                    <span className={`inline-flex items-center rounded-[4px] border-2 px-2 py-0.5 text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider ${
                      item.matchType === "TM"
                        ? "border-[#C94A00] bg-[rgba(201,74,0,0.12)] text-[#C94A00]"
                        : "border-[#0A6B52] bg-[rgba(10,107,82,0.12)] text-[#0A6B52]"
                    }`}>
                      {item.matchType}
                    </span>
                  </TableCell>
                  <TableCell className="font-[family-name:var(--font-mono)] text-xs font-medium text-[#C94A00] border-r border-[rgba(12,12,12,0.08)]">{item.matchedTerm}</TableCell>
                  <TableCell className="font-[family-name:var(--font-mono)] text-xs border-r border-[rgba(12,12,12,0.08)]">{item.applicationNo}</TableCell>
                  <TableCell className="font-medium text-sm truncate max-w-[300px] border-r border-[rgba(12,12,12,0.08)]" title={item.title || ""}>{item.title}</TableCell>
                  <TableCell className="text-sm truncate max-w-[300px]" title={item.applicant || ""}>{item.applicant}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="text-[10px] font-[family-name:var(--font-mono)] text-[rgba(12,12,12,0.45)] uppercase tracking-wider">
        {items?.length || 0} review items
      </div>
    </div>
  );
}
