class Shape {
	/**
	* @param {Object.<String, any>} config
	*/
	constructor(config) {
		this.startPos = {x:0, y:0};
		this.endPos = {x:0, y:0};
		this.config = config;
	}

	/**
	* @param {CanvasRenderingContext2D | null} context
	*/
	draw(context) {
		context && (context.strokeStyle = this.config.color);
		context && (context.lineWidth = this.config.lineWidth);
		context && (context.globalCompositeOperation = this.config.globalCompositeOperation);
		context && (context.lineCap = this.config.lineCap);
	}
}

class LineList extends Shape {
	/**
	* @param {Object.<String, any>} config
	*/
	constructor(config) {
		super(config);
		this.buffer = /** @type {Line[]} */ ([]);
	}
	/**
	* @param {CanvasRenderingContext2D | null} context
	*/
	draw(context) {
		super.draw(context);
		this.buffer.forEach((line) => {
			line.draw(context);
		})
	}
	/**
	 * @param {Line} line 
	 */
	push(line) {
		this.buffer.push(line);
	}
}

class Line extends Shape {
	/**
	* @param {Object.<String, any>} config
	*/
	constructor(config) {
		super(config);
	}
	/**
	* @param {CanvasRenderingContext2D | null} context
	*/
	draw(context) {
		super.draw(context);
		context?.beginPath();
		context?.moveTo(this.startPos.x, this.startPos.y);
		context?.lineTo(this.endPos.x, this.endPos.y)
		context?.stroke();
	}
	/**
	* @param {Object.<String, number>} startPos
	* @param {Object.<String, number>} endPos
	*/
	set(startPos, endPos) {
		this.startPos.x = startPos.x;
		this.startPos.y = startPos.y;
		this.endPos.x = endPos.x;
		this.endPos.y = endPos.y;
	}
}

class Square extends Shape {
	/**
	* @param {CanvasRenderingContext2D} context
	*/
	draw(context) {
		const width = this.endPos.x - this.startPos.x;
		const height = this.endPos.y - this.startPos.y;
		super.draw(context);
		context.strokeRect(this.startPos.x, this.startPos.y, width, height);
	}

}

class Circle extends Shape {
	/**
	* @param {CanvasRenderingContext2D} context
	*/
	draw(context) {
		const center = {
			x: (this.startPos.x + this.endPos.x) / 2,
			y: (this.startPos.y + this.endPos.y) / 2,
		}
		const radius = {
			x: Math.abs(this.endPos.x - this.startPos.x) / 2,
			y: Math.abs(this.endPos.y - this.startPos.y) / 2,
		}
		super.draw(context);
		context?.beginPath();
		context?.ellipse(center.x, center.y, radius.x, radius.y, 0, 0, 2 * Math.PI);
		context?.stroke();
	}
}

class Eraser extends LineList {
	/**
	* @param {Object.<String, any>} config
	*/
	constructor(config) {
		super(config);
	}
	/**
	* @param {CanvasRenderingContext2D | null} context
	*/
	draw(context) {
		super.draw(context);
	}
}

class ImageShape extends Shape {
	/**
	* @param {Object.<String, any>} config
	* @param {HTMLImageElement} image
	*/
	constructor(config, image) {
		super(config);
		this.img = image;
	}
	/**
	* @param {CanvasRenderingContext2D | null} context
	*/
	draw(context) {
		super.draw(context);
		context?.drawImage(this.img, 0, 0);
	}
}