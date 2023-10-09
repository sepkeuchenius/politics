var search;

document.addEventListener('DOMContentLoaded', function () {
  search = firebase.functions().httpsCallable('search');
  $("#query").focus()
});

var PICS_PER_PARTY = {}

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
  // i know this is shitty security but it's to prevent bots from calling the function for now.
  search({ "query": queryText }).then((res) => {
    $("#results").empty()
    console.log(res.data)
    var totalHits = res.data[2]
    var hits_per_party = res.data[0]
    var pics_per_party = res.data[1]
    PICS_PER_PARTY = pics_per_party
    for(party in hits_per_party){
      createPartyShape(party, hits_per_party[party], pics_per_party[party], totalHits)
    }
  
  })

}

function createPartyShape(party_name, hits, pic, totalHits){
  console.log("creating party shape")
  var shape = $('<div>')
  shape.addClass("party-shape")
  if(pic){
    shape.css("background", `url('${pic}') center/80% no-repeat white`)
  }
  const size = `${(hits.length / totalHits)*$("#results").width()}px`
  shape.css('width', size);
  $("#results").append(shape)
  shape.on("click", function(){loadPartyDocs(hits)})
}

function loadPartyDocs(docs){
  $("#docs").empty()
  for(doc of docs){
    var shape = $("<div>")
    var shapeText = $("<p>")
    shape.addClass("doc");
    shapeText.text(doc.text.substring(0,100) + "...")
    shape.append(shapeText)
    shape.attr("hidden-text", doc.text)
    shape.attr("small-text", doc.text.substring(0,100) + "...")
    if(doc.members){
      //this is a motion
      shape.addClass("motion");
      var motion = $("<div>")
      motion.addClass("motion-tag")
      motion.text("MOTIE")
      shape.append(motion)

      var status = $("<div>")
      status.addClass("status-tag")
      status.text(doc.status.replace(".", "").toUpperCase())
      shape.append(status)

      var motion_parties = $("<div>")
      motion_parties.addClass("motion-parties")
      var left = 0;
      for(party of doc.parties){
        if(PICS_PER_PARTY[party]){
          var party_img = $("<img>")
          party_img.addClass("motion-party")
          party_img.css("background", `url('${PICS_PER_PARTY[party]}') center/80% no-repeat white`)
          party_img.css("left",`${left}px`)
          left += 30
          motion_parties.append(party_img)
        }
      }
      shape.append(motion_parties)
    }
    else {
      var program = $("<div>")
      program.addClass("program-tag")
      program.text("PROGRAMMA")
      shape.append(program)
    }
    shape.on("click", function(doc){
      if($(this).height() <= 80){
        $(this).css('height', "auto")
        $(this).find("p").text($(this).attr("hidden-text"))
      }
      else {
        $(this).css('height', "100px")
        $(this).find("p").text($(this).attr("small-text"))
      }
      
    })
    $("#docs").append(shape)
  }
}


$("#query").on("keypress", function (event) {
  // If the user presses the "Enter" key on the keyboard
  if (event.key === "Enter") {
    // Cancel the default action, if needed
    event.preventDefault();
    // Trigger the button element with a click
    document.getElementById("search-button").click();
  }
});




