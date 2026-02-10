// Observable Plot function for the actors visualization
export function plotActors(actors, talentWeight, looksWeight, minimum) {
  // Transform the R data into a usable format
  const data = actors.x.map((_, i) => ({
    talent: actors.x[i],
    looks: actors.y[i],
    fame: talentWeight * actors.x[i] + looksWeight * actors.y[i]
  }));
  
  // Filter by minimum fame threshold
  const filtered = data.filter(d => d.fame >= minimum);
  
  // Create the plot using Observable Plot
  return Plot.plot({
    marks: [
      Plot.dot(filtered, {
        x: "talent",
        y: "looks",
        fill: "fame",
        r: 5,
        tip: true
      }),
      Plot.frame()
    ],
    color: {
      scheme: "viridis",
      legend: true,
      label: "Fame score"
    },
    x: {
      label: "Talent →",
      grid: true
    },
    y: {
      label: "Looks →",
      grid: true
    },
    width: 640,
    height: 400,
    marginLeft: 50,
    marginBottom: 40
  });
}
