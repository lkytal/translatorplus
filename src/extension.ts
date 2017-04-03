'use strict';

import { window, workspace, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument } from 'vscode';
import * as WebRequest from 'web-request';

let translator: Translator;

export function activate(context: ExtensionContext) {
	let config = workspace.getConfiguration();

	let proxy = String(config.get("http.proxy"));
	let targetLanguage = String(config.get("translatorplus.targetLanguage"));

	translator = new Translator(proxy, targetLanguage);
	context.subscriptions.push(translator);

	context.subscriptions.push(commands.registerCommand('translatorplus.toggleTranslator', () => {
		translator.toggle();
	}));
}

export function deactivate() {
}

class Translator {
	private statusBarItem: StatusBarItem;
	private disposable: Disposable;
	private active: boolean = false;

	constructor(public proxy: string = "", public targetLanguage: string = "auto") {
		if (!this.statusBarItem) {
			this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
			this.setText('Waiting...');
		}

		if(this.targetLanguage == '') {
			this.targetLanguage = 'auto';
		}

		let subscriptions: Disposable[] = [];
		window.onDidChangeTextEditorSelection(this.updateTranslate, this, subscriptions);
		this.disposable = Disposable.from(...subscriptions);
		this.updateTranslate();
	}

	private setText(str) {
		this.statusBarItem.text = '$(globe) ' + str;
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
		let translateStr = this.googleTranslate(str, targetLanguage);

		this.setText('Waiting...');

		WebRequest.get(translateStr, { "proxy": proxy }).then((TResult) => {
			let res = JSON.parse(TResult.content.toString());

			var result = [];
			res.sentences.forEach(function (item) {
				result.push(item.trans);
			})

			this.setText(str + " : " + result.join(','));
		});
	}

	private googleTranslate(str, targetLanguage) {
		return 'https://translate.google.cn/translate_a/single?client=gtx&sl=auto&tl=' + targetLanguage + '&dt=t&dt=bd&ie=UTF-8&oe=UTF-8&dj=1&source=icon&q=' + str;
	}

	public dispose() {
		this.statusBarItem.dispose();
		this.disposable.dispose();
	}
}
