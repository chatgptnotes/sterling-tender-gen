"use client";

import { useState, useRef } from "react";
import { Plus, Trash2, FileText, Receipt, Truck, ChevronDown, ChevronUp, Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { TenderFormData, TenderItem, defaultFormData, defaultItem, POWER_STATIONS } from "@/lib/constants";
import { generateTenderPDF, generateTaxInvoice, generateDeliveryMemo, getTenderFilename } from "@/lib/pdfGenerator";
import { generateWithQACheck, QAPageResult, QAProgressStatus } from "@/lib/pdfQualityCheck";

type ParseStatus = "idle" | "uploading" | "parsing" | "done" | "error";

export default function Home() {
  const [form, setForm] = useState<TenderFormData>({ ...defaultFormData, items: [{ ...defaultItem }] });
  const [openSections, setOpenSections] = useState({ tender: true, items: true, invoice: false, delivery: false });
  const [parseStatus, setParseStatus] = useState<ParseStatus>("idle");
  const [parseError, setParseError] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [genStatus, setGenStatus] = useState<"idle" | "generating" | "checking" | "done" | "warning">("idle");
  const [qaProgress, setQaProgress] = useState("");
  const [qaWarnings, setQaWarnings] = useState<QAPageResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  const setField = (field: keyof TenderFormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const setItem = (idx: number, field: keyof TenderItem, value: string | number) =>
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...f, items };
    });

  const addItem = () =>
    setForm((f) => ({ ...f, items: [...f.items, { ...defaultItem }] }));

  const removeItem = (idx: number) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const totalAmount = form.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const addFiles = (newFiles: File[]) => {
    setUploadedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const toAdd = newFiles.filter((f) => !existingNames.has(f.name));
      return [...prev, ...toAdd];
    });
  };

  const removeFile = (idx: number) =>
    setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleTenderUpload = async (files: File[]) => {
    if (!files.length) return;
    setParseStatus("parsing");
    setParseError("");
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/parse-tender", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Parsing failed");
      }
      const d = json.data;
      // Apply extracted fields to form
      setForm((prev) => ({
        ...prev,
        rfxNumber: d.rfxNumber || prev.rfxNumber,
        tenderNumber: d.tenderNumber || prev.tenderNumber,
        tenderDescription: d.tenderDescription || prev.tenderDescription,
        tenderIssueDate: d.tenderIssueDate || prev.tenderIssueDate,
        date: d.date || prev.date,
        powerStationCode: d.powerStationCode || prev.powerStationCode,
        customStationName: d.customStationName || prev.customStationName,
        customStationAddress: d.customStationAddress || prev.customStationAddress,
        supplyType: (d.supplyType === "imported" ? "imported" : "indigenous"),
        deliveryPeriod: d.deliveryPeriod || prev.deliveryPeriod,
        makeOffered: d.makeOffered || prev.makeOffered,
        dealerType: (["Manufacturer", "Authorized Dealer", "Dealer"].includes(d.dealerType)
          ? d.dealerType : prev.dealerType) as TenderFormData["dealerType"],
        items: d.items && d.items.length > 0
          ? d.items.map((it: Partial<TenderItem>) => ({
              ...defaultItem,
              description: it.description || "",
              sapCode: it.sapCode || "",
              hsnCode: it.hsnCode || "",
              makeModel: it.makeModel || "",
              quantity: Number(it.quantity) || 1,
              unit: it.unit || "Nos",
              unitPrice: Number(it.unitPrice) || 0,
              techSpecs: it.techSpecs || "",
              remarks: "NO",
            }))
          : prev.items,
      }));
      setParseStatus("done");
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : "Unknown error");
      setParseStatus("error");
    }
  };

  const handleGenerateWithQA = async () => {
    setGenStatus("generating");
    setQaProgress("Generating PDF...");
    setQaWarnings([]);

    try {
      await generateWithQACheck(
        () => generateTenderPDF(form),
        getTenderFilename(form),
        (status: QAProgressStatus) => {
          if (status.stage === "generating") {
            setGenStatus("generating");
            setQaProgress("Generating PDF...");
          } else if (status.stage === "checking") {
            setGenStatus("checking");
            setQaProgress(`Checking page ${status.page}/${status.total}...`);
          } else if (status.stage === "retrying") {
            setGenStatus("generating");
            setQaProgress(`Retrying (attempt ${status.attempt}/3)...`);
          } else if (status.stage === "done") {
            if (status.result.allMatch) {
              setGenStatus("done");
              setQaProgress("All pages verified!");
            } else {
              setGenStatus("warning");
              setQaWarnings(status.result.pages.filter((p) => !p.match));
              setQaProgress("Downloaded with quality warnings");
            }
            setTimeout(() => {
              setGenStatus("idle");
              setQaProgress("");
              setQaWarnings([]);
            }, 8000);
          } else if (status.stage === "error") {
            setGenStatus("idle");
            setQaProgress("");
            console.error(status.message);
          }
        }
      );
    } catch (err) {
      console.error(err);
      setGenStatus("idle");
      setQaProgress("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ background: "#1E3A5F" }} className="text-white px-6 py-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-wide">STERLING ELECTRICALS & TECHNOLOGIES</h1>
            <p className="text-sm text-blue-200 mt-0.5">Tender Document Generator — MSPGCL / MAHAGENCO</p>
          </div>
          <div style={{ background: "#F97316" }} className="rounded-full w-10 h-10 flex items-center justify-center">
            <FileText size={20} className="text-white" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">

        {/* AI Tender Parser */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
          <div style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #2a4f80 100%)" }}
            className="px-5 py-4 flex items-center gap-3">
            <div className="bg-orange-500 rounded-lg p-1.5">
              <Upload size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">AI Tender Auto-Fill</h2>
              <p className="text-blue-200 text-xs mt-0.5">Upload a tender PDF or DOCX — Gemini AI reads it and fills all fields automatically</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                ${parseStatus === "parsing" ? "border-orange-300 bg-orange-50 pointer-events-none" :
                  parseStatus === "done" ? "border-green-300 bg-green-50" :
                  parseStatus === "error" ? "border-red-300 bg-red-50" :
                  "border-gray-300 hover:border-orange-400 hover:bg-orange-50 bg-gray-50"}`}
              onClick={() => parseStatus !== "parsing" && fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dropped = Array.from(e.dataTransfer.files);
                if (dropped.length) { addFiles(dropped); setParseStatus("idle"); }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                multiple
                className="hidden"
                onChange={(e) => {
                  const selected = Array.from(e.target.files || []);
                  if (selected.length) { addFiles(selected); setParseStatus("idle"); }
                  e.target.value = "";
                }}
              />
              {parseStatus === "parsing" ? (
                <>
                  <Loader2 size={28} className="mx-auto text-orange-500 mb-2 animate-spin" />
                  <p className="text-sm font-medium text-orange-700">Gemini AI is reading {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""}...</p>
                  <p className="text-xs text-orange-400 mt-1">Extracting all tender details</p>
                </>
              ) : parseStatus === "done" ? (
                <>
                  <CheckCircle size={28} className="mx-auto text-green-500 mb-2" />
                  <p className="text-sm font-medium text-green-700">Fields filled — review and edit below</p>
                  <p className="text-xs text-green-500 mt-1">Click or drop to add more files</p>
                </>
              ) : parseStatus === "error" ? (
                <>
                  <AlertCircle size={28} className="mx-auto text-red-500 mb-2" />
                  <p className="text-sm font-medium text-red-700">{parseError}</p>
                  <p className="text-xs text-red-400 mt-1">Click to try again</p>
                </>
              ) : (
                <>
                  <Upload size={28} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-600">Drop tender files here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOCX — multiple files supported</p>
                </>
              )}
            </div>

            {/* File list */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""} queued</p>
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={14} className="text-blue-500 shrink-0" />
                      <span className="text-xs text-gray-700 truncate">{f.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                    </div>
                    {parseStatus !== "parsing" && (
                      <button onClick={() => removeFile(i)} className="ml-2 text-gray-400 hover:text-red-500 shrink-0">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}

                {/* Parse button */}
                {parseStatus !== "parsing" && (
                  <button
                    onClick={() => handleTenderUpload(uploadedFiles)}
                    style={{ background: "#F97316" }}
                    className="w-full mt-1 py-2.5 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <Upload size={15} />
                    Parse {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""} with Gemini AI
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SECTION: Tender Details */}
        <Section
          title="Tender Details"
          icon={<FileText size={16} />}
          open={openSections.tender}
          onToggle={() => toggleSection("tender")}
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="RFx Number" value={form.rfxNumber} onChange={(v) => setField("rfxNumber", v)} placeholder="e.g. 6000012345" />
            <Field label="Tender Number" value={form.tenderNumber} onChange={(v) => setField("tenderNumber", v)} placeholder="e.g. BTPS/O&M/2025-26/..." />
            <Field label="Tender Issue Date (by MSPGCL)" value={form.tenderIssueDate} onChange={(v) => setField("tenderIssueDate", v)} type="date" />
            <Field label="Submission Date" value={form.date} onChange={(v) => setField("date", v)} type="date" />
            <Field label="Reference" value={form.reference} onChange={(v) => setField("reference", v)} placeholder="Reference / correspondence" />
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tender Description</label>
              <textarea
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": "#F97316" } as React.CSSProperties}
                rows={2}
                value={form.tenderDescription}
                onChange={(e) => setField("tenderDescription", e.target.value)}
                placeholder="Description of items / works in the tender"
              />
            </div>
            {/* Supply type toggle */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-2">Supply Type (for Declaration)</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="supplyType"
                    value="indigenous"
                    checked={form.supplyType === "indigenous"}
                    onChange={() => setField("supplyType", "indigenous")}
                    className="accent-orange-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Indigenous Supply</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="supplyType"
                    value="imported"
                    checked={form.supplyType === "imported"}
                    onChange={() => setField("supplyType", "imported")}
                    className="accent-orange-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Imported Supply</span>
                </label>
              </div>
            </div>
            {form.supplyType === "imported" && (
              <div className="col-span-2">
                <Field
                  label="Import Supplier / Country of Origin"
                  value={form.importSupplier}
                  onChange={(v) => setField("importSupplier", v)}
                  placeholder="e.g. Germany, or Supplier Name, Country"
                />
              </div>
            )}

            {/* Deviation Sheet toggle */}
            <div className="col-span-2 border-t pt-4 mt-1">
              <label className="block text-xs font-semibold text-gray-600 mb-2">Deviation Sheet</label>
              <div className="flex gap-4 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="deviationStatus" value="nil"
                    checked={form.deviationStatus === "nil"}
                    onChange={() => setField("deviationStatus", "nil")}
                    className="accent-orange-500" />
                  <span className="text-sm font-medium text-gray-700">NIL / No Deviation</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="deviationStatus" value="deviation"
                    checked={form.deviationStatus === "deviation"}
                    onChange={() => setField("deviationStatus", "deviation")}
                    className="accent-orange-500" />
                  <span className="text-sm font-medium text-gray-700">Has Deviation</span>
                </label>
              </div>
              {form.deviationStatus === "deviation" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Deviation Details (one per line)</label>
                  <textarea
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1"
                    rows={4}
                    value={form.deviationText}
                    onChange={(e) => setField("deviationText", e.target.value)}
                    placeholder="Describe each deviation on a separate line..."
                  />
                </div>
              )}
            </div>

            {/* Questionnaire fields */}
            <div className="col-span-2 border-t pt-4">
              <label className="block text-xs font-semibold text-gray-600 mb-2">Questionnaire Details</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Dealer Type</label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none"
                    value={form.dealerType}
                    onChange={(e) => setField("dealerType", e.target.value as "Manufacturer" | "Authorized Dealer" | "Dealer")}
                  >
                    <option>Authorized Dealer</option>
                    <option>Manufacturer</option>
                    <option>Dealer</option>
                  </select>
                </div>
                <Field label="Make Offered" value={form.makeOffered} onChange={(v) => setField("makeOffered", v)} placeholder="e.g. ABB / Siemens" />
                <Field label="Delivery Period" value={form.deliveryPeriod} onChange={(v) => setField("deliveryPeriod", v)} placeholder="As per tender" />
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Power Station</label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2"
                value={form.powerStationCode}
                onChange={(e) => setField("powerStationCode", e.target.value)}
              >
                {POWER_STATIONS.map((s) => (
                  <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                ))}
                <option value="CUSTOM">Custom Station</option>
              </select>
            </div>
            {form.powerStationCode === "CUSTOM" && (
              <>
                <Field label="Custom Station Name" value={form.customStationName} onChange={(v) => setField("customStationName", v)} />
                <Field label="Custom Station Address" value={form.customStationAddress} onChange={(v) => setField("customStationAddress", v)} />
              </>
            )}
          </div>
        </Section>

        {/* SECTION: Items */}
        <Section
          title="Items / SAP Codes"
          icon={<FileText size={16} />}
          open={openSections.items}
          onToggle={() => toggleSection("items")}
        >
          <div className="space-y-4">
            {form.items.map((item, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-white relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white px-2 py-0.5 rounded" style={{ background: "#1E3A5F" }}>
                    Item {idx + 1}
                  </span>
                  {form.items.length > 1 && (
                    <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="SAP Code" value={item.sapCode} onChange={(v) => setItem(idx, "sapCode", v)} placeholder="e.g. A10217007..." />
                  <Field label="HSN Code" value={item.hsnCode} onChange={(v) => setItem(idx, "hsnCode", v)} placeholder="e.g. 8504" />
                  <Field label="Make / Model" value={item.makeModel} onChange={(v) => setItem(idx, "makeModel", v)} />
                  <div className="col-span-3">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                    <textarea
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none"
                      rows={2}
                      value={item.description}
                      onChange={(e) => setItem(idx, "description", e.target.value)}
                      placeholder="Full item description as per tender"
                    />
                  </div>
                  <Field label="Quantity" value={String(item.quantity)} onChange={(v) => setItem(idx, "quantity", Number(v))} type="number" />
                  <Field label="Unit" value={item.unit} onChange={(v) => setItem(idx, "unit", v)} placeholder="Nos / Set / Mtr" />
                  <Field label="Unit Price (Rs.)" value={String(item.unitPrice)} onChange={(v) => setItem(idx, "unitPrice", Number(v))} type="number" />
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Tech Specs</label>
                    <input
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none"
                      value={item.techSpecs}
                      onChange={(e) => setItem(idx, "techSpecs", e.target.value)}
                    />
                  </div>
                  <Field label="Remarks" value={item.remarks} onChange={(v) => setItem(idx, "remarks", v)} placeholder="NO / as applicable" />
                  <div className="flex items-end">
                    <div className="text-sm font-bold text-gray-800">
                      Total: Rs. {(item.quantity * item.unitPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={addItem}
                className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded text-white"
                style={{ background: "#F97316" }}
              >
                <Plus size={14} /> Add Item
              </button>
              <div className="text-right">
                <div className="text-xs text-gray-500">Total (excl. GST)</div>
                <div className="text-lg font-bold" style={{ color: "#1E3A5F" }}>
                  Rs. {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* SECTION: Invoice Details (collapsible) */}
        <Section
          title="Tax Invoice Details (optional)"
          icon={<Receipt size={16} />}
          open={openSections.invoice}
          onToggle={() => toggleSection("invoice")}
        >
          <div className="grid grid-cols-3 gap-4">
            <Field label="Invoice Number" value={form.invoiceNumber} onChange={(v) => setField("invoiceNumber", v)} placeholder="e.g. SET/INV/2025-26/001" />
            <Field label="PO Number" value={form.poNumber} onChange={(v) => setField("poNumber", v)} />
            <Field label="PO Date" value={form.poDate} onChange={(v) => setField("poDate", v)} type="date" />
          </div>
        </Section>

        {/* SECTION: Delivery Memo Details (collapsible) */}
        <Section
          title="Delivery Memo Details (optional)"
          icon={<Truck size={16} />}
          open={openSections.delivery}
          onToggle={() => toggleSection("delivery")}
        >
          <div className="grid grid-cols-3 gap-4">
            <Field label="DM Number" value={form.dmNumber} onChange={(v) => setField("dmNumber", v)} placeholder="e.g. SET/DM/2025-26/001" />
            <Field label="Vehicle Number" value={form.vehicleNumber} onChange={(v) => setField("vehicleNumber", v)} placeholder="e.g. MH-31-XX-0000" />
            <Field label="DM Reference" value={form.dmReference} onChange={(v) => setField("dmReference", v)} />
          </div>
        </Section>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleGenerateWithQA}
            disabled={genStatus !== "idle"}
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-bold text-sm shadow-md hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ background: "#1E3A5F" }}
          >
            {genStatus === "idle" ? (
              <>
                <FileText size={16} />
                Generate Tender Documents (Combined PDF)
              </>
            ) : genStatus === "generating" || genStatus === "checking" ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {qaProgress}
              </>
            ) : genStatus === "done" ? (
              <>
                <CheckCircle size={16} />
                {qaProgress}
              </>
            ) : (
              <>
                <AlertCircle size={16} />
                {qaProgress}
              </>
            )}
          </button>
          <button
            onClick={() => generateTaxInvoice(form)}
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-bold text-sm shadow-md hover:opacity-90 transition-opacity"
            style={{ background: "#F97316" }}
          >
            <Receipt size={16} />
            Generate Tax Invoice
          </button>
          <button
            onClick={() => generateDeliveryMemo(form)}
            className="flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-sm border-2 hover:bg-gray-50 transition-colors"
            style={{ borderColor: "#1E3A5F", color: "#1E3A5F" }}
          >
            <Truck size={16} />
            Generate Delivery Memo
          </button>
        </div>

        {/* QA Warnings */}
        {qaWarnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-yellow-800 mb-2">Quality Check Warnings</p>
            {qaWarnings.map((w, i) => (
              <div key={i} className="text-xs text-yellow-700 mb-1">
                <span className="font-medium">Page {w.pageIndex + 1} ({w.pageType}):</span>
                {w.differences.map((d, j) => (
                  <div key={j} className="ml-4">- {d.element}: expected &quot;{d.expected}&quot;, got &quot;{d.actual}&quot;</div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Tender Docs Info */}
        <div className="rounded-lg border p-4 bg-white text-xs text-gray-600">
          <p className="font-semibold text-gray-800 mb-2">Combined Tender PDF includes:</p>
          <div className="grid grid-cols-2 gap-1">
            {["1. Self Declaration", "2. Declaration / Undertaking (Ministry of Power)", "3. Annexure-C (Conflict of Interest)", "4. Item Details with SAP Codes", "5. Deviation Sheet (NIL)", "6. Questionnaire for Supply"].map((doc) => (
              <div key={doc} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#F97316" }} />
                {doc}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pb-6">
          drmhope.com | A Bettroi Product &nbsp;|&nbsp; v1.0 &nbsp;|&nbsp; 2026-03-15
        </div>
      </div>
    </div>
  );
}

// Reusable Section Component
function Section({ title, icon, open, onToggle, children }: {
  title: string; icon: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: "#1E3A5F" }}>
          <span style={{ color: "#F97316" }}>{icon}</span>
          {title}
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}

// Reusable Field Component
function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1"
        style={{ "--tw-ring-color": "#F97316" } as React.CSSProperties}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
