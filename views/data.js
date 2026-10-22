const path = require("path");
const fs = require("fs");

/**
 * Data definitions and builder functions for EJS templates in views/
 * Keeps template data schemas, builders, and mock data co-located with views.
 */

// Load logo 2.png from logos folder as a Base64 Data URI for reliable offline/PDF embedding
const LOGO_PATH = path.join(__dirname, "..", "logos", "logo 2.png");
let logoBase64 = "";
try {
  if (fs.existsSync(LOGO_PATH)) {
    logoBase64 = `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString("base64")}`;
  }
} catch (err) {
  console.error("Failed to load logo 2.png in data.js:", err);
}

// Format date helper
function formatDate(date) {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

// Compute initials helper
function getInitials(name, fallback = "TH") {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Strip HTML tags helper for clean rendering of rich-text content
function stripHtml(html) {
  if (!html || typeof html !== "string") return "";
  return html.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim();
}

/**
 * 1. Contract Template Data Builder (contract-template.ejs)
 */
function buildContractTemplateData(offer = {}, overrides = {}) {
  const contract = offer.contractId || {};
  const client = offer.clientId || {};
  const freelancer = offer.freelancerId || {};

  const clientName = client.fullName || client.registrationDetails?.fullName || "Client Name";
  const clientEmail = client.email || client.registrationDetails?.email || "";
  const freelancerName = freelancer.fullName || freelancer.registrationDetails?.fullName || "Freelancer Name";
  const freelancerEmail = freelancer.email || freelancer.registrationDetails?.email || "";

  let formattedBudgetType = contract.contractType || contract.budgetType || "Fixed Price";
  if (formattedBudgetType.toLowerCase().includes("fixed")) {
    formattedBudgetType = "Fixed Price";
  } else if (formattedBudgetType.toLowerCase().includes("hour")) {
    formattedBudgetType = "Hourly Rate";
  }

  const budgetNum = Number(contract.estimatedBudget || 0);
  const formattedBudget = budgetNum > 0
    ? `₹${budgetNum.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`
    : `₹0`;

  return {
    logoBase64,
    contractTitle: contract.contractTitle || "Service Agreement",
    agreementDate: formatDate(offer.signedAt || offer.updatedAt || new Date()),
    clientName,
    clientEmail,
    freelancerName,
    freelancerEmail,
    estimatedBudget: formattedBudget,
    budgetType: formattedBudgetType,
    startDate: formatDate(contract.contractStartDate),
    endDate: formatDate(contract.contractEndDate),
    scopeOfWork: stripHtml(offer.scopeOfWork || contract.contractDescription || "Professional services as outlined in the proposal."),
    additionalTerms: stripHtml(offer.additionalTerms || ""),
    offerStatus: offer.offerStatus || "none",
    clientSignature: offer.clientSignature || "",
    freelancerSignature: offer.freelancerSignature || "",
    offerSentDate: formatDate(offer.createdAt || new Date()),
    signedDate: formatDate(offer.signedAt || new Date()),
    ...overrides
  };
}

/**
 * 2. Contract Invoice Data Builder (contract-invoice.ejs)
 */
function buildContractInvoiceData(txn = {}, client = {}, overrides = {}) {
  const contract = txn.contractId || {};
  const clientName = client.fullName || client.registrationDetails?.fullName || "Client";
  const clientEmail = client.email || client.registrationDetails?.email || "client@talenthub.com";

  let calculatedPlatformFee = txn.platformFee || 0;
  if (txn.type === "Payment Released" && calculatedPlatformFee === 0) {
    calculatedPlatformFee = (txn.amount || 0) * 0.10;
  }

  const amountPaidNum = Number(txn.amount || 0);
  const feeNum = Number(calculatedPlatformFee || 0);
  const totalChargedNum = amountPaidNum + feeNum;

  const invoiceNum = txn._id
    ? `INV-${txn._id.toString().substring(0, 8).toUpperCase()}`
    : "INV-00000000";

  return {
    logoBase64,
    invoiceNumber: invoiceNum,
    invoiceDate: formatDate(new Date()),
    paymentDate: formatDate(txn.createdAt || new Date()),
    referenceId: txn.referenceId || "N/A",
    clientName,
    clientEmail,
    contractTitle: contract.contractTitle || "Direct Escrow Deposit",
    contractType: contract.contractType || "Fixed Price",
    contractSubject: contract.contractSubject || "Software Development",
    amountPaid: amountPaidNum.toFixed(2),
    platformFee: feeNum.toFixed(2),
    totalCharged: totalChargedNum.toFixed(2),
    ...overrides
  };
}

/**
 * 3. Contract Payment Statement Data Builder (contract-payment.ejs)
 */
function buildContractPaymentData(diary = {}, freelancerProfile = {}, overrides = {}) {
  const contract = diary.contractId || {};
  const client = diary.clientId || {};
  const freelancer = diary.freelancerId || {};

  const approvedPhases = (diary.phases || []).filter(p => p.status === "approved");
  const amountPaid = approvedPhases.reduce((sum, p) => sum + (p.amount || 0), 0);
  const serviceFee = Math.round((amountPaid * 0.075) * 100) / 100;
  const earnings = Math.round((amountPaid - serviceFee) * 100) / 100;

  const projectDuration = `${formatDate(contract.contractStartDate)} - ${formatDate(contract.contractEndDate)}`;

  const freelancerLocation = freelancerProfile?.location?.city && freelancerProfile?.location?.country
    ? `${freelancerProfile.location.city}, ${freelancerProfile.location.country}`
    : "Remote";

  return {
    logoBase64,
    date: formatDate(new Date()),
    contractId: contract._id?.toString() || diary.contractId?.toString() || "N/A",
    freelancerName: freelancer.fullName || freelancer.registrationDetails?.fullName || "Freelancer",
    freelancerTitle: freelancerProfile?.basicInformation?.professionalHeadline || "Freelancer",
    freelancerLocation,
    clientName: client.fullName || client.registrationDetails?.fullName || "Client",
    contractTitle: contract.contractTitle || "Contract Project",
    contractType: contract.contractType || "Fixed Price",
    projectDuration,
    amountPaid: amountPaid.toFixed(2),
    serviceFee: serviceFee.toFixed(2),
    earnings: earnings.toFixed(2),
    ...overrides
  };
}

function calculateDuration(start, end) {
  if (!start || !end) return "3 Months";
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return "3 Months";
  const diffDays = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24));
  if (diffDays <= 31) return `${diffDays} Days`;
  const diffMonths = Math.max(1, Math.round(diffDays / 30.4375));
  return diffMonths === 1 ? "1 Month" : `${diffMonths} Months`;
}

/**
 * 4. Legal Contract Data Builder (legal-contract.ejs)
 */
function buildLegalContractData(offer = {}, overrides = {}) {
  const base = buildContractTemplateData(offer, overrides);
  const contract = offer.contractId || {};
  const client = offer.clientId || {};
  const freelancer = offer.freelancerId || {};
  const diary = overrides.diary || offer.diary || {};
  const freelancerProfile = overrides.freelancerProfile || {};
  const clientProfile = overrides.clientProfile || {};

  const budgetNum = Number(contract.estimatedBudget || 0);
  const duration = overrides.duration || calculateDuration(contract.contractStartDate, contract.contractEndDate);
  const contractCategory = overrides.contractCategory || contract.contractCategory || contract.contractSubject || "Software Development";

  const freelancerTitle = overrides.freelancerTitle ||
    freelancerProfile?.professionalDetails?.professionalHeadline ||
    freelancerProfile?.basicInformation?.professionalHeadline ||
    freelancer.registrationDetails?.professionalHeadline ||
    freelancer.headline ||
    "Senior Professional Freelancer";

  const freelancerPhone = overrides.freelancerPhone ||
    freelancerProfile?.basicInformation?.phoneNumber ||
    freelancer.registrationDetails?.phoneNumber ||
    freelancer.phone ||
    "+91 98765 43210";

  const freelancerLocation = overrides.freelancerLocation ||
    ([freelancerProfile?.location?.city, freelancerProfile?.location?.state, freelancerProfile?.location?.country].filter(Boolean).join(", ")) ||
    "Hyderabad, India";

  const clientPhone = overrides.clientPhone ||
    clientProfile?.basicInformation?.phoneNumber ||
    client.registrationDetails?.phoneNumber ||
    client.phone ||
    "+91 98765 43210";

  const clientAddress = overrides.clientAddress ||
    ([clientProfile?.location?.city, clientProfile?.location?.state, clientProfile?.location?.country].filter(Boolean).join(", ")) ||
    "123 Business Park, Hyderabad, Telangana - 500081, India";

  const clientCompany = overrides.clientCompany ||
    clientProfile?.professionalDetails?.companyType ||
    clientProfile?.professionalDetails?.industry ||
    "Client Enterprise";

  // Build Deliverables list (array of strings)
  let deliverables = [];
  if (Array.isArray(overrides.deliverables) && overrides.deliverables.length > 0) {
    deliverables = overrides.deliverables;
  } else if (Array.isArray(offer.deliverables) && offer.deliverables.length > 0) {
    deliverables = offer.deliverables;
  } else if (diary && Array.isArray(diary.phases) && diary.phases.length > 0) {
    diary.phases.forEach(p => {
      if (Array.isArray(p.deliverables)) {
        p.deliverables.forEach(d => {
          const stripped = stripHtml(d);
          if (stripped) {
            deliverables.push(stripped);
          }
        });
      }
    });
  }

  // Parse from scopeOfWork / contractDescription if array empty
  if (deliverables.length === 0) {
    const textToParse = stripHtml(offer.scopeOfWork || contract.contractDescription || "");
    const lines = textToParse
      .split(/\r?\n/)
      .map(line => line.replace(/^[\s*•\-–—\d.)]+/, "").trim())
      .filter(line => line.length > 3);
    if (lines.length >= 2) {
      deliverables = lines.slice(0, 5);
    }
  }

  // Fallback defaults
  if (deliverables.length === 0) {
    deliverables = [
      "Requirements specification, user flow diagrams and architectural planning",
      "Full stack development of front-end components and backend service APIs",
      "Database models setup, schema validations and secure authentication flow",
      "Automated and manual testing, quality assurance and bug remediation",
      "Production deployment, system documentation and operational handover"
    ];
  }
  deliverables = deliverables.map(d => stripHtml(d)).filter(Boolean);

  // Build Milestones list (array of objects)
  let milestones = [];
  if (Array.isArray(overrides.milestones) && overrides.milestones.length > 0) {
    milestones = overrides.milestones;
  } else if (diary && Array.isArray(diary.phases) && diary.phases.length > 0) {
    milestones = diary.phases.map((p, idx) => {
      const amt = Number(p.amount || 0);
      return {
        milestoneNumber: idx + 1,
        name: stripHtml(p.name || `Milestone ${idx + 1}`),
        description: stripHtml(p.description || p.name || `Execution of Phase ${idx + 1}`),
        amount: amt,
        amountFormatted: amt.toLocaleString("en-IN", { minimumFractionDigits: 0 }),
        releaseDate: p.deadline ? formatDate(p.deadline) : formatDate(contract.contractEndDate)
      };
    });
  } else if (budgetNum > 0) {
    // Generate 3 realistic milestones summing to estimatedBudget
    const m1Amount = Math.round(budgetNum * 0.30);
    const m2Amount = Math.round(budgetNum * 0.50);
    const m3Amount = budgetNum - (m1Amount + m2Amount);

    const startMs = contract.contractStartDate ? new Date(contract.contractStartDate).getTime() : Date.now();
    const endMs = contract.contractEndDate ? new Date(contract.contractEndDate).getTime() : (Date.now() + 90 * 24 * 3600 * 1000);
    const diffMs = Math.max(0, endMs - startMs);

    const m1Date = formatDate(new Date(startMs + diffMs * 0.3));
    const m2Date = formatDate(new Date(startMs + diffMs * 0.7));
    const m3Date = formatDate(new Date(endMs));

    milestones = [
      {
        milestoneNumber: 1,
        name: "Design & Architectural Specifications",
        description: "Requirements finalization, UX/UI wireframes, and project roadmap",
        amount: m1Amount,
        amountFormatted: m1Amount.toLocaleString("en-IN", { minimumFractionDigits: 0 }),
        releaseDate: m1Date
      },
      {
        milestoneNumber: 2,
        name: "Core Development & API Integrations",
        description: "Application logic, core features, backend integration and database models",
        amount: m2Amount,
        amountFormatted: m2Amount.toLocaleString("en-IN", { minimumFractionDigits: 0 }),
        releaseDate: m2Date
      },
      {
        milestoneNumber: 3,
        name: "Quality Assurance & Production Deployment",
        description: "End-to-end testing, bug fixing, final sign-off and production release",
        amount: m3Amount,
        amountFormatted: m3Amount.toLocaleString("en-IN", { minimumFractionDigits: 0 }),
        releaseDate: m3Date
      }
    ];
  } else {
    milestones = [
      {
        milestoneNumber: 1,
        name: "Project Deliverables & Handover",
        description: "Complete execution of all contract terms and scope items",
        amount: 0,
        amountFormatted: "0",
        releaseDate: formatDate(contract.contractEndDate)
      }
    ];
  }

  const totalMilestonesSum = milestones.reduce((sum, m) => sum + Number(m.amount || 0), 0);
  const totalMilestonesAmount = totalMilestonesSum > 0
    ? `₹${totalMilestonesSum.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`
    : `₹${budgetNum.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

  const clientSignature = overrides.clientSignature || base.clientSignature || "";
  const freelancerSignature = overrides.freelancerSignature || base.freelancerSignature || "";
  const isAccepted = offer.offerStatus === "accepted" || contract.status === "in progress" || contract.status === "completed";
  const clientSigned = Boolean(clientSignature || offer.signedAt || isAccepted);
  const freelancerSigned = Boolean(freelancerSignature || (offer.signedAt && isAccepted) || isAccepted);
  const contractId = contract._id?.toString() || offer.contractId?._id?.toString() || "2026-0001";

  return {
    ...base,
    contractId,
    getInitials,
    clientInitials: getInitials(base.clientName, "CL"),
    freelancerInitials: getInitials(base.freelancerName, "FL"),
    freelancerTitle,
    freelancerPhone,
    freelancerLocation,
    clientPhone,
    clientAddress,
    clientCompany,
    contractCategory,
    duration,
    governingLaw: offer.governingLaw || "Laws of India",
    jurisdiction: offer.jurisdiction || "Hyderabad, India",
    clientDesignation: overrides.clientDesignation || "Authorized Signatory",
    deliverables,
    milestones,
    totalMilestonesAmount,
    clientSignature,
    freelancerSignature,
    clientSigned,
    freelancerSigned,
    signedStatus: isAccepted ? "Executed & Legally Binding" : "Pending Signatures",
    ...overrides
  };
}

/**
 * 5. Contract Worksheet Data Builder (contract-worksheet.ejs)
 */
function buildContractWorksheetData(diary = {}, contractObj = {}, freelancerProfile = {}, overrides = {}) {
  const contract = (diary.contractId && typeof diary.contractId === "object" && diary.contractId.contractTitle)
    ? diary.contractId
    : (contractObj || {});
  const client = (diary.clientId && typeof diary.clientId === "object" && (diary.clientId.fullName || diary.clientId.registrationDetails))
    ? diary.clientId
    : (contract.clientId || {});
  const freelancer = (diary.freelancerId && typeof diary.freelancerId === "object" && (diary.freelancerId.fullName || diary.freelancerId.registrationDetails))
    ? diary.freelancerId
    : {};

  const clientName = client.fullName || client.registrationDetails?.fullName || "Client Name";
  const freelancerName = freelancer.fullName || freelancer.registrationDetails?.fullName || "Freelancer Name";
  const freelancerTitle = freelancerProfile?.basicInformation?.professionalHeadline || "Professional Freelancer";

  const totalValueNum = Number(contract.estimatedBudget || 0);

  // Phases
  const rawPhases = Array.isArray(diary.phases) && diary.phases.length > 0
    ? diary.phases
    : [
        {
          name: "Project Deliverables & Scope Execution",
          description: contract.contractDescription || "Complete contract deliverables as approved by client.",
          deadline: contract.contractEndDate || new Date(),
          amount: totalValueNum,
          status: "approved",
          approvedAt: contract.contractEndDate || new Date()
        }
      ];

  const phases = rawPhases.map((p, idx) => {
    const isApproved = p.status === "approved" || p.status === "completed";
    const phaseAmount = Number(p.amount || 0);
    const pct = totalValueNum > 0 ? Math.round((phaseAmount / totalValueNum) * 100) : 100;
    const dueDateStr = formatDate(p.deadline || contract.contractEndDate);
    const compDateStr = p.approvedAt ? formatDate(p.approvedAt) : (p.submittedAt ? formatDate(p.submittedAt) : dueDateStr);

    return {
      index: String(idx + 1).padStart(2, "0"),
      name: p.name || `Milestone ${idx + 1}`,
      description: p.description || "Milestone deliverables and requirements",
      dueDate: dueDateStr,
      completedDate: compDateStr,
      amount: phaseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
      percentage: pct,
      status: isApproved ? "Completed" : (p.status ? p.status.toUpperCase() : "PENDING"),
      paidDate: p.approvedAt ? formatDate(p.approvedAt) : formatDate(new Date())
    };
  });

  const totalPaidNum = rawPhases
    .filter(p => p.status === "approved" || p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const remainingNum = Math.max(0, totalValueNum - totalPaidNum);
  const progressPercent = totalValueNum > 0 ? Math.min(100, Math.round((totalPaidNum / totalValueNum) * 100)) : 100;

  return {
    logoBase64,
    contractId: contract._id ? `CON-${contract._id.toString().substring(0, 8).toUpperCase()}` : "CON-2026-0001",
    startDate: formatDate(contract.contractStartDate),
    endDate: formatDate(contract.contractEndDate),
    clientName,
    freelancerName,
    freelancerTitle,
    projectTitle: contract.contractTitle || "Contract Project",
    totalBudget: totalValueNum.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
    totalPaid: totalPaidNum.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
    remainingAmount: remainingNum.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
    progressPercent: `${progressPercent}%`,
    status: (contract.status === "completed" || progressPercent === 100) ? "Completed" : (contract.status || "In Progress"),
    phases,
    currentDate: formatDate(new Date()),
    ...overrides
  };
}

/**
 * Sample / Mock Data for Preview and Testing
 */
const mockData = {
  legalContract: {
    logoBase64,
    contractTitle: "Full Stack Web Application Development",
    agreementDate: "October 14, 2026",
    clientName: "Acme Corp Ltd.",
    clientEmail: "contact@acmecorp.com",
    freelancerName: "John Doe",
    freelancerEmail: "john.doe@talenthub.com",
    freelancerTitle: "Senior Full Stack Developer",
    freelancerPhone: "+91 98765 43210",
    clientInitials: "AC",
    freelancerInitials: "JD",
    estimatedBudget: "₹75,000",
    budgetType: "Fixed Price",
    contractCategory: "Web Development",
    duration: "2 Months",
    startDate: "October 20, 2026",
    endDate: "December 20, 2026",
    scopeOfWork: "The freelancer agrees to deliver a comprehensive, enterprise-ready full stack web application adhering to the specifications agreed upon.",
    deliverables: [
      "Requirements specification, UX wireframes and system architecture design",
      "Authentication module, role-based access control and user management",
      "Interactive analytics dashboard, reporting features and pipeline tracking",
      "API microservices integration, automated email notifications and webhooks",
      "Comprehensive end-to-end testing, security hardening and production deployment"
    ],
    milestones: [
      {
        milestoneNumber: 1,
        name: "Design & Architectural Specifications",
        description: "Requirements analysis, UI/UX mockups, database schemas and project roadmap",
        amount: 22500,
        amountFormatted: "22,500",
        releaseDate: "November 05, 2026"
      },
      {
        milestoneNumber: 2,
        name: "Core Development & API Integrations",
        description: "Frontend components, REST APIs, database queries and state management",
        amount: 37500,
        amountFormatted: "37,500",
        releaseDate: "November 30, 2026"
      },
      {
        milestoneNumber: 3,
        name: "Testing, Deployment & Documentation",
        description: "Quality assurance testing, bug fixing, production launch and client handover",
        amount: 15000,
        amountFormatted: "15,000",
        releaseDate: "December 20, 2026"
      }
    ],
    totalMilestonesAmount: "₹75,000",
    additionalTerms: "All deliverables shall conform to industry security best practices.",
    governingLaw: "Laws of India",
    jurisdiction: "Hyderabad, India",
    clientDesignation: "CEO",
    offerStatus: "accepted",
    clientSignature: "",
    freelancerSignature: "",
    offerSentDate: "October 14, 2026",
    signedDate: "October 14, 2026"
  },
  contractTemplate: {
    logoBase64,
    contractTitle: "Full Stack Web Application Development",
    agreementDate: "October 14, 2026",
    clientName: "Acme Corp Ltd.",
    clientEmail: "contact@acmecorp.com",
    freelancerName: "John Doe",
    freelancerEmail: "john.doe@talenthub.com",
    estimatedBudget: "₹75,000",
    budgetType: "Fixed Price",
    startDate: "October 20, 2026",
    endDate: "December 20, 2026",
    scopeOfWork: "Complete end-to-end development of the customer portal including authentication, dashboard, and billing integrations.",
    additionalTerms: "All deliverables shall conform to industry security best practices.",
    offerStatus: "accepted",
    clientSignature: "",
    freelancerSignature: "",
    offerSentDate: "October 14, 2026",
    signedDate: "October 14, 2026"
  },

  contractInvoice: {
    logoBase64,
    invoiceNumber: "INV-78A9C201",
    invoiceDate: "October 14, 2026",
    paymentDate: "October 14, 2026",
    referenceId: "pay_PkJ29kLm891",
    clientName: "Acme Corp Ltd.",
    clientEmail: "billing@acmecorp.com",
    contractTitle: "Full Stack Web Application Development",
    contractType: "Fixed Price",
    contractSubject: "Web Development",
    amountPaid: "75000.00",
    platformFee: "7500.00",
    totalCharged: "82500.00"
  },

  contractPayment: {
    logoBase64,
    date: "October 14, 2026",
    contractId: "670c1a90b4e3f1092a",
    freelancerName: "John Doe",
    freelancerTitle: "Senior Full Stack Engineer",
    freelancerLocation: "Hyderabad, India",
    clientName: "Acme Corp Ltd.",
    contractTitle: "Full Stack Web Application Development",
    contractType: "Fixed Price",
    projectDuration: "October 20, 2026 - December 20, 2026",
    amountPaid: "75000.00",
    serviceFee: "5625.00",
    earnings: "69375.00"
  },

  contractWorksheet: {
    logoBase64,
    contractId: "CON-670C1A90",
    startDate: "October 20, 2026",
    endDate: "December 20, 2026",
    clientName: "Acme Corp Ltd.",
    freelancerName: "John Doe",
    freelancerTitle: "Senior Full Stack Engineer",
    projectTitle: "Full Stack Web Application Development",
    totalBudget: "75,000.00",
    totalPaid: "75,000.00",
    remainingAmount: "0.00",
    progressPercent: "100%",
    status: "Completed",
    currentDate: "October 19, 2026",
    phases: [
      {
        index: "01",
        name: "Requirement Analysis & System Architecture",
        description: "Gather specifications, define architecture, and setup project repo.",
        dueDate: "October 25, 2026",
        completedDate: "October 24, 2026",
        amount: "15,000.00",
        percentage: 20,
        status: "Completed",
        paidDate: "October 24, 2026"
      },
      {
        index: "02",
        name: "UI/UX & Frontend Development",
        description: "Build responsive web interface and core client dashboard.",
        dueDate: "November 15, 2026",
        completedDate: "November 14, 2026",
        amount: "30,000.00",
        percentage: 40,
        status: "Completed",
        paidDate: "November 14, 2026"
      },
      {
        index: "03",
        name: "Backend APIs & Database Integration",
        description: "Implement authentication, business logic, and database schemas.",
        dueDate: "December 05, 2026",
        completedDate: "December 04, 2026",
        amount: "20,000.00",
        percentage: 27,
        status: "Completed",
        paidDate: "December 04, 2026"
      },
      {
        index: "04",
        name: "Testing, QA & Production Deployment",
        description: "End-to-end integration tests, security audit, and deployment.",
        dueDate: "December 20, 2026",
        completedDate: "December 18, 2026",
        amount: "10,000.00",
        percentage: 13,
        status: "Completed",
        paidDate: "December 18, 2026"
      }
    ]
  }
};

module.exports = {
  logoBase64,
  formatDate,
  getInitials,
  buildContractTemplateData,
  buildContractInvoiceData,
  buildContractPaymentData,
  buildLegalContractData,
  buildContractWorksheetData,
  mockData
};
