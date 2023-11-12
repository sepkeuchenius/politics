const MAX_TEXT = 300
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
        this.fullText = this.findFullText()
    }

    findFullText(){
        if(this.data._highlightResult && this.data._highlightResult.text.matchLevel != "none"){
            const highlighted = this.data._highlightResult.text.value
            return highlighted
        }
        else{
            return this.data.text
        }
    }
    findHiglight(){
        if(this.data._highlightResult && this.data._highlightResult.summary && this.data._highlightResult.summary.matchLevel != "none" && this.docType == "motion"){
            var summaryHighlight = this.data.summary.substring(0,400)
            if(this.getSubject()){
                return `<b>${this.getSubject()}</b><br><br>${summaryHighlight}`
            }
            else{
                return summaryHighlight
            }
        }
        else if(this.data._highlightResult && this.data._highlightResult.text && this.data._highlightResult.text.matchLevel != "none"){
            if(this.data._highlightResult.text.value.length < MAX_TEXT){
                return this.data._highlightResult.text.value
            }
            const highlighted = this.data._highlightResult.text.value
            const sentences = highlighted.split(/[.]/)
            const realSentences = this.data.text.split(/[.]/)
            //find the sentence
            for(var index in sentences){
                if (sentences[index].indexOf("<em>") != -1){
                    var highLightedArea = this.data.text.slice(this.data._highlightResult.text.value.indexOf(sentences[index]), this.data.text.indexOf(realSentences[index]) + MAX_TEXT)
                    if(this.getSubject()){
                        return `<b>${this.getSubject()}</b><br><br>${highLightedArea}`
                    }
                    else{
                        return highLightedArea
                    }
                }
            }
        }
        
        if(this.getSubject()){
            return `<b>${this.getSubject()}</b><br>${this.data.text.substring(0,400)}...`
        }
        else {
            return `${this.data.text.substring(0,400)}...`
        }
    }
    getSubject(){
        if(this.data.Onderwerp && (this.data.Onderwerp.includes("van de leden") || this.data.Onderwerp.includes("van het lid"))){
            if(this.data.Onderwerp.includes(" over ")){
                var split;
                if(this.data.Onderwerp.includes("van de leden")){
                    split = this.data.Onderwerp.split("van de leden")[1].split(" over ")
                }
                else{
                    split = this.data.Onderwerp.split("van het lid")[1].split(" over ")
                }
                const subject = split[1]
                return sentence(subject)
            }
        }
        else if(this.data.Onderwerp){
            return sentence(this.data.Onderwerp)
        }
        else{
            return false
        }
    }

    draw() {
        var shape = $("<div>")
        var shapeText = $("<p>")
        shape.attr("id", this.id)
        shape.addClass("doc");
        shapeText.html(this.text)
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
        else {
            status.css('background', '--var(second)')
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
                var newPosition = calcPartyImagePosition(left, top, 300)
                left = newPosition[0]; top = newPosition[1];
            }
            else {
                console.log(party)
            }
        }
        shape.append(motion_parties)
        shape.append(motion)
    }
    getMembers(){
        return this.data.members
    }
    getFormattedDate(){
        const dateTime = new Date(this.data.Datum)
        const yyyy = dateTime.getFullYear();
        let mm = dateTime.getMonth() + 1; // Months start at 0!
        let dd = dateTime.getDate();
    
        if (dd < 10) dd = '0' + dd;
        if (mm < 10) mm = '0' + mm;
    
        return  dd + '/' + mm + '/' + yyyy;
    }
}
function sentence(string){
    string = string[0].toUpperCase() + string.substring(1)
    if (string[-1] != '.') string += "."
    return string
}

function calcPartyImagePosition(left, top, outerRight = 200){
    const width = 40;
    const height = 40;
    const xOverlap = 5;
    const yOverlap = 5
    const xMove = width - xOverlap;
    const yMove = height - yOverlap;
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
        if (this.data.year == "2021"){
            program.text("PROGRAMMA (2021)")
            shape.addClass("program-2021")
        }
        else {
            program.text("PROGRAMMA (2023)")
            shape.addClass("program-2023")
        }
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
    $('.title').empty()
    date = $("#date").clone()
    $("#tags").empty()
    $("#tags").append(date)
    $('.votes').empty()
    $('.metadata').empty()
    $(".text-piece").remove()
    $(".source-text-piece").remove()
    $("#doc.status-tag").remove()
    const dateEl = $("#date");    
    if(doc.data.Datum){
        dateEl.text(doc.getFormattedDate());
        dateEl.show()
    }
    else {
        dateEl.hide()
    }
    if(doc.data.summary && doc.docType == "motion"){
        var textPiece = $("<p>");
        textPiece.html(doc.data.summary);
        textPiece.addClass("text-piece");
        textPiece.addClass("summary");
        var sourceTextPiece = $("<p>");
        sourceTextPiece.addClass("source-text-piece");
        sourceTextPiece.text("Samenvatting motie")
        $("#doc .content").append(sourceTextPiece)
        $("#doc .content").append(textPiece)
        var sourceTextPiece = $("<p>");
        sourceTextPiece.addClass("source-text-piece");
        sourceTextPiece.text("Volledige motie")
        $("#doc .content").append(sourceTextPiece)
    }
    const motionText = doc.fullText
    const motionTexts = motionText.split(";")
    for (var index in motionTexts) {
        var text = motionTexts[index]
        var textPiece = $("<p>");
        textPiece.html(text);
        textPiece.addClass("text-piece");
        textPiece.css("background-color", `rgb(196,227, ${200 + (Number(index) * 10)})`)
        $("#doc .content").append(textPiece)
    }
    $("#doc .members").append(docElement.find(".motion-parties").clone().show())
    if (doc.docType == "motion") {
       
        for(var member of doc.getMembers()){
            memberSpan = $("<span>")
            memberSpan.text(member)
            memberSpan.addClass('motion-title-member')
            memberSpan.insertBefore(dateEl)
        }
        $("#doc .title").text(doc.getSubject());

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

        

        window.setTimeout(()=>{
            $("#doc .votes-for-parties").css("height", getHeight($("#doc .votes-for-parties")))
            $("#doc .votes-against-parties").css("height", getHeight($("#doc .votes-against-parties")))
            $("#doc .members").css("height", getHeight($("#doc .members")))
        },100) 
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