const fs = require('fs');

function replaceDummy(path) {
    if (!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf-8');

    // Replacements
    content = content.split('July 21, 2026').join('<%= agreementDate %>');
    content = content.split('Jul 21, 2026').join('<%= signedDate %>');
    content = content.split('ABC Technologies').join('<%= clientName %>');
    content = content.split('hello@abctechnologies.com').join('<%= clientEmail %>');
    content = content.split('John Smith').join('<%= freelancerName %>');
    content = content.split('john.smith@email.com').join('<%= freelancerEmail %>');
    content = content.split('AI Powered CRM Platform').join('<%= contractTitle %>');
    content = content.split('Fixed Price').join('<%= budgetType %>');
    content = content.split('₹60,000').join('<%= estimatedBudget %>');
    content = content.split('Jul 30, 2026').join('<%= startDate %>');
    content = content.split('Oct 30, 2026').join('<%= endDate %>');
    content = content.split('John Doe').join('<%= clientName %>');
    content = content.split('₹20,000').join('<%= estimatedBudget %>'); // Just in case

    fs.writeFileSync(path, content, 'utf8');
    console.log('Replaced ' + path);
}

replaceDummy('legal-contract.ejs');
replaceDummy('contract-worksheet.ejs');
