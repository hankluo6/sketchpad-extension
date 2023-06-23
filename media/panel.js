(function () {
	const vscode = acquireVsCodeApi();
	let drawer = {
		objectList:  /** @type {Shape[]} */ ([]),
		config: {
			color: /** @type {HTMLInputElement} */ (document.getElementById('hex'))?.value,
			lineWidth: /** @type {HTMLInputElement} */ (document.getElementById('stroke'))?.value,
			globalCompositeOperation: "source-over",
			lineCap: "round",
		},
		historyPointer: -1,
		mode: "Pen",
		currentObject: /** @type {Shape | null} */ (null),

		canvas: /** @type {HTMLCanvasElement} */ (document.getElementById("painter")),
		context: /** @type {CanvasRenderingContext2D} */ (/** @type {HTMLCanvasElement} */ (document.getElementById("painter")).getContext('2d')),
		cursor: /** @type {HTMLDivElement} */ (document.getElementById('cursor-circle')),
		stroke: /** @type {HTMLInputElement} */ (document.getElementById("stroke")),
		strokeLabel: /** @type {HTMLLabelElement} */ (document.getElementById("stroke-value-label")),
		hex: /** @type {HTMLInputElement} */ (document.getElementById("hex")),
		uploadButton: /** @type {HTMLInputElement} */ (document.getElementById("image-upload")),
		confirmationDialog: /** @type {HTMLDivElement} */ (document.getElementById('confirmation-dialog')),
		confirmButton: /** @type {HTMLButtonElement} */ (document.getElementById('confirm-btn')),
		cancelButton: /** @type {HTMLButtonElement} */ (document.getElementById('cancel-btn')),

		drawAllObjects: function () {
			drawer.context.clearRect(0, 0, drawer.context.canvas.width, drawer.context.canvas.height);
			for (let i = 0; i < drawer.historyPointer + 1; ++i) {
				drawer.objectList[i].draw(drawer.context);
			}
		},

		clearCanvas: function () {
			drawer.objectList.splice(0, drawer.objectList.length);
			drawer.historyPointer = -1;
		},

		/**
		 * @param {string} mode 
		 */
		updateConfiguration: function (mode) {
			drawer.mode = mode;
			drawer.config.color = drawer.hex.value;
			drawer.config.lineWidth = drawer.stroke.value;
			if (drawer.mode === 'Eraser') {
				drawer.config.globalCompositeOperation = "destination-out";
				drawer.config.lineCap = "square";
			} else {
				drawer.config.globalCompositeOperation = "source-over";
				drawer.config.lineCap = "round";
			}
		},

		updateCursor: function () {
			const color = drawer.hex.value;
			const value = drawer.stroke.value;
			drawer.cursor.style.width = value + 'px';
			drawer.cursor.style.height = value + 'px';
			if (drawer.mode === 'Eraser') {
				drawer.cursor.style.backgroundColor = "rgba(0,0,0,0)";
				drawer.cursor.style.borderRadius = "0%";
				drawer.cursor.style.border = "2px solid #000";
			} else {
				drawer.cursor.style.backgroundColor = color;
				drawer.cursor.style.borderRadius = "50%";
				drawer.cursor.style.border = "none";
			}
		},

		getConfig: function () {
			return {
				color: drawer.config.color,
				lineWidth: drawer.config.lineWidth,
				globalCompositeOperation: drawer.config.globalCompositeOperation,
				lineCap: drawer.config.lineCap,
			};
		},
	}
	let lastKnownScrollPosition = 0;
	let deltaY = 0;

	// initialization
	drawer.updateConfiguration(drawer.mode);
	drawer.updateCursor();

	// register mouse event
	document.addEventListener('mousedown', mousedown)
	document.addEventListener('mouseup', mouseup)
	document.addEventListener('mousemove', mousemove)
	drawer.canvas.addEventListener('mouseenter', () => drawer.cursor.style.display = "block");
	drawer.canvas.addEventListener('mouseleave', () => drawer.cursor.style.display = "none");

	// register window event
	document.addEventListener('scroll', () => {
		deltaY = scrollY - lastKnownScrollPosition;
		lastKnownScrollPosition = scrollY;
		drawer.cursor.style.top = `${parseInt(drawer.cursor.style.top) + deltaY}px`;
	})

	//register navigation bar Event
	document.getElementById("line")?.addEventListener('click', (e) => {
		drawer.updateConfiguration("Line");
		drawer.updateCursor();
		closeConfirmationDialog();
	})
	document.getElementById("square")?.addEventListener('click', (e) => {
		drawer.updateConfiguration("Square");
		drawer.updateCursor();
		closeConfirmationDialog();
	})
	document.getElementById("circle")?.addEventListener('click', (e) => {
		drawer.updateConfiguration("Circle");
		drawer.updateCursor();
		closeConfirmationDialog();
	});
	document.getElementById("pen")?.addEventListener('click', () => {
		drawer.updateConfiguration("Pen");
		drawer.updateCursor();
		closeConfirmationDialog();
	});
	document.getElementById("eraser")?.addEventListener('click', () => {
		drawer.updateConfiguration("Eraser");
		drawer.updateCursor();
		closeConfirmationDialog();
	});
	document.getElementById("clear")?.addEventListener('click', (e) => {
		showConfirmationDialog()
	});
	document.getElementById("download")?.addEventListener('click', (e) => {
		closeConfirmationDialog();
		drawer.updateConfiguration(drawer.mode);
		const downloadLink = document.createElement('a');
		downloadLink.href = drawer.canvas.toDataURL();
		downloadLink.download = 'canvas_image.png';
		downloadLink.click();
		downloadLink.remove();
	})
	document.getElementById("undo")?.addEventListener('click', (e) => {
		closeConfirmationDialog();
		if (drawer.objectList.length > 0) {
			drawer.historyPointer--;
			drawer.drawAllObjects();
		}
	})
	document.getElementById("redo")?.addEventListener('click', (e) => {
		closeConfirmationDialog();
		if (drawer.historyPointer + 1 < drawer.objectList.length) {
			drawer.historyPointer++;
			drawer.drawAllObjects();
		}
	})

	// register button event
	drawer.confirmButton.addEventListener('click', () => {
		drawer.clearCanvas();
		drawer.drawAllObjects();
		drawer.confirmationDialog.style.display = 'none';
	});
	drawer.cancelButton.addEventListener('click', closeConfirmationDialog);
	drawer.uploadButton.addEventListener('input', () => {
		handleImageUpload(drawer.uploadButton);
	});

	// register value event
	drawer.stroke.addEventListener("input", () => {
		drawer.strokeLabel.textContent = drawer.stroke.value;
		drawer.updateConfiguration(drawer.mode);
		drawer.updateCursor();
	});
	drawer.hex.addEventListener("input", () => {
		drawer.updateConfiguration(drawer.mode);
		drawer.updateCursor();
	})

	// helper function for mouse
	/**
	 * @param {MouseEvent} e
	 */
	function mousedown(e) {
		const element = e.target;
		// check whether cursor is hovering on canvas
		if (element instanceof HTMLElement) {
			const elementId = element.id;
			if (elementId !== 'painter')
				return;
		}
		switch (drawer.mode) {
			case "Pen":
				drawer.currentObject = new LineList(drawer.getConfig());
				break;
			case "Line":
				drawer.currentObject = new Line(drawer.getConfig());
				break;
			case "Circle":
				drawer.currentObject = new Circle(drawer.getConfig());
				break;
			case "Square":
				drawer.currentObject = new Square(drawer.getConfig());
				break;
			case "Eraser":
				drawer.currentObject = new Eraser(drawer.getConfig());
				break;
			default:
				sendMessage('alert', 'Cannot create drawing');
				break;
		}
		if (drawer.historyPointer + 1 != drawer.objectList.length) {
			drawer.objectList.splice(drawer.historyPointer + 1);
		}
		if (drawer.currentObject) {
			drawer.objectList.push(drawer.currentObject);
			drawer.historyPointer++;
			drawer.currentObject.startPos.x = e.pageX - drawer.canvas.offsetLeft;
			drawer.currentObject.startPos.y = e.pageY - drawer.canvas.offsetTop;
		}
	}

	/**
	 * @param {MouseEvent} e
	 */
	function mouseup(e) {
		const element = e.target;
		if (element instanceof HTMLElement) {
			const elementId = element.id;
			if (elementId !== 'painter')
				return;
		}
		if (drawer.currentObject) {
			drawer.currentObject.endPos.x = e.pageX - drawer.canvas.offsetLeft;
			drawer.currentObject.endPos.y = e.pageY - drawer.canvas.offsetTop;
		}
	}

	let /** @type {ReturnType<typeof setTimeout> | undefined} */ timerId;
	/**
	 * @param {function} func
	 * @param {number} delay
	 */
	function throttleFunction(func, delay) {
		if (timerId) {
			return
		}
		timerId = setTimeout(function () {
			func()
			timerId = undefined;
		}, delay)
	}
	/**
	 * @param {MouseEvent} e
	 */
	function mousemove(e) {
		throttleFunction(() => {
			const element = e.target;
			if (element instanceof HTMLElement) {
				const elementId = element.id;
				if (elementId !== 'painter')
					return;
			}
			drawer.cursor.style.left = `${e.clientX + scrollX}px`;
			drawer.cursor.style.top = `${e.clientY + scrollY}px`;

			if (e.buttons != 1)
				return;
			if (drawer.currentObject instanceof LineList) {
				drawer.currentObject.endPos.x = e.pageX - drawer.canvas.offsetLeft;
				drawer.currentObject.endPos.y = e.pageY - drawer.canvas.offsetTop;
				const line = new Line(drawer.currentObject.config);
				line.set(drawer.currentObject.startPos, drawer.currentObject.endPos);
				drawer.currentObject.push(line);

				drawer.currentObject.startPos.x = e.pageX - drawer.canvas.offsetLeft;
				drawer.currentObject.startPos.y = e.pageY - drawer.canvas.offsetTop;
			} else if (drawer.currentObject instanceof Shape) {
				drawer.currentObject.endPos.x = e.pageX - drawer.canvas.offsetLeft;
				drawer.currentObject.endPos.y = e.pageY - drawer.canvas.offsetTop;
			}
			drawer.drawAllObjects();
		}, 10);
	}

	/**
	 * @param {HTMLInputElement} ele
	 */
	function handleImageUpload(ele) {
		const file = ele.files?.[0];
		// Create a FileReader object
		const reader = new FileReader();
		if (file) {
			reader.readAsDataURL(file);
			// Set the onload event handler
			reader.onload = function () {
				// Create a new image element
				const image = new Image();
				// When the image is loaded, draw it on the canvas
				image.onload = function () {
					// Draw the image on the canvas
					drawer.clearCanvas();

					let tmpMode = drawer.mode;
					drawer.updateConfiguration("upload");
					drawer.objectList.push(new ImageShape(drawer.getConfig(), image));

					drawer.updateConfiguration(tmpMode);
					drawer.updateCursor();

					drawer.historyPointer++;
					drawer.drawAllObjects();
				};
				// Set the source of the image to the uploaded file
				if (typeof reader.result === 'string')
					image.src = reader.result;
			}
		} else {
			sendMessage('alert', 'Image upload failed');
		}
		drawer.uploadButton.value = '';
	}

	function showConfirmationDialog() {
		drawer.confirmationDialog.style.display = 'flex';
	}

	function closeConfirmationDialog() {
		drawer.confirmationDialog.style.display = 'none';
	}

	/**
	 * @param {string} command 
	 * @param {string} text 
	 */
	function sendMessage(command, text) {
		vscode.postMessage({
			command: command,
			text: text
		});
	}
})()