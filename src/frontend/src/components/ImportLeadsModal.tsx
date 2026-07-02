import { LeadSource, LeadStatus } from "@/backend";
import type { BulkLeadInput } from "@/backend";
import { Download, FileUp, Loader2, UploadCloud, X } from "lucide-react";
import Papa from "papaparse";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useStrataFiContext } from "../AppContext";
import { EmptyState } from "./Primitives";

/**
 * CSV import modal for the Leads page.
 *
 * Drag-and-drop or click-to-browse a .csv file, parse it with papaparse
 * (header: true), validate each row (name + phone required), preview the
 * parsed rows with invalid rows highlighted, then on confirm call
 * bulkImportLeads on the active tenant with only the valid rows.
 *
 * Reads `activeTenantId` and `bulkImportLeads` from useStrataFiContext().
 */
export interface ImportLeadsModalProps {
  open: boolean;
  onClose: () => void;
}

// ---- CSV header → field mapping -------------------------------------------
const CSV_HEADERS = [
  "name",
  "phone",
  "email",
  "source",
  "annualPremiumValue",
  "status",
  "assignedAgentId",
] as const;

// Acceptable string values for the source / status columns.
const SOURCE_VALUES = new Set<string>(Object.values(LeadSource));
const STATUS_VALUES = new Set<string>(Object.values(LeadStatus));

interface ParsedRow {
  rowIndex: number;
  raw: Record<string, string>;
  name: string;
  phone: string;
  email: string;
  source: string;
  annualPremiumValue: string;
  status: string;
  assignedAgentId: string;
  errors: string[];
}

const SAMPLE_CSV = [
  "name,phone,email,source,annualPremiumValue,status,assignedAgentId",
  "Avery Thompson,+1-415-555-0142,avery@thompsonins.com,referral,4200,newLead,",
  "Marcus Delgado,+1-312-555-0188,marcus.d@gmail.com,coldCall,3600,aiContacted,",
  "Priya Raman,+1-206-555-0173,priya@ramanfs.com,webForm,5100,apptBooked,",
  "Liam O'Connor,+1-617-555-0119,liam@oconnorwealth.com,socialMedia,2750,liveTransferred,",
  "Sofia Marchetti,+1-305-555-0164,sofia.m@capfin.com,emailCampaign,6800,sold,",
].join("\n");

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "stratafi-leads-template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function normalizeHeader(h: string): string {
  return h.trim().replace(/\s+/g, "").toLowerCase();
}

function pick(row: Record<string, string>, field: string): string {
  // Try exact, then normalized header match.
  if (field in row) return (row[field] ?? "").trim();
  const norm = normalizeHeader(field);
  for (const k of Object.keys(row)) {
    if (normalizeHeader(k) === norm) return (row[k] ?? "").trim();
  }
  return "";
}

function validateRow(raw: Record<string, string>, rowIndex: number): ParsedRow {
  const name = pick(raw, "name");
  const phone = pick(raw, "phone");
  const email = pick(raw, "email");
  const source = pick(raw, "source");
  const annualPremiumValue = pick(raw, "annualPremiumValue");
  const status = pick(raw, "status");
  const assignedAgentId = pick(raw, "assignedAgentId");

  const errors: string[] = [];
  if (!name) errors.push("name is required");
  if (!phone) errors.push("phone is required");
  if (source && !SOURCE_VALUES.has(source))
    errors.push(`unknown source "${source}"`);
  if (status && !STATUS_VALUES.has(status))
    errors.push(`unknown status "${status}"`);
  if (annualPremiumValue && Number.isNaN(Number(annualPremiumValue)))
    errors.push("annualPremiumValue must be a number");

  return {
    rowIndex,
    raw,
    name,
    phone,
    email,
    source,
    annualPremiumValue,
    status,
    assignedAgentId,
    errors,
  };
}

function toBulkLeadInput(row: ParsedRow): BulkLeadInput {
  const input: BulkLeadInput = {
    name: row.name,
    phone: row.phone,
  };
  if (row.email) input.email = row.email;
  // Default source to csvImport when not specified.
  input.source = row.source ? (row.source as LeadSource) : LeadSource.csvImport;
  // Default status to newLead when not specified.
  input.status = row.status ? (row.status as LeadStatus) : LeadStatus.newLead;
  // Default annualPremiumValue to 0 when not specified.
  const apv = row.annualPremiumValue ? Number(row.annualPremiumValue) : 0;
  if (!Number.isNaN(apv)) input.annualPremiumValue = BigInt(Math.round(apv));
  // Default assignedAgentId to null (omit) when not specified. The CSV value
  // is a string; only assign it when it parses as a valid bigint.
  if (row.assignedAgentId) {
    try {
      input.assignedAgentId = BigInt(row.assignedAgentId);
    } catch {
      /* leave unassigned — backend treats omitted as null */
    }
  }
  return input;
}

export function ImportLeadsModal({ open, onClose }: ImportLeadsModalProps) {
  const { activeTenantId, bulkImportLeads } = useStrataFiContext();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state whenever the modal is closed/reopened.
  useEffect(() => {
    if (!open) {
      setRows([]);
      setFileName("");
      setParsing(false);
      setImporting(false);
      setDragOver(false);
    }
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !importing) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, importing, onClose]);

  const handleFile = useCallback((file: File) => {
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      toast.error("Please select a .csv file");
      return;
    }
    setFileName(file.name);
    setParsing(true);
    setRows([]);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data.map((raw, i) =>
          validateRow(raw as Record<string, string>, i),
        );
        setRows(parsed);
        setParsing(false);
        if (parsed.length === 0) {
          toast.message("CSV parsed", {
            description: "No rows found in the file.",
          });
        } else {
          const invalid = parsed.filter((r) => r.errors.length > 0).length;
          toast.success(`Parsed ${parsed.length} rows`, {
            description:
              invalid > 0
                ? `${parsed.length - invalid} valid, ${invalid} need attention`
                : "All rows look valid",
          });
        }
      },
      error: (err) => {
        setParsing(false);
        toast.error("Failed to parse CSV", { description: err.message });
      },
    });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const validRows = useMemo(
    () => rows.filter((r) => r.errors.length === 0),
    [rows],
  );
  const invalidRows = useMemo(
    () => rows.filter((r) => r.errors.length > 0),
    [rows],
  );

  const onConfirm = useCallback(async () => {
    if (!activeTenantId) {
      toast.error("No active tenant", {
        description: "Select a tenant before importing leads.",
      });
      return;
    }
    if (validRows.length === 0) {
      toast.error("Nothing to import", {
        description: "No valid rows found in the file.",
      });
      return;
    }
    setImporting(true);
    try {
      const inputs = validRows.map(toBulkLeadInput);
      const result = await bulkImportLeads(activeTenantId, inputs);
      if (!result) {
        toast.error("Import failed", {
          description: "The backend rejected the request.",
        });
        return;
      }
      const created = result.createdIds.length;
      const errs = result.errors;
      if (created > 0) {
        toast.success(`Imported ${created} lead${created === 1 ? "" : "s"}`, {
          description:
            errs.length > 0
              ? `${errs.length} row(s) skipped by backend.`
              : undefined,
        });
      } else {
        toast.error("No leads imported", {
          description:
            errs.length > 0 ? errs[0] : "The backend returned no created IDs.",
        });
      }
      onClose();
    } catch (err) {
      toast.error("Import failed", {
        description: err instanceof Error ? err.message : "Unexpected error",
      });
    } finally {
      setImporting(false);
    }
  }, [activeTenantId, bulkImportLeads, validRows, onClose]);

  if (!open) return null;

  return (
    <div
      data-ocid="import_leads.dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !importing) onClose();
      }}
    >
      <div className="crm-card w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md border border-primary/30 bg-primary/10 flex items-center justify-center">
              <UploadCloud className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">
                Import Leads
              </h2>
              <p className="text-xs text-muted-foreground">
                Upload a CSV to bulk-create leads for the active tenant
              </p>
            </div>
          </div>
          <button
            type="button"
            data-ocid="import_leads.close_button"
            aria-label="Close import modal"
            onClick={() => !importing && onClose()}
            disabled={importing}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 space-y-5">
          {/* Drop zone + sample */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-stretch">
            <button
              type="button"
              data-ocid="import_leads.dropzone"
              aria-label="Drop a CSV file here or click to browse"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`crm-input cursor-pointer flex flex-col items-center justify-center text-center px-6 py-8 transition-colors ${
                dragOver
                  ? "border-primary glow-green"
                  : "hover:border-primary/60"
              }`}
            >
              <FileUp className="w-8 h-8 text-primary mb-2" />
              <p className="text-sm text-foreground font-medium">
                Drop a CSV here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Accepted: .csv · Headers: {CSV_HEADERS.join(", ")}
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
            </button>
            <button
              data-ocid="import_leads.sample_button"
              type="button"
              onClick={downloadSampleCsv}
              className="crm-card flex flex-col items-center justify-center gap-2 px-5 py-4 hover:border-primary/50 transition-colors text-center"
            >
              <Download className="w-5 h-5 text-secondary" />
              <span className="text-sm font-medium text-foreground">
                Download Sample CSV
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                5 example rows
              </span>
            </button>
          </div>

          {/* Status line */}
          {fileName && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-mono">
                {fileName}
              </span>
              {parsing ? (
                <span className="text-secondary flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Parsing…
                </span>
              ) : rows.length > 0 ? (
                <span className="flex items-center gap-3">
                  <span className="text-primary">{validRows.length} valid</span>
                  {invalidRows.length > 0 && (
                    <span className="text-destructive">
                      {invalidRows.length} invalid
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {rows.length} total
                  </span>
                </span>
              ) : null}
            </div>
          )}

          {/* Preview table */}
          {parsing ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-secondary" />
            </div>
          ) : rows.length === 0 && fileName ? (
            <EmptyState
              message="No rows found in the CSV"
              hint="Try the sample template, then re-upload."
            />
          ) : rows.length === 0 ? (
            <EmptyState
              message="No file selected yet"
              hint="Drop a CSV above or download the sample template."
            />
          ) : (
            <div className="crm-card overflow-hidden">
              <div className="overflow-x-auto scrollbar-thin max-h-[40vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card border-b border-border">
                    <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 w-8">#</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Phone</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Source</th>
                      <th className="px-3 py-2 text-right">APV</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Agent</th>
                      <th className="px-3 py-2">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const invalid = r.errors.length > 0;
                      return (
                        <tr
                          key={r.rowIndex}
                          data-ocid={`import_leads.row.${r.rowIndex + 1}`}
                          className={`border-b border-border/60 ${
                            invalid ? "bg-destructive/5" : ""
                          }`}
                        >
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                            <span
                              className={`inline-block w-2 h-2 rounded-full mr-1.5 align-middle ${
                                invalid ? "bg-destructive" : "bg-primary"
                              }`}
                              title={invalid ? "Invalid row" : "Valid row"}
                            />
                            {r.rowIndex + 1}
                          </td>
                          <td className="px-3 py-2 text-foreground">
                            {r.name || (
                              <span className="text-destructive">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-foreground font-mono text-xs">
                            {r.phone || (
                              <span className="text-destructive">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground text-xs">
                            {r.email || "—"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground text-xs">
                            {r.source || (
                              <span className="text-muted-foreground/60">
                                csvImport
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs text-foreground">
                            {r.annualPremiumValue || "0"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground text-xs">
                            {r.status || (
                              <span className="text-muted-foreground/60">
                                newLead
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground text-xs font-mono">
                            {r.assignedAgentId || "—"}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {invalid ? (
                              <span className="text-destructive">
                                {r.errors.join("; ")}
                              </span>
                            ) : (
                              <span className="text-primary">OK</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {validRows.length > 0
              ? `${validRows.length} row${validRows.length === 1 ? "" : "s"} will be imported`
              : "No valid rows to import"}
          </p>
          <div className="flex items-center gap-2">
            <button
              data-ocid="import_leads.cancel_button"
              type="button"
              onClick={onClose}
              disabled={importing}
              className="crm-input px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              data-ocid="import_leads.confirm_button"
              type="button"
              onClick={onConfirm}
              disabled={importing || validRows.length === 0 || !activeTenantId}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing…
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  Confirm Import
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
