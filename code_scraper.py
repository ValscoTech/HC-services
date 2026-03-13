#!/usr/bin/env python3
"""
Code Scraper - Recursively collects code files into a single text file.
Starts from the directory where this script is located.
Asks for confirmation on each top-level folder/file before proceeding.
"""

import os
import sys
from datetime import datetime

# ──────────────────────────────────────────────
# CONFIG: file extensions to treat as "code"
# Add or remove extensions as needed.
# ──────────────────────────────────────────────
CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".scss",
    ".java", ".c", ".cpp", ".h", ".hpp", ".cs", ".go", ".rb", ".php",
    ".swift", ".kt", ".rs", ".r", ".sh", ".bash", ".zsh", ".ps1",
    ".json", ".yaml", ".yml", ".toml", ".xml", ".sql", ".md",
    ".env", ".ini", ".cfg", ".conf", ".txt",
}

# Files / folders to always skip (won't even be asked about)
ALWAYS_SKIP = {
    "__pycache__", ".git", ".svn", ".hg", ".idea", ".vscode",
    "node_modules", ".DS_Store", "Thumbs.db", ".env",
    "package-lock.json",      # auto-generated lock file
    "code_scraper.py",        # skip this script itself
}


def ask(prompt: str) -> bool:
    """Ask a yes/no question; default is yes."""
    while True:
        ans = input(prompt + " [Y/n]: ").strip().lower()
        if ans in ("", "y", "yes"):
            return True
        if ans in ("n", "no"):
            return False
        print("  Please enter y or n.")


def collect_files(directory: str) -> list[str]:
    """Recursively collect all code files under *directory*."""
    collected = []
    for root, dirs, files in os.walk(directory):
        # Remove always-skip dirs in-place so os.walk won't descend into them
        dirs[:] = sorted(d for d in dirs if d not in ALWAYS_SKIP)

        for filename in sorted(files):
            if filename in ALWAYS_SKIP:
                continue
            _, ext = os.path.splitext(filename)
            if ext.lower() in CODE_EXTENSIONS:
                collected.append(os.path.join(root, filename))

    return collected


def read_file_safe(path: str) -> str:
    """Read a file, falling back gracefully on encoding errors."""
    for enc in ("utf-8", "latin-1", "cp1252"):
        try:
            with open(path, "r", encoding=enc) as f:
                return f.read()
        except UnicodeDecodeError:
            continue
        except Exception as e:
            return f"[Could not read file: {e}]"
    return "[Could not decode file with any supported encoding]"


def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    print("\n" + "═" * 60)
    print(f"  Code Scraper")
    print(f"  Base directory: {base_dir}")
    print("═" * 60 + "\n")

    # ── Step 1: list top-level entries ────────────────────────────
    try:
        top_entries = sorted(os.listdir(base_dir))
    except PermissionError:
        print(f"[ERROR] Cannot read directory: {base_dir}")
        sys.exit(1)

    selected_paths: list[str] = []   # absolute paths approved by the user

    print("For each item below, choose whether to include it.\n")

    for entry in top_entries:
        if entry in ALWAYS_SKIP:
            print(f"  [auto-skip] {entry}")
            continue

        abs_path = os.path.join(base_dir, entry)

        if os.path.isdir(abs_path):
            label = f"📁  FOLDER  →  {entry}/"
        else:
            _, ext = os.path.splitext(entry)
            if ext.lower() not in CODE_EXTENSIONS:
                print(f"  [skip – not a code file] {entry}")
                continue
            label = f"📄  FILE    →  {entry}"

        if ask(f"  Include {label}?"):
            selected_paths.append(abs_path)
        else:
            print(f"  Skipped: {entry}")

    if not selected_paths:
        print("\nNothing selected. Exiting.")
        sys.exit(0)

    # ── Step 2: gather all files from selected paths ───────────────
    all_files: list[str] = []

    for path in selected_paths:
        if os.path.isfile(path):
            all_files.append(path)
        else:
            all_files.extend(collect_files(path))

    if not all_files:
        print("\nNo code files found in the selected paths. Exiting.")
        sys.exit(0)

    print(f"\n  Found {len(all_files)} file(s) to scrape.")

    # ── Step 3: write output ───────────────────────────────────────
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_filename = f"scraped_code_{timestamp}.txt"
    output_path = os.path.join(base_dir, output_filename)

    separator = "=" * 70

    with open(output_path, "w", encoding="utf-8") as out:
        out.write(f"SCRAPED CODE  —  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        out.write(f"Base directory: {base_dir}\n")
        out.write(f"Total files: {len(all_files)}\n")
        out.write(separator + "\n\n")

        for filepath in all_files:
            rel_path = os.path.relpath(filepath, base_dir)
            out.write(f"\n{separator}\n")
            out.write(f"FILE: {rel_path}\n")
            out.write(f"{separator}\n\n")
            out.write(read_file_safe(filepath))
            out.write("\n")

    print(f"\n✅  Done! Output saved to:\n    {output_path}\n")


if __name__ == "__main__":
    main()
