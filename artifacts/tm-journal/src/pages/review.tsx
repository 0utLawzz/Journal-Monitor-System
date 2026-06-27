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
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

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
    if (!confirm("Are you sure you want to clear all review items?")) return;
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
    const nextIdx = (sequence.indexOf(currentStatus) + 1) % sequence.length;
    const nextStatus = sequence[nextIdx];

    updateMutation.mutate({ id, data: { status: nextStatus } }, {
      onSuccess: () => {
        // Optimistic update locally could be done here, but invalidating is safer
        queryClient.invalidateQueries({ queryKey: getGetReviewItemsQueryKey(queryParams) });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to update status", variant: "destructive" });
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "REVIEW": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "MAILMERGE": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "GENERATED": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review Items</h1>
          <p className="text-muted-foreground mt-1">Process and review matched entries.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="REVIEW">Review</SelectItem>
                <SelectItem value="MAILMERGE">Mail Merge</SelectItem>
                <SelectItem value="GENERATED">Generated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Match Type:</span>
            <Select value={matchTypeFilter} onValueChange={setMatchTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
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

      <div className="border rounded-md flex-1 overflow-auto bg-card">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="w-[120px]">Term</TableHead>
              <TableHead className="w-[120px]">App No.</TableHead>
              <TableHead className="min-w-[200px]">Title</TableHead>
              <TableHead className="min-w-[200px]">Applicant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell></TableRow>
            ) : items?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center">No items to review.</TableCell></TableRow>
            ) : (
              items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`cursor-pointer transition-colors ${getStatusColor(item.status)}`}
                      onClick={() => cycleStatus(item.id, item.status)}
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.matchType === "TM" ? "default" : "secondary"}>
                      {item.matchType}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-primary">{item.matchedTerm}</TableCell>
                  <TableCell className="font-mono text-xs">{item.applicationNo}</TableCell>
                  <TableCell className="font-medium truncate max-w-[300px]" title={item.title || ""}>{item.title}</TableCell>
                  <TableCell className="truncate max-w-[300px]" title={item.applicant || ""}>{item.applicant}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="text-sm text-muted-foreground">
        Showing {items?.length || 0} review items.
      </div>
    </div>
  );
}
