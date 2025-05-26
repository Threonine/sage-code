import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface SageSymbol {
    name: string;
    doc: string;
}

interface SageSymbols {
    classes: SageSymbol[];
    functions: SageSymbol[];
    constants: SageSymbol[];
}

let sageSymbols: SageSymbols = { classes: [], functions: [], constants: [] };
let pythonKeywords: string[] = []; // 用于存储从 JSON 加载的 Python 关键字

/**
 * SageMath 悬停提示提供器 (使用 HTML 显示文档)
 */
class SageHoverProvider implements vscode.HoverProvider {
    provideHover(
        document: vscode.TextDocument, 
        position: vscode.Position, 
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return null;
        }
        const word = document.getText(wordRange);

        const allSymbols = [
            ...sageSymbols.classes.map(s => ({ ...s, type: 'Class' })),
            ...sageSymbols.functions.map(s => ({ ...s, type: 'Function' })),
            ...sageSymbols.constants.map(s => ({ ...s, type: 'Constant' }))
        ];

        const foundSymbol = allSymbols.find(s => s.name === word);

        if (foundSymbol && foundSymbol.doc) {
            const markdown = new vscode.MarkdownString(foundSymbol.doc);
            markdown.supportHtml = true;
            return new vscode.Hover(markdown, wordRange);
        }
        return null;
    }
}

/**
 * SageMath 代码补全提供器 (尝试使用 HTML 显示文档)
 */
class SageCompletionProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(
        document: vscode.TextDocument, 
        position: vscode.Position, 
        token: vscode.CancellationToken, 
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
        const completionItems: vscode.CompletionItem[] = [];
        const wordRange = document.getWordRangeAtPosition(position);
        // currentWord 可能为空，如果光标不在单词内或行首触发
        const currentWord = wordRange ? document.getText(wordRange).toLowerCase() : ''; 

        // 辅助函数：创建 Sage 符号补全项
        const createSageCompletionItem = (symbol: SageSymbol, kind: vscode.CompletionItemKind) => {
            // 即使 currentWord 为空，也应提供所有符号作为初始建议
            if (currentWord === '' || symbol.name.toLowerCase().startsWith(currentWord)) { 
                const item = new vscode.CompletionItem(symbol.name, kind);
                item.detail = `(SageMath ${vscode.CompletionItemKind[kind]})`; 
                if (symbol.doc) {
                    const markdownDoc = new vscode.MarkdownString(symbol.doc);
                    markdownDoc.supportHtml = true;
                    item.documentation = markdownDoc;
                }
                completionItems.push(item);
            }
        };

        // 遍历 Sage 符号
        sageSymbols.classes.forEach(cls => createSageCompletionItem(cls, vscode.CompletionItemKind.Class));
        sageSymbols.functions.forEach(func => createSageCompletionItem(func, vscode.CompletionItemKind.Function));
        sageSymbols.constants.forEach(cnst => createSageCompletionItem(cnst, vscode.CompletionItemKind.Constant));

        // --- 添加 Python 关键字补全 (从加载的 pythonKeywords 列表) ---
        if (pythonKeywords && pythonKeywords.length > 0) {
            pythonKeywords.forEach(keyword => {
                if (currentWord === '' || keyword.toLowerCase().startsWith(currentWord)) {
                    const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
                    item.detail = '(Python Keyword)';
                    completionItems.push(item);
                }
            });
        }
        // ----------------------------------------------------

        return completionItems;
    }
}

/**
 * 加载 SageMath 符号数据
 * @param context 扩展上下文
 */
function loadSageSymbols(context: vscode.ExtensionContext): void {
    const symbolsPath = path.join(context.extensionPath, 'data', 'sagemath_symbols.json');
    try {
        if (fs.existsSync(symbolsPath)) { // 检查文件是否存在
            const rawData = fs.readFileSync(symbolsPath, 'utf8');
            sageSymbols = JSON.parse(rawData) as SageSymbols;
            vscode.window.setStatusBarMessage('SageMath symbols loaded successfully.', 5000);
            console.log(`Loaded ${sageSymbols.classes.length} Sage classes, ${sageSymbols.functions.length} functions, ${sageSymbols.constants.length} constants.`);
        } else {
            console.warn(`sagemath_symbols.json not found at ${symbolsPath}. SageMath symbol features will be limited.`);
            vscode.window.showWarningMessage('sagemath_symbols.json not found. Please run symbol generation script.');
        }
    } catch (error) {
        console.error('Failed to load SageMath symbols:', error);
        vscode.window.showErrorMessage('Failed to load SageMath symbols. Check console (Developer Tools) for details.');
    }
}

/**
 * 加载 Python 关键字数据
 * @param context 扩展上下文
 */
function loadPythonKeywords(context: vscode.ExtensionContext): void {
    const keywordsPath = path.join(context.extensionPath, 'data', 'python_keywords.json'); 
    try {
        if (fs.existsSync(keywordsPath)) { // 检查文件是否存在
            const rawData = fs.readFileSync(keywordsPath, 'utf8');
            pythonKeywords = JSON.parse(rawData) as string[];
            vscode.window.setStatusBarMessage('Python keywords loaded.', 3000);
            console.log(`Loaded ${pythonKeywords.length} Python keywords.`);
        } else {
            console.warn(`python_keywords.json not found at ${keywordsPath}. Python keyword completion will be limited.`);
            // 可以选择在这里加载一个硬编码的备用列表，如果需要的话
            // pythonKeywords = ['import', 'from', 'def', /* ... */];
        }
    } catch (error) {
        console.error('Failed to load Python keywords:', error);
        vscode.window.showErrorMessage('Failed to load Python keywords. Check console (Developer Tools) for details.');
    }
}


function updateCodeRunnerExecutorMap() {
    const sageCodeConfig = vscode.workspace.getConfiguration('sage-code.codeRunner');
    const executionMode = sageCodeConfig.get<string>('executionMode'); // 'runOnly' 或 'runAndClean'

    const codeRunnerConfig = vscode.workspace.getConfiguration('code-runner');
    const executorMap = codeRunnerConfig.get<object>('executorMapByFileExtension', {}); 

    let sageCommand: string;

    // TODO: 适配 Windows
    if (executionMode === 'runAndClean') {
        sageCommand = 'sage "$fullFileName" && rm -f "$fullFileName.py"';
    } else {
        sageCommand = 'sage "$fullFileName"';
    }

    const newExecutorMap = {
        ...executorMap,
        ".sage": sageCommand // 注意这里的键是文件扩展名
    };


    codeRunnerConfig.update('executorMapByFileExtension', newExecutorMap, vscode.ConfigurationTarget.Global)
        .then(() => {
            console.log('Code Runner executorMapByFileExtension updated for .sage files globally.');
            vscode.window.showInformationMessage('Code Runner configured for SageMath files globally.');
        }, (error) => {
            console.error('Failed to update Code Runner executorMapByFileExtension:', error);
            vscode.window.showErrorMessage('Failed to configure Code Runner for SageMath: ' + (error instanceof Error ? error.message : String(error)));
        });
}

/**
 * 扩展激活函数，当扩展首次被激活时调用
 * @param context 扩展上下文
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Activating SageMath Support extension...');

    // 1. 读取符号文件和关键字文件
    loadSageSymbols(context);
    loadPythonKeywords(context);

    // 2. 注册 Completion Provider
    const completionProvider = new SageCompletionProvider();
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider({ language: 'sagemath' }, completionProvider)
    );
    console.log('SageMath Completion Provider registered.');

    // 3. 注册 Hover Provider
    const hoverProvider = new SageHoverProvider();
    context.subscriptions.push(
        vscode.languages.registerHoverProvider({ language: 'sagemath' }, hoverProvider)
    );
    console.log('SageMath Hover Provider registered.');

    // 4. Run & Run and Clean Commands (右键菜单)
    let disposableRun = vscode.commands.registerCommand('sage-code.runSageFile', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'sagemath') {
            const terminal = vscode.window.createTerminal(`Sage Run: ${path.basename(editor.document.fileName)}`);
            terminal.sendText(`sage "${editor.document.fileName}"`);
            terminal.show();
        } else {
            vscode.window.showInformationMessage('No active Sage file found or not a SageMath file.');
        }
    });

    let disposableRunAndClean = vscode.commands.registerCommand('sage-code.runSageFileAndCleanPy', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'sagemath') {
            const sageFile = editor.document.fileName;
            const pyFile = sageFile + '.py'; 
            const terminal = vscode.window.createTerminal(`Sage Run & Clean: ${path.basename(sageFile)}`);
            // TODO: 适配 Windows
            terminal.sendText(`sage "${sageFile}" && rm -f "${pyFile}"`);
            terminal.show();
        } else {
            vscode.window.showInformationMessage('No active Sage file found or not a SageMath file.');
        }
    });

    context.subscriptions.push(disposableRun, disposableRunAndClean);
    console.log('SageMath custom run commands registered.');

    // 5. Code Runner 集成
    if (vscode.extensions.getExtension('formulahendry.code-runner')) {
        console.log('Code Runner extension found. Initializing integration...');
        updateCodeRunnerExecutorMap();
        context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('sage-code.codeRunner.executionMode') || 
                e.affectsConfiguration('code-runner.executorMapByFileExtension')) {
                updateCodeRunnerExecutorMap();
            }
        }));
    } else {
        console.log('Code Runner extension not found. Skipping integration.');
    }
    console.log('Code Runner integration logic processed.');
}

/**
 * 扩展禁用函数，当扩展被禁用时调用
 */
export function deactivate() {
    console.log('Deactivating SageMath Support extension.');
}