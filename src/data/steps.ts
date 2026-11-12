import type { WorkflowStep } from "../types";

export const REJECT_STEP = 6; // quotation can be lost at "Customer quotation"
export const ORDER_STEP = 7; // awarded quotation becomes an order here

export const STEPS: WorkflowStep[] = [
  {
    id: 1,
    name: "RFQ ingestion",
    short: "RFQ in",
    agent: "RFQ Agent",
    owner: "Estimator",
    tech: ["AI", "Integration"],
    description:
      "Outlook mailbox is read through Microsoft Graph. Email and attachments are stored, a unique RFQ ID is made, duplicates are checked.",
    output: "Central RFQ record with original email and attachments",
  },
  {
    id: 2,
    name: "Document intelligence",
    short: "Doc AI",
    agent: "Document Intelligence Agent",
    owner: "Estimator",
    tech: ["AI", "Rules"],
    description:
      "OCR and vision models read sketches, PDFs and drawings. Dimensions, wood type and finish are extracted into a fixed JSON. Low confidence fields are flagged.",
    output: "Structured RFQ with confidence scores",
  },
  {
    id: 3,
    name: "RFQ review & approval",
    short: "RFQ review",
    agent: "Requirement Validation Agent",
    owner: "Estimator / Sales",
    tech: ["AI", "Human"],
    description:
      "Estimator checks extracted values. AI lists missing information and drafts a clarification email. A human approves the RFQ for estimation.",
    output: "RFQ approved for estimation",
  },
  {
    id: 4,
    name: "Design, BOM & costing",
    short: "Costing",
    agent: "Estimation Assistant Agent",
    owner: "Design / Estimator",
    tech: ["AI", "Rules", "Human"],
    description:
      "Technical design and Bill of Materials are prepared. The price book engine does the math. AI only suggests and explains, it never invents a price.",
    output: "Auditable cost estimate",
  },
  {
    id: 5,
    name: "Margin intelligence",
    short: "Margin",
    agent: "Margin Intelligence Agent",
    owner: "Estimator / Manager",
    tech: ["ML", "Rules", "Human"],
    description:
      "ML model suggests a target margin. Pricing engine computes selling price = cost / (1 - margin). Business rules enforce minimum margin.",
    output: "Selling price, margin and explanation",
  },
  {
    id: 6,
    name: "Customer quotation",
    short: "Quotation",
    agent: "Quotation Agent",
    owner: "Sales",
    tech: ["AI", "Rules", "Human"],
    description:
      "Quotation document is generated and sent. Negotiation is tracked. Result is Awarded or Lost, and the lost reason is recorded.",
    output: "Awarded or rejected quotation",
  },
  {
    id: 7,
    name: "Order conversion",
    short: "Order",
    agent: "Order Workflow (rules)",
    owner: "Sales / Project owner",
    tech: ["Rules"],
    description:
      "Accepted quotation becomes a sales order. The accepted version is frozen as the baseline. RFQ, quotation, estimate and order stay linked.",
    output: "Sales order ready for procurement",
  },
  {
    id: 8,
    name: "Procurement",
    short: "Procure",
    agent: "Procurement Agent",
    owner: "Procurement",
    tech: ["AI", "ML", "Rules", "Human"],
    description:
      "Need = max(0, required - available - eligible incoming). Suppliers are compared on price, quality, lead time and reliability. Purchase orders need approval.",
    output: "Approved purchase orders",
  },
  {
    id: 9,
    name: "Inventory",
    short: "Inventory",
    agent: "Inventory Agent",
    owner: "Warehouse",
    tech: ["ML", "Rules"],
    description:
      "Materials are received, inspected and booked into stock. Stock is reserved for the order through transactional logic, never by an LLM.",
    output: "Reserved materials for production",
  },
  {
    id: 10,
    name: "Manufacturing",
    short: "Make",
    agent: "Manufacturing Agent",
    owner: "Manufacturing / Quality",
    tech: ["AI", "ML", "Human"],
    description:
      "Work order is created and scheduled. Cutting, shaping, assembly, polishing and quality inspection are tracked. Rework is recorded.",
    output: "Quality approved product",
  },
  {
    id: 11,
    name: "Delivery & installation",
    short: "Deliver",
    agent: "Logistics Agent",
    owner: "Logistics",
    tech: ["AI", "ML", "Integration"],
    description:
      "Dispatch, transport, delivery and on-site installation are tracked with shipment events. ML predicts ETA and delay risk.",
    output: "Verified delivery and installation",
  },
  {
    id: 12,
    name: "Payments",
    short: "Payments",
    agent: "Finance Assistant Agent",
    owner: "Finance",
    tech: ["Rules", "Integration"],
    description:
      "Invoices, advance and milestone payments, discounts and refunds. Payment gateway sends a signed webhook, then the ledger is reconciled.",
    output: "Invoices paid and reconciled",
  },
  {
    id: 13,
    name: "After-sales",
    short: "After-sales",
    agent: "After-sales Agent",
    owner: "Customer support",
    tech: ["AI", "Human"],
    description:
      "Complaints, damages, returns and rework run as a separate process linked to the order. Vision AI helps assess damage, a human approves the resolution.",
    output: "Service case closed",
  },
  {
    id: 14,
    name: "Business intelligence",
    short: "BI",
    agent: "Analytics Agent",
    owner: "Management",
    tech: ["ML", "AI"],
    description:
      "Full order history feeds dashboards: conversion rate, margin accuracy, supplier performance, delays and profit. Drill down to any order.",
    output: "Closed order and analytics",
  },
];
