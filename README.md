# Another Pythontutor Frontend

> [!NOTE]
> Looking for the ES5 interpreter ? Take a look at the es5-interpreter branch

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

## Original Pythontutor

Copyright (C) Philip J. Guo (philip@pgbovine.net)

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Wishlist

Consider using webcola's graph-based layout algorithm for the visualization
