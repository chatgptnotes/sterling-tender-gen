export const COMPANY = {
  name: "STERLING ELECTRICALS & TECHNOLOGIES",
  address: "PLOT NO 1-A, ARYA NAGAR, BEHIND KORADI NAKA, NAGPUR-440 030, MAHARASHTRA, INDIA",
  email: "akhilbahale@rediffmail.com",
  website: "www.sterlingtech.in",
  contact: "7972534245, 9730005841",
  gst: "27AJUPB8533A1Z9",
  proprietor: "Akhil Narayan Bahale",
  proprietorShort: "Akhil Bahale",
  vendorCode: "56573",
  bank: {
    name: "IDBI BANK",
    account: "543102000000994",
    ifsc: "IBKL0000543",
    branch: "DHARAMPETH NAGPUR",
  },
  witnesses: [
    "Nishant Mamulkar - Electrical Engineer, Uday Nagar, Nagpur",
    "Tushar Nagpure - Ayodhya Nagar, Nagpur",
  ],
};

export const POWER_STATIONS = [
  {
    code: "BTPS",
    name: "Bhusawal Thermal Power Station",
    address: "Deepnagar, Tal. Bhusawal, Dist. Jalgaon (M.S.) PIN 425307",
    chiefEngineer: "The Chief Engineer (O&M)",
  },
  {
    code: "KPKD",
    name: "Khaperkheda Thermal Power Station",
    address: "Distt. Nagpur (Maharashtra), India-441102",
    chiefEngineer: "The Chief Engineer",
  },
  {
    code: "CSTPS",
    name: "Chandrapur Super Thermal Power Station",
    address: "(Maharashtra), India",
    chiefEngineer: "The Chief Engineer",
  },
  {
    code: "KTPS",
    name: "Koradi Thermal Power Station",
    address: "Nagpur (Maharashtra)",
    chiefEngineer: "The Chief Engineer",
  },
];

export interface TenderItem {
  description: string;
  sapCode: string;
  hsnCode: string;
  makeModel: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  techSpecs: string;
  remarks: string;
}

export interface TenderFormData {
  rfxNumber: string;
  tenderNumber: string;
  tenderDescription: string;
  tenderIssueDate: string;
  date: string;
  reference: string;
  powerStationCode: string;
  customStationName: string;
  customStationAddress: string;
  supplyType: "indigenous" | "imported";
  importSupplier: string;
  // Deviation Sheet
  deviationStatus: "nil" | "deviation";
  deviationText: string;
  // Questionnaire
  dealerType: "Manufacturer" | "Authorized Dealer" | "Dealer";
  makeOffered: string;
  deliveryPeriod: string;
  items: TenderItem[];
  invoiceNumber: string;
  dmNumber: string;
  poNumber: string;
  poDate: string;
  vehicleNumber: string;
  dmReference: string;
}

export const defaultItem: TenderItem = {
  description: "",
  sapCode: "",
  hsnCode: "",
  makeModel: "As per tender",
  quantity: 1,
  unit: "Nos",
  unitPrice: 0,
  techSpecs: "AS PER TENDER",
  remarks: "NO",
};

export const defaultFormData: TenderFormData = {
  rfxNumber: "",
  tenderNumber: "",
  tenderDescription: "",
  tenderIssueDate: "",
  date: new Date().toISOString().split("T")[0],
  reference: "",
  powerStationCode: "BTPS",
  customStationName: "",
  customStationAddress: "",
  supplyType: "indigenous",
  importSupplier: "",
  deviationStatus: "nil",
  deviationText: "",
  dealerType: "Authorized Dealer",
  makeOffered: "",
  deliveryPeriod: "As per tender",
  items: [{ ...defaultItem }],
  invoiceNumber: "",
  dmNumber: "",
  poNumber: "",
  poDate: "",
  vehicleNumber: "",
  dmReference: "",
};
