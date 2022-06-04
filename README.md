# Another Pythontutor Frontend

This is a frontend implementation for [Python Tutor](https://pythontutor.com) by Philip Guo.

As such, we have reused most of the CSS styling of the visualizer. On the backend, we just redirect HTTP requests to the pythontutor server.

The backend code is just the file [`/index.js`](/index.js).

The frontend script files are served statically. They are typescript source files on [`/frontend/src`](/frontend/src/) which get compiled to `/frontend/build` and served from there. The typings are inside [`/frontend/types`](/frontend/types/).

## Architecture

TODO. For not-really-detailed information, read the headers of the typing files and the source files

## Running the server

To run the server locally:

- `npm install`
- `npm start`
