async function drawChart() {
  //* Step 1. Access data
  const dataset = await d3.json("../../data/education.json");

  const sexAccessor = (d) => d.sex;
  const sexes = ["female", "male"];
  const sexIds = d3.range(sexes.length);

  const educationAccessor = (d) => d.education;
  const educationNames = [
    "<High School",
    "High School",
    "Some Post-secondary",
    "Post-secondary",
    "Associate's",
    "Bachelor's and up",
  ];
  const educationIds = d3.range(educationNames.length);

  const sesAccessor = (d) => d.ses;
  const sesNames = ["low", "middle", "high"];
  const sesIds = d3.range(sesNames.length);

  const getStatusKey = ({ sex, ses }) => [sex, ses].join("--");
  const stackedProbabilities = {};
  dataset.forEach((startingPoint) => {
    const key = getStatusKey(startingPoint);
    let stackedProbability = 0;
    stackedProbabilities[key] = educationNames.map((education, i) => {
      stackedProbability += startingPoint[education] / 100;
      return i < educationNames.length - 1 ? stackedProbability : 1;
    });
  });

  let currentPersonId = 0;
  function generatePerson(elapsed) {
    currentPersonId++;
    const sex = getRandomValue(sexIds);
    const ses = getRandomValue(sesIds);

    const statusKey = getStatusKey({
      sex: sexes[sex],
      ses: sesNames[ses],
    });
    const probabilities = stackedProbabilities[statusKey];
    const education = d3.bisect(probabilities, Math.random());

    return {
      id: currentPersonId,
      sex,
      ses,
      education,
      startTime: elapsed + getRandomNumberInRange(-0.1, 0.1),
      yJitter: getRandomNumberInRange(-15, 15),
    };
  }

  //* Step 2. Create chart dimensions
  const width = d3.min([window.innerWidth * 0.9, 1200]);
  let dimensions = {
    width: width,
    height: 500,
    margin: {
      top: 10,
      right: 200,
      bottom: 10,
      left: 120,
    },
    pathHeight: 50,
    endsBarWidth: 15,
    endingBarPadding: 3,
  };

  dimensions.boundedWidth =
    dimensions.width - dimensions.margin.left - dimensions.margin.right;
  dimensions.boundedHeight =
    dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

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

  //* Step 4. Create scales
  const xScale = d3
    .scaleLinear()
    .domain([0, 1])
    .range([0, dimensions.boundedWidth])
    .clamp(true);

  const startYScale = d3
    .scaleLinear()
    .domain([sesIds.length, -1])
    .range([0, dimensions.boundedHeight]);

  const endYScale = d3
    .scaleLinear()
    .domain([educationIds.length, -1])
    .range([0, dimensions.boundedHeight]);

  const yTransitionProgressScale = d3
    .scaleLinear()
    .domain([0.45, 0.55]) // x progress
    .range([0, 1]) // y progress
    .clamp(true);

  const colorScale = d3
    .scaleLinear()
    .domain(d3.extent(sesIds))
    .range(["#12CBC4", "#B53471"])
    .interpolate(d3.interpolateHcl);

  //* Step 5. Draw data
  const linkLineGenerator = d3
    .line()
    .x((d, i) => i * (dimensions.boundedWidth / 5))
    .y((d, i) => (i <= 2 ? startYScale(d[0]) : endYScale(d[1])))
    .curve(d3.curveMonotoneX);

  const linkOptions = d3.merge(
    sesIds.map((startId) => {
      return educationIds.map((endId) => {
        return new Array(6).fill([startId, endId]);
      });
    })
  );

  const linksGroup = bounds.append("g");
  const links = linksGroup
    .selectAll(".category-path")
    .data(linkOptions)
    .join("path")
    .attr("class", "category-path")
    .attr("d", linkLineGenerator)
    .attr("stroke-width", dimensions.pathHeight);

  //* Step 6. Draw peripherals
  const startingLabelsGroup = bounds
    .append("g")
    .style("transform", "translateX(-20px)");

  const startingLabels = startingLabelsGroup
    .selectAll(".start-label")
    .data(sesIds)
    .join("text")
    .attr("class", "label start-label")
    .attr("y", (d, i) => startYScale(i))
    .text((d, i) => sentenceCase(sesNames[i]));

  const startingBars = startingLabelsGroup
    .selectAll(".start-bar")
    .data(sesIds)
    .join("rect")
    .attr("x", 20)
    .attr("y", (d) => startYScale(d) - dimensions.pathHeight / 2)
    .attr("width", dimensions.endsBarWidth)
    .attr("height", dimensions.pathHeight)
    .attr("fill", colorScale);

  const startTitle = startingLabelsGroup
    .append("text")
    .attr("class", "start-title")
    .attr("y", startYScale(sesIds[sesIds.length - 1]) - 65)
    .text("Socioeconomic");
  const startTitleLineTwo = startingLabelsGroup
    .append("text")
    .attr("class", "start-title")
    .attr("y", startYScale(sesIds[sesIds.length - 1]) - 50)
    .text("Status");

  const endingLabelsGroup = bounds
    .append("g")
    .style("transform", `translateX(${dimensions.boundedWidth + 20}px)`);

  const endingLabels = endingLabelsGroup
    .selectAll(".end-label")
    .data(educationNames)
    .join("text")
    .attr("class", "label end-label")
    .attr("y", (d, i) => endYScale(i) - 15)
    .text((d) => d);

  const maleMarkers = endingLabelsGroup
    .selectAll(".male-marker")
    .data(educationIds)
    .join("path")
    .attr("class", "ending-marker male-marker")
    .attr("d", d3.symbol().type(d3.symbolTriangle))
    .attr("transform", (d) => `translate(5, ${endYScale(d) + 20})`);

  const femaleMarkers = endingLabelsGroup
    .selectAll(".female-marker")
    .data(educationIds)
    .join("path")
    .attr("class", "ending-marker female-marker")
    .attr("d", d3.symbol().type(d3.symbolCircle))
    .attr("transform", (d) => `translate(5, ${endYScale(d) + 5})`);

  const legendGroup = bounds
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${dimensions.boundedWidth}, 5)`);

  const femaleLegend = legendGroup
    .append("g")
    .attr("transform", `translate(${-dimensions.endsBarWidth / 2 - 4}, 0)`);
  femaleLegend
    .append("path")
    .attr("d", d3.symbol().type(d3.symbolCircle))
    .attr("transform", "translate(5, 0)");
  femaleLegend
    .append("text")
    .attr("class", "legend-text-right")
    .text("Female")
    .attr("x", 15);
  femaleLegend
    .append("line")
    .attr("class", "legend-line")
    .attr("x1", dimensions.endsBarWidth / 2 - 3)
    .attr("x2", dimensions.endsBarWidth / 2 - 3)
    .attr("y1", 12)
    .attr("y2", 37);

  const maleLegend = legendGroup
    .append("g")
    .attr(
      "transform",
      `translate(${
        -dimensions.endsBarWidth * 1.5 + dimensions.endingBarPadding + 1
      }, 0)`
    );
  maleLegend
    .append("path")
    .attr("d", d3.symbol().type(d3.symbolTriangle))
    .attr("transform", "translate(-7, 0)");
  maleLegend
    .append("text")
    .attr("class", "legend-text-left")
    .text("Male")
    .attr("x", -20)
    .attr("y", 0);
  maleLegend
    .append("line")
    .attr("class", "legend-line")
    .attr("x1", -dimensions.endsBarWidth / 2 + 1)
    .attr("x2", -dimensions.endsBarWidth / 2 + 1)
    .attr("y1", 12)
    .attr("y2", 37);

  //* Step 7. Set up interactions
  const maximumPeople = 10000;
  let people = [];
  const markersGroup = bounds.append("g").attr("class", "markers-group");

  const endingBarGroup = bounds
    .append("g")
    .attr("transform", `translate(${dimensions.boundedWidth}, 0)`);

  function updateMarkers(elapsed) {
    const xProgressAccessor = (d) => (elapsed - d.startTime) / 5000;
    if (people.length < maximumPeople) {
      people.push(...d3.range(2).map(() => generatePerson(elapsed)));
    }

    const females = markersGroup.selectAll(".marker-circle").data(
      people.filter((d) => xProgressAccessor(d) < 1 && sexAccessor(d) === 0),
      (d) => d.id
    );

    females
      .enter()
      .append("path")
      .attr("class", "marker marker-circle")
      .attr("d", d3.symbol().type(d3.symbolCircle))
      .style("opacity", 0);
    females.exit().remove();

    const males = markersGroup.selectAll(".marker-triangle").data(
      people.filter((d) => xProgressAccessor(d) < 1 && sexAccessor(d) === 1),
      (d) => d.id
    );

    males
      .enter()
      .append("path")
      .attr("class", "marker marker-triangle")
      .attr("d", d3.symbol().type(d3.symbolTriangle))
      .style("opacity", 0);
    males.exit().remove();

    const markers = d3.selectAll(".marker");

    markers
      .style("transform", (d) => {
        const x = xScale(xProgressAccessor(d));

        const yStart = startYScale(sesAccessor(d));
        const yEnd = endYScale(educationAccessor(d));
        const yChange = yEnd - yStart;
        const yProgress = yTransitionProgressScale(xProgressAccessor(d));

        const y = yStart + d.yJitter + yChange * yProgress;
        return `translate(${x}px, ${y}px)`;
      })

      .attr("fill", (d) => colorScale(sesAccessor(d)))
      .transition()
      .duration(100)
      .style("opacity", (d) => (xScale(xProgressAccessor(d)) < 10 ? 0 : 1));

    const endingGroups = educationIds.map((endId, i) => {
      return people.filter(
        (d) => xProgressAccessor(d) >= 1 && educationAccessor(d) === endId
      );
    });

    const endingPercentages = d3.merge(
      endingGroups.map((peopleWithSameEnding, endingId) => {
        return d3.merge(
          sexIds.map((sexId) => {
            return sesIds.map((sesId) => {
              const peopleInBar = peopleWithSameEnding.filter(
                (d) => sexAccessor(d) === sexId
              );

              const countInBar = peopleInBar.length;
              const peopleInBarWithSameStart = peopleInBar.filter(
                (d) => sesAccessor(d) === sesId
              );

              const count = peopleInBarWithSameStart.length;
              const numberOfPeopleAbove = peopleInBar.filter(
                (d) => sesAccessor(d) > sesId
              ).length;

              return {
                endingId,
                sesId,
                sexId,
                count,
                countInBar,
                percentAbove: numberOfPeopleAbove / (peopleInBar.length || 1),
                percent: count / (countInBar || 1),
              };
            });
          })
        );
      })
    );

    endingBarGroup
      .selectAll(".ending-bar")
      .data(endingPercentages)
      .join("rect")
      .attr("class", "ending-bar")
      .attr(
        "x",
        (d) =>
          -dimensions.endsBarWidth * (d.sexId + 1) -
          d.sexId * dimensions.endingBarPadding
      )
      .attr("width", dimensions.endsBarWidth)
      .attr(
        "y",
        (d) =>
          endYScale(d.endingId) -
          dimensions.pathHeight / 2 +
          dimensions.pathHeight * d.percentAbove
      )
      .attr("height", (d) =>
        d.countInBar ? dimensions.pathHeight * d.percent : dimensions.pathHeight
      )
      .attr("fill", (d) => (d.countInBar ? colorScale(d.sesId) : "#dadadd"));

    endingLabelsGroup
      .selectAll(".ending-value")
      .data(endingPercentages)
      .join("text")
      .attr("class", "ending-value")
      .attr("x", (d) => d.sesId * 33 + 47)
      .attr(
        "y",
        (d) =>
          endYScale(d.endingId) - dimensions.pathHeight / 2 + 14 * d.sexId + 35
      )
      .attr("fill", (d) => (d.countInBar ? colorScale(d.sesId) : "#dadadd"))
      .text((d) => d.count);
  }
  d3.timer(updateMarkers);
}
drawChart();

//* Utility functions
const getRandomNumberInRange = (min, max) => Math.random() * (max - min) + min;

const getRandomValue = (arr) =>
  arr[Math.floor(getRandomNumberInRange(0, arr.length))];

const sentenceCase = (str) =>
  [str.slice(0, 1).toUpperCase(), str.slice(1)].join("");
