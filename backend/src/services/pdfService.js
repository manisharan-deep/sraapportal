const PDFDocument = require('pdfkit');

const generateAttendancePdf = ({ studentName, courseWise, summary }) => {
  const doc = new PDFDocument();
  const chunks = [];

  return new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('Attendance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Student: ${studentName}`);
    doc.text(`Overall Attendance: ${summary.overallPercentage}%`);
    doc.moveDown();

    courseWise.forEach((course) => {
      doc.text(`${course.course}: ${course.present}/${course.total} (${course.percentage}%)`);
    });

    doc.end();
  });
};

module.exports = { generateAttendancePdf };
