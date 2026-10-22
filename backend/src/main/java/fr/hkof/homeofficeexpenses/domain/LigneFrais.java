package fr.hkof.homeofficeexpenses.domain;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "expense_line")
public class LigneFrais {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "statement_id", nullable = false)
    private NoteFrais noteFrais;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private Poste poste;

    @Column(name = "amount_incl_vat", nullable = false, precision = 12, scale = 2)
    private BigDecimal montantTtc;

    @Column(name = "period_start")
    private LocalDate periodeDebut;

    @Column(name = "period_end")
    private LocalDate periodeFin;

    @Column(name = "monthly_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal montantMois;

    @Column(name = "pro_rata_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal prorataPct;

    @Column(name = "claimed_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal montantRetenu;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receipt_id")
    private Justificatif justificatif;

    @Enumerated(EnumType.STRING)
    @Column(name = "amount_source", nullable = false, length = 10)
    private SourceMontant sourceMontant;

    @Column(name = "ai_detected_amount", precision = 12, scale = 2)
    private BigDecimal montantDetecteIa;

    @Column(name = "ai_confidence", length = 20)
    private String confianceIa;

    @Column(name = "label_snapshot")
    private String libelleSnapshot;

    @Column(name = "supplier_snapshot")
    private String fournisseurSnapshot;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public NoteFrais getNoteFrais() {
        return noteFrais;
    }

    public void setNoteFrais(NoteFrais noteFrais) {
        this.noteFrais = noteFrais;
    }

    public Poste getPoste() {
        return poste;
    }

    public void setPoste(Poste poste) {
        this.poste = poste;
    }

    public BigDecimal getMontantTtc() {
        return montantTtc;
    }

    public void setMontantTtc(BigDecimal montantTtc) {
        this.montantTtc = montantTtc;
    }

    public LocalDate getPeriodeDebut() {
        return periodeDebut;
    }

    public void setPeriodeDebut(LocalDate periodeDebut) {
        this.periodeDebut = periodeDebut;
    }

    public LocalDate getPeriodeFin() {
        return periodeFin;
    }

    public void setPeriodeFin(LocalDate periodeFin) {
        this.periodeFin = periodeFin;
    }

    public BigDecimal getMontantMois() {
        return montantMois;
    }

    public void setMontantMois(BigDecimal montantMois) {
        this.montantMois = montantMois;
    }

    public BigDecimal getProrataPct() {
        return prorataPct;
    }

    public void setProrataPct(BigDecimal prorataPct) {
        this.prorataPct = prorataPct;
    }

    public BigDecimal getMontantRetenu() {
        return montantRetenu;
    }

    public void setMontantRetenu(BigDecimal montantRetenu) {
        this.montantRetenu = montantRetenu;
    }

    public Justificatif getJustificatif() {
        return justificatif;
    }

    public void setJustificatif(Justificatif justificatif) {
        this.justificatif = justificatif;
    }

    public SourceMontant getSourceMontant() {
        return sourceMontant;
    }

    public void setSourceMontant(SourceMontant sourceMontant) {
        this.sourceMontant = sourceMontant;
    }

    public BigDecimal getMontantDetecteIa() {
        return montantDetecteIa;
    }

    public void setMontantDetecteIa(BigDecimal montantDetecteIa) {
        this.montantDetecteIa = montantDetecteIa;
    }

    public String getConfianceIa() {
        return confianceIa;
    }

    public void setConfianceIa(String confianceIa) {
        this.confianceIa = confianceIa;
    }

    public String getLibelleSnapshot() {
        return libelleSnapshot;
    }

    public void setLibelleSnapshot(String libelleSnapshot) {
        this.libelleSnapshot = libelleSnapshot;
    }

    public String getFournisseurSnapshot() {
        return fournisseurSnapshot;
    }

    public void setFournisseurSnapshot(String fournisseurSnapshot) {
        this.fournisseurSnapshot = fournisseurSnapshot;
    }
}
