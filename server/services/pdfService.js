import PDFDocument from 'pdfkit';

export const generateInvoicePDF = (invoice, company) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const primaryTeal = '#43929e';
            const secondaryTeal = '#1a555e';
            const darkText = '#1f1f1f';
            const lightText = '#6b7280';
            const lineColor = '#d1d5db';

            // Helpers
            const formatCurrency = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
            const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

            // ── Top Right Geometric Shapes ──
            // Light Teal Polygon
            doc.polygon([doc.page.width - 200, 0], [doc.page.width, 0], [doc.page.width, 40], [doc.page.width - 160, 40])
                .fill(primaryTeal);

            // Dark Teal Polygon overlay
            doc.polygon([doc.page.width - 100, 0], [doc.page.width, 0], [doc.page.width, 60], [doc.page.width - 40, 60])
                .fill(secondaryTeal);

            // ── Logo & Company Name ──
            const logoY = 80;
            // Draw a placeholder blue rounded rect for the logo icon
            doc.roundedRect(50, logoY, 60, 60, 15).fill('#6366f1');
            // Draw a lightning bolt icon inside the rounded rect
            doc.polygon([75, 95], [85, 95], [80, 110], [90, 110], [70, 130], [75, 115], [65, 115]).fill('white');

            doc.fontSize(28).fillColor('black').font('Helvetica-Bold')
                .text('ProBill', 125, logoY + 5);
            doc.fontSize(16).fillColor('#64748b').font('Helvetica')
                .text('ERP Platform', 125, logoY + 35);

            // ── Info Section ──
            const infoY = 180;

            // Left Side: FROM
            doc.fontSize(10).fillColor('black').font('Helvetica-Bold').text('FROM:', 50, infoY);
            doc.fontSize(10).fillColor(darkText).font('Helvetica')
                .text(company?.name || 'Your Company', 50, infoY + 15)
                .text(company?.address?.street || '', 50, infoY + 28)
                .text(`${company?.address?.city || ''}, ${company?.address?.state || ''}`, 50, infoY + 41)
                .text(company?.gstin ? `GSTIN: ${company.gstin}` : '', 50, infoY + 54);

            // Right Side: INVOICE METADATA
            const rightColumnX = doc.page.width / 2;
            doc.fontSize(10).fillColor('black').font('Helvetica-Bold')
                .text('INVOICE NO:', rightColumnX - 60, infoY, { width: 100, align: 'right' })
                .text('DATE:', rightColumnX - 60, infoY + 15, { width: 100, align: 'right' })
                .text('DUE DATE:', rightColumnX - 60, infoY + 30, { width: 100, align: 'right' });

            doc.font('Helvetica').fillColor(darkText)
                .text(invoice.invoiceNo, rightColumnX + 45, infoY)
                .text(formatDate(invoice.issueDate), rightColumnX + 45, infoY + 15)
                .text(formatDate(invoice.dueDate), rightColumnX + 45, infoY + 30);

            // Right Side: BILL TO
            const billToY = infoY + 65;
            doc.fontSize(10).fillColor('black').font('Helvetica-Bold')
                .text(invoice.type === 'purchase' ? 'BILL TO (VENDOR):' : 'BILL TO (CUSTOMER):', rightColumnX + 25, billToY);

            const party = invoice.vendor || invoice.customer;
            doc.fontSize(10).fillColor('black').font('Helvetica')
                .text(party?.name || 'N/A', rightColumnX + 25, billToY + 15);
            doc.fillColor(darkText)
                .text(party?.email || '', rightColumnX + 25, billToY + 28)
                .text(party?.phone || '', rightColumnX + 25, billToY + 41)
                .text(party?.gstin ? `GSTIN: ${party.gstin}` : '', rightColumnX + 25, billToY + 54);

            // ── Line Items Table Header ──
            const tableStartY = 350;

            // Top border
            doc.moveTo(50, tableStartY).lineTo(doc.page.width - 50, tableStartY).lineWidth(1.5).stroke(darkText);

            doc.fontSize(10).fillColor('black').font('Helvetica-Bold')
                .text('DESCRIPTION', 50, tableStartY + 10)
                .text('UNIT PRICE', 280, tableStartY + 10, { width: 80, align: 'right' })
                .text('QTY', 380, tableStartY + 10, { width: 50, align: 'center' })
                .text('TOTAL', 450, tableStartY + 10, { width: 90, align: 'right' });

            // Bottom border
            doc.moveTo(50, tableStartY + 28).lineTo(doc.page.width - 50, tableStartY + 28).lineWidth(1.5).stroke(darkText);

            // ── Line Items ──
            let rowY = tableStartY + 45;
            doc.font('Helvetica').fontSize(10);

            invoice.lineItems.forEach((item) => {
                doc.fillColor(darkText)
                    .text(item.description, 50, rowY, { width: 220 })
                    .text(formatCurrency(item.unitPrice), 280, rowY, { width: 80, align: 'right' })
                    .text(item.quantity, 380, rowY, { width: 50, align: 'center' })
                    .text(formatCurrency(item.total), 450, rowY, { width: 90, align: 'right' });

                // Calculate height based on possible text wrapping in description
                const textHeight = doc.heightOfString(item.description, { width: 220 });
                rowY += Math.max(textHeight, 15) + 15;

                // Add page break logic if table gets too long
                if (rowY > doc.page.height - 200) {
                    doc.addPage();
                    rowY = 50;
                }
            });

            // ── Totals Section ──
            rowY = Math.max(rowY, doc.page.height - 280); // Ensure totals are pushed down nicely if few items

            // Separator Line
            doc.moveTo(50, rowY).lineTo(doc.page.width - 50, rowY).lineWidth(1).stroke(lineColor);
            rowY += 20;

            const totalsX = doc.page.width - 250;
            doc.fontSize(10).font('Helvetica')
                .text('Subtotal:', totalsX, rowY, { align: 'right', width: 90 })
                .text('Tax:', totalsX, rowY + 18, { align: 'right', width: 90 });

            doc.fontSize(10).font('Helvetica')
                .text(formatCurrency(invoice.subtotal), totalsX + 100, rowY, { width: 100, align: 'right' })
                .text(formatCurrency(invoice.totalTax), totalsX + 100, rowY + 18, { width: 100, align: 'right' });

            doc.fontSize(11).font('Helvetica-Bold')
                .text('TOTAL', totalsX, rowY + 36, { align: 'right', width: 90 })
                .text(formatCurrency(invoice.total), totalsX + 100, rowY + 36, { width: 100, align: 'right' });

            // ── Footer Section ──
            const footerY = doc.page.height - 150;

            doc.fontSize(11).font('Helvetica-Bold').fillColor('black')
                .text(`Payment Terms: `, 50, footerY)
                .font('Helvetica').text(`Net ${invoice.paymentTerms || 30} Days`, 140, footerY);

            // Thank you message
            doc.fontSize(16).font('Helvetica').fillColor(darkText)
                .text('Thank you for your\nbusiness!', 50, footerY + 40, { width: 200 });

            // Signature Line
            const signatureX = doc.page.width - 250;
            const signatureY = footerY + 70;
            doc.moveTo(signatureX, signatureY).lineTo(signatureX + 200, signatureY).lineWidth(1.5).stroke(darkText);
            doc.fontSize(10).font('Helvetica').text('Authorized Signed', signatureX, signatureY + 10, { width: 200, align: 'center' });

            // ── Bottom Left Geometric Shapes ──
            // Light Teal Polygon
            doc.polygon([0, doc.page.height - 40], [160, doc.page.height - 40], [200, doc.page.height], [0, doc.page.height])
                .fill(primaryTeal);

            // Dark Teal Polygon overlay
            doc.polygon([40, doc.page.height - 60], [100, doc.page.height - 60], [140, doc.page.height], [0, doc.page.height])
                .fill(secondaryTeal);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};