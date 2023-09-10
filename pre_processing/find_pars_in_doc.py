import fitz
import json
from firebase_admin import credentials, firestore, initialize_app
PARTY = input("Provide party you want to analyze the program of: ")
YEAR = input("Provide the year of the elecion: ")
from utils import PartyConfig,  _get_doc_paragraphs

party_config = PartyConfig(PARTY, YEAR)

DOC = fitz.open(party_config.doc)

pars = [{
        "text": par,
        "party": PARTY,
        "year": YEAR,
        "index": index,
        "type": "program"
    }
    for index,par in enumerate(_get_doc_paragraphs(DOC, config=party_config))]

with open(party_config.output_path, "w+") as file:
    json.dump(pars, file, indent=2)
