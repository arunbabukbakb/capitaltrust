import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Configure pdfMake virtual file system for fonts
if (pdfMake && pdfFonts && (pdfFonts as any).pdfMake) {
  (pdfMake as any).vfs = (pdfFonts as any).pdfMake.vfs;
} else if (pdfMake && (pdfFonts as any).vfs) {
  (pdfMake as any).vfs = (pdfFonts as any).vfs;
}

export default pdfMake;
