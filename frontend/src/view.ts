/* eslint-disable import/no-amd, no-undef */

define(["d3/d3.v7"], function (d3) {
  function createShallowArrayView(arrayData) {
    const heapElement = d3
      .create("div")
      .classed("heap__element__container", true)
      .append("div")
      .classed("heap__element", true);

    heapElement
      .append("div")
      .classed("heap__element__typeLabel", true)
      .text("array");

    const arrayTable = heapElement
      .append("table")
      .classed("heap__element__array", true);

    const indexRow = arrayTable.append("tr");

    const valueRow = arrayTable.append("tr");

    indexRow
      .data(arrayData.values.map((_, i) => i))
      .enter()
      .append("td")
      .classed("heap__element__array_index", true)
      .text((d) => d);

    valueRow
      .data(arrayData.values)
      .enter()
      .append("td")
      .classed("heap__element__array__value", true)
      .append("span")
      .attr("class", (datum) => {
        switch (datum.kind) {
          case "string":
            return "value__string";
          default:
            return "";
        }
      });
  }
});
