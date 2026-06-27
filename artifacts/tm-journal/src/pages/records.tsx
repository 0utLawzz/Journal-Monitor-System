import { useState } from "react";
import { 
  useGetRecords,
  getGetRecordsQueryKey
} from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Records() {
  const [search, setSearch] = useState("");

  const { data: records, isLoading } = useGetRecords(
    { search: search || undefined },
    { query: { queryKey: getGetRecordsQueryKey({ search: search || undefined }) } }
  );

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generated Records</h1>
          <p className="text-muted-foreground mt-1">Read-only history of generated documents.</p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search records..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md flex-1 overflow-auto bg-card">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-[120px]">Journal</TableHead>
              <TableHead className="w-[120px]">App No.</TableHead>
              <TableHead className="min-w-[200px]">Title</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="w-[120px]">Term</TableHead>
              <TableHead className="w-[150px]">Date</TableHead>
              <TableHead className="w-[100px]">Docs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center">Loading...</TableCell></TableRow>
            ) : records?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center">No records found.</TableCell></TableRow>
            ) : (
              records?.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.journalNo}</TableCell>
                  <TableCell className="font-mono text-xs">{record.applicationNo}</TableCell>
                  <TableCell className="truncate max-w-[300px]" title={record.title || ""}>{record.title}</TableCell>
                  <TableCell>
                    <Badge variant={record.matchType === "TM" ? "default" : "secondary"}>
                      {record.matchType}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{record.matchedTerm}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : ""}
                  </TableCell>
                  <TableCell>
                    {record.docUrl && (
                      <a href={record.docUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 text-sm">
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
      <div className="text-sm text-muted-foreground">
        Showing {records?.length || 0} records.
      </div>
    </div>
  );
}
