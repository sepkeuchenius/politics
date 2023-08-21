import fitz
import json
from firebase_admin import credentials, firestore, initialize_app
PARTY = "VVD"
from utils import DOCS, CONFIGS, _get_doc_paragraphs

DOC = fitz.open(DOCS[PARTY])

pars = _get_doc_paragraphs(DOC, PARTY)

with open(f"preprocessing/out/pars_{PARTY}.json", "w+") as file:
    json.dump(pars, file, indent=2)
