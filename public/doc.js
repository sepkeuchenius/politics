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
        this.text = this.findHiglight()
        this.fullText = this.data.text
    }

    findHiglight(){
        if(this.data._highlightResult && this.data._highlightResult.text.matchLevel != "none"){
            const highlighted = this.data._highlightResult.text.value
            const sentences = highlighted.split(/[,;.]/)
            const realSentences = this.data.text.split(/[,;.]/)
            //find the sentence
            for(var index in sentences){
                if (sentences[index].indexOf("<em>") != -1){
                    return realSentences[index]
                }
            }
        }
        return this.data.text
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
    show(){
        $(`#${this.id}`).show()
    }
    hide(){
        $(`#${this.id}`).hide()
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
        shape.append(motion)
    }

}

function calcPartyImagePosition(left, top){
    const width = 40;
    const height = 40;
    const xOverlap = 5;
    const yOverlap = 5
    const xMove = width - xOverlap;
    const yMove = height - yOverlap;
    const outerRight = 200;
    if(left + (xMove * 2) > outerRight){
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

        //we can clone the status tag from the original doc 
        docElement.find(".status-tag").clone().insertAfter("#doc .votes-against")

        $("#doc .votes-for").html("Voor <br>")

        $("#doc .votes-against").html("Tegen <br>")

        var votes_for_parties = $("<div>")
        votes_for_parties.addClass("votes-for-parties")
        var left = 0;
        var top = 0;
        for (var vote of doc.data.votes_for) {
            var party_img = $("<img>")
            party_img.addClass("motion-party")
            party_img.css("background", `url('${PICS_PER_PARTY[vote.ActorFractie]}') center/80% no-repeat var(--white)`)
            party_img.css("left", `${left}px`)
            party_img.css("top", `${top}px`)
            votes_for_parties.append(party_img)
            var newPosition = calcPartyImagePosition(left, top)
            left = newPosition[0]; top = newPosition[1];
        }
        $("#doc .votes-for").append(votes_for_parties)

        var votes_against_parties = $("<div>")
        votes_against_parties.addClass("votes-against-parties")
        var left = 0;
        var top = 0;
        for (var vote of doc.data.votes_against) {
            var party_img = $("<img>")
            party_img.addClass("motion-party")
            party_img.css("background", `url('${PICS_PER_PARTY[vote.ActorFractie]}') center/80% no-repeat var(--white)`)
            party_img.css("left", `${left}px`)
            party_img.css("top", `${top}px`)
            votes_against_parties.append(party_img)
            var newPosition = calcPartyImagePosition(left, top)
            left = newPosition[0]; top = newPosition[1];
        }
        $("#doc .votes-against").append(votes_against_parties)

        $("#doc .votes-for-parties").css("height", getHeight($("#doc .votes-for-parties")))
        $("#doc .votes-against-parties").css("height", getHeight($("#doc .votes-against-parties")))
        $("#doc .members").css("height", getHeight($("#doc .members")))
    }
    else {
        $("#doc .title").text("Programma")
        $("#doc .votes-for, .votes-against").remove()
    }
}

function getHeight($el){
    const top = $el.offset().top
    const bottom = $el.children().last().offset().top + $el.children().last().height()
    return bottom - top;
}

async function loadPartyDocs(party){
    console.log(party)
    for(doc of DOCS){
        await doc.show()
        if(!((doc.data.party && party == doc.data.party) || (doc.data.parties && doc.data.parties.includes(party)))){
            await doc.hide()
        }
    }
}