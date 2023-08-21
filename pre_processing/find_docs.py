import requests
import fitz
import json
from utils import _get_doc_paragraphs

docs = requests.get("https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/Document?$filter=Soort%20eq%20%27Motie%27&$orderby=DocumentNummer%20asc").json()

for doc in docs["value"]:
    if doc.get("Kamer") != 2: continue #just the second chamber of parliament
    pdf_content = requests.get(f"https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/Document({doc['Id']})/resource").content
    pdf_document = fitz.open(stream=pdf_content)
    first_page = next(pdf_document.pages())
    pars = _get_doc_paragraphs(pdf_document, "MOTION")
    complete_text = "\n".join(pars)
    if not "MOTIE VAN HET LID" in complete_text:
        #TODO: parse more than one member that filed the motion
        continue
    member = complete_text.split("MOTIE VAN HET LID ")[1].split("\n")[0].replace(" C.S.", "")
    with open(f"data/motions/{doc['Id']}.json", "w+") as file:
        doc: dict = doc
        doc.update({"text": complete_text})
        doc.update({"member": member[0] + member.lower()[1:]})
        file.write(json.dumps(doc))

