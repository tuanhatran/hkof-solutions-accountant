package fr.hkof.homeofficeexpenses.service.extraction;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;

/**
 * Reads office formats (docx, xlsx/xls) into flat text for the analysis pipeline.
 */
class OfficeDocumentReader {

    String extractDocx(byte[] content) throws IOException {
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(content))) {
            StringBuilder text = new StringBuilder();
            for (XWPFParagraph paragraph : document.getParagraphs()) {
                if (!paragraph.getText().isBlank()) {
                    text.append(paragraph.getText()).append('\n');
                }
            }
            for (XWPFTable table : document.getTables()) {
                for (XWPFTableRow line : table.getRows()) {
                    List<String> cells = new ArrayList<>();
                    for (XWPFTableCell cell : line.getTableCells()) {
                        cells.add(cell.getText());
                    }
                    text.append(String.join(" | ", cells)).append('\n');
                }
            }
            return DocumentTextNormalizer.truncate(text.toString());
        }
    }

    String extractSpreadsheet(byte[] content) throws IOException {
        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(content))) {
            DataFormatter formatter = new DataFormatter(Locale.FRANCE);
            StringBuilder text = new StringBuilder();
            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
                Sheet sheet = workbook.getSheetAt(i);
                text.append("Feuille : ").append(sheet.getSheetName()).append('\n');
                int rowLimit = Math.min(sheet.getLastRowNum(), 2000);
                for (int j = 0; j <= rowLimit; j++) {
                    Row line = sheet.getRow(j);
                    if (line == null) {
                        continue;
                    }
                    List<String> values = new ArrayList<>();
                    int last = Math.min(line.getLastCellNum(), 50);
                    for (int k = 0; k < last; k++) {
                        Cell cell = line.getCell(k);
                        values.add(cell == null ? "" : formatter.formatCellValue(cell));
                    }
                    if (values.stream().anyMatch(v -> !v.isBlank())) {
                        text.append(String.join(" | ", values)).append('\n');
                    }
                }
            }
            return DocumentTextNormalizer.truncate(text.toString());
        }
    }
}
