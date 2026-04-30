import * as d3 from "d3";
import { GrammarAdapter, registerGrammarAdapter } from "../registry/grammarAdapter";

export const d3Adapter: GrammarAdapter = {
  grammarId: "d3",

  validate: (spec) => !!spec && typeof spec === "object",

  render: async (container, spec, data) => {
    if (!(container instanceof HTMLElement)) {
      throw new Error("Invalid container for D3");
    }

    container.innerHTML = "";

    const width = spec?.width || 400;
    const height = spec?.height || 300;

    const values = Array.isArray(data) ? data : [10, 20, 30, 40];

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const x = d3.scaleBand()
      .domain(values.map((_, i) => i.toString()))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, Math.max(...values)])
      .range([height, 0]);

    svg.selectAll("rect")
      .data(values)
      .enter()
      .append("rect")
      .attr("x", (_, i) => x(i.toString())!)
      .attr("y", d => y(d))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d))
      .attr("fill", "steelblue");

    return {
      rendered: true,
      type: "d3"
    };
  }
};

registerGrammarAdapter(d3Adapter);