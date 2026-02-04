export class MessageAPI {
  /**
   * Focus on the element when the window receives a "focused" message.
   * Useful when embedding the simulator in an iframe
   */
  listen(callback: () => void) {
    window.addEventListener("message", function (event) {
      if (event.data !== "focused") {
        return;
      }

      callback();
    });
  }
}
