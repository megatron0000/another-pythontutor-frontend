# ES5 Interpreter

This is a frontend implementation for [Python Tutor](https://pythontutor.com) by Philip Guo. As such, we have reused most of the CSS styling of the visualizer.

The `main` branch has a backend which just redirects HTTP requests to the pythontutor server. The backend code is just the file [`/index.js`](/index.js).

But here on the `es5-interpreter` branch, we don't need a backend because user code is run directly on the browser with [JS-Interpreter](https://github.com/NeilFraser/JS-Interpreter) by Neil Fraser. A limitation is that we only interprete ES5 code (unlike the `main` branch, which can run ES6 code).

The frontend script files are served statically. They are typescript source files on [`/frontend/src`](/frontend/src/) which get compiled to `/frontend/build` and served from there.

## Running the simulator

To run the application locally:

- `npm run deps`
- `npm run start-dev`
