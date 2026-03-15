from pathlib import Path
import PyPDF2

p = Path(r'c:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\FILE\cospira_ludo_spec_v2.docx.pdf')
reader = PyPDF2.PdfReader(str(p))
output = []
output.append(f"pages {len(reader.pages)}")
for i, page in enumerate(reader.pages):
    t = page.extract_text() or ""
    output.append(f"--- PAGE {i+1} ---")
    output.append(t)
    output.append(f"--- end PAGE {i+1} ---\n")

out_path = Path('cospira_ludo_spec_v2.txt')
out_path.write_text('\n'.join(output), encoding='utf-8')
print('wrote', out_path.resolve())
