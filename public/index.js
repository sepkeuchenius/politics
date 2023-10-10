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
    SQUARE_WIDTH = 400;
    SQUARE_HEIGHT = 400;
    var square = $("<div>");
    square.css("width", SQUARE_WIDTH).css("height", SQUARE_HEIGHT).css("position", "relative");
    var x = 0, y = 0;
    var fillWidth = true
    for(party in hits_per_party){
      var partyShapeDimensions = calcDimensions(hits_per_party[party].length, totalHits, x, y, SQUARE_WIDTH, SQUARE_HEIGHT, fillWidth)
      console.log(partyShapeDimensions)
      var partyBeginX = Number(x);
      var partyBeginY = Number(y);
      var partyEndX = partyShapeDimensions[2]
      var partyEndY = partyShapeDimensions[3]
      if(fillWidth){
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
      partySquare.css("position","absolute")
      partySquare.css("left", partyBeginX)
      partySquare.css("top", partyBeginY)
      partySquare.css("border", "1px solid black");
      square.append(partySquare)
      createPartyShape(party, hits_per_party[party], pics_per_party[party], totalHits)
      fillWidth = !fillWidth
    }
    $('#results').append(square)
    $(".party-shape").sort((a,b)=>{return $(b).width() - $(a).width()}).appendTo("#results")
  
  })

}

function createPartyShape(party_name, hits, pic, totalHits){
  console.log("creating party shape")
  var shape = $('<div>')
  shape.addClass("party-shape")
  if(pic){
    shape.css("background-image", `url('${pic}')`)
  }
  const size = `${((hits.length / totalHits)*$("#results").width() - 6) * 2}px`
  shape.css('width', size);
  // $("#results").append(shape)
  loadPartyDocs(hits)
  shape.on("click", function(){loadPartyDocs(hits)})
}

function loadPartyDocs(docs){
  // $("#docs").empty()
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
      if(doc.status.toLowerCase().includes('verworpen')){
        status.css('color', 'var(--white)')
        status.css('background', '#ec7979')
        shape.append(status)
      }
      else if(doc.status.toLowerCase().includes("aangenomen")){
        status.css('background', '--var(third)')
        status.css('color', 'var(--white)')
        shape.append(status)
      }
      

      var motion_parties = $("<div>")
      motion_parties.addClass("motion-parties")
      var left = 0;
      for(party of doc.parties){
        if(PICS_PER_PARTY[party]){
          var party_img = $("<img>")
          party_img.addClass("motion-party")
          party_img.css("background", `url('${PICS_PER_PARTY[party]}') center/80% no-repeat var(--white)`)
          party_img.css("left",`${left}px`)
          left += 30
          motion_parties.append(party_img)
        }
      }
      shape.append(motion_parties)
      var votes_for_parties = $("<div>")
      votes_for_parties.addClass("votes-for-parties")
      var left = 0;
      for(vote of doc.votes_for){
        var party_img = $("<img>")
        party_img.addClass("motion-party")
        party_img.css("background", `url('${PICS_PER_PARTY[vote.ActorFractie]}') center/80% no-repeat var(--white)`)
        party_img.css("left",`${left}px`)
        left += 30
        votes_for_parties.append(party_img)
      }
      votes_for_parties.hide()
      shape.append(votes_for_parties)
    }
    else {
      var program = $("<div>")
      program.addClass("program-tag")
      program.text("PROGRAMMA")
      shape.append(program)
      var motion_parties = $("<div>")
      motion_parties.addClass("motion-parties")
      var party_img = $("<img>")
        party_img.addClass("motion-party")
        party_img.css("background", `url('${PICS_PER_PARTY[doc.party]}') center/80% no-repeat var(--white)`)
        motion_parties.append(party_img)
        shape.append(motion_parties)
      }
    shape.on("click", function(doc){
      if($(this).height() <= 80){
        $(this).find('.votes-for-parties').show()
        animateToText($(this), $(this).attr("hidden-text"), "auto", true)
      }
      else {
        $(this).find('.votes-for-parties').hide()
        animateToText($(this), $(this).attr("small-text"), "100px", false)        
      }
      
    })
    $("#docs").append(shape)
  }
}

function animateToText(element, text, height, removeTextAfter){
  const curHeight = element.height(),
  textBefore = element.find("p").text()
  autoHeight = element.find("p").text(text).parent().css('height', height).outerHeight();
  
  element.find("p").text(textBefore).parent().height(curHeight).animate({height: autoHeight},{
    duration:500,
    step: function() {
      element.css("overflow","visible");
    },
    complete :function() {
      element.find("p").text(text)
  
    }
    }
  )
  if(!removeTextAfter){
    element.find("p").text(text)
  }
  
}


$("#query").on("keypress", function (event) {
  // If the user presses the "Enter" key on the keyboard
  if (event.key === "Enter") {
    // Cancel the default action, if needed
    event.preventDefault();
    // Trigger the button element with a click
  performQuery()  }
});



function calcDimensions(nHits, totalHits, x, y, outerX, outerY, fillWidth){
  const totalSurface = outerX * outerY;
  const thisSurface = (nHits / totalHits) * totalSurface;
  var width, height;
  if(fillWidth){
    width = outerX - x;
    height = thisSurface / width;
  }
  else {
    height = outerY - y;
    width = thisSurface / height;
  }
  return [x, y, x+width, y+height]
}