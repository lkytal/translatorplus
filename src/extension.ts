'use strict';

import { window, workspace, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument } from 'vscode';
import * as WebRequest from 'web-request';

export function activate(context: ExtensionContext) {
    let cfg = workspace.getConfiguration();

    let proxy = String(cfg.get("http.proxy"));
    let targetLanguage = String(cfg.get("translatorplus.targetLanguage"));

    let translator = new Translator(proxy, targetLanguage);
    context.subscriptions.push(translator);

    context.subscriptions.push(commands.registerCommand('translatorplus.toggleTranslator', () => {
        translator.toggle();
    }));
}

// this method is called when your extension is deactivated
export function deactivate() {
}

class Translator {
    private statusBarItem: StatusBarItem;
    private disposable: Disposable;
    private active: boolean = false;

    constructor(public proxy: string = "", public targetLanguage: string = "") {
        if (!this.statusBarItem) {
            this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
            this.statusBarItem.text = '$(globe)  Waiting...';
        }

        let subscriptions: Disposable[] = [];
        window.onDidChangeTextEditorSelection(this.updateTranslate, this, subscriptions);
        this.disposable = Disposable.from(...subscriptions);
        this.updateTranslate();
    }

    public activate() {
        this.active = true;
        this.statusBarItem.show();
        window.showInformationMessage('Translator Plus enabled');
    }

    public deactivate() {
        this.active = false;
        this.statusBarItem.hide();
        window.showInformationMessage('Translator Plus disabled');
    }

    public toggle() {
        if (this.active) {
            this.deactivate();
        }
        else {
            this.activate();
        }
    }

    public updateTranslate() {
        if (!this.active) {
            return;
        }

        let str = window.activeTextEditor.document.getText(window.activeTextEditor.selection).trim();

        if (str == '') {
            return;
        }

        this.dotranslate(encodeURIComponent(str), this.proxy, this.targetLanguage);
    }

    private dotranslate(str, proxy, targetLanguage) {
        let statusBarItem = this.statusBarItem;
        let translateStr = this.googleTranslate(str, targetLanguage);

        this.statusBarItem.text = '$(globe)  Waiting...';

        WebRequest.get(translateStr, { "proxy": proxy }).then(function (TResult) {
            let res = JSON.parse(TResult.content.toString());

            var result = []
            res.sentences.forEach(function (item) {
                result.push(item.trans)
            })

            statusBarItem.text = "$(globe)  " + str + " : " + result.join(',');
            statusBarItem.show();
        });
    }

    private googleTranslate(str, targetLanguage) {
        return 'https://translate.google.cn/translate_a/single?client=gtx&sl=auto&tl=' + (targetLanguage || 'auto') + '&hl=zh-CN&dt=t&dt=bd&ie=UTF-8&oe=UTF-8&dj=1&source=icon&q=' + str;
    }

    public dispose() {
        this.statusBarItem.dispose();
        this.disposable.dispose();
    }
}
