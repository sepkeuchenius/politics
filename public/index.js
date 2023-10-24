var search;
SQUARE_WIDTH = 700;
SQUARE_HEIGHT = 100;
var PICS_PER_PARTY = {}
document.addEventListener('DOMContentLoaded', function () {
  search = firebase.functions().httpsCallable('search');
  $("#query").focus()
});


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
  queryText = document.getElementById("query").value
  search({ "query": queryText }).then(loadResults)
}

function loadResults(res) {
  $("#results").empty()
  console.log(res.data)
  var totalHits = res.data[2]
  var hits = res.data[0]
  var pics_per_party = res.data[1]
  var party_occurance_tuples = res.data[3]
  var motion_party_occurance_tuples = res.data[4]
  var program_party_occurance_tuples = res.data[5]
  PICS_PER_PARTY = pics_per_party
  createPartiesChart(motion_party_occurance_tuples, program_party_occurance_tuples)
  loadDocs(hits)
}
var chart;
function createPartiesChart(motion_party_occurance_tuples, program_party_occurance_tuples){
  $("#chart").empty()
  if(chart){
    chart.destroy()
  }
  const ctx = document.getElementById('chart');
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: motion_party_occurance_tuples.map((party)=>{return party[0]}),
      datasets: [{
        label: 'Moties',
        data: motion_party_occurance_tuples.map((party)=>{return party[1]}),
        borderWidth: 1,
        backgroundColor: '#C4E3CB',
        borderRadius: 20
      },
      {
        label: 'Partijprogramma',
        data: program_party_occurance_tuples.map((party)=>{return party[1]}),
        borderWidth: 1,
        backgroundColor: '#8AAE92',
        borderRadius: 20
      }],

    },
    options: {
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
        const canvasPosition = Chart.helpers.getRelativePosition(e, chart);
        if(elements[0]){
          const i = elements[0].index;
          const party = motion_party_occurance_tuples[i];
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
  $("#docs").empty()
  DOCS = []
  for (doc of docs) {
    if(!(doc.status || doc.party)){continue}
    if (doc.party) {
      program = new Program(doc);
      program.draw();
      DOCS.push(program)
    }
    else {
      motion = new Motion(doc);
      motion.draw();
      DOCS.push(motion)
    }
  }
}

const DOC_CONTENT = $("#doc").html()


function hideDoc() {
  $('#doc').hide();
  $('#doc').html(DOC_CONTENT);

}


$("#query").on("keypress", function (event) {
  // If the user presses the "Enter" key on the keyboard
  if (event.key === "Enter") {
    // Cancel the default action, if needed
    event.preventDefault();
    // Trigger the button element with a click
    performQuery()
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