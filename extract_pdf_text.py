from pathlib import Path
import PyPDF2

p = Path(r'c:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\FILE\cospira_ludo_spec_v2.docx.pdf')
reader = PyPDF2.PdfReader(str(p))
print('pages', len(reader.pages))
for i, page in enumerate(reader.pages):
    t = page.extract_text()
    print('--- PAGE', i + 1, '---')
    print(t)
    print('--- end PAGE', i + 1, '---\n')
