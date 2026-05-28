
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import { TicketConfig, Sale, Task, Employee, Customer } from '../types';

// Interface for the data expected by the report generator
interface ReportData {
  label: string;
  rangeType: string;
  totalGross: number;
  totalTransactions: number;
  averageTicket: number;
  payments: { cash: number; transfer: number; card: number };
  topProducts: { name: string; qty: number; total: number }[];
  hourlyStats?: { hour: string; count: number; total: number }[]; // New
  categoryStats?: { name: string; total: number }[]; // New
}

interface TaskReportData {
  label: string;
  rangeType: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  byEmployee: { id: string; name: string; completed: number; total: number; tasks: Task[] }[];
}

interface AssetReportData {
  label: string;
  plantStock: number;
  routeStock: number;
  totalAssets: number;
  netMovement: number; // Out - In
  returnedCount: number;
  soldCount: number;
  vehicleBreakdown: { plate: string; load: number; items: string }[];
}

// Helper to convert hex to rgb 0-1 range
const hexToRgbScale = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
};

export const generateFinancialPDF = (data: ReportData, config: TicketConfig): string => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // --- HEADER ---
  doc.setFillColor(2, 132, 199); // Sky-600
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(config.businessName, 15, 15);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('REPORTE FINANCIERO INTEGRAL', 15, 22);
  doc.text(`Generado: ${new Date().toLocaleString()}`, 15, 27);
  
  // Right side header info
  doc.setFontSize(10);
  doc.text(`Periodo: ${data.label}`, pageWidth - 15, 15, { align: 'right' });
  doc.text(`Tipo: ${data.rangeType.toUpperCase()}`, pageWidth - 15, 20, { align: 'right' });

  // --- KPI CARDS (Simulated) ---
  let yPos = 55;
  
  // Title
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen General', 15, yPos);
  
  yPos += 10;
  
  // Draw Boxes for KPIs
  const boxWidth = (pageWidth - 40) / 3;
  const boxHeight = 25;
  
  // Box 1: Ventas
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, yPos, boxWidth, boxHeight, 3, 3, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('VENTAS BRUTAS', 20, yPos + 8);
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${data.totalGross.toLocaleString()}`, 20, yPos + 18);

  // Box 2: Ops
  doc.roundedRect(15 + boxWidth + 5, yPos, boxWidth, boxHeight, 3, 3, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('TRANSACCIONES', 20 + boxWidth + 5, yPos + 8);
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.totalTransactions}`, 20 + boxWidth + 5, yPos + 18);

  // Box 3: Ticket Prom
  doc.roundedRect(15 + (boxWidth * 2) + 10, yPos, boxWidth, boxHeight, 3, 3, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('TICKET PROMEDIO', 20 + (boxWidth * 2) + 10, yPos + 8);
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${data.averageTicket.toFixed(2)}`, 20 + (boxWidth * 2) + 10, yPos + 18);

  yPos += 40;

  // --- PAYMENTS SECTION ---
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Desglose de Ingresos', 15, yPos);
  yPos += 5;

  const total = data.payments.cash + data.payments.transfer + data.payments.card;

  autoTable(doc, {
    startY: yPos,
    head: [['Método de Pago', 'Monto Recaudado']],
    body: [
      ['Efectivo', `$${data.payments.cash.toLocaleString()}`],
      ['Transferencia', `$${data.payments.transfer.toLocaleString()}`],
      ['Tarjeta', `$${data.payments.card.toLocaleString()}`],
      ['TOTAL', `$${total.toLocaleString()}`]
    ],
    theme: 'striped',
    headStyles: { fillColor: [2, 132, 199] },
    styles: { fontSize: 10 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    foot: [['Balance', `$${total.toLocaleString()}`]],
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] }
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // --- HOURLY STATS (NEW) ---
  if (data.hourlyStats && data.hourlyStats.length > 0) {
    if (yPos > 240) { doc.addPage(); yPos = 20; }
    
    doc.text('Ventas por Horario (Picos de Actividad)', 15, yPos);
    yPos += 5;

    const hourlyRows = data.hourlyStats.map(h => [h.hour, h.count, `$${h.total.toLocaleString()}`]);
    
    autoTable(doc, {
        startY: yPos,
        head: [['Hora', 'Tickets', 'Venta']],
        body: hourlyRows,
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105] },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } }
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // --- PRODUCTS SECTION ---
  if (yPos > 240) { doc.addPage(); yPos = 20; }
  doc.text('Top Productos Vendidos', 15, yPos);
  yPos += 5;

  const productRows = data.topProducts.map(p => [
    p.name,
    p.qty.toString(),
    `$${p.total.toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Producto', 'Cantidad', 'Venta Total']],
    body: productRows,
    theme: 'grid',
    headStyles: { fillColor: [2, 132, 199] },
    columnStyles: { 
      1: { halign: 'center' },
      2: { halign: 'right' }
    }
  });

  // --- FOOTER ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Aqua+ ERP - Documento Confidencial - Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  // Return the Data URL string to be used in an iframe
  return doc.output('datauristring');
};

export const generateGarrafonReportPDF = (data: AssetReportData, config: TicketConfig): string => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // --- HEADER ---
  doc.setFillColor(13, 148, 136); // Teal-600
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(config.businessName, 15, 15);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('REPORTE DE ACTIVOS Y ENVASES', 15, 22);
  doc.text(`Generado: ${new Date().toLocaleString()}`, 15, 27);
  
  // Right side header info
  doc.text(`Corte: ${data.label}`, pageWidth - 15, 15, { align: 'right' });

  let yPos = 55;

  // --- INVENTORY SUMMARY ---
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Ubicación de Activos (Garrafones Llenos)', 15, yPos);
  
  yPos += 10;

  // Draw Boxes
  const boxWidth = (pageWidth - 40) / 3;
  const boxHeight = 25;

  // Box 1: Planta
  doc.setDrawColor(20, 184, 166); // Teal border
  doc.setFillColor(240, 253, 250); // Teal-50
  doc.roundedRect(15, yPos, boxWidth, boxHeight, 3, 3, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(13, 148, 136);
  doc.text('EN PLANTA', 20, yPos + 8);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.plantStock}`, 20, yPos + 18);

  // Box 2: Ruta
  doc.roundedRect(15 + boxWidth + 5, yPos, boxWidth, boxHeight, 3, 3, 'FD');
  doc.setFontSize(8);
  doc.text('EN RUTA', 20 + boxWidth + 5, yPos + 8);
  doc.setFontSize(16);
  doc.text(`${data.routeStock}`, 20 + boxWidth + 5, yPos + 18);

  // Box 3: Total
  doc.setFillColor(13, 148, 136); // Teal-600
  doc.roundedRect(15 + (boxWidth * 2) + 10, yPos, boxWidth, boxHeight, 3, 3, 'FD');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('TOTAL AUDITADO', 20 + (boxWidth * 2) + 10, yPos + 8);
  doc.setFontSize(16);
  doc.text(`${data.totalAssets}`, 20 + (boxWidth * 2) + 10, yPos + 18);

  yPos += 40;

  // --- MOVEMENT BALANCE ---
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text('Balance de Flujo (Movimientos en Periodo)', 15, yPos);
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    head: [['Concepto', 'Cantidad', 'Interpretación']],
    body: [
      ['Salidas (Ventas)', data.soldCount, 'Envases entregados a clientes'],
      ['Entradas (Retornos)', data.returnedCount, 'Envases vacíos recibidos'],
      ['Balance Neto', data.netMovement, data.netMovement > 0 ? 'Más envases en calle (Deuda)' : 'Recuperación de envases']
    ],
    theme: 'grid',
    headStyles: { fillColor: [13, 148, 136] }, // Teal
    columnStyles: { 1: { fontStyle: 'bold', halign: 'center' } },
    didParseCell: (dataCell: any) => {
        if(dataCell.row.index === 2 && dataCell.column.index === 1) {
            dataCell.cell.styles.textColor = data.netMovement > 0 ? [220, 38, 38] : [22, 163, 74];
        }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 20;

  // --- VEHICLE BREAKDOWN ---
  doc.text('Desglose por Unidad Móvil', 15, yPos);
  yPos += 5;

  const vehicleRows = data.vehicleBreakdown.map(v => [
    v.plate,
    `${v.load} Unidades`,
    v.items
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Unidad / Placa', 'Carga Total', 'Detalle de Carga']],
    body: vehicleRows.length > 0 ? vehicleRows : [['Sin unidades activas', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] }, // Slate-900
  });

  // --- FOOTER ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Aqua+ ERP - Control de Activos - Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  return doc.output('datauristring');
};

export const generateTaskReportPDF = (data: TaskReportData, config: TicketConfig): string => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // --- HEADER ---
  doc.setFillColor(245, 158, 11); // Amber-500
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(config.businessName, 15, 15);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('REPORTE OPERATIVO DE TAREAS', 15, 22);
  doc.text(`Generado: ${new Date().toLocaleString()}`, 15, 27);
  
  // Right side header info
  doc.setFontSize(10);
  doc.text(`Periodo: ${data.label}`, pageWidth - 15, 15, { align: 'right' });
  doc.text(`Cumplimiento: ${Math.round((data.completedTasks / (data.totalTasks || 1)) * 100)}%`, pageWidth - 15, 20, { align: 'right' });

  let yPos = 55;

  // --- SUMMARY ---
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen de Productividad', 15, yPos);
  
  yPos += 10;

  // Draw Boxes
  const boxWidth = (pageWidth - 40) / 3;
  const boxHeight = 25;

  // Box 1: Total
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, yPos, boxWidth, boxHeight, 3, 3, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL ASIGNADAS', 20, yPos + 8);
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.totalTasks}`, 20, yPos + 18);

  // Box 2: Completadas
  doc.roundedRect(15 + boxWidth + 5, yPos, boxWidth, boxHeight, 3, 3, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('COMPLETADAS', 20 + boxWidth + 5, yPos + 8);
  doc.setFontSize(12);
  doc.setTextColor(34, 197, 94); // Green
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.completedTasks}`, 20 + boxWidth + 5, yPos + 18);

  // Box 3: Pendientes
  doc.roundedRect(15 + (boxWidth * 2) + 10, yPos, boxWidth, boxHeight, 3, 3, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('PENDIENTES', 20 + (boxWidth * 2) + 10, yPos + 8);
  doc.setFontSize(12);
  doc.setTextColor(239, 68, 68); // Red
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.pendingTasks}`, 20 + (boxWidth * 2) + 10, yPos + 18);

  yPos += 40;

  // --- DETAILS PER EMPLOYEE ---
  data.byEmployee.forEach((emp) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`Colaborador: ${emp.name} (${Math.round((emp.completed / (emp.total || 1)) * 100)}%)`, 15, yPos);
    yPos += 5;

    // Group tasks by date
    const tasksByDate = emp.tasks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let lastDate = '';

    const taskRows = tasksByDate.map(t => {
      const isNewDate = t.date !== lastDate;
      if(isNewDate) lastDate = t.date;
      
      const time = new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return [
        isNewDate ? t.date : '', // Group visual
        time,
        t.title,
        t.status === 'completada' ? 'COMPLETA' : 'PENDIENTE',
        t.description || '-'
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Fecha', 'Hora', 'Tarea', 'Estado', 'Detalle']],
      body: taskRows,
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11] }, // Amber header
      styles: { fontSize: 8 },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 25 },
        3: { fontStyle: 'bold' }
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 3) {
          if (data.cell.raw === 'PENDIENTE') {
            data.cell.styles.textColor = [220, 38, 38]; // Red
          } else {
            data.cell.styles.textColor = [22, 163, 74]; // Green
          }
        }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  });

  // --- FOOTER ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Aqua+ ERP - Reporte Operativo - Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  return doc.output('datauristring');
};

/**
 * Generates a Ticket PDF using pdf-lib and returns raw bytes
 */
export const generateTicketPDF = async (sale: Sale, config: TicketConfig): Promise<Uint8Array> => {
  // Crear nuevo documento PDF
  const pdfDoc = await PDFDocument.create();
  
  const accent = hexToRgbScale(config.colorHex || '#000000');
  const accentColor = rgb(accent.r, accent.g, accent.b);

  // Calcular altura dinámica base
  const itemsHeight = sale.items.length * 25; 
  // Dynamic space for optional elements
  const qrSpace = config.showQr !== false ? 120 : 20; 
  const footerSpace = config.showFooter !== false ? 60 : 20;
  const logoSpace = (config.showLogo !== false && config.logoUrl) ? 80 : 0;

  const baseHeight = 300 + logoSpace; 
  const ticketHeight = baseHeight + itemsHeight + qrSpace + footerSpace;
  
  // DYNAMIC WIDTH: 80mm approx 226pts, 58mm approx 164pts.
  // Default to 80mm standard (280pts wide for readability with margins) unless 58mm specified.
  const is58mm = config.paperWidth === '58mm';
  const ticketWidth = is58mm ? 164 : 280; 
  const contentWidth = ticketWidth - 30; // 15 margin each side
  const centerX = ticketWidth / 2;
  const margin = 15;

  const page = pdfDoc.addPage([ticketWidth, ticketHeight]);
  
  // Obtener fuentes
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);
  
  // Font Size Scaling for 58mm
  const fs = (size: number) => is58mm ? Math.max(6, size * 0.75) : size; 
  
  let yPos = ticketHeight - 20;

  // --- HELPERS ---
  const sanitize = (text: string) => {
    if (!text) return '';
    return text
      .replace(/★/g, '*')
      .replace(/☆/g, '*')
      .replace(/●/g, '-')
      .replace(/•/g, '-');
  };

  const drawCenteredText = (text: string, font: PDFFont, size: number, color = rgb(0,0,0)) => {
    const safeText = sanitize(text);
    const scaledSize = fs(size);
    const textWidth = font.widthOfTextAtSize(safeText, scaledSize);
    page.drawText(safeText, { x: centerX - (textWidth / 2), y: yPos, size: scaledSize, font, color });
    yPos -= (scaledSize + 4);
  };

  const drawLeftRight = (left: string, right: string, font: PDFFont, size: number, isBold = false) => {
    const safeLeft = sanitize(left);
    const safeRight = sanitize(right);
    const scaledSize = fs(size);
    const rightWidth = font.widthOfTextAtSize(safeRight, scaledSize);
    page.drawText(safeLeft, { x: margin, y: yPos, size: scaledSize, font });
    page.drawText(safeRight, { x: ticketWidth - margin - rightWidth, y: yPos, size: scaledSize, font: isBold ? fontBold : font });
    yPos -= (scaledSize + 6);
  };

  const drawDashedLine = () => {
    const dash = '- - - - - - - - - - - - - - - - - - - - - - - - - - - -';
    const scaledSize = fs(10);
    const textWidth = fontCourier.widthOfTextAtSize(dash, scaledSize);
    page.drawText(dash, { x: centerX - (textWidth / 2), y: yPos, size: scaledSize, font: fontCourier, color: rgb(0.5, 0.5, 0.5) });
    yPos -= 12;
  };

  // --- LOGO ---
  if (config.showLogo !== false && config.logoUrl && config.logoUrl.startsWith('data:image')) {
    try {
      if (config.logoUrl.includes('image/svg+xml')) {
         yPos -= 10;
      } else {
          const base64Data = config.logoUrl.split(',')[1];
          const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          
          let logoImage;
          if (config.logoUrl.includes('image/png')) {
            logoImage = await pdfDoc.embedPng(imageBytes);
          } else if (config.logoUrl.includes('image/jpeg') || config.logoUrl.includes('image/jpg')) {
            logoImage = await pdfDoc.embedJpg(imageBytes);
          }

          if (logoImage) {
              const logoDims = logoImage.scale(1);
              const maxLogoWidth = is58mm ? 50 : 80;
              const scaleFactor = maxLogoWidth / logoDims.width;
              const scaledWidth = logoDims.width * scaleFactor;
              const scaledHeight = logoDims.height * scaleFactor;

              page.drawImage(logoImage, {
                x: centerX - (scaledWidth / 2),
                y: yPos - scaledHeight,
                width: scaledWidth,
                height: scaledHeight,
              });
              yPos -= (scaledHeight + 10);
          } else {
              yPos -= 10;
          }
      }
    } catch (e) {
      console.warn("Error embedding logo", e);
      yPos -= 10;
    }
  } else {
    yPos -= 10;
  }

  // --- HEADER ---
  drawCenteredText(config.businessName, fontBold, 16, accentColor);
  if (config.slogan) drawCenteredText(config.slogan.toUpperCase(), fontBold, 8, rgb(0.6, 0.6, 0.6));
  
  yPos -= 5;
  drawCenteredText(config.address, fontRegular, 8, rgb(0.4, 0.4, 0.4));
  drawCenteredText(`Tel: ${config.phone}`, fontRegular, 8, rgb(0.4, 0.4, 0.4));
  if (config.email) drawCenteredText(config.email, fontRegular, 8, rgb(0.4, 0.4, 0.4));
  if (config.rfc) drawCenteredText(`RFC: ${config.rfc}`, fontRegular, 8, rgb(0.4, 0.4, 0.4));
  
  yPos -= 5;
  drawDashedLine();

  // --- META INFO ---
  drawLeftRight('Folio:', sale.id, fontBold, 10);
  drawLeftRight('Fecha:', new Date(sale.timestamp).toLocaleDateString(), fontRegular, 9);
  drawLeftRight('Hora:', new Date(sale.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), fontRegular, 9);
  if (sale.customerAlias) {
    drawLeftRight('Cliente:', sale.customerAlias.substring(0, is58mm ? 15 : 25), fontBold, 9);
  }
  
  yPos -= 5;
  
  // --- TABLE HEADER ---
  const headerSize = fs(8);
  page.drawRectangle({
    x: margin,
    y: yPos - 2,
    width: contentWidth,
    height: 14,
    color: rgb(0.95, 0.95, 0.95),
  });
  
  page.drawText('CANT', { x: margin + 5, y: yPos, size: headerSize, font: fontBold });
  page.drawText('DESCRIPCION', { x: margin + (is58mm ? 35 : 45), y: yPos, size: headerSize, font: fontBold });
  const impHeaderWidth = fontBold.widthOfTextAtSize('IMPORTE', headerSize);
  page.drawText('IMPORTE', { x: ticketWidth - margin - impHeaderWidth - 5, y: yPos, size: headerSize, font: fontBold });
  yPos -= 18;

  // --- ITEMS ---
  const itemSize = fs(9);
  const descSize = fs(8);
  sale.items.forEach(item => {
    // Cantidad
    page.drawText(item.quantity.toString(), { x: margin + 8, y: yPos, size: itemSize, font: fontBold });
    
    // Descripción
    const cleanName = sanitize(item.name);
    const maxChars = is58mm ? 15 : 25;
    const name = cleanName.length > maxChars ? cleanName.substring(0, maxChars) + '...' : cleanName;
    page.drawText(name, { x: margin + (is58mm ? 35 : 45), y: yPos, size: descSize, font: fontRegular });
    
    // Importe
    const totalItem = (item.quantity * item.price).toFixed(2);
    const totalItemWidth = fontRegular.widthOfTextAtSize(`$${totalItem}`, itemSize);
    page.drawText(`$${totalItem}`, { x: ticketWidth - margin - totalItemWidth, y: yPos, size: itemSize, font: fontRegular });
    
    yPos -= 12;
  });

  yPos -= 5;
  drawDashedLine();

  // --- TOTALS ---
  const drawTotalLine = (label: string, value: string, isBig = false, color = rgb(0,0,0)) => {
    const safeLabel = sanitize(label);
    const safeValue = sanitize(value);
    
    const size = isBig ? fs(14) : fs(9);
    const font = isBig ? fontBold : fontRegular;

    const labelWidth = font.widthOfTextAtSize(safeLabel, size);
    const valueWidth = font.widthOfTextAtSize(safeValue, size);
    
    const valueX = ticketWidth - margin - valueWidth;
    const labelX = valueX - labelWidth - 10;

    page.drawText(safeLabel, { x: labelX, y: yPos, size, font, color });
    page.drawText(safeValue, { x: valueX, y: yPos, size, font, color });
    yPos -= (size + 6);
  };

  drawTotalLine('SUBTOTAL:', `$${sale.total.toFixed(2)}`);
  drawTotalLine('PAGADO:', `$${sale.paidAmount.toFixed(2)}`, false, rgb(0.1, 0.6, 0.3));
  
  if (sale.paidAmount < sale.total) {
    drawTotalLine('DEUDA GENERADA:', `$${(sale.total - sale.paidAmount).toFixed(2)}`, false, rgb(0.8, 0.1, 0.1));
  }
  if (sale.change > 0) {
    drawTotalLine('CAMBIO:', `$${sale.change.toFixed(2)}`, false, rgb(0.1, 0.4, 0.8));
  }

  yPos -= 2;
  drawTotalLine('TOTAL:', `$${sale.total.toFixed(2)}`, true, accentColor);
  
  yPos -= 5;

  // --- CUSTOMER BALANCE ---
  if (sale.previousBalance !== undefined || sale.newBalance !== undefined) {
    const prevBal = sale.previousBalance || 0;
    const currBal = sale.newBalance || 0;
    
    if (prevBal > 0 || currBal > 0) {
      page.drawRectangle({
        x: margin + 20,
        y: yPos - 25,
        width: contentWidth - 40,
        height: 35,
        color: rgb(0.96, 0.96, 1),
        borderColor: rgb(0.9, 0.9, 1),
        borderWidth: 0.5
      });
      yPos -= 8;
      drawTotalLine('Saldo Anterior:', `$${prevBal.toFixed(2)}`, false, rgb(0.4, 0.4, 0.7));
      drawTotalLine('Saldo Actual:', `$${currBal.toFixed(2)}`, true, rgb(0.2, 0.2, 0.5));
      yPos -= 15;
    }
  }

  // --- GARRAFONES RETURNED ---
  if (sale.emptyGarrafonsReturned > 0) {
    yPos -= 5;
    page.drawRectangle({
      x: margin + 10,
      y: yPos - 5,
      width: contentWidth - 20,
      height: 25,
      color: rgb(0.9, 0.95, 1),
    });
    const text = `* ${sale.emptyGarrafonsReturned} Envases Recibidos *`;
    const textW = fontBold.widthOfTextAtSize(text, fs(10));
    page.drawText(text, { x: centerX - (textW/2), y: yPos + 5, size: fs(10), font: fontBold, color: rgb(0.1, 0.4, 0.7) });
    yPos -= 25;
  }

  // --- FOOTER & QR CODE ---
  if (config.showFooter !== false) {
      yPos -= 10;
      const footerSize = fs(9);
      
      if (config.footerMessage) {
        const words = sanitize(config.footerMessage).split(' ');
        let line = '';
        for (const word of words) {
            const testLine = line + word + ' ';
            const testWidth = fontRegular.widthOfTextAtSize(testLine, footerSize);
            if (testWidth > contentWidth) {
                drawCenteredText(line, fontRegular, footerSize);
                line = word + ' ';
            } else {
                line = testLine;
            }
        }
        drawCenteredText(line, fontRegular, footerSize);
      }
      
      if (config.extraNote) {
        drawCenteredText(sanitize(config.extraNote), fontRegular, fs(8), rgb(0.5, 0.5, 0.5));
      }
      
      drawCenteredText('*** GRACIAS POR SU PREFERENCIA ***', fontBold, footerSize);
  }

  // QR Code at the bottom
  if (config.showQr !== false) {
      yPos -= 10;
      try {
        const qrData = btoa(`AQUA-PRO-SECURE|${JSON.stringify({ id: sale.id, total: sale.total })}`);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
        
        // Fetch image data
        const qrResponse = await fetch(qrUrl);
        const qrArrayBuffer = await qrResponse.arrayBuffer();
        const qrImage = await pdfDoc.embedPng(qrArrayBuffer);
        
        const qrSize = is58mm ? 80 : 100;
        
        page.drawImage(qrImage, {
            x: centerX - (qrSize / 2),
            y: yPos - qrSize,
            width: qrSize,
            height: qrSize
        });
      } catch (e) {
        console.warn("Could not embed QR code in PDF", e);
        // Draw placeholder
        yPos -= 20;
        drawCenteredText('[ CODIGO QR NO DISPONIBLE ]', fontCourier, 8);
      }
  }

  return await pdfDoc.save();
}
