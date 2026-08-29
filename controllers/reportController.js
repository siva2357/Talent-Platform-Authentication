const SystemReport = require('../models/systemReport');
const Contract = require('../models/contract');
const Transaction = require('../models/transaction');
const User = require('../models/user');
const excel = require('exceljs');
const mongoose = require('mongoose');

// Helper to get financial year (e.g. FY 26-27 starts April 1st 2026)
function getFinancialYear(date) {
  const d = new Date(date);
  if (d.getMonth() < 3) {
    return d.getFullYear() - 1;
  }
  return d.getFullYear();
}

exports.getReports = async (req, res) => {
  try {
    let reports = await SystemReport.find().sort({ createdAt: -1 });

    if (reports.length === 0) {
      const defaults = [
        { title: 'Q2 Platform Revenue & Transaction Audit', description: 'Complete audit of commissions, deposits, and withdrawal margins for Q2.', category: 'Financial' },
        { title: 'Monthly Active Users & Growth Metrics', description: 'Breakdown of new client signups, freelancer approvals, and retention rates.', category: 'Users' },
        { title: 'Job Matching & Fill Rate Analysis', description: 'Report measuring time-to-hire, project success rates, and category demand.', category: 'Contracts' }
      ];
      await SystemReport.insertMany(defaults);
      reports = await SystemReport.find().sort({ createdAt: -1 });
    }

    const formattedReports = reports.map(r => ({
      id: r._id.toString(),
      title: r.title,
      description: r.description,
      category: r.category,
      generatedDate: r.createdAt.toISOString().split('T')[0],
      downloadUrl: r.downloadUrl,
      size: r.size
    }));

    return res.status(200).json({ success: true, reports: formattedReports });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.generateReport = async (req, res) => {
  try {
    const { title, category, description } = req.body;
    if (!title || !category || !description) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newReport = new SystemReport({
      title,
      category,
      description,
      size: 'Auto-calculated'
    });

    await newReport.save();

    return res.status(201).json({
      success: true,
      report: {
        id: newReport._id.toString(),
        title: newReport.title,
        description: newReport.description,
        category: newReport.category,
        generatedDate: newReport.createdAt.toISOString().split('T')[0],
        downloadUrl: newReport.downloadUrl,
        size: newReport.size
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getReportData = async (req, res) => {
  try {
    const report = await SystemReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    let data = {
      chartData: [],
      tableHeaders: [],
      tableData: []
    };

    const now = new Date();
    const currentFY = getFinancialYear(now);
    const startOfFY = new Date(currentFY, 3, 1);
    const endOfFY = new Date(currentFY + 1, 2, 31, 23, 59, 59);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    let monthsMap = {};
    for (let i = 0; i < 12; i++) {
      let d = new Date(startOfFY);
      d.setMonth(d.getMonth() + i);
      let m = d.getMonth();
      let y = d.getFullYear();
      monthsMap[`${m}-${y}`] = { monthName: `${monthNames[m]} ${y}`, value1: 0, value2: 0 };
    }

    if (report.category === 'Users') {
      const users = await User.find({ createdAt: { $gte: startOfFY, $lte: endOfFY } }).sort({ createdAt: -1 });

      users.forEach(u => {
        const d = new Date(u.createdAt);
        const key = `${d.getMonth()}-${d.getFullYear()}`;
        if (monthsMap[key]) {
          if (u.role === 'client') monthsMap[key].value1++;
          if (u.role === 'freelancer') monthsMap[key].value2++;
        }
      });

      data.chartData = Object.values(monthsMap);
      data.tableHeaders = ["Name", "Email", "Role", "Status", "Joined"];
      data.tableData = users.map(u => ({
        col1: u.registrationDetails?.fullName || 'N/A',
        col2: u.registrationDetails?.email || 'N/A',
        col3: u.role,
        col4: u.status,
        col5: new Date(u.createdAt).toLocaleDateString()
      }));

    } else if (report.category === 'Contracts') {
      const contracts = await Contract.find({ createdAt: { $gte: startOfFY, $lte: endOfFY } })
        .populate('clientId')
        .populate('applicants.freelancerId')
        .sort({ createdAt: -1 });
      
      contracts.forEach(c => {
        const d = new Date(c.createdAt);
        const key = `${d.getMonth()}-${d.getFullYear()}`;
        if (monthsMap[key]) {
           monthsMap[key].value1++; // Total Contracts
           if (c.status === 'completed' || c.status === 'closed') monthsMap[key].value2++; // Completed
        }
      });

      data.chartData = Object.values(monthsMap);
      data.tableHeaders = ["Contract Title", "Contract Type", "Budget", "Client", "Freelancer"];
      data.tableData = contracts.map(c => {
        let freelancerName = 'Not Assigned';
        if (c.applicants && c.applicants.length > 0) {
           freelancerName = c.applicants[0].freelancerId?.registrationDetails?.fullName || 'Applicant(s)';
        }
        
        return {
          col1: c.contractTitle || 'N/A',
          col2: c.contractType || 'N/A',
          col3: `₹${c.estimatedBudget || 0}`,
          col4: c.clientId?.registrationDetails?.fullName || 'Unknown',
          col5: freelancerName
        };
      });

    } else {
      // Financial
      const txns = await Transaction.find({ contractId: { $ne: null }, createdAt: { $gte: startOfFY, $lte: endOfFY } }).populate('contractId').sort({ createdAt: -1 });

      const contractFinancials = {};
      
      txns.forEach(t => {
        if (!t.contractId) return; // Skip if contract was deleted
        const cId = t.contractId._id.toString();
        
        if (!contractFinancials[cId]) {
          contractFinancials[cId] = {
            title: t.contractId.contractTitle || 'N/A',
            budget: t.contractId.estimatedBudget || 0,
            clientPayment: 0,
            freelancerPayout: 0,
            platformFee: 0,
            createdAt: t.contractId.createdAt
          };
        }

        contractFinancials[cId].platformFee += (t.platformFee || 0);
        
        if (t.type === 'Escrow Funded' || t.type === 'Deposit') {
          contractFinancials[cId].clientPayment += (t.amount || 0) + (t.platformFee || 0);
        } else if (t.type === 'Payout' || t.type === 'Withdrawal') {
          contractFinancials[cId].freelancerPayout += (t.amount || 0) - (t.platformFee || 0);
        }
      });

      const processedContracts = Object.values(contractFinancials);

      processedContracts.forEach(c => {
        const d = new Date(c.createdAt);
        const key = `${d.getMonth()}-${d.getFullYear()}`;
        if (monthsMap[key]) {
          monthsMap[key].value1 += c.budget; // Volume
          monthsMap[key].value2 += c.platformFee; // Commissions
        }
      });

      data.chartData = Object.values(monthsMap);
      data.tableHeaders = ["Contract Title", "Budget", "Client Payment", "Freelancer Payout", "Platform Fee"];
      data.tableData = processedContracts.map(c => ({
          col1: c.title,
          col2: `₹${c.budget}`,
          col3: `₹${c.clientPayment}`,
          col4: `₹${c.freelancerPayout}`,
          col5: `₹${c.platformFee}`
      }));
    }

    return res.status(200).json({ success: true, report, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.downloadReport = async (req, res) => {
  try {
    const report = await SystemReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    const workbook = new excel.Workbook();
    workbook.creator = 'Talent-Hub Admin System';

    if (report.category === 'Financial') {
      const sheet = workbook.addWorksheet('Financial Transactions');
      sheet.columns = [
        { header: 'Contract Title', key: 'title', width: 25 },
        { header: 'Budget (₹)', key: 'budget', width: 15 },
        { header: 'Client Payment (₹)', key: 'clientPayment', width: 20 },
        { header: 'Freelancer Payout (₹)', key: 'freelancerPayout', width: 20 },
        { header: 'Platform Fee (₹)', key: 'platformFee', width: 15 }
      ];

      const txns = await Transaction.find({ contractId: { $ne: null } }).populate('contractId').sort({ createdAt: -1 });
      const contractFinancials = {};
      
      txns.forEach(t => {
        if (!t.contractId) return;
        const cId = t.contractId._id.toString();
        
        if (!contractFinancials[cId]) {
          contractFinancials[cId] = {
            title: t.contractId.contractTitle || 'N/A',
            budget: t.contractId.estimatedBudget || 0,
            clientPayment: 0,
            freelancerPayout: 0,
            platformFee: 0
          };
        }

        contractFinancials[cId].platformFee += (t.platformFee || 0);
        
        if (t.type === 'Escrow Funded' || t.type === 'Deposit') {
          contractFinancials[cId].clientPayment += (t.amount || 0) + (t.platformFee || 0);
        } else if (t.type === 'Payout' || t.type === 'Withdrawal') {
          contractFinancials[cId].freelancerPayout += (t.amount || 0) - (t.platformFee || 0);
        }
      });

      Object.values(contractFinancials).forEach(c => {
        sheet.addRow({
          title: c.title,
          budget: c.budget,
          clientPayment: c.clientPayment,
          freelancerPayout: c.freelancerPayout,
          platformFee: c.platformFee
        });
      });
      sheet.getRow(1).font = { bold: true };
    } else if (report.category === 'Contracts') {
      const sheet = workbook.addWorksheet('Contract Data');
      sheet.columns = [
        { header: 'Contract Title', key: 'title', width: 25 },
        { header: 'Contract Type', key: 'type', width: 20 },
        { header: 'Budget (₹)', key: 'budget', width: 15 },
        { header: 'Client', key: 'client', width: 25 },
        { header: 'Freelancer', key: 'freelancer', width: 25 }
      ];

      const contracts = await Contract.find().populate('clientId').populate('applicants.freelancerId').sort({ createdAt: -1 });
      contracts.forEach(c => {
        let freelancerName = 'Not Assigned';
        if (c.applicants && c.applicants.length > 0) {
           freelancerName = c.applicants[0].freelancerId?.registrationDetails?.fullName || 'Applicant(s)';
        }

        sheet.addRow({
          title: c.contractTitle || 'N/A',
          type: c.contractType || 'N/A',
          budget: c.estimatedBudget || 0,
          client: c.clientId?.registrationDetails?.fullName || 'Unknown',
          freelancer: freelancerName
        });
      });
      sheet.getRow(1).font = { bold: true };
    } else {
      const sheet = workbook.addWorksheet('General Data');
      sheet.columns = [{ header: 'Info', key: 'info', width: 50 }];
      sheet.addRow({ info: 'No specific data found for this category.' });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${report.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
