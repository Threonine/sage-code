# SageMath VS Code Enhancement Plugin (sage-code)

Developed to streamline my personal workflow in CTF crypto challenges, this plugin improves the SageMath development experience in VS Code.

## ⚠️ Important Notes: Regarding Language Server Protocol (LSP) and Advanced Features

This extension currently provides enhanced **syntax highlighting** through custom grammar rules (TextMate) and offers **basic code completion and hover documentation** by parsing SageMath introspection data.

**Please note: This extension does not implement a full SageMath Language Server (Language Server Protocol, LSP).**

This means that compared to mature language environments with full LSP support (e.g., standard Python with Pylance), you may **not** experience all modern IDE advanced features with this extension.

The completion and hover functionalities we currently offer are based on a pre-generated list of symbols, rather than real-time, deep semantic analysis of your current project code.

Currently, this extension aims to significantly improve the **basic editing experience** for SageMath code in VS Code, particularly in terms of syntax highlighting, lookup of common symbols, and basic completion, addressing pain points where standard Python extensions do not recognize SageMath-specific syntax.

## ✨ Features

* **Enhanced Syntax Highlighting**

  * Recognizes SageMath-specific keywords, functions, and classes.
  * Correctly highlights ring definition syntax such as `R.<x> = ...`.

* **Basic Code Completion**

  * Automatically extracts symbols from the SageMath environment to provide completion suggestions.
  * Offers real-time suggestions to improve coding efficiency.

* **Hover Documentation**

  * Displays the docstring when hovering over SageMath functions or classes.
  * Uses `docutils` to convert RST-formatted docs into HTML for better readability.

* **Code Runner Integration**

  * Supports multiple execution modes for `.sage` files:

    * **Run normally:** Execute Sage scripts directly.
    * **Run and clean:** Execute and then automatically remove the generated `.py` files to keep the workspace clean.

## 📸 Preview

![Auto Completion](https://raw.githubusercontent.com/Threonine/sage-code/main/image/image.png)
![Hover Docs](https://raw.githubusercontent.com/Threonine/sage-code/main/image/image-1.png)
![Context Menu](https://raw.githubusercontent.com/Threonine/sage-code/main/image/image-2.png)
![Code Runner](https://raw.githubusercontent.com/Threonine/sage-code/main/image/image-3.png)

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
