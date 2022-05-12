async function drawMap() {
  //* Step 1. Access data
  const countryShapesRequest = d3.json("../../data/world-geojson.json");
  const datasetRequest = d3.csv("../../data/data_bank_data.csv");

  const [countryShapes, dataset] = await Promise.all([
    countryShapesRequest,
    datasetRequest,
  ]);

  const countryNameAccessor = (d) => d.properties["NAME"];
  const countryIdAccessor = (d) => d.properties["ADM0_A3_IS"];

  const metric = "Population growth (annual %)";
  const metricDataByCountry = {};

  dataset.forEach((d) => {
    if (d["Series Name"] === metric) {
      metricDataByCountry[d["Country Code"]] = +d["2017 [YR2017]"] || 0;
    }
  });

  const metricValues = Object.values(metricDataByCountry);

  //* Step 2. Create chart dimensions
  const dimensions = {
    width: window.innerWidth * 0.9,
    margin: {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
    },
  };

  dimensions.boundedWidth =
    dimensions.width - dimensions.margin.left - dimensions.margin.right;

  const sphere = { type: "Sphere" };
  const projection = d3
    .geoEqualEarth()
    .fitWidth(dimensions.boundedWidth, sphere);

  const pathGenerator = d3.geoPath(projection);
  const [[x0, y0], [x1, y1]] = pathGenerator.bounds(sphere);

  dimensions.boundedHeight = y1;
  dimensions.height =
    dimensions.boundedHeight + dimensions.margin.top + dimensions.margin.bottom;

  //* Step 3. Draw canvas
  const wrapper = d3
    .select("#wrapper")
    .append("svg")
    .attr("width", dimensions.width)
    .attr("height", dimensions.height);

  const bounds = wrapper
    .append("g")
    .style(
      "transform",
      `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`
    );

  const defs = wrapper.append("defs");

  const legendGradientId = "legend-gradient";
  const gradientRange = ["indigo", "white", "darkgreen"];
  const gradient = defs
    .append("linearGradient")
    .attr("id", legendGradientId)
    .selectAll(".stop")
    .data(gradientRange)
    .join("stop")
    .attr("stop-color", (d) => d)
    .attr("offset", (d, i) => `${(i * 100) / (gradientRange.length - 1)}%`);

  //* Step 4. Create scales
  //? metricValuesExtent starts below zero, which means some countries
  //? have negative population growth. We'll want to represent these
  //? negative and positive growths using a piecewise color scale.
  const metricValuesExtent = d3.extent(metricValues);
  //? We'll also want to create a scale which scales evenly on both sides
  const maxChange = d3.max([-metricValuesExtent[0], metricValuesExtent[1]]);

  const colorScale = d3
    .scaleLinear()
    .domain([-maxChange, 0, maxChange])
    .range(gradientRange);

  //* Step 5. Draw data
  const earth = bounds
    .append("path")
    .attr("class", "earth")
    .attr("d", pathGenerator(sphere));

  const graticuleJson = d3.geoGraticule10();
  const graticule = bounds
    .append("path")
    .attr("class", "graticule")
    .attr("d", pathGenerator(graticuleJson));

  const countries = bounds
    .selectAll(".country")
    .data(countryShapes.features)
    .join("path")
    .attr("class", "country")
    .attr("d", pathGenerator)
    .attr("fill", (d) => {
      const metricValue = metricDataByCountry[countryIdAccessor(d)];
      return metricValue ? colorScale(metricValue) : "#e2e6e9";
    });

  //* Step 6. Draw peripherals
  const legendGroup = wrapper
    .append("g")
    .attr(
      "transform",
      `translate(${120}, ${
        dimensions.width < 800
          ? dimensions.boundedHeight - 30
          : dimensions.boundedHeight * 0.5
      })`
    );

  const legendTitle = legendGroup
    .append("text")
    .attr("y", -23)
    .attr("class", "legend-title")
    .text("Population Growth");

  const legendByline = legendGroup
    .append("text")
    .attr("y", -9)
    .attr("class", "legend-byline")
    .text("Percent change in 2017");

  const legendWidth = 120;
  const legendHeight = 16;
  const legendGradient = legendGroup
    .append("rect")
    .attr("x", -legendWidth / 2)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", `url(#${legendGradientId})`);

  const legendValueLeft = legendGroup
    .append("text")
    .attr("class", "legend-value")
    .attr("x", -legendWidth / 2 - 10)
    .attr("y", legendHeight / 2)
    .style("text-anchor", "end")
    .text(`${d3.format(".1f")(-maxChange)}%`);

  const legendValueRight = legendGroup
    .append("text")
    .attr("class", "legend-value")
    .attr("x", legendWidth / 2 + 10)
    .attr("y", legendHeight / 2)
    .text(`${d3.format(".1f")(maxChange)}%`);

  navigator.geolocation.getCurrentPosition((myPosition) => {
    const [x, y] = projection([
      myPosition.coords.longitude,
      myPosition.coords.latitude,
    ]);

    const myLocation = bounds
      .append("circle")
      .attr("class", "my-location")
      .attr("cx", x)
      .attr("cy", y)
      .attr("r", 0)
      .transition()
      .duration(500)
      .attr("r", 10);
  });

  //* Step 7. Set up interactions
  const tooltip = d3.select("#tooltip");

  function onMouseEnter(event, d) {
    const metricValue = metricDataByCountry[countryIdAccessor(d)];

    tooltip.select("#country").text(countryNameAccessor(d));
    tooltip.select("#value").text(`${d3.format(",.2f")(metricValue || 0)}%`);

    const [centerX, centerY] = pathGenerator.centroid(d);
    const x = centerX + dimensions.margin.left;
    const y = centerY + dimensions.margin.top;

    tooltip
      .style("opacity", 1)
      .style("transform", `translate(calc(${x}px - 50%), calc(${y}px - 100%))`);
  }

  function onMouseLeave() {
    tooltip.style("opacity", 0);
  }

  countries.on("mouseenter", onMouseEnter).on("mouseleave", onMouseLeave);
}

drawMap();
