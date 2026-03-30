/**
 * Utility to generate and download a blank CSV template for leave imports.
 */
export const downloadCSVTemplate = () => {
    const headers = ['Date', 'LeaveType', 'TransactionType', 'Days', 'Remarks'];
    const exampleRows = [
        ['2025-04-21', 'EL', 'leave_taken', '0.5', 'Medical Emergency'],
        ['2025-04-30', 'EL', 'monthly_increment', '1.75', 'Monthly Increment'],
        ['2025-06-19', 'CO', 'credit', '0.5', 'Project Delivery Bonus']
    ];

    const csvContent = [
        headers.join(','),
        ...exampleRows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'WorkShift_Leave_Template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
