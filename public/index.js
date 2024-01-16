var search;
SQUARE_WIDTH = 700;
SQUARE_HEIGHT = 100;
var PICS_PER_PARTY = {}
document.addEventListener('DOMContentLoaded', function () {
  search = firebase.functions().httpsCallable('search');
  loadUserQueries = firebase.functions().httpsCallable('load_user_queries');
  $("#query").focus()
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has('q')) {
    $('#query').val(searchParams.get("q"))
    browserSearch();
  }

  //login anonymousely
  firebase.auth().signInAnonymously().then((res) => {
    loadUserQueries().then((res) => {
      showQueries(res.data)
    })
  })
});

function addQuery(query) {
  $("#queries-history").show();
  var queryEl = $("<item>")
  queryEl.text(query);
  queryEl.addClass("query-item")
  $(queryEl).insertAfter("#history-header")
  queryEl.on("click", reExecuteQuery)
}

function showQueries(queries) {
  console.log(queries)
  queries.reverse()
  if (queries.length > 0) {
    $("#queries-history").show();
    $("body").css("padding-left", "300px")
    for (query of queries) {
      var queryEl = $("<item>")
      queryEl.text(query);
      queryEl.addClass("query-item")
      $("#queries-history").append(queryEl)
      queryEl.on("click", reExecuteQuery)
    }
  }
}

function reExecuteQuery() {
  $("#query").val($(this).text())
  browserSearch()
}


function getHitNode(hit, index) {
  var [highlightText, highlightSentence, paragraph] = _find_highlight(hit)
  if (highlightText) {
    return {
      "label": highlightText, "id": index,
      "heightConstraint": { "minimum": 30 },
      "title": highlightSentence,
    }
  }
  else {
    return null
  }

}
function performQuery() {
  $(".loader").show()
  firebase.auth().signInAnonymously().then((_) => {
    queryText = document.getElementById("query").value
    search({ "query": queryText }).then(loadResults)
    addQuery(queryText)
  })

}

function loadResults(res) {
  $(".loader").hide()
  $("#results").empty()
  console.log(res.data)
  var hits = res.data.all_hits
  var pics_per_party = res.data.pics_per_party
  var partyOverlaps = res.data.party_overlaps
  PICS_PER_PARTY = pics_per_party
  createPartiesChart(res.data)
  loadDocs(hits)
  //  createVennDiagram(partyOverlaps)
  createFacts(res.data)
  createHeatMap(partyOverlaps)
  $("#share").show()
}

function createHeatMap(heatMapData) {
  // $("#heatmap-hint").show()
  var width = 400;
  var height = 400
  if ($("body").width() < 600) {
    width = $("body").width();
    height = width
  }
  Plotly.newPlot('heatmap', [heatMapData], {
    autosize: false,
    width: width,
    height: height,
    margin: {
      l: 50, r: 0, t: 0, b: 50
    }
  });
}

function _create_fact_el(color) {
  var el = $("<p>")
  var icon = $("<span>")
  icon.addClass("material-symbols-outlined info")
  icon.text("info")
  el.append(icon)
  el.addClass("fact")
  $("#facts").append(el)
  return el
}

function createFacts(all_data) {
  $("#facts").empty()
  if (all_data.most_active_party[1] > 0) {
    _create_fact_el().append(`${all_data.most_active_party[0]} heeft de meeste moties <u>ingediend</u> (${all_data.most_active_party[1]})`)
  }
  if (all_data.most_cooperating_parties[2] > 0) {
    _create_fact_el().append(`${all_data.most_cooperating_parties[0]} en ${all_data.most_cooperating_parties[1]} hebben het meest <u>samengewerkt</u> (${all_data.most_cooperating_parties[2]})`)
  }
  if (all_data.biggest_fan_party[1] > 0) {
    _create_fact_el().append(`${all_data.biggest_fan_party[0]} heeft het meest <u>voor</u> gestemd (${all_data.biggest_fan_party[1]})`)
  }
  if (all_data.biggest_blocking_party[1] >= 0) {
    _create_fact_el().append(`${all_data.biggest_blocking_party[0]} heeft het meest <u>tegen</u> gestemd (${all_data.biggest_blocking_party[1]})`)
  }
}

var chart;
var vennChart;
function createVennDiagram(data) {
  $(".venn").empty()
  if (data.length > 2) {
    vennChart = anychart.venn([data[0], data[1], data[2]]);
    vennChart.title("Minst overeenkomend stemgedrag");
    vennChart.container("least-agreed-venn");
    vennChart.draw();
    vennChart.background("var(--white)")
    $(".anychart-credits").remove()
  }
}
function createPartiesChart(data) {
  $("#chart").empty()
  if (chart) {
    chart.destroy()
  }
  const ctx = document.getElementById('chart');
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.motion_party_occurance_tuples.map((party) => { return party[0] }),
      datasets: [{
        label: 'Moties',
        data: data.motion_party_occurance_tuples.map((party) => { return party[1] }),
        borderWidth: 1,
        backgroundColor: '#d7e5fa',
        borderRadius: 20
      },
      {
        label: 'Partijprogramma 2023',
        data: data.new_program_party_occurance_tuples.map((party) => { return party[1] }),
        borderWidth: 1,
        backgroundColor: 'aliceblue',
        borderRadius: 20
      },
      {
        label: 'Partijprogramma 2021',
        data: data.old_program_party_occurance_tuples.map((party) => { return party[1] }),
        borderWidth: 1,
        backgroundColor: '#f1f3f5',
        borderRadius: 20
      }],

    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Activiteit'
        }
      },
      scaleShowValues: true,
      scales: {
        y: {
          beginAtZero: true,
          stacked: true
        },
        x: {
          stacked: true,
          ticks: {
            autoSkip: false
          }
        }
      },
      onClick: (e, elements) => {
        if (elements[0]) {
          const i = elements[0].index;
          const party = data.old_program_party_occurance_tuples[i];
          loadPartyDocs(party[0])
        }
      }
    }
  });
}


function createPartiesSquare(party_occurance_tuples, totalHits) {
  var square = $("<div>");
  square.css("width", SQUARE_WIDTH).css("height", SQUARE_HEIGHT).css("position", "relative");
  var x = 0, y = 0;
  var fillWidth = false
  var index = 0
  for (party_occurance_tuple of party_occurance_tuples) {
    var party = party_occurance_tuple[0]
    var occurance = party_occurance_tuple[1]
    var partyShapeDimensions = calcDimensions(occurance, totalHits, x, y, SQUARE_WIDTH, SQUARE_HEIGHT, fillWidth)
    var partyBeginX = Number(x);
    var partyBeginY = Number(y);
    var partyEndX = partyShapeDimensions[2]
    var partyEndY = partyShapeDimensions[3]
    if (fillWidth) {
      x = x;
      y = partyShapeDimensions[3];
    }
    else {
      y = y;
      x = partyShapeDimensions[2];
    }
    var partySquare = $("<div>")
    console.log(x, y, partyBeginX, partyBeginY)
    partySquare.css("height", partyEndY - partyBeginY)
    partySquare.css("width", partyEndX - partyBeginX)
    partySquare.css("background-image", `url('${PICS_PER_PARTY[party]}')`)
    partySquare.css("background-color", `rgb(196,227, ${200 + (Number(index) * 5)})`)
    partySquare.css("background-size", `${Math.min(partySquare.width() - 5, "50", partySquare.innerHeight() - 5)}px`)
    partySquare.css("left", partyBeginX)
    partySquare.css("top", partyBeginY)
    partySquare.addClass("party-square")
    square.append(partySquare)
    if (!(!fillWidth && x < SQUARE_WIDTH / 2)) {
      fillWidth = !fillWidth
    }
    index += 1;
  }
  $('#results').append(square)
}

function loadDocs(docs) {
  $("#facts-hint").show()
  $("#chart-hint").show()
  $("#results").text(
    `${docs.length} resultaten in moties en partijprogramma's.`
  )
  $("#docs").empty()
  DOCS = []
  for (doc of docs) {
    if (!(doc.type)) { continue }
    if (doc.type == "program") {
      program = new Program(doc);
      program.draw();
      DOCS.push(program)
    }
    else if (doc.type == "motion") {
      motion = new Motion(doc);
      motion.draw();
      DOCS.push(motion)
    }
    else if (doc.type == "plan") {
      plan = new Plan(doc);
      plan.draw()
      DOCS.push(plan)
    }
  }
}

const DOC_CONTENT = $("#doc").html()


function hideDoc() {
  $('#doc').hide();
  $('#doc').html(DOC_CONTENT);

}


function browserSearch() {
  var params = new URLSearchParams(window.location.search);
  params.set("q", $("#query").val());
  var newUrl = window.location.origin
    + window.location.pathname
    + '?' + params.toString();
  window.history.pushState({ path: newUrl }, '', newUrl);
  performQuery()
}

$("#query").on("keypress", function (event) {
  // If the user presses the "Enter" key on the keyboard
  if (event.key === "Enter") {
    event.preventDefault();
    browserSearch()
  }
});



function calcDimensions(nHits, totalHits, x, y, outerX, outerY, fillWidth) {
  const totalSurface = outerX * outerY;
  const thisSurface = (nHits / totalHits) * totalSurface;
  var width, height;
  if (fillWidth) {
    width = outerX - x;
    height = thisSurface / width;
  }
  else {
    height = outerY - y;
    width = thisSurface / height;
  }
  return [x, y, x + width, y + height]
}

function shareQuery() {
  const searchParams = new URLSearchParams(window.location.search);
  if (navigator.share) {
    if (searchParams.has('q')) {

      navigator.share({
        title: `Zoek ${searchParams.get("q")} op politics-navigator`,
        url: window.location.href
      })
    }
  }
  else {
    window.open(`whatsapp://send?text=Zoek ${searchParams.get("q")} op politics-navigator: ${window.location.href}`)
  }
}
