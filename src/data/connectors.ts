// Connector catalog: the external systems ALAG agents reach through MCP (Model Context Protocol), end to end.
// Researched 2026-11-13 from vendor documentation. MCP products move fast, so each row says how sure we are.
// "endpoint" is shown only when a vendor page or repo gave it. Re-check before hard-coding any of it.

export type McpStatus = "official" | "preview" | "community" | "rest";

export interface Connector {
  id: string;
  name: string;
  category: CategoryId;
  /** Key in BRAND_ICONS. Empty or unknown falls back to an initials badge. */
  icon: string;
  /** ALAG workflow steps (1..14) that use it. */
  steps: number[];
  /** The concrete job, in ALAG terms. */
  job: string;
  mcp: McpStatus;
  auth: string;
  /** A few representative MCP tools or capabilities. */
  tools: string[];
  endpoint?: string;
  /** Caveat to read before going live. */
  note?: string;
}

export const MCP_STATUS: Record<McpStatus, { label: string; hint: string }> = {
  official: { label: "Official MCP", hint: "The vendor runs or ships an MCP server." },
  preview: { label: "Official, preview", hint: "The vendor's MCP server is in preview, beta or alpha. Names and limits can change." },
  community: { label: "Community MCP", hint: "No vendor server. Only community or third-party MCP servers exist, so label them non-official." },
  rest: { label: "REST adapter", hint: "No MCP server found. ALAG wraps the vendor's REST API as its own tool behind the gateway." },
};

export type CategoryId =
  | "crm"
  | "mailbox"
  | "chat"
  | "intake"
  | "files"
  | "docai"
  | "cad"
  | "pricebook"
  | "esign"
  | "erp"
  | "mes"
  | "procurement"
  | "logistics"
  | "field"
  | "payments"
  | "accounting"
  | "support"
  | "bi"
  | "platform";

export interface Category {
  id: CategoryId;
  label: string;
  /** Material Symbols ligature. */
  symbol: string;
  blurb: string;
}

/** In the order a job travels through ALAG. */
export const CATEGORIES: Category[] = [
  { id: "crm", label: "CRM and sales", symbol: "contacts", blurb: "Leads, deals and customers. Keeps the CRM in step with every RFQ and quotation." },
  { id: "mailbox", label: "Mailbox and calendar", symbol: "mail", blurb: "Where RFQs arrive and clarification emails and quotations leave." },
  { id: "chat", label: "Chat and messaging", symbol: "forum", blurb: "Approval requests, alerts and customer text messages." },
  { id: "intake", label: "Lead capture", symbol: "input", blurb: "Web forms and automation that feed new leads into step 1." },
  { id: "files", label: "Files and documents", symbol: "folder_open", blurb: "Customer drawings, specs, SOPs and the generated quotation PDFs." },
  { id: "docai", label: "Document AI and OCR", symbol: "document_scanner", blurb: "Reads drawings, scans and PDFs into structured fields." },
  { id: "cad", label: "CAD, PLM and drawings", symbol: "architecture", blurb: "Model, BOM and drawing sources for estimating and production." },
  { id: "pricebook", label: "Price book and spreadsheets", symbol: "table_chart", blurb: "Where the approved price book and margin tables live." },
  { id: "esign", label: "E-signature and proposals", symbol: "draw", blurb: "Send quotations for signature and capture the award." },
  { id: "erp", label: "ERP", symbol: "domain", blurb: "Sales orders, purchase orders and stock in the system of record." },
  { id: "mes", label: "Manufacturing and inventory", symbol: "precision_manufacturing", blurb: "Work orders, shop-floor status and stock levels." },
  { id: "procurement", label: "Procurement and suppliers", symbol: "shopping_cart", blurb: "Supplier quotes, purchase requests and material price indices." },
  { id: "logistics", label: "Shipping and logistics", symbol: "local_shipping", blurb: "Rates, labels, tracking and delivery ETAs." },
  { id: "field", label: "Field service", symbol: "construction", blurb: "Installation scheduling and on-site work orders." },
  { id: "payments", label: "Payments", symbol: "payments", blurb: "Advance and milestone payments, refunds and signed webhooks." },
  { id: "accounting", label: "Accounting and tax", symbol: "receipt_long", blurb: "Invoices, ledger sync and tax on the quotation." },
  { id: "support", label: "Support and after-sales", symbol: "support_agent", blurb: "Complaints, returns, warranty and damage cases." },
  { id: "bi", label: "BI and data", symbol: "monitoring", blurb: "Dashboards and read-only data for conversion, margin and supplier performance." },
  { id: "platform", label: "Platform and identity", symbol: "hub", blurb: "Workflow automation, task tools and single sign-on." },
];

type Row = Omit<Connector, "id"> & { id?: string };
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const rows: Row[] = [
  /* ---------------------------------- CRM and sales ---------------------------------- */
  { name: "HubSpot", category: "crm", icon: "hubspot", steps: [1, 3, 6, 7, 13], job: "Create the Contact, Company and Deal from an RFQ, move the deal stage when the RFQ is approved, sync the quote value, and mark Closed Won at order conversion.", mcp: "official", auth: "OAuth 2.1 with PKCE", tools: ["search_crm_objects", "get_crm_objects", "manage_crm_objects", "discover_hubspot_schema"], endpoint: "https://mcp.hubspot.com", note: "Writing quotes is beta." },
  { name: "Salesforce", category: "crm", icon: "salesforce", steps: [1, 3, 6, 7, 14], job: "Create the Lead or Opportunity at intake, sync Amount and quote status, mark Closed Won, and run SOQL reads for reporting.", mcp: "official", auth: "OAuth via an External Client App", tools: ["soqlQuery", "find", "getObjectSchema", "getRelatedRecords"], endpoint: "https://api.salesforce.com/platform/mcp/v1/…", note: "Hosted MCP servers announced GA April 2026. Salesforce docs were not readable, so confirm the endpoint and tool names. An admin enables each server." },
  { name: "Dynamics 365 Sales", category: "crm", icon: "microsoft", steps: [3, 6, 7], job: "Lead qualification assessment at Lead Smart, opportunity health and risks while the quotation is out, and record updates through Dataverse.", mcp: "preview", auth: "Microsoft Entra ID OAuth", tools: ["get_lead_qualification_assessment", "get_opportunity_health", "get_opportunity_top_risks", "Dataverse record CRUD"], endpoint: "https://<org>/api/mcp (Dataverse)", note: "Sales MCP is documented as preview." },
  { name: "Zoho CRM", category: "crm", icon: "zoho", steps: [1, 3, 6, 7], job: "Same CRM job for Zoho shops: create leads and deals, update stages, bulk updates and workflow rules.", mcp: "official", auth: "OAuth (limited by the user's CRM role)", tools: ["COQL query", "Record CRUD", "Bulk operations", "Workflow rule management"], note: "Four pre-built servers under Developer Hub. The endpoint URL and exact tool names were not published on the page we read." },
  { name: "Pipedrive", category: "crm", icon: "pipedrive", steps: [1, 3, 6, 7], job: "Lightweight deal pipeline for small fabricators: create deals, log activities, schedule follow-ups.", mcp: "preview", auth: "OAuth", tools: ["Search deals, contacts, organisations", "Create and update deals", "Convert leads"], endpoint: "https://mcp.pipedrive.ai/mcp", note: "Announced June 2026. Endpoint is from search results, not the vendor page. Plan availability is unclear." },
  { name: "Close", category: "crm", icon: "", steps: [3, 6], job: "CRM with built-in calling, SMS and email, useful for fast follow-up on open quotations.", mcp: "official", auth: "OAuth, or API key. Scopes read, write_safe, write_destructive", tools: ["find_leads", "create_opportunity", "update_opportunity", "create_draft_email"], endpoint: "https://mcp.close.com/mcp" },

  /* ------------------------------- Mailbox and calendar ------------------------------- */
  { name: "Microsoft 365 Outlook", category: "mailbox", icon: "microsoft", steps: [1, 3, 6, 11], job: "Read RFQ emails and attachments at intake, create the clarification draft, send the quotation, and book site visits.", mcp: "preview", auth: "Microsoft Entra ID OAuth (delegated Graph scopes)", tools: ["searchMessages", "createMessage", "sendMail", "reply", "createEvent", "findMeetingTimes"], endpoint: "https://agent365.svc.cloud.microsoft/agents/tenants/{tenantId}/servers/mcp_MailTools", note: "Microsoft says these app-specific servers are for backward compatibility and points new projects to Work IQ MCP, which needs a Microsoft 365 Copilot licence. Plan for Graph REST as the stable path." },
  { name: "Gmail and Google Calendar", category: "mailbox", icon: "gmail", steps: [1, 3, 6, 11], job: "Same mailbox and calendar jobs for Google tenants.", mcp: "preview", auth: "OAuth 2.0 with your own Google Cloud client", tools: ["search_threads", "get_message", "create_draft", "create_event", "suggest_time"], endpoint: "https://gmailmcp.googleapis.com/mcp/v1", note: "Developer Preview. Gmail has no send tool, so ALAG creates a draft and a human sends." },
  { name: "IMAP and SMTP", category: "mailbox", icon: "", steps: [1, 3], job: "Self-hosted or legacy mailboxes with no vendor API.", mcp: "community", auth: "App password over TLS", tools: ["list and search messages", "read message", "send", "reply"], note: "Community servers only. Check maintenance before use." },
  { name: "Calendly", category: "mailbox", icon: "calendly", steps: [3, 11], job: "Let the customer book a survey or site visit.", mcp: "official", auth: "OAuth 2.1 with PKCE", tools: ["event types", "availability", "scheduled events", "scheduling links"], endpoint: "https://mcp.calendly.com", note: "Endpoint is from search results." },

  /* -------------------------------- Chat and messaging -------------------------------- */
  { name: "Slack", category: "chat", icon: "slack", steps: [3, 4, 5, 6, 8, 10], job: "Post approval requests and margin-exception alerts to the right channel, award and loss notices, and shop-floor alerts.", mcp: "official", auth: "Confidential OAuth with a registered app", tools: ["send and schedule message", "search messages and channels", "read thread", "canvases"], endpoint: "https://mcp.slack.com/mcp", note: "No dynamic client registration. Only directory-published or internal apps." },
  { name: "Microsoft Teams", category: "chat", icon: "teams", steps: [3, 4, 5, 6, 8, 10], job: "Same approval and alert jobs for Microsoft shops.", mcp: "preview", auth: "Microsoft Entra ID OAuth", tools: ["postChannelMessage", "replyToChannelMessage", "listChannels", "chat_postMessage"], note: "Same backward-compatibility warning as Outlook. Text-only posts." },
  { name: "Twilio", category: "chat", icon: "twilio", steps: [3, 11, 12], job: "SMS for clarification questions, delivery ETA texts and payment reminders.", mcp: "preview", auth: "Account SID with API key and secret", tools: ["Send message", "Make call", "Number management"], endpoint: "npm @twilio-alpha/mcp", note: "Alpha, and Twilio says it is not supported. Treat as experimental." },
  { name: "WhatsApp Business", category: "chat", icon: "whatsapp", steps: [1, 3, 6, 11, 13], job: "Customers send RFQs and receive quotation and delivery updates on WhatsApp.", mcp: "community", auth: "Meta system-user access token", tools: ["send_text_message", "sendTemplateMessage", "media", "interactive buttons"], note: "Reports of an official Meta MCP conflict and could not be confirmed. Default to the Cloud API through a REST adapter." },

  /* ----------------------------------- Lead capture ----------------------------------- */
  { name: "Typeform", category: "intake", icon: "typeform", steps: [1], job: "RFQ forms: read responses and push each one into step 1 as a lead.", mcp: "official", auth: "OAuth 2.0", tools: ["forms-*", "insights-*", "contacts-*", "accounts-list_accounts"], endpoint: "https://api.typeform.com/mcp" },
  { name: "Webflow", category: "intake", icon: "webflow", steps: [1], job: "Website RFQ and contact forms, plus CMS content for product pages.", mcp: "official", auth: "OAuth, or API token for local use", tools: ["Sites", "CMS collections and items", "Pages"], endpoint: "npm webflow-mcp-server", note: "Hosted path is /sse or /mcp depending on the listing. Confirm which is current." },
  { name: "Zapier", category: "intake", icon: "zapier", steps: [1, 6, 12], job: "Catch-all webhook intake from any form tool, and a bridge to thousands of other apps.", mcp: "official", auth: "OAuth, or a per-server bearer URL", tools: ["discover_zapier_actions", "execute_zapier_read_action", "execute_zapier_write_action"], note: "Connect URL style varies across sources." },

  /* -------------------------------- Files and documents -------------------------------- */
  { name: "SharePoint", category: "files", icon: "microsoft", steps: [1, 2, 4, 6, 7, 11, 13], job: "Watch the Incoming RFQs library, fetch drawings for OCR, read the price-book list, save the quotation PDF, and keep order, delivery and warranty folders.", mcp: "preview", auth: "Microsoft Entra ID OAuth. Needs a Microsoft 365 Copilot licence", tools: ["findSite", "getFolderChildren", "readSmallBinaryFile", "createSmallBinaryFile", "listListItems", "shareFileOrFolder"], endpoint: "https://agent365.svc.cloud.microsoft/agents/tenants/{tenantId}/servers/mcp_SharePointRemoteServer", note: "Files over 5 MB and lists over 20 items are limited. Microsoft points new work to Work IQ MCP, so avoid hard-coding tool names." },
  { name: "OneDrive", category: "files", icon: "microsoft", steps: [1, 6], job: "Staff folders such as sales reps' RFQ attachments and quotation drafts.", mcp: "preview", auth: "Microsoft Entra ID OAuth", tools: ["Same family as SharePoint"], note: "Tool list not read." },
  { name: "Google Drive", category: "files", icon: "gdrive", steps: [1, 2, 6], job: "Watch an RFQ folder and store the generated quotation PDF.", mcp: "preview", auth: "OAuth 2.0 with your own Google Cloud client", tools: ["search_files", "read_file_content", "download_file_content", "create_file", "get_file_permissions"], endpoint: "https://drivemcp.googleapis.com/mcp/v1" },
  { name: "Box", category: "files", icon: "box", steps: [1, 2, 6], job: "Secure vault for customer drawings. Box AI can answer questions over a drawing, and DocGen can generate the quote.", mcp: "official", auth: "OAuth (root_readwrite, ai.readwrite, docgen.readwrite)", tools: ["Files and folders", "Search", "Box AI", "DocGen"], endpoint: "https://mcp.box.com", note: "The older community repo was archived in April 2026. DocGen needs Enterprise Advanced." },
  { name: "Dropbox", category: "files", icon: "dropbox", steps: [1, 2, 6], job: "RFQ folders and quotation PDFs. PDF-to-text with scanned-PDF OCR helps step 2.", mcp: "preview", auth: "OAuth", tools: ["Browse and search", "Text extraction (5 MB)", "Create and move", "Shared links"], endpoint: "https://mcp.dropbox.com/mcp", note: "Beta. Sources disagree on write support." },
  { name: "Notion", category: "files", icon: "notion", steps: [4, 10, 13], job: "Costing SOPs, product specs, work instructions and warranty policy lookups.", mcp: "official", auth: "OAuth (workspace members only)", tools: ["notion-search", "notion-fetch", "create and update page"], endpoint: "https://mcp.notion.com/mcp" },
  { name: "Confluence", category: "files", icon: "confluence", steps: [4, 10, 13], job: "Same SOP and spec lookups for Atlassian shops.", mcp: "official", auth: "OAuth 2.1, or API token", tools: ["discover", "executeRead", "executeWrite"], endpoint: "https://mcp.atlassian.com/v2/mcp", note: "Endpoint from search results. The older /v1/sse path is deprecated." },

  /* ------------------------------- Document AI and OCR ------------------------------- */
  { name: "Azure AI Document Intelligence", category: "docai", icon: "azure", steps: [2], job: "OCR, tables and layout on PDFs and scans, with custom models for drawing title blocks.", mcp: "rest", auth: "Microsoft Entra ID, or API key", tools: ["analyze document", "custom model analyze"], note: "The official Azure MCP server has no Document Intelligence tools. Wrap the REST API." },
  { name: "AWS Textract", category: "docai", icon: "aws", steps: [2], job: "OCR and table extraction on scans and forms.", mcp: "community", auth: "IAM (SigV4)", tools: ["Detect text", "Analyze document"], note: "Only third-party wrappers found." },
  { name: "Google Document AI", category: "docai", icon: "gcloud", steps: [2], job: "Document processors for forms and layouts.", mcp: "rest", auth: "OAuth or a service account", tools: ["Process document"], note: "No first-party MCP found." },
  { name: "Adobe PDF Services", category: "docai", icon: "adobe", steps: [2, 6], job: "Extract tables and text from RFQ PDFs, and assemble or watermark the quotation PDF.", mcp: "rest", auth: "OAuth server-to-server", tools: ["Extract", "Combine", "Watermark"], note: "No official MCP verified." },

  /* -------------------------------- CAD, PLM and drawings -------------------------------- */
  { name: "Autodesk (ACC and Forma)", category: "cad", icon: "autodesk", steps: [2, 4, 10], job: "Pull drawings and model properties for document intelligence, and read BOM quantities for estimating.", mcp: "preview", auth: "2-legged, 3-legged OAuth or service accounts", tools: ["Model Derivative", "AEC data model", "Project files"], note: "The first official repo was archived in May 2026. Autodesk points to sample servers and says managed ones are coming." },
  { name: "Onshape", category: "cad", icon: "", steps: [4, 10], job: "Read parts, BOMs and drawings for estimating.", mcp: "community", auth: "Onshape API keys", tools: ["Documents", "Parts", "BOM"], note: "The official Labs server only writes FeatureScript. Community servers cover data access." },
  { name: "SOLIDWORKS PDM", category: "cad", icon: "solidworks", steps: [4, 10], job: "Part and drawing data for estimating and the shop floor.", mcp: "community", auth: "Local desktop session", tools: ["Open model", "Read properties"], note: "Community COM servers need a running desktop SOLIDWORKS." },
  { name: "Procore", category: "cad", icon: "", steps: [1, 2], job: "Construction RFQs, drawings and RFIs.", mcp: "community", auth: "OAuth app", tools: ["Projects", "Drawings", "RFIs"], note: "No official server found." },
  { name: "Bluebeam Revu", category: "cad", icon: "", steps: [2, 4], job: "Read markups and takeoffs from the PDF being estimated.", mcp: "official", auth: "Local, enabled in Revu preferences", tools: ["Markups", "Measurements"], note: "Ships inside Bluebeam Max for Windows. Tool list not verified." },

  /* ---------------------------- Price book and spreadsheets ---------------------------- */
  { name: "Google Sheets", category: "pricebook", icon: "gsheets", steps: [4, 5], job: "Read the price book, update margin tables, log quotes.", mcp: "preview", auth: "OAuth with your own Google Cloud client", tools: ["get_values", "update_values", "update_formulas", "get_spreadsheet"], endpoint: "https://sheetsmcp.googleapis.com/mcp/v1", note: "One Google page shows the path without /v1. Check against tools/list." },
  { name: "Excel Online", category: "pricebook", icon: "microsoft", steps: [4, 5], job: "Read the price book workbook from SharePoint or OneDrive.", mcp: "rest", auth: "Microsoft Entra ID", tools: ["Read range via Graph"], note: "No workbook or range tools found in Microsoft's MCP servers. Use Graph REST." },
  { name: "Airtable", category: "pricebook", icon: "airtable", steps: [4, 8], job: "Item master, supplier lists and lightweight BOM tables.", mcp: "official", auth: "OAuth", tools: ["Search records", "Create and update records"], endpoint: "https://mcp.airtable.com/mcp", note: "From aggregator pages, not Airtable's own docs." },

  /* ------------------------------- E-signature and proposals ------------------------------- */
  { name: "DocuSign", category: "esign", icon: "", steps: [6, 7], job: "Send the quotation or contract for signature and use the signed copy as the award signal.", mcp: "official", auth: "OAuth, or JWT grant for unattended use", tools: ["createEnvelope", "getEnvelopes", "listRecipients", "getTemplates"], endpoint: "https://mcp.docusign.com/mcp", note: "Vendor page confirms an official server but did not show the URL or tools. Custom connectors need allow-listing." },
  { name: "Adobe Acrobat Sign", category: "esign", icon: "adobe", steps: [6, 7], job: "Same signature job.", mcp: "rest", auth: "OAuth 2.0", tools: ["Agreements", "Signing status"], note: "Only third-party hosts found. Use REST API v6." },
  { name: "PandaDoc", category: "esign", icon: "", steps: [6], job: "Build the proposal from a template, send it, and track opens and acceptance.", mcp: "official", auth: "OAuth", tools: ["Templates", "Documents", "Status"], endpoint: "https://mcp.pandadoc.com/v1/mcp", note: "Tool names not verified." },

  /* ------------------------------------------ ERP ------------------------------------------ */
  { name: "Oracle NetSuite", category: "erp", icon: "oracle", steps: [7, 8, 9, 12], job: "Create the sales order and purchase order, and read on-hand and incoming stock so the need is max(0, required - available - eligible incoming).", mcp: "official", auth: "OAuth 2.0 authorization code. Needs the MCP Server Connection permission", tools: ["ns_createRecord", "ns_getRecord", "ns_transformRecord", "ns_runCustomSuiteQL", "ns_runSavedSearch", "ns_runReport"], endpoint: "https://<account>.suitetalk.api.netsuite.com/services/mcp/v1/suiteapp/com.netsuite.mcpstandardtools", note: "Needs Oracle's MCP Standard Tools SuiteApp. Administrator roles are not supported." },
  { name: "Dynamics 365 Business Central", category: "erp", icon: "microsoft", steps: [7, 8, 9, 12], job: "Sales and purchase orders, items and stock, and posting.", mcp: "official", auth: "OAuth 2.0 with PKCE via Entra ID", tools: ["Dynamic API page discovery", "list_environments", "list_companies"], endpoint: "https://mcp.businesscentral.dynamics.com", note: "Online only. Microsoft plans to charge for MCP tools." },
  { name: "Dynamics 365 Finance and Supply Chain", category: "erp", icon: "microsoft", steps: [7, 8, 9, 10, 12], job: "Same order and stock jobs plus production orders and warehouse management.", mcp: "official", auth: "Microsoft Entra ID", tools: ["data_find_entities", "data_create_entities", "api_invoke_action", "form_open_menu_item"], note: "Needs version 10.0.47 or a listed quality update. The old static server retires 1 Oct 2026." },
  { name: "SAP S/4HANA", category: "erp", icon: "sap", steps: [7, 8, 9], job: "Sales order, purchase order and stock through SAP's integration gateway.", mcp: "rest", auth: "OAuth, or a BTP destination for on-premise", tools: ["Depends on the OData services you expose"], note: "No single official S/4HANA MCP server verified. SAP announced an MCP gateway in Integration Suite. Confirm its status." },
  { name: "Odoo", category: "erp", icon: "odoo", steps: [7, 8, 9, 10], job: "Sales, purchase, inventory and manufacturing orders in one app.", mcp: "community", auth: "API key or user login", tools: ["search", "read", "create", "write", "model call"], note: "No official Odoo server found. Community servers only." },
  { name: "ERPNext", category: "erp", icon: "erpnext", steps: [7, 8, 9, 10], job: "Sales order, purchase order, stock and work orders.", mcp: "official", auth: "OAuth 2, or an API token", tools: ["list_documents", "get_document", "create_document", "update_document", "call_method"], endpoint: "https://<site>/api/v2/mcp", note: "Built into Frappe v16 and later, on by default for new sites." },
  { name: "Epicor Kinetic", category: "erp", icon: "", steps: [7, 8, 9, 10], job: "Orders, purchasing, stock and production.", mcp: "community", auth: "API key, via a CData server", tools: ["List tables", "Run SELECT"], note: "No standalone official server. The community option is read-only and needs a licensed driver." },
  { name: "Infor", category: "erp", icon: "", steps: [7, 8, 9], job: "Orders and stock through the ION API.", mcp: "community", auth: ".ionapi OAuth credential file", tools: ["M3 API calls"], note: "Infor says it supports MCP in Infor OS, but its doc page could not be opened." },

  /* ------------------------------- Manufacturing and inventory ------------------------------- */
  { name: "Katana MRP", category: "mes", icon: "katana", steps: [7, 8, 9, 10], job: "Manufacturing orders and BOMs, purchase orders, stock and bin levels.", mcp: "official", auth: "Katana login. Needs the Access to MCP permission", tools: ["Stock levels and transfers", "Sales, purchase and manufacturing orders", "BOMs and price lists"], endpoint: "https://mcp.katanamrp.com", note: "Create and update only, no deletes. Tool names are not listed." },
  { name: "MRPeasy", category: "mes", icon: "", steps: [8, 9, 10], job: "Orders, stock and shipments.", mcp: "community", auth: "API key", tools: ["Orders", "Stock", "Shipments"], note: "Third-party only." },
  { name: "Fishbowl", category: "mes", icon: "", steps: [8, 9, 10], job: "Receipts, stock and work orders.", mcp: "community", auth: "Fishbowl API login", tools: ["Search parts", "Create purchase order"], note: "Community middleware only." },
  { name: "Plex (Rockwell)", category: "mes", icon: "", steps: [10], job: "Shop-floor scheduling, quality and traceability.", mcp: "rest", auth: "API key", tools: ["Work centres", "Quality checks"], note: "No MCP found. Use the Plex web services API." },
  { name: "Zoho Inventory", category: "mes", icon: "zoho", steps: [8, 9], job: "Stock and purchase orders.", mcp: "preview", auth: "Zoho OAuth", tools: ["Actions you add in the Zoho MCP console"], note: "Zoho runs a generic MCP service. Inventory tools were not confirmed." },

  /* -------------------------------- Procurement and suppliers -------------------------------- */
  { name: "Coupa", category: "procurement", icon: "coupa", steps: [8, 12], job: "Purchase orders, supplier comparison, approvals and invoices.", mcp: "official", auth: "OAuth 2.0 (inferred)", tools: ["Process approval", "Create receipt", "Search accounts"], note: "Announced for the September 2026 release. Coupa's pages were not readable, so this rests on press coverage." },
  { name: "SAP Ariba", category: "procurement", icon: "sap", steps: [8], job: "Sourcing events and purchase orders.", mcp: "community", auth: "OAuth client credentials", tools: ["Purchase orders", "Sourcing", "Invoices"], note: "No SAP server found. Third-party servers are read-only or beta." },
  { name: "Procurify", category: "procurement", icon: "", steps: [8], job: "Purchase requests and orders.", mcp: "community", auth: "API key and secret", tools: ["Purchase orders", "Catalogs"], note: "Third-party only." },
  { name: "Jaggaer", category: "procurement", icon: "", steps: [8], job: "Sourcing and supplier management.", mcp: "rest", auth: "API", tools: ["Sourcing events"], note: "No MCP found." },
  { name: "MetalMiner price indices", category: "procurement", icon: "", steps: [4, 5, 8], job: "Current prices and forecasts for steel, stainless and base metals, feeding the procurement lane and margin intelligence.", mcp: "official", auth: "OAuth 2.0 PKCE, or an API key header", tools: ["get_current_price", "get_price_forecast", "history and trend tools"], endpoint: "https://mcp.metalminer.com/mcp", note: "Commercial vendor. Forecasts are a premium tier." },

  /* ------------------------------------ Shipping and logistics ------------------------------------ */
  { name: "Shippo", category: "logistics", icon: "", steps: [11], job: "Compare carrier rates, buy labels, track parcels and handle customs.", mcp: "official", auth: "Per-user OAuth (hosted), or an API key (local)", tools: ["Rates", "Labels", "Tracking", "Address validation"], endpoint: "https://mcp.shippo.com" },
  { name: "ShipStation", category: "logistics", icon: "shipstation", steps: [11], job: "Labels and tracking.", mcp: "preview", auth: "API credentials", tools: ["API documentation search"], endpoint: "https://docs.shipstation.com/mcp", note: "The official server only serves documentation, not your account." },
  { name: "EasyPost", category: "logistics", icon: "", steps: [11], job: "Shipments, rates and tracking.", mcp: "community", auth: "API key", tools: ["Create shipment", "Rates", "Track"], note: "No official server found." },
  { name: "UPS", category: "logistics", icon: "ups", steps: [11], job: "Track packages and validate delivery addresses.", mcp: "official", auth: "OAuth client credentials", tools: ["track_package", "validate_address"], endpoint: "github.com/UPS-API/ups-mcp", note: "Published under UPS's GitHub organisation, but the README does not say UPS endorses it." },
  { name: "DHL", category: "logistics", icon: "dhl", steps: [11], job: "Unified tracking and Parcel DE shipping.", mcp: "preview", auth: "Developer-portal API key", tools: ["Tracking", "Parcel DE shipping and returns"], endpoint: "https://api-sandbox.dhl.com/development/mcp/v1/", note: "Sandbox only. Does not cover DHL Express." },
  { name: "FedEx", category: "logistics", icon: "fedex", steps: [11], job: "Ship, rate and track.", mcp: "rest", auth: "OAuth client credentials", tools: ["Ship", "Rate", "Track"], note: "No official server found. Use the REST API." },
  { name: "project44", category: "logistics", icon: "", steps: [11], job: "Multi-carrier shipment visibility and delay prediction.", mcp: "rest", auth: "API (OAuth)", tools: ["Shipment status"], note: "No official server." },

  /* ----------------------------------------- Field service ----------------------------------------- */
  { name: "Dynamics 365 Field Service", category: "field", icon: "microsoft", steps: [11, 13], job: "Installation work orders and technician scheduling.", mcp: "preview", auth: "Microsoft Entra ID", tools: ["Dataverse record tools"], note: "Reached through the Dataverse MCP server. Not verified for Field Service tables." },
  { name: "ServiceTitan", category: "field", icon: "", steps: [11, 13], job: "Jobs, appointments and customers for installation crews.", mcp: "community", auth: "OAuth client credentials plus app key", tools: ["Jobs", "Appointments", "Customers"], note: "No official server." },
  { name: "Jobber", category: "field", icon: "", steps: [11], job: "Requests, jobs and visits.", mcp: "community", auth: "OAuth (GraphQL)", tools: ["Requests", "Jobs", "Visits"], note: "Evidence conflicts on whether an official server exists." },

  /* ------------------------------------------- Payments ------------------------------------------- */
  { name: "Stripe", category: "payments", icon: "stripe", steps: [6, 7, 12, 13], job: "Payment link for the advance, invoices and milestones, refunds and disputes, and a verified webhook marks the invoice paid.", mcp: "official", auth: "OAuth, or an agent API key as bearer", tools: ["stripe_api_search", "stripe_api_read", "stripe_api_write", "stripe_analytics"], endpoint: "https://mcp.stripe.com", note: "Refunds need human confirmation. Non-agent keys are refused from December 2026." },
  { name: "PayPal", category: "payments", icon: "paypal", steps: [12], job: "Invoices, orders and refunds.", mcp: "official", auth: "OAuth, or client credentials as bearer", tools: ["Invoice creation", "Orders", "Refunds"], endpoint: "https://mcp.paypal.com/mcp", note: "Tool names not verified." },
  { name: "Razorpay", category: "payments", icon: "razorpay", steps: [12], job: "Payment links and orders for India, with settlement reconciliation.", mcp: "official", auth: "Basic auth with key and secret", tools: ["create_payment_link", "create_order", "fetch_order_payments", "fetch_settlement_recon_details"], endpoint: "https://mcp.razorpay.com/mcp", note: "The remote server cannot create refunds. The local one can." },
  { name: "Adyen", category: "payments", icon: "adyen", steps: [12], job: "Payment links, refunds and webhook tests.", mcp: "preview", auth: "API key in an environment variable", tools: ["Create session", "Payment link", "Refund", "List webhooks"], endpoint: "npm @adyen/mcp", note: "Local and alpha. No remote URL." },
  { name: "Square", category: "payments", icon: "square", steps: [12], job: "Payment links and orders (US).", mcp: "preview", auth: "OAuth (remote), or access token (local)", tools: ["Wraps the full Square API"], endpoint: "https://mcp.squareup.com/mcp", note: "Beta, production only." },
  { name: "GoCardless", category: "payments", icon: "", steps: [12], job: "Direct-debit mandates and milestone debits.", mcp: "official", auth: "Browser sign-in with scoped permissions", tools: ["Payments", "Mandates", "Refunds"], endpoint: "https://mcp.gocardless.com/mcp", note: "Money-moving actions need confirmation." },
  { name: "Authorize.net", category: "payments", icon: "", steps: [12], job: "Card payments.", mcp: "rest", auth: "API login and key", tools: ["Charge", "Refund"], note: "No MCP server found." },

  /* -------------------------------------- Accounting and tax -------------------------------------- */
  { name: "QuickBooks Online", category: "accounting", icon: "quickbooks", steps: [6, 7, 12, 14], job: "Create the invoice, record the payment and sync the ledger.", mcp: "official", auth: "OAuth 2.0 (Intuit developer app)", tools: ["create_customer", "get_invoice", "search_bills", "get_balance_sheet"], endpoint: "github.com/intuit/quickbooks-online-mcp-server", note: "Local server has 145 tools. The hosted URL was found only on third-party sites." },
  { name: "Xero", category: "accounting", icon: "xero", steps: [12, 14], job: "Invoices, payments and credit notes.", mcp: "official", auth: "Custom Connection, or a bearer token", tools: ["create-invoice", "create-payment", "create-credit-note", "list-profit-and-loss"], endpoint: "npm @xeroapi/xero-mcp-server" },
  { name: "Sage Intacct", category: "accounting", icon: "sage", steps: [12, 14], job: "Read-only finance data for reporting.", mcp: "preview", auth: "Not verified", tools: ["Not verified"], note: "Reported as a read-only AI gateway. The endpoint is from a directory and unverified. Other Sage products have no MCP." },
  { name: "Zoho Books", category: "accounting", icon: "zoho", steps: [12], job: "Invoices, expenses and bank reconciliation.", mcp: "preview", auth: "Zoho OAuth", tools: ["Create and send invoices", "Record expenses", "Reconcile"], note: "Through the Zoho MCP service. Tool names not published." },
  { name: "Avalara", category: "accounting", icon: "", steps: [4, 6, 12], job: "Tax on the quotation and compliant e-invoices.", mcp: "official", auth: "OAuth 2.1", tools: ["Tax calculation", "Transactions", "Document status"], endpoint: "https://mcp.avalara.com/avatax", note: "Eight servers, one per product area. Tool names not verified." },
  { name: "Vertex", category: "accounting", icon: "", steps: [4, 6], job: "Tax on the quotation.", mcp: "rest", auth: "API", tools: ["Calculate tax"], note: "No MCP found." },
  { name: "TaxJar", category: "accounting", icon: "", steps: [4, 6], job: "Sales tax on the quotation.", mcp: "community", auth: "API token", tools: ["Calculate tax"], note: "Third-party servers only." },

  /* ------------------------------------ Support and after-sales ------------------------------------ */
  { name: "Zendesk", category: "support", icon: "zendesk", steps: [13], job: "Complaints and returns as tickets linked to the order.", mcp: "community", auth: "Not applicable", tools: ["Tickets", "Users"], note: "Zendesk announced an official server for 2026 but no public endpoint was found." },
  { name: "Freshdesk", category: "support", icon: "", steps: [13], job: "Complaints and tickets.", mcp: "official", auth: "API key", tools: ["createTicket", "fetchTicket", "updateTicket", "replyTicket"], endpoint: "https://<subdomain>.freshdesk.com/mcp", note: "GA September 2026. Custom domains are not supported." },
  { name: "ServiceNow", category: "support", icon: "", steps: [13], job: "Warranty and damage cases.", mcp: "official", auth: "OAuth 2.0", tools: ["Admin-defined skills and flows"], note: "Per-instance. Needs Now Assist plugins. Endpoint not captured." },
  { name: "Jira Service Management", category: "support", icon: "atlassian", steps: [13], job: "After-sales requests and approvals.", mcp: "official", auth: "OAuth 2.1, or an admin-enabled API token", tools: ["searchJsmRequests", "createJsmRequest", "transitionJsmRequest", "decideJsmRequestApproval"], endpoint: "https://mcp.atlassian.com/v2/mcp" },
  { name: "Intercom", category: "support", icon: "intercom", steps: [13], job: "Customer conversations and complaints.", mcp: "official", auth: "OAuth, or a bearer token", tools: ["search_conversations", "get_conversation", "add_internal_note", "search_contacts"], endpoint: "https://mcp.intercom.com/mcp", note: "14 tools. Not available in the AU region." },

  /* ----------------------------------------- BI and data ----------------------------------------- */
  { name: "Power BI", category: "bi", icon: "powerbi", steps: [14], job: "Margin and conversion dashboards, and natural-language questions over the model.", mcp: "preview", auth: "Microsoft Entra ID", tools: ["Authoring and DAX", "Fabric IQ questions"], endpoint: "https://api.fabric.microsoft.com/v1/mcp/powerbi/authoring", note: "Authoring is a hosted preview. Tool names not verified." },
  { name: "Tableau", category: "bi", icon: "tableau", steps: [14], job: "Dashboards and data sources on Tableau Cloud.", mcp: "official", auth: "OAuth 2.1, or a personal access token", tools: ["Not verified"], endpoint: "https://mcp.tableau.com" },
  { name: "Looker", category: "bi", icon: "looker", steps: [14], job: "Governed metrics and explores.", mcp: "official", auth: "OAuth 2.1 with PKCE. An admin registers the client", tools: ["Admin-enabled tools"], endpoint: "<LOOKER_INSTANCE_URL>/mcp" },
  { name: "Metabase", category: "bi", icon: "metabase", steps: [14], job: "Questions and dashboards over the reporting database.", mcp: "official", auth: "Embedded OAuth 2.0", tools: ["Search", "Browse", "Query", "Create content"], endpoint: "https://<host>/api/metabase-mcp" },
  { name: "Snowflake", category: "bi", icon: "snowflake", steps: [14], job: "Warehouse queries and Cortex Analyst.", mcp: "official", auth: "OAuth, external OAuth, or a personal access token", tools: ["CORTEX_ANALYST_MESSAGE", "SYSTEM_EXECUTE_SQL (read-only default)", "CORTEX_SEARCH_SERVICE_QUERY"], endpoint: "https://<account>/api/v2/databases/{db}/schemas/{schema}/mcp-servers/{name}" },
  { name: "Google BigQuery", category: "bi", icon: "bigquery", steps: [14], job: "Read-only SQL over the order history.", mcp: "official", auth: "OAuth 2.0 plus IAM roles", tools: ["list_dataset_ids", "get_table_info", "execute_sql_readonly"], endpoint: "https://bigquery.googleapis.com/mcp" },
  { name: "Databricks", category: "bi", icon: "databricks", steps: [14], job: "Genie spaces and SQL over the lakehouse.", mcp: "official", auth: "OAuth, scoped per path", tools: ["Genie", "Databricks SQL", "AI Search"], endpoint: "https://<workspace>/api/2.0/mcp/sql" },
  { name: "PostgreSQL", category: "bi", icon: "postgres", steps: [14], job: "Read-only SQL over the ALAG reporting database.", mcp: "community", auth: "Database credentials", tools: ["list_schemas", "get_object_details", "execute_sql", "explain_query"], note: "The reference server is archived. Use a restricted-mode community server." },

  /* ------------------------------------- Platform and identity ------------------------------------- */
  { name: "Jira", category: "platform", icon: "jira", steps: [10, 11], job: "Production and delivery tasks.", mcp: "official", auth: "OAuth 2.1, or an API token", tools: ["createJiraIssue", "transitionJiraIssue", "searchJiraIssuesUsingJql"], endpoint: "https://mcp.atlassian.com/v2/mcp" },
  { name: "Asana", category: "platform", icon: "asana", steps: [10, 11], job: "Tasks for the production and install crews.", mcp: "official", auth: "OAuth", tools: ["Use tools/list"], endpoint: "https://mcp.asana.com/v2/mcp", note: "The older /sse URL shuts down in 2026." },
  { name: "Make", category: "platform", icon: "make", steps: [1, 6, 12], job: "Scenarios exposed as tools.", mcp: "official", auth: "OAuth, or an API key", tools: ["Run scenarios", "Manage connections", "Data stores"], endpoint: "https://mcp.make.com/v2" },
  { name: "n8n", category: "platform", icon: "n8n", steps: [1, 6, 12], job: "Workflows exposed as tools.", mcp: "official", auth: "OAuth, or a personal access token", tools: ["execute_workflow", "search workflows"], note: "Instance-level server. The MCP Server Trigger node is also available." },
  { name: "Okta", category: "platform", icon: "okta", steps: [], job: "Single sign-on and user administration.", mcp: "official", auth: "Device authorization grant, or private key JWT", tools: ["list_users", "create_group", "get_logs"], endpoint: "github.com/okta/okta-mcp-server", note: "Runs locally." },
  { name: "Microsoft Entra ID", category: "platform", icon: "microsoft", steps: [], job: "Single sign-on and directory lookups.", mcp: "preview", auth: "Entra delegated Graph scopes", tools: ["microsoft_graph_get", "microsoft_graph_suggest_queries"], endpoint: "https://mcp.svc.cloud.microsoft/enterprise", note: "Preview and read-only." },
  { name: "Signed webhooks", category: "platform", icon: "", steps: [12], job: "Payment gateways and carriers push signed events into ALAG. ALAG verifies the signature, then the ledger reconciles.", mcp: "rest", auth: "HMAC or the provider's signature", tools: ["Receive", "Verify signature", "Reconcile"], note: "Not an MCP product. It is ALAG's own endpoint." },
];

export const CONNECTORS: Connector[] = rows.map((r) => ({ ...r, id: r.id ?? slug(r.name) }));

/** Connectors that serve one workflow step. */
export function connectorsForStep(stepId: number): Connector[] {
  return CONNECTORS.filter((c) => c.steps.includes(stepId));
}
