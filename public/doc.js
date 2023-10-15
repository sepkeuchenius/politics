class Doc {
    constructor(hitObject) {
        this.data = hitObject;
        this.id = hitObject.objectID;
        if (this.data.party) {
            this.docType = "program";
        }
        else {
            this.docType = "motion";
        }
        this.text = doc.text.substring(0, 100) + "..."
        this.fullText = doc.text
    }

    draw() {
        var shape = $("<div>")
        var shapeText = $("<p>")
        shape.attr("id", this.id)
        shape.addClass("doc");
        shapeText.text(this.text)
        shape.append(shapeText)

        shape.on("click", openDoc)
        $("#docs").append(shape)
        this.shape = shape
        return shape;
    }
    open() {

    }
}

class Motion extends Doc {
    constructor(hitObject) {
        super(hitObject);
    }
    draw() {
        var shape = super.draw()
        shape.addClass("motion");
        var motion = $("<div>")
        motion.addClass("motion-tag")
        motion.text("MOTIE")
        shape.append(motion)

        var status = $("<div>")
        status.addClass("status-tag")
        status.text(doc.status.replace(".", "").toUpperCase())
        if (doc.status.toLowerCase().includes('verworpen')) {
            status.css('color', 'var(--white)')
            status.css('background', '#ec7979')
            shape.append(status)
        }
        else if (doc.status.toLowerCase().includes("aangenomen")) {
            status.css('background', '--var(third)')
            status.css('color', 'var(--white)')
            shape.append(status)
        }


        var motion_parties = $("<div>")
        motion_parties.addClass("motion-parties")
        var left = 0;
        var top = 0;
        for (var party of doc.parties) {
            if (PICS_PER_PARTY[party]) {
                console.log(left, top)
                var party_img = $("<img>")
                party_img.addClass("motion-party")
                party_img.css("background", `url('${PICS_PER_PARTY[party]}') center/80% no-repeat var(--white)`)
                party_img.css("left", `${left}px`)
                party_img.css("top", `${top}px`)
                motion_parties.append(party_img)
                var newPosition = calcPartyImagePosition(left, top)
                left = newPosition[0]; top = newPosition[1];
            }
        }
        shape.append(motion_parties)
        var votes_for_parties = $("<div>")
        votes_for_parties.addClass("votes-for-parties")
        var left = 0;
        var top = 0;
        for (var vote of doc.votes_for) {
            var party_img = $("<img>")
            party_img.addClass("motion-party")
            party_img.css("background", `url('${PICS_PER_PARTY[vote.ActorFractie]}') center/80% no-repeat var(--white)`)
            party_img.css("left", `${left}px`)
            party_img.css("top", `${top}px`)
            votes_for_parties.append(party_img)
            var newPosition = calcPartyImagePosition(left, top)
            left = newPosition[0]; top = newPosition[1];
        }
        votes_for_parties.hide()
        shape.append(votes_for_parties)

        var votes_against_parties = $("<div>")
        votes_against_parties.addClass("votes-against-parties")
        var left = 0;
        var top = 0;
        for (var vote of doc.votes_against) {
            var party_img = $("<img>")
            party_img.addClass("motion-party")
            party_img.css("background", `url('${PICS_PER_PARTY[vote.ActorFractie]}') center/80% no-repeat var(--white)`)
            party_img.css("left", `${left}px`)
            party_img.css("top", `${top}px`)
            votes_against_parties.append(party_img)
            var newPosition = calcPartyImagePosition(left, top)
            left = newPosition[0]; top = newPosition[1];
        }
        votes_against_parties.hide()
        shape.append(votes_against_parties)
    }

}

function calcPartyImagePosition(left, top){
    const width = 40;
    const height = 40;
    const xOverlap = 10;
    const yOverlap = 10
    const xMove = width - xOverlap;
    const yMove = height - yOverlap;
    const outerRight = 400;
    if(left + xMove > outerRight){
        return [0, top + yMove];
    }
    else {
        return [left + xMove, top];
    }
}

class Program extends Doc {
    constructor(hitObject) {
        super(hitObject)
    }
    draw() {
        var shape = super.draw()
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
}

var DOCS = []

function getDocById(id) {
    for (doc of DOCS) {
        if (doc.id == id) {
            return doc
        }
    }
}

function openDoc() {
    var docElement = $(this)
    const doc = getDocById(docElement.attr("id"))
    $('#doc').show();


    const motionText = doc.fullText
    const motionTexts = motionText.split(";")
    for (var index in motionTexts) {
        var text = motionTexts[index]
        var textPiece = $("<p>");
        textPiece.text(text);
        textPiece.addClass("text-piece");
        textPiece.css("background-color", `rgb(196,227, ${200 + (Number(index) * 10)})`)
        $("#doc .content").append(textPiece)
    }
    $("#doc .members").append(docElement.find(".motion-parties").clone().show())
    if (doc.docType == "motion") {
        $("#doc .title").text(`Motie ${doc.data.Titel}`);
        docElement.find(".status-tag").clone().insertBefore("#doc .members")

        $("#doc .votes-for").html("Voor <br>")
        $("#doc .votes-for").append(docElement.find(".votes-for-parties").clone().show())

        $("#doc .votes-against").html("Tegen <br>")
        $("#doc .votes-against").append(docElement.find(".votes-against-parties").clone().show())
    }
    else {
        $("#doc .title").text("Programma")
        $("#doc .votes-for, .votes-against").remove()
    }
}