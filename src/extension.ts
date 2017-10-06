'use strict';

import { window, workspace, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument } from 'vscode';
import * as WebRequest from 'web-request';

let translator: Translator;

export function activate(context: ExtensionContext) {
	let config = workspace.getConfiguration();

	translator = new Translator(config);
	context.subscriptions.push(translator);

	context.subscriptions.push(commands.registerCommand('translatorplus.toggleTranslator', () => {
		translator.toggle();
	}));

	context.subscriptions.push(commands.registerCommand('translatorplus.replaceByTranslation', () => {
		translator.doReplace();
	}));
}

export function deactivate() {
}

class Translator {
	private statusBarItem: StatusBarItem;
	private disposable: Disposable;
	private active: boolean = false;
	private targetLanguage = 'auto';
	private proxy = '';

	constructor(private config = workspace.getConfiguration()) {
		if (!this.statusBarItem) {
			this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
			this.setText('Waiting...');
		}

		this.config = config;

		this.proxy = String(this.config.get("http.proxy"));
		this.targetLanguage = this.config.get("translatorplus.targetLanguage") || 'auto';

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

		this.doTranslate(encodeURIComponent(str), this.proxy, this.targetLanguage, (result) => {
			this.setText(str + " : " + result.join(','));
		});
	}

	public doTranslate(str, proxy, targetLanguage, callback) {
		let translateStr = this.googleTranslate(str, targetLanguage);

		this.setText('Waiting...');

		WebRequest.get(translateStr, { "proxy": proxy }).then((TResult) => {
			let res = JSON.parse(TResult.content.toString());

			var result = [];
			for (let item of res.sentences) {
				result.push(item.trans);
			}

			callback(result);
		});
	}

	public doReplace() {
		let str = window.activeTextEditor.document.getText(window.activeTextEditor.selection).trim();

		if (str == '') {
			return;
		}

		this.doTranslate(encodeURIComponent(str), this.proxy, this.targetLanguage, (result) => {
			let editor = window.activeTextEditor;
			editor.edit((edit) => {
				edit.replace(editor.selection, result[0]);
			});
		});
	}

	private googleTranslate(str, targetLanguage, sourceLanguage = 'auto') {
		return 'https://translate.google.cn/translate_a/single?client=gtx&sl=' + sourceLanguage
		 + '&tl=' + targetLanguage + '&dt=t&dt=bd&ie=UTF-8&oe=UTF-8&dj=1&source=icon&q=' + str;
	}

	public dispose() {
		this.statusBarItem.dispose();
		this.disposable.dispose();
	}
}
