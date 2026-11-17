import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export interface ColumnDefinition {
  key: string;
  label: string;
  required?: boolean;
  example?: string | number;
  description?: string;
}

export interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entityName: string;
  columns: ColumnDefinition[];
  onImport: (data: Record<string, any>[]) => Promise<void>;
  sampleData?: Record<string, any>[];
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  title,
  entityName,
  columns,
  onImport,
  sampleData,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [unmappedHeaders, setUnmappedHeaders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setParsedRows([]);
    setColumnMapping({});
    setUnmappedHeaders([]);
    setIsProcessing(false);
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Generate and download a sample Excel file with prefilled headers & sample row
  const downloadTemplate = () => {
    const templateRow: Record<string, any> = {};
    columns.forEach((col) => {
      templateRow[col.label] = col.example !== undefined ? col.example : `Sample ${col.label}`;
    });

    const dataToExport = sampleData && sampleData.length > 0
      ? sampleData.map((row) => {
          const exportRow: Record<string, any> = {};
          columns.forEach((col) => {
            exportRow[col.label] = row[col.key] !== undefined ? row[col.key] : '';
          });
          return exportRow;
        })
      : [templateRow];

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, entityName);
    XLSX.writeFile(workbook, `${entityName.toLowerCase().replace(/\s+/g, '_')}_import_template.xlsx`);
    toast.success(`Template downloaded: ${entityName} import template`);
  };

  // Parse uploaded Excel or CSV file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Please upload an Excel (.xlsx, .xls) or CSV file');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          toast.error('The uploaded file contains no data rows');
          setIsProcessing(false);
          return;
        }

        const fileHeaders = Object.keys(rawJson[0]);

        // Auto-match headers to target columns by comparing normalized strings
        const mapping: Record<string, string> = {};
        const unmapped: string[] = [];

        fileHeaders.forEach((fh) => {
          const normalized = fh.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          const matchedCol = columns.find((c) => {
            const normKey = c.key.toLowerCase().replace(/[^a-z0-9]/g, '');
            const normLabel = c.label.toLowerCase().replace(/[^a-z0-9]/g, '');
            return normKey === normalized || normLabel === normalized;
          });

          if (matchedCol) {
            mapping[fh] = matchedCol.key;
          } else {
            unmapped.push(fh);
          }
        });

        // Map raw data rows to normalized keys
        const mappedData = rawJson.map((row) => {
          const newRow: Record<string, any> = {};
          Object.entries(row).forEach(([rawKey, val]) => {
            const mappedKey = mapping[rawKey] || rawKey;
            newRow[mappedKey] = typeof val === 'string' ? val.trim() : val;
          });
          return newRow;
        });

        setColumnMapping(mapping);
        setUnmappedHeaders(unmapped);
        setParsedRows(mappedData);
        setIsProcessing(false);
        toast.success(`Successfully parsed ${mappedData.length} records from ${selectedFile.name}`);
      } catch (err: any) {
        console.error('Failed to parse excel:', err);
        toast.error('Failed to parse file. Please verify it is a valid Excel spreadsheet.');
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) {
      toast.error('No rows to import');
      return;
    }

    // Check required columns
    const missingRequiredCols = columns
      .filter((c) => c.required)
      .filter((c) => !Object.values(columnMapping).includes(c.key));

    if (missingRequiredCols.length > 0) {
      toast.error(
        `Missing required column mapping: ${missingRequiredCols.map((c) => c.label).join(', ')}`
      );
      return;
    }

    try {
      setIsImporting(true);
      await onImport(parsedRows);
      toast.success(`Import complete! ${parsedRows.length} ${entityName} populated successfully.`);
      handleClose();
    } catch (err: any) {
      console.error('Import failed:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Bulk import failed. Please verify data formats.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="font-poppins font-bold text-lg text-ink">
                  {title || `Upload & Import ${entityName}`}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Populate {entityName} in bulk directly from an Excel (.xlsx, .xls) or CSV file.
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              className="text-xs font-semibold gap-1.5 h-8 bg-zinc-50 hover:bg-zinc-100 text-ink shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              Download Template
            </Button>
          </div>
        </DialogHeader>

        {/* Upload Dropzone or Data Preview */}
        <div className="flex-1 overflow-y-auto space-y-4 my-2">
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/80 hover:border-primary/50 hover:bg-primary/5 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-150 text-center bg-zinc-50/50"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="p-3.5 rounded-full bg-white shadow-2xs border border-border/60 text-primary">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div>
                <p className="font-poppins font-semibold text-sm text-ink">
                  Click to upload Excel or CSV spreadsheet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports .xlsx, .xls, and .csv with automatic column header detection
                </p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {columns.slice(0, 4).map((col) => (
                  <Badge key={col.key} variant="outline" className="text-[10px] bg-white font-mono">
                    {col.label} {col.required && '*'}
                  </Badge>
                ))}
                {columns.length > 4 && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    +{columns.length - 4} more
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File details & stats */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 border border-border/70">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-poppins font-bold text-xs text-ink">{file.name}</span>
                      <Badge variant="success" className="text-[10px] py-0 px-1.5 font-mono">
                        {parsedRows.length} rows ready
                      </Badge>
                    </div>
                    <span className="text-[10.5px] text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB • Auto-matched {Object.keys(columnMapping).length} of {columns.length} columns
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetState}
                  className="h-8 text-xs text-destructive hover:bg-destructive/10 gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear File
                </Button>
              </div>

              {/* Data Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-poppins font-semibold text-ink">
                  <span>Data Preview (First 5 of {parsedRows.length} records)</span>
                  <span className="text-muted-foreground font-normal text-[11px]">
                    Scroll horizontally to inspect all parsed columns
                  </span>
                </div>

                <div className="border border-border/70 rounded-xl overflow-hidden overflow-x-auto shadow-2xs bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-50/80 border-b border-border/70 text-[11px] font-bold font-poppins text-muted-foreground">
                        <th className="py-2.5 px-3 w-10">#</th>
                        {columns.map((col) => (
                          <th key={col.key} className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{col.label}</span>
                              {col.required && <span className="text-destructive font-bold">*</span>}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {parsedRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/50">
                          <td className="py-2 px-3 font-mono text-[10px] text-muted-foreground">{idx + 1}</td>
                          {columns.map((col) => (
                            <td key={col.key} className="py-2 px-3 whitespace-nowrap text-ink">
                              {row[col.key] !== undefined && row[col.key] !== '' ? (
                                String(row[col.key])
                              ) : (
                                <span className="text-muted-foreground/40 italic font-mono text-[10px]">
                                  empty
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-border/70 pt-4 mt-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Values will be validated and populated directly into database</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isImporting}
              className="text-xs h-9 px-4 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleExecuteImport}
              disabled={!file || parsedRows.length === 0 || isImporting || isProcessing}
              className="text-xs font-poppins font-bold bg-primary hover:bg-primary/95 text-white shadow-2xs h-9 px-5 rounded-xl gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Importing {parsedRows.length} Records...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Populate {parsedRows.length > 0 ? `${parsedRows.length} ${entityName}` : 'Data'}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
