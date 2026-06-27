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

const configSchema = z.object({
  journalNo: z.string().min(1, "Journal number is required"),
  journalDate: z.string().optional(),
  keywordMatchMode: z.enum(["word", "contains"]).default("word"),
});

const keywordSchema = z.object({ value: z.string().min(1) });
const tmSchema = z.object({ value: z.string().min(1) });

const StatCard = ({ value, label, accent }: { value: number; label: string; accent?: boolean }) => (
  <div className={`border-[3px] border-[#0C0C0C] rounded-[6px] p-5 nb-shadow ${accent ? "bg-[#C94A00]" : "bg-[#FAF6EE]"}`}>
    <div
      className={`text-4xl ${accent ? "text-[#FAF6EE]" : "text-[#0C0C0C]"}`}
      style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}
    >
      {value}
    </div>
    <div className={`text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.18em] mt-1 ${accent ? "text-[rgba(250,246,238,0.7)]" : "text-[rgba(12,12,12,0.5)]"}`}>
      {label}
    </div>
  </div>
);

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading: loadingDash } = useGetDashboard();
  const { data: stats } = useGetStats();
  const { data: keywords } = useGetKeywords();
  const { data: tmNumbers } = useGetTmNumbers();

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
    defaultValues: { journalNo: "", journalDate: "", keywordMatchMode: "word" },
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
        toast({ title: `${name} Complete`, description: res?.message || "" });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: `${name} Failed`, description: err?.message || "An error occurred", variant: "destructive" });
      }
    });
  };

  if (loadingDash) return (
    <div className="p-8 flex items-center justify-center h-full">
      <span className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[rgba(12,12,12,0.4)]">Loading...</span>
    </div>
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1
            className="text-6xl text-[#0C0C0C]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}
          >
            Command Center
          </h1>
          <p className="text-sm text-[rgba(12,12,12,0.55)] mt-1">Manage configurations and execute core system workflows.</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="secondary" onClick={() => handleAction(normalizeDates, "Normalize Dates")} disabled={normalizeDates.isPending}>
            Normalize Dates
          </Button>
          <Button onClick={() => handleAction(runScan, "Scan")} disabled={runScan.isPending}>
            <Play className="mr-2 h-4 w-4" /> Run Scan
          </Button>
          <Button variant="secondary" onClick={() => handleAction(generateDocs, "Generate Docs")} disabled={generateDocs.isPending}>
            <FileText className="mr-2 h-4 w-4" /> Generate Docs
          </Button>
          <Button variant="outline" onClick={() => handleAction(exportData, "Export")} disabled={exportData.isPending}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard value={stats?.totalJournalEntries || 0} label="Journal Entries" />
            <StatCard value={stats?.totalReviewItems || 0} label="Review Items" />
            <StatCard value={stats?.pendingReview || 0} label="Pending Review" accent />
            <StatCard value={stats?.totalRecords || 0} label="Generated Records" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#C94A00]" />
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
                          <FormLabel className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[rgba(12,12,12,0.55)]">Journal Number</FormLabel>
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
                          <FormLabel className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[rgba(12,12,12,0.55)]">Journal Date</FormLabel>
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
                          <FormLabel className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[rgba(12,12,12,0.55)]">Keyword Match Mode</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-none border-[2px] border-[#0C0C0C] bg-[#FAF6EE] focus:border-[#C94A00] focus:ring-0">
                                <SelectValue placeholder="Select mode" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-[6px] border-[2px] border-[#0C0C0C] bg-[#FAF6EE]">
                              <SelectItem value="word">Exact Word Match</SelectItem>
                              <SelectItem value="contains">Contains Match</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" disabled={updateDashboard.isPending}>
                    {updateDashboard.isPending ? "Saving..." : "Save Configuration"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b-[2px] border-[rgba(12,12,12,0.1)]">
              <CardTitle className="text-sm font-[family-name:var(--font-mono)] uppercase tracking-[0.15em] text-[rgba(12,12,12,0.55)]">
                Monitored Keywords
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <Form {...kwForm}>
                <form onSubmit={kwForm.handleSubmit(onAddKw)} className="flex gap-2">
                  <FormField control={kwForm.control} name="value" render={({ field }) => (
                    <FormItem className="flex-1 space-y-0">
                      <FormControl><Input placeholder="Add keyword..." {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <Button type="submit" size="icon" disabled={addKeyword.isPending}><Plus className="h-4 w-4" /></Button>
                </form>
              </Form>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {keywords?.map(kw => (
                  <div key={kw.id} className="flex items-center justify-between bg-[#E8DFC7] border border-[rgba(12,12,12,0.15)] px-3 py-2 rounded-[4px]">
                    <span className="text-sm font-medium">{kw.value}</span>
                    <button
                      className="text-[rgba(12,12,12,0.35)] hover:text-[#C94A00] transition-colors ml-2"
                      onClick={() => deleteKeyword.mutate({ id: kw.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetKeywordsQueryKey() }) })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {keywords?.length === 0 && <div className="text-[10px] font-[family-name:var(--font-mono)] text-[rgba(12,12,12,0.35)] uppercase tracking-wider text-center py-4">No keywords configured.</div>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b-[2px] border-[rgba(12,12,12,0.1)]">
              <CardTitle className="text-sm font-[family-name:var(--font-mono)] uppercase tracking-[0.15em] text-[rgba(12,12,12,0.55)]">
                Monitored TM Numbers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <Form {...tmForm}>
                <form onSubmit={tmForm.handleSubmit(onAddTm)} className="flex gap-2">
                  <FormField control={tmForm.control} name="value" render={({ field }) => (
                    <FormItem className="flex-1 space-y-0">
                      <FormControl><Input placeholder="Add TM number..." {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <Button type="submit" size="icon" disabled={addTmNumber.isPending}><Plus className="h-4 w-4" /></Button>
                </form>
              </Form>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {tmNumbers?.map(tm => (
                  <div key={tm.id} className="flex items-center justify-between bg-[#E8DFC7] border border-[rgba(12,12,12,0.15)] px-3 py-2 rounded-[4px]">
                    <span className="text-sm font-[family-name:var(--font-mono)]">{tm.value}</span>
                    <button
                      className="text-[rgba(12,12,12,0.35)] hover:text-[#C94A00] transition-colors ml-2"
                      onClick={() => deleteTmNumber.mutate({ id: tm.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTmNumbersQueryKey() }) })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {tmNumbers?.length === 0 && <div className="text-[10px] font-[family-name:var(--font-mono)] text-[rgba(12,12,12,0.35)] uppercase tracking-wider text-center py-4">No TM numbers configured.</div>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
