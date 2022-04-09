/* eslint-disable import/no-amd, no-undef */

require.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.27.0/min/vs",
    ace: "https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.14",
    cola: "https://cdn.jsdelivr.net/npm/webcola@3.4.0/WebCola",
    d3: "https://d3js.org/",
    json: "https://cdnjs.cloudflare.com/ajax/libs/requirejs-plugins/1.0.2/json",
    text: "https://cdnjs.cloudflare.com/ajax/libs/require-text/2.0.12/text"
  }
});

require([
  "vs/editor/editor.main",
  "ace/ace",
  "cola/cola",
  "d3/d3.v7",
  "./src/trace",
  // "json!./test/trace-datatypes.json"
  "json!./test/trace-factorial.json"
], function (
  monaco,
  ace,
  cola,
  /** @type {D3} */ d3,
  convertTrace,
  exampleTrace
) {
  console.log(convertTrace);
  console.log(exampleTrace);
  console.log(convertTrace(exampleTrace));

  ace.config.set(
    "basePath",
    "https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.14"
  );

  const d3Container = d3.select("#d3-container");

  /**
   * zoom and drag
   * https://stackoverflow.com/questions/43903487/how-to-apply-d3-zoom-to-a-html-element
   */
  d3.select("#page_visualize").call(
    d3.zoom().on("zoom", function (event) {
      const transform = event.transform;
      d3Container
        .style(
          "transform",
          "translate(" +
            transform.x +
            "px," +
            transform.y +
            "px) scale(" +
            transform.k +
            ")"
        )
        .style("transform-origin", "0 0");
    })
  );

  d3Container
    .append("div")
    .attr("id", "ace-container")
    .style("pointer-events", "none"); // disable mouse interaction: https://github.com/ajaxorg/ace/issues/266

  function createCodeArea() {
    return (
      d3Container
        .append("div")
        .attr("class", "ace-container")
        // disable mouse interaction: https://github.com/ajaxorg/ace/issues/266
        .style("pointer-events", "none")
    );
  }

  function createMonacoEditor(containerId) {
    const code = `/* Game of Life
     * Implemented in TypeScript
     * To learn more about TypeScript, please visit http://www.typescriptlang.org/
     */
    
    namespace Conway {
    
      export class Cell {
        public row: number;
        public col: number;
        public live: boolean;
    
        constructor(row: number, col: number, live: boolean) {
          this.row = row;
          this.col = col;
          this.live = live;
        }
      }
    
      export class GameOfLife {
        private gridSize: number;
        private canvasSize: number;
        private lineColor: string;
        private liveColor: string;
        private deadColor: string;
        private initialLifeProbability: number;
        private animationRate: number;
        private cellSize: number;
        private context: CanvasRenderingContext2D;
        private world;
    
    
        constructor() {
          this.gridSize = 50;
          this.canvasSize = 600;
          this.lineColor = '#cdcdcd';
          this.liveColor = '#666';
          this.deadColor = '#eee';
          this.initialLifeProbability = 0.5;
          this.animationRate = 60;
          this.cellSize = 0;
          this.world = this.createWorld();
          this.circleOfLife();
        }
    
        public createWorld() {
          return this.travelWorld( (cell : Cell) =>  {
            cell.live = Math.random() < this.initialLifeProbability;
            return cell;
          });
        }
    
        public circleOfLife() : void {
          this.world = this.travelWorld( (cell: Cell) => {
            cell = this.world[cell.row][cell.col];
            this.draw(cell);
            return this.resolveNextGeneration(cell);
          });
          setTimeout( () => {this.circleOfLife()}, this.animationRate);
        }
    
        public resolveNextGeneration(cell : Cell) {
          var count = this.countNeighbors(cell);
          var newCell = new Cell(cell.row, cell.col, cell.live);
          if(count < 2 || count > 3) newCell.live = false;
          else if(count == 3) newCell.live = true;
          return newCell;
        }
    
        public countNeighbors(cell : Cell) {
          var neighbors = 0;
          for(var row = -1; row <=1; row++) {
            for(var col = -1; col <= 1; col++) {
              if(row == 0 && col == 0) continue;
              if(this.isAlive(cell.row + row, cell.col + col)) {
                neighbors++;
              }
            }
          }
          return neighbors;
        }
    
        public isAlive(row : number, col : number) {
          if(row < 0 || col < 0 || row >= this.gridSize || col >= this.gridSize) return false;
          return this.world[row][col].live;
        }
    
        public travelWorld(callback) {
          var result = [];
          for(var row = 0; row < this.gridSize; row++) {
            var rowData = [];
            for(var col = 0; col < this.gridSize; col++) {
              rowData.push(callback(new Cell(row, col, false)));
            }
            result.push(rowData);
          }
          return result;
        }
    
        public draw(cell : Cell) {
          if(this.context == null) this.context = this.createDrawingContext();
          if(this.cellSize == 0) this.cellSize = this.canvasSize/this.gridSize;
    
          this.context.strokeStyle = this.lineColor;
          this.context.strokeRect(cell.row * this.cellSize, cell.col*this.cellSize, this.cellSize, this.cellSize);
          this.context.fillStyle = cell.live ? this.liveColor : this.deadColor;
          this.context.fillRect(cell.row * this.cellSize, cell.col*this.cellSize, this.cellSize, this.cellSize);
        }
    
        public createDrawingContext() {
          var canvas = <HTMLCanvasElement> document.getElementById('conway-canvas');
          if(canvas == null) {
              canvas = document.createElement('canvas');
              canvas.id = 'conway-canvas';
              canvas.width = this.canvasSize;
              canvas.height = this.canvasSize;
              document.body.appendChild(canvas);
          }
          return canvas.getContext('2d');
        }
      }
    }
    
    var game = new Conway.GameOfLife();
    `;

    const editor = monaco.editor.create(document.getElementById(containerId), {
      value: code,
      language: "typescript",
      automaticLayout: true,
      minimap: {
        enabled: false
      }
    });

    return editor;
  }

  /**
   * @param {object} args
   * @param {any} args.container A d3 selection
   */
  function populateCodeArea({ container, textContent, firstLineNumber }) {
    const editor = ace.edit(container.node(), {
      fontSize: 14,
      theme: "ace/theme/chrome",
      mode: "ace/mode/javascript",
      firstLineNumber,
      readOnly: true,
      maxLines: Infinity // trick to make container height resize with editor content
    });

    editor.setValue(textContent);

    /**
     * Tricks to make width === text width
     * https://stackoverflow.com/questions/57274039/set-width-of-ace-editor-instance-according-to-the-length-of-characters-in-it
     *
     * TODO: buggy effects on the editor if not read-only (not a problem here because it is read-only)
     */

    const renderer = editor.renderer;
    const { index: lineWithMostChars } = renderer.session
      .getLines(0, renderer.session.getLength())
      .map((x, i) => ({ length: x.length, index: i }))
      .reduce(
        (prev, curr) => {
          if (curr.length >= prev.length) {
            prev.length = curr.length;
            prev.index = curr.index;
          }
          return prev;
        },
        { length: 0, index: -1 }
      );
    var text = renderer.session.getLine(lineWithMostChars);
    var chars = renderer.session.$getStringScreenWidth(text, 80)[0];

    var width =
      Math.max(chars, 10) * renderer.characterWidth + // text size
      2 * renderer.$padding + // padding
      2 + // little extra for the cursor
      0; // add border width if needed

    // update container size
    renderer.container.style.width = width + 44 + "px";
    // update computed size stored by the editor
    renderer.onResize(false, 41, width, renderer.$size.height);
    editor.resize(true);
    // ace did not show horizontal scrollbar automatically, so check for overflow manually
    if (text.length > 80) {
      renderer.scrollBarH.setVisible(true);
      // https://bleepingcoder.com/ace/392616428/scrollbar-covers-last-line-in-editor
      renderer.setScrollMargin(0, 10, 0, 10);
    } else {
      renderer.scrollBarH.setVisible(false);
    }

    // Ace starts with all text selected (don't know why). Therefore deselect
    editor.clearSelection();

    return {
      destroy: () => editor.destroy(),
      setTextContent: (content) => editor.setValue(content),
      setPosition: (x, y) => {
        throw new Error("not implemented");
      }
    };
  }

  const codeContainer = createCodeArea();

  codeEditor = populateCodeArea({
    container: codeContainer,
    textContent: `function foo(items) { 
      var x = "All this is syntax highlighted";
      return x; 
}`,
    firstLineNumber: 7
  });

  createMonacoEditor("monaco-container");
});
