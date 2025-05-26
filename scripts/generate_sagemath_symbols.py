import sys
import inspect
import json
import builtins
import textwrap
import re

try:
    print("Importing SageMath modules...", file=sys.stderr)
    import sage.all
    from sage.structure.parent import Parent
    from sage.symbolic.expression import Expression
    from sage.misc.lazy_import import LazyImport

    print("Importing Docutils...", file=sys.stderr)
    from docutils.core import publish_string

    print("Imports successful.", file=sys.stderr)
except ImportError as e:
    print(f"FATAL ERROR: Could not import SageMath or Docutils ({e}).", file=sys.stderr)
    print("Please ensure you run this script using 'sage -python'.", file=sys.stderr)
    print(
        "If docutils is missing, try running 'sage -pip install docutils'.",
        file=sys.stderr,
    )
    sys.exit(1)


def convert_rst_to_html(doc):
    """转换 RST docstring 为 HTML 片段。"""
    if not doc or not isinstance(doc, str):
        return ""

    doc = textwrap.dedent(doc).strip()

    try:
        overrides = {
            "output_encoding": "unicode",
            "report_level": 4,
            "halt_level": 5,
            "doctitle_xform": False,
            "syntax_highlight": "short",
            "input_encoding": "utf-8",
            "traceback": False,
        }

        html_output = publish_string(
            source=doc, writer_name="html4css1", settings_overrides=overrides
        )

        body_match = re.search(
            r"<body[^>]*>(.*)</body>", html_output, re.DOTALL | re.IGNORECASE
        )
        if body_match:
            body_content = body_match.group(1).strip()
            div_match = re.search(
                r'<div class="document"[^>]*>(.*)</div>',
                body_content,
                re.DOTALL | re.IGNORECASE,
            )
            if div_match:
                return div_match.group(1).strip()
            return body_content
        else:
            return f"<pre>{doc}</pre>"

    except Exception as e:
        print(
            f"Warning: Docutils conversion failed for a docstring: {e}. Falling back to plain text.",
            file=sys.stderr,
        )
        return f"<pre>{doc}</pre>"


def get_sage_symbols_with_html_docs():
    """
    提取 SageMath 符号及其 HTML 转换的文档字符串。
    """
    symbols = {"classes": [], "functions": [], "constants": []}
    processed = set()
    python_builtins = set(dir(builtins))
    ignore_list = set(
        [
            "sage",
            "sys",
            "os",
            "load",
            "attach",
            "alarm",
            "quit",
            "exit",
            "get_ipython",
            "In",
            "Out",
            "help",
            "open",
            "input",
        ]
    )

    print("Starting introspection (v4.2 - Robust)...", file=sys.stderr)

    source_dict = sage.all.__dict__
    total_symbols = len(source_dict)
    count = 0

    for name, obj in source_dict.items():
        count += 1

        if name.startswith("_") or name in processed or name in ignore_list:
            continue
        if name in python_builtins and not isinstance(obj, (Parent, Expression)):
            continue
        processed.add(name)

        try:
            if inspect.ismodule(obj):
                continue

            raw_doc = inspect.getdoc(obj)
            html_doc = convert_rst_to_html(raw_doc)
            item = {"name": name, "doc": html_doc}

            if inspect.isclass(obj):
                if issubclass(obj, Parent) and name.isupper():
                    symbols["constants"].append(item)
                else:
                    symbols["classes"].append(item)
            elif inspect.isfunction(obj) or inspect.isbuiltin(obj) or callable(obj):
                if isinstance(obj, Parent):
                    symbols["constants"].append(item)
                else:
                    symbols["functions"].append(item)
            elif isinstance(obj, Parent):
                symbols["constants"].append(item)
            elif isinstance(obj, Expression):
                symbols["constants"].append(item)
            elif name.isupper() and name.isalpha():
                symbols["constants"].append(item)
            elif not name.isascii():
                symbols["constants"].append(item)
            else:
                if html_doc:
                    symbols["functions"].append(item)

        except SystemExit:
            print(f"SystemExit encountered. Stopping script.", file=sys.stderr)
            raise
        except Exception as e:

            continue

    print("Sorting and finalizing symbols...", file=sys.stderr)
    for key in symbols:
        unique_items = {item["name"]: item for item in symbols[key]}.values()
        symbols[key] = sorted(list(unique_items), key=lambda x: x["name"])

    print(
        f"Found {len(symbols['classes'])} classes, "
        f"{len(symbols['functions'])} functions, "
        f"{len(symbols['constants'])} constants.",
        file=sys.stderr,
    )

    return symbols


if __name__ == "__main__":
    print("--- Starting SageMath Symbol Generation ---", file=sys.stderr)
    sage_symbols = get_sage_symbols_with_html_docs()

    output_filename = "data/sagemath_symbols.json"
    print(f"Writing symbols to {output_filename}...", file=sys.stderr)

    try:
        import os

        os.makedirs("data", exist_ok=True)
        with open(output_filename, "w", encoding="utf-8") as f:
            json.dump(sage_symbols, f, indent=2, sort_keys=True, ensure_ascii=False)
        print(f"--- Successfully generated {output_filename}. ---", file=sys.stderr)

    except Exception as e:
        print(
            f"FATAL ERROR: Error writing JSON file '{output_filename}': {e}",
            file=sys.stderr,
        )
        sys.exit(1)
