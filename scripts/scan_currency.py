import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    for i in range(len(lines)):
        if " Bs." in lines[i] and i+1 < len(lines) and "Ref:" in lines[i+1]:
            print(f"File: {os.path.basename(filepath)}, Lines {i+1}-{i+2}")
            print(lines[i])
            print(lines[i+1])
            print("-" * 40)
        elif " Bs. (Ref: " in lines[i]:
            print(f"File: {os.path.basename(filepath)}, Line {i+1}")
            print(lines[i])
            print("-" * 40)
        elif " BS" in lines[i] and i+1 < len(lines) and "Ref:" in lines[i+1]:
            print(f"File: {os.path.basename(filepath)}, Lines {i+1}-{i+2}")
            print(lines[i])
            print(lines[i+1])
            print("-" * 40)
        elif " Bs" in lines[i] and "Ref:" in lines[i]:
            print(f"File: {os.path.basename(filepath)}, Line {i+1}")
            print(lines[i])
            print("-" * 40)
        elif " Bs" in lines[i] and i+1 < len(lines) and ("USD" in lines[i+1] or "Ref:" in lines[i+1]):
            if "Ref" in lines[i+1]:
                print(f"File: {os.path.basename(filepath)}, Lines {i+1}-{i+2}")
                print(lines[i])
                print(lines[i+1])
                print("-" * 40)

for root, dirs, files in os.walk('C:\\Users\\Waiha\\JanaStudio\\src\\components'):
    for file in files:
        if file.endswith('.jsx'):
            process_file(os.path.join(root, file))
