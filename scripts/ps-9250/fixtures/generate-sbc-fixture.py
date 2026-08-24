#!/usr/bin/env python3
"""Generate the PS-9250 SBC upload fixture."""

from fpdf import FPDF
from pathlib import Path

OUTPUT = Path(__file__).resolve().parent / "Doc - SBC Silver 5000 ValueCareTest.pdf"


def main() -> None:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)
    pdf.cell(0, 10, "Summary of Benefits and Coverage", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 10, "Doc - SBC Silver 5000 ValueCareTest", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)
    pdf.set_font("Helvetica", size=10)
    for line in [
        "Plan Name: Silver 5000 ValueCare",
        "Carrier: Aetna National",
        "Deductible (Individual / Family): $3,000 / $6,000",
        "Out-of-Pocket Maximum: $8,550 / $17,100",
        "Primary Care Visit: $30 copay",
        "Specialist Visit: $60 copay",
        "Emergency Room: 30% coinsurance after deductible",
        "Prescription Drugs: Tier 1 $10, Tier 2 $35, Tier 3 $70",
        "Hospital Stay: 30% coinsurance after deductible",
    ]:
        pdf.cell(0, 8, line, new_x="LMARGIN", new_y="NEXT")

    pdf.output(str(OUTPUT))
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
