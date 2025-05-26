# SageMath VS Code 增强插件（sage-code）

这个插件是为了优化我在 CTF Crypto 中使用 SageMath 的 workflow 而开发的，目标是在 VS Code 中带来更好的 SageMath 编程体验。

## ⚠️ 注意：关于语言服务器协议（LSP）和高级功能的说明

当前版本的插件主要提供基于 TextMate 自定义语法规则的**增强语法高亮**，并通过解析 SageMath 的内部信息，支持**基础的代码补全和悬停文档**功能。

**需要特别说明的是：本插件并未实现完整的 SageMath 语言服务器（Language Server Protocol，LSP）。**

也就是说，相较于如 Pylance 这样的成熟 Python LSP 扩展，你**可能无法使用**本插件提供所有现代 IDE 常见的智能功能。

目前的代码补全和悬停文档是基于预生成的符号列表，并**不支持对当前项目代码进行实时语义分析**。

本插件的设计初衷，是为了解决 VS Code 中标准 Python 插件**无法识别 SageMath 特有语法**的问题，从而极大提升 SageMath 的基础代码编辑体验，比如语法高亮、常用符号查找和简单补全等。

## ✨ 插件功能亮点

* **增强语法高亮**

  * 精准识别 SageMath 特有的关键字、函数和类。
  * 能正确高亮形如 `R.<x> = ...` 的环定义语法。

* **基础代码补全**

  * 自动提取 SageMath 环境中的符号用于补全提示。
  * 实时提示常用函数，提高编码效率。

* **悬停文档显示**

  * 鼠标悬停在 SageMath 函数或类上时，会显示其文档说明。
  * 使用 `docutils` 将 RST 格式的文档渲染为可读性更强的 HTML 格式。

* **集成 Code Runner**

  * 支持多种方式运行 `.sage` 文件：

    * **正常运行**：直接执行 Sage 脚本；
    * **运行并清理**：执行后自动删除生成的 `.py` 文件，保持工作区整洁。

## 📸 插件预览图

自动补全：

![Auto Completion](https://raw.githubusercontent.com/Threonine/sage-code/main/image/image.png)

悬停文档：

![Hover Docs](https://raw.githubusercontent.com/Threonine/sage-code/main/image/image-1.png)

右键菜单：

![Context Menu](https://raw.githubusercontent.com/Threonine/sage-code/main/image/image-2.png)

运行配置：

![Code Runner](https://raw.githubusercontent.com/Threonine/sage-code/main/image/image-3.png)

## 📄 许可证

本项目使用 [MIT License](./LICENSE) 开源许可协议发布。
