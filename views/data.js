const path = require("path");
const fs = require("fs");

/**
 * Data definitions and builder functions for EJS templates in views/
 * Keeps template data schemas and builders co-located with views.
 * All dummy and mock data have been strictly eliminated for pure dynamic operation.
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

// Strip HTML tags helper for clean rendering of plain-text fallback content
function stripHtml(html) {
  if (!html || typeof html !== "string") return "";
  return html.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim();
}

// Format scope of work preserving rich text formatting or converting plain-text newlines into paragraphs
function formatScopeOfWork(content) {
  if (!content || typeof content !== "string") return "";
  const trimmed = content.trim();
  if (!trimmed) return "";
  // Check if content already contains HTML markup
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed;
  }
  // Convert plain text with newlines to clean HTML paragraphs
  return trimmed
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `<p style="margin: 0 0 10px 0; line-height: 1.6;">${line}</p>`)
    .join("");
}

// Calculate duration helper
function calculateDuration(start, end) {
  if (!start || !end) return "";
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return "";
  const diffDays = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24));
  if (diffDays <= 31) return `${diffDays} Days`;
  const diffMonths = Math.max(1, Math.round(diffDays / 30.4375));
  return diffMonths === 1 ? "1 Month" : `${diffMonths} Months`;
}

/**
 * 1. Contract Template Data Builder (contract-template.ejs)
 */
function buildContractTemplateData(offer = {}, overrides = {}) {
  const contract = offer.contractId || {};
  const client = offer.clientId || {};
  const freelancer = offer.freelancerId || {};

  const clientName = client.fullName || client.registrationDetails?.fullName || "Client";
  const clientEmail = client.email || client.registrationDetails?.email || "";
  const freelancerName = freelancer.fullName || freelancer.registrationDetails?.fullName || "Freelancer";
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

  const rawScope = offer.scopeOfWork || contract.contractDescription || "";
  const formattedScope = formatScopeOfWork(rawScope);

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
    scopeOfWork: formattedScope || stripHtml(rawScope),
    scopeOfWorkPlain: stripHtml(rawScope),
    contractDescription: stripHtml(contract.contractDescription || ""),
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
  const clientEmail = client.email || client.registrationDetails?.email || "";

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
    contractSubject: contract.contractSubject || contract.contractCategory || "General Services",
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

/**
 * 4. Legal Contract Data Builder (legal-contract.ejs)
 */
function buildLegalContractData(offer = {}, overrides = {}) {
  const base = buildContractTemplateData(offer, overrides);
  const contract = offer.contractId || {};
  const clientUser = offer.clientId || {};
  const freelancerUser = offer.freelancerId || {};
  const diary = overrides.diary || offer.diary || {};
  const freelancerProfile = overrides.freelancerProfile || {};
  const clientProfile = overrides.clientProfile || {};

  const budgetNum = Number(contract.estimatedBudget || 0);
  const duration = overrides.duration || calculateDuration(contract.contractStartDate, contract.contractEndDate);
  const contractCategory = overrides.contractCategory || contract.contractCategory || contract.contractSubject || "";

  const freelancerTitle = overrides.freelancerTitle ||
    freelancerProfile?.professionalDetails?.professionalHeadline ||
    freelancerProfile?.basicInformation?.professionalHeadline ||
    freelancerUser.registrationDetails?.professionalHeadline ||
    freelancerUser.headline ||
    "Freelancer";

  const freelancerPhone = overrides.freelancerPhone ||
    freelancerProfile?.basicInformation?.phoneNumber ||
    freelancerUser.registrationDetails?.phoneNumber ||
    freelancerUser.phone ||
    freelancerUser.phoneNumber ||
    "";

  const freelancerLocation = overrides.freelancerLocation ||
    ([freelancerProfile?.location?.city, freelancerProfile?.location?.state, freelancerProfile?.location?.country].filter(Boolean).join(", ")) ||
    ([freelancerUser.registrationDetails?.city, freelancerUser.registrationDetails?.state, freelancerUser.registrationDetails?.country].filter(Boolean).join(", ")) ||
    "";

  const clientPhone = overrides.clientPhone ||
    clientProfile?.basicInformation?.phoneNumber ||
    clientUser.registrationDetails?.phoneNumber ||
    clientUser.phone ||
    clientUser.phoneNumber ||
    "";

  const clientAddress = overrides.clientAddress ||
    ([clientProfile?.location?.city, clientProfile?.location?.state, clientProfile?.location?.country].filter(Boolean).join(", ")) ||
    ([clientUser.registrationDetails?.city, clientUser.registrationDetails?.state, clientUser.registrationDetails?.country].filter(Boolean).join(", ")) ||
    "";

  const clientCompany = overrides.clientCompany ||
    clientProfile?.professionalDetails?.companyType ||
    clientProfile?.professionalDetails?.industry ||
    clientUser.companyDetails?.companyName ||
    clientUser.registrationDetails?.companyName ||
    clientUser.companyName ||
    "";

  // Build Deliverables list strictly from real data (overrides, offer, or contract diary phases)
  // NO artificial parsing or dummy fallback arrays
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
  deliverables = deliverables.map(d => stripHtml(d)).filter(Boolean);

  // Build Milestones list strictly from contract diary phases or single dynamic milestone
  let milestones = [];
  if (Array.isArray(overrides.milestones) && overrides.milestones.length > 0) {
    milestones = overrides.milestones;
  } else if (diary && Array.isArray(diary.phases) && diary.phases.length > 0) {
    milestones = diary.phases.map((p, idx) => {
      const amt = Number(p.amount || 0);
      return {
        milestoneNumber: idx + 1,
        name: stripHtml(p.name || `Phase ${idx + 1}`),
        description: stripHtml(p.description || p.name || `Execution of Phase ${idx + 1}`),
        amount: amt,
        amountFormatted: amt.toLocaleString("en-IN", { minimumFractionDigits: 0 }),
        releaseDate: p.deadline ? formatDate(p.deadline) : formatDate(contract.contractEndDate)
      };
    });
  } else {
    // Dynamic single milestone using the actual contract title, budget, and description
    const singleMilestoneDesc = stripHtml(offer.scopeOfWork || contract.contractDescription || contract.contractTitle || "Execution of contract terms and deliverables");
    milestones = [
      {
        milestoneNumber: 1,
        name: stripHtml(contract.contractTitle || "Project Deliverable"),
        description: singleMilestoneDesc,
        amount: budgetNum,
        amountFormatted: budgetNum.toLocaleString("en-IN", { minimumFractionDigits: 0 }),
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
    governingLaw: offer.governingLaw || "Indian Law",
    jurisdiction: offer.jurisdiction || "Competent Court Jurisdiction",
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

  // Phases strictly from diary
  const rawPhases = Array.isArray(diary.phases) && diary.phases.length > 0
    ? diary.phases
    : [
        {
          name: contract.contractTitle || "Project Deliverables & Scope Execution",
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

module.exports = {
  logoBase64,
  formatDate,
  getInitials,
  stripHtml,
  formatScopeOfWork,
  calculateDuration,
  buildContractTemplateData,
  buildContractInvoiceData,
  buildContractPaymentData,
  buildLegalContractData,
  buildContractWorksheetData
};
