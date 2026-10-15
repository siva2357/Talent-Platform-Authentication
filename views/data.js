/**
 * Data definitions and builder functions for EJS templates in views/
 * Keeps template data schemas, builders, and mock data co-located with views.
 */

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

  return {
    contractTitle: contract.contractTitle || "Service Agreement",
    agreementDate: formatDate(offer.updatedAt || new Date()),
    clientName,
    clientEmail,
    freelancerName,
    freelancerEmail,
    estimatedBudget: `₹${contract.estimatedBudget || 0}`,
    budgetType: contract.budgetType || "Fixed Price",
    startDate: formatDate(contract.contractStartDate),
    endDate: formatDate(contract.contractEndDate),
    scopeOfWork: offer.scopeOfWork || contract.contractDescription || "Professional services as outlined in the proposal.",
    additionalTerms: offer.additionalTerms || "",
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
  return buildContractTemplateData(offer, overrides);
}

/**
 * Sample / Mock Data for Preview and Testing
 */
const mockData = {
  contractTemplate: {
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
  }
};

module.exports = {
  formatDate,
  getInitials,
  buildContractTemplateData,
  buildContractInvoiceData,
  buildContractPaymentData,
  buildLegalContractData,
  mockData
};
