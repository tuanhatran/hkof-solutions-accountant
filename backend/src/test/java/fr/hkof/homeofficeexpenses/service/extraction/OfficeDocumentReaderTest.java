package fr.hkof.homeofficeexpenses.service.extraction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class OfficeDocumentReaderTest {

    private final OfficeDocumentReader reader = new OfficeDocumentReader();

    @Test
    @DisplayName("Reads DOCX paragraphs and tables as flat text")
    void readsDocxParagraphsAndTables() throws IOException {
        byte[] docx;
        try (XWPFDocument document = new XWPFDocument()) {
            XWPFParagraph paragraph = document.createParagraph();
            paragraph.createRun().setText("Facture EDF");
            document.createParagraph().createRun().setText("   ");
            XWPFTable table = document.createTable(1, 2);
            table.getRow(0).getCell(0).setText("Total TTC");
            table.getRow(0).getCell(1).setText("78,00");
            docx = write(document);
        }

        String text = reader.extractDocx(docx);

        assertThat(text).contains("Facture EDF");
        assertThat(text).contains("Total TTC | 78,00");
        assertThat(text).doesNotContain("   ");
    }

    @Test
    @DisplayName("Reads every XLSX sheet and skips empty rows and blank cells")
    void readsSpreadsheetCells() throws IOException {
        byte[] xlsx;
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet first = workbook.createSheet("Janvier");
            Row header = first.createRow(0);
            header.createCell(0).setCellValue("Poste");
            header.createCell(1).setCellValue("Montant");
            Row data = first.createRow(1);
            data.createCell(0).setCellValue("Loyer");
            data.createCell(1).setCellValue(700.5);
            first.createRow(2);
            Sheet second = workbook.createSheet("Février");
            second.createRow(0).createCell(0).setCellValue("Gaz");
            xlsx = write(workbook);
        }

        String text = reader.extractSpreadsheet(xlsx);

        assertThat(text).contains("Feuille : Janvier");
        assertThat(text).contains("Poste | Montant");
        assertThat(text).contains("Loyer");
        assertThat(text).contains("700,5");
        assertThat(text).contains("Feuille : Février");
        assertThat(text).contains("Gaz");
    }

    @Test
    @DisplayName("Caps the spreadsheet scan to 2000 rows and 50 columns")
    void capsSpreadsheetScan() throws IOException {
        byte[] xlsx;
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Grand");
            Row wide = sheet.createRow(0);
            for (int i = 0; i < 60; i++) {
                wide.createCell(i).setCellValue("c" + i);
            }
            for (int i = 1; i <= 2_005; i++) {
                sheet.createRow(i);
            }
            xlsx = write(workbook);
        }

        String text = reader.extractSpreadsheet(xlsx);

        assertThat(text).contains("c49");
        assertThat(text).doesNotContain("c50");
    }

    @Test
    @DisplayName("Missing rows and cells are skipped without shifting the layout")
    void skipsMissingRowsAndCells() throws IOException {
        byte[] xlsx;
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Trous");
            Row first = sheet.createRow(0);
            first.createCell(0).setCellValue("A");
            first.createCell(2).setCellValue("C");
            Row last = sheet.createRow(3);
            last.createCell(0).setCellValue("D");
            xlsx = write(workbook);
        }

        String text = reader.extractSpreadsheet(xlsx);

        assertThat(text).contains("A | | C");
        assertThat(text).contains("D");
    }

    @Test
    @DisplayName("An empty workbook yields an empty text")
    void emptyWorkbook() throws IOException {
        byte[] xlsx;
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            workbook.createSheet("Vide");
            xlsx = write(workbook);
        }

        assertThat(reader.extractSpreadsheet(xlsx)).isEqualTo("Feuille : Vide");
    }

    @Test
    @DisplayName("A malformed DOCX or XLSX archive fails explicitly")
    void malformedArchives() {
        byte[] malformed = new byte[] {1, 2, 3, 4};

        assertThatThrownBy(() -> reader.extractDocx(malformed))
                .isInstanceOfAny(IOException.class, RuntimeException.class);
        assertThatThrownBy(() -> reader.extractSpreadsheet(malformed))
                .isInstanceOfAny(IOException.class, RuntimeException.class);
    }

    private static byte[] write(XWPFDocument document) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        document.write(output);
        return output.toByteArray();
    }

    private static byte[] write(XSSFWorkbook workbook) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        workbook.write(output);
        return output.toByteArray();
    }
}
