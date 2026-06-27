import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  useGetDashboard, useUpdateDashboard, 
  useGetStats, 
  useGetKeywords, useAddKeyword, useDeleteKeyword, 
  useGetTmNumbers, useAddTmNumber, useDeleteTmNumber, 
  useRunScan, useGenerateDocs, useExportData, useNormalizeDates,
  getGetDashboardQueryKey, getGetStatsQueryKey, getGetKeywordsQueryKey, getGetTmNumbersQueryKey
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus, Play, FileText, Download, Activity } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const configSchema = z.object({
  journalNo: z.string().min(1, "Journal number is required"),
  journalDate: z.string().optional(),
  keywordMatchMode: z.enum(["word", "contains"]).default("word"),
});

const keywordSchema = z.object({ value: z.string().min(1) });
const tmSchema = z.object({ value: z.string().min(1) });

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading: loadingDash } = useGetDashboard();
  const { data: stats, isLoading: loadingStats } = useGetStats();
  const { data: keywords, isLoading: loadingKeywords } = useGetKeywords();
  const { data: tmNumbers, isLoading: loadingTm } = useGetTmNumbers();

  const updateDashboard = useUpdateDashboard();
  const runScan = useRunScan();
  const generateDocs = useGenerateDocs();
  const exportData = useExportData();
  const normalizeDates = useNormalizeDates();
  const addKeyword = useAddKeyword();
  const deleteKeyword = useDeleteKeyword();
  const addTmNumber = useAddTmNumber();
  const deleteTmNumber = useDeleteTmNumber();

  const configForm = useForm<z.infer<typeof configSchema>>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      journalNo: "",
      journalDate: "",
      keywordMatchMode: "word",
    },
  });

  useEffect(() => {
    if (dashboard) {
      configForm.reset({
        journalNo: dashboard.journalNo || "",
        journalDate: dashboard.journalDate || "",
        keywordMatchMode: (dashboard.keywordMatchMode as any) || "word",
      });
    }
  }, [dashboard, configForm]);

  const onSaveConfig = (data: z.infer<typeof configSchema>) => {
    updateDashboard.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Configuration saved" });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      }
    });
  };

  const kwForm = useForm({ resolver: zodResolver(keywordSchema), defaultValues: { value: "" } });
  const tmForm = useForm({ resolver: zodResolver(tmSchema), defaultValues: { value: "" } });

  const onAddKw = (data: { value: string }) => {
    addKeyword.mutate({ data }, {
      onSuccess: () => {
        kwForm.reset();
        queryClient.invalidateQueries({ queryKey: getGetKeywordsQueryKey() });
      }
    });
  };

  const onAddTm = (data: { value: string }) => {
    addTmNumber.mutate({ data }, {
      onSuccess: () => {
        tmForm.reset();
        queryClient.invalidateQueries({ queryKey: getGetTmNumbersQueryKey() });
      }
    });
  };

  const handleAction = (action: any, name: string) => {
    action.mutate(undefined, {
      onSuccess: (res: any) => {
        toast({ title: `${name} Successful`, description: res?.message || "" });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: `${name} Failed`, description: err?.message || "An error occurred", variant: "destructive" });
      }
    });
  };

  if (loadingDash || loadingStats) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Command Center</h1>
          <p className="text-muted-foreground mt-1">Manage configurations and execute core system workflows.</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button onClick={() => handleAction(normalizeDates, "Normalize Dates")} disabled={normalizeDates.isPending} variant="secondary">
            Normalize Dates
          </Button>
          <Button onClick={() => handleAction(runScan, "Scan")} disabled={runScan.isPending} className="bg-primary">
            <Play className="mr-2 h-4 w-4" /> Run Scan
          </Button>
          <Button onClick={() => handleAction(generateDocs, "Generate Docs")} disabled={generateDocs.isPending} variant="secondary">
            <FileText className="mr-2 h-4 w-4" /> Generate Docs
          </Button>
          <Button onClick={() => handleAction(exportData, "Export")} disabled={exportData.isPending} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">{stats?.totalJournalEntries || 0}</div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Journal Entries</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">{stats?.totalReviewItems || 0}</div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Review Items</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">{stats?.pendingReview || 0}</div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Pending Review</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">{stats?.totalRecords || 0}</div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Generated Records</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Journal Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...configForm}>
                <form onSubmit={configForm.handleSubmit(onSaveConfig)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={configForm.control}
                      name="journalNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Journal Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={configForm.control}
                      name="journalDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Journal Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={configForm.control}
                      name="keywordMatchMode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Keyword Match Mode</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select mode" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="word">Exact Word Match</SelectItem>
                              <SelectItem value="contains">Contains Match</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" disabled={updateDashboard.isPending}>Save Configuration</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Monitored Keywords</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Form {...kwForm}>
                <form onSubmit={kwForm.handleSubmit(onAddKw)} className="flex gap-2">
                  <FormField control={kwForm.control} name="value" render={({ field }) => (
                    <FormItem className="flex-1 space-y-0"><FormControl><Input placeholder="Add keyword..." {...field} /></FormControl></FormItem>
                  )} />
                  <Button type="submit" size="icon" disabled={addKeyword.isPending}><Plus className="h-4 w-4" /></Button>
                </form>
              </Form>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {keywords?.map(kw => (
                  <div key={kw.id} className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-md text-sm">
                    <span>{kw.value}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteKeyword.mutate({ id: kw.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetKeywordsQueryKey() }) })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {keywords?.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">No keywords configured.</div>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Monitored TM Numbers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Form {...tmForm}>
                <form onSubmit={tmForm.handleSubmit(onAddTm)} className="flex gap-2">
                  <FormField control={tmForm.control} name="value" render={({ field }) => (
                    <FormItem className="flex-1 space-y-0"><FormControl><Input placeholder="Add TM number..." {...field} /></FormControl></FormItem>
                  )} />
                  <Button type="submit" size="icon" disabled={addTmNumber.isPending}><Plus className="h-4 w-4" /></Button>
                </form>
              </Form>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {tmNumbers?.map(tm => (
                  <div key={tm.id} className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-md text-sm">
                    <span className="font-mono">{tm.value}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteTmNumber.mutate({ id: tm.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTmNumbersQueryKey() }) })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {tmNumbers?.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">No TM numbers configured.</div>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
