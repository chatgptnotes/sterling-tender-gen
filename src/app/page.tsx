"use client";

import { useState } from "react";
import { Plus, Trash2, FileText, Receipt, Truck, ChevronDown, ChevronUp } from "lucide-react";
import { TenderFormData, TenderItem, defaultFormData, defaultItem, POWER_STATIONS } from "@/lib/constants";
import { generateTenderPDF, generateTaxInvoice, generateDeliveryMemo } from "@/lib/pdfGenerator";
import { generateDeclarationPDF } from "@/lib/declarationPDF";
// generateDeclarationPDF is used inside generateTenderPDF combined flow

export default function Home() {
  const [form, setForm] = useState<TenderFormData>({ ...defaultFormData, items: [{ ...defaultItem }] });
  const [openSections, setOpenSections] = useState({ tender: true, items: true, invoice: false, delivery: false });

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
            onClick={() => generateTenderPDF(form).catch(console.error)}
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-bold text-sm shadow-md hover:opacity-90 transition-opacity"
            style={{ background: "#1E3A5F" }}
          >
            <FileText size={16} />
            Generate Tender Documents (Combined PDF)
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
