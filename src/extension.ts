import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('sketchPad.start', () => {
			SketchPadPanel.createOrShow(context.extensionUri);
		})
	);

	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(SketchPadPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				console.log(`Got state: ${state}`);
				// Reset the webview options so we use latest uri for `localResourceRoots`.
				webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
				SketchPadPanel.revive(webviewPanel, context.extensionUri);
			}
		});
	}
}

function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
	return {
		// Enable javascript in the webview
		enableScripts: true,

		// And restrict the webview to only loading content from our extension's `media` directory.
		localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media'), vscode.Uri.joinPath(extensionUri, 'node_modules/@vscode/codicons/dist')]
	};
}

/**
 * Manages sketchpad webview panels
 */
class SketchPadPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: SketchPadPanel | undefined;

	public static readonly viewType = 'sketchPad';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it.
		if (SketchPadPanel.currentPanel) {
			SketchPadPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			SketchPadPanel.viewType,
			'SketchPad',
			column || vscode.ViewColumn.One,
			getWebviewOptions(extensionUri),
		);

		SketchPadPanel.currentPanel = new SketchPadPanel(panel, extensionUri);
	}

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		SketchPadPanel.currentPanel = new SketchPadPanel(panel, extensionUri);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						vscode.window.showErrorMessage(message.text);
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public dispose() {
		SketchPadPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update() {
		const webview = this._panel.webview;
		this._panel.webview.html = this._getHtmlForWebview(webview);
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Local path to main script run in the webview
		const scriptPanelPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'panel.js');
		const scriptShapePathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'shape.js');

		// And the uri we use to load this script in the webview
		const scriptPanelUri = webview.asWebviewUri(scriptPanelPathOnDisk);
		const scriptShapePathOnUri = webview.asWebviewUri(scriptShapePathOnDisk);

		// Local path to css styles
		const styleResetPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css');
		const stylesPathMainPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css');
		const styleCodiconsPath = vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css');

		// Uri to load styles into webview
		const stylesResetUri = webview.asWebviewUri(styleResetPath);
		const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);
		const codiconsUri = webview.asWebviewUri(styleCodiconsPath);

		// Use a nonce to only allow specific scripts to be run
		const nonce = getNonce();
		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${stylesResetUri}" rel="stylesheet">
				<link href="${stylesMainUri}" rel="stylesheet">
				<link href="${codiconsUri}" rel="stylesheet">
				<title>SketchPad</title>
			</head>
			<body>
				<nav>
					<div class="list-container">
						<ul class="horizontal-list">
							<li>
								<div class="icon" id="line">
									<i class="codicon codicon-chrome-minimize"></i>
								</div>
							</li>
							<li>
								<div class="icon" id="square">
									<i class="codicon codicon-primitive-square"></i>
								</div>
							</li>
							<li>
								<div class="icon" id="circle">
									<i class="codicon codicon-circle"></i>
								</div>
							</li>
							<li>
								<div class="icon" id="pen">
									<i class="codicon codicon-edit"></i>
								</div>
							</li>
							<li>
								<div class="icon" id="eraser">
									<i class="codicon codicon-symbol-field"></i>
								</div>
							</li>
							<li>
								<div class="icon" id="clear">
									<i class="codicon codicon-trash"></i>
								</div>
							</li>
							<li>
								<div class="icon" id="download">
									<i class="codicon codicon-arrow-circle-down"></i>
								</div>
							</li>
							<li>
								<div class="icon" id="upload">
									<label for="image-upload">
										<i class="codicon codicon-arrow-circle-up"></i>
										<input type="file" accept=".png,.jpeg;" id="image-upload">
								  	</label>
								</div>
							</li>
						</ul>
						<!-- Undo + Redo -->
						<ul class="horizontal-list">
							<li>
								<div class="icon" id="undo">
									<i class="codicon codicon-discard"></i>
								</div>
							</li>
							<li>
								<div class="icon" id="redo">
									<i class="codicon codicon-redo"></i>
								</div>
							</li>
						</ul>
						<!-- Settings -->
						<ul class="horizontal-list">
							<li>
								<a>
									<input id="hex" type="color">
								</a>
							</li>
							<li>
								<input id="stroke" type="range" min="1" max="20" step="1" defaule="10">
							</li>
							<li>
								<label for="stroke" id="stroke-value-label">10</label>
							</li>
						</ul>
					</div>
				</nav>
				<div id="confirmation-dialog">
					<p>Are you sure you want to clear the canvas?</p>
					<div class="button-container">
					<button id="confirm-btn">Confirm</button>
					<button id="cancel-btn">Cancel</button>
					</div>
			  	</div>
				<div id="canvas-wrap">
					<div id="cursor-circle"></div>
					<canvas id="painter" width="720" height="400"></canvas>
				</div>

				<script nonce="${nonce}" src="${scriptShapePathOnUri}"></script>
				<script nonce="${nonce}" src="${scriptPanelUri}"></script>
			</body>
			</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
