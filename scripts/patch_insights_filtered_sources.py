#!/usr/bin/env python3
"""Patch Insights Repository xlsx from backup without openpyxl save (preserves file integrity)."""

from __future__ import annotations

import re
import shutil
import zipfile
from io import BytesIO
from pathlib import Path

BACKUP = Path("/Users/transport/Downloads/1.0 Insights Repository.backup.xlsx")
OUTPUT = Path("/Users/transport/Downloads/1.0 Insights Repository.xlsx")

NEW_STRINGS = [
    "_Visible",
    "FILTERED SOURCES",
    (
        "This tab lists source documents referenced by insights that match your current filters on the "
        "Insights tab. Apply or change any filter on the Insights table (Transport Mode, Trip Motivation, "
        "Theme, Journey Stage, Type, etc.) and this list updates automatically."
    ),
    "Visible insights (matching current filters):",
    "Matching source documents:",
    " Filtered Sources",
    (
        "This tab automatically lists the source documents referenced by insights that match whatever "
        "filters you have applied on the Insights tab. It shows the same columns as the Sources tab "
        "(ID, document title, author, date, and intranet link), deduplicated by source ID. Change filters "
        "on Insights to explore different business questions without manually cross-referencing source IDs."
    ),
    "No insights match the current filters.",
    "No matching sources for the current Insights filters.",
]

SPILL_FORMULA = (
    '=IF(SUM(Insights[_Visible])=0,'
    '"No insights match the current filters.",'
    "IFERROR("
    "FILTER(Sources!$A$2:$E$57,"
    "ISNUMBER(XMATCH(Sources!$A$2:$A$57,"
    'UNIQUE(FILTER(Insights[Insight source],(Insights[_Visible]=1)*(Insights[Insight source]<>""))),'
    '0))),"No matching sources for the current Insights filters."))'
)

COUNT_FORMULA = (
    "=IFERROR(ROWS(UNIQUE(FILTER(Insights[Insight source],"
    '(Insights[_Visible]=1)*(Insights[Insight source]<>"")))),0)'
)

VISIBLE_FORMULA = "=SUM(Insights[_Visible])"


def patch_shared_strings(xml: str, base_index: int) -> str:
    insert = "".join(f"<si><t>{s}</t></si>" for s in NEW_STRINGS)
    xml = re.sub(
        r"(<sst[^>]*count=\")(\d+)(\"[^>]*uniqueCount=\")(\d+)(\")",
        lambda m: f'{m.group(1)}{int(m.group(2)) + len(NEW_STRINGS)}{m.group(3)}{int(m.group(4)) + len(NEW_STRINGS)}{m.group(5)}',
        xml,
        count=1,
    )
    return xml.replace("</sst>", insert + "</sst>"), base_index


def patch_table1(xml: str) -> str:
    xml = xml.replace('ref="A2:S1805"', 'ref="A2:T1805"')
    xml = xml.replace('count="19"', 'count="20"')
    new_col = '<tableColumn id="26" name="_Visible"/>'
    return xml.replace("</tableColumns>", new_col + "</tableColumns>")


def patch_sheet2(xml: str, visible_idx: int) -> str:
    if '<col min="20"' not in xml:
        xml = xml.replace(
            '<col min="18" max="18"',
            '<col min="20" max="20" hidden="1" width="0" customWidth="1"/>'
            '<col min="18" max="18"',
        )

    def patch_row(match: re.Match[str]) -> str:
        row = match.group(0)
        m = re.search(r'<row r="(\d+)"', row)
        if not m:
            return row
        row_num = int(m.group(1))
        if row_num < 2 or row_num > 1805:
            return row
        row = row.replace('spans="1:19"', 'spans="1:20"')
        if row_num == 2:
            cell = f'<c r="T2" s="106" t="s"><v>{visible_idx}</v></c>'
        else:
            cell = f'<c r="T{row_num}"><f>SUBTOTAL(103,[@[# Insight]])</f></c>'
        return row.replace("</row>", cell + "</row>")

    return re.sub(r'<row r="\d+"[^>]*>.*?</row>', patch_row, xml, flags=re.DOTALL)


def build_sheet8(base_index: int) -> str:
    idx = {name: base_index + i for i, name in enumerate(NEW_STRINGS)}
    header_indices = [3827, 3828, 3829, 3830, 3831]  # existing shared strings

    rows = [
        f'<row r="3" spans="1:5"><c r="C3" s="93" t="s"><v>{idx["FILTERED SOURCES"]}</v></c></row>',
        (
            f'<row r="5" spans="1:5" ht="60" customHeight="1">'
            f'<c r="C5" s="98" t="s"><v>{idx[NEW_STRINGS[2]]}</v></c></row>'
        ),
        (
            f'<row r="10" spans="1:5">'
            f'<c r="C10" s="98" t="s"><v>{idx["Visible insights (matching current filters):"]}</v></c>'
            f'<c r="D10"><f>{VISIBLE_FORMULA}</f></c></row>'
        ),
        (
            f'<row r="11" spans="1:5">'
            f'<c r="C11" s="98" t="s"><v>{idx["Matching source documents:"]}</v></c>'
            f'<c r="D11"><f>{COUNT_FORMULA}</f></c></row>'
        ),
        (
            f'<row r="13" spans="1:5">'
            + "".join(
                f'<c r="{col}13" s="20" t="s"><v>{header_indices[i]}</v></c>'
                for i, col in enumerate(["A", "B", "C", "D", "E"])
            )
            + "</row>"
        ),
        f'<row r="14" spans="1:5"><c r="A14"><f>{SPILL_FORMULA}</f></c></row>',
    ]

    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '<sheetPr><tabColor rgb="FF70AD47"/></sheetPr>'
        '<dimension ref="A3:E200"/>'
        '<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
        '<sheetFormatPr defaultRowHeight="15"/>'
        '<cols>'
        '<col min="1" max="1" width="23.85546875" customWidth="1"/>'
        '<col min="2" max="2" width="93.5703125" customWidth="1"/>'
        '<col min="3" max="3" width="27.42578125" customWidth="1"/>'
        '<col min="4" max="4" width="17.5703125" customWidth="1"/>'
        '<col min="5" max="5" width="116.42578125" customWidth="1"/>'
        "</cols>"
        f'<sheetData>{"".join(rows)}</sheetData>'
        "</worksheet>"
    )


def patch_overview_sheet1(xml: str, base_index: int) -> str:
    idx = {name: base_index + i for i, name in enumerate(NEW_STRINGS)}
    title_idx = idx[" Filtered Sources"]
    desc_idx = idx[NEW_STRINGS[6]]

    def patch_row17(match: re.Match[str]) -> str:
        row = match.group(0)
        if re.search(r'<c r="C17"[^>]*t="s"', row):
            return row
        row = re.sub(
            r'<c r="C17"[^/]*/>',
            f'<c r="C17" s="94" t="s"><v>{title_idx}</v></c>',
            row,
        )
        if f'<v>{title_idx}</v>' not in row:
            row = row.replace("</row>", f'<c r="C17" s="94" t="s"><v>{title_idx}</v></c></row>')
        return row

    def patch_row18(match: re.Match[str]) -> str:
        row = match.group(0)
        if re.search(r'<c r="C18"[^>]*t="s"', row):
            return re.sub(r'<c r="C18" s="92"/>', f'<c r="C18" s="98" t="s"><v>{desc_idx}</v></c>', row)
        row = re.sub(r'<c r="C18" s="92"/>', f'<c r="C18" s="98" t="s"><v>{desc_idx}</v></c>', row)
        if f'<v>{desc_idx}</v>' not in row:
            row = row.replace(
                "</row>",
                f'<c r="C18" s="98" t="s"><v>{desc_idx}</v></c></row>',
            )
        return row

    xml = re.sub(r'<row r="17"[^>]*>.*?</row>', patch_row17, xml, flags=re.DOTALL)
    xml = re.sub(r'<row r="18"[^>]*>.*?</row>', patch_row18, xml, flags=re.DOTALL)
    return xml


def patch_workbook(xml: str) -> str:
    new_sheet = (
        '<sheet name="Filtered Sources" sheetId="22" r:id="rId15"/>'
    )
    return xml.replace(
        '<sheet name="Insight Count and Heat Map"',
        new_sheet + '<sheet name="Insight Count and Heat Map"',
    )


def patch_workbook_rels(xml: str) -> str:
    rel = (
        '<Relationship Id="rId15" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
        'Target="worksheets/sheet8.xml"/>'
    )
    return xml.replace("</Relationships>", rel + "</Relationships>")


def patch_content_types(xml: str) -> str:
    override = (
        '<Override PartName="/xl/worksheets/sheet8.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
    )
    return xml.replace(
        '<Override PartName="/xl/theme/theme1.xml"',
        override + '<Override PartName="/xl/theme/theme1.xml"',
    )


def main() -> None:
    if not BACKUP.exists():
        raise SystemExit(f"Backup not found: {BACKUP}")

    with zipfile.ZipFile(BACKUP, "r") as zin:
        entries = {info.filename: zin.read(info.filename) for info in zin.infolist()}

    ss_xml = entries["xl/sharedStrings.xml"].decode("utf-8")
    base_index = int(re.search(r'uniqueCount="(\d+)"', ss_xml).group(1))
    ss_xml, _ = patch_shared_strings(ss_xml, base_index)
    entries["xl/sharedStrings.xml"] = ss_xml.encode("utf-8")

    entries["xl/tables/table1.xml"] = patch_table1(
        entries["xl/tables/table1.xml"].decode("utf-8")
    ).encode("utf-8")

    entries["xl/worksheets/sheet2.xml"] = patch_sheet2(
        entries["xl/worksheets/sheet2.xml"].decode("utf-8"),
        base_index,  # _Visible string index
    ).encode("utf-8")

    entries["xl/worksheets/sheet8.xml"] = build_sheet8(base_index).encode("utf-8")

    entries["xl/worksheets/sheet1.xml"] = patch_overview_sheet1(
        entries["xl/worksheets/sheet1.xml"].decode("utf-8"),
        base_index,
    ).encode("utf-8")

    entries["xl/workbook.xml"] = patch_workbook(
        entries["xl/workbook.xml"].decode("utf-8")
    ).encode("utf-8")

    entries["xl/_rels/workbook.xml.rels"] = patch_workbook_rels(
        entries["xl/_rels/workbook.xml.rels"].decode("utf-8")
    ).encode("utf-8")

    entries["[Content_Types].xml"] = patch_content_types(
        entries["[Content_Types].xml"].decode("utf-8")
    ).encode("utf-8")

    # Remove calc chain so Excel rebuilds formulas cleanly
    entries.pop("xl/calcChain.xml", None)
    rels = entries["xl/_rels/workbook.xml.rels"].decode("utf-8")
    rels = re.sub(
        r'<Relationship Id="rId11" Type="[^"]*calcChain[^"]*" Target="calcChain\.xml"/>',
        "",
        rels,
    )
    entries["xl/_rels/workbook.xml.rels"] = rels.encode("utf-8")

    tmp = OUTPUT.with_suffix(".tmp.xlsx")
    with zipfile.ZipFile(tmp, "w", compression=zipfile.ZIP_DEFLATED) as zout:
        for name, data in entries.items():
            zout.writestr(name, data)

    shutil.move(tmp, OUTPUT)
    print(f"Patched workbook written to: {OUTPUT}")
    print(f"New shared string base index: {base_index}")
    print(f"_Visible index: {base_index}")


if __name__ == "__main__":
    main()
