
with open(r'c:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\src\components\VirtualBrowser.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
    print(f"{{ count: {content.count('{')}")
    print(f"}} count: {content.count('}')}")
    print(f"( count: {content.count('(')}")
    print(f") count: {content.count(')')}")
    print(f"[ count: {content.count('[')}")
    print(f"] count: {content.count(']')}")
