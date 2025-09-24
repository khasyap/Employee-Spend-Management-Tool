const ExcelJS = require('exceljs');

const generateClaimsReport = async (claims, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Claims Report');
  
  // Add headers
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Employee', key: 'employee', width: 20 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Description', key: 'description', width: 30 },
    { header: 'Status', key: 'status', width: 20 },
    { header: 'Submitted On', key: 'submittedOn', width: 15 }
  ];
  
  // Add data
  claims.forEach(claim => {
    worksheet.addRow({
      id: claim._id.toString(),
      employee: claim.employeeId.name,
      category: claim.category.name,
      amount: claim.amount,
      description: claim.description,
      status: claim.status,
      submittedOn: claim.submittedOn.toISOString().split('T')[0]
    });
  });
  
  // Style headers
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  });
  
  // Set response headers
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=claims-report.xlsx');
  
  // Write to response
  await workbook.xlsx.write(res);
  res.end();
};

module.exports = { generateClaimsReport };