#!/usr/bin/env python3
"""Generate charts from ps-9250-minimum-gate-report.md / .json."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.patches import Patch

ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = ROOT / "automation-output"
MD_PATH = OUTPUT_DIR / "ps-9250-minimum-gate-report.md"
JSON_PATH = OUTPUT_DIR / "ps-9250-minimum-gate-report.json"
PNG_PATH = OUTPUT_DIR / "ps-9250-minimum-gate-report-graph.png"
HTML_PATH = OUTPUT_DIR / "ps-9250-minimum-gate-report-graph.html"


def load_from_json() -> dict:
    with JSON_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def load_from_markdown() -> dict:
    text = MD_PATH.read_text(encoding="utf-8")
    meta = {
        "suiteLabel": "Minimum Gate",
        "baseUrl": "",
        "employerName": "",
        "timestamp": "",
        "summary": {"total": 0, "passed": 0, "failed": 0},
        "scenarios": [],
    }

    for line in text.splitlines():
        if line.startswith("- **Environment:**"):
            meta["baseUrl"] = line.split(":", 1)[1].strip()
        elif line.startswith("- **Employer:**"):
            meta["employerName"] = line.split(":", 1)[1].strip()
        elif line.startswith("- **Timestamp:**"):
            meta["timestamp"] = line.split(":", 1)[1].strip()
        elif line.startswith("- **Summary:**"):
            match = re.search(r"(\d+)/(\d+)", line)
            if match:
                meta["summary"]["passed"] = int(match.group(1))
                meta["summary"]["total"] = int(match.group(2))
                meta["summary"]["failed"] = meta["summary"]["total"] - meta["summary"]["passed"]

    for line in text.splitlines():
        if not line.startswith("| S"):
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if len(cells) != 3 or cells[0] == "Scenario":
            continue
        meta["scenarios"].append({"id": cells[0], "name": cells[1], "status": cells[2]})

    return meta


def load_report() -> dict:
    if JSON_PATH.exists():
        return load_from_json()
    if MD_PATH.exists():
        return load_from_markdown()
    raise FileNotFoundError("No PS-9250 report found in automation-output")


def phase_for_scenario(scenario_id: str) -> str:
    if scenario_id.startswith("S1."):
        return "Login"
    if scenario_id.startswith("S2."):
        return "Employer"
    return "RFP / Quotes"


def create_png(report: dict) -> None:
    scenarios = report["scenarios"]
    summary = report["summary"]
    passed = summary.get("passed", 0)
    failed = summary.get("failed", 0)
    total = summary.get("total", len(scenarios))

    fig = plt.figure(figsize=(14, 10), facecolor="#f8fafc")
    grid = fig.add_gridspec(2, 2, height_ratios=[1, 2.2], width_ratios=[1, 1.4], hspace=0.35, wspace=0.25)

    ax_summary = fig.add_subplot(grid[0, 0])
    ax_phase = fig.add_subplot(grid[0, 1])
    ax_scenarios = fig.add_subplot(grid[1, :])

    # Summary bar chart
    summary_labels = ["PASS", "FAIL"]
    summary_values = [passed, failed]
    summary_colors = ["#16a34a", "#dc2626"]
    bars = ax_summary.bar(summary_labels, summary_values, color=summary_colors, width=0.55)
    ax_summary.set_ylabel("Scenarios")
    ax_summary.set_ylim(0, max(total, 1) * 1.15)
    ax_summary.set_title("Overall Result", fontsize=13, weight="bold")
    for bar, value in zip(bars, summary_values):
        if value > 0:
            ax_summary.text(
                bar.get_x() + bar.get_width() / 2,
                bar.get_height() + 0.3,
                str(value),
                ha="center",
                va="bottom",
                fontsize=11,
                weight="bold",
            )

    # Phase breakdown
    phase_counts: dict[str, dict[str, int]] = {}
    for scenario in scenarios:
        phase = phase_for_scenario(scenario["id"])
        phase_counts.setdefault(phase, {"PASS": 0, "FAIL": 0})
        phase_counts[phase][scenario["status"]] += 1

    phases = list(phase_counts.keys())
    pass_counts = [phase_counts[p]["PASS"] for p in phases]
    fail_counts = [phase_counts[p]["FAIL"] for p in phases]
    x = range(len(phases))
    ax_phase.bar(x, pass_counts, label="PASS", color="#16a34a")
    ax_phase.bar(x, fail_counts, bottom=pass_counts, label="FAIL", color="#dc2626")
    ax_phase.set_xticks(list(x))
    ax_phase.set_xticklabels(phases)
    ax_phase.set_ylabel("Scenarios")
    ax_phase.set_title("Results by Phase", fontsize=13, weight="bold")
    if failed > 0:
        ax_phase.legend(loc="upper right")

    # Scenario timeline
    labels = [scenario["id"] for scenario in scenarios]
    colors = ["#16a34a" if scenario["status"] == "PASS" else "#dc2626" for scenario in scenarios]
    y = range(len(labels))
    ax_scenarios.barh(list(y), [1] * len(labels), color=colors, height=0.72)
    ax_scenarios.set_yticks(list(y))
    ax_scenarios.set_yticklabels(labels, fontsize=9)
    ax_scenarios.set_xlim(0, 1)
    ax_scenarios.set_xticks([])
    ax_scenarios.invert_yaxis()
    ax_scenarios.set_title("Scenario Status (Latest Run)", fontsize=13, weight="bold")
    for index, scenario in enumerate(scenarios):
        ax_scenarios.text(
            0.02,
            index,
            scenario["status"],
            va="center",
            ha="left",
            color="white",
            fontsize=8,
            weight="bold",
        )

    title = f"PS-9250 Minimum Gate — {passed}/{total} PASS"
    subtitle = (
        f"{report.get('employerName', 'Ace Testing')} | "
        f"{report.get('baseUrl', '')} | "
        f"{report.get('timestamp', '')}"
    )
    fig.suptitle(title, fontsize=16, weight="bold", y=0.98)
    fig.text(0.5, 0.955, subtitle, ha="center", fontsize=10, color="#475569")

    legend_handles = [
        Patch(facecolor="#16a34a", label="PASS"),
        Patch(facecolor="#dc2626", label="FAIL"),
    ]
    ax_scenarios.legend(handles=legend_handles, loc="lower right")

    PNG_PATH.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(PNG_PATH, dpi=160, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)


def create_html(report: dict) -> None:
    scenarios_json = json.dumps(report["scenarios"])
    summary = report["summary"]
    HTML_PATH.write_text(
        f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>PS-9250 Minimum Gate Results</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {{ font-family: Inter, Arial, sans-serif; margin: 24px; background: #f8fafc; color: #0f172a; }}
    .card {{ background: white; border-radius: 12px; padding: 20px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); margin-bottom: 20px; }}
    .meta {{ color: #475569; margin-bottom: 16px; }}
    .charts {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
    canvas {{ max-height: 360px; }}
    @media (max-width: 900px) {{ .charts {{ grid-template-columns: 1fr; }} }}
  </style>
</head>
<body>
  <div class="card">
    <h1>PS-9250 Minimum Gate</h1>
    <div class="meta">
      <div><strong>Result:</strong> {summary.get('passed', 0)}/{summary.get('total', 0)} PASS</div>
      <div><strong>Environment:</strong> {report.get('baseUrl', '')}</div>
      <div><strong>Employer:</strong> {report.get('employerName', '')}</div>
      <div><strong>Timestamp:</strong> {report.get('timestamp', '')}</div>
    </div>
    <div class="charts">
      <canvas id="summaryChart"></canvas>
      <canvas id="phaseChart"></canvas>
    </div>
    <canvas id="scenarioChart"></canvas>
  </div>
  <script>
    const scenarios = {scenarios_json};
    const passed = {summary.get('passed', 0)};
    const failed = {summary.get('failed', 0)};

    new Chart(document.getElementById('summaryChart'), {{
      type: 'bar',
      data: {{
        labels: ['PASS', 'FAIL'],
        datasets: [{{
          label: 'Scenarios',
          data: [passed, failed],
          backgroundColor: ['#16a34a', '#dc2626']
        }}]
      }},
      options: {{
        plugins: {{ title: {{ display: true, text: 'Overall Result' }}, legend: {{ display: false }} }},
        scales: {{ y: {{ beginAtZero: true, ticks: {{ stepSize: 1 }} }} }}
      }}
    }});

    const phases = {{}};
    for (const s of scenarios) {{
      const phase = s.id.startsWith('S1.') ? 'Login' : s.id.startsWith('S2.') ? 'Employer' : 'RFP / Quotes';
      phases[phase] = phases[phase] || {{ pass: 0, fail: 0 }};
      phases[phase][s.status === 'PASS' ? 'pass' : 'fail'] += 1;
    }}

    new Chart(document.getElementById('phaseChart'), {{
      type: 'bar',
      data: {{
        labels: Object.keys(phases),
        datasets: [
          {{ label: 'PASS', data: Object.values(phases).map(v => v.pass), backgroundColor: '#16a34a' }},
          {{ label: 'FAIL', data: Object.values(phases).map(v => v.fail), backgroundColor: '#dc2626' }}
        ]
      }},
      options: {{
        plugins: {{ title: {{ display: true, text: 'Results by Phase' }} }},
        scales: {{ x: {{ stacked: true }}, y: {{ stacked: true, beginAtZero: true }} }}
      }}
    }});

    new Chart(document.getElementById('scenarioChart'), {{
      type: 'bar',
      data: {{
        labels: scenarios.map(s => s.id),
        datasets: [{{
          label: 'Status',
          data: scenarios.map(() => 1),
          backgroundColor: scenarios.map(s => s.status === 'PASS' ? '#16a34a' : '#dc2626')
        }}]
      }},
      options: {{
        indexAxis: 'y',
        plugins: {{ title: {{ display: true, text: 'Scenario Status' }}, legend: {{ display: false }} }},
        scales: {{ x: {{ display: false }}, y: {{ ticks: {{ autoSkip: false }} }} }}
      }}
    }});
  </script>
</body>
</html>
""",
        encoding="utf-8",
    )


def main() -> int:
    report = load_report()
    create_png(report)
    create_html(report)
    print(f"Wrote {PNG_PATH}")
    print(f"Wrote {HTML_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
