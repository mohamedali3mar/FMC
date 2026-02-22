import * as XLSX from 'xlsx';

/**
 * Force a file download in the browser with a specific extension.
 * Using a more robust method that works better on Mac/Safari.
 */
export function forceDownloadExcel(workbook: XLSX.WorkBook, fileName: string) {
    try {
        // Ensure name has extension
        const finalName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;

        // Write as array buffer
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

        // Create blob
        const blob = new Blob([wbout], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        // Browser download trigger
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        a.href = url;
        a.download = finalName;
        a.click();

        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        console.log(`Forced download triggered for: ${finalName}`);
        return true;
    } catch (error) {
        console.error("Force download error:", error);
        return false;
    }
}
