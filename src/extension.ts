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
        const currentWord = wordRange ? document.getText(wordRange) : '';

        const createCompletionItem = (symbol: SageSymbol, kind: vscode.CompletionItemKind) => {
            if (symbol.name.startsWith(currentWord)) {
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

        sageSymbols.classes.forEach(cls => createCompletionItem(cls, vscode.CompletionItemKind.Class));
        sageSymbols.functions.forEach(func => createCompletionItem(func, vscode.CompletionItemKind.Function));
        sageSymbols.constants.forEach(cnst => createCompletionItem(cnst, vscode.CompletionItemKind.Constant));

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
        const rawData = fs.readFileSync(symbolsPath, 'utf8');
        sageSymbols = JSON.parse(rawData) as SageSymbols;
        vscode.window.setStatusBarMessage('SageMath symbols loaded successfully.', 5000);
    } catch (error) {
        console.error('Failed to load SageMath symbols:', error);
        vscode.window.showErrorMessage('Failed to load SageMath symbols. Please check the file format and path.');
    }
}

function updateCodeRunnerExecutorMap() {
    const config = vscode.workspace.getConfiguration('sage-code.codeRunner');
    const executionMode = config.get<string>('executionMode');
    const codeRunnerConfig = vscode.workspace.getConfiguration('code-runner');
    const executorMap = codeRunnerConfig.get<object>('executorMapByFileExtension') || {};

    let sageCommand = 'sage'; // Default command

    if (executionMode === 'runAndClean') {
        sageCommand = 'sage $fullFileName && rm ${fullFileName}.py';
    } else {
        sageCommand = 'sage $fullFileName';
    }

    // It's important to update the specific file extension entry, 
    // rather than overwriting the entire executorMap.
    const newExecutorMap = {
        ...executorMap,
        ".sage": sageCommand
    };

    codeRunnerConfig.update('executorMapByFileExtension', newExecutorMap, vscode.ConfigurationTarget.Global);
}

/**
 * 扩展激活函数，当扩展首次被激活时调用
 * @param context 扩展上下文
 */
export function activate(context: vscode.ExtensionContext) {

    console.log('Activating SageMath Support extension...');

    // 1. 读取符号文件
    loadSageSymbols(context);

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
            const terminal = vscode.window.createTerminal(`Sage Run: ${editor.document.fileName}`);
            terminal.sendText(`sage "${editor.document.fileName}"`);
            terminal.show();
        } else {
            vscode.window.showInformationMessage('No active Sage file found.');
        }
    });

    let disposableRunAndClean = vscode.commands.registerCommand('sage-code.runSageFileAndCleanPy', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'sagemath') {
            const sageFile = editor.document.fileName;
            const pyFile = sageFile + '.py'; 
            const terminal = vscode.window.createTerminal(`Sage Run & Clean: ${sageFile}`);
            terminal.sendText(`sage "${sageFile}" && rm -f "${pyFile}"`);
            terminal.show();
        } else {
            vscode.window.showInformationMessage('No active Sage file found.');
        }
    });

    context.subscriptions.push(disposableRun, disposableRunAndClean);
    console.log('SageMath custom run commands registered.');

    // 5. Code Runner 集成
    updateCodeRunnerExecutorMap();
    vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('sage-code.codeRunner.executionMode') || e.affectsConfiguration('code-runner.executorMapByFileExtension')) {
            updateCodeRunnerExecutorMap();
        }
    });
    console.log('Code Runner integration initialized.');
}

/**
 * 扩展禁用函数，当扩展被禁用时调用
 */
export function deactivate() {
    console.log('Deactivating SageMath Support extension.');
}